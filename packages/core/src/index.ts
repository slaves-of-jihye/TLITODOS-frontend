import type { Category, DailyTodoStatus, Diary, Importance, Recurrence, Todo } from "@tlitodos/types";

/**
 * 카테고리 색. Figma `component` 프레임의 category 배리언트에서 읽었습니다.
 *
 * `strong`이 기본 강조색입니다. 카테고리를 처음 만들 때 서버에 이 값을 저장하고,
 * 이후에는 서버가 준 색(사용자가 프로필에서 고른 색)을 씁니다. 이름표 글자,
 * 완료 표시, 달력 점에 모두 쓰이고, 점과 완료 표시에는 80% 불투명도가 걸립니다.
 *
 * Figma의 달력 점은 이름표와 다른 색을 쓰고 있지만, 한 카테고리에 색 하나로
 * 가기로 정했습니다.
 */
export const CATEGORY_PRESETS = [
  {
    key: "todo",
    name: "해야할 일",
    strong: "#ff5e9a",
    locked: true,
  },
  {
    key: "custom1",
    name: "카테고리 추가 1",
    strong: "#ff00a2",
    locked: false,
  },
  {
    key: "custom2",
    name: "카테고리 추가 2",
    strong: "#ff8cb6",
    locked: false,
  },
  {
    key: "hobby",
    name: "취미",
    strong: "#ff3959",
    locked: true,
  },
] as const;

/**
 * 카테고리 색으로 고를 수 있는 색. Figma 프로필 화면의 팔레트(6×4)입니다.
 */
export const CATEGORY_SWATCHES = [
  "#ff5e9a",
  "#ff00a2",
  "#ff8cb6",
  "#ffaecc",
  "#ff60c5",
  "#ff3959",
  "#ffcc00",
  "#ff8b00",
  "#fd6100",
  "#c2d837",
  "#8bbc87",
  "#538d44",
  "#00e38a",
  "#00ddea",
  "#60a4e0",
  "#00a9f2",
  "#0078ff",
  "#0e58b0",
  "#c65efc",
  "#7d5bba",
  "#7e00b2",
  "#191919",
  "#7b959d",
  "#786f87",
] as const;

/**
 * 화면에 쓸 카테고리 강조색.
 *
 * 사용자가 프로필에서 색을 고를 수 있으므로 서버가 준 값이 먼저입니다. 값이
 * 없거나 색이 아니면 순서에 따른 기본 색으로 떨어집니다.
 */
export const categoryAccent = (color: string | null | undefined, index: number) =>
  /^#[0-9a-f]{3,8}$/i.test(color ?? "")
    ? (color as string)
    : (CATEGORY_PRESETS[Math.min(index, CATEGORY_PRESETS.length - 1)] ?? CATEGORY_PRESETS[0]).strong;

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

