import styled from "@emotion/styled";
import { useCallback, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CATEGORY_PRESETS, sortCategories } from "@/entities/category";
import { useApi } from "@/shared/api";
import { errorMessage, randomId } from "@/shared/lib";
import { useSessionStore } from "@/shared/model";
import { ErrorText, Modal, palette, theme } from "@/shared/ui";

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

const redirectToGoogle = (clientId: string) => {
  const returnPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  const state = randomId();
  window.sessionStorage.setItem(googleOAuthReturnKey, returnPath);
  window.sessionStorage.setItem(googleOAuthStateKey, state);
  window.location.assign(buildGoogleOAuthUrl(clientId, state));
};

export const LoginModal = () => {
  const accessToken = useSessionStore(state => state.accessToken);
  const setSession = useSessionStore(state => state.setSession);
  const api = useApi();
  const queryClient = useQueryClient();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const acceptGoogleToken = useCallback(
    async (accessTokenValue: string) => {
      setLoading(true);
      setError("");
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
  useEffect(() => {
    const handleResult = ({ accessToken: googleAccessToken, error: googleError }: GoogleOAuthResult) => {
      if (googleError || !googleAccessToken) setError("Google 로그인에 실패했습니다.");
      else void acceptGoogleToken(googleAccessToken);
    };
    const storedResult = window.sessionStorage.getItem(googleOAuthResultKey);
    if (storedResult) {
      window.sessionStorage.removeItem(googleOAuthResultKey);
      try {
        handleResult(JSON.parse(storedResult) as GoogleOAuthResult);
      } catch {
        setError("Google 로그인 결과를 확인하지 못했습니다.");
      }
    }
    const receiveToken = (event: MessageEvent<GoogleOAuthResult & { type?: string }>) => {
      if (event.origin !== window.location.origin || event.data?.type !== "tlitodos-google-oauth") return;
      handleResult(event.data);
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
            if (response.error || !response.access_token) setError("Google 로그인에 실패했습니다.");
            else void acceptGoogleToken(response.access_token);
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
  return (
    <Modal open={!accessToken} login title="TLITODOS에 오신 걸 환영해요">
      <LoginCopy>오늘 할 일과 하루의 기록을 한곳에서 관리해 보세요.</LoginCopy>
      {error ? <ErrorText>{error}</ErrorText> : null}
      <GoogleButton type="button" onClick={login} disabled={loading}>
        <GoogleMark>G</GoogleMark>
        {loading ? "로그인 중..." : "Google로 로그인하기"}
      </GoogleButton>
    </Modal>
  );
};

const LoginCopy = styled.p`
  margin: -14px 0 28px;
  color: ${theme.colors.muted};
  @media (max-width: 600px) {
    margin: -8px 0 24px;
  }
`;

const GoogleButton = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  border: 0;
  border-radius: 12px;
  background: ${palette.gray200};
  padding: 10px 20px;
  font-size: ${theme.text.s};
  color: ${theme.colors.ink};
  &:disabled {
    opacity: 0.45;
    cursor: progress;
  }
`;
/* 구글 마크는 브랜드 색과 서체를 그대로 씁니다. */

/* 구글 마크는 브랜드 색과 서체를 그대로 씁니다. */
const GoogleMark = styled.span`
  font-family: Arial, sans-serif;
  font-size: 20px;
  color: #4285f4;
`;
