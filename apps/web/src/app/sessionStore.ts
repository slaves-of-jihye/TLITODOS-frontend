import { create } from "zustand";

const STORAGE_KEY = "tlitodos.session";
type StoredSession = { accessToken: string; refreshToken: string; expiresAt?: string };
/*
 * 저장소는 있다고 믿지 않습니다.
 *
 * 파이어폭스의 "쿠키 모두 차단"이나 사파리의 잠금 모드에서는 `localStorage`에
 * 손대는 것만으로 예외가 납니다. 읽기는 이미 감싸 두었지만 쓰기는 그대로여서,
 * 그런 브라우저에서는 로그인에 성공한 직후 저장하다 튕기며 로그인 실패처럼
 * 보였습니다. 저장이 안 되면 이번 세션 동안만 기억합니다.
 */
const readStoredSession = (): StoredSession | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredSession) : null;
  } catch {
    return null;
  }
};
const writeStoredSession = (session: StoredSession | null) => {
  try {
    if (session) localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* 저장하지 못해도 로그인 자체는 이어집니다. */
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
    writeStoredSession(session);
    set({ accessToken: session.accessToken, refreshToken: session.refreshToken, expiresAt: session.expiresAt ?? null });
  },
  clearSession: () => {
    writeStoredSession(null);
    set({ accessToken: null, refreshToken: null, expiresAt: null });
  },
}));
