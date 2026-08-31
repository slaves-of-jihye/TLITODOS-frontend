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

export const theme = {
  colors: {
    ink: "#1d1d1d",
    muted: "#647f8b",
    line: "#e8edf2",
    panel: "#f7f9fb",
    white: "#ffffff",
    selected: "#202020",
    blue: "#145dff",
    red: "#ff4562",
    overlay: "rgba(29,29,29,.44)",
    loginOverlay: "rgba(29,29,29,.66)",
  },
  shadow: "0 18px 60px rgba(34, 54, 72, .13)",
  radius: { sm: "10px", md: "18px", lg: "36px", pill: "999px" },
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
    background: #fff;
    color: ${theme.colors.ink};
    /* 선택한 폰트는 앱이 --tlitodos-font 변수를 갈아끼워 반영합니다. */
    font-family: var(--tlitodos-font, ${fontFamilyStack(DEFAULT_FONT_KEY)});
    overflow-x: hidden;
    -webkit-font-smoothing: antialiased;
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
    outline: 3px solid rgba(20, 93, 255, 0.22);
    outline-offset: 2px;
  }
`;
