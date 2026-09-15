import styled from "@emotion/styled";
import { useState } from "react";
import { dismissInstallBanner, promptInstall, usePwaInstall } from "../model/pwaInstall";
import { Button, palette, theme } from "@/shared/ui";

const iosInstallHint = "공유 버튼을 누르고 '홈 화면에 추가'를 선택해 주세요.";

export const InstallPrompt = () => {
  const { canPrompt, installed, needsManualSteps, bannerDismissed } = usePwaInstall();
  const [installing, setInstalling] = useState(false);
  if (installed || bannerDismissed || (!canPrompt && !needsManualSteps)) return null;
  return (
    <InstallBanner aria-label="앱 설치 안내">
      <img src={`${import.meta.env.BASE_URL}icons/icon-192.png`} alt="" width={44} height={44} />
      <InstallCopy>
        <strong>홈 화면에 TLITODOS 추가하기</strong>
        <span>{canPrompt ? "앱처럼 전체 화면으로 더 빠르게 열 수 있어요." : iosInstallHint}</span>
      </InstallCopy>
      <InstallActions>
        {canPrompt ? (
          <Button
            type="button"
            variant="primary"
            disabled={installing}
            onClick={async () => {
              setInstalling(true);
              const outcome = await promptInstall();
              setInstalling(false);
              // 설치를 거절했다면 다시 권하지 않습니다. 브라우저 메뉴로는 언제든 설치할 수 있습니다.
              if (outcome === "dismissed") dismissInstallBanner();
            }}
          >
            {installing ? "설치 중..." : "설치"}
          </Button>
        ) : null}
        <Button type="button" variant="ghost" onClick={dismissInstallBanner}>
          닫기
        </Button>
      </InstallActions>
    </InstallBanner>
  );
};

const InstallBanner = styled.aside`
  position: fixed;
  z-index: 80;
  right: 24px;
  bottom: 24px;
  width: min(380px, calc(100vw - 48px));
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 10px 14px;
  align-items: center;
  border: 1px solid ${palette.gray200};
  border-radius: ${theme.radius.md};
  background: white;
  padding: 16px 18px;
  box-shadow: ${theme.shadow};
  img {
    border-radius: 12px;
  }
  @media (max-width: 600px) {
    left: 12px;
    right: 12px;
    width: auto;
    /* 하단 내비게이션 위에 겹치지 않게 띄웁니다. */
    bottom: calc(84px + env(safe-area-inset-bottom));
  }
`;

const InstallCopy = styled.div`
  display: grid;
  gap: 4px;
  strong {
    font-size: ${theme.text.s};
  }
  span {
    color: ${theme.colors.muted};
    font-size: ${theme.text.xs};
  }
`;

const InstallActions = styled.div`
  grid-column: 1 / -1;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  button {
    padding: 9px 18px;
  }
`;
