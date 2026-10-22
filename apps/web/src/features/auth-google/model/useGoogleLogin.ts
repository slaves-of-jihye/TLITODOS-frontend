import { useCallback, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CATEGORY_PRESETS, sortCategories } from "@/entities/category";
import { useApi } from "@/shared/api";
import { errorMessage, randomId } from "@/shared/lib";
import { useSessionStore } from "@/shared/model";
import { loadGoogleScript } from "./googleScript";

const googleOAuthResultKey = "tlitodos-google-oauth-result";

const googleOAuthReturnKey = "tlitodos-google-oauth-return";

const googleOAuthStateKey = "tlitodos-google-oauth-state";

type GoogleOAuthResult = {
  accessToken?: string;
  error?: string;
};

const buildGoogleOAuthUrl = (clientId: string, state: string) => {
  const redirectUri = `${window.location.origin}/oauth-callback.html`;
  const query = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "token",
    scope: "openid email profile",
    include_granted_scopes: "true",
    prompt: "select_account",
    state,
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${query}`;
};

/**
 * 리다이렉트로 돌아온 결과를 꺼내 옵니다.
 *
 * 팝업이 막혀 리다이렉트로 돌아오는 길에서는, 콜백 페이지가 결과를
 * `sessionStorage`에 놓고 이 화면으로 돌려보냅니다. 그 전달함은 다른 페이지가
 * 남긴 것이라 리액트 상태가 아니고, 화면을 그린 뒤에 꺼내면 이미 그린 것을
 * 곧바로 고쳐 한 번 더 그리게 됩니다. 그래서 모듈이 처음 불릴 때 한 번 꺼내
 * 두고 자리를 비웁니다 — 첫 그림부터 결과를 손에 들고 시작합니다.
 *
 * 저장소에 손대는 것만으로 던지는 브라우저가 있어 감싸 둡니다.
 */
const takeRedirectResult = (): GoogleOAuthResult | "unreadable" | null => {
  let stored: string | null;
  try {
    stored = window.sessionStorage.getItem(googleOAuthResultKey);
    if (stored) window.sessionStorage.removeItem(googleOAuthResultKey);
  } catch {
    return null;
  }
  if (!stored) return null;
  try {
    return JSON.parse(stored) as GoogleOAuthResult;
  } catch {
    return "unreadable";
  }
};

const redirectResult = takeRedirectResult();
const redirectError =
  redirectResult === "unreadable"
    ? "Google 로그인 결과를 확인하지 못했습니다."
    : redirectResult && !redirectResult.accessToken
      ? "Google 로그인에 실패했습니다."
      : "";
/**
 * 돌아온 토큰. 한 번 쓰고 비웁니다.
 *
 * 로그아웃하면 랜딩이 다시 뜨는데, 그때 같은 토큰을 또 내밀면 안 됩니다.
 */
let pendingRedirectToken =
  redirectResult && redirectResult !== "unreadable" ? (redirectResult.accessToken ?? null) : null;

const redirectToGoogle = (clientId: string) => {
  const returnPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  const state = randomId();
  window.sessionStorage.setItem(googleOAuthReturnKey, returnPath);
  window.sessionStorage.setItem(googleOAuthStateKey, state);
  window.location.assign(buildGoogleOAuthUrl(clientId, state));
};

/**
 * 구글 로그인을 시작하고 그 결과를 세션으로 바꿉니다.
 *
 * 로그인 화면(랜딩)이 한 번만 부르고 `login`/`loading`/`error`를 아래로 내려 줍니다 —
 * 헤더 버튼과 본문의 시작 버튼이 같은 상태를 보도록, 훅을 둘 이상 세우지 않습니다.
 * 리다이렉트로 돌아온 토큰은 모듈 변수 하나에 있어 한 번만 쓰이므로, 두 번 세우면
 * 먼저 세운 쪽이 가져가 버립니다.
 */
export const useGoogleLogin = () => {
  const accessToken = useSessionStore(state => state.accessToken);
  const setSession = useSessionStore(state => state.setSession);
  const api = useApi();
  const queryClient = useQueryClient();
  // 리다이렉트로 돌아왔다면 그 결과를 처음부터 들고 그립니다.
  const [error, setError] = useState(redirectError);
  /* 토큰을 들고 돌아왔다면 이미 로그인 중입니다. 첫 그림부터 그렇게 보입니다. */
  const [loading, setLoading] = useState(pendingRedirectToken !== null);
  /**
   * 구글 토큰을 우리 세션으로 바꿉니다.
   *
   * "시작합니다"라는 표시(`loading`)는 부르는 쪽이 맡습니다 — 버튼을 눌러 시작할
   * 때는 그 자리에서 켜고, 리다이렉트로 돌아온 길은 처음부터 켜진 채로 그립니다.
   * 여기서 켜면 효과가 화면을 그리는 도중에 상태를 바꾸는 꼴이 됩니다.
   */
  const acceptGoogleToken = useCallback(
    async (accessTokenValue: string) => {
      try {
        const session = await api.auth.google({ googleAccessToken: accessTokenValue });
        setSession(session);
        const current = await api.categories.list();
        if (session.isNewUser || current.length < 4) {
          const desired = CATEGORY_PRESETS.map((preset, index) => ({
            name: index === 0 ? "해야할 일" : index === 3 ? "취미" : `사용자 설정 ${index}`,
            color: preset.strong,
          }));
          if (current.length === 0) {
            await Promise.all(desired.map(category => api.categories.create(category)));
          } else {
            /*
             * 어느 칸이 비었는지는 이름이 아니라 자리로 셉니다. 서버가 잠근
             * 카테고리가 취미 자리이고, 앞칸들은 만든 순서대로입니다. 취미가
             * 없으면 마지막에 만들어 그 자리에 놓습니다.
             */
            const sorted = sortCategories(current);
            const hobbyCategory = sorted.find(category => !category.isDeletable);
            const front = hobbyCategory ? sorted.slice(0, -1) : sorted;
            const todoCategory = front[0];
            let total = current.length;
            if (todoCategory) await api.categories.update(todoCategory.categoryId, desired[0]!);
            else if (total < 5) {
              await api.categories.create(desired[0]!);
              total += 1;
            }
            for (let index = Math.max(front.length - 1, 0); index < 2 && total < 5; index += 1) {
              await api.categories.create(desired[index + 1]!);
              total += 1;
            }
            if (hobbyCategory) await api.categories.update(hobbyCategory.categoryId, desired[3]!);
            else if (total < 5) await api.categories.create(desired[3]!);
          }
        }
        await queryClient.invalidateQueries();
      } catch (reason) {
        useSessionStore.getState().clearSession();
        setError(errorMessage(reason));
      } finally {
        setLoading(false);
      }
    },
    [api, queryClient, setSession],
  );
  /*
   * 돌아온 토큰을 서버로 넘깁니다. 실패 문구도 로딩 표시도 이미 들고 시작했습니다.
   *
   * 화면을 다 그린 다음에 시작합니다. 효과 안에서 곧바로 부르면 그 호출이 상태에
   * 닿는지 정적으로는 알 수 없어, 그리는 도중에 상태를 바꾸는 것으로 셉니다.
   */
  useEffect(() => {
    const token = pendingRedirectToken;
    if (!token) return;
    pendingRedirectToken = null;
    queueMicrotask(() => void acceptGoogleToken(token));
  }, [acceptGoogleToken]);
  /*
   * 로그인 화면이 떠 있는 동안에만 구글 스크립트를 받아 둡니다.
   *
   * 이 훅은 로그인 화면에만 붙어 있고 `accessToken`이 없을 때만 받으므로, 들어와 있는
   * 사람은 이 스크립트를 아예 받지 않습니다. 버튼을 누르는 순간에 받으면 늦습니다 —
   * 기다리는 사이 사용자의 손짓이 끊겨 팝업이 막히기 때문입니다.
   */
  useEffect(() => {
    if (accessToken) return;
    void loadGoogleScript().catch(() => {
      /* 없으면 리다이렉트 길로 갑니다. 여기서 알릴 것은 없습니다. */
    });
  }, [accessToken]);
  /* 팝업으로 열린 길은 창끼리 주고받습니다. 이쪽은 바깥에서 오는 소식을 듣는 자리입니다. */
  useEffect(() => {
    const receiveToken = (event: MessageEvent<GoogleOAuthResult & { type?: string }>) => {
      if (event.origin !== window.location.origin || event.data?.type !== "tlitodos-google-oauth") return;
      const { accessToken: googleAccessToken, error: googleError } = event.data;
      if (googleError || !googleAccessToken) {
        setError("Google 로그인에 실패했습니다.");
        return;
      }
      setLoading(true);
      setError("");
      void acceptGoogleToken(googleAccessToken);
    };
    window.addEventListener("message", receiveToken);
    return () => window.removeEventListener("message", receiveToken);
  }, [acceptGoogleToken]);
  const login = () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) {
      setError("VITE_GOOGLE_CLIENT_ID 환경변수를 설정해 주세요.");
      return;
    }
    if (window.google?.accounts.oauth2) {
      window.google.accounts.oauth2
        .initTokenClient({
          client_id: clientId,
          scope: "openid email profile",
          callback: response => {
            if (response.error || !response.access_token) {
              setError("Google 로그인에 실패했습니다.");
              return;
            }
            setLoading(true);
            setError("");
            void acceptGoogleToken(response.access_token);
          },
          error_callback: response => {
            if (response.type === "popup_failed_to_open") {
              redirectToGoogle(clientId);
              return;
            }
            if (response.type === "popup_closed") {
              setError("Google 로그인 창이 닫혔습니다. 다시 시도해 주세요.");
              return;
            }
            setError("Google 로그인 창을 열지 못했습니다.");
          },
        })
        .requestAccessToken();
      return;
    }
    redirectToGoogle(clientId);
  };
  return { login, loading, error };
};
