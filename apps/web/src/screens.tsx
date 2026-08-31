import styled from "@emotion/styled";
import {
  composeDiaryContent,
  FONT_PRESETS,
  formatLocalDate,
  getTodoTitle,
  isDiaryForDate,
  resolveFont,
  sortCategories,
  sortTodos,
  splitDiaryContent,
  todosForDate,
  type FontKey,
} from "@tlitodos/core";
import {
  useApi,
  useCategories,
  useDiaries,
  useGroup,
  useMe,
  useSaveDiary,
  useTodos,
  useUpdateFont,
  useUpdateProfile,
} from "@tlitodos/hooks";
import type { Category, Diary, Todo } from "@tlitodos/types";
import {
  AppShell,
  BottomNav,
  Button,
  ButtonStack,
  DiaryBadge,
  ErrorText,
  Field,
  Modal,
  ProfileCard,
  theme,
} from "@tlitodos/ui";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { applyFont, readStoredFont } from "./app/fontPreference";
import { useSessionStore } from "./app/sessionStore";
import { useTodoCompletion } from "./app/useTodoCompletion";
import {
  CalendarPanel,
  CategoryManageModal,
  CategorySection,
  DependencyBlockModal,
  GroupActionModals,
  InstallAppAction,
  TodoEditorModal,
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

type EditorState = { category: Category | null; todo: Todo | null } | null;

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
  const todosQuery = useTodos(groupId, null, targetUserId);
  const { data: allTodosRaw = [], refetch } = todosQuery;
  const ownerTodos = useMemo(
    () => (ownerId === undefined ? allTodosRaw : allTodosRaw.filter(todo => todo.userId === ownerId)),
    [allTodosRaw, ownerId],
  );
  const { data: diaries = [] } = useDiaries();
  const [blocked, setBlocked] = useState<Todo[]>([]);
  const { overrides: completionOverrides, toggle } = useTodoCompletion({
    serverTodos: ownerTodos,
    onBlocked: setBlocked,
    onRevert: refetch,
  });
  const [editor, setEditor] = useState<EditorState>(null);
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
  const selectedDiary = diaries.find(
    diary => diary.userId === (ownerId ?? diary.userId) && isDiaryForDate(diary, selectedDate),
  );
  const loadError = categoriesQuery.error ?? todosQuery.error;
  const isLoading = categoriesQuery.isLoading || todosQuery.isLoading;
  const handleToggle = (todo: Todo) => {
    if (!own) return;
    toggle(todo.todoId);
  };
  const nonHobby = categories.slice(0, -1);
  const hobby = categories.length ? categories[categories.length - 1] : undefined;
  return (
    <>
      <WorkspaceGrid>
        <div>
          <OwnerTitle>{own ? `🌱 ${me?.name || "나"}` : `🐰 ${ownerName || "친구"}`}</OwnerTitle>
          <CalendarPanel
            month={month}
            selectedDate={selectedDate}
            todos={todos}
            categories={categories}
            onMonthChange={setMonth}
            onDateChange={setSelectedDate}
          />
        </div>
        <TodoArea>
          <TodoToolbar>
            {own || selectedDiary ? (
              <DiaryBadge
                emotion={selectedDiary?.emotion}
                nickname={selectedDiary ? "일기" : "일기쓰기"}
                date={selectedDate.replaceAll("-", ".")}
                onClick={() =>
                  own ? navigate(`/diary?date=${selectedDate}`) : selectedDiary && setDiaryPreview(selectedDiary)
                }
              />
            ) : (
              <span />
            )}
            <h2>{getTodoTitle(selectedDate)}</h2>
          </TodoToolbar>
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
              <CategoryStack>
                {nonHobby.map((category, index) => (
                  <CategorySection
                    key={category.categoryId}
                    category={category}
                    index={index}
                    todos={sortTodos(selectedTodos.filter(todo => todo.categoryId === category.categoryId))}
                    own={own}
                    onAdd={next => setEditor({ category: next, todo: null })}
                    onManage={setManage}
                    onToggle={handleToggle}
                    onEdit={todo => setEditor({ category: null, todo })}
                  />
                ))}
              </CategoryStack>
              {hobby ? (
                <CategoryStack>
                  <CategorySection
                    category={hobby}
                    index={categories.length - 1}
                    todos={sortTodos(selectedTodos.filter(todo => todo.categoryId === hobby.categoryId))}
                    own={own}
                    onAdd={next => setEditor({ category: next, todo: null })}
                    onManage={setManage}
                    onToggle={handleToggle}
                    onEdit={todo => setEditor({ category: null, todo })}
                  />
                </CategoryStack>
              ) : null}
            </CategoryBoard>
          )}
        </TodoArea>
      </WorkspaceGrid>
      <TodoEditorModal
        key={`${selectedDate}-${editor?.todo?.todoId ?? editor?.category?.categoryId ?? 0}`}
        open={editor !== null}
        selectedDate={selectedDate}
        initialCategory={editor?.category ?? null}
        todo={editor?.todo ?? null}
        categories={categories}
        todos={selectedTodos}
        onClose={() => setEditor(null)}
        onSaved={() => refetch()}
      />
      <CategoryManageModal
        key={manage?.categoryId ?? 0}
        category={manage}
        open={manage !== null}
        onClose={() => setManage(null)}
      />
      <DependencyBlockModal todos={blocked} open={blocked.length > 0} onClose={() => setBlocked([])} />
      <Modal
        open={diaryPreview !== null}
        title={`${ownerName || "친구"}님의 일기`}
        onClose={() => setDiaryPreview(null)}
      >
        <DiaryContent>
          {diaryPreview?.emotion ? <b>{diaryPreview.emotion}</b> : null}
          <p>{diaryPreview ? splitDiaryContent(diaryPreview.content).content : ""}</p>
        </DiaryContent>
        <ButtonStack>
          <Button onClick={() => setDiaryPreview(null)}>닫기</Button>
        </ButtonStack>
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

