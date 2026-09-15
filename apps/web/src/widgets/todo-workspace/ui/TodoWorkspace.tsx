import styled from "@emotion/styled";
import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Category, Diary, Todo } from "@/shared/api";
import { sortCategories, useCategories } from "@/entities/category";
import { isDiaryForDate, useDiaries } from "@/entities/diary";
import {
  buildDailyStatuses,
  sortTodos,
  todosForDate,
  useCreateTodo,
  useDailyTodoStatuses,
  useRefillTodos,
  useTodos,
  useUpdateTodo,
} from "@/entities/todo";
import { useMe } from "@/entities/user";
import { BetRequestModal } from "@/features/bet-request";
import { CategoryManageModal } from "@/features/category-rename";
import { DiaryViewModal } from "@/features/diary-view";
import { CalendarPanel } from "./CalendarPanel";
import { CategoryBoard, TodoArea } from "./boardStyles";
import { CategorySection, TodoBoardSkeleton } from "./TodoBoard";
import { DependencyBlockModal, useTodoCompletion } from "@/features/todo-complete";
import { TrashDropZone, useTodoDrag } from "@/features/todo-drag";
import { TodoDeleteModal } from "@/features/todo-delete";
import { TodoDetailModal } from "./TodoDetailModal";
import { useAssetObjectUrl } from "@/shared/api";
import { errorMessage, formatLocalDate, monthKey } from "@/shared/lib";
import { DiaryBadge, EmptyState, ErrorText, palette, theme } from "@/shared/ui";

