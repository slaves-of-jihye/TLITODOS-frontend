import styled from "@emotion/styled";
import { useCallback, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { DeadlineValue } from "@/features/todo-deadline";
import type { TodoDrag } from "@/features/todo-drag";
import type { Category, DailyTodoStatus, GroupMember, Importance, Todo, TodoPatchRequest } from "@/shared/api";
import { categoryAccent, sortCategories } from "@/entities/category";
import { MemberChip, useGroups } from "@/entities/group";
import {
  TodoList,
  TodoRowSkeleton,
  dependencyCandidates,
  toRecurrence,
  useConvertToRoutine,
  useDeleteRoutine,
  useDeleteTodo,
  useInvalidateTodos,
  useSetDependencies,
  useUpdateTodo,
} from "@/entities/todo";
import { TodoDraftRow } from "@/features/todo-create";
import { DeadlineModal } from "@/features/todo-deadline";
import { CATEGORY_DROP_ATTRIBUTE, DraggableRow } from "@/features/todo-drag";
import { RoutineModal } from "@/features/todo-routine";
import { addMonths, dateOnly, formatLocalDate, getCalendarDays } from "@/shared/lib";
import {
  Button,
  CategoryPill,
  ConfirmChoice,
  ConfirmMenu,
  ConfirmNote,
  DayStash,
  DetailEmpty,
  ErrorText,
  HeaderRow,
  Modal,
  MonthArrow,
  MonthButtons,
  MonthHeader,
  MonthPicker,
  Skeleton,
  SrOnly,
  StatusCluster,
  TodoRow as SharedTodoRow,
  ViewChip,
  hoverScrollbarPull,
  hoverScrollbarX,
  icons,
  palette,
  theme,
} from "@/shared/ui";

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : "요청을 처리하지 못했습니다.");

export const WorkspaceHeader = ({
  activeGroupId,
  onCreate,
  onJoin,
}: {
  activeGroupId?: number;
  onCreate: () => void;
  onJoin: () => void;
}) => {
  const navigate = useNavigate();
  const { data: groups = [] } = useGroups();
  return (
    <HeaderRow>
      {groups.map(group => (
        <ViewChip
          key={group.groupId}
          active={activeGroupId === group.groupId}
          onClick={() => navigate(`/groups/${group.groupId}`)}
        >
          {group.name}
        </ViewChip>
      ))}
      <Button type="button" onClick={onCreate}>
        ＋ 그룹 생성
      </Button>
      <Button type="button" variant="ghost" onClick={onJoin}>
        초대코드로 참여하기
      </Button>
    </HeaderRow>
  );
};

/**
 * 그룹 화면 맨 위 줄. 뒤로가기 · 그룹 이름 · 그룹 설정입니다.
 *
 * 시트 안의 동작이 모두 그룹장 전용이라, `onSettings`는 그룹장일 때만 넘어옵니다.
 * 없으면 버튼 자리를 비웁니다 — 그래도 이름은 가운데에 남습니다.
 */
export const GroupTopBar = ({
  name,
  onBack,
  onSettings,
}: {
  name: string;
  onBack: () => void;
  onSettings?: () => void;
}) => (
  <GroupBar>
    <GroupBarButton type="button" onClick={onBack}>
      <BackArrow src={icons.arrowUp} alt="" aria-hidden />
      뒤로가기
    </GroupBarButton>
    <GroupBarTitle>{name}</GroupBarTitle>
    <GroupBarEnd>
      {onSettings ? (
        <GroupBarButton type="button" onClick={onSettings}>
          그룹 설정
        </GroupBarButton>
      ) : null}
    </GroupBarEnd>
  </GroupBar>
);
/** 양쪽 칸을 같은 너비로 두어, 오른쪽 버튼이 없어도 이름이 가운데 있습니다. */
const GroupBar = styled.header`
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 16px;
  margin-bottom: 26px;
`;
const GroupBarEnd = styled.div`
  display: flex;
  justify-content: flex-end;
`;
const GroupBarButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 0;
  background: transparent;
  padding: 0;
  font-size: ${theme.text.h3};
  color: ${theme.colors.ink};
  white-space: nowrap;
`;
const GroupBarTitle = styled.p`
  margin: 0;
  min-width: 0;
  font-size: ${theme.text.h2};
  color: ${theme.colors.ink};
  overflow-wrap: anywhere;
`;
const BackArrow = styled.img`
  width: 24px;
  height: 24px;
  transform: rotate(-90deg);
