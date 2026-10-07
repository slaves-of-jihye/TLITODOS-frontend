import { css } from "@emotion/react";
import { DEFAULT_FONT_KEY, FONT_PRESETS, fontFamilyStack } from "@tlitodos/core";

/**
 * 아이콘으로 쓰는 문장부호(`›`, `✓` 등)에 쓰는 글꼴.
 *
 * 사용자가 고른 폰트가 해당 부호를 담고 있으면 브라우저는 폴백하지 않고 그
 * 글리프를 씁니다. 그 글리프가 비어 있으면 자리만 차지하고 아무것도 그려지지
 * 않습니다 — 고양체의 `›`(U+203A)가 그렇습니다. 본문 폰트와 분리해 둡니다.
 */
export const uiGlyphFont = "system-ui, sans-serif";

/**
 * Figma의 디자인 변수를 그대로 옮긴 토큰입니다.
 *
 * 이름은 Figma 쪽(`gray/200`, `text/muted`, `state/error` 등)을 따릅니다. 값이
 * 어디서 왔는지 추적할 수 있어야 디자인이 바뀔 때 대조하기 쉽습니다.
 *
 * 값은 CSS 변수입니다. 화이트와 다크가 같은 이름으로 다른 색을 내야 하기 때문에,
 * 실제 색은 아래 `lightTokens`/`darkTokens`에 있고 `globalStyles`가 `:root`에
 * 깔아 둡니다. 컴포넌트는 이름만 알면 되고 모드를 모릅니다. `white`/`black`은 색
 * 이름이 아니라 "바탕"과 "그 반대"입니다 — 다크에서는 바탕이 어둡고 반대가 밝습니다.
 */
const tokenNames = {
  white: "--tl-white",
  black: "--tl-black",
  gray100: "--tl-gray100",
  gray200: "--tl-gray200",
  gray300: "--tl-gray300",
  gray400: "--tl-gray400",
  textPrimary: "--tl-text-primary",
  textSecondary: "--tl-text-secondary",
  textMuted: "--tl-text-muted",
  stateError: "--tl-state-error",
  stateSaturday: "--tl-state-saturday",
  overlay: "--tl-overlay",
  loginOverlay: "--tl-login-overlay",
  shadow: "--tl-shadow",
  veil: "--tl-veil",
  sweep: "--tl-sweep",
  scrollThumb: "--tl-scroll-thumb",
  dangerTint: "--tl-danger-tint",
} as const;

type TokenKey = keyof typeof tokenNames;
const cssVar = (key: TokenKey) => `var(${tokenNames[key]})`;

export const palette = {
  white: cssVar("white"),
  black: cssVar("black"),
  gray100: cssVar("gray100"),
  gray200: cssVar("gray200"),
  gray300: cssVar("gray300"),
  gray400: cssVar("gray400"),
  textPrimary: cssVar("textPrimary"),
  textSecondary: cssVar("textSecondary"),
  textMuted: cssVar("textMuted"),
  stateError: cssVar("stateError"),
  stateSaturday: cssVar("stateSaturday"),
  /**
   * 카테고리 색이나 빨강 위에 얹히는 글자와 표식. 모드와 상관없이 흰색입니다.
   * 카테고리 색은 모드를 따라 바뀌지 않으므로, 그 위의 글자도 따라 바뀌면 안 됩니다.
   */
  onAccent: "#ffffff",
} as const;

/** 팔레트에 없는, 한두 군데에서만 쓰는 색. */
export const extraTokens = {
  veil: cssVar("veil"),
  sweep: cssVar("sweep"),
  scrollThumb: cssVar("scrollThumb"),
  dangerTint: cssVar("dangerTint"),
} as const;

const lightTokens: Record<TokenKey, string> = {
  white: "#ffffff",
  black: "#1d1d1d",
  gray100: "#f8f9fb",
  gray200: "#eef1f6",
  gray300: "#dde2ec",
  gray400: "#c4ccda",
  textPrimary: "#1d1d1d",
  textSecondary: "#334655",
  textMuted: "#647f8b",
  stateError: "#fc3c60",
  stateSaturday: "#0051ff",
  overlay: "rgba(29,29,29,.44)",
  loginOverlay: "rgba(29,29,29,.66)",
  shadow: "0 18px 60px rgba(34, 54, 72, .13)",
  veil: "rgba(255, 255, 255, 0.86)",
  sweep: "rgba(255, 255, 255, 0.7)",
  scrollThumb: "rgba(29, 29, 29, 0.22)",
  dangerTint: "#fff0f3",
};

/**
 * 다크. 회색 계단은 화이트의 것을 뒤집어 한 칸씩 밝아지게 둡니다 — "바탕에서 한 단
 * 내려간 면"이 어둡게는 "한 단 올라간 면"이 됩니다. 순수한 검정은 쓰지 않습니다.
 */
