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
  },
  {
    key: "custom1",
    name: "카테고리 추가 1",
    strong: "#ff00a2",
  },
  {
    key: "custom2",
    name: "카테고리 추가 2",
    strong: "#ff8cb6",
  },
  {
    key: "hobby",
    name: "취미",
    strong: "#ff3959",
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

export const categoryToneAt = (index: number): CategoryTone => CATEGORY_PRESETS[Math.min(index, 3)]?.key ?? "custom2";

/**
 * 표시 순서. 첫 칸이 `해야할 일`, 마지막 칸이 `취미` 자리입니다.
 *
 * 자리는 이름이 아니라 서버가 준 값으로 정합니다 — 네 카테고리 모두 이름을 바꿀
 * 수 있어서, 이름으로 자리를 찾으면 `해야할 일`을 `숙제`로 고치는 순간 그 칸이
 * 사라져 버립니다. 서버가 지우지 못하게 잠근 카테고리(`isDeletable: false`)가
 * 취미 자리이고, 나머지는 만든 순서(`categoryId`)대로 앞에서 채웁니다. 잠긴
 * 카테고리가 없는 계정은 만든 순서가 곧 표시 순서입니다 — 그때는 취미를 마지막에
 * 만들었기 때문입니다.
 */
export const sortCategories = (categories: Category[]) => {
  const byId = [...categories].sort((left, right) => left.categoryId - right.categoryId);
  return [...byId.filter(category => category.isDeletable), ...byId.filter(category => !category.isDeletable)];
};

const importanceRank: Record<Importance, number> = { HIGH: 0, LOW: 1, NONE: 2 };

/**
 * 선행 할 일에서 몇 다리 건너에 있는지. 선행이 없으면 0입니다.
 *
 * `dependencies`는 이 할 일보다 먼저 끝내야 하는 할 일들이므로, 깊이가 얕은
 * 것부터 놓으면 위에서 아래로 순서대로 해 나갈 수 있습니다. 여러 선행이 있으면
 * 가장 깊은 쪽을 따릅니다.
 *
 * 서버가 순환을 막지만, 막지 못한 값이 와도 멈추도록 지나온 자리를 기억합니다.
 */
const dependencyDepths = (todos: Todo[]) => {
  const byId = new Map(todos.map(todo => [todo.todoId, todo]));
  const depths = new Map<number, number>();
  const depthOf = (todo: Todo, walked: Set<number>): number => {
    const known = depths.get(todo.todoId);
    if (known !== undefined) return known;
    if (walked.has(todo.todoId)) return 0;
    walked.add(todo.todoId);
    const depth = todo.dependencies.reduce((deepest, id) => {
      const prerequisite = byId.get(id);
      return prerequisite ? Math.max(deepest, depthOf(prerequisite, walked) + 1) : deepest;
    }, 0);
    walked.delete(todo.todoId);
    depths.set(todo.todoId, depth);
    return depth;
  };
  todos.forEach(todo => depthOf(todo, new Set()));
  return depths;
};

/**
 * 목록 순서: 선행 할 일 -> 중요도 -> 만든 순서.
 *
 * 선행이 중요도보다 앞섭니다. 선행이 남아 있으면 완료 자체가 막히므로
 * (`DependencyBlockModal`), 지금 할 수 있는 것이 위에 있어야 합니다.
 *
 * `graph`는 선행 관계를 어디까지 보고 셀지입니다. 카테고리 칸마다 나눠 부르지만
 * 선행은 다른 칸의 할 일일 수도 있어, 그 날 목록 전체를 넘겨야 다른 칸에 막힌
 * 할 일도 아래로 내려갑니다.
 */
export const sortTodos = (todos: Todo[], graph: Todo[] = todos) => {
  const depths = dependencyDepths(graph);
  return [...todos].sort(
    (left, right) =>
      (depths.get(left.todoId) ?? 0) - (depths.get(right.todoId) ?? 0) ||
      importanceRank[left.importance] - importanceRank[right.importance] ||
      left.todoId - right.todoId,
  );
};

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

/** 씨앗에서 여러 다리 건너까지 따라가 모읍니다. 순환이 와도 한 번 담은 자리는 다시 밟지 않습니다. */
const reachableFrom = (seeds: Iterable<number>, step: (id: number) => Iterable<number>) => {
  const found = new Set<number>();
  const queue = [...seeds];
  while (queue.length) {
    const id = queue.pop()!;
    if (found.has(id)) continue;
    found.add(id);
    for (const next of step(id)) queue.push(next);
  }
  return found;
};

/** 이 할 일들이 여러 다리 건너서라도 선행으로 필요로 하는 할 일. 자기 자신은 담지 않습니다. */
export const prerequisiteIds = (todos: Todo[], ids: number[]) => {
  const byId = new Map(todos.map(todo => [todo.todoId, todo]));
  const dependenciesOf = (id: number) => byId.get(id)?.dependencies ?? [];
  return reachableFrom(ids.flatMap(dependenciesOf), dependenciesOf);
};

/** 이 할 일을 여러 다리 건너서라도 선행으로 필요로 하는 할 일 — 후행입니다. */
export const dependentIds = (todos: Todo[], todoId: number) => {
  const followers = new Map<number, number[]>();
  todos.forEach(todo =>
    todo.dependencies.forEach(id => followers.set(id, [...(followers.get(id) ?? []), todo.todoId])),
  );
  const followersOf = (id: number) => followers.get(id) ?? [];
  return reachableFrom(followersOf(todoId), followersOf);
};

/**
 * 선행 할 일로 고를 수 있는 후보.
 *
 * 그 날에 걸쳐 있는 할 일이면 카테고리는 가리지 않습니다 — 취미 할 일도 고를 수
 * 있습니다. 다음 두 가지만 빼놓습니다.
 *
 * 1. 이 할 일의 후행 — 저쪽이 이미 이 할 일을 기다리고 있으므로, 반대로 걸면
 *    서로를 기다리는 고리가 됩니다.
 * 2. 이미 고른 선행이 다시 기다리는 할 일 — 여러 다리 건너서라도 이미 앞에
 *    놓이므로 또 고를 필요가 없습니다. `chosen`은 화면이 지금 고른 것을 넘기니
 *    고르는 즉시 목록에서 빠지고, 고른 것 자체는 눌린 채로 남습니다.
 */
export const dependencyCandidates = (
  todos: Todo[],
  todo: Pick<Todo, "todoId"> | null,
  date: string,
  chosen: number[],
) => {
  if (!todo) return [];
  const followers = dependentIds(todos, todo.todoId);
  const covered = prerequisiteIds(todos, chosen);
  // 고른 것은 눌린 채로 목록에 남아야 합니다 — 고리가 섞여 들어와 자기 조상이 되어도 그렇습니다.
  chosen.forEach(id => covered.delete(id));
  return todos.filter(
    candidate =>
      candidate.todoId !== todo.todoId &&
      coversDate(candidate, date) &&
      !followers.has(candidate.todoId) &&
      !covered.has(candidate.todoId),
  );
};

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
      // 그 카테고리에 끝낸 할 일이 하나라도 있으면 채워진 것으로 봅니다.
      day.categories.set(todo.categoryId, (day.categories.get(todo.categoryId) ?? false) || todo.isCompleted);
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

/** 달력 한 칸의 사분면 수. 카테고리도 최대 이만큼입니다. */
const STASH_SLOTS = 4;

/**
 * 문자열에서 뽑은 32비트 씨앗입니다. FNV-1a를 씁니다.
 *
 * 같은 날짜·같은 완료 상태면 늘 같은 값이 나와야 합니다. `Math.random()`을 쓰면
 * 리렌더마다 색이 바뀌어 깜박입니다.
 */
const seedFrom = (value: string) => {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
};

/** 씨앗 하나로 굴러가는 난수입니다(mulberry32). 같은 씨앗이면 같은 수열입니다. */
const randomFrom = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) >>> 0;
  let t = seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

