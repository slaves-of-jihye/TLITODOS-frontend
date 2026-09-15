import styled from "@emotion/styled";
import { useCallback, useRef, useState } from "react";
import type { DeadlineValue } from "@/features/todo-deadline";
import type { Category, Importance, Todo, TodoPatchRequest } from "@/shared/api";
import { categoryAccent, sortCategories } from "@/entities/category";
import {
  dependencyCandidates,
  toRecurrence,
  useConvertToRoutine,
  useDeleteRoutine,
  useDeleteTodo,
  useInvalidateTodos,
  useSetDependencies,
  useUpdateTodo,
} from "@/entities/todo";
import { DeadlineModal } from "@/features/todo-deadline";
import { RoutineModal } from "@/features/todo-routine";
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
  onEditTitle,
}: {
  open: boolean;
  todo: Todo | null;
  categories: Category[];
  todos: Todo[];
  selectedDate: string;
  onClose: () => void;
  onEditTitle: (todo: Todo) => void;
}) => {
  const updateTodo = useUpdateTodo();
  const setDependencies = useSetDependencies();
  const deleteTodo = useDeleteTodo();
  const convertToRoutine = useConvertToRoutine();
  const deleteRoutine = useDeleteRoutine();
  const invalidateTodos = useInvalidateTodos();
  const [detail, setDetail] = useState(todo?.description ?? "");
  /**
   * 마지막으로 저장한 세부사항입니다.
   *
   * 엔터로 저장한 뒤 포커스가 빠질 때 같은 값을 또 보내지 않으려고 들고 있습니다.
   * `todo.description`과 비교하면 안 됩니다 — 상세 시트가 들고 있는 할 일은 저장
   * 뒤에도 갱신되지 않아 방금 보낸 값을 모릅니다.
   */
  const savedDetail = useRef(todo?.description ?? "");
  const [importance, setImportance] = useState<Importance>(todo?.importance ?? "NONE");
  const [dependency, setDependency] = useState<number | null>(todo?.dependencies[0] ?? null);
  const [deadline, setDeadline] = useState<DeadlineValue>({
    start: dateOnly(todo?.startDate) ?? selectedDate,
    date: dateOnly(todo?.dueDate) ?? dateOnly(todo?.startDate) ?? selectedDate,
    time: todo?.time ?? "",
  });
  const [deadlineOpen, setDeadlineOpen] = useState(false);
  const [routineOpen, setRoutineOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  /** 열려 있는 삭제 확인 드롭다운. 한 번에 하나만 엽니다. */
  const [confirming, setConfirming] = useState<"todo" | "routine" | null>(null);
  const dismissConfirm = useCallback(() => setConfirming(null), []);
  const removing = deleteTodo.isPending || deleteRoutine.isPending;
  const ordered = sortCategories(categories);
  const candidates = dependencyCandidates(todos, todo, selectedDate, dependency === null ? [] : [dependency]);
  const saveDetail = () => {
    if (detail === savedDetail.current) return;
    savedDetail.current = detail;
    void patch({ description: detail });
  };
  const patch = async (body: TodoPatchRequest) => {
    if (!todo) return;
    setBusy(true);
    setError("");
    try {
      await updateTodo.mutateAsync({ id: todo.todoId, body });
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
            <DetailTitle>{todo.title}</DetailTitle>
            <DetailBody>
              <div>
                <DetailActions>
                  <DetailAction onClick={() => onEditTitle(todo)}>
                    <img src={icons.edit} alt="" aria-hidden />할 일 수정하기
                  </DetailAction>
                  <ConfirmMenu
                    open={confirming === "todo"}
                    label="할 일 삭제"
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
                <DetailBlock>
                  <DetailLabel>할 일에 대한 세부사항 입력하기</DetailLabel>
                  <DetailField>
                    <input
                      value={detail}
                      maxLength={TODO_DETAIL_LIMIT}
                      placeholder="세부사항을 작성하세요..."
                      disabled={busy}
                      onChange={event => setDetail(event.target.value)}
                      // 엔터로 바로 저장합니다. 계속 고칠 수 있게 포커스는 두고 갑니다.
                      onKeyDown={event => {
                        if (event.key !== "Enter") return;
                        event.preventDefault();
                        saveDetail();
                      }}
                      onBlur={saveDetail}
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
                            onClick={async () => {
                              /*
                               * 목록 전체를 한 번에 보냅니다(PUT). 고른 것을 다시 누르면 빈
                               * 배열이 되어 서버에서도 풀립니다 — 예전에는 화면에서만 풀려
                               * 서버에는 남았고, 다른 것을 고르면 앞의 것이 남아 둘이 됐습니다.
                               */
                              const previous = dependency;
                              const next = chosen ? null : candidate.todoId;
                              setDependency(next);
                              setError("");
                              try {
                                await setDependencies.mutateAsync({
                                  id: todo.todoId,
                                  dependencyTodoIds: next === null ? [] : [next],
                                });
                              } catch (reason) {
                                // 서버가 받지 않았으면 화면도 되돌립니다.
                                setDependency(previous);
                                setError(errorMessage(reason));
                              }
                            }}
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
                        onClick={() => {
                          setImportance(key);
                          void patch({ importance: key });
                        }}
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
                    <DetailAction onClick={() => setRoutineOpen(true)}>
                      <img src={icons.routine} alt="" aria-hidden />
                      루틴으로 등록하기
                    </DetailAction>
                  )}
                </DetailBlock>
              </div>
            </DetailBody>
            {error ? <ErrorText>{error}</ErrorText> : null}
          </DetailSheet>
        ) : null}
      </Modal>
      <DeadlineModal
        open={deadlineOpen}
        value={deadline}
        onChange={next => {
          setDeadline(next);
          void patch({ startDate: next.start, dueDate: next.date, time: next.time || null });
        }}
        onClose={() => setDeadlineOpen(false)}
      />
      <RoutineModal
        key={`${routineOpen}-${selectedDate}`}
        open={routineOpen}
        initialDate={dateOnly(todo?.startDate) ?? selectedDate}
        initialTime={todo?.time ?? ""}
        onClose={() => setRoutineOpen(false)}
        onRegister={async (value, requestId) => {
          if (!todo) return;
          setError("");
          try {
            // 원본이 첫 회차가 되므로 새로 만들지 않고 이 할 일을 루틴으로 돌립니다.
            await convertToRoutine.mutateAsync({
              id: todo.todoId,
              body: {
                requestId,
                startDate: value.start,
                endDate: value.end,
                time: value.time || null,
                recurrence: toRecurrence(value.repeat, value.weekdays),
              },
            });
            invalidateTodos();
            setRoutineOpen(false);
            onClose();
          } catch (reason) {
            setError(errorMessage(reason));
          }
        }}
      />
    </>
  );
};

const DetailSheet = styled.div`
  display: grid;
  gap: 32px;
`;

const DetailTitle = styled.p`
  margin: 0;
  text-align: center;
  font-size: ${theme.text.h3};
  color: ${theme.colors.ink};
  overflow-wrap: anywhere;
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

const DetailActions = styled.div`
  display: flex;
  gap: 20px;
`;

const DetailAction = styled.button`
  display: flex;
  flex: 1;
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
