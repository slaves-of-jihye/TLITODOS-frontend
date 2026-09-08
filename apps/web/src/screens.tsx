import styled from "@emotion/styled";
import { useQueryClient } from "@tanstack/react-query";
import {
  CATEGORY_SWATCHES,
  buildDailyStatuses,
  categoryAccent,
  composeDiaryContent,
  composeTodoContent,
  FONT_PRESETS,
  fontFamilyStack,
  formatLocalDate,
  diaryDate,
  formatLongKoreanDate,
  isDiaryForDate,
  monthKey,
  resolveFont,
  sortCategories,
  sortTodos,
  splitDiaryContent,
  splitTodoContent,
  todosForDate,
  withOptionalTime,
  type FontKey,
} from "@tlitodos/core";
import {
  useApi,
  useCategories,
  useCreateTodo,
  useDailyTodoStatuses,
  useDiaries,
  useGroup,
  useMe,
  useSaveDiary,
  useTodos,
  useUpdateCategory,
  useUpdateFont,
  useUpdateProfile,
  useUpdateTodo,
} from "@tlitodos/hooks";
import type { Category, Diary, DiaryCreateRequest, DiaryPatchRequest, Todo, UiVisibility } from "@tlitodos/types";
import {
  AppShell,
  BottomNav,
  Button,
  CategoryPill,
  DiaryBadge,
  ErrorText,
  Glyph,
  icons,
  Modal,
  palette,
  theme,
} from "@tlitodos/ui";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { resolveAssetUrl } from "./app/assetUrl";
import { applyFont, readStoredFont } from "./app/fontPreference";
import { useSessionStore } from "./app/sessionStore";
import { useTodoCompletion } from "./app/useTodoCompletion";
import {
  CalendarPanel,
  CategoryManageModal,
  CategorySection,
  DependencyBlockModal,
  GroupActionModals,
  GroupInfoModal,
  GroupTopBar,
  MemberTabs,
  InstallAppAction,
  TodoDetailModal,
  WorkspaceHeader,
} from "./components";

const message = (error: unknown) => (error instanceof Error ? error.message : "요청에 실패했습니다.");

