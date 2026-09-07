import type { Category, Diary, Importance, Todo } from "@tlitodos/types";

/**
 * 카테고리 색. Figma `component` 프레임의 category 배리언트에서 읽었습니다.
 *
 * `strong`이 카테고리 색입니다. 이름표 글자, 완료 표시, 달력 점에 모두 쓰이고,
 * 달력 점과 완료 표시에는 80% 불투명도가 걸립니다. `color`는 카테고리를 만들 때
 * 서버에 저장하는 값입니다.
 *
 * Figma의 달력 점은 이름표와 다른 색을 쓰고 있지만, 한 카테고리에 색 하나로
 * 가기로 정했습니다.
 */
export const CATEGORY_PRESETS = [
  {
    key: "todo",
    name: "해야할 일",
    color: "#ffcfe1",
    strong: "#ff5e9a",
    locked: true,
  },
  {
    key: "custom1",
    name: "카테고리 추가 1",
    color: "#ffb3e3",
    strong: "#ff00a2",
    locked: false,
  },
  {
    key: "custom2",
    name: "카테고리 추가 2",
    color: "#ffdde9",
    strong: "#ff8cb6",
    locked: false,
  },
  {
    key: "hobby",
    name: "취미",
    color: "#ffc4cd",
    strong: "#ff3959",
    locked: true,
  },
] as const;

export type CategoryTone = (typeof CATEGORY_PRESETS)[number]["key"];

/**
 * 사용자가 고를 수 있는 폰트 목록.
 *
 * `key`는 백엔드 `users.font`에 저장되는 값이므로 서버 화이트리스트와 정확히
 * 같아야 합니다.
 *
 * 포맷이 폰트마다 다른 이유가 있습니다. 아래 세 폰트는 라이선스가 파일 수정을
 * 금지하고 있어 원본 포맷 그대로 서빙합니다. WOFF2 변환과 서브셋 모두 "수정"에
 * 해당하니 최적화 목적으로도 건드리면 안 됩니다.
 * - Kyobo Handwriting 2019: "수정 및 변경(디지털 포맷 변경)" 명시적 금지
 * - Goyang: 변형 후 재배포 금지
 * - Griun Fromsol: 폰트파일 개작·수정 금지
 * 나머지 셋은 OFL이라 변환이 가능하지만, 전송 단계의 brotli 압축이 WOFF2와
 * 거의 같은 크기를 내므로 굳이 포맷을 섞지 않고 원본으로 통일했습니다.
 */
export const FONT_PRESETS = [
  {
    key: "KYOBO_HANDWRITING_2019",
    label: "교보 손글씨 2019",
    family: "Kyobo Handwriting 2019",
    file: "KyoboHandwriting2019.otf",
    format: "opentype",
  },
  {
    key: "PRETENDARD",
    label: "프리텐다드",
    family: "Pretendard",
    file: "Pretendard.otf",
    format: "opentype",
  },
  {
    key: "CAFE24_SSURROUND_AIR",
    label: "카페24 써라운드 에어",
    family: "Cafe24 Ssurround Air",
    file: "Cafe24SsurroundAir.otf",
    format: "opentype",
  },
  {
    key: "GOYANG",
    label: "고양체",
    family: "Goyang",
    file: "Goyang.otf",
    format: "opentype",
  },
  {
    key: "PAPERLOGY",
    label: "페이퍼로지",
    family: "Paperlogy",
    file: "Paperlogy.ttf",
    format: "truetype",
  },
  {
    key: "GRIUN_FROMSOL",
    label: "그리운 프롬솔",
    family: "Griun Fromsol",
    file: "GriunFromsol.ttf",
    format: "truetype",
  },
] as const;

export type FontKey = (typeof FONT_PRESETS)[number]["key"];
export type FontPreset = (typeof FONT_PRESETS)[number];

export const DEFAULT_FONT_KEY: FontKey = "PRETENDARD";
const DEFAULT_FONT = FONT_PRESETS.find(preset => preset.key === DEFAULT_FONT_KEY) ?? FONT_PRESETS[0];
const FONT_FALLBACK_STACK = "system-ui, sans-serif";

/** 목록에 없는 값(서버가 모르는 키를 주거나 폰트가 제거된 경우)은 기본 폰트로 떨어집니다. */
export const resolveFont = (key: string | null | undefined): FontPreset =>
  FONT_PRESETS.find(preset => preset.key === key) ?? DEFAULT_FONT;

/** CSS `font-family` 값으로 그대로 쓸 수 있는 문자열입니다. */
export const fontFamilyStack = (key: string | null | undefined) =>
  `"${resolveFont(key).family}", ${FONT_FALLBACK_STACK}`;

export const formatLocalDate = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

export const parseLocalDate = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year ?? 0, (month ?? 1) - 1, day ?? 1);
};

