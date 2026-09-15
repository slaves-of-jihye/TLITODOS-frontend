import styled from "@emotion/styled";
import { useCallback, useState } from "react";
import type { DeadlineValue } from "@/features/todo-deadline";
import type { Category, Importance, Todo, TodoPatchRequest } from "@/shared/api";
import { categoryAccent, sortCategories } from "@/entities/category";
import {
  ROUTINE_REPEATS,
  dependencyCandidates,
  toRecurrence,
  useConvertToRoutine,
  useDeleteRoutine,
  useDeleteTodo,
  useInvalidateTodos,
  useSetDependencies,
  useUpdateTodo,
} from "@/entities/todo";
import type { RoutineValue } from "@/features/todo-routine";
import { DeadlineModal } from "@/features/todo-deadline";
import { RoutineModal } from "@/features/todo-routine";
import { TODO_TITLE_LIMIT } from "@/shared/config";
import { dateOnly, errorMessage } from "@/shared/lib";
import {
  Button,
  ConfirmChoice,
  ConfirmMenu,
  ConfirmNote,
  DetailEmpty,
  ErrorText,
  Modal,
  StatusCluster,
  hoverable,
  formatSheetDate,
  formatSheetTime,
  icons,
  palette,
  theme,
} from "@/shared/ui";

const TODO_DETAIL_LIMIT = 100;

