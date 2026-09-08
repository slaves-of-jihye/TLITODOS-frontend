import { createContext, useCallback, useContext, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ApiClient } from "@tlitodos/api-client";
import type {
  Category,
  CategoryRequest,
  DiaryCreateRequest,
  DiaryPatchRequest,
  GroupCreateRequest,
  GroupJoinRequest,
  TodoCreateRequest,
  Diary,
  Todo,
  TodoPatchRequest,
  User,
  UserFontUpdateRequest,
  UserUpdateRequest,
} from "@tlitodos/types";

const ApiContext = createContext<ApiClient | null>(null);
export const ApiProvider = ApiContext.Provider;
export const useApi = () => {
  const api = useContext(ApiContext);
  if (!api) throw new Error("ApiProvider가 필요합니다.");
  return api;
};

export const queryKeys = {
  me: ["me"] as const,
  groups: ["groups"] as const,
  group: (id: number) => ["groups", id] as const,
  categories: ["categories"] as const,
  categoryList: (groupId: number | null, userId: number | null) => ["categories", groupId, userId] as const,
  todos: (groupId: number | null, userId: number | null, date: string | null) =>
    ["todos", groupId, userId, date] as const,
  /**
   * 달별 요약은 `["todos", ...]` 밑에 두지 않습니다.
   *
   * `writeBack.todos`가 `["todos"]` 접두사로 캐시를 훑어 `Todo[]`로 고치기 때문에,
   * 모양이 다른 이 응답이 같은 접두사에 있으면 망가집니다.
   */
  dailyStatus: (month: string) => ["todos-daily-status", month] as const,
  diaries: ["diaries"] as const,
};

/**
 * 무효화를 걸되 기다리지 않습니다.
 *
 * `onSuccess`가 프로미스를 돌려주면 TanStack은 그것이 끝나야 `mutateAsync`를
 * resolve합니다. 그러면 모달이 닫히는 시점 같은 화면 전환이 목록 재요청 왕복만큼
 * 밀립니다. 갱신은 뒤에서 돌게 두고, 그 사이 낡은 값이 보이면 안 되는 곳은
 * 아래 `writeBack`으로 응답을 캐시에 먼저 반영합니다.
 */
const useDetachedInvalidate = () => {
  const cache = useQueryClient();
  return useCallback(
    (queryKey: readonly unknown[]) => {
      void cache.invalidateQueries({ queryKey });
    },
    [cache],
  );
};

/** 응답으로 캐시를 먼저 고쳐, 재요청이 돌아오기 전에도 화면이 맞게 보이도록 합니다. */
const useWriteBack = () => {
  const cache = useQueryClient();
  return useMemo(
    () => ({
      me: (patch: Partial<User>) =>
        cache.setQueryData<User>(queryKeys.me, previous => (previous ? { ...previous, ...patch } : previous)),
      todos: (update: (todos: Todo[]) => Todo[]) =>
        cache.setQueriesData<Todo[]>({ queryKey: ["todos"] }, previous => (previous ? update(previous) : previous)),
      categories: (update: (categories: Category[]) => Category[]) =>
        cache.setQueriesData<Category[]>({ queryKey: queryKeys.categories }, previous =>
          previous ? update(previous) : previous,
        ),
      diaries: (update: (diaries: Diary[]) => Diary[]) =>
        cache.setQueryData<Diary[]>(queryKeys.diaries, previous => (previous ? update(previous) : previous)),
    }),
    [cache],
  );
};

export const useMe = (enabled = true) => {
  const api = useApi();
  return useQuery({ queryKey: queryKeys.me, queryFn: api.users.me, enabled });
};

export const useGroups = (enabled = true) => {
  const api = useApi();
  return useQuery({ queryKey: queryKeys.groups, queryFn: api.groups.list, enabled });
};

export const useGroup = (groupId: number | null, enabled = true) => {
  const api = useApi();
  return useQuery({
    queryKey: queryKeys.group(groupId ?? -1),
    queryFn: () => api.groups.get(groupId!),
    enabled: enabled && groupId !== null,
  });
};

export const useCategories = (groupId: number | null = null, userId: number | null = null, enabled = true) => {
  const api = useApi();
  return useQuery({
    queryKey: queryKeys.categoryList(groupId, userId),
    queryFn: () => api.categories.list({ groupId, userId }),
    enabled,
  });
};

