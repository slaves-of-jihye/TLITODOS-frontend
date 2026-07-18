import styled from "@emotion/styled";
import {
  CATEGORY_PRESETS,
  addMonths,
  buildRoutineDates,
  categoryToneAt,
  composeTodoContent,
  dateOnly,
  formatLocalDate,
  getCalendarDays,
  isHobbyCategory,
  isTodoCategory,
  parseLocalDate,
  sameLocalDate,
  sortCategories,
  splitTodoContent,
  withOptionalTime,
  type CategoryTone,
  type RoutineRepeat,
} from "@tlitodos/core";
import { useApi, useCreateGroup, useGroups, useJoinGroup, useMe, useUpdateCategory } from "@tlitodos/hooks";
import type { Category, Importance, Todo, UiVisibility } from "@tlitodos/types";
import {
  Button,
  ButtonStack,
  CategoryPill,
  DayStash,
  ErrorText,
  Field,
  FormGrid,
  HeaderRow,
  IconButton,
  Modal,
  Option,
  Selection,
  TodoRow as SharedTodoRow,
  ViewChip,
  theme,
} from "@tlitodos/ui";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useSessionStore } from "./app/sessionStore";

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : "요청을 처리하지 못했습니다.");

export const LoginModal = () => {
  const accessToken = useSessionStore(state => state.accessToken);
  const setSession = useSessionStore(state => state.setSession);
  const api = useApi();
  const queryClient = useQueryClient();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const acceptGoogleToken = useCallback(
    async (accessTokenValue: string) => {
      setLoading(true);
      setError("");
      try {
        const session = await api.auth.google({ googleAccessToken: accessTokenValue });
        setSession(session);
        const current = await api.categories.list();
        if (session.isNewUser || current.length < 4) {
          const desired = CATEGORY_PRESETS.map((preset, index) => ({
            name: index === 0 ? "해야할 일" : index === 3 ? "취미" : `사용자 설정 ${index}`,
            color: preset.color,
          }));
          if (current.length === 0) {
            await Promise.all(desired.map(category => api.categories.create(category)));
          } else {
            const todoCategory = current.find(isTodoCategory);
            const hobbyCategory = current.find(isHobbyCategory);
            let total = current.length;
            if (todoCategory) await api.categories.update(todoCategory.categoryId, desired[0]!);
            else if (total < 5) {
              await api.categories.create(desired[0]!);
              total += 1;
            }
            const customCount = current.filter(
              category => !isTodoCategory(category) && !isHobbyCategory(category),
            ).length;
            for (let index = customCount; index < 2 && total < 5; index += 1) {
              await api.categories.create(desired[index + 1]!);
              total += 1;
            }
            if (hobbyCategory) await api.categories.update(hobbyCategory.categoryId, desired[3]!);
            else if (total < 5) await api.categories.create(desired[3]!);
          }
        }
        await queryClient.invalidateQueries();
      } catch (reason) {
        useSessionStore.getState().clearSession();
        setError(errorMessage(reason));
      } finally {
        setLoading(false);
      }
    },
    [api, queryClient, setSession],
  );
  useEffect(() => {
    const receiveToken = (event: MessageEvent<{ type?: string; accessToken?: string; error?: string }>) => {
      if (event.origin !== window.location.origin || event.data?.type !== "tlitodos-google-oauth") return;
      if (event.data.error || !event.data.accessToken) setError("Google 로그인에 실패했습니다.");
      else void acceptGoogleToken(event.data.accessToken);
    };
    window.addEventListener("message", receiveToken);
    return () => window.removeEventListener("message", receiveToken);
  }, [acceptGoogleToken]);
  const login = () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) {
      setError("VITE_GOOGLE_CLIENT_ID 환경변수를 설정해 주세요.");
      return;
    }
    if (window.google?.accounts.oauth2) {
      window.google.accounts.oauth2
        .initTokenClient({
          client_id: clientId,
          scope: "openid email profile",
          callback: response => {
            if (response.error || !response.access_token) setError("Google 로그인에 실패했습니다.");
            else void acceptGoogleToken(response.access_token);
          },
        })
        .requestAccessToken();
      return;
    }
    const redirectUri = `${window.location.origin}/oauth-callback.html`;
    const query = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "token",
      scope: "openid email profile",
      include_granted_scopes: "true",
      prompt: "select_account",
    });
    const popup = window.open(
      `https://accounts.google.com/o/oauth2/v2/auth?${query}`,
      "tlitodos-google-oauth",
      "popup,width=520,height=720",
    );
    if (!popup) setError("로그인 팝업을 열 수 없습니다. 팝업 차단을 해제해 주세요.");
  };
  return (
    <Modal open={!accessToken} login title="TLITODOS에 오신 걸 환영해요">
      <LoginCopy>오늘 할 일과 하루의 기록을 한곳에서 관리해 보세요.</LoginCopy>
      {error ? <ErrorText>{error}</ErrorText> : null}
      <GoogleButton type="button" onClick={login} disabled={loading}>
        <GoogleMark>G</GoogleMark>
        {loading ? "로그인 중..." : "Google로 로그인하기"}
      </GoogleButton>
    </Modal>
  );
};
const LoginCopy = styled.p`
  margin: -14px 0 28px;
  color: ${theme.colors.muted};
`;
const GoogleButton = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  border: 1px solid ${theme.colors.line};
  border-radius: 14px;
  background: white;
  padding: 15px;
  font-weight: 700;
  &:hover {
    background: #f8fafb;
  }
