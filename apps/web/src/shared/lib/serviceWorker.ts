/**
 * 서비스 워커 등록.
 *
 * 개발 서버에서는 HMR과 캐시가 충돌하므로 프로덕션 빌드에서만 등록합니다.
 * 로컬에서 설치 흐름을 확인할 때는 `pnpm build:web` 후 `pnpm --filter web preview`를 사용하세요.
 */
export const registerServiceWorker = () => {
  if (!import.meta.env.PROD || typeof window === "undefined" || !("serviceWorker" in window.navigator)) return;

  const register = async () => {
    try {
      const registration = await window.navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`);
      // 오래 열려 있는 탭도 다시 보일 때 새 버전을 확인합니다.
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") void registration.update();
      });
    } catch {
      /* 서비스 워커 없이도 앱은 정상 동작합니다. */
    }
  };

  if (document.readyState === "complete") void register();
  else window.addEventListener("load", () => void register(), { once: true });
};
