import { Global } from "@emotion/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createApiClient } from "@tlitodos/api-client";
import { ApiProvider } from "@tlitodos/hooks";
import { globalStyles } from "@tlitodos/ui";
import { useMemo, useRef, type ReactNode } from "react";
import { useSessionStore } from "./sessionStore";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false }, mutations: { retry: 0 } },
});

export const AppProviders = ({ children }: { children: ReactNode }) => {
  const clearSession = useSessionStore((state) => state.clearSession);
  const refreshInFlight = useRef<Promise<string | null> | null>(null);
  const api = useMemo(() => createApiClient({
    baseUrl: import.meta.env.VITE_API_BASE_URL || "http://localhost:8000",
    getAccessToken: () => useSessionStore.getState().accessToken,
    refreshAccessToken: async () => {
      if (refreshInFlight.current) return refreshInFlight.current;
      const refreshToken = useSessionStore.getState().refreshToken;
      if (!refreshToken) return null;
      refreshInFlight.current = (async () => {
        try {
          const result = await createApiClient({ baseUrl: import.meta.env.VITE_API_BASE_URL || "http://localhost:8000", getAccessToken: () => null }).auth.refresh({ refreshToken });
          useSessionStore.getState().setSession(result);
          return result.accessToken;
        } catch { clearSession(); return null; }
        finally { refreshInFlight.current = null; }
      })();
      return refreshInFlight.current;
    },
    onUnauthorized: () => { clearSession(); queryClient.clear(); },
  }), [clearSession]);

  return <QueryClientProvider client={queryClient}>
      <ApiProvider value={api}><Global styles={globalStyles}/>{children}</ApiProvider>
    </QueryClientProvider>;
};
