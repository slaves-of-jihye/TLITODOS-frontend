import { Global } from "@emotion/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createApiClient } from "@tlitodos/api-client";
import { ApiProvider } from "@tlitodos/hooks";
import { globalStyles } from "@tlitodos/ui";
import { useMemo, type ReactNode } from "react";
import { useSessionStore } from "./sessionStore";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false }, mutations: { retry: 0 } },
});

const createRefreshHandler = (baseUrl: string, clearSession: () => void) => {
  let inFlight: Promise<string | null> | null = null;
  return async () => {
    if (inFlight) return inFlight;
    const refreshToken = useSessionStore.getState().refreshToken;
    if (!refreshToken) return null;
    inFlight = (async () => {
      try {
        const result = await createApiClient({ baseUrl, getAccessToken: () => null }).auth.refresh({ refreshToken });
        useSessionStore.getState().setSession(result);
        return result.accessToken;
      } catch {
        clearSession();
        return null;
      } finally {
        inFlight = null;
      }
    })();
    return inFlight;
  };
};

export const AppProviders = ({ children }: { children: ReactNode }) => {
  const clearSession = useSessionStore(state => state.clearSession);
  const api = useMemo(() => {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
    return createApiClient({
      baseUrl,
      getAccessToken: () => useSessionStore.getState().accessToken,
      refreshAccessToken: createRefreshHandler(baseUrl, clearSession),
      onUnauthorized: () => {
        clearSession();
        queryClient.clear();
      },
    });
  }, [clearSession]);

  return (
    <QueryClientProvider client={queryClient}>
      <ApiProvider value={api}>
        <Global styles={globalStyles} />
        {children}
      </ApiProvider>
    </QueryClientProvider>
  );
};
