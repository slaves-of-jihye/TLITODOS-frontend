import { useState } from "react";
import type { Bet, BetStatusRequest } from "@/shared/api";
import { BetBox, useSetBetStatus } from "@/entities/bet";
import { errorMessage } from "@/shared/lib";
import { ErrorText, Modal, SheetActions, SheetCancel, SheetForm, SheetHeading, SheetSubmit } from "@/shared/ui";

export const BetReceivedModal = ({
  bet,
  requesterName,
  open,
  onClose,
}: {
  bet: Bet | null;
  requesterName: string;
  open: boolean;
  onClose: () => void;
}) => {
  const setStatus = useSetBetStatus();
  const [error, setError] = useState("");
  const answer = async (status: BetStatusRequest["status"]) => {
    if (!bet) return;
    setError("");
    try {
      await setStatus.mutateAsync({ betId: bet.betId, body: { status } });
      onClose();
    } catch (reason) {
      setError(errorMessage(reason));
    }
  };
  return (
    <Modal open={open} sheet onClose={onClose} aria-label="받은 내기 요청">
      <SheetForm>
        <SheetHeading>{requesterName}님께 받은 내기 요청</SheetHeading>
        <BetBox>
          <p>{bet?.content ?? ""}</p>
        </BetBox>
        {error ? <ErrorText>{error}</ErrorText> : null}
        <SheetActions>
          <SheetSubmit type="button" disabled={setStatus.isPending} onClick={() => answer("REJECTED")}>
            내기 거절하기
          </SheetSubmit>
          <SheetCancel type="button" disabled={setStatus.isPending} onClick={() => answer("ACCEPTED")}>
            내기 수락하기
          </SheetCancel>
        </SheetActions>
      </SheetForm>
    </Modal>
  );
};
