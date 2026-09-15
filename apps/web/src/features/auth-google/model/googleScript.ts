/** 구글이 내려 주는 로그인 스크립트. 팝업으로 여는 길이 이 스크립트를 씁니다. */
const GOOGLE_SCRIPT = "https://accounts.google.com/gsi/client";

let loading: Promise<void> | null = null;

/**
 * 구글 로그인 스크립트를 필요할 때 한 번만 받아 옵니다.
 *
 * 예전에는 `index.html`에 박아 두어 로그인한 사람도 방문할 때마다 받았습니다.
 * 이미 들어와 있는 사람에게는 쓸 일이 없는 99KB짜리(푼 크기로는 270KB) 남의
 * 스크립트라, 로그인 화면이 실제로 떠 있을 때만 붙입니다.
 *
 * 받아 오지 못해도 로그인이 막히지는 않습니다 — `window.google`이 없으면
 * `LoginModal`이 리다이렉트 길로 넘어갑니다.
 */
export const loadGoogleScript = () => {
  if (loading) return loading;
  loading = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GOOGLE_SCRIPT}"]`);
    if (existing) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = GOOGLE_SCRIPT;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      // 다음에 다시 시도할 수 있도록 실패한 약속은 남겨 두지 않습니다.
      loading = null;
      reject(new Error("Google 로그인 스크립트를 받아오지 못했습니다."));
    };
    document.head.append(script);
  });
  return loading;
};