const useHeaderModal = () => {
  const [mode, setMode] = useState<"create" | "join" | null>(null);
  return { mode, openCreate: () => setMode("create"), openJoin: () => setMode("join"), close: () => setMode(null) };
};

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
  // 내 달력에만 서버 요약을 씁니다. daily-status는 로그인한 사용자만 세기 때문입니다.
  const { data: serverStatuses = [] } = useDailyTodoStatuses(own ? monthKey(month) : null);
  const { data: diaries = [] } = useDiaries();
  const [blocked, setBlocked] = useState<Todo[]>([]);
  const { overrides: completionOverrides, toggle } = useTodoCompletion({
    serverTodos: ownerTodos,
    onBlocked: setBlocked,
    onRevert: refetch,
  });
  const [addingCategoryId, setAddingCategoryId] = useState<number | null>(null);
  const [editingTitleId, setEditingTitleId] = useState<number | null>(null);
  const [detailTodo, setDetailTodo] = useState<Todo | null>(null);
  const createTodo = useCreateTodo();
  const updateTodo = useUpdateTodo();
  const [manage, setManage] = useState<Category | null>(null);
  const [diaryPreview, setDiaryPreview] = useState<Diary | null>(null);
  const todos = useMemo(
    () =>
      ownerTodos.map(todo =>
        completionOverrides[todo.todoId] === undefined
          ? todo
          : { ...todo, isCompleted: completionOverrides[todo.todoId]! },
      ),
    [ownerTodos, completionOverrides],
  );
  const selectedTodos = useMemo(() => todosForDate(todos, selectedDate), [todos, selectedDate]);
  /**
   * 달력에 찍을 날짜별 요약입니다.
   *
   * 내 달력은 서버의 달별 요약을 씁니다. 남의 달력은 그 요약에 `userId`가 없어
   * 받아올 수 없으므로, 고른 날짜만 표시됩니다.
   *
   * 고른 날짜는 어느 쪽이든 손안의 목록으로 덮습니다. 체크를 눌렀을 때 낙관적
   * 표시가 달력에도 바로 반영되어야 하기 때문입니다.
   */
  const dailyStatuses = useMemo(() => {
    const base = own ? serverStatuses : [];
    const local = buildDailyStatuses(selectedTodos).find(status => status.date === selectedDate);
    return local ? [...base.filter(status => status.date !== selectedDate), local] : base;
  }, [own, serverStatuses, selectedTodos, selectedDate]);
  const selectedDiary = diaries.find(
    diary => diary.userId === (ownerId ?? diary.userId) && isDiaryForDate(diary, selectedDate),
  );
  const loadError = categoriesQuery.error ?? todosQuery.error;
  const isLoading = categoriesQuery.isLoading || todosQuery.isLoading;
  const handleToggle = (todo: Todo) => {
    if (!own) return;
    toggle(todo.todoId);
  };
  // 친구 화면에서는 멤버 목록에 사진이 없어, 내 화면에서만 프로필 사진을 씁니다.
  const ownerImage = own ? resolveAssetUrl(me?.profileImageUrl) : null;
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
            <EmptyState>할 일을 불러오는 중...</EmptyState>
          ) : !categories.length ? (
            <EmptyState>카테고리를 준비하고 있어요.</EmptyState>
          ) : (
            <CategoryBoard>
              {categories.map((category, index) => (
                <CategorySection
                  key={category.categoryId}
                  category={category}
                  index={index}
                  todos={sortTodos(selectedTodos.filter(todo => todo.categoryId === category.categoryId))}
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
                    await createTodo.mutateAsync({
                      title,
                      categoryId: next.categoryId,
                      importance: "NONE",
                      hardship: 1,
                      dueDate: withOptionalTime(selectedDate, "23:59"),
                      visibility: "PRIVATE",
                      groupId: null,
                    });
                  }}
                  onRenameTitle={async (todo, title) => {
                    setEditingTitleId(null);
                    const { detail } = splitTodoContent(todo.title);
                    await updateTodo.mutateAsync({
                      id: todo.todoId,
                      body: { title: composeTodoContent(title, detail) },
                    });
                  }}
                  onManage={setManage}
                  onToggle={handleToggle}
                  onEdit={setDetailTodo}
                />
              ))}
            </CategoryBoard>
          )}
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
      {/* Figma group 섹션의 `modal / diary`입니다. 닫기 버튼이 없어 뒤 배경을 눌러 닫습니다. */}
      <Modal open={diaryPreview !== null} sheet onClose={() => setDiaryPreview(null)} aria-label="친구의 일기">
        <DiaryPreview>
          <DiaryPreviewTitle>{ownerName || "친구"}님의 일기</DiaryPreviewTitle>
          <DiaryBadge
            emotion={diaryPreview?.emotion}
            nickname={ownerName || "친구"}
            date={formatLongKoreanDate(diaryPreview ? (diaryDate(diaryPreview) ?? "") : "")}
          />
          <p>{diaryPreview ? splitDiaryContent(diaryPreview.content).content : ""}</p>
        </DiaryPreview>
      </Modal>
      {/* BetModal is intentionally kept out of the active MVP build. */}
    </>
  );
};

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
  const { data: group } = useGroup(Number.isFinite(id) ? id : null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const members = useMemo(() => {
    const list = group?.members ?? [];
    const mine = list.find(member => member.userId === me?.userId);
    return mine ? [mine, ...list.filter(member => member.userId !== mine.userId)] : list;
  }, [group, me]);
  const activeId = userId ? Number(userId) : (me?.userId ?? null);
  const active = members.find(member => member.userId === activeId);
  const own = activeId !== null && activeId === me?.userId;
  return (
    <AppShell>
      <GroupTopBar name={group?.name || "그룹"} onBack={() => navigate("/")} onSettings={() => setSettingsOpen(true)} />
      <MemberTabs
        members={members}
        activeUserId={activeId}
        onSelect={next => navigate(next === me?.userId ? `/groups/${id}` : `/groups/${id}/members/${next}`)}
      />
      {own ? (
        <TodoWorkspace own groupId={null} />
      ) : (
        <TodoWorkspace own={false} ownerId={activeId ?? undefined} ownerName={active?.name} groupId={id} />
      )}
      <PageNav active="home" />
      <GroupInfoModal open={settingsOpen} group={group ?? null} onClose={() => setSettingsOpen(false)} />
    </AppShell>
  );
};

