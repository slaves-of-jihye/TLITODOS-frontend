import { useApi } from "@tlitodos/hooks";
import { useEffect, useState } from "react";

export const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

/**
 * 서버가 내려준 파일 경로를 실제로 받아올 수 있는 주소로 바꿉니다.
 *
 * 서버가 올려받은 사진은 `/uploads/profiles/{filename}` 같은 상대 경로로 옵니다.
 * 프런트엔드와 API의 출처가 달라, 그대로 쓰면 프런트엔드 쪽으로 요청이 가서
 * 404가 납니다. 구글이 준 주소처럼 이미 절대 주소인 것은 그대로 둡니다.
 */
export const resolveAssetUrl = (url: string | null | undefined) => {
  if (!url) return null;
  if (/^(https?:|data:|blob:)/i.test(url)) return url;
  try {
    return new URL(url, apiBaseUrl.endsWith("/") ? apiBaseUrl : `${apiBaseUrl}/`).href;
  } catch {
    return url;
  }
};

/**
 * 우리 서버가 잠가 둔 파일인지.
 *
 * `/uploads/...`는 Bearer가 있어야 열립니다. 그런데 구글로 로그인한 사람의
 * 프로필 사진은 서버가 받아 두는 게 아니라 구글이 준 주소
 * (`lh3.googleusercontent.com/...`)를 그대로 들고 있습니다. 거기에 우리 토큰을
 * 붙여 보내면 헤더 때문에 사전 요청이 붙고, 남의 서버는 그걸 허락하지 않아
 * CORS로 막힙니다 — 사진이 끝내 뜨지 않습니다.
 *
 * 호스트 이름을 집어 거르지 않고 출처로 가립니다. 구글만의 일이 아니고, 로그인
 * 수단이 늘거나 사진을 다른 CDN에 두게 되어도 규칙이 그대로 맞습니다. 남의
 * 주소는 받아 올 것 없이 `<img src>`에 그대로 넣으면 됩니다.
 */
const isOwnFile = (url: string) => {
  if (/^(data:|blob:)/i.test(url)) return false;
  try {
    return new URL(url, apiBaseUrl).origin === new URL(apiBaseUrl).origin;
  } catch {
    return false;
  }
};

/**
 * 인증이 필요한 업로드 파일을 blob 주소로 바꿔 줍니다.
 *
 * 우리 서버의 파일만 토큰을 달아 받아 오고(`<img src>`에는 헤더를 붙일 수 없어
 * `URL.createObjectURL`로 넘깁니다), 남의 주소는 손대지 않고 그대로 돌려줍니다.
 *
 * 같은 파일을 여러 곳에서 쓰므로 결과는 모듈 캐시에 남겨 한 번만 받습니다.
 */
const objectUrlCache = new Map<string, string>();

export const useAssetObjectUrl = (url: string | null | undefined) => {
  const api = useApi();
  // 남의 주소이거나 이미 캐시에 있으면 렌더 중에 바로 정합니다. 효과는 실제로 받아올 때만 씁니다.
  const immediate = !url ? null : !isOwnFile(url) ? url : (objectUrlCache.get(url) ?? null);
  const [fetched, setFetched] = useState<{ url: string; objectUrl: string } | null>(null);
  useEffect(() => {
    if (!url || immediate) return;
    let alive = true;
    void api
      .asset(url)
      .then(blob => {
        const objectUrl = URL.createObjectURL(blob);
        objectUrlCache.set(url, objectUrl);
        // 캐시에 남기므로 revoke하지 않습니다. 탭이 닫힐 때 함께 사라집니다.
        if (alive) setFetched({ url, objectUrl });
      })
      .catch(() => {
        if (alive) setFetched(null);
      });
    return () => {
      alive = false;
    };
  }, [api, url, immediate]);
  if (immediate) return immediate;
  return fetched && fetched.url === url ? fetched.objectUrl : null;
};