export const useTodos = (groupId: number | null, date: string | null, userId: number | null = null, enabled = true) => {
  const api = useApi();
  return useQuery({
    queryKey: queryKeys.todos(groupId, userId, date),
    queryFn: () => api.todos.list({ groupId, userId, date }),
    enabled,
  });
};

/**
 * 달력에 쓰는 달별 요약입니다. `month`는 `YYYY-MM`입니다.
 *
 * 서버가 로그인한 사용자의 할 일만 세므로 남의 달력에는 쓸 수 없습니다. 그쪽은
 * 이미 받아 둔 목록으로 `buildDailyStatuses`가 같은 모양을 만들어 씁니다.
 */
export const useDailyTodoStatuses = (month: string | null, enabled = true) => {
  const api = useApi();
  return useQuery({
    queryKey: queryKeys.dailyStatus(month ?? ""),
    queryFn: () => api.todos.dailyStatus(month!),
    enabled: enabled && month !== null,
  });
};

export const useDiaries = (enabled = true) => {
  const api = useApi();
  return useQuery({ queryKey: queryKeys.diaries, queryFn: api.diaries.list, enabled });
};

export const useCreateGroup = () => {
  const api = useApi();
  const invalidate = useDetachedInvalidate();
  return useMutation({
    mutationFn: (body: GroupCreateRequest) => api.groups.create(body),
    onSuccess: () => invalidate(queryKeys.groups),
  });
};
export const useJoinGroup = () => {
  const api = useApi();
  const invalidate = useDetachedInvalidate();
  return useMutation({
    mutationFn: (body: GroupJoinRequest) => api.groups.join(body),
    onSuccess: () => invalidate(queryKeys.groups),
  });
};
export const useRemoveGroupMember = (groupId: number | null) => {
  const api = useApi();
  const invalidate = useDetachedInvalidate();
  return useMutation({
    mutationFn: (userId: number) => api.groups.removeMember(groupId!, userId),
    onSuccess: () => {
      invalidate(queryKeys.group(groupId ?? -1));
      invalidate(queryKeys.groups);
    },
  });
};
/** 그룹장만 지울 수 있습니다. 그룹장이 아니면 서버가 403으로 거절합니다. */
export const useDeleteGroup = () => {
  const api = useApi();
  const invalidate = useDetachedInvalidate();
  return useMutation({
    mutationFn: (groupId: number) => api.groups.remove(groupId),
    onSuccess: (_result, groupId) => {
      invalidate(queryKeys.group(groupId));
      invalidate(queryKeys.groups);
    },
  });
};
export const useUpdateProfile = () => {
  const api = useApi();
  const invalidate = useDetachedInvalidate();
  const writeBack = useWriteBack();
  return useMutation({
    mutationFn: (body: UserUpdateRequest | FormData) => api.users.updateMe(body),
    onSuccess: ({ name, bio, profileImageUrl }) => {
      writeBack.me({ name, bio, profileImageUrl });
      invalidate(queryKeys.me);
    },
  });
};
export const useUpdateFont = () => {
  const api = useApi();
  const invalidate = useDetachedInvalidate();
  const writeBack = useWriteBack();
  return useMutation({
    mutationFn: (body: UserFontUpdateRequest) => api.users.updateFont(body),
    onSuccess: ({ font }) => {
      writeBack.me({ font });
      invalidate(queryKeys.me);
    },
  });
};
export const useCreateCategory = () => {
  const api = useApi();
  const invalidate = useDetachedInvalidate();
  return useMutation({
    mutationFn: (body: CategoryRequest) => api.categories.create(body),
    onSuccess: () => invalidate(queryKeys.categories),
  });
};
export const useUpdateCategory = () => {
  const api = useApi();
  const invalidate = useDetachedInvalidate();
  const writeBack = useWriteBack();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: CategoryRequest }) => api.categories.update(id, body),
    onSuccess: updated => {
      writeBack.categories(categories =>
        categories.map(category =>
          category.categoryId === updated.categoryId ? { ...category, ...updated } : category,
        ),
      );
      invalidate(queryKeys.categories);
    },
  });
};
/**
 * 할 일 목록 전체를 무효화합니다.
 *
 * 여러 건을 잇달아 저장하는 화면(루틴 등록)은 저장마다 무효화하면 목록을 그
 * 횟수만큼 다시 받습니다. 그런 곳은 `invalidate: false`로 끄고 마지막에 이걸
 * 한 번 부릅니다.
 */
