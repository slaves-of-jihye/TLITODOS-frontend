/**
 * 화면을 화이트로 그릴지 다크로 그릴지.
 *
 * 고르는 것은 셋입니다 — 기기에 맞춤(`system`), 화이트, 다크. 그림에 쓰이는 것은
 * 둘뿐이라, 선택을 `light`/`dark`로 풀어 `<html data-theme>`에 적어 두면 색은 전부
 * CSS 변수가 알아서 갈아입습니다(`packages/ui/src/theme.ts`).
 *
 * 폰트·시간 표기와 달리 서버에 두지 않습니다. `기기에 맞춤`이 기기마다 다른 답을
 * 내는 선택이라, 한 계정이 한 값을 들고 다니는 모양과 맞지 않습니다. 기기에 남기고,
 * 첫 그림부터 적용해 흰 화면이 번쩍이지 않게 합니다.
 *
 * `index.html`의 인라인 스크립트가 같은 일을 번들이 오기 전에 먼저 합니다. 저장 키와
 * 풀이 규칙을 바꾸면 그쪽도 함께 고쳐야 합니다.
 */
export type ThemeMode = "system" | "light" | "dark";

export const DEFAULT_THEME_MODE: ThemeMode = "system";

const storageKey = "tlitodos.theme";
const darkQuery = "(prefers-color-scheme: dark)";

/** 상단 주소창·상태 줄 색. 바탕색과 같아야 앱이 화면 끝까지 이어져 보입니다. */
const chromeColor = { light: "#ffffff", dark: "#16181d" } as const;

export const resolveThemeMode = (value: string | null | undefined): ThemeMode =>
  value === "light" || value === "dark" || value === "system" ? value : DEFAULT_THEME_MODE;

export const readStoredThemeMode = (): ThemeMode => {
  if (typeof window === "undefined") return DEFAULT_THEME_MODE;
  try {
    return resolveThemeMode(window.localStorage.getItem(storageKey));
  } catch {
    return DEFAULT_THEME_MODE;
  }
};

const systemPrefersDark = () => typeof window !== "undefined" && window.matchMedia?.(darkQuery).matches === true;

/** 선택을 지금 그려야 할 `light`/`dark`로 풉니다. */
export const resolveAppearance = (mode: ThemeMode): "light" | "dark" =>
  mode === "system" ? (systemPrefersDark() ? "dark" : "light") : mode;

/** 선택을 문서에 반영하고 저장합니다. 저장에 실패해도 이번 세션에는 적용됩니다. */
export const applyThemeMode = (mode: ThemeMode, { persist = true } = {}): ThemeMode => {
  const appearance = resolveAppearance(mode);
  const root = document.documentElement;
  root.dataset.theme = appearance;
  root.style.colorScheme = appearance;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", chromeColor[appearance]);
  if (persist) {
    try {
      window.localStorage.setItem(storageKey, mode);
    } catch {
      /* 저장하지 못해도 이번 세션에는 적용됩니다. */
    }
  }
  return mode;
};

/**
 * `기기에 맞춤`일 때 기기가 모드를 바꾸면(해가 지면 자동으로 어두워지는 설정 등)
 * 따라갑니다. 선택이 `light`/`dark`로 고정돼 있으면 기기 쪽 변화는 듣지 않습니다.
 * 부팅 때 한 번만 부르면 됩니다.
 */
export const watchSystemTheme = () => {
  const query = window.matchMedia?.(darkQuery);
  if (!query) return;
  query.addEventListener("change", () => {
    if (readStoredThemeMode() === "system") applyThemeMode("system", { persist: false });
  });
};
