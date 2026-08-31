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