export const TodoWorkspace = ({
  own,
  ownerId,
  groupId,
  ownerName,
}: {
  own: boolean;
  ownerId?: number;
  groupId: number | null;
  ownerName?: string;
}) => {
  const navigate = useNavigate();
  const today = formatLocalDate(new Date());
  const [selectedDate, setSelectedDate] = useState(today);
  const [month, setMonth] = useState(() => new Date());
  const { data: me } = useMe();
  const targetUserId = ownerId ?? null;
  const categoriesQuery = useCategories(groupId, targetUserId);
  const { data: categoriesRaw = [] } = categoriesQuery;
  const categories = useMemo(() => sortCategories(categoriesRaw), [categoriesRaw]);
  /**
   * 할 일은 고른 날짜만 받아 옵니다.
   *
   * 달력에 찍을 개수는 달별 요약이 따로 주므로, 목록까지 통째로 받을 이유가
   * 없습니다. 날짜를 옮기면 그 날짜 몫만 새로 받고, 달을 옮기면 요약만 새로
   * 받습니다. 마감일이 없는 할 일도 함께 오지만 `todosForDate`가 걸러냅니다.
   */
  const todosQuery = useTodos(groupId, selectedDate, targetUserId);
  const { data: dateTodosRaw = [], refetch } = todosQuery;
  const ownerTodos = useMemo(
    () => (ownerId === undefined ? dateTodosRaw : dateTodosRaw.filter(todo => todo.userId === ownerId)),
    [dateTodosRaw, ownerId],
  );
  // daily-status가 groupId/userId를 받으므로 남의 달력도 달 전체를 받아 옵니다.
  const { data: serverStatuses = [] } = useDailyTodoStatuses(monthKey(month), { groupId, userId: targetUserId });
  const { data: diaries = [] } = useDiaries({ date: selectedDate, groupId, userId: targetUserId });
  const [blocked, setBlocked] = useState<Todo[]>([]);
  const { overrides: completionOverrides, toggle } = useTodoCompletion({
    serverTodos: ownerTodos,
    onBlocked: setBlocked,
    onRevert: refetch,
  });
  const [addingCategoryId, setAddingCategoryId] = useState<number | null>(null);
  const [detailTodo, setDetailTodo] = useState<Todo | null>(null);
  /*
   * 만든 뒤 목록을 다시 받는 것까지 이 화면이 기다립니다.
   *
   * 새 할 일이 목록에 나타날 때까지 빈 줄을 잡아 두어야 하는데, 평소처럼 무효화만
   * 걸고 지나가면 그 끝을 알 수 없습니다.
   */
  const createTodo = useCreateTodo({ invalidate: false });
  const refillTodos = useRefillTodos();
  /** 방금 만들어 아직 목록에 없는 할 일의 수. 카테고리별로 셉니다. */
  const [pendingByCategory, setPendingByCategory] = useState<Record<number, number>>({});
  const updateTodo = useUpdateTodo();
  const [manage, setManage] = useState<Category | null>(null);
  const [diaryPreview, setDiaryPreview] = useState<Diary | null>(null);
  /** 내기를 걸려고 고른 남의 할 일. */
  const [betTodo, setBetTodo] = useState<Todo | null>(null);
  /** 끌어 옮기는 중인 할 일의 새 카테고리. 서버가 답하기 전에도 옮겨 둡니다. */
  const [movedCategories, setMovedCategories] = useState<Record<number, number>>({});
  const [moveError, setMoveError] = useState("");
  const todos = useMemo(
    () =>
      ownerTodos.map(todo => {
        const isCompleted = completionOverrides[todo.todoId] ?? todo.isCompleted;
        const categoryId = movedCategories[todo.todoId] ?? todo.categoryId;
        return isCompleted === todo.isCompleted && categoryId === todo.categoryId
          ? todo
          : { ...todo, isCompleted, categoryId };
      }),
    [ownerTodos, completionOverrides, movedCategories],
  );
  const selectedTodos = useMemo(() => todosForDate(todos, selectedDate), [todos, selectedDate]);
  /**
   * 달력에 찍을 날짜별 요약입니다.
   *
   * 달 전체는 서버 요약을 씁니다. 고른 날짜만은 손안의 목록으로 덮습니다 —
   * 체크를 눌렀을 때 낙관적 표시가 달력에도 바로 보여야 하기 때문입니다.
   */
  const dailyStatuses = useMemo(() => {
    const local = buildDailyStatuses(selectedTodos).find(status => status.date === selectedDate);
    return local ? [...serverStatuses.filter(status => status.date !== selectedDate), local] : serverStatuses;
  }, [serverStatuses, selectedTodos, selectedDate]);
  const selectedDiary = diaries.find(
    diary => diary.userId === (ownerId ?? diary.userId) && isDiaryForDate(diary, selectedDate),
  );
  const loadError = categoriesQuery.error ?? todosQuery.error;
  const isLoading = categoriesQuery.isLoading || todosQuery.isLoading;
  const handleToggle = (todo: Todo) => {
    if (!own) return;
    toggle(todo.todoId);
  };
  const bumpPending = useCallback(
    (categoryId: number, step: number) =>
      setPendingByCategory(current => {
        const next = (current[categoryId] ?? 0) + step;
        if (next > 0) return { ...current, [categoryId]: next };
        return Object.fromEntries(Object.entries(current).filter(([id]) => Number(id) !== categoryId));
      }),
    [],
  );
  const moveToCategory = useCallback(
    async (todo: Todo, categoryId: number) => {
      setMoveError("");
      setMovedCategories(current => ({ ...current, [todo.todoId]: categoryId }));
      try {
        await updateTodo.mutateAsync({ id: todo.todoId, body: { categoryId } });
      } catch (reason) {
        setMoveError(errorMessage(reason));
      } finally {
        // 서버 값이 캐시에 들어왔으니 임시 자리는 거둡니다. 실패했다면 원래 칸으로 돌아갑니다.
        setMovedCategories(current =>
          Object.fromEntries(Object.entries(current).filter(([id]) => Number(id) !== todo.todoId)),
        );
      }
    },
    [updateTodo],
  );
  /** 휴지통에 놓은 할 일. 곧바로 지우지 않고 한 번 묻습니다. */
  const [trashTodo, setTrashTodo] = useState<Todo | null>(null);
  const drag = useTodoDrag({ enabled: own, onDrop: moveToCategory, onTrash: setTrashTodo });
  // 친구 화면에서는 멤버 목록에 사진이 없어, 내 화면에서만 프로필 사진을 씁니다.
  const ownerImage = useAssetObjectUrl(own ? me?.profileImageUrl : null);
  return (
    <>
      <WorkspaceGrid>
        <div>
          <OwnerRow>
            <OwnerProfile>
              {ownerImage ? <img src={ownerImage} alt="" /> : <span aria-hidden>{own ? "🌱" : "🐰"}</span>}
              <div>
                <strong>{own ? me?.name || "나" : ownerName || "친구"}</strong>
                {own && me?.bio ? <small>{me.bio}</small> : null}
              </div>
            </OwnerProfile>
            {own || selectedDiary ? (
              <DiaryBadge
                emotion={selectedDiary?.emotion}
                nickname={selectedDiary ? "일기" : "일기쓰기"}
                onClick={() =>
                  own ? navigate(`/diary?date=${selectedDate}`) : selectedDiary && setDiaryPreview(selectedDiary)
                }
              />
            ) : null}
          </OwnerRow>
          <CalendarPanel
            month={month}
            selectedDate={selectedDate}
            statuses={dailyStatuses}
            categories={categories}
            onMonthChange={setMonth}
            onDateChange={setSelectedDate}
          />
        </div>
        <TodoArea>
          {loadError ? (
            <EmptyState>
              <ErrorText>{errorMessage(loadError)}</ErrorText>
            </EmptyState>
          ) : isLoading ? (
            <TodoBoardSkeleton columns={categories.length || 4} />
          ) : !categories.length ? (
            <EmptyState>카테고리를 준비하고 있어요.</EmptyState>
          ) : (
            <CategoryBoard>
              {categories.map((category, index) => (
                <CategorySection
                  key={category.categoryId}
                  category={category}
                  index={index}
                  todos={sortTodos(
                    selectedTodos.filter(todo => todo.categoryId === category.categoryId),
                    selectedTodos,
                  )}
                  own={own}
                  adding={addingCategoryId === category.categoryId}
                  onAdd={next => setAddingCategoryId(next.categoryId)}
                  onCancelAdd={() => setAddingCategoryId(null)}
                  onCreate={async (next, title) => {
                    setAddingCategoryId(null);
                    bumpPending(next.categoryId, 1);
                    try {
                      await createTodo.mutateAsync({
                        title,
                        categoryId: next.categoryId,
                        importance: "NONE",
                        hardship: 1,
                        // 하루짜리 할 일은 시작일과 마감일이 같습니다. 시간은 상세에서 붙입니다.
                        startDate: selectedDate,
                        dueDate: selectedDate,
                      });
                      // 새 목록이 도착해야 자리를 비웁니다. 그전에 비우면 방금 쓴 것이 잠깐 사라집니다.
                      await refillTodos();
                    } finally {
                      bumpPending(next.categoryId, -1);
                    }
                  }}
                  onManage={setManage}
                  onToggle={handleToggle}
                  onEdit={setDetailTodo}
                  onBet={own ? undefined : setBetTodo}
                  drag={own ? drag : undefined}
                  pending={pendingByCategory[category.categoryId] ?? 0}
                />
              ))}
            </CategoryBoard>
          )}
          {moveError ? <ErrorText>{moveError}</ErrorText> : null}
        </TodoArea>
      </WorkspaceGrid>
      <TodoDetailModal
        key={detailTodo?.todoId ?? 0}
        open={detailTodo !== null}
        todo={detailTodo}
        categories={categories}
        todos={selectedTodos}
        selectedDate={selectedDate}
        onClose={() => setDetailTodo(null)}
      />
      <CategoryManageModal
        key={manage?.categoryId ?? 0}
        category={manage}
        open={manage !== null}
        onClose={() => setManage(null)}
      />
      <DependencyBlockModal todos={blocked} open={blocked.length > 0} onClose={() => setBlocked([])} />
      <BetRequestModal
        key={betTodo?.todoId ?? 0}
        todo={betTodo}
        ownerName={ownerName || "친구"}
        open={betTodo !== null}
        onClose={() => setBetTodo(null)}
      />
      {/* 끌고 있는 동안에만 아래에서 올라오는 휴지통. 내 화면에서만 끌 수 있으므로 남의 화면에는 없습니다. */}
      {own ? <TrashDropZone visible={drag.dragging} over={drag.overTrash} /> : null}
      <TodoDeleteModal todo={trashTodo} onClose={() => setTrashTodo(null)} />
      {/* 끌고 있는 동안 손끝을 따라다니는 쪽지. 포인터를 가리지 않게 오른쪽 아래로 비켜 둡니다. */}
      {drag.preview ? (
        <DragPreview style={{ left: drag.preview.x, top: drag.preview.y }}>{drag.preview.title}</DragPreview>
      ) : null}
      {/* Figma group 섹션의 `modal / diary`입니다. 닫기 버튼이 없어 뒤 배경을 눌러 닫습니다. */}
      {diaryPreview ? (
        <DiaryViewModal diary={diaryPreview} author={ownerName || "친구"} onClose={() => setDiaryPreview(null)} />
      ) : null}
      {/* BetModal is intentionally kept out of the active MVP build. */}
    </>
  );
};