export const useInvalidateTodos = () => {
  const invalidate = useDetachedInvalidate();
  return useCallback(() => {
    invalidate(["todos"]);
    invalidate(["todos-daily-status"]);
  }, [invalidate]);
};

type MutationOptions = { invalidate?: boolean };

export const useCreateTodo = ({ invalidate = true }: MutationOptions = {}) => {
  const api = useApi();
  const invalidateTodos = useInvalidateTodos();
  return useMutation({
    mutationFn: (body: TodoCreateRequest) => api.todos.create(body),
    onSuccess: invalidate ? () => invalidateTodos() : undefined,
  });
};
export const useUpdateTodo = ({ invalidate = true }: MutationOptions = {}) => {
  const api = useApi();
  const invalidateTodos = useInvalidateTodos();
  const writeBack = useWriteBack();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: TodoPatchRequest }) => api.todos.update(id, body),
    onSuccess: saved => {
      // 고친 내용이 재요청 전까지 예전 값으로 보이지 않게 합니다.
      writeBack.todos(todos => todos.map(todo => (todo.todoId === saved.todoId ? saved : todo)));
      if (invalidate) invalidateTodos();
    },
  });
};
export const useDeleteTodo = () => {
  const api = useApi();
  const invalidate = useDetachedInvalidate();
  const writeBack = useWriteBack();
  return useMutation({
    mutationFn: (id: number) => api.todos.remove(id),
    onSuccess: (_result, id) => {
      // 재요청이 돌아오기 전까지 지운 할 일이 남아 보이지 않게 먼저 걷어냅니다.
      writeBack.todos(todos => todos.filter(todo => todo.todoId !== id));
      invalidate(["todos"]);
      invalidate(["todos-daily-status"]);
    },
  });
};
/**
 * 완료/해제는 다른 mutation과 달리 무효화를 기다립니다.
 *
 * `useTodoCompletion`이 성공 시점에 낙관적 override를 걷어내고 서버 값을 다시
 * 믿기 때문입니다. 기다리지 않으면 갱신된 목록이 도착하기 전에 override가 사라져
 * 체크가 잠깐 되돌아가 보입니다.
 */
export const useCompleteTodo = () => {
  const api = useApi();
  const cache = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.todos.complete(id),
    onSuccess: () =>
      Promise.all([
        cache.invalidateQueries({ queryKey: ["todos"] }),
        cache.invalidateQueries({ queryKey: ["todos-daily-status"] }),
      ]),
  });
};
export const useUncompleteTodo = () => {
  const api = useApi();
  const cache = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.todos.uncomplete(id),
    onSuccess: () =>
      Promise.all([
        cache.invalidateQueries({ queryKey: ["todos"] }),
        cache.invalidateQueries({ queryKey: ["todos-daily-status"] }),
      ]),
  });
};
export const useAddDependency = ({ invalidate = true }: MutationOptions = {}) => {
  const api = useApi();
  const invalidateTodos = useInvalidateTodos();
  return useMutation({
    mutationFn: ({ id, dependencyTodoId }: { id: number; dependencyTodoId: number }) =>
      api.todos.dependency(id, { dependencyTodoId }),
    onSuccess: invalidate ? () => invalidateTodos() : undefined,
  });
};
export const useSaveDiary = () => {
  const api = useApi();
  const invalidate = useDetachedInvalidate();
  const writeBack = useWriteBack();
  return useMutation({
    mutationFn: (payload: { id?: number; body: DiaryCreateRequest | DiaryPatchRequest | FormData }) =>
      payload.id
        ? api.diaries.update(payload.id, payload.body as DiaryPatchRequest)
        : api.diaries.create(payload.body as DiaryCreateRequest | FormData),
    onSuccess: saved => {
      writeBack.diaries(diaries =>
        diaries.some(diary => diary.diaryId === saved.diaryId)
          ? diaries.map(diary => (diary.diaryId === saved.diaryId ? saved : diary))
          : [...diaries, saved],
      );
      invalidate(queryKeys.diaries);
    },
  });
};
