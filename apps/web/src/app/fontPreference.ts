import { DEFAULT_FONT_KEY, fontFamilyStack, resolveFont, type FontKey } from "@tlitodos/core";

/**
 * 선택한 폰트를 CSS 변수 하나로 반영합니다.
 *
 * 서버 값은 `GET /users/me`로 오기 때문에 매 접속마다 기본 폰트로 그려졌다가
 * 바뀌는 깜빡임이 생깁니다. 마지막 선택을 로컬에 남겨 두고 부팅 시점에 먼저
 * 적용한 뒤, 서버 응답이 오면 보정합니다.
 */
const storageKey = "tlitodos.font";
const cssVariable = "--tlitodos-font";

export const readStoredFont = (): FontKey => {
  if (typeof window === "undefined") return DEFAULT_FONT_KEY;
  try {
    return resolveFont(window.localStorage.getItem(storageKey)).key;
  } catch {
    return DEFAULT_FONT_KEY;
  }
};

/**
 * 목록에 없는 키를 받으면 기본 폰트로 떨어집니다. 적용한 키를 돌려줍니다.
 *
 * `persist: false`는 미리보기용입니다. 확정하지 않은 선택이 로컬에 남으면 다음
 * 접속 때 취소한 폰트로 되살아나므로, 화면에만 반영하고 저장은 하지 않습니다.
 */
export const applyFont = (key: string | null | undefined, { persist = true } = {}): FontKey => {
  const { key: applied } = resolveFont(key);
  document.documentElement.style.setProperty(cssVariable, fontFamilyStack(applied));
  if (!persist) return applied;
  try {
    window.localStorage.setItem(storageKey, applied);
  } catch {
    /* 저장에 실패해도 이번 세션에는 적용됩니다. */
  }
  return applied;
};
