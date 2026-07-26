/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_GOOGLE_CLIENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface GoogleTokenResponse {
  access_token?: string;
  error?: string;
}

interface GoogleOAuthPopupError {
  type?: "popup_failed_to_open" | "popup_closed" | "unknown";
}

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: readonly string[];
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
  prompt: () => Promise<void>;
}

interface WindowEventMap {
  beforeinstallprompt: BeforeInstallPromptEvent;
  appinstalled: Event;
}

interface Navigator {
  /** iOS Safari가 홈 화면에서 실행 중인지 알려주는 비표준 속성입니다. */
  readonly standalone?: boolean;
}

interface Window {
  google?: {
    accounts: {
      oauth2: {
        initTokenClient: (options: {
          client_id: string;
          scope: string;
          callback: (response: GoogleTokenResponse) => void;
          error_callback?: (response: GoogleOAuthPopupError) => void;
        }) => { requestAccessToken: () => void };
      };
    };
  };
}