`;
const GoogleMark = styled.span`
  font-family: Arial, sans-serif;
  font-size: 22px;
  color: #4285f4;
  font-weight: 800;
`;

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
  const { data: me } = useMe();
  const { data: groups = [] } = useGroups();
  return (
    <HeaderRow>
      <ViewChip active={activeGroupId === undefined} avatar={me?.profileImageUrl} onClick={() => navigate("/")}>
        {me?.name || "나의 TODO"}
      </ViewChip>
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

export const GroupActionModals = ({ mode, onClose }: { mode: "create" | "join" | null; onClose: () => void }) => {
  const createGroup = useCreateGroup();
  const joinGroup = useJoinGroup();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [code, setCode] = useState("");
  const close = () => {
    setName("");
    setDescription("");
    setCode("");
    onClose();
  };
  const error = createGroup.error ?? joinGroup.error;
  return (
    <Modal open={mode !== null} title={mode === "create" ? "새 그룹 만들기" : "초대코드로 참여하기"} onClose={close}>
      {mode === "create" ? (
        <>
          <Field>
            그룹 이름
            <input
              value={name}
              maxLength={20}
              onChange={e => setName(e.target.value)}
              placeholder="그룹 이름을 입력하세요"
            />
          </Field>
          <Field>
            그룹 소개
            <textarea
              value={description}
              maxLength={80}
              onChange={e => setDescription(e.target.value)}
              placeholder="우리 그룹을 소개해 주세요"
            />
            <small>{description.length}/80</small>
          </Field>
        </>
      ) : (
        <Field>
          초대코드
          <input
            value={code}
            maxLength={8}
            onChange={e => setCode(e.target.value.toLowerCase())}
            placeholder="영문 소문자와 숫자 8자리"
          />
        </Field>
      )}
      {error ? <ErrorText>{errorMessage(error)}</ErrorText> : null}
      <ButtonStack>
        <Button
          variant="primary"
          disabled={mode === "create" ? !name.trim() : !/^[a-z0-9]{8}$/.test(code)}
          onClick={async () => {
            try {
              if (mode === "create") {
                const group = await createGroup.mutateAsync({ name: name.trim(), description: description.trim() });
                close();
                navigate(`/groups/${group.groupId}`);
              } else {
                const group = await joinGroup.mutateAsync({ inviteCode: code });
                close();
                navigate(`/groups/${group.groupId}`);
              }
            } catch {
              /* mutation.error를 모달에 표시합니다. */
            }
          }}
        >
          {mode === "create" ? "그룹 만들기" : "참여하기"}
        </Button>
        <Button onClick={close}>취소</Button>
      </ButtonStack>
    </Modal>
  );
};

export const CalendarPanel = ({
  month,
  selectedDate,
  todos,
  categories,
  onMonthChange,
  onDateChange,
}: {
  month: Date;
  selectedDate: string;
  todos: Todo[];
  categories: Category[];
  onMonthChange: (date: Date) => void;
  onDateChange: (date: string) => void;
}) => {
  const sorted = sortCategories(categories);
  const days = getCalendarDays(month);
  const today = formatLocalDate(new Date());
  return (
    <CalendarWrap>
      <MonthHeader>
        <MonthInput
          type="month"
          value={`${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`}
          aria-label="월 빠른 이동"
          onChange={e => {
            const [y, m] = e.target.value.split("-").map(Number);
            if (y && m) onMonthChange(new Date(y, m - 1, 1));
          }}
        />
        <MonthButtons>
          <IconButton onClick={() => onMonthChange(addMonths(month, -1))}>‹</IconButton>
          <IconButton onClick={() => onMonthChange(addMonths(month, 1))}>›</IconButton>
        </MonthButtons>
      </MonthHeader>
      <WeekRow>
        {["월", "화", "수", "목", "금", "토", "일"].map((day, index) => (
          <span key={day} data-weekend={index > 4}>
            {day}
          </span>
        ))}
      </WeekRow>
      <DaysGrid>
        {days.map((date, index) => {
          if (!date) return <span key={`empty-${index}`} />;
          const value = formatLocalDate(date);
          const dayTodos = todos.filter(todo => sameLocalDate(todo.dueDate, value));
          const tones: CategoryTone[] = [];
          const completed: CategoryTone[] = [];
          sorted.forEach((category, catIndex) => {
            const list = dayTodos.filter(todo => todo.categoryId === category.categoryId);
            if (list.length) {
              const tone = categoryToneAt(catIndex);
              tones.push(tone);
              if (list.every(todo => todo.isCompleted)) completed.push(tone);
            }
          });
          return (
            <DayStash
              key={value}
              date={date.getDate()}
              tones={tones}
              completed={completed}
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
const CalendarWrap = styled.section`
  width: min(450px, 100%);
`;
const MonthHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 14px;
  border-bottom: 1px solid #d7dee5;
`;
const MonthInput = styled.input`
  border: 0;
  background: transparent;
  font-size: 20px;
  font-weight: 800;
  color: ${theme.colors.ink};
  &::-webkit-calendar-picker-indicator {
    opacity: 0.45;
    cursor: pointer;
  }
`;
const MonthButtons = styled.div`
  display: flex;
  gap: 5px;
`;
const WeekRow = styled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  text-align: center;
  margin: 15px 0 7px;
  font-size: 13px;
  font-weight: 700;
  span:nth-of-type(6) {
    color: ${theme.colors.blue};
  }
  span:nth-of-type(7) {
    color: ${theme.colors.red};
  }
`;
const DaysGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  grid-auto-rows: 75px;
  justify-items: center;
`;

export const CategoryManageModal = ({
  category,
  open,
  onClose,
}: {
  category: Category | null;
  open: boolean;
  onClose: () => void;
}) => {
  const [name, setName] = useState(category?.name ?? "");
  const update = useUpdateCategory();
  return (
    <Modal open={open} title="카테고리 이름 변경" onClose={onClose}>
      <Field>
        이름
        <input value={name} maxLength={16} onChange={e => setName(e.target.value)} />
        <small>{name.length}/16</small>
      </Field>
      {update.error ? <ErrorText>{errorMessage(update.error)}</ErrorText> : null}
      <ButtonStack>
        <Button
          variant="primary"
          disabled={!category || !name.trim()}
          onClick={async () => {
            if (!category) return;
            try {
              await update.mutateAsync({ id: category.categoryId, body: { name: name.trim(), color: category.color } });
              onClose();
            } catch {
              /* mutation.error를 표시합니다. */
            }
          }}
        >
          완료
        </Button>
        <Button onClick={onClose}>취소</Button>
      </ButtonStack>
    </Modal>
  );
};

type DeadlineValue = { date: string; time: string };
const CalendarChooser = ({ value, onChange }: { value: string; onChange: (next: string) => void }) => {
  const [month, setMonth] = useState(() => parseLocalDate(value));
  const days = getCalendarDays(month);
  return (
    <MiniCalendar>
      <MonthHeader>
        <MonthInput
          type="month"
          value={`${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`}
          onChange={e => {
            const [y, m] = e.target.value.split("-").map(Number);
            if (y && m) setMonth(new Date(y, m - 1, 1));
          }}
        />
        <MonthButtons>
          <IconButton onClick={() => setMonth(addMonths(month, -1))}>‹</IconButton>
          <IconButton onClick={() => setMonth(addMonths(month, 1))}>›</IconButton>
        </MonthButtons>
      </MonthHeader>
      <MiniDays>
        {["월", "화", "수", "목", "금", "토", "일"].map(day => (
          <b key={day}>{day}</b>
        ))}
        {days.map((date, index) =>
          date ? (
            <button
              type="button"
              data-selected={formatLocalDate(date) === value}
              onClick={() => onChange(formatLocalDate(date))}
              key={formatLocalDate(date)}
            >
              {date.getDate()}
            </button>
          ) : (
            <span key={`e-${index}`} />
          ),
        )}
      </MiniDays>
    </MiniCalendar>
  );
};
const MiniCalendar = styled.div`
  margin-top: 16px;
  border: 1px solid ${theme.colors.line};
  border-radius: 18px;
  padding: 16px;
`;
const MiniDays = styled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
  margin-top: 10px;
  text-align: center;
  b {
    font-size: 11px;
    color: ${theme.colors.muted};
  }
  button {
    height: 34px;
    border: 0;
    border-radius: 50%;
    background: transparent;
  }
  button[data-selected="true"] {
    background: #dff6ad;
    font-weight: 800;
  }
`;

export const DeadlineModal = ({
  open,
  value,
  onChange,
  onClose,
}: {
  open: boolean;
  value: DeadlineValue;
  onChange: (next: DeadlineValue) => void;
  onClose: () => void;
}) => {
  const [panel, setPanel] = useState<"date" | "time" | null>(null);
  return (
    <Modal open={open} nested title="마감기한 설정하기">
      <ToggleRow>
        <Button onClick={() => setPanel(panel === "date" ? null : "date")}>📅 {value.date.replaceAll("-", "/")}</Button>
        <Button onClick={() => setPanel(panel === "time" ? null : "time")}>⏰ {value.time || "시간 설정"}</Button>
      </ToggleRow>
      {panel === "date" ? <CalendarChooser value={value.date} onChange={date => onChange({ ...value, date })} /> : null}
      {panel === "time" ? (
        <TimeInput type="time" value={value.time} onChange={e => onChange({ ...value, time: e.target.value })} />
      ) : null}
      <ButtonStack>
        <Button variant="primary" onClick={onClose}>
          설정 완료
        </Button>
      </ButtonStack>
    </Modal>
  );
};
const ToggleRow = styled.div`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
`;
const TimeInput = styled.input`
  display: block;
  width: 100%;
  margin-top: 18px;
  border: 1px solid ${theme.colors.line};
  border-radius: 12px;
  padding: 14px;
`;

export interface RoutineValue {
  start: string;
  end: string;
  time: string;
  repeat: RoutineRepeat;
}
export const RoutineModal = ({
  open,
  initialDate,
  onRegister,
  onClose,
}: {
  open: boolean;
  initialDate: string;
  onRegister: (value: RoutineValue) => Promise<void>;
  onClose: () => void;
}) => {
  const [value, setValue] = useState<RoutineValue>({ start: initialDate, end: initialDate, time: "", repeat: "DAILY" });
  const [panel, setPanel] = useState<"start" | "end" | "time" | "repeat" | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <Modal open={open} nested title="루틴으로 등록하기">
      <ToggleRow>
        <Button onClick={() => setPanel(panel === "start" ? null : "start")}>
          시작 {value.start.replaceAll("-", "/")}
        </Button>
        <Button onClick={() => setPanel(panel === "end" ? null : "end")}>종료 {value.end.replaceAll("-", "/")}</Button>
        <Button onClick={() => setPanel(panel === "time" ? null : "time")}>시간 {value.time || "선택 안 함"}</Button>
        <Button onClick={() => setPanel(panel === "repeat" ? null : "repeat")}>반복 설정</Button>
      </ToggleRow>
      {panel === "start" ? (
        <CalendarChooser value={value.start} onChange={start => setValue({ ...value, start })} />
      ) : null}
      {panel === "end" ? <CalendarChooser value={value.end} onChange={end => setValue({ ...value, end })} /> : null}
      {panel === "time" ? (
        <TimeInput type="time" value={value.time} onChange={e => setValue({ ...value, time: e.target.value })} />
      ) : null}
      {panel === "repeat" ? (
        <ChoiceRow>
          {(
            [
              ["DAILY", "매일"],
              ["WEEKDAYS", "평일"],
              ["WEEKLY", "매주"],
            ] as const
          ).map(([key, label]) => (
            <Option
              key={key}
              name="repeat"
              value={key}
              checked={value.repeat === key}
              onChange={() => setValue({ ...value, repeat: key })}
              label={label}
            />
          ))}
        </ChoiceRow>
      ) : null}
      <ButtonStack>
        <Button
          variant="primary"
          disabled={busy || value.end < value.start}
          onClick={async () => {
            setBusy(true);
            try {
              await onRegister(value);
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "등록 중..." : "루틴으로 등록하기"}
        </Button>
        <Button onClick={onClose}>취소</Button>
      </ButtonStack>
    </Modal>
  );
};
const ChoiceRow = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 18px;
`;

const formatDeadline = ({ date, time }: DeadlineValue) => {
  if (!time) return date.replaceAll("-", "/");
  const [hour, minute] = time.split(":");
  const hourNumber = Number(hour);
  const meridiem = hourNumber < 12 ? "AM" : "PM";
  const display = hourNumber % 12 || 12;
  return `${date.replaceAll("-", "/")} ${meridiem} ${String(display).padStart(2, "0")}:${minute}까지`;
};

export const TodoEditorModal = ({
  open,
  selectedDate,
  initialCategory,
  todo,
  categories,
  todos,
  onClose,
  onSaved,
}: {
  open: boolean;
  selectedDate: string;
  initialCategory: Category | null;
  todo: Todo | null;
  categories: Category[];
  todos: Todo[];
  onClose: () => void;
  onSaved?: () => void;
}) => {
  const initialContent = splitTodoContent(todo?.title ?? "");
  const api = useApi();
  const [title, setTitle] = useState(initialContent.title);
  const [detail, setDetail] = useState(
    initialContent.detail || todo?.subtasks.map(item => item.content).join(" · ") || "",
  );
  const [categoryId, setCategoryId] = useState(
    todo?.categoryId ?? initialCategory?.categoryId ?? categories[0]?.categoryId ?? 0,
  );
  const [importance, setImportance] = useState<Importance>(todo?.importance ?? "NONE");
  const [visibility, setVisibility] = useState<UiVisibility>(todo?.visibility === "PRIVATE" ? "PRIVATE" : "GROUP");
  const [dependency, setDependency] = useState<number | null>(todo?.dependencies[0] ?? null);
  const [deadline, setDeadline] = useState<DeadlineValue>({
    date: dateOnly(todo?.dueDate) ?? selectedDate,
    time: todo?.dueDate?.includes("T") ? todo.dueDate.slice(11, 16) : "23:59",
  });
  const [deadlineOpen, setDeadlineOpen] = useState(false);
  const [routineOpen, setRoutineOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const candidates = useMemo(
    () =>
      todos.filter(
        candidate =>
          candidate.todoId !== todo?.todoId &&
          sameLocalDate(candidate.dueDate, selectedDate) &&
          !isHobbyCategory(
            categories.find(category => category.categoryId === candidate.categoryId) ?? { name: "취미" },
          ),
      ),
    [todos, todo, categories, selectedDate],
  );
  const submitOne = async (dueDate: string, isRoutine = false, detailText = detail) => {
    const body = {
      title: composeTodoContent(title, detailText),
      categoryId,
      importance,
      hardship: 1,
      dueDate,
      visibility: visibility as "PRIVATE" | "GROUP",
    };
    const saved = todo ? await api.todos.update(todo.todoId, body) : await api.todos.create({ ...body, isRoutine });
    if (dependency && !saved.dependencies.includes(dependency))
      await api.todos.dependency(saved.todoId, { dependencyTodoId: dependency });
  };
  const submit = async () => {
    setBusy(true);
    setError("");
    try {
      await submitOne(withOptionalTime(deadline.date, deadline.time));
      onSaved?.();
      onClose();
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  };
  const selectedCategory = categories.find(category => category.categoryId === categoryId);
  return (
    <>
      <Modal open={open} title={todo ? "할 일 수정하기" : "할 일 추가하기"} onClose={onClose}>
        <FormGrid>
          <div>
            <Field>
              할 일 {"*"}
              <input
                value={title}
                maxLength={15}
                onChange={e => setTitle(e.target.value)}
                placeholder="할 일을 추가하세요..."
              />
              <small>{title.length}/15</small>
            </Field>
            <Field>
              할 일에 대한 세부사항
              <input
                value={detail}
                maxLength={20}
                onChange={e => setDetail(e.target.value)}
                placeholder="세부사항을 작성하세요..."
              />
              <small>{detail.length}/20</small>
            </Field>
            <Question>Q. 이 일을 하기 전 선행해야 할 일이 있나요?</Question>
            <DependencyList>
              {candidates.length ? (
                candidates.map(candidate => {
                  const index = sortCategories(categories).findIndex(
                    category => category.categoryId === candidate.categoryId,
                  );
                  const preset = CATEGORY_PRESETS[index] ?? CATEGORY_PRESETS[0];
                  return (
                    <label key={candidate.todoId}>
                      <input
                        type="radio"
                        name="dependency"
                        checked={dependency === candidate.todoId}
                        onChange={() => setDependency(candidate.todoId)}
                      />
                      <i
                        style={{
                          borderColor: preset.color,
                          background: dependency === candidate.todoId ? preset.color : "transparent",
                        }}
                      />
                      {candidate.title}
                    </label>
                  );
                })
              ) : (
                <small>선택할 수 있는 선행 할 일이 없습니다.</small>
              )}
            </DependencyList>
          </div>
          <div>
            <Question>카테고리 설정하기</Question>
            <ChoiceRow>
              {sortCategories(categories).map(category => (
                <Selection
                  key={category.categoryId}
                  name="category"
                  value={category.categoryId}
                  checked={categoryId === category.categoryId}
                  onChange={() => setCategoryId(category.categoryId)}
                  label={category.name}
                />
              ))}
            </ChoiceRow>
            <Question>그룹 안 공개 범위 설정하기 {"*"}</Question>
            <ChoiceRow>
              <Selection
                name="visibility"
                checked={visibility === "GROUP"}
                onChange={() => setVisibility("GROUP")}
                label="전체 공개"
              />
              {/* 일부 공개는 MVP 이후 활성화 */}
              <Selection
                name="visibility"
                checked={visibility === "PRIVATE"}
                onChange={() => setVisibility("PRIVATE")}
                label="비밀"
              />
            </ChoiceRow>
            {!selectedCategory || !isHobbyCategory(selectedCategory) ? (
              <>
                <Question>중요도(우선순위) 설정하기 {"*"}</Question>
                <ChoiceRow>
                  {(
                    [
                      ["NONE", "선택하지 않음"],
                      ["HIGH", "높음"],
                      ["LOW", "낮음"],
                    ] as const
                  ).map(([value, label]) => (
                    <Selection
                      key={value}
                      name="importance"
                      checked={importance === value}
                      onChange={() => setImportance(value)}
                      label={label}
                    />
                  ))}
                </ChoiceRow>
              </>
            ) : null}
            <Question>마감기한 설정하기 {"*"}</Question>
            <Button type="button" onClick={() => setDeadlineOpen(true)}>
              📅 {formatDeadline(deadline)}
            </Button>
            <ButtonStack>
              <Button onClick={() => setRoutineOpen(true)}>루틴으로 등록하기</Button>
              <Button variant="primary" disabled={busy || !title.trim() || !categoryId} onClick={submit}>
                {busy ? "등록 중..." : todo ? "할 일 수정하기" : "할 일 등록하기"}
              </Button>
            </ButtonStack>
            {error ? <ErrorText>{error}</ErrorText> : null}
          </div>
        </FormGrid>
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
        initialDate={selectedDate}
        onClose={() => setRoutineOpen(false)}
        onRegister={async value => {
          setBusy(true);
          setError("");
          try {
            const suffix = value.time ? `${detail.trim()} ${value.time}`.trim() : detail;
            for (const date of buildRoutineDates(value.start, value.end, value.repeat)) {
              await submitOne(withOptionalTime(date, value.time), true, suffix);
            }
            setRoutineOpen(false);
            onSaved?.();
            onClose();
          } catch (reason) {
            setError(errorMessage(reason));
          } finally {
            setBusy(false);
          }
        }}
      />
    </>
  );
};
const Question = styled.h3`
  font-size: 15px;
  margin: 28px 0 12px;
`;
const DependencyList = styled.div`
  display: grid;
  gap: 12px;
  label {
    display: flex;
    align-items: center;
    gap: 10px;
    cursor: pointer;
  }
  input {
    position: absolute;
    opacity: 0;
  }
  i {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    border: 2px solid;
    display: block;
  }
  small {
    color: ${theme.colors.muted};
  }
`;

export const DependencyBlockModal = ({
  todos,
  open,
  onClose,
}: {
  todos: Todo[];
  open: boolean;
  onClose: () => void;
}) => (
  <Modal open={open} title="먼저 완료해야 할 일이 있어요" onClose={onClose}>
    <p>아래 할 일을 모두 완료한 뒤 다시 체크해 주세요.</p>
    <BlockList>
      {todos.map(todo => (
        <li key={todo.todoId}>{todo.title}</li>
      ))}
    </BlockList>
    <ButtonStack>
      <Button variant="primary" onClick={onClose}>
        확인
      </Button>
    </ButtonStack>
  </Modal>
);
const BlockList = styled.ul`
  margin: 22px 0;
  padding: 18px 38px;
  border-radius: 14px;
  background: #f7f9fb;
  li + li {
    margin-top: 8px;
  }
`;

export const CategorySection = ({
  category,
  index,
  todos,
  own,
  onAdd,
  onManage,
  onToggle,
  onEdit,
}: {
  category: Category;
  index: number;
  todos: Todo[];
  own: boolean;
  onAdd: (category: Category) => void;
  onManage: (category: Category) => void;
  onToggle: (todo: Todo) => void;
  onEdit: (todo: Todo) => void;
}) => {
  const tone = categoryToneAt(index);
  return (
    <CategoryColumn>
      <CategoryPill
        name={category.name}
        tone={tone}
        own={own}
        onAdd={own ? () => onAdd(category) : undefined}
        onManage={own && index > 0 && index < 3 ? () => onManage(category) : undefined}
      />
      <TodoList>
        <TodoRows todos={todos} tone={tone} own={own} onToggle={onToggle} onEdit={onEdit} />
      </TodoList>
    </CategoryColumn>
  );
};
// Kept separate so each row receives stable action closures.
const TodoRows = ({
  todos,
  tone,
  own,
  onToggle,
  onEdit,
}: {
  todos: Todo[];
  tone: CategoryTone;
  own: boolean;
  onToggle: (todo: Todo) => void;
  onEdit: (todo: Todo) => void;
}) => (
  <>
    {todos.map(todo => (
      <SharedTodoRow
        key={todo.todoId}
        todo={todo}
        tone={tone}
        own={own}
        onToggle={() => onToggle(todo)}
        onEdit={() => onEdit(todo)}
      />
    ))}
  </>
);
const CategoryColumn = styled.section`
  min-width: 0;
`;
const TodoList = styled.div`
  display: grid;
  gap: 14px;
  margin-top: 20px;
`;
