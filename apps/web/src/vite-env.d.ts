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
