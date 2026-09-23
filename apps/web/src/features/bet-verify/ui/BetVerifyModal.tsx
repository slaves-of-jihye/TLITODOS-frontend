import styled from "@emotion/styled";
import { useState } from "react";
import type { Bet } from "@/shared/api";
import { BetBox, useVerifyBet } from "@/entities/bet";
import { useAssetObjectUrl } from "@/shared/api";
import { errorMessage } from "@/shared/lib";
import {
  ErrorText,
  Modal,
  SheetActions,
  SheetCancel,
  SheetForm,
  SheetHeading,
  SheetSubmit,
  Skeleton,
  SrOnly,
  theme,
} from "@/shared/ui";

/**
 * 올라온 사진을 보고 인정할지 정하는 시트. 내기를 건 사람이 씁니다.
 *
 * 답이 둘입니다. 인정하면 내기가 끝나고(`VERIFIED`), 되돌리면 상태는 그대로라
 * 상대가 사진을 다시 올릴 수 있습니다 — 흐릿하게 찍혔거나 엉뚱한 것을 올린
 * 경우까지 거절로 끝내 버리면 고칠 길이 없습니다.
 */
export const BetVerifyModal = ({ bet, onClose }: { bet: Bet | null; onClose: () => void }) => {
  const verify = useVerifyBet();
  const [error, setError] = useState("");
  // 인증 사진도 `/uploads`라 토큰이 필요합니다.
  const image = useAssetObjectUrl(bet?.proofImageUrl ?? null);
  const answer = async (approved: boolean) => {
    if (!bet) return;
    setError("");
    try {
      await verify.mutateAsync({ betId: bet.betId, body: { approved } });
      onClose();
    } catch (reason) {
      setError(errorMessage(reason));
    }
  };
  return (
    <Modal open={bet !== null} sheet onClose={verify.isPending ? undefined : onClose} aria-label="내기 인증 확인">
      <SheetForm>
        <SheetHeading>올라온 인증 사진을 확인해 주세요</SheetHeading>
        <BetBox>
          <p>{bet?.content ?? ""}</p>
        </BetBox>
        {image ? (
          <ProofPhoto src={image} alt="인증 사진" />
        ) : (
          <ProofLoading role="status">
            <SrOnly>인증 사진을 불러오는 중</SrOnly>
            <Skeleton width="min(250px, 100%)" height="160px" radius={theme.radius.sm} />
          </ProofLoading>
        )}
        {error ? <ErrorText>{error}</ErrorText> : null}
        <SheetActions>
          <SheetSubmit type="button" disabled={verify.isPending} onClick={() => answer(false)}>
            다시 올려달라고 하기
          </SheetSubmit>
          <SheetCancel type="button" disabled={verify.isPending} onClick={() => answer(true)}>
            인정하기
          </SheetCancel>
        </SheetActions>
      </SheetForm>
    </Modal>
  );
};

const ProofPhoto = styled.img`
  /* 사진은 제 비율 그대로, 작은 사진을 늘리지 않습니다 — 일기 사진과 같은 규칙입니다. */
  max-width: min(250px, 100%);
  height: auto;
  border-radius: ${theme.radius.sm};
`;

const ProofLoading = styled.div`
  width: 100%;
`;