export const dateOnly = (value: string | null | undefined) => value?.slice(0, 10) ?? null;
export const sameLocalDate = (left: string | null | undefined, right: string) => dateOnly(left) === right;

export const addMonths = (date: Date, amount: number) => new Date(date.getFullYear(), date.getMonth() + amount, 1);

export const getCalendarDays = (viewDate: Date) => {
  const first = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  const last = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0);
  // 디자인의 달력은 일요일에서 시작합니다.
  const leading = first.getDay();
  return [
    ...Array.from({ length: leading }, () => null),
    ...Array.from(
      { length: last.getDate() },
      (_, index) => new Date(viewDate.getFullYear(), viewDate.getMonth(), index + 1),
    ),
  ];
};

export const getTodoTitle = (selectedDate: string, today = formatLocalDate(new Date())) => {
  if (selectedDate === today) return "오늘의 TODO!";
  const date = parseLocalDate(selectedDate);
  const weekday = ["일", "월", "화", "수", "목", "금", "토"][date.getDay()];
  return `${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")} ${weekday}요일의 TODO!`;
};

const normalizeName = (value: string) => value.trim().replace(/\s+/g, "");
export const isTodoCategory = (category: Pick<Category, "name">) =>
  ["해야할일", "할일", "과제"].includes(normalizeName(category.name));
export const isHobbyCategory = (category: Pick<Category, "name">) => normalizeName(category.name) === "취미";
export const isLockedCategory = (category: Pick<Category, "name">) =>
  isTodoCategory(category) || isHobbyCategory(category);

export const categoryToneAt = (index: number): CategoryTone => CATEGORY_PRESETS[Math.min(index, 3)]?.key ?? "custom2";

export const sortCategories = (categories: Category[]) => {
  const customs = categories.filter(item => !isLockedCategory(item));
  const todo = categories.find(isTodoCategory);
  const hobby = categories.find(isHobbyCategory);
  return [todo, ...customs.slice(0, 2), hobby].filter((item): item is Category => Boolean(item));
};

const importanceRank: Record<Importance, number> = { HIGH: 0, LOW: 1, NONE: 2 };
export const sortTodos = (todos: Todo[]) =>
  [...todos].sort((a, b) => importanceRank[a.importance] - importanceRank[b.importance] || a.todoId - b.todoId);

export const todosForDate = (todos: Todo[], selectedDate: string) =>
  todos.filter(todo => sameLocalDate(todo.dueDate, selectedDate));

export const unresolvedDependencies = (todo: Todo, allTodos: Todo[]) =>
  todo.dependencies
    .map(id => allTodos.find(candidate => candidate.todoId === id))
    .filter((candidate): candidate is Todo => Boolean(candidate && !candidate.isCompleted));

export type RoutineRepeat = "DAILY" | "WEEKLY" | "WEEKDAYS";
export const buildRoutineDates = (start: string, end: string, repeat: RoutineRepeat) => {
  const dates: string[] = [];
  const cursor = parseLocalDate(start);
  const last = parseLocalDate(end);
  while (cursor <= last) {
    const day = cursor.getDay();
    if (
      repeat === "DAILY" ||
      (repeat === "WEEKLY" && day === parseLocalDate(start).getDay()) ||
      (repeat === "WEEKDAYS" && day > 0 && day < 6)
    ) {
      dates.push(formatLocalDate(cursor));
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
};

export const withOptionalTime = (date: string, time?: string) => (time ? `${date}T${time}:00` : date);
export const isInviteCode = (value: string) => /^[a-z0-9]{8}$/.test(value);

const TODO_DETAIL_SEPARATOR = "\n";
export const splitTodoContent = (value: string) => {
  const [title = "", ...detail] = value.split(TODO_DETAIL_SEPARATOR);
  return { title, detail: detail.join(TODO_DETAIL_SEPARATOR) };
};
export const composeTodoContent = (title: string, detail?: string) =>
  detail?.trim() ? `${title.trim()}${TODO_DETAIL_SEPARATOR}${detail.trim()}` : title.trim();

const DIARY_DATE_PREFIX = "__TLITODOS_DATE__:";
export const composeDiaryContent = (date: string, content: string) => `${DIARY_DATE_PREFIX}${date}\n${content.trim()}`;
export const splitDiaryContent = (content: string) =>
  content.startsWith(DIARY_DATE_PREFIX)
    ? {
        date: content.slice(DIARY_DATE_PREFIX.length, DIARY_DATE_PREFIX.length + 10),
        content: content.slice(DIARY_DATE_PREFIX.length + 11),
      }
    : { date: null, content };

export const diaryDate = (diary: Pick<Diary, "content" | "createdAt">) =>
  splitDiaryContent(diary.content).date ?? dateOnly(diary.createdAt);

export const isDiaryForDate = (diary: Pick<Diary, "content" | "createdAt">, selectedDate: string) =>
  diaryDate(diary) === selectedDate;
