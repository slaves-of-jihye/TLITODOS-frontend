/*
 * TLITODOS 서비스 워커.
 *
 * 이 파일은 Vite `public/`에 있어 번들되지 않습니다. 해시가 붙은 산출물 이름을
 * 빌드 시점에 알 수 없으므로 사전 캐시 대신 런타임 캐시만 사용합니다.
 * - 문서 요청: 네트워크 우선(오프라인일 때만 캐시된 셸로 대체)
 * - `assets/` 산출물: 내용 주소 기반이라 캐시 우선
 * - 아이콘/매니페스트: 캐시 우선 + 백그라운드 갱신
 * - 폰트: 별도 캐시에 캐시 우선. 재검증 요청은 걸지 않습니다.
 * API 응답과 OAuth 콜백은 절대 캐시하지 않습니다.
 *
 * 폰트를 셸과 분리한 이유: 사용자가 고를 수 있는 폰트가 여섯 개이고 압축이 풀린
 * 상태로 저장되어 개당 최대 4.8MB입니다. 셸 캐시에 함께 두면 개수 제한을 걸 수
 * 없습니다. index.html은 오프라인 대체용이라 절대 밀려나면 안 되기 때문입니다.
 *
 * 원칙: 캐시 계층의 어떤 실패도 응답을 막지 않습니다. 저장소가 막히거나 용량이
 * 초과되면 서비스 워커가 없는 것과 동일하게 네트워크로만 동작해야 합니다.
 * `public/` 아래 해시 없는 파일(폰트, 아이콘)의 내용이 바뀌면 VERSION을 올리세요.
 */

// v2: 폰트를 셸 캐시에서 분리했습니다. v1 셸에 남은 폰트는 활성화 때 함께 지워집니다.
const VERSION = "v2";
const CACHE_PREFIX = "tlitodos-";
const SHELL_CACHE = `${CACHE_PREFIX}shell-${VERSION}`;
const ASSET_CACHE = `${CACHE_PREFIX}assets-${VERSION}`;
const FONT_CACHE = `${CACHE_PREFIX}fonts-${VERSION}`;
const CURRENT_CACHES = [SHELL_CACHE, ASSET_CACHE, FONT_CACHE];
// packages/core의 FONT_PRESETS 개수. 이 파일은 번들되지 않아 가져올 수 없습니다.
const FONT_COUNT = 6;
// 오래된 항목부터 밀어냅니다. 폰트 선택 목록이 여섯 벌을 모두 그리므로 상한도
// 여섯입니다. 이보다 낮으면 목록을 열 때마다 캐시가 밀려 매번 다시 받습니다.
const CACHE_LIMITS = { [ASSET_CACHE]: 80, [FONT_CACHE]: FONT_COUNT };

const scope = new URL("./", self.location.href);
const START_PATH = scope.pathname;
const INDEX_URL = new URL("index.html", scope).href;
const OAUTH_CALLBACK_PATH = new URL("oauth-callback.html", scope).pathname;
// 폰트는 용량이 커서 설치 시점에 미리 받지 않고, 페이지가 요청할 때 캐시합니다.
const SHELL_ASSETS = [
  new URL("manifest.webmanifest", scope).href,
  new URL("icons/icon-192.png", scope).href,
  new URL("icons/apple-touch-icon.png", scope).href,
];

const openCache = async name => {
  try {
    return await caches.open(name);
  } catch {
    return null;
  }
};

const matchCache = async (cache, key) => {
  if (!cache) return undefined;
  try {
    return await cache.match(key);
  } catch {
    return undefined;
  }
};

/** `waitUntil`은 이벤트 수명이 끝났으면 던지므로, 응답 경로를 막지 않게 감쌉니다. */
const extendLifetime = (event, promise) => {
  try {
    event.waitUntil(promise.catch(() => undefined));
  } catch {
    /* 수명 연장에 실패해도 백그라운드 작업은 그대로 진행됩니다. */
  }
};