/**
 * 달력 한 칸의 사분면 색을 정합니다. 언제나 네 칸을 돌려줍니다.
 *
 * `done`은 그 카테고리에 끝낸 할 일이 하나라도 있는지입니다 — 다 끝냈는지가
 * 아닙니다.
 *
 * 그 날 쓴 카테고리가 **모두** 채워졌으면 네 칸을 그 카테고리들에 남김없이 나눠
 * 줍니다. 몫(`4 / N`)만큼 고루 주고, 남는 칸은 서로 다른 카테고리에 하나씩
 * 얹습니다. 카테고리를 넷 다 쓰지 않은 날에도 회색이 남지 않게 하려는 것입니다.
 *
 * - N=4: 하나씩 (지금까지와 같음)
 * - N=3: 하나씩 준 뒤 남는 하나를 무작위 한 곳에 → (2,1,1)
 * - N=2: 둘씩 → (2,2)
 * - N=1: 그 색으로 네 칸 전부
 *
 * 아직 아무것도 끝내지 않은 카테고리가 있으면 나누지 않고, 채워진 카테고리만
 * 자기 칸을 칠하고 나머지는 빈 칸입니다. 남는 칸을 누가 가져갈지는 `seed`로
 * 정해, 채워진 카테고리가 그대로면 늘 같은 자리에 있습니다.
 */
export const stashFills = (marks: { accent: string; done: boolean }[], seed: string): (string | null)[] => {
  const slots = Array.from({ length: STASH_SLOTS }, () => null as string | null);
  if (!marks.length) return slots;

  const used = marks.slice(0, STASH_SLOTS);
  if (!used.every(mark => mark.done)) {
    return slots.map((_, index) => (used[index]?.done ? used[index]!.accent : null));
  }

  const count = used.length;
  const share = Math.floor(STASH_SLOTS / count);
  const spare = STASH_SLOTS % count;

  // 남는 칸을 받을 카테고리를 씨앗에 따라 고릅니다. 한 곳이 두 번 받지는 않습니다.
  const order = used.map((_, index) => index);
  const random = randomFrom(seedFrom(seed));
  for (let index = order.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [order[index], order[swap]] = [order[swap]!, order[index]!];
  }
  const extra = new Set(order.slice(0, spare));

  return used.flatMap((mark, index) => Array<string>(share + (extra.has(index) ? 1 : 0)).fill(mark.accent));
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