export const TodoDetailModal = ({
  open,
  todo,
  categories,
  todos,
  selectedDate,
  onClose,
}: {
  open: boolean;
  todo: Todo | null;
  categories: Category[];
  todos: Todo[];
  selectedDate: string;
  onClose: () => void;
}) => {
  const updateTodo = useUpdateTodo();
  const setDependencies = useSetDependencies();
  const deleteTodo = useDeleteTodo();
  const convertToRoutine = useConvertToRoutine();
  const deleteRoutine = useDeleteRoutine();
  const invalidateTodos = useInvalidateTodos();
  /*
   * 시트 안에서 고친 것은 모아 두었다가 `할 일 수정하기`를 눌렀을 때 한 번에 보냅니다.
   *
   * 예전에는 칸마다 그 자리에서 보냈습니다. 중요도를 바꾸면 한 번, 세부사항에서
   * 포커스가 빠지면 또 한 번, 마감기한 시트를 닫으면 또 한 번이라 시트 하나를
   * 손보는 동안 요청이 네다섯 번 나갔고, 중간에 시트를 닫으면 어디까지 저장됐는지
   * 알 수 없었습니다. 이제 닫으면 아무것도 바뀌지 않고, 누르면 다 바뀝니다.
   */
  const [title, setTitle] = useState(todo?.title ?? "");
  const [editingTitle, setEditingTitle] = useState(false);
  const [detail, setDetail] = useState(todo?.description ?? "");
  const [importance, setImportance] = useState<Importance>(todo?.importance ?? "NONE");
  const [dependency, setDependency] = useState<number | null>(todo?.dependencies[0] ?? null);
  const [deadline, setDeadline] = useState<DeadlineValue>({
    start: dateOnly(todo?.startDate) ?? selectedDate,
    date: dateOnly(todo?.dueDate) ?? dateOnly(todo?.startDate) ?? selectedDate,
    time: todo?.time ?? "",
  });
  /**
   * 등록하기로 해 둔 루틴. 아직 서버에는 없습니다.
   *
   * `requestId`도 함께 들고 있습니다 — 저장이 실패해 다시 누를 때 같은 키여야
   * 루틴이 둘로 늘어나지 않기 때문입니다.
   */
  const [routine, setRoutine] = useState<{ value: RoutineValue; requestId: string } | null>(null);
  const [deadlineOpen, setDeadlineOpen] = useState(false);
  const [routineOpen, setRoutineOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  /**
   * 열었을 때의 값입니다. 무엇이 바뀌었는지 이걸로 가려 바뀐 것만 보냅니다.
   *
   * 상세 시트는 할 일마다 다시 마운트되므로(`key`가 `todoId`) 처음 한 번만 잡으면
   * 그 할 일을 보는 동안 그대로 남습니다. ref가 아니라 상태로 두는 것은 그리는 중에
   * 읽기 때문입니다.
   */
  const [opened] = useState(() => ({
    title: todo?.title ?? "",
    detail: todo?.description ?? "",
    importance: (todo?.importance ?? "NONE") as Importance,
    start: dateOnly(todo?.startDate) ?? selectedDate,
    date: dateOnly(todo?.dueDate) ?? dateOnly(todo?.startDate) ?? selectedDate,
    time: todo?.time ?? "",
    dependency: todo?.dependencies[0] ?? null,
  }));
  /** 열려 있는 삭제 확인 드롭다운. 한 번에 하나만 엽니다. */
  const [confirming, setConfirming] = useState<"todo" | "routine" | null>(null);
  const dismissConfirm = useCallback(() => setConfirming(null), []);
  const removing = deleteTodo.isPending || deleteRoutine.isPending;
  const ordered = sortCategories(categories);
  const candidates = dependencyCandidates(todos, todo, selectedDate, dependency === null ? [] : [dependency]);
  const trimmedTitle = title.trim();
  /**
   * 모아 둔 것을 한 번에 보냅니다.
   *
   * 한 번의 요청으로 끝나지는 않습니다 — 서버가 제목·세부사항·중요도·기간은 한
   * 자리에서 받지만(`PATCH /todos/{id}`), 선행 할 일과 루틴은 각자 다른 자리이기
   * 때문입니다. 대신 바뀐 것만, 사용자의 한 번의 누름으로 보냅니다. 도중에 실패하면
   * 시트를 닫지 않고 그 자리에 둡니다 — 고친 내용이 손에 남아 다시 누를 수 있습니다.
   */
  const save = async () => {
    if (!todo) return;
    setBusy(true);
    setError("");
    try {
      const before = opened;
      const body: TodoPatchRequest = {};
      if (trimmedTitle && trimmedTitle !== before.title) body.title = trimmedTitle;
      if (detail !== before.detail) body.description = detail;
      if (importance !== before.importance) body.importance = importance;
      if (deadline.start !== before.start) body.startDate = deadline.start;
      if (deadline.date !== before.date) body.dueDate = deadline.date;
      if (deadline.time !== before.time) body.time = deadline.time || null;
      if (Object.keys(body).length) await updateTodo.mutateAsync({ id: todo.todoId, body });
      if (dependency !== before.dependency) {
        await setDependencies.mutateAsync({
          id: todo.todoId,
          dependencyTodoIds: dependency === null ? [] : [dependency],
        });
      }
      if (routine) {
        // 원본이 첫 회차가 되므로 새로 만들지 않고 이 할 일을 루틴으로 돌립니다.
        await convertToRoutine.mutateAsync({
          id: todo.todoId,
          body: {
            requestId: routine.requestId,
            startDate: routine.value.start,
            endDate: routine.value.end,
            time: routine.value.time || null,
            recurrence: toRecurrence(routine.value.repeat, routine.value.weekdays),
          },
        });
        invalidateTodos();
      }
      onClose();
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  };
  /** 이 회차 하나만 지웁니다 — 루틴 정의와 다른 날짜의 회차는 그대로 남습니다. */
  const removeTodo = async () => {
    if (!todo) return;
    setError("");
    try {
      await deleteTodo.mutateAsync(todo.todoId);
      onClose();
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setConfirming(null);
    }
  };
  /** 남은 회차와 완료한 회차까지 루틴을 통째로 지웁니다. */
  const removeRoutine = async () => {
    if (!todo?.routineId) return;
    setError("");
    try {
      await deleteRoutine.mutateAsync(todo.routineId);
      onClose();
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setConfirming(null);
    }
  };
  return (
    <>
      <Modal open={open} sheet onClose={onClose} aria-label="할 일 상세">
        {todo ? (
          <DetailSheet>
            {/*
             * 제목은 눌러서 그 자리에서 고칩니다.
             *
             * 예전에는 `할 일 수정하기`가 시트를 닫고 목록의 줄을 입력칸으로 바꿨습니다.
             * 고치려면 시트를 나가야 했고, 그 버튼이 무엇을 하는지도 이름과 달랐습니다.
             */}
            {editingTitle ? (
              <DetailTitleField>
                <input
                  autoFocus
                  value={title}
                  maxLength={TODO_TITLE_LIMIT}
                  aria-label="할 일 제목"
                  onChange={event => setTitle(event.target.value)}
                  onKeyDown={event => {
                    if (event.key === "Enter") setEditingTitle(false);
                    if (event.key === "Escape") {
                      setTitle(opened.title);
                      setEditingTitle(false);
                    }
                  }}
                  // 칸을 벗어나면 고치기를 마칩니다. 비운 채로 나갔다면 원래 제목으로 되돌립니다 — 제목 없는 할 일은 없습니다.
                  onBlur={() => {
                    if (!title.trim()) setTitle(opened.title);
                    setEditingTitle(false);
                  }}
                />
                <small>
                  {title.length}/{TODO_TITLE_LIMIT}
                </small>
              </DetailTitleField>
            ) : (
              <DetailTitleButton onClick={() => setEditingTitle(true)}>
                <span>{trimmedTitle || opened.title}</span>
                <img src={icons.edit} alt="" aria-hidden />
              </DetailTitleButton>
            )}
            <DetailBody>
              <div>
                <DetailBlock>
                  <DetailLabel>할 일에 대한 세부사항 입력하기</DetailLabel>
                  <DetailField>
                    <input
                      value={detail}
                      maxLength={TODO_DETAIL_LIMIT}
                      placeholder="세부사항을 작성하세요..."
                      disabled={busy}
                      onChange={event => setDetail(event.target.value)}
                    />
                    <small>
                      {detail.length}/{TODO_DETAIL_LIMIT}
                    </small>
                  </DetailField>
                </DetailBlock>
                <DetailBlock>
                  <DetailLabel>Q. 이 일을 하기 전 선행해야 할 일이 있나요?</DetailLabel>
                  {candidates.length ? (
                    <DependencyRows>
                      {candidates.map(candidate => {
                        const index = ordered.findIndex(category => category.categoryId === candidate.categoryId);
                        const accent = categoryAccent(ordered[index]?.color, Math.max(index, 0));
                        const chosen = dependency === candidate.todoId;
                        return (
                          <DependencyRow
                            key={candidate.todoId}
                            aria-pressed={chosen}
                            disabled={busy}
                            // 고른 것을 다시 누르면 풀립니다. 저장할 때 목록 전체를 보내므로(PUT) 서버에서도 함께 풀립니다.
                            onClick={() => setDependency(chosen ? null : candidate.todoId)}
                          >
                            <StatusCluster
                              fills={chosen ? [accent, accent, accent, accent] : [null, null, null, null]}
                              checked={chosen}
                            />
                            <span>{candidate.title}</span>
                          </DependencyRow>
                        );
                      })}
                    </DependencyRows>
                  ) : (
                    <DetailEmpty>선택할 수 있는 선행 할 일이 없습니다.</DetailEmpty>
                  )}
                </DetailBlock>
              </div>
              <div>
                <DetailBlock>
                  <DetailLabel>중요도(우선순위) 설정하기</DetailLabel>
                  <DetailPills>
                    {(
                      [
                        ["NONE", "선택하지 않음"],
                        ["HIGH", "높음"],
                        ["LOW", "낮음"],
                      ] as const
                    ).map(([key, label]) => (
                      <Button
                        key={key}
                        variant={importance === key ? "primary" : "soft"}
                        disabled={busy}
                        onClick={() => setImportance(key)}
                      >
                        {label}
                      </Button>
                    ))}
                  </DetailPills>
                </DetailBlock>
                <DetailBlock>
                  <DetailAction onClick={() => setDeadlineOpen(true)}>
                    <img src={icons.calendar} alt="" aria-hidden />
                    마감기한 설정하기
                  </DetailAction>
                  {/*
                   * 고른 값을 적어 둡니다.
                   *
                   * 이제 시트를 닫아도 서버로 가지 않으므로, 적어 두지 않으면 눌러도
                   * 아무 일이 없는 것처럼 보입니다.
                   */}
                  <DetailChosen>
                    {formatSheetDate(deadline.start)}
                    {deadline.date !== deadline.start ? ` ~ ${formatSheetDate(deadline.date)}` : ""} ·{" "}
                    {formatSheetTime(deadline.time)}
                  </DetailChosen>
                  {todo.routineId ? (
                    <ConfirmMenu
                      open={confirming === "routine"}
                      label="루틴 전체 삭제"
                      above
                      onDismiss={dismissConfirm}
                      trigger={
                        <DetailAction
                          disabled={removing}
                          onClick={() => setConfirming(current => (current === "routine" ? null : "routine"))}
                        >
                          <img src={icons.routine} alt="" aria-hidden />
                          {deleteRoutine.isPending ? "삭제 중..." : "루틴 전체 삭제하기"}
                        </DetailAction>
                      }
                    >
                      <ConfirmNote>남은 회차와 완료한 회차가 모두 사라집니다.</ConfirmNote>
                      <ConfirmChoice tone="danger" disabled={removing} onClick={removeRoutine}>
                        루틴 전체 삭제
                      </ConfirmChoice>
                      <ConfirmChoice onClick={dismissConfirm}>취소</ConfirmChoice>
                    </ConfirmMenu>
                  ) : (
                    <>
                      <DetailAction onClick={() => setRoutineOpen(true)}>
                        <img src={icons.routine} alt="" aria-hidden />
                        루틴으로 등록하기
                      </DetailAction>
                      {routine ? (
                        <DetailChosen>
                          {ROUTINE_REPEATS.find(item => item.key === routine.value.repeat)?.label} ·{" "}
                          {formatSheetDate(routine.value.start)} ~ {formatSheetDate(routine.value.end)} · 저장하면
                          등록됩니다
                        </DetailChosen>
                      ) : null}
                    </>
                  )}
                </DetailBlock>
                {/*
                 * 시트를 마무리하는 두 버튼이라 오른쪽 단 맨 아래에 둡니다.
                 *
                 * `할 일 수정하기`가 이제 시트 안의 모든 것을 한 번에 보내므로, 다 고른
                 * 다음에 닿는 자리가 맞습니다. 삭제 확인 드롭다운은 시트 아래쪽이라
                 * `above`로 위로 펼칩니다 — 아래로 펼치면 시트 밖으로 나갑니다.
                 */}
                <DetailActions>
                  <DetailAction disabled={busy} onClick={save}>
                    <img src={icons.edit} alt="" aria-hidden />
                    {busy ? "저장 중..." : "할 일 수정하기"}
                  </DetailAction>
                  <ConfirmMenu
                    open={confirming === "todo"}
                    label="할 일 삭제"
                    above
                    onDismiss={dismissConfirm}
                    trigger={
                      <DetailAction
                        disabled={removing}
                        onClick={() => setConfirming(current => (current === "todo" ? null : "todo"))}
                      >
                        <img src={icons.trash} alt="" aria-hidden />할 일 삭제하기
                      </DetailAction>
                    }
                  >
                    {todo.routineId ? (
                      <>
                        <ConfirmNote>루틴의 한 회차입니다. 전체를 지우면 완료한 회차까지 사라집니다.</ConfirmNote>
                        <ConfirmChoice tone="danger" disabled={removing} onClick={removeTodo}>
                          이 할 일만 삭제
                        </ConfirmChoice>
                        <ConfirmChoice tone="danger" disabled={removing} onClick={removeRoutine}>
                          루틴 전체 삭제
                        </ConfirmChoice>
                      </>
                    ) : (
                      <ConfirmChoice tone="danger" disabled={removing} onClick={removeTodo}>
                        삭제
                      </ConfirmChoice>
                    )}
                    <ConfirmChoice onClick={dismissConfirm}>취소</ConfirmChoice>
                  </ConfirmMenu>
                </DetailActions>
              </div>
            </DetailBody>
            {error ? <ErrorText>{error}</ErrorText> : null}
          </DetailSheet>
        ) : null}
      </Modal>
      <DeadlineModal
        open={deadlineOpen}
        value={deadline}
        onChange={setDeadline}
        onClose={() => setDeadlineOpen(false)}
      />
      <RoutineModal
        key={`${routineOpen}-${selectedDate}`}
        open={routineOpen}
        initialDate={dateOnly(todo?.startDate) ?? selectedDate}
        initialTime={todo?.time ?? ""}
        onClose={() => setRoutineOpen(false)}
        // 여기서는 담아만 둡니다. 실제 등록은 `할 일 수정하기`를 눌렀을 때 함께 나갑니다.
        onRegister={async (value, requestId) => {
          setRoutine({ value, requestId });
          setRoutineOpen(false);
        }}
      />
    </>
  );
};

const DetailSheet = styled.div`
  display: grid;
  gap: 32px;
`;

const DetailTitleButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin: 0 auto;
  max-width: 100%;
  border: 0;
  border-radius: ${theme.radius.sm};
  background: transparent;
  padding: 4px 10px;
  font-size: ${theme.text.h3};
  color: ${theme.colors.ink};
  > span {
    min-width: 0;
    overflow-wrap: anywhere;
  }
  img {
    flex: none;
    width: 16px;
    height: 16px;
    opacity: 0.45;
  }
  ${hoverable} {
    &:hover {
      background: ${palette.gray100};
    }
  }
`;

/** 고치는 중인 제목. 밑줄과 글자 수는 목록에서 새로 쓸 때와 같은 표시입니다. */
const DetailTitleField = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  /* 고치는 중임을 밑줄로 알립니다. */
  border-bottom: 2px solid ${palette.gray300};
  padding: 4px 10px;
  input {
    flex: 1;
    min-width: 0;
    border: 0;
    background: transparent;
    padding: 0;
    font-size: ${theme.text.h3};
    color: ${theme.colors.ink};
  }
  small {
    flex: none;
    font-size: ${theme.text.s};
    color: ${theme.colors.muted};
  }
`;

/** 시트에서 골라 둔 값. 아직 서버에 가지 않았습니다. */
const DetailChosen = styled.p`
  margin: 8px 0 0;
  font-size: ${theme.text.xs};
  color: ${theme.colors.muted};
`;

const DetailBody = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 357px) minmax(0, 1fr);
  gap: 60px;
  align-items: start;
  > div {
    display: grid;
    gap: 40px;
    align-content: start;
  }
  @media (max-width: 700px) {
    grid-template-columns: 1fr;
    gap: 32px;
    > div {
      gap: 28px;
    }
  }
`;

/*
 * 시트를 마무리하는 두 버튼.
 *
 * 오른쪽 단은 왼쪽(최대 357px)이 가져가고 남은 만큼이라 좁습니다. 둘을 나란히
 * 두면 넘치므로, 자리가 모자라면 한 줄씩 내려 쌓습니다 — 좁을 때 같은 단의
 * 마감기한·루틴과 같은 모양이 됩니다. 넓은 한 단 배치에서는 나란히 섭니다.
 */
const DetailActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
`;

const DetailAction = styled.button`
  display: flex;
  /* 140px보다 좁아지지 않고, 남는 자리는 나눠 가집니다. 둘이 못 들어가면 줄을 바꿉니다. */
  flex: 1 1 140px;
  align-items: center;
  justify-content: center;
  gap: 10px;
  border: 0;
  border-radius: 12px;
  background: ${palette.gray200};
  padding: 10px 20px;
  font-size: ${theme.text.s};
  color: ${theme.colors.ink};
  white-space: nowrap;
  img {
    width: 18px;
    height: 18px;
  }
  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
`;

const DetailBlock = styled.div`
  display: grid;
  gap: 12px;
  justify-items: start;
`;

const DetailLabel = styled.p`
  margin: 0;
  font-size: ${theme.text.h3};
  color: ${theme.colors.ink};
`;

const DetailField = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  border-radius: ${theme.radius.sm};
  background: ${theme.colors.panel};
  padding: 12px 20px;
  input {
    flex: 1;
    min-width: 0;
    border: 0;
    background: transparent;
    padding: 0;
    font-size: ${theme.text.s};
    color: ${theme.colors.ink};
    &::placeholder {
      color: ${theme.colors.muted};
    }
  }
  small {
    flex: none;
    font-size: ${theme.text.s};
    color: ${theme.colors.muted};
  }
`;

const DependencyRows = styled.div`
  display: grid;
  width: 100%;
`;

const DependencyRow = styled.button`
  display: flex;
  align-items: center;
  gap: 12px;
  border: 0;
  border-radius: ${theme.radius.sm};
  background: transparent;
  padding: 6px 8px;
  text-align: left;
  font-size: ${theme.text.h3};
  color: ${theme.colors.ink};
  span {
    min-width: 0;
    overflow-wrap: anywhere;
  }
  &:disabled {
    cursor: progress;
  }
`;

const DetailPills = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;