/**
 * 알림 화면.
 *
 * Figma는 친구의 할 일 완료 / 친구의 일기 / 친구의 내기 요청 세 갈래를 pill로
 * 고르고 그 아래에 알림을 쌓아 보여줍니다. 서버에 알림 목록 엔드포인트가 없어
 * (`GET /api/v1/diaries`는 내 일기만, 친구 할 일은 그룹 안 오늘 목록만 줍니다)
 * 지금은 고르는 줄까지만 두고 목록은 비워 둡니다. 내기는 MVP 밖이라 갈래에서
 * 빼 두었습니다.
 */
const ALARM_FILTERS = [
  { key: "todo", label: "친구의 할 일 완료" },
  { key: "diary", label: "친구의 일기" },
  // { key: "bet", label: "친구의 내기 요청" },
] as const;
export const AlarmPage = () => {
  const [filter, setFilter] = useState<(typeof ALARM_FILTERS)[number]["key"]>("todo");
  const label = ALARM_FILTERS.find(item => item.key === filter)?.label ?? "";
  return (
    <AppShell>
      <AlarmColumn>
        <AlarmHead>
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
              </AlarmFilter>
            ))}
          </AlarmFilters>
        </AlarmHead>
        <AlarmEmpty>아직 도착한 {label} 알림이 없습니다.</AlarmEmpty>
      </AlarmColumn>
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
const AlarmHead = styled.div`
  display: grid;
  gap: 20px;
  justify-items: start;
  width: 100%;
`;
const AlarmFilters = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
`;
const AlarmFilter = styled.button<{ selected: boolean }>`
  border: 0;
  border-radius: ${theme.radius.pill};
  padding: 6px 20px;
  font-size: ${theme.text.h3};
  background: ${({ selected }) => (selected ? palette.black : palette.gray200)};
  color: ${({ selected }) => (selected ? palette.white : theme.colors.ink)};
`;
const AlarmEmpty = styled.p`
  margin: 0;
  color: ${theme.colors.muted};
