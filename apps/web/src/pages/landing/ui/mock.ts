import type { Todo } from "@/shared/api";

/** 랜딩의 목업이 쓰는 예시 할 일. 서버와는 아무 상관이 없습니다. */
const base: Todo = {
  todoId: 0,
  userId: 0,
  title: "",
  description: "",
  categoryId: 0,
  startDate: "2026-10-22",
  dueDate: "2026-10-22",
  time: null,
  timezone: "Asia/Seoul",
  importance: "NONE",
  hardship: 1,
  x: 0,
  y: 0,
  isRoutine: false,
  routineId: null,
  isCompleted: false,
  subtasks: [],
  dependencies: [],
  createdAt: null,
  completedAt: null,
};

const make = (todoId: number, patch: Partial<Todo>): Todo => ({ ...base, todoId, ...patch });

export const MOCK_TODOS = {
  report: make(1, { title: "기획서 초안 쓰기", description: "목차부터 정리하기", importance: "HIGH" }),
  review: make(2, { title: "디자인 시안 검토", importance: "LOW", isRoutine: true, dependencies: [1] }),
  slides: make(3, { title: "발표 자료 만들기", dependencies: [1] }),
  vocab: make(4, { title: "영어 단어 외우기", isCompleted: true }),
  gym: make(5, { title: "운동 30분", isRoutine: true, isCompleted: true }),
} as const;