export const GroupHome = () => {
  const { groupId } = useParams();
  const id = Number(groupId);
  const navigate = useNavigate();
  const header = useHeaderModal();
  const { data: me } = useMe();
  const { data: group, isLoading } = useGroup(Number.isFinite(id) ? id : null);
  const [copied, setCopied] = useState(false);
  const members = group?.members.filter(member => member.userId !== me?.userId) ?? [];
  return (
    <AppShell>
      <WorkspaceHeader activeGroupId={id} onCreate={header.openCreate} onJoin={header.openJoin} />
      <GroupTitleRow>
        <div>
          <h1>{group?.name || "그룹"}</h1>
          <p>{group?.description || "함께하는 멤버들의 TODO를 확인해 보세요."}</p>
        </div>
        {group?.inviteCode ? (
          <Button
            onClick={async () => {
              await navigator.clipboard.writeText(group.inviteCode);
              setCopied(true);
              setTimeout(() => setCopied(false), 1400);
            }}
          >
            {copied ? "복사했어요" : "초대코드 복사"}
          </Button>
        ) : null}
      </GroupTitleRow>
      {isLoading ? (
        <EmptyState>그룹을 불러오는 중...</EmptyState>
      ) : members.length ? (
        <MemberGrid>
          {members.map(member => (
            <ProfileCard
              key={member.userId}
              member={member}
              onClick={() => navigate(`/groups/${id}/members/${member.userId}`)}
            />
          ))}
        </MemberGrid>
      ) : (
        <EmptyState>아직 다른 그룹 멤버가 없습니다.</EmptyState>
      )}
      <PageNav active="home" />
      <GroupActionModals mode={header.mode} onClose={header.close} />
    </AppShell>
  );
};