`;

/** 자기소개 글자 수. 디자인의 카운터가 0/30입니다. */
const BIO_LIMIT = 30;
const NAME_LIMIT = 20;

/**
 * 라벨 + 회색 입력칸 한 줄.
 *
 * 보기 상태에서는 칸 전체가 편집 진입 버튼이고, 편집 상태에서는 칸 안에서
 * 입력하고 오른쪽 취소/확인으로 끝냅니다. Enter로는 저장하지 않습니다.
 */
const EditableProfileRow = ({
  label,
  value,
  placeholder,
  limit,
  onSave,
}: {
  label: string;
  value: string;
  placeholder: string;
  limit: number;
  onSave: (next: string) => Promise<void>;
}) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [busy, setBusy] = useState(false);
  const finish = async () => {
    setBusy(true);
    try {
      await onSave(draft.trim());
      setEditing(false);
    } catch {
      /* 오류 문구는 프로필 화면에서 표시합니다. */
    } finally {
      setBusy(false);
    }
  };
  return (
    <FieldBlock>
      <FieldLabel>{label}</FieldLabel>
      {editing ? (
        <FieldRow>
          <FieldBox as="div">
            <input
              autoFocus
              value={draft}
              maxLength={limit}
              placeholder={placeholder}
              onKeyDown={event => {
                if (event.key === "Enter") event.preventDefault();
              }}
              onChange={event => setDraft(event.target.value)}
            />
            <FieldCounter>
              {draft.length}/{limit}
            </FieldCounter>
          </FieldBox>
          <FieldActions>
            <Button
              onClick={() => {
                setDraft(value);
                setEditing(false);
              }}
            >
              취소
            </Button>
            <Button variant="primary" disabled={busy} onClick={finish}>
              확인
            </Button>
          </FieldActions>
        </FieldRow>
      ) : (
        <FieldBox
          onClick={() => {
            setDraft(value);
            setEditing(true);
          }}
        >
          <span data-empty={!value}>{value || placeholder}</span>
          <FieldChevron src={icons.arrowUp} alt="" aria-hidden />
        </FieldBox>
      )}
    </FieldBlock>
  );
};

/** 서버가 5MB를 넘기면 거절하므로, 올리기 전에 같은 기준으로 막습니다. */
const MAX_PROFILE_IMAGE_BYTES = 5 * 1024 * 1024;

/**
 * 프로필 사진 교체.
 *
 * 파일 선택창은 숨긴 `input`으로 열고, 고른 파일을 바로 올립니다. 사진은 되돌릴
 * 초안이 없어 이름·자기소개와 달리 완료 버튼 없이 곧장 저장합니다.
 */
const ProfileImageAction = ({ onPick }: { onPick: (file: File) => Promise<void> }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  return (
    <>
      <Button disabled={busy} onClick={() => inputRef.current?.click()}>
        {busy ? "올리는 중..." : "프로필 사진 수정하기"}
      </Button>
      <HiddenFileInput
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={async event => {
          const file = event.target.files?.[0];
          // 같은 파일을 다시 골라도 change가 오도록 값을 비웁니다.
          event.target.value = "";
          if (!file) return;
          setBusy(true);
          try {
            await onPick(file);
          } catch {
            /* 오류 문구는 프로필 화면에서 표시합니다. */
          } finally {
            setBusy(false);
          }
        }}
      />
    </>
  );
};

/**
 * 폰트 목록.
 *
 * 네이티브 `select`를 쓰지 않는 이유는 macOS와 iOS가 드롭다운을 OS로 그려
 * `option`의 `font-family`를 무시하기 때문입니다. 폰트를 고르는 자리에서 폰트를
 * 보여주려면 목록을 직접 그려야 합니다.
 *
 * 목록을 여는 순간 여섯 벌을 모두 내려받습니다(배포 환경 brotli 기준 약 3.5MB).
 * 선택이 아니라 열람에 드는 비용이라, 편집에 들어갈 때가 아니라 목록을 펼칠 때
 * 발생하도록 두었습니다.
 */
const LIST_MAX_HEIGHT = 264;
const LIST_GAP = 6;
const LIST_EDGE_MARGIN = 12;

const FontSelect = ({ value, onChange }: { value: FontKey; onChange: (next: FontKey) => void }) => {
  const [open, setOpen] = useState(false);
  // 키보드 이동 중인 항목. 선택과 달리 미리보기를 바꾸지 않습니다.
  const [active, setActive] = useState<FontKey>(value);
  // 남는 쪽으로 펼치고, 그래도 모자라면 그 높이에 맞춥니다.
  const [placement, setPlacement] = useState({ drop: "down" as "down" | "up", maxHeight: LIST_MAX_HEIGHT });
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const close = (focusTrigger = true) => {
    setOpen(false);
    if (focusTrigger) triggerRef.current?.focus();
  };
  const choose = (next: FontKey) => {
    onChange(next);
    setActive(next);
    close();
  };
  const show = () => {
    setActive(value);
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      // 목록과 트리거 사이 간격, 화면 가장자리 여백을 뺀 실제로 쓸 수 있는 높이입니다.
      const room = (edge: number) => edge - LIST_GAP - LIST_EDGE_MARGIN;
      const below = room(window.innerHeight - rect.bottom);
      const above = room(rect.top);
      const drop = below < LIST_MAX_HEIGHT && above > below ? "up" : "down";
      setPlacement({ drop, maxHeight: Math.min(LIST_MAX_HEIGHT, Math.max(120, drop === "up" ? above : below)) });
    }
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    listRef.current?.focus();
    listRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: "nearest" });
  }, [open]);
  // 바깥을 누르면 닫습니다. 포커스는 누른 곳에 두는 편이 자연스러워 되돌리지 않습니다.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const move = (step: number) => {
    const index = FONT_PRESETS.findIndex(preset => preset.key === active);
    const next = FONT_PRESETS[Math.min(FONT_PRESETS.length - 1, Math.max(0, index + step))];
    if (next) setActive(next.key);
  };
  // 키보드로 이동한 항목이 목록 밖으로 나가지 않게 합니다.
  useEffect(() => {
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: "nearest" });
  }, [active]);
  const onKeyDown = (event: ReactKeyboardEvent) => {
    const keys: Record<string, () => void> = {
      ArrowDown: () => move(1),
      ArrowUp: () => move(-1),
      Home: () => setActive(FONT_PRESETS[0].key),
      End: () => setActive(FONT_PRESETS[FONT_PRESETS.length - 1].key),
      Enter: () => choose(active),
      " ": () => choose(active),
      Escape: () => close(),
      Tab: () => close(false),
    };
    const handler = keys[event.key];
    if (!handler) return;
    if (event.key !== "Tab") event.preventDefault();
    handler();
  };

  return (
    <FontSelectRoot ref={rootRef}>
      <FontSelectTrigger
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        style={{ fontFamily: fontFamilyStack(value) }}
        onClick={() => (open ? close() : show())}
        onKeyDown={event => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            show();
          }
        }}
      >
        <span>{resolveFont(value).label}</span>
        <FontSelectCaret aria-hidden>
          <img src={icons.arrowUp} alt="" />
        </FontSelectCaret>
      </FontSelectTrigger>
      {open ? (
        <FontOptionList
          ref={listRef}
          role="listbox"
          aria-label="폰트"
          tabIndex={-1}
          data-drop={placement.drop}
          style={{ maxHeight: placement.maxHeight }}
          onKeyDown={onKeyDown}
        >
          {FONT_PRESETS.map(preset => (
            <FontOption
              key={preset.key}
              type="button"
              role="option"
              aria-selected={preset.key === value}
              data-active={preset.key === active}
              tabIndex={-1}
              style={{ fontFamily: fontFamilyStack(preset.key) }}
              onPointerEnter={() => setActive(preset.key)}
              onClick={() => choose(preset.key)}
            >
              <span>{preset.label}</span>
              {preset.key === value ? (
                <FontOptionCheck aria-hidden>
                  <Glyph>✓</Glyph>
                </FontOptionCheck>
              ) : null}
            </FontOption>
          ))}
        </FontOptionList>
      ) : null}
    </FontSelectRoot>
  );
};

/**
 * 폰트 선택 행.
 *
 * 고른 폰트는 화면 전체에 즉시 반영되지만 저장은 완료 버튼으로만 합니다.
 * 취소하거나 편집 도중 페이지를 벗어나면 직전 선택으로 되돌립니다.
 */
const FontProfileRow = ({ value, onSave }: { value: FontKey; onSave: (next: FontKey) => Promise<void> }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<FontKey>(value);
  const [busy, setBusy] = useState(false);
  const revert = () => {
    setDraft(value);
    applyFont(value);
    setEditing(false);
  };
  // 언마운트 시점의 확정값이 필요해 참조로 들고 있습니다.
  const committed = useRef(value);
  useEffect(() => {
    committed.current = value;
  }, [value]);
  // 저장하지 않은 미리보기를 들고 다른 화면으로 넘어가지 않게 합니다.
  useEffect(() => () => void applyFont(committed.current), []);
  const finish = async () => {
    setBusy(true);
    try {
      await onSave(draft);
      applyFont(draft);
      setEditing(false);
    } catch {
      /* 미리보기와 편집 상태를 유지해 다시 시도하거나 취소할 수 있게 둡니다. */
    } finally {
      setBusy(false);
    }
  };
  return (
    <FieldBlock>
      <FieldLabel>폰트 설정</FieldLabel>
      {editing ? (
        <FieldRow>
          <FontSelect
            value={draft}
            onChange={next => {
              setDraft(next);
              applyFont(next, { persist: false });
            }}
          />
          <FieldActions>
            <Button onClick={revert}>취소</Button>
            <Button variant="primary" disabled={busy} onClick={finish}>
              확인
            </Button>
          </FieldActions>
        </FieldRow>
      ) : (
        <FieldBox
          style={{ fontFamily: fontFamilyStack(value) }}
          onClick={() => {
            setDraft(value);
            setEditing(true);
          }}
        >
          <span>{resolveFont(value).label}</span>
          <FieldChevron src={icons.arrowUp} alt="" aria-hidden />
        </FieldBox>
      )}
    </FieldBlock>
  );
};

/**
 * 카테고리 색 바꾸기.
 *
 * 한 번에 한 카테고리만 펼쳐 팔레트를 보여줍니다. 색을 고르면 바로 저장합니다 —
 * 되돌릴 초안이 없어 이름·자기소개와 달리 확인 버튼을 두지 않았습니다.
 */
const CategoryColorSection = ({ onError }: { onError: (message: string) => void }) => {
  const { data: categories = [] } = useCategories();
  const sorted = useMemo(() => sortCategories(categories), [categories]);
  const update = useUpdateCategory();
  const [openId, setOpenId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const choose = async (category: Category, color: string) => {
    setBusy(true);
    onError("");
    try {
      await update.mutateAsync({ id: category.categoryId, body: { name: category.name, color } });
      setOpenId(null);
    } catch (reason) {
      onError(message(reason));
    } finally {
      setBusy(false);
    }
  };
  if (!sorted.length) return null;
  return (
    <ColorSection>
      <FieldLabel as="h2">카테고리 색상 변경</FieldLabel>
      {sorted.map((category, index) => {
        const accent = categoryAccent(category.color, index);
        const open = openId === category.categoryId;
        return (
          <div key={category.categoryId}>
            <ColorRow>
              <CategoryPill name={category.name} accent={accent} own={false} />
              <ColorEditButton
                open={open}
                aria-expanded={open}
                onClick={() => setOpenId(open ? null : category.categoryId)}
              >
                <ColorDot style={{ background: accent }} />
                <span>색상 편집</span>
                <Glyph>›</Glyph>
              </ColorEditButton>
            </ColorRow>
            {open ? (
              <SwatchGrid role="group" aria-label={`${category.name} 색상`}>
                {CATEGORY_SWATCHES.map(color => (
                  <Swatch
                    key={color}
                    type="button"
                    aria-label={color}
                    aria-pressed={color.toLowerCase() === accent.toLowerCase()}
                    disabled={busy}
                    style={{ background: color }}
                    onClick={() => choose(category, color)}
                  />
                ))}
              </SwatchGrid>
            ) : null}
          </div>
        );
      })}
    </ColorSection>
  );
};

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
  const profileImage = resolveAssetUrl(me?.profileImageUrl);
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
          <InstallAppAction />
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
  const [emotion, setEmotion] = useState(existing?.emotion ?? "");
  const [emotionOpen, setEmotionOpen] = useState(false);
  const [content, setContent] = useState(existing ? splitDiaryContent(existing.content).content : "");
  const [visibility, setVisibility] = useState<UiVisibility>(existing?.visibility === "PRIVATE" ? "PRIVATE" : "GROUP");
  const [image, setImage] = useState<File | null>(null);
  const imageInput = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  // 이미지는 생성 요청의 multipart로만 올릴 수 있습니다. 수정에는 파일 필드가 없습니다.
  const canAttach = !existing;
  const submit = async () => {
    setError("");
    try {
      let body: DiaryCreateRequest | DiaryPatchRequest | FormData;
      if (image && canAttach) {
        body = new FormData();
        body.append("content", composeDiaryContent(selectedDate, content));
        body.append("visibility", visibility);
        if (emotion) body.append("emotion", emotion);
        body.append("image", image);
      } else {
        body = {
          content: composeDiaryContent(selectedDate, content),
          emotion: emotion || null,
          visibility,
        };
      }
      await save.mutateAsync({ id: existing?.diaryId, body });
      navigate("/");
    } catch (reason) {
      setError(message(reason));
    }
  };
  return (
    <AppShell>
      <DiaryTopBar>
        <DiaryTextAction onClick={() => navigate("/")}>취소</DiaryTextAction>
        <h1>일기</h1>
        <DiaryTextAction disabled={!content.trim() || save.isPending} onClick={submit}>
          완료
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
              <Button variant={visibility === "GROUP" ? "primary" : "soft"} onClick={() => setVisibility("GROUP")}>
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
              <DiaryRailLabel as="span">이미지 첨부하기</DiaryRailLabel>
              <DiaryIconAction
                aria-label="이미지 첨부하기"
                disabled={!canAttach}
                title={canAttach ? undefined : "이미지는 일기를 처음 쓸 때만 첨부할 수 있습니다."}
                onClick={() => imageInput.current?.click()}
              >
                <img src={icons.imageBox} alt="" aria-hidden />
              </DiaryIconAction>
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
          {error ? <ErrorText>{error}</ErrorText> : null}
        </DiaryRail>
      </DiaryBody>
      <PageNav active="home" />
    </AppShell>
  );
};

export const DiaryPage = () => {
  const [search] = useSearchParams();
  const selectedDate = search.get("date") || formatLocalDate(new Date());
  const { data: me } = useMe();
  const { data: diaries = [] } = useDiaries();
  const existing = diaries.find(diary => isDiaryForDate(diary, selectedDate));
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
const DiaryPreview = styled.div`
  display: grid;
  gap: 20px;
  justify-items: start;
  p {
    margin: 0;
    overflow-wrap: anywhere;
  }
