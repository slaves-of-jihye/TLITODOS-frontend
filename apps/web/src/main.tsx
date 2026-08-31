import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { AppProviders } from "./app/AppProviders.tsx";
import { applyFont, readStoredFont } from "./app/fontPreference.ts";
import { registerServiceWorker } from "./app/serviceWorker.ts";

// 서버 값을 기다리지 않고 마지막 선택을 먼저 적용해 폰트가 바뀌는 깜빡임을 없앱니다.
applyFont(readStoredFont());
registerServiceWorker();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </StrictMode>,
);
