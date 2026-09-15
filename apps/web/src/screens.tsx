import styled from "@emotion/styled";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import type {
  Bet,
  Category,
  Diary,
  DiaryCreateRequest,
  DiaryPatchRequest,
  NotificationType,
  Todo,
  UiVisibility,
} from "@/shared/api";
import { sortCategories, useCategories } from "@/entities/category";
import { DiaryPhoto, isDiaryForDate, useDeleteDiary, useDiaries, useSaveDiary } from "@/entities/diary";
import { useGroup } from "@/entities/group";
import {
  ALARM_FILTERS,
  ActorAvatar,
  AlarmDot,
  AlarmEmpty,
  AlarmList,
  AlarmListSkeleton,
  AlarmRow,
  UnreadDot,
  alarmSentence,
  useMarkNotificationRead,
  useNotificationUnreadStatus,
  useNotifications,
} from "@/entities/notification";
import {
  TodoColumnSkeleton,
  buildDailyStatuses,
  sortTodos,
  todosForDate,
  useCreateTodo,
  useDailyTodoStatuses,
  useRefillTodos,
  useTodos,
  useUpdateTodo,
} from "@/entities/todo";
import { resolveFont, useMe, useUpdateFont, useUpdateProfile } from "@/entities/user";
import { BetReceivedModal } from "@/features/bet-answer";
import { BetRequestModal } from "@/features/bet-request";
import { CategoryColorSection } from "@/features/category-color";
import { CategoryManageModal } from "@/features/category-rename";
import { DiaryViewModal } from "@/features/diary-view";
import { FontProfileRow } from "@/features/font-select";
import { GroupInviteModal } from "@/features/group-invite";
import { GroupActionModals } from "@/features/group-join";
import { GroupInfoModal } from "@/features/group-settings";
import {
  BIO_LIMIT,
  EditableProfileRow,
  MAX_PROFILE_IMAGE_BYTES,
  NAME_LIMIT,
  PhotoRow,
  ProfileImageAction,
} from "@/features/profile-edit";
import { DependencyBlockModal, useTodoCompletion } from "@/features/todo-complete";
import { useTodoDrag } from "@/features/todo-drag";
import { useApi, useAssetObjectUrl, useServerBusy } from "@/shared/api";
import { formatLocalDate, formatLongKoreanDate, monthKey, readStoredFont } from "@/shared/lib";
import { useSessionStore } from "@/shared/model";
import {
  AppShell,
  BottomNav,
  BusyBar,
  Button,
  ConfirmChoice,
  ConfirmMenu,
  ConfirmNote,
  DiaryBadge,
  EmptyState,
  ErrorText,
  FieldBlock,
  FieldLabel,
  HiddenFileInput,
  PageTitle,
  Skeleton,
  SrOnly,
  icons,
  palette,
  theme,
} from "@/shared/ui";
import {
  CalendarPanel,
  CategorySection,
  GroupTopBar,
  MemberTabs,
  TodoDetailModal,
  WorkspaceHeader,
} from "./components";

const message = (error: unknown) => (error instanceof Error ? error.message : "요청에 실패했습니다.");

const useHeaderModal = () => {
  const [mode, setMode] = useState<"create" | "join" | null>(null);
  return { mode, openCreate: () => setMode("create"), openJoin: () => setMode("join"), close: () => setMode(null) };
};

/**
 * 화면 맨 위에 걸리는 진행 줄.
 *
 * 저장·삭제 같은 쓰기는 끝나도 목록을 뒤에서 다시 받아 옵니다. 그 왕복까지가
 * 사용자가 기다리는 시간이므로 쓰기와 읽기를 가리지 않고 하나로 켭니다. 어느
 * 화면에서 무엇을 하든 자리가 같도록 한 군데서만 답니다.
 */
export const ServerBusyBar = () => <BusyBar busy={useServerBusy()} label="서버와 주고받는 중" />;

const PageNav = ({ active }: { active: "home" | "alarm" | "profile" }) => {
  const navigate = useNavigate();
  return <BottomNav active={active} onNavigate={next => navigate(next === "home" ? "/" : `/${next}`)} />;
};

