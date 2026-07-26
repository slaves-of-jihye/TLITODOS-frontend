/*
 * TLITODOS 서비스 워커.
 *
 * 이 파일은 Vite `public/`에 있어 번들되지 않습니다. 해시가 붙은 산출물 이름을
 * 빌드 시점에 알 수 없으므로 사전 캐시 대신 런타임 캐시만 사용합니다.
 * - 문서 요청: 네트워크 우선(오프라인일 때만 캐시된 셸로 대체)
 * - `assets/` 산출물: 내용 주소 기반이라 캐시 우선
 * - 폰트/아이콘/매니페스트: 캐시 우선 + 백그라운드 갱신
 * API 응답과 OAuth 콜백은 절대 캐시하지 않습니다.
 */

const VERSION = "v1";
const SHELL_CACHE = `tlitodos-shell-${VERSION}`;
const ASSET_CACHE = `tlitodos-assets-${VERSION}`;
const ASSET_CACHE_LIMIT = 80;

const scope = new URL("./", self.location.href);
const INDEX_URL = new URL("index.html", scope).href;
const OAUTH_CALLBACK_URL = new URL("oauth-callback.html", scope).href;
const SHELL_ASSETS = [
  INDEX_URL,
  new URL("manifest.webmanifest", scope).href,
  new URL("fonts/KyoboHandwriting2019.otf", scope).href,
  new URL("icons/icon-192.png", scope).href,
  new URL("icons/apple-touch-icon.png", scope).href,
];

self.addEventListener("install", event => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      // 폰트 하나가 실패해도 설치 전체가 실패하지 않도록 개별로 담습니다.
      await Promise.all(
        SHELL_ASSETS.map(async url => {
          try {
            const response = await fetch(url, { cache: "reload" });
            if (response.ok) await cache.put(url, response);
          } catch {
            /* 오프라인 설치는 조용히 넘어갑니다. */
          }
        }),
      );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter(key => key !== SHELL_CACHE && key !== ASSET_CACHE).map(key => caches.delete(key)));
      await self.clients.claim();
    })(),
  );
});

const trimCache = async (cacheName, limit) => {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  await Promise.all(keys.slice(0, Math.max(0, keys.length - limit)).map(key => cache.delete(key)));
};

const cacheFirst = async (request, cacheName, revalidate) => {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) {
    if (revalidate)
      void fetch(request)
        .then(response => (response.ok ? cache.put(request, response) : undefined))
        .catch(() => undefined);
    return cached;
  }
  const response = await fetch(request);
  if (response.ok) {
    await cache.put(request, response.clone());
    if (cacheName === ASSET_CACHE) void trimCache(ASSET_CACHE, ASSET_CACHE_LIMIT);
  }
  return response;
};

const networkFirstDocument = async request => {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) await cache.put(INDEX_URL, response.clone());
    return response;
  } catch (reason) {
    const cached = await cache.match(INDEX_URL);
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
  if (url.href === OAUTH_CALLBACK_URL || url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirstDocument(request));
    return;
  }
  if (!url.href.startsWith(scope.href)) return;

  const path = url.href.slice(scope.href.length);
  if (path.startsWith("assets/")) {
    event.respondWith(cacheFirst(request, ASSET_CACHE, false));
    return;
  }
  if (path.startsWith("fonts/") || path.startsWith("icons/") || path === "manifest.webmanifest") {
    event.respondWith(cacheFirst(request, SHELL_CACHE, true));
  }
});