const darkTokens: Record<TokenKey, string> = {
  white: "#16181d",
  black: "#f1f3f7",
  gray100: "#1e2128",
  gray200: "#292d36",
  gray300: "#383d49",
  gray400: "#5b6270",
  textPrimary: "#eef1f6",
  textSecondary: "#c3ccd8",
  textMuted: "#92a4b0",
  stateError: "#ff627f",
  stateSaturday: "#6b97ff",
  overlay: "rgba(0,0,0,.6)",
  loginOverlay: "rgba(0,0,0,.78)",
  shadow: "0 18px 60px rgba(0, 0, 0, .45)",
  veil: "rgba(22, 24, 29, 0.88)",
  sweep: "rgba(255, 255, 255, 0.09)",
  scrollThumb: "rgba(255, 255, 255, 0.28)",
  dangerTint: "rgba(255, 98, 127, 0.16)",
};

const declarations = (set: Record<TokenKey, string>) =>
  (Object.keys(tokenNames) as TokenKey[]).map(key => `${tokenNames[key]}: ${set[key]};`).join("\n    ");

/** Figma 텍스트 스타일. 줄간격은 전 스타일 공통 1.6입니다. */
export const typeScale = {
  h1: "28px",
  h2: "24px",
  h3: "20px",
  s: "16px",
  xs: "12px",
} as const;
export const lineHeight = 1.6;

export const theme = {
  colors: {
    ink: palette.textPrimary,
    secondary: palette.textSecondary,
    muted: palette.textMuted,
    line: palette.gray300,
    panel: palette.gray100,
    fill: palette.gray200,
    disabled: palette.gray400,
    white: palette.white,
    selected: palette.black,
    blue: palette.stateSaturday,
    red: palette.stateError,
    overlay: cssVar("overlay"),
    loginOverlay: cssVar("loginOverlay"),
  },
  text: typeScale,
  shadow: cssVar("shadow"),
  radius: { sm: "8px", md: "18px", lg: "36px", pill: "100px" },
  /** 화면 바깥 여백과 두 단 사이 간격. Figma main 화면 기준입니다. */
  layout: { gutter: "90px", top: "80px", columnGap: "90px", calendar: "450px", board: "560px", nav: "76px" },
} as const;

/**
 * 고를 수 있는 폰트를 모두 선언합니다. `@font-face` 선언만으로는 파일을 받지
 * 않고 실제로 사용될 때만 내려받으므로, 전부 선언해도 비용이 없습니다.
 */
const fontFaces = FONT_PRESETS.map(
  preset => `
  @font-face {
    font-family: "${preset.family}";
    src: url("./fonts/${preset.file}") format("${preset.format}");
    font-style: normal;
    font-weight: 400;
    font-display: swap;
  }`,
).join("");

export const globalStyles = css`
  ${fontFaces}
  :root {
    color-scheme: light;
    ${declarations(lightTokens)}
  }
  /* 앱이 선택(기기 설정 포함)을 풀어 data-theme에 light/dark로 적어 둡니다. */
  :root[data-theme="dark"] {
    color-scheme: dark;
    ${declarations(darkTokens)}
  }
  * {
    box-sizing: border-box;
  }
  html,
  body,
  #root {
    min-width: 320px;
    min-height: 100%;
    margin: 0;
  }
  html {
    -webkit-text-size-adjust: 100%;
  }
  body {
    background: ${palette.white};
    color: ${theme.colors.ink};
    /* 선택한 폰트는 앱이 --tlitodos-font 변수를 갈아끼워 반영합니다. */
    font-family: var(--tlitodos-font, ${fontFamilyStack(DEFAULT_FONT_KEY)});
    font-size: ${typeScale.s};
    line-height: ${lineHeight};
    overflow-x: hidden;
    -webkit-font-smoothing: antialiased;
  }
  /* 손글씨 폰트에는 굵기가 없어 bold가 합성 굵게로 뭉개집니다. 크기로 위계를 냅니다. */
  h1,
  h2,
  h3,
  strong,
  b {
    font-weight: 400;
  }
  h1 {
    font-size: ${typeScale.h1};
  }
  h2 {
    font-size: ${typeScale.h2};
  }
  h3 {
    font-size: ${typeScale.h3};
  }
  button,
  input,
  textarea,
  select {
    font: inherit;
  }
  button {
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }
  :focus-visible {
    outline: 3px solid rgba(0, 81, 255, 0.22);
    outline-offset: 2px;
  }
  /*
   * 입력칸에는 초점 링을 두지 않습니다.
   *
   * 회색 칸과 깜박이는 커서가 이미 어디에 쓰고 있는지 보여 주고, 칸 안에 딱 맞게
   * 들어앉은 input 위로 링이 뜨면 칸 밖으로 삐져나옵니다. 키보드로 옮겨 다닐 때
   * 표시가 필요한 버튼·링크에는 위 규칙을 그대로 둡니다.
   */
  input:focus,
  input:focus-visible,
  textarea:focus,
  textarea:focus-visible {
    outline: none;
  }
`;
