import styled from "@emotion/styled";
import { useState } from "react";
import type { Todo } from "@/shared/api";
import { useDeleteRoutine, useDeleteTodo } from "@/entities/todo";
import { errorMessage } from "@/shared/lib";
import { Button, ErrorText, Modal, theme } from "@/shared/ui";

/**
 * 휴지통에 놓은 할 일을 지울지 묻습니다.
 *
 * 다른 지우기는 누른 버튼 바로 아래 드롭다운(`ConfirmMenu`)으로 묻지만, 여기에는
 * 붙일 버튼이 없습니다 — 손을 뗀 자리가 물음의 출발점이고, 그 자리는 끌 때마다
 * 다릅니다. 그래서 화면 한가운데로 부릅니다.
 *
 * 루틴의 한 회차라면 무엇을 지울지 고르게 합니다. 목록에서 지우는 길과 같은
 * 갈래입니다 — 이 회차만인지, 루틴 전체인지.
 */
export const TodoDeleteModal = ({ todo, onClose }: { todo: Todo | null; onClose: () => void }) => {
  const deleteTodo = useDeleteTodo();
  const deleteRoutine = useDeleteRoutine();
  const [error, setError] = useState("");
  const busy = deleteTodo.isPending || deleteRoutine.isPending;
  const remove = async (whole: boolean) => {
    if (!todo) return;
    setError("");
    try {
      if (whole && todo.routineId) await deleteRoutine.mutateAsync(todo.routineId);
      else await deleteTodo.mutateAsync(todo.todoId);
      onClose();
    } catch (reason) {
      setError(errorMessage(reason));
    }
  };
  return (
    <Modal compact open={todo !== null} onClose={busy ? undefined : onClose} aria-label="할 일 삭제">
      <DeleteBody>
        <DeleteTitle>&ldquo;{todo?.title}&rdquo;을(를) 삭제하시겠습니까?</DeleteTitle>
        {todo?.routineId ? (
          <DeleteNote>루틴의 한 회차입니다. 전체를 지우면 완료한 회차까지 사라집니다.</DeleteNote>
        ) : (
          <DeleteNote>지운 할 일은 되돌릴 수 없습니다.</DeleteNote>
        )}
        {error ? <ErrorText>{error}</ErrorText> : null}
        <DeleteActions>
          <Button variant="soft" disabled={busy} onClick={onClose}>
            취소
          </Button>
          <Button variant="danger" disabled={busy} onClick={() => remove(false)}>
            {todo?.routineId ? "이 할 일만 삭제" : "삭제"}
          </Button>
          {todo?.routineId ? (
            <Button variant="danger" disabled={busy} onClick={() => remove(true)}>
              루틴 전체 삭제
            </Button>
          ) : null}
        </DeleteActions>
      </DeleteBody>
    </Modal>
  );
};

const DeleteBody = styled.div`
  display: grid;
  gap: 16px;
  justify-items: center;
  text-align: center;
`;

const DeleteTitle = styled.p`
  margin: 0;
  font-size: ${theme.text.h3};
  color: ${theme.colors.ink};
  overflow-wrap: anywhere;
`;

const DeleteNote = styled.p`
  margin: 0;
  font-size: ${theme.text.s};
  color: ${theme.colors.muted};
`;

const DeleteActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 12px;
  margin-top: 8px;
`;