const WorkspaceGrid = styled.main`
  display: grid;
  /* 두 단 모두 줄어들 수 있게 둡니다. 좁은 폭에서 1100px를 넘겨 넘치지 않도록. */
  grid-template-columns: minmax(0, ${theme.layout.calendar}) minmax(0, ${theme.layout.board});
  gap: ${theme.layout.columnGap};
  align-items: start;
  @media (max-width: 900px) {
    grid-template-columns: 1fr;
    gap: 54px;
  }
  @media (max-width: 600px) {
    gap: 36px;
  }
`;

const DragPreview = styled.div`
  position: fixed;
  /* 모달(100)보다는 아래, 네비게이션(60)보다는 위입니다. */
  z-index: 90;
  transform: translate(14px, 14px);
  pointer-events: none;
  max-width: 240px;
  border-radius: ${theme.radius.sm};
  background: ${palette.white};
  box-shadow: ${theme.shadow};
  padding: 8px 14px;
  font-size: ${theme.text.s};
  color: ${theme.colors.ink};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const OwnerRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
`;

const OwnerProfile = styled.div`
  display: flex;
  align-items: center;
  gap: 20px;
  min-width: 0;
  padding: 8px 12px;
  border-radius: ${theme.radius.sm};
  img,
  > span {
    flex: none;
    width: 60px;
    height: 60px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    object-fit: cover;
    background: ${theme.colors.panel};
    font-size: 30px;
  }
  strong {
    display: block;
    font-size: ${theme.text.h2};
    overflow-wrap: anywhere;
  }
  small {
    display: block;
    color: ${theme.colors.muted};
    font-size: ${theme.text.s};
    overflow-wrap: anywhere;
  }
  @media (max-width: 600px) {
    gap: 14px;
    padding: 0;
    img,
    > span {
      width: 48px;
      height: 48px;
      font-size: 24px;
    }
  }
`;