`;

/** 그룹 멤버를 고르는 줄. 나를 맨 앞에 둡니다. */
export const MemberTabs = ({
  members,
  activeUserId,
  loading = false,
  onSelect,
  onShareInvite,
}: {
  members: GroupMember[];
  activeUserId: number | null;
  /** 그룹을 아직 받아 오는 중인지. 빈 줄 대신 칩 자리를 잡아 둡니다. */
  loading?: boolean;
  onSelect: (userId: number) => void;
  onShareInvite?: () => void;
}) => (
  <MemberBar>
    <MemberRow role={loading ? "status" : undefined}>
      {loading ? (
        <>
          <SrOnly>멤버를 불러오는 중</SrOnly>
          {["132px", "108px", "124px"].map(width => (
            <Skeleton key={width} width={width} height="48px" radius={theme.radius.pill} />
          ))}
        </>
      ) : null}
      {members.map(member => (
        <MemberChip
          key={member.userId}
          member={member}
          active={member.userId === activeUserId}
          onClick={() => onSelect(member.userId)}
        />
      ))}
    </MemberRow>
    {/* 멤버가 넘쳐 줄이 옆으로 밀려도 같이 밀리지 않게, 스크롤되는 칩 줄 밖에 둡니다. */}
    {onShareInvite ? (
      <InviteShareButton type="button" variant="ghost" onClick={onShareInvite}>
        초대코드 공유하기
      </InviteShareButton>
    ) : null}
  </MemberBar>
);
const MemberBar = styled.div`
  position: sticky;
  top: 0;
  z-index: 40;
  background: ${palette.white};
  /* 붙었을 때만 여백이 되도록, 같은 값만큼 위로 당겨 평소 간격을 지킵니다. */
  padding-top: 12px;
  margin-top: -12px;
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 36px;
  min-width: 0;
`;
const InviteShareButton = styled(Button)`
  flex: none;
`;
const MemberRow = styled.div`
  ${hoverScrollbarX}
  display: flex;
  gap: 16px;
  min-width: 0;
  ${hoverScrollbarPull}
`;

export const CalendarPanel = ({
  month,
  selectedDate,
  statuses,
  categories,
  onMonthChange,
  onDateChange,
}: {
  month: Date;
  selectedDate: string;
  /** 날짜별 요약. 서버의 daily-status이거나 목록으로 접어 만든 같은 모양입니다. */
  statuses: DailyTodoStatus[];
  categories: Category[];
  onMonthChange: (date: Date) => void;
  onDateChange: (date: string) => void;
}) => {
  const sorted = sortCategories(categories);
  const days = getCalendarDays(month);
  const today = formatLocalDate(new Date());
  const byDate = useMemo(() => new Map(statuses.map(status => [status.date, status])), [statuses]);
  return (
    <CalendarWrap>
      <MonthHeader>
        <MonthPicker month={month} onChange={onMonthChange} />
        <MonthButtons>
          <MonthArrow direction="prev" aria-label="이전 달" onClick={() => onMonthChange(addMonths(month, -1))}>
            <img src={icons.arrowUp} alt="" aria-hidden />
          </MonthArrow>
          <MonthArrow direction="next" aria-label="다음 달" onClick={() => onMonthChange(addMonths(month, 1))}>
            <img src={icons.arrowUp} alt="" aria-hidden />
          </MonthArrow>
        </MonthButtons>
      </MonthHeader>
      <WeekRow>
        {["일", "월", "화", "수", "목", "금", "토"].map(day => (
          <span key={day}>{day}</span>
        ))}
      </WeekRow>
      <DaysGrid>
        {days.map((date, index) => {
          if (!date) return <span key={`empty-${index}`} />;
          const value = formatLocalDate(date);
          const status = byDate.get(value);
          // 점은 카테고리 순서(해야할 일 -> 사용자 -> 취미)대로 찍습니다. 서버는
          // categoryId 순으로 주므로 정렬된 카테고리를 훑어 맞춥니다.
          const marks = sorted.flatMap((category, catIndex) => {
            const categoryStatus = status?.categoryStatuses.find(item => item.categoryId === category.categoryId);
            return categoryStatus
              ? [{ accent: categoryAccent(category.color, catIndex), done: categoryStatus.isCompleted }]
              : [];
          });
          return (
            <DayStash
              key={value}
              date={date.getDate()}
              marks={marks}
              incompleteCount={status?.incompleteCount ?? 0}
              /*
               * 사분면 배치가 흔들리지 않도록 씨앗은 배치를 정하는 것만 담습니다 —
               * 그 날짜와, 쓰인 카테고리가 채워졌는지 여부(0/1)입니다. 남은 할 일
               * 수를 넣으면 관계없는 할 일을 하나 체크할 때마다 남는 칸이 다른
               * 카테고리로 옮겨 다닙니다.
               */
              seed={`${value}:${marks.map(mark => (mark.done ? 1 : 0)).join("")}`}
              selected={value === selectedDate}
              today={value === today}
              onClick={() => onDateChange(value)}
            />
          );
        })}
      </DaysGrid>
    </CalendarWrap>
  );
};
/** 달력 한 칸의 너비. `StatusCluster` 기본 크기와 같습니다. */
const DAY_CELL = 30;
/**
 * 날짜 칸 사이 간격.
 *
 * 디자인의 450px 달력이 40px 간격입니다(7*30 + 6*40 = 450). 그보다 좁은 자리에
 * 놓이면 칸 크기는 두고 간격만 좁혀 넘치지 않게 합니다 — 1100px 아래에서 두 단이
 * 함께 줄어들 때가 그렇습니다. 화면 폭이 아니라 놓인 자리의 폭에 맞춰야 하므로
 * 미디어쿼리로는 할 수 없고, 격자 간격의 퍼센트가 그 자리의 너비를 가리킵니다.
 */
const dayColumnGap = `clamp(4px, calc((100% - ${DAY_CELL * 7}px) / 6), 40px)`;

const CalendarWrap = styled.section`
  width: 100%;
  max-width: ${theme.layout.calendar};
