import { create } from "zustand";

const STORAGE_KEY = "tlitodos.session";
type StoredSession = { accessToken: string; refreshToken: string; expiresAt?: string };
const readStoredSession = (): StoredSession | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredSession) : null;
  } catch {
    return null;
  }
};

interface SessionState {
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: string | null;
  setSession: (session: StoredSession) => void;
  clearSession: () => void;
}

const initial = typeof window === "undefined" ? null : readStoredSession();
export const useSessionStore = create<SessionState>(set => ({
  accessToken: initial?.accessToken ?? null,
  refreshToken: initial?.refreshToken ?? null,
  expiresAt: initial?.expiresAt ?? null,
  setSession: session => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    set({ accessToken: session.accessToken, refreshToken: session.refreshToken, expiresAt: session.expiresAt ?? null });
  },
  clearSession: () => {
    localStorage.removeItem(STORAGE_KEY);
    set({ accessToken: null, refreshToken: null, expiresAt: null });
  },
}));