`;
const DiaryPreviewTitle = styled.p`
  margin: 0;
  width: 100%;
  text-align: center;
  font-size: ${theme.text.h2};
  color: ${theme.colors.ink};
`;
const EmptyState = styled.div`
  min-height: 260px;
  display: grid;
  place-items: center;
  text-align: center;
  color: ${theme.colors.muted};
`;
const PageTitle = styled.h1`
  margin: 0;
  font-size: ${theme.text.h1};
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
const ColorSection = styled.section`
  display: grid;
  gap: 20px;
  padding: 0 20px;
  @media (min-width: 901px) {
    /* 디자인에서는 왼쪽 단의 이름 칸 높이에 맞춰 시작합니다. */
    margin-top: 113px;
  }
`;
const ColorRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
`;
const ColorEditButton = styled.button<{ open: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 12px;
  flex: none;
  border: 0;
  background: transparent;
  padding: 0;
  font-size: 18px;
  color: ${({ open }) => (open ? theme.colors.ink : theme.colors.muted)};
`;
const ColorDot = styled.span`
  width: 28px;
  height: 28px;
  border-radius: 50%;
  flex: none;
`;
const SwatchGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(6, 28px);
  gap: 22px;
  justify-content: center;
  margin: 22px 0;
`;
const Swatch = styled.button`
  width: 28px;
  height: 28px;
  border: 0;
  border-radius: 50%;
  padding: 0;
  &[aria-pressed="true"] {
    box-shadow:
      0 0 0 3px ${theme.colors.white},
      0 0 0 5px ${theme.colors.ink};
  }
  &:disabled {
    cursor: progress;
  }