/** "2026년 5월 10일 일요일" 형태. 일기 화면의 날짜 표기입니다. */
export const formatLongKoreanDate = (value: string) => {
  const date = parseLocalDate(value);
  const weekday = ["일", "월", "화", "수", "목", "금", "토"][date.getDay()];
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 ${weekday}요일`;
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

/**
 * 기간 할 일은 시작일부터 마감일까지 모든 날에 나타납니다. 양끝을 포함하고,
 * 마감일이 없으면 시작일 하루만 차지합니다.
 */
export const coversDate = (todo: Pick<Todo, "startDate" | "dueDate">, date: string) => {
  const start = dateOnly(todo.startDate);
  if (!start) return false;
  const end = dateOnly(todo.dueDate) ?? start;
  return start <= date && date <= end;
};

export const todoDates = (todo: Pick<Todo, "startDate" | "dueDate">) => {
  const start = dateOnly(todo.startDate);
  if (!start) return [];
  const end = dateOnly(todo.dueDate) ?? start;
  if (end < start) return [start];
  const dates: string[] = [];
  const cursor = parseLocalDate(start);
  const last = parseLocalDate(end);
  while (cursor <= last) {
    dates.push(formatLocalDate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
};

export const todosForDate = (todos: Todo[], selectedDate: string) =>
  todos.filter(todo => coversDate(todo, selectedDate));

/** 달력에 쓰는 `YYYY-MM`. 서버의 daily-status가 이 형식만 받습니다. */
export const monthKey = (viewDate: Date) =>
  `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, "0")}`;

/**
 * 할 일 목록으로 서버의 daily-status와 같은 모양을 만듭니다.
 *
 * daily-status는 로그인한 사용자만 세므로 남의 달력에는 못 씁니다. 그쪽은 이미
 * 받아 둔 목록이 있으니 여기서 같은 모양으로 접어 UI가 한 갈래로 돌게 합니다.
 * 서버와 달리 할 일이 없는 날은 아예 담지 않습니다 — 찾지 못한 날은 빈 날로
 * 보면 되기 때문입니다.
 */
export const buildDailyStatuses = (todos: Todo[]): DailyTodoStatus[] => {
  const byDate = new Map<string, { incompleteCount: number; categories: Map<number, boolean> }>();
  for (const todo of todos) {
    // 기간 할 일은 걸친 날마다 한 번씩 셉니다. 완료 상태는 기간 전체가 하나입니다.
    for (const date of todoDates(todo)) {
      const day = byDate.get(date) ?? { incompleteCount: 0, categories: new Map<number, boolean>() };
      if (!todo.isCompleted) day.incompleteCount += 1;
      day.categories.set(todo.categoryId, (day.categories.get(todo.categoryId) ?? true) && todo.isCompleted);
      byDate.set(date, day);
    }
  }
  return [...byDate.entries()].map(([date, day]) => ({
    date,
    incompleteCount: day.incompleteCount,
    categoryStatuses: [...day.categories.entries()]
      .sort(([left], [right]) => left - right)
      .map(([categoryId, isCompleted]) => ({ categoryId, isCompleted })),
  }));
};

export const unresolvedDependencies = (todo: Todo, allTodos: Todo[]) =>
  todo.dependencies
    .map(id => allTodos.find(candidate => candidate.todoId === id))
    .filter((candidate): candidate is Todo => Boolean(candidate && !candidate.isCompleted));

/**
 * 루틴 반복 주기. Figma의 `modal / insert / routine`이 고르게 하는 다섯 가지입니다.
 *
 * 서버는 `frequency` + `interval` + `weekdays`로 받으므로, 화면의 다섯 갈래를
 * `toRecurrence`가 그 모양으로 옮깁니다. 격주는 `WEEKLY` + `interval: 2`입니다.
 * 반복 날짜는 서버가 펼치므로 프런트에서 날짜를 세지 않습니다.
 */
export type RoutineRepeat = "DAILY" | "WEEKLY" | "BIWEEKLY" | "MONTHLY" | "YEARLY";
export const ROUTINE_REPEATS: { key: RoutineRepeat; label: string }[] = [
  { key: "DAILY", label: "매일" },
  { key: "WEEKLY", label: "매주" },
  { key: "BIWEEKLY", label: "격주" },
  { key: "MONTHLY", label: "매월" },
  { key: "YEARLY", label: "매년" },
];

/** 서버의 요일 번호. 월=1 ~ 일=7이고, JS의 일요일 0은 7로 옮깁니다. */
export const WEEKDAYS: { value: number; label: string }[] = [
  { value: 1, label: "월" },
  { value: 2, label: "화" },
  { value: 3, label: "수" },
  { value: 4, label: "목" },
  { value: 5, label: "금" },
  { value: 6, label: "토" },
  { value: 7, label: "일" },
];
export const weekdayOf = (date: string) => parseLocalDate(date).getDay() || 7;

/** 요일을 고를 수 있는 주기만 요일 줄을 보여 줍니다. */
export const repeatUsesWeekdays = (repeat: RoutineRepeat) => repeat === "WEEKLY" || repeat === "BIWEEKLY";

export const toRecurrence = (repeat: RoutineRepeat, weekdays: number[]): Recurrence => {
  if (!repeatUsesWeekdays(repeat)) return { frequency: repeat === "DAILY" ? "DAILY" : repeat };
  return {
    frequency: "WEEKLY",
    interval: repeat === "BIWEEKLY" ? 2 : 1,
    // 서버가 중복을 걷어내고 정렬하지만, 재시도 본문이 같아야 하므로 여기서 맞춥니다.
    weekdays: [...new Set(weekdays)].sort((left, right) => left - right),
  };
};

export const isInviteCode = (value: string) => /^[a-z0-9]{8}$/.test(value);

/** 일기는 서버가 `date`를 들고 있습니다. 예전처럼 본문에 날짜를 심지 않습니다. */
export const diaryDate = (diary: Pick<Diary, "date" | "createdAt">) =>
  dateOnly(diary.date) ?? dateOnly(diary.createdAt);

export const isDiaryForDate = (diary: Pick<Diary, "date" | "createdAt">, selectedDate: string) =>
  diaryDate(diary) === selectedDate;