const TodoWorkspace = ({
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
  const [editingTitleId, setEditingTitleId] = useState<number | null>(null);
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
        setMoveError(message(reason));
      } finally {
        // 서버 값이 캐시에 들어왔으니 임시 자리는 거둡니다. 실패했다면 원래 칸으로 돌아갑니다.
        setMovedCategories(current =>
          Object.fromEntries(Object.entries(current).filter(([id]) => Number(id) !== todo.todoId)),
        );
      }
    },
    [updateTodo],
  );
  const drag = useTodoDrag({ enabled: own, onDrop: moveToCategory });
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
              <ErrorText>{message(loadError)}</ErrorText>
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
                  editingTitleId={editingTitleId}
                  onAdd={next => setAddingCategoryId(next.categoryId)}
                  onCancelAdd={() => {
                    setAddingCategoryId(null);
                    setEditingTitleId(null);
                  }}
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
                  onRenameTitle={async (todo, title) => {
                    setEditingTitleId(null);
                    await updateTodo.mutateAsync({ id: todo.todoId, body: { title } });
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
        onEditTitle={todo => {
          setDetailTodo(null);
          setEditingTitleId(todo.todoId);
        }}
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

/** 칸마다 다른 줄 수. 자리표시가 네 칸 똑같은 모양으로 늘어서지 않게 합니다. */
const SKELETON_COLUMN_ROWS = [3, 2, 4, 2];

/**
 * 아직 오지 않은 할 일 보드.
 *
 * 날짜를 옮기면 그 날의 목록을 새로 받아 오는데, 그동안 "불러오는 중"이라고 한 줄만
 * 적으면 보드가 통째로 접혔다 펴집니다. 같은 자리에 같은 모양을 놓아 두면 도착했을
 * 때 자리가 그대로라 눈이 따라갈 곳을 잃지 않습니다.
 */
const TodoBoardSkeleton = ({ columns }: { columns: number }) => (
  <CategoryBoard role="status">
    <SrOnly>할 일을 불러오는 중</SrOnly>
    {Array.from({ length: columns }, (_, index) => (
      <TodoColumnSkeleton key={index} rows={SKELETON_COLUMN_ROWS[index % SKELETON_COLUMN_ROWS.length]} />
    ))}
  </CategoryBoard>
);

export const MyHome = () => {
  const header = useHeaderModal();
  return (
    <AppShell>
      <WorkspaceHeader onCreate={header.openCreate} onJoin={header.openJoin} />
      <TodoWorkspace own groupId={null} />
      <PageNav active="home" />
      <GroupActionModals mode={header.mode} onClose={header.close} />
    </AppShell>
  );
};

/**
 * 그룹 화면.
 *
 * Figma의 group 섹션 `main / today`입니다. 맨 위 줄에서 그룹을 빠져나가거나 설정을
 * 열고, 그 아래 멤버 줄에서 누구의 할 일을 볼지 고릅니다. 나를 골랐을 때는 홈과
 * 같은 내 할 일(그룹으로 좁히지 않은 전체)을 보여주고, 다른 멤버는 그룹에 공개된
 * 할 일만 읽기 전용으로 보여줍니다.
 */
export const GroupHome = () => {
  const { groupId, userId } = useParams();
  const id = Number(groupId);
  const navigate = useNavigate();
  const { data: me } = useMe();
  const { data: group, isLoading: groupLoading } = useGroup(Number.isFinite(id) ? id : null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const members = useMemo(() => {
    const list = group?.members ?? [];
    const mine = list.find(member => member.userId === me?.userId);
    return mine ? [mine, ...list.filter(member => member.userId !== mine.userId)] : list;
  }, [group, me]);
  const activeId = userId ? Number(userId) : (me?.userId ?? null);
  const active = members.find(member => member.userId === activeId);
  const own = activeId !== null && activeId === me?.userId;
  // 시트 안의 그룹명 수정·삭제·강퇴가 모두 그룹장 전용이라, 그룹장에게만 버튼을 보입니다.
  const isLeader = me ? members.find(member => member.userId === me.userId)?.role === "LEADER" : false;
  return (
    <AppShell>
      <GroupTopBar
        name={group?.name || "그룹"}
        onBack={() => navigate("/")}
        onSettings={isLeader ? () => setSettingsOpen(true) : undefined}
      />
      <MemberTabs
        members={members}
        activeUserId={activeId}
        loading={groupLoading}
        onSelect={next => navigate(next === me?.userId ? `/groups/${id}` : `/groups/${id}/members/${next}`)}
        onShareInvite={() => setInviteOpen(true)}
      />
      {own ? (
        <TodoWorkspace own groupId={null} />
      ) : (
        <TodoWorkspace own={false} ownerId={activeId ?? undefined} ownerName={active?.name} groupId={id} />
      )}
      <PageNav active="home" />
      <GroupInfoModal
        key={`settings-${settingsOpen}-${group?.name ?? ""}`}
        open={settingsOpen}
        group={group ?? null}
        onClose={() => setSettingsOpen(false)}
      />
      <GroupInviteModal
        key={`invite-${inviteOpen}`}
        open={inviteOpen}
        group={group ?? null}
        onClose={() => setInviteOpen(false)}
      />
    </AppShell>
  );
};

export const AlarmPage = () => {
  const [filter, setFilter] = useState<NotificationType>("TODO_COMPLETED");
  /** 열어 둔 일기. 알림에 딸려 온 작성자 이름은 일기 응답에 없어 함께 들고 있습니다. */
  const [openDiary, setOpenDiary] = useState<{ diaryId: number; actor: string } | null>(null);
  /** 열어 둔 내기. 알림이 내기를 통째로 담아 오므로 따로 받아 올 것이 없습니다. */
  const [openBet, setOpenBet] = useState<{ bet: Bet; actor: string } | null>(null);
  const label = ALARM_FILTERS.find(item => item.key === filter)?.label ?? "";
  const { data, isLoading, error, hasNextPage, isFetchingNextPage, fetchNextPage } = useNotifications(filter);
  /*
   * 갈래마다 안 읽은 알림이 남아 있는지.
   *
   * 목록은 고른 갈래만 받아 오므로, 다른 갈래에 새 알림이 왔는지는 목록으로 알 수
   * 없습니다. 읽음으로 넘길 때 거는 무효화가 이 표시도 같이 다시 받아 옵니다.
   */
  const { data: unread } = useNotificationUnreadStatus();
  const markRead = useMarkNotificationRead();
  const items = useMemo(() => data?.pages.flatMap(page => page.items) ?? [], [data]);
  return (
    <AppShell>
      <AlarmColumn>
        <PageTitle>알림</PageTitle>
        <AlarmFilters role="tablist">
          {ALARM_FILTERS.map(item => (
            <AlarmFilter
              key={item.key}
              type="button"
              role="tab"
              aria-selected={filter === item.key}
              selected={filter === item.key}
              onClick={() => setFilter(item.key)}
            >
              {item.label}
              {/* 안 읽은 것이 남아 있는 갈래에만. 점은 모양일 뿐이라 읽어 줄 말은 따로 답니다. */}
              {unread?.[item.key] ? (
                <>
                  <UnreadDot aria-hidden />
                  <SrOnly>안 읽은 알림 있음</SrOnly>
                </>
              ) : null}
            </AlarmFilter>
          ))}
        </AlarmFilters>
        {error ? (
          <ErrorText>{message(error)}</ErrorText>
        ) : isLoading ? (
          <AlarmListSkeleton />
        ) : items.length ? (
          <AlarmList>
            {items.map(item => (
              <AlarmRow
                key={item.notificationId}
                type="button"
                unread={item.readAt === null}
                onClick={() => {
                  // 누르면 읽음으로 넘깁니다. 서버가 목록을 다시 주면 표시가 사라집니다.
                  if (item.readAt === null) markRead.mutate(item.notificationId);
                  // 일기 알림은 그 자리에서 바로 펴 봅니다.
                  if (item.type === "DIARY_CREATED" && item.diaryId !== null) {
                    setOpenDiary({ diaryId: item.diaryId, actor: item.actor.name || "친구" });
                  }
                  // 내기 알림은 수락/거절을 그 자리에서 정합니다.
                  if (item.type === "BET_REQUESTED" && item.bet) {
                    setOpenBet({ bet: item.bet, actor: item.actor.name || "친구" });
                  }
                }}
              >
                <ActorAvatar url={item.actor.profileImageUrl} />
                <div>
                  <strong>{alarmSentence(item)}</strong>
                  {/* 내기는 무엇을 걸었는지가 먼저입니다. 나머지는 할 일의 세부사항을 둡니다. */}
                  {item.bet ? (
                    <small>{item.bet.content}</small>
                  ) : item.todo?.description ? (
                    <small>{item.todo.description}</small>
                  ) : null}
                </div>
                {item.readAt === null ? <AlarmDot aria-label="읽지 않음" /> : null}
              </AlarmRow>
            ))}
          </AlarmList>
        ) : (
          <AlarmEmpty>아직 도착한 {label} 알림이 없습니다.</AlarmEmpty>
        )}
        {hasNextPage ? (
          <Button type="button" disabled={isFetchingNextPage} onClick={() => void fetchNextPage()}>
            {isFetchingNextPage ? "불러오는 중..." : "더 보기"}
          </Button>
        ) : null}
      </AlarmColumn>
      {openDiary ? (
        <DiaryViewModal diaryId={openDiary.diaryId} author={openDiary.actor} onClose={() => setOpenDiary(null)} />
      ) : null}
      <BetReceivedModal
        key={openBet?.bet.betId ?? 0}
        bet={openBet?.bet ?? null}
        requesterName={openBet?.actor ?? "친구"}
        open={openBet !== null}
        onClose={() => setOpenBet(null)}
      />
      <PageNav active="alarm" />
    </AppShell>
  );
};

const AlarmColumn = styled.div`
  display: grid;
  gap: 32px;
  width: min(485px, 100%);
  justify-items: start;
`;
/** 홈의 `HeaderRow`, 그룹의 `MemberBar`와 같은 자리에서 같은 방식으로 화면 위에 붙습니다. */
const AlarmFilters = styled.div`
  position: sticky;
  top: 0;
  z-index: 40;
  background: ${palette.white};
  /*
   * 붙었을 때 화면 끝에 닿지 않도록 12px을 두되, 제목과의 간격은 원래 20px
   * 그대로 보이게 합니다. 칸 사이 32px에서 24px을 당기면 8px이 남고, 여기에
   * 안쪽 여백 12px이 더해져 20px이 됩니다.
   */
  padding-top: 12px;
  margin-top: -24px;
  /* 목록보다 좁으면 옆으로 내용이 비쳐 보입니다. */
  width: 100%;
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
`;
const AlarmFilter = styled.button<{ selected: boolean }>`
  /* 점이 붙어도 글자가 가운데를 지키도록 한 줄로 늘어놓습니다. */
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 0;
  border-radius: ${theme.radius.pill};
  padding: 6px 20px;
  font-size: ${theme.text.h3};
  background: ${({ selected }) => (selected ? palette.black : palette.gray200)};
  color: ${({ selected }) => (selected ? palette.white : theme.colors.ink)};
`;

export const ProfilePage = () => {
  const { data: me } = useMe();
  const update = useUpdateProfile();
  const updateFont = useUpdateFont();
  const api = useApi();
  const refreshToken = useSessionStore(s => s.refreshToken);
  const clear = useSessionStore(s => s.clearSession);
  const cache = useQueryClient();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  // 서버가 아직 폰트를 내려주지 않는 동안에는 이 기기에 남은 선택을 기준으로 삼습니다.
  const font = resolveFont(me?.font ?? readStoredFont()).key;
  const guard = async (run: () => Promise<unknown>) => {
    setError("");
    try {
      await run();
    } catch (reason) {
      setError(message(reason));
      throw reason;
    }
  };
  const save = (body: { name?: string; bio?: string }) => guard(() => update.mutateAsync(body));
  const profileImage = useAssetObjectUrl(me?.profileImageUrl);
  const uploadProfileImage = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("이미지 파일만 올릴 수 있습니다.");
      return Promise.resolve();
    }
    if (file.size > MAX_PROFILE_IMAGE_BYTES) {
      setError("이미지는 5MB까지 올릴 수 있습니다.");
      return Promise.resolve();
    }
    const body = new FormData();
    body.append("image", file);
    return guard(() => update.mutateAsync(body));
  };
  return (
    <AppShell>
      <ProfileTitle>나의 프로필</ProfileTitle>
      <ProfileColumns>
        <ProfilePanel>
          <FieldBlock>
            <FieldLabel>프로필 사진</FieldLabel>
            <PhotoRow>
              {profileImage ? <img src={profileImage} alt="프로필" /> : <span aria-hidden>🌱</span>}
              <ProfileImageAction onPick={uploadProfileImage} />
            </PhotoRow>
          </FieldBlock>
          <EditableProfileRow
            label="이름"
            value={me?.name ?? ""}
            placeholder="이름을 작성하세요"
            limit={NAME_LIMIT}
            onSave={name => save({ name })}
          />
          <EditableProfileRow
            label="자기소개"
            value={me?.bio ?? ""}
            placeholder="자기소개를 작성하세요"
            limit={BIO_LIMIT}
            onSave={bio => save({ bio })}
          />
          <FontProfileRow value={font} onSave={next => guard(() => updateFont.mutateAsync({ font: next }))} />
          {error ? <ErrorText>{error}</ErrorText> : null}
          <LogoutButton
            onClick={async () => {
              try {
                if (refreshToken) await api.auth.logout({ refreshToken });
              } catch {
                /* 로컬 세션은 항상 종료합니다. */
              } finally {
                clear();
                // 다음 사용자가 이전 계정의 캐시를 잠깐이라도 보지 않게 비웁니다.
                cache.clear();
                navigate("/");
              }
            }}
          >
            로그아웃
          </LogoutButton>
        </ProfilePanel>
        <CategoryColorSection onError={setError} />
      </ProfileColumns>
      <PageNav active="profile" />
    </AppShell>
  );
};

/** 일기 이미지도 프로필 사진과 같은 5MB 기준으로 막습니다. */
const MAX_DIARY_IMAGE_BYTES = 5 * 1024 * 1024;
const EMOTIONS = ["😊", "🥳", "😌", "😢", "😤"];

const DiaryForm = ({
  selectedDate,
  existing,
  userName,
}: {
  selectedDate: string;
  existing?: Diary;
  userName?: string;
}) => {
  const navigate = useNavigate();
  const save = useSaveDiary();
  const remove = useDeleteDiary();
  const [confirming, setConfirming] = useState(false);
  const dismissConfirm = useCallback(() => setConfirming(false), []);
  const [emotion, setEmotion] = useState(existing?.emotion ?? "");
  const [emotionOpen, setEmotionOpen] = useState(false);
  const [content, setContent] = useState(existing?.content ?? "");
  // 서버에서 GROUP(일부 공개)은 보류라 작성자만 보게 됩니다. 화면은 공개/비밀 두 갈래만 씁니다.
  const [visibility, setVisibility] = useState<UiVisibility>(existing?.visibility === "PUBLIC" ? "PUBLIC" : "PRIVATE");
  const [image, setImage] = useState<File | null>(null);
  const imageInput = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  /*
   * 고른 사진은 브라우저 안에서 바로 보여 줍니다. 올리기 전이라 주소가 없어
   * 파일에서 임시 주소를 만들고, 다른 사진을 고르거나 화면을 떠날 때 거둡니다.
   */
  const picked = useMemo(() => (image ? URL.createObjectURL(image) : null), [image]);
  useEffect(
    () => () => {
      if (picked) URL.revokeObjectURL(picked);
    },
    [picked],
  );
  // 이미 올린 사진은 `/uploads`라 토큰을 달아 받아 옵니다.
  const saved = useAssetObjectUrl(existing?.imageUrl ?? null);
  const preview = picked ?? saved;
  const submit = async () => {
    setError("");
    try {
      let body: DiaryCreateRequest | DiaryPatchRequest | FormData;
      // 사진을 새로 고른 때만 multipart입니다 — 새로 쓸 때도, 고쳐 쓸 때도 같습니다.
      if (image) {
        body = new FormData();
        body.append("date", selectedDate);
        body.append("content", content);
        body.append("visibility", visibility);
        if (emotion) body.append("emotion", emotion);
        body.append("image", image);
      } else {
        body = { date: selectedDate, content, emotion: emotion || null, visibility };
      }
      await save.mutateAsync({ id: existing?.diaryId, body });
      navigate("/");
    } catch (reason) {
      setError(message(reason));
    }
  };
  const discard = async () => {
    if (!existing) return;
    setError("");
    try {
      await remove.mutateAsync(existing.diaryId);
      navigate("/");
    } catch (reason) {
      setError(message(reason));
    } finally {
      setConfirming(false);
    }
  };
  return (
    <AppShell>
      <DiaryTopBar>
        <DiaryTextAction onClick={() => navigate("/")}>취소</DiaryTextAction>
        <h1>일기</h1>
        <DiaryTextAction disabled={!content.trim() || save.isPending} onClick={submit}>
          {save.isPending ? "저장 중" : "완료"}
        </DiaryTextAction>
      </DiaryTopBar>
      <DiaryBody>
        <DiaryMain>
          <DiaryDate>{formatLongKoreanDate(selectedDate)}</DiaryDate>
          <textarea
            value={content}
            maxLength={1000}
            onChange={event => setContent(event.target.value)}
            placeholder={`${userName || "오늘"}님의 오늘은 어떤 하루였나요? 오늘 하루를 기록해보세요`}
          />
        </DiaryMain>
        <DiaryRail>
          <div>
            <DiaryRailLabel>
              그룹 안 공개 범위 설정하기 <b aria-hidden>*</b>
            </DiaryRailLabel>
            <DiaryPillRow>
              <Button variant={visibility === "PUBLIC" ? "primary" : "soft"} onClick={() => setVisibility("PUBLIC")}>
                전체 공개
              </Button>
              {/* 일부 공개는 MVP 범위 밖입니다. 자리만 두고 막아 둡니다. */}
              <Button disabled title="일부 공개는 MVP 이후 제공됩니다.">
                일부 공개
              </Button>
              <Button variant={visibility === "PRIVATE" ? "primary" : "soft"} onClick={() => setVisibility("PRIVATE")}>
                비밀
              </Button>
            </DiaryPillRow>
          </div>
          <DiaryRailRow>
            <div>
              <DiaryRailLabel as="span">오늘의 감정 선택하기</DiaryRailLabel>
              <DiaryIconAction
                aria-label="오늘의 감정 선택하기"
                aria-expanded={emotionOpen}
                onClick={() => setEmotionOpen(!emotionOpen)}
              >
                {emotion ? <span>{emotion}</span> : <img src={icons.emojiAdd} alt="" aria-hidden />}
              </DiaryIconAction>
              {emotionOpen ? (
                <EmotionRow role="group" aria-label="감정">
                  {["", ...EMOTIONS].map(item => (
                    <button
                      type="button"
                      key={item || "none"}
                      data-selected={emotion === item}
                      onClick={() => {
                        setEmotion(item);
                        setEmotionOpen(false);
                      }}
                    >
                      {item || "없음"}
                    </button>
                  ))}
                </EmotionRow>
              ) : null}
            </div>
            <div>
              <DiaryRailLabel as="span">{preview ? "이미지 바꾸기" : "이미지 첨부하기"}</DiaryRailLabel>
              {/* 사진이 붙어 있으면 그 사진이 곧 버튼입니다. 눌러 다른 사진으로 바꿉니다. */}
              {preview ? (
                <DiaryPhotoButton aria-label="이미지 바꾸기" onClick={() => imageInput.current?.click()}>
                  <DiaryPhoto src={preview} alt="" />
                </DiaryPhotoButton>
              ) : (
                <DiaryIconAction aria-label="이미지 첨부하기" onClick={() => imageInput.current?.click()}>
                  <img src={icons.imageBox} alt="" aria-hidden />
                </DiaryIconAction>
              )}
              <HiddenFileInput
                ref={imageInput}
                type="file"
                accept="image/*"
                onChange={event => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (!file) return;
                  if (!file.type.startsWith("image/")) {
                    setError("이미지 파일만 올릴 수 있습니다.");
                    return;
                  }
                  if (file.size > MAX_DIARY_IMAGE_BYTES) {
                    setError("이미지는 5MB까지 올릴 수 있습니다.");
                    return;
                  }
                  setError("");
                  setImage(file);
                }}
              />
              {image ? <DiaryAttachment>{image.name}</DiaryAttachment> : null}
            </div>
          </DiaryRailRow>
          {existing ? (
            <ConfirmMenu
              open={confirming}
              label="일기 삭제"
              above
              onDismiss={dismissConfirm}
              trigger={
                <Button variant="danger" disabled={remove.isPending} onClick={() => setConfirming(!confirming)}>
                  {remove.isPending ? "삭제 중..." : "일기 삭제하기"}
                </Button>
              }
            >
              <ConfirmNote>이 날의 일기가 사라집니다. 되돌릴 수 없습니다.</ConfirmNote>
              <ConfirmChoice tone="danger" disabled={remove.isPending} onClick={discard}>
                일기 삭제
              </ConfirmChoice>
              <ConfirmChoice onClick={dismissConfirm}>취소</ConfirmChoice>
            </ConfirmMenu>
          ) : null}
          {error ? <ErrorText>{error}</ErrorText> : null}
        </DiaryRail>
      </DiaryBody>
      <PageNav active="home" />
    </AppShell>
  );
};