`;
const ProfilePanel = styled.div`
  display: grid;
  justify-items: start;
  gap: 20px;
  max-width: 560px;
`;
const FieldBlock = styled.div`
  display: grid;
  gap: 4px;
  width: 100%;
  padding: 0 20px;
`;
const FieldLabel = styled.small`
  font-size: ${theme.text.h3};
  color: ${theme.colors.ink};
`;
const FieldRow = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 16px;
  flex-wrap: wrap;
`;
const FieldBox = styled.button`
  display: flex;
  align-items: center;
  gap: 10px;
  width: min(340px, 100%);
  border: 0;
  border-radius: ${theme.radius.sm};
  background: ${theme.colors.panel};
  padding: 12px 20px;
  text-align: left;
  color: ${theme.colors.ink};
  font-size: ${theme.text.s};
  > span {
    flex: 1;
    min-width: 0;
    overflow-wrap: anywhere;
  }
  /* 아직 입력하지 않은 값은 자리표시자처럼 보이게 둡니다. */
  > span[data-empty="true"] {
    color: ${theme.colors.muted};
  }
  input {
    flex: 1;
    min-width: 0;
    border: 0;
    background: transparent;
    padding: 0;
    color: inherit;
    &::placeholder {
      color: ${theme.colors.muted};
    }
  }
`;
const FieldCounter = styled.span`
  flex: none;
  color: ${theme.colors.muted};
`;
const FieldChevron = styled.img`
  flex: none;
  width: 20px;
  height: 20px;
  transform: rotate(90deg);
`;
const FieldActions = styled.div`
  display: flex;
  gap: 6px;
  flex: none;
`;
const HiddenFileInput = styled.input`
  display: none;
`;
const PhotoRow = styled.div`
  display: flex;
  align-items: center;
  gap: 32px;
  img,
  > span {
    flex: none;
    width: 100px;
    height: 100px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    object-fit: cover;
    background: ${theme.colors.panel};
    font-size: 44px;
  }
  @media (max-width: 600px) {
    gap: 18px;
    img,
    > span {
      width: 80px;
      height: 80px;
      font-size: 34px;
    }
  }
`;
const FontSelectRoot = styled.div`
  position: relative;
  width: min(240px, 100%);
`;
const FontSelectTrigger = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  border: 0;
  border-radius: ${theme.radius.sm};
  background: ${theme.colors.panel};
  padding: 12px 20px;
  text-align: left;
  font-size: ${theme.text.s};
  color: ${theme.colors.ink};
`;
const FontSelectCaret = styled.span`
  display: grid;
  place-items: center;
  img {
    width: 20px;
    height: 20px;
    transform: rotate(180deg);
  }
`;
const FontOptionList = styled.div`
  position: absolute;
  z-index: 20;
  top: calc(100% + ${LIST_GAP}px);
  left: 0;
  right: 0;
  &[data-drop="up"] {
    top: auto;
    bottom: calc(100% + ${LIST_GAP}px);
  }
  overflow-y: auto;
  display: grid;
  gap: 2px;
  padding: 0;
  background: ${theme.colors.white};
  border: 1px solid ${theme.colors.panel};
  border-radius: ${theme.radius.sm};
  box-shadow: ${theme.shadow};
`;
const FontOption = styled.button`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  border: 0;
  border-radius: ${theme.radius.sm};
  background: transparent;
  padding: 8px 20px;
  text-align: left;
  font-size: ${theme.text.s};
  color: ${theme.colors.ink};
  &[data-active="true"],
  &[aria-selected="true"] {
    background: ${theme.colors.panel};
  }
`;
const FontOptionCheck = styled.span`
  color: ${theme.colors.blue};
  font-size: 14px;
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
