import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App, AppProviders } from "./app";
import {
  applyFont,
  applyThemeMode,
  readStoredFont,
  readStoredThemeMode,
  registerServiceWorker,
  watchSystemTheme,
} from "@/shared/lib";

// 서버 값을 기다리지 않고 마지막 선택을 먼저 적용해 폰트가 바뀌는 깜빡임을 없앱니다.
applyFont(readStoredFont());
applyThemeMode(readStoredThemeMode(), { persist: false });
watchSystemTheme();
registerServiceWorker();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </StrictMode>,
);