/**
 * 아직 오지 않은 일기 화면.
 *
 * 그 날의 일기를 받아 오기 전에 폼을 열면, 이미 쓴 일기가 있어도 빈 칸으로 한 번
 * 그렸다가 도착한 뒤 키가 바뀌며 통째로 다시 그립니다 — 쓰던 글이 잠깐 사라졌다
 * 나타난 것처럼 보입니다. 도착할 때까지는 같은 모양의 자리만 둡니다.
 */
const DiaryFormSkeleton = ({ selectedDate }: { selectedDate: string }) => (
  <AppShell>
    <DiaryTopBar>
      <DiaryTextAction disabled>취소</DiaryTextAction>
      <h1>일기</h1>
      <DiaryTextAction disabled>완료</DiaryTextAction>
    </DiaryTopBar>
    <DiaryBody role="status">
      <SrOnly>일기를 불러오는 중</SrOnly>
      <DiaryMain>
        <DiaryDate>{formatLongKoreanDate(selectedDate)}</DiaryDate>
        <Skeleton height="400px" radius={theme.radius.md} />
      </DiaryMain>
      <DiaryRail>
        <Skeleton height="44px" radius={theme.radius.pill} />
        <Skeleton height="96px" radius={theme.radius.md} />
      </DiaryRail>
    </DiaryBody>
    <PageNav active="home" />
  </AppShell>
);