/** 캐시 저장은 응답 경로를 막지 않도록 백그라운드로 처리합니다. */
const putLater = (event, cache, key, response) => {
  if (!cache) return;
  extendLifetime(event, cache.put(key, response));
};

self.addEventListener("install", event => {
  event.waitUntil(
    (async () => {
      const cache = await openCache(SHELL_CACHE);
      if (cache)
        await Promise.all(
          // index.html은 항상 새로 받고, 나머지는 HTTP 캐시를 재사용합니다.
          [{ url: INDEX_URL, reload: true }, ...SHELL_ASSETS.map(url => ({ url, reload: false }))].map(
            async ({ url, reload }) => {
              try {
                const response = await fetch(url, reload ? { cache: "reload" } : undefined);
                if (response.ok) await cache.put(url, response);
              } catch {
                /* 오프라인이거나 저장에 실패해도 설치는 계속합니다. */
              }
            },
          ),
        );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    (async () => {
      try {
        const keys = await caches.keys();
        await Promise.all(
          keys
            .filter(key => key.startsWith(CACHE_PREFIX) && !CURRENT_CACHES.includes(key))
            .map(key => caches.delete(key)),
        );
      } catch {
        /* 정리에 실패해도 활성화는 계속합니다. */
      }
      await self.clients.claim();
    })(),
  );
});

const trimCache = async (cacheName, limit) => {
  const cache = await openCache(cacheName);
  if (!cache) return;
  try {
    const keys = await cache.keys();
    await Promise.all(keys.slice(0, Math.max(0, keys.length - limit)).map(key => cache.delete(key)));
  } catch {
    /* 정리 실패는 무시합니다. */
  }
};

const cacheFirst = async (event, cacheName, revalidate) => {
  const { request } = event;
  const cache = await openCache(cacheName);
  const cached = await matchCache(cache, request);
  if (cached) {
    if (revalidate)
      extendLifetime(
        event,
        fetch(request).then(response => (response.ok && cache ? cache.put(request, response) : undefined)),
      );
    return cached;
  }
  const response = await fetch(request);
  if (response.ok && cache) {
    const limit = CACHE_LIMITS[cacheName];
    const stored = cache.put(request, response.clone()).catch(() => undefined);
    // 정리는 저장이 끝난 뒤에 돌아야 방금 넣은 항목까지 세어집니다.
    extendLifetime(event, limit ? stored.then(() => trimCache(cacheName, limit)) : stored);
  }
  return response;
};

const networkFirstDocument = async (event, cacheable) => {
  const cache = await openCache(SHELL_CACHE);
  try {
    const response = await fetch(event.request);
    if (response.ok && cacheable) putLater(event, cache, INDEX_URL, response.clone());
    return response;
  } catch (reason) {
    const cached = await matchCache(cache, INDEX_URL);
    if (cached) return cached;
    throw reason;
  }
};

self.addEventListener("fetch", event => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // OAuth 콜백과 API 응답은 항상 네트워크에서 가져옵니다.
  if (url.pathname === OAUTH_CALLBACK_PATH || url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    // 셸로 저장하는 건 실제 시작 URL 응답뿐입니다. 다른 경로의 응답으로 셸이 오염되지 않게 합니다.
    event.respondWith(networkFirstDocument(event, url.pathname === START_PATH));
    return;
  }
  if (!url.pathname.startsWith(START_PATH)) return;

  const path = url.pathname.slice(START_PATH.length);
  if (path.startsWith("assets/")) {
    event.respondWith(cacheFirst(event, ASSET_CACHE, false));
    return;
  }
  if (path.startsWith("fonts/")) {
    event.respondWith(cacheFirst(event, FONT_CACHE, false));
    return;
  }
  if (path.startsWith("icons/") || path === "manifest.webmanifest") {
    event.respondWith(cacheFirst(event, SHELL_CACHE, true));
  }
});
