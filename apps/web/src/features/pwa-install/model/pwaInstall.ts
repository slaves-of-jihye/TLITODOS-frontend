import { useSyncExternalStore } from "react";

/**
 * 홈 화면 설치 상태를 담는 앱 전역 스토어입니다.
 *
 * `beforeinstallprompt`는 React가 마운트되기 전에 발생할 수 있으므로 모듈이
 * 로드되는 시점에 이벤트를 잡아 둡니다.
 */

const dismissKey = "tlitodos.pwa-install-dismissed";
const isBrowser = typeof window !== "undefined";

type PwaInstallSnapshot = {
  /** 브라우저가 설치 프롬프트를 제공해 `promptInstall`을 쓸 수 있는 상태입니다. */
  canPrompt: boolean;
  /** 이미 설치된 앱으로 실행 중입니다. */
  installed: boolean;
  /** 설치 프롬프트 API가 없어 직접 안내해야 하는 iOS 계열입니다. */
  needsManualSteps: boolean;
  /** 사용자가 설치 배너를 닫았습니다. */
  bannerDismissed: boolean;
};

export type InstallOutcome = "accepted" | "dismissed" | "unavailable";

const standaloneQuery = isBrowser ? window.matchMedia("(display-mode: standalone)") : null;
const fullscreenQuery = isBrowser ? window.matchMedia("(display-mode: fullscreen)") : null;

let installedByEvent = false;

const readInstalled = () =>
  installedByEvent ||
  Boolean(standaloneQuery?.matches) ||
  Boolean(fullscreenQuery?.matches) ||
  (isBrowser && window.navigator.standalone === true);

// 카카오톡·네이버·라인·인스타그램 등 인앱 브라우저에는 '홈 화면에 추가'가 없습니다.
const inAppBrowserPattern = /KAKAOTALK|NAVER\(inapp|DaumApps|Line\/|Instagram|FBAN|FBAV|Snapchat/i;

const needsManualInstallSteps = () => {
  if (!isBrowser) return false;
  const agent = window.navigator.userAgent;
  // iPadOS는 데스크톱 Safari를 표방하므로 터치 지점 수로 구분합니다.
  const ios = /iPad|iPhone|iPod/.test(agent) || (agent.includes("Macintosh") && window.navigator.maxTouchPoints > 1);
  return ios && !inAppBrowserPattern.test(agent);
};

const readDismissed = () => {
  if (!isBrowser) return false;
  try {
    return window.localStorage.getItem(dismissKey) === "1";
  } catch {
    return false;
  }
};

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let snapshot: PwaInstallSnapshot = {
  canPrompt: false,
  installed: readInstalled(),
  needsManualSteps: needsManualInstallSteps(),
  bannerDismissed: readDismissed(),
};

const listeners = new Set<() => void>();
const publish = () => {
  const next: PwaInstallSnapshot = {
    canPrompt: deferredPrompt !== null,
    installed: readInstalled(),
    needsManualSteps: needsManualInstallSteps(),
    bannerDismissed: readDismissed(),
  };
  if (
    next.canPrompt === snapshot.canPrompt &&
    next.installed === snapshot.installed &&
    next.needsManualSteps === snapshot.needsManualSteps &&
    next.bannerDismissed === snapshot.bannerDismissed
  )
    return;
  snapshot = next;
  listeners.forEach(listener => listener());
};

if (isBrowser) {
  window.addEventListener("beforeinstallprompt", event => {
    // 기본 미니 인포바를 막고 앱 안에서 시점을 직접 정합니다.
    event.preventDefault();
    deferredPrompt = event;
    publish();
  });
  window.addEventListener("appinstalled", () => {
    installedByEvent = true;
    deferredPrompt = null;
    publish();
  });
  standaloneQuery?.addEventListener("change", publish);
}

export const promptInstall = async (): Promise<InstallOutcome> => {
  const event = deferredPrompt;
  if (!event) return "unavailable";
  // 프롬프트 이벤트는 한 번만 쓸 수 있습니다.
  deferredPrompt = null;
  try {
    await event.prompt();
    const { outcome } = await event.userChoice;
    return outcome;
  } catch {
    return "unavailable";
  } finally {
    publish();
  }
};

export const dismissInstallBanner = () => {
  try {
    window.localStorage.setItem(dismissKey, "1");
  } catch {
    /* 저장에 실패해도 이번 세션 동안은 닫힌 상태를 유지합니다. */
  }
  snapshot = { ...snapshot, bannerDismissed: true };
  listeners.forEach(listener => listener());
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
const getSnapshot = () => snapshot;

export const usePwaInstall = () => useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