export const DiaryPage = () => {
  const [search] = useSearchParams();
  const selectedDate = search.get("date") || formatLocalDate(new Date());
  const { data: me } = useMe();
  const { data: diaries = [], isLoading } = useDiaries({ date: selectedDate });
  const existing = diaries.find(diary => isDiaryForDate(diary, selectedDate));
  if (isLoading) return <DiaryFormSkeleton selectedDate={selectedDate} />;
  return (
    <DiaryForm
      key={`${selectedDate}-${existing?.diaryId ?? "new"}`}
      selectedDate={selectedDate}
      existing={existing}
      userName={me?.name}
    />
  );
};

export const NotFoundPage = () => {
  const navigate = useNavigate();
  return (
    <AppShell>
      <EmptyState>
        <h1>페이지를 찾을 수 없어요.</h1>
        <Button onClick={() => navigate("/")}>홈으로</Button>
      </EmptyState>
    </AppShell>
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
const TodoArea = styled.section`
  min-width: 0;
`;
const CategoryBoard = styled.div`
  display: grid;
  gap: 32px;
  @media (max-width: 600px) {
    gap: 28px;
  }
`;
const ProfileTitle = styled.h1`
  margin: 0 0 40px;
  font-size: ${theme.text.h1};
`;
const ProfileColumns = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 560px) minmax(0, 410px);
  gap: 12px;
  align-items: start;
  @media (max-width: 900px) {
    grid-template-columns: 1fr;
    gap: 40px;
  }
`;
const ProfilePanel = styled.div`
  display: grid;
  justify-items: start;
  gap: 20px;
  max-width: 560px;
`;
const LogoutButton = styled.button`
  margin-top: 28px;
  border: 0;
  background: transparent;
  color: ${theme.colors.red};
  font-weight: 800;
  padding: 10px 0;
`;
const DiaryTopBar = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 40px;
  h1 {
    margin: 0;
    font-size: ${theme.text.h1};
  }
`;
const DiaryTextAction = styled.button`
  border: 0;
  background: transparent;
  padding: 0;
  font-size: ${theme.text.h2};
  color: ${theme.colors.ink};
  &:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }
`;
const DiaryBody = styled.div`
  display: grid;
  /* 오른쪽 열은 디자인 폭(313px)을 확보하고, 좁아지면 본문이 먼저 줄어듭니다. */
  grid-template-columns: minmax(0, 800px) minmax(313px, 1fr);
  align-items: start;
  @media (max-width: 900px) {
    grid-template-columns: 1fr;
    gap: 24px;
  }
`;
const DiaryDate = styled.p`
  margin: 0;
  font-size: ${theme.text.h2};
  color: ${theme.colors.ink};
`;
const DiaryMain = styled.div`
  display: grid;
  gap: 10px;
  padding: 24px 20px;
  textarea {
    min-height: 400px;
    border: 0;
    background: transparent;
    padding: 0;
    resize: vertical;
    font-size: ${theme.text.h3};
    color: ${theme.colors.ink};
    &::placeholder {
      color: ${theme.colors.muted};
    }
  }
  @media (max-width: 600px) {
    padding: 0;
    textarea {
      min-height: 240px;
    }
  }
`;
const DiaryRail = styled.aside`
  display: grid;
  gap: 40px;
  align-content: start;
  padding: 24px 20px;
  @media (max-width: 600px) {
    gap: 28px;
    padding: 0;
  }
`;
const DiaryRailLabel = styled.p`
  margin: 0 0 12px;
  font-size: ${theme.text.h3};
  color: ${theme.colors.ink};
  white-space: nowrap;
  b {
    color: ${theme.colors.red};
  }
`;
const DiaryPillRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;
const DiaryRailRow = styled.div`
  display: flex;
  gap: 40px;
  flex-wrap: wrap;
  > div {
    display: grid;
    justify-items: center;
    gap: 8px;
  }
`;
const DiaryIconAction = styled.button`
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border: 0;
  padding: 0;
  background: transparent;
  font-size: 28px;
  line-height: 1;
  img {
    width: 40px;
    height: 40px;
  }
  &:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }
`;
/** 사진 자체가 버튼입니다. 눌러 다른 사진을 고릅니다. */
const DiaryPhotoButton = styled.button`
  display: block;
  border: 0;
  padding: 0;
  background: transparent;
  line-height: 0;
  border-radius: ${theme.radius.md};
  &:hover img {
    opacity: 0.85;
  }
`;
const DiaryAttachment = styled.small`
  max-width: 160px;
  color: ${theme.colors.muted};
  font-size: ${theme.text.xs};
  overflow-wrap: anywhere;
`;
const EmotionRow = styled.div`
  display: flex;
  gap: 9px;
  flex-wrap: wrap;
  button {
    border: 1px solid ${theme.colors.line};
    border-radius: 12px;
    background: white;
    padding: 10px 14px;
    font-size: 20px;
  }
  button[data-selected="true"] {
    background: #effad9;
    border-color: #d4ed9d;
  }
  @media (max-width: 600px) {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    button {
      min-height: 46px;
      padding: 8px;
    }
  }
`;