export const FriendHome = () => {
  const { groupId, userId } = useParams();
  const group = Number(groupId);
  const user = Number(userId);
  const header = useHeaderModal();
  const { data: detail } = useGroup(Number.isFinite(group) ? group : null);
  const member = detail?.members.find(item => item.userId === user);
  return (
    <AppShell>
      <WorkspaceHeader activeGroupId={group} onCreate={header.openCreate} onJoin={header.openJoin} />
      <TodoWorkspace own={false} ownerId={user} ownerName={member?.name} groupId={group} />
      <PageNav active="home" />
      <GroupActionModals mode={header.mode} onClose={header.close} />
    </AppShell>
  );
};

export const AlarmPage = () => (
  <AppShell>
    <PageTitle>알림</PageTitle>
    <PageNav active="alarm" />
  </AppShell>
);

const EditableProfileRow = ({
  label,
  value,
  multiline,
  onSave,
}: {
  label: string;
  value: string;
  multiline?: boolean;
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
      /* 상위 행에서 오류 메시지를 표시합니다. */
    } finally {
      setBusy(false);
    }
  };
  return (
    <ProfileRow>
      <div>
        <small>{label}</small>
        {editing ? (
          multiline ? (
            <textarea
              value={draft}
              maxLength={80}
              onKeyDown={e => {
                if (e.key === "Enter") e.preventDefault();
              }}
              onChange={e => setDraft(e.target.value)}
            />
          ) : (
            <input
              value={draft}
              maxLength={20}
              onKeyDown={e => {
                if (e.key === "Enter") e.preventDefault();
              }}
              onChange={e => setDraft(e.target.value)}
            />
          )
        ) : (
          <strong>{value || "아직 입력하지 않았어요"}</strong>
        )}
      </div>
      <div>
        {editing ? (
          <>
            <Button
              onClick={() => {
                setDraft(value);
                setEditing(false);
              }}
            >
              취소
            </Button>
            <Button variant="primary" disabled={busy} onClick={finish}>
              완료
            </Button>
          </>
        ) : (
          <Button
            onClick={() => {
              setDraft(value);
              setEditing(true);
            }}
          >
            ›
          </Button>
        )}
      </div>
    </ProfileRow>
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
    <ProfileRow>
      <div>
        <small>폰트</small>
        {editing ? (
          // 옵션마다 해당 폰트를 입히면 목록을 열 때 여섯 개를 모두 내려받게 되므로,
          // 미리보기는 화면 전체에 적용하는 쪽으로만 보여 줍니다.
          <select
            value={draft}
            onChange={e => {
              const next = e.target.value as FontKey;
              setDraft(next);
              applyFont(next, { persist: false });
            }}
          >
            {FONT_PRESETS.map(preset => (
              <option key={preset.key} value={preset.key}>
                {preset.label}
              </option>
            ))}
          </select>
        ) : (
          <strong>{resolveFont(value).label}</strong>
        )}
      </div>
      <div>
        {editing ? (
          <>
            <Button onClick={revert}>취소</Button>
            <Button variant="primary" disabled={busy} onClick={finish}>
              완료
            </Button>
          </>
        ) : (
          <Button
            onClick={() => {
              setDraft(value);
              setEditing(true);
            }}
          >
            ›
          </Button>
        )}
      </div>
    </ProfileRow>
  );
};

