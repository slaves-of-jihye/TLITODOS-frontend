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
 */
export const palette = {
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
} as const;

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
    overlay: "rgba(29,29,29,.44)",
    loginOverlay: "rgba(29,29,29,.66)",
  },
  text: typeScale,
  shadow: "0 18px 60px rgba(34, 54, 72, .13)",
  radius: { sm: "8px", md: "18px", lg: "36px", pill: "100px" },
  /** 화면 바깥 여백과 두 단 사이 간격. Figma main 화면 기준입니다. */
  layout: { gutter: "90px", top: "80px", columnGap: "90px", calendar: "450px", board: "560px", nav: "100px" },
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
`;
