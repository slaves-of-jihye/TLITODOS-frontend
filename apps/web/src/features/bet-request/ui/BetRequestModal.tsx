import { useState } from "react";
import type { Todo } from "@/shared/api";
import { BET_CONTENT_LIMIT, BetBox, useCreateBet } from "@/entities/bet";
import { errorMessage } from "@/shared/lib";
import { ErrorText, Modal, SheetActions, SheetCancel, SheetForm, SheetHeading, SheetSubmit } from "@/shared/ui";

/**
 * 내기를 거는 시트. 디자인의 `modal / bet`(1815:1569)입니다.
 *
 * 친구의 할 일 줄에서 열고, 무엇을 걸지 한 줄로 적어 보냅니다. 상대에게는 알림이
 * 가고, 수락·거절은 그쪽 화면에서 정합니다.
 */
export const BetRequestModal = ({
  todo,
  ownerName,
  open,
  onClose,
}: {
  todo: Todo | null;
  ownerName: string;
  open: boolean;
  onClose: () => void;
}) => {
  const [content, setContent] = useState("");
  const createBet = useCreateBet();
  const [error, setError] = useState("");
  return (
    <Modal open={open} sheet onClose={onClose} aria-label="내기 요청">
      <SheetForm>
        <SheetHeading>{ownerName}님의 할 일에 내기를 요청할까요?</SheetHeading>
        <BetBox>
          <input
            value={content}
            maxLength={BET_CONTENT_LIMIT}
            placeholder="무엇을 걸까요?"
            onChange={event => setContent(event.target.value)}
          />
        </BetBox>
        {error ? <ErrorText>{error}</ErrorText> : null}
        <SheetActions>
          <SheetCancel type="button" onClick={onClose}>
            취소
          </SheetCancel>
          <SheetSubmit
            type="button"
            disabled={!todo || !content.trim() || createBet.isPending}
            onClick={async () => {
              if (!todo) return;
              setError("");
              try {
                await createBet.mutateAsync({ todoId: todo.todoId, body: { content: content.trim() } });
                onClose();
              } catch (reason) {
                setError(errorMessage(reason));
              }
            }}
          >
            {createBet.isPending ? "보내는 중..." : "내기 요청하기"}
          </SheetSubmit>
        </SheetActions>
      </SheetForm>
    </Modal>
  );
};

/**
 * 받은 내기를 수락하거나 거절하는 시트. 디자인의 `modal / bet`(167:878)입니다.
 *
 * 두 버튼의 색은 디자인 그대로입니다 — 거절이 검정, 수락이 회색입니다.
 */