export const ProfilePage = () => {
  const { data: me } = useMe();
  const update = useUpdateProfile();
  const updateFont = useUpdateFont();
  const api = useApi();
  const refreshToken = useSessionStore(s => s.refreshToken);
  const clear = useSessionStore(s => s.clearSession);
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
  return (
    <AppShell>
      <PageTitle>프로필</PageTitle>
      <ProfilePanel>
        <ProfileHero>
          {me?.profileImageUrl ? <img src={me.profileImageUrl} alt="프로필" /> : <span>🌱</span>}
          <div>
            <h2>{me?.name || "사용자"}</h2>
            <p>{me?.bio || "오늘도 한 걸음씩"}</p>
          </div>
        </ProfileHero>
        {/* 프로필 사진 수정하기 버튼은 API·MVP 범위 확정 후 활성화 */}
        <EditableProfileRow label="이름" value={me?.name ?? ""} onSave={name => save({ name })} />
        <EditableProfileRow label="자기소개" value={me?.bio ?? ""} multiline onSave={bio => save({ bio })} />
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
              navigate("/");
            }
          }}
        >
          로그아웃
        </LogoutButton>
      </ProfilePanel>
      <PageNav active="profile" />
    </AppShell>
  );
};

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
  const [content, setContent] = useState(existing ? splitDiaryContent(existing.content).content : "");
  const [error, setError] = useState("");
  return (
    <AppShell>
      <DiaryHead>
        <div>
          <Button onClick={() => navigate("/")}>‹ 돌아가기</Button>
          <h1>{existing ? "일기 수정하기" : "오늘의 일기 쓰기"}</h1>
          <p>
            {userName} · {selectedDate.replaceAll("-", ".")}
          </p>
        </div>
      </DiaryHead>
      <DiaryEditor>
        <Field>
          오늘의 기분 (선택)
          <EmotionRow>
            {["", "😊", "🥳", "😌", "😢", "😤"].map(item => (
              <button
                type="button"
                key={item || "none"}
                data-selected={emotion === item}
                onClick={() => setEmotion(item)}
              >
                {item || "없음"}
              </button>
            ))}
          </EmotionRow>
        </Field>
        <Field>
          오늘의 기록
          <textarea
            value={content}
            maxLength={1000}
            onChange={e => setContent(e.target.value)}
            placeholder="오늘 하루는 어땠나요?"
          />
          <small>{content.length}/1000</small>
        </Field>
        {error ? <ErrorText>{error}</ErrorText> : null}
        <ButtonStack>
          <Button
            variant="primary"
            disabled={!content.trim() || save.isPending}
            onClick={async () => {
              setError("");
              try {
                await save.mutateAsync({
                  id: existing?.diaryId,
                  body: {
                    content: composeDiaryContent(selectedDate, content),
                    emotion: emotion || null,
                    visibility: "PRIVATE",
                  },
                });
                navigate("/");
              } catch (reason) {
                setError(message(reason));
              }
            }}
          >
            {existing ? "수정 완료" : "일기 저장하기"}
          </Button>
        </ButtonStack>
      </DiaryEditor>
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
  grid-template-columns: minmax(330px, 450px) minmax(420px, 1fr);
  gap: 8%;
  align-items: start;
  @media (max-width: 900px) {
    grid-template-columns: 1fr;
    gap: 54px;
  }
  @media (max-width: 600px) {
    gap: 36px;
  }
`;
const OwnerTitle = styled.h2`
  margin: 0 0 34px;
  font-size: 22px;
  @media (max-width: 600px) {
    margin-bottom: 20px;
    font-size: 20px;
  }
`;
const TodoArea = styled.section`
  min-width: 0;
`;
const TodoToolbar = styled.div`
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  margin: 12px 0 32px;
  h2 {
    grid-column: 2;
    margin: 0;
    font-size: 21px;
  }
  @media (max-width: 600px) {
    display: flex;
    align-items: flex-start;
    flex-wrap: wrap;
    gap: 12px;
    margin: 0 0 24px;
    h2 {
      order: -1;
      width: 100%;
      font-size: 20px;
      line-height: 1.35;
    }
  }
`;
const CategoryBoard = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 72px;
  @media (max-width: 600px) {
    grid-template-columns: 1fr;
    gap: 30px;
  }
`;
const CategoryStack = styled.div`
  display: grid;
  align-content: start;
  gap: 42px;
  @media (max-width: 600px) {
    gap: 28px;
  }
`;
const EmptyState = styled.div`
  min-height: 260px;
  display: grid;
  place-items: center;
  text-align: center;
  color: ${theme.colors.muted};
`;
const DiaryContent = styled.div`
  border-radius: 16px;
  background: #f7f9fb;
  padding: 24px;
  b {
    font-size: 34px;
  }
  p {
    white-space: pre-wrap;
    line-height: 1.8;
  }
`;
const GroupTitleRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 10px 0 52px;
  h1 {
    margin: 0 0 8px;
  }
  p {
    margin: 0;
    color: ${theme.colors.muted};
  }
  @media (max-width: 600px) {
    align-items: stretch;
    flex-direction: column;
    gap: 20px;
    margin: 0 0 34px;
    h1 {
      font-size: 27px;
    }
    > button {
      width: 100%;
    }
  }
`;
const MemberGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 30px 70px;
  @media (max-width: 900px) {
    grid-template-columns: repeat(2, 1fr);
  }
  @media (max-width: 560px) {
    grid-template-columns: 1fr;
    gap: 12px;
  }
`;
const PageTitle = styled.h1`
  margin: 0;
  font-size: 30px;
  @media (max-width: 600px) {
    font-size: 26px;
  }
`;
const ProfilePanel = styled.div`
  width: min(620px, 100%);
  margin: 48px auto;
  @media (max-width: 600px) {
    margin: 28px auto;
  }
`;
const ProfileHero = styled.div`
  display: flex;
  align-items: center;
  gap: 24px;
  margin-bottom: 42px;
  img,
  span {
    width: 92px;
    height: 92px;
    border-radius: 50%;
    object-fit: cover;
    background: #f7f9fb;
    display: grid;
    place-items: center;
    font-size: 48px;
  }
  h2 {
    margin: 0 0 8px;
  }
  p {
    margin: 0;
    color: ${theme.colors.muted};
  }
  @media (max-width: 600px) {
    gap: 16px;
    margin-bottom: 28px;
    img,
    span {
      width: 72px;
      height: 72px;
      font-size: 38px;
    }
    h2 {
      font-size: 22px;
    }
    p {
      overflow-wrap: anywhere;
    }
  }
`;
const ProfileRow = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 24px;
  align-items: center;
  padding: 22px 0;
  border-bottom: 1px solid ${theme.colors.line};
  > div:first-of-type {
    flex: 1;
    display: grid;
    gap: 7px;
  }
  small {
    color: ${theme.colors.muted};
  }
  strong {
    font-size: 18px;
  }
  input,
  textarea,
  select {
    width: 100%;
    border: 0;
    border-radius: 10px;
    background: #f7f9fb;
    padding: 12px;
  }
  textarea {
    min-height: 70px;
    resize: vertical;
  }
  > div:last-child {
    display: flex;
    gap: 7px;
  }
  @media (max-width: 600px) {
    align-items: stretch;
    flex-direction: column;
    gap: 14px;
    padding: 18px 0;
    > div:last-child {
      justify-content: flex-end;
      button {
        min-width: 72px;
      }
    }
  }
`;
const LogoutButton = styled.button`
  margin-top: 28px;
  border: 0;
  background: transparent;
  color: ${theme.colors.red};
  font-weight: 800;
  padding: 10px 0;
`;
const DiaryHead = styled.div`
  margin-bottom: 36px;
  h1 {
    margin: 24px 0 6px;
  }
  p {
    color: ${theme.colors.muted};
  }
  @media (max-width: 600px) {
    margin-bottom: 26px;
    h1 {
      margin-top: 20px;
      font-size: 27px;
    }
  }
`;
const DiaryEditor = styled.div`
  width: min(760px, 100%);
  margin: 0 auto;
  display: grid;
  gap: 26px;
  @media (max-width: 600px) {
    gap: 22px;
    textarea {
      min-height: 42vh;
    }
  }
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
