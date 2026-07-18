import { css } from "@emotion/react";

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

export const globalStyles = css`
  @font-face {
    font-family: "Kyobo Handwriting 2019";
    src: url("./fonts/KyoboHandwriting2019.otf") format("opentype");
    font-style: normal;
    font-weight: 400;
    font-display: swap;
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
    background: #fff;
    color: ${theme.colors.ink};
    font-family: "Kyobo Handwriting 2019", system-ui, sans-serif;
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
