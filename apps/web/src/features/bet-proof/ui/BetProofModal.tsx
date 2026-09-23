import styled from "@emotion/styled";
import { useRef, useState } from "react";
import type { Bet } from "@/shared/api";
import { BetBox, useUploadBetProof } from "@/entities/bet";
import { errorMessage } from "@/shared/lib";
import { ErrorText, Modal, SheetActions, SheetCancel, SheetForm, SheetHeading, theme } from "@/shared/ui";

/** 서버가 5MB를 넘기면 거절하므로, 올리기 전에 같은 기준으로 막습니다. */
export const MAX_BET_PROOF_BYTES = 5 * 1024 * 1024;

/**
 * 해냈다는 사진을 올리는 시트. 할 일 주인이 씁니다.
 *
 * 고른 사진을 먼저 보여 주고 누를 때 보냅니다 — 파일 선택창에서 본 것과 화면에
 * 들어갈 것이 같은지 확인할 자리가 필요합니다. 프로필 사진은 되돌릴 초안이 없어
 * 고르는 즉시 올리지만, 이쪽은 상대가 보고 판정할 물건이라 한 번 더 봅니다.
 */
export const BetProofModal = ({ bet, onClose }: { bet: Bet | null; onClose: () => void }) => {
  const upload = useUploadBetProof();
  const inputRef = useRef<HTMLInputElement>(null);
  const [picked, setPicked] = useState<{ file: File; url: string } | null>(null);
  const [error, setError] = useState("");
  const choose = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("이미지 파일만 올릴 수 있습니다.");
      return;
    }
    if (file.size > MAX_BET_PROOF_BYTES) {
      setError("이미지는 5MB까지 올릴 수 있습니다.");
      return;
    }
    setError("");
    // 앞서 고른 미리보기는 주소를 돌려줍니다 — 열어 둔 채로 두면 탭이 닫힐 때까지 남습니다.
    setPicked(current => {
      if (current) URL.revokeObjectURL(current.url);
      return { file, url: URL.createObjectURL(file) };
    });
  };
  const close = () => {
    if (picked) URL.revokeObjectURL(picked.url);
    setPicked(null);
    setError("");
    onClose();
  };
  const send = async () => {
    if (!bet || !picked) return;
    setError("");
    const body = new FormData();
    body.append("image", picked.file);
    try {
      await upload.mutateAsync({ betId: bet.betId, body });
      close();
    } catch (reason) {
      setError(errorMessage(reason));
    }
  };
  return (
    <Modal open={bet !== null} sheet onClose={upload.isPending ? undefined : close} aria-label="내기 인증하기">
      <SheetForm>
        <SheetHeading>해냈다는 사진을 올려 주세요</SheetHeading>
        <BetBox>
          <p>{bet?.content ?? ""}</p>
        </BetBox>
        {/* 고른 사진이 있으면 그 사진이 곧 다시 고르는 버튼입니다 — 일기 사진과 같은 방식입니다. */}
        <ProofPicker type="button" onClick={() => inputRef.current?.click()}>
          {picked ? <img src={picked.url} alt="고른 인증 사진" /> : <span>사진 고르기</span>}
        </ProofPicker>
        <HiddenFileInput
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={event => {
            const file = event.target.files?.[0];
            // 같은 파일을 다시 골라도 change가 오도록 값을 비웁니다.
            event.target.value = "";
            if (file) choose(file);
          }}
        />
        {error ? <ErrorText>{error}</ErrorText> : null}
        <SheetActions>
          <SheetCancel type="button" disabled={upload.isPending} onClick={close}>
            취소
          </SheetCancel>
          <SheetSubmitWide type="button" disabled={!picked || upload.isPending} onClick={send}>
            {upload.isPending ? "올리는 중..." : "인증 사진 올리기"}
          </SheetSubmitWide>
        </SheetActions>
      </SheetForm>
    </Modal>
  );
};

const ProofPicker = styled.button`
  display: grid;
  place-items: center;
  width: 100%;
  min-height: 160px;
  border: 2px dashed ${theme.colors.line};
  border-radius: ${theme.radius.sm};
  background: ${theme.colors.panel};
  padding: 12px;
  color: ${theme.colors.muted};
  font-size: ${theme.text.s};
  img {
    /* 사진은 제 비율 그대로, 시트를 넘지 않는 선에서. 작은 사진을 늘리지 않습니다. */
    max-width: min(250px, 100%);
    height: auto;
    border-radius: ${theme.radius.sm};
  }
`;

const HiddenFileInput = styled.input`
  display: none;
`;

/** 보내는 버튼은 시트의 기본 제출 버튼과 같되, 눌리지 않을 때를 옅게 둡니다. */
const SheetSubmitWide = styled.button`
  flex: 1;
  border: 0;
  border-radius: ${theme.radius.pill};
  background: ${theme.colors.ink};
  padding: 14px 20px;
  color: white;
  font-size: ${theme.text.s};
  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
`;