`;
const WeekRow = styled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  column-gap: ${dayColumnGap};
  text-align: center;
  margin: 12px 0 20px;
  font-size: ${theme.text.h3};
  /* 일요일은 빨강, 토요일은 파랑입니다. */
  span:first-of-type {
    color: ${theme.colors.red};
  }
  span:last-of-type {
    color: ${theme.colors.blue};
  }
  @media (max-width: 600px) {
    gap: 8px;
    font-size: ${theme.text.s};
  }
`;
const DaysGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  column-gap: ${dayColumnGap};
  row-gap: 16px;
  justify-items: center;
  /* 일요일 열은 빨강, 토요일 열은 파랑입니다. */
  > *:nth-child(7n + 1) {
    color: ${theme.colors.red};
  }
  > *:nth-child(7n) {
    color: ${theme.colors.blue};
  }
`;

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

export const CategorySection = ({
  category,
  index,
  todos,
  own,
  adding,
  editingTitleId,
  onAdd,
  onCancelAdd,
  onCreate,
  onRenameTitle,
  onManage,
  onToggle,
  onEdit,
  onBet,
  drag,
  pending = 0,
}: {
  category: Category;
  index: number;
  todos: Todo[];
  own: boolean;
  /** 이 카테고리에 인라인 입력 줄이 열려 있는지. */
  adding?: boolean;
  /** 제목을 인라인으로 고치는 중인 할 일. */
  editingTitleId?: number | null;
  onAdd: (category: Category) => void;
  onCancelAdd: () => void;
  onCreate: (category: Category, title: string) => Promise<void>;
  onRenameTitle: (todo: Todo, title: string) => Promise<void>;
  onManage: (category: Category) => void;
  onToggle: (todo: Todo) => void;
  onEdit: (todo: Todo) => void;
  /** 남의 할 일에 내기를 걸 때. 내 화면에서는 넘어오지 않습니다. */
  onBet?: (todo: Todo) => void;
  /** 할 일을 끌어 옮기는 손짓. 내 화면에서만 넘어옵니다. */
  drag?: TodoDrag;
  /** 방금 만들어 아직 목록에 없는 할 일의 수. 그만큼 빈 줄을 잡아 둡니다. */
  pending?: number;
}) => {
  const accent = categoryAccent(category.color, index);
  const isTarget = Boolean(drag?.activeId) && drag?.overId === category.categoryId;
  return (
    <CategoryColumn
      {...{ [CATEGORY_DROP_ATTRIBUTE]: category.categoryId }}
      style={{ borderColor: isTarget ? accent : undefined }}
    >
      <CategoryPill
        name={category.name}
        accent={accent}
        own={own}
        onAdd={own ? () => onAdd(category) : undefined}
        onManage={own ? () => onManage(category) : undefined}
      />
      <TodoList>
        {todos.map(todo =>
          todo.todoId === editingTitleId ? (
            <TodoDraftRow
              key={todo.todoId}
              accent={accent}
              initial={todo.title}
              onCancel={onCancelAdd}
              onCommit={title => onRenameTitle(todo, title)}
            />
          ) : (
            <DraggableRow key={todo.todoId} dragging={drag?.activeId === todo.todoId} {...drag?.rowProps(todo)}>
              <SharedTodoRow
                todo={todo}
                accent={accent}
                own={own}
                onToggle={() => onToggle(todo)}
                onEdit={() => onEdit(todo)}
                onBet={onBet ? () => onBet(todo) : undefined}
              />
            </DraggableRow>
          ),
        )}
        {adding ? (
          <TodoDraftRow accent={accent} onCancel={onCancelAdd} onCommit={title => onCreate(category, title)} />
        ) : null}
        {/*
         * 방금 만든 할 일의 자리입니다.
         *
         * 만들기가 끝나도 목록은 한 번 더 받아 와야 도착합니다. 그 사이 입력 줄은
         * 이미 닫혀 있어, 자리를 잡아 두지 않으면 방금 쓴 것이 사라진 것처럼 보입니다.
         */}
        {Array.from({ length: pending }, (_, index) => (
          <TodoRowSkeleton key={`pending-${index}`} label="할 일을 담는 중" />
        ))}
      </TodoList>
    </CategoryColumn>
  );
};

const CategoryColumn = styled.section`
  min-width: 0;
  /* 끌어온 할 일을 받을 칸임을 테두리로 알립니다. 자리는 늘 잡아 두어 흔들리지 않습니다. */
  border: 2px dashed transparent;
  border-radius: ${theme.radius.sm};
  margin: -8px;
  padding: 8px;
`;
