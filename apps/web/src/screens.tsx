import styled from "@emotion/styled";
import {
  composeDiaryContent,
  formatLocalDate,
  getTodoTitle,
  isDiaryForDate,
  sortCategories,
  sortTodos,
  splitDiaryContent,
  todosForDate,
  unresolvedDependencies,
} from "@tlitodos/core";
import {
  useApi,
  useCategories,
  useCompleteTodo,
  useDiaries,
  useGroup,
  useMe,
  useSaveDiary,
  useTodos,
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
import { useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useSessionStore } from "./app/sessionStore";
import {
  CalendarPanel,
  CategoryManageModal,
  CategorySection,
  DependencyBlockModal,
  GroupActionModals,
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
  const { data: categoriesRaw = [] } = useCategories();
  const categories = useMemo(() => sortCategories(categoriesRaw), [categoriesRaw]);
  const { data: allTodosRaw = [], refetch } = useTodos(groupId, null);
  const ownerTodos = useMemo(
    () => (ownerId === undefined ? allTodosRaw : allTodosRaw.filter(todo => todo.userId === ownerId)),
    [allTodosRaw, ownerId],
  );
  const { data: diaries = [] } = useDiaries();
  const complete = useCompleteTodo();
  const [editor, setEditor] = useState<EditorState>(null);
  const [manage, setManage] = useState<Category | null>(null);
  const [blocked, setBlocked] = useState<Todo[]>([]);
  const [completionOverrides, setCompletionOverrides] = useState<Record<number, boolean>>({});
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
  const handleToggle = async (todo: Todo) => {
    if (!own) return;
    const dependencies = unresolvedDependencies(todo, todos);
    if (!todo.isCompleted && dependencies.length) {
      setBlocked(dependencies);
      return;
    }
    if (todo.isCompleted) {
      setCompletionOverrides(current => ({ ...current, [todo.todoId]: false }));
      return;
    }
    try {
      await complete.mutateAsync(todo.todoId);
      setCompletionOverrides(current => ({ ...current, [todo.todoId]: true }));
    } catch {
      await refetch();
    }
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
          {!categories.length ? (
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

export const ProfilePage = () => {
  const { data: me } = useMe();
  const update = useUpdateProfile();
  const api = useApi();
  const refreshToken = useSessionStore(s => s.refreshToken);
  const clear = useSessionStore(s => s.clearSession);
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const save = async (body: { name?: string; bio?: string }) => {
    setError("");
    try {
      await update.mutateAsync(body);
    } catch (reason) {
      setError(message(reason));
      throw reason;
    }
  };
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
        {error ? <ErrorText>{error}</ErrorText> : null}
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
`;
const OwnerTitle = styled.h2`
  margin: 0 0 34px;
  font-size: 22px;
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
    justify-content: space-between;
    h2 {
      font-size: 17px;
    }
  }
`;
const CategoryBoard = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 72px;
  @media (max-width: 600px) {
    grid-template-columns: 1fr;
    gap: 34px;
  }
`;
const CategoryStack = styled.div`
  display: grid;
  align-content: start;
  gap: 42px;
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
  }
`;
const PageTitle = styled.h1`
  margin: 0;
  font-size: 30px;
`;
const ProfilePanel = styled.div`
  width: min(620px, 100%);
  margin: 48px auto;
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
  textarea {
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
`;
const DiaryEditor = styled.div`
  width: min(760px, 100%);
  margin: 0 auto;
  display: grid;
  gap: 26px;
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
`;
