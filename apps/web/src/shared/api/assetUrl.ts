import { useApi } from "@tlitodos/hooks";
import { useEffect, useState } from "react";

export const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

/**
 * 서버가 내려준 파일 경로를 실제로 받아올 수 있는 주소로 바꿉니다.
 *
 * 프로필 이미지는 `/uploads/profiles/{filename}` 같은 상대 경로로 옵니다.
 * 프런트엔드와 API의 출처가 달라, 그대로 쓰면 프런트엔드 쪽으로 요청이 가서
 * 404가 납니다. 이미 절대 주소면 그대로 둡니다.
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
 * 인증이 필요한 업로드 파일을 blob 주소로 바꿔 줍니다.
 *
 * 서버가 `/uploads/...`를 Bearer로 잠갔습니다. `<img src>`에는 헤더를 붙일 수
 * 없으므로 여기서 토큰으로 받아 `URL.createObjectURL`로 넘깁니다. 이미 절대
 * 주소(`http`/`data`/`blob`)면 그대로 씁니다.
 *
 * 같은 파일을 여러 곳에서 쓰므로 결과는 모듈 캐시에 남겨 한 번만 받습니다.
 */
const objectUrlCache = new Map<string, string>();

export const useAssetObjectUrl = (url: string | null | undefined) => {
  const api = useApi();
  // 이미 blob이거나 캐시에 있으면 렌더 중에 바로 정합니다. 효과는 실제로 받아올 때만 씁니다.
  const immediate = !url ? null : /^(data:|blob:)/i.test(url) ? url : (objectUrlCache.get(url) ?? null);
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
