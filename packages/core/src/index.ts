import type { Category, Diary, Importance, Todo } from "@tlitodos/types";

export const CATEGORY_PRESETS = [
  {
    key: "todo",
    name: "해야할 일",
    background: "#f4fce6",
    color: "#ddf5b0",
    stash: "#effad9",
    strong: "#92e000",
    locked: true,
  },
  {
    key: "custom1",
    name: "카테고리 추가 1",
    background: "#e6f9f2",
    color: "#b0ecd8",
    stash: "#d9f6ec",
    strong: "#00c281",
    locked: false,
  },
  {
    key: "custom2",
    name: "카테고리 추가 2",
    background: "#e6f6e8",
    color: "#b0e4b9",
    stash: "#d9f2dd",
    strong: "#00a81c",
    locked: false,
  },
  {
    key: "hobby",
    name: "취미",
    background: "#e6fcfa",
    color: "#b0f5f1",
    stash: "#d9faf8",
    strong: "#00e0d1",
    locked: true,
  },
] as const;

export type CategoryTone = (typeof CATEGORY_PRESETS)[number]["key"];

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
  const leading = (first.getDay() + 6) % 7;
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
