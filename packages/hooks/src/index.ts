import { createContext, useCallback, useContext } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ApiClient } from "@tlitodos/api-client";
import type {
  CategoryRequest,
  DiaryCreateRequest,
  DiaryPatchRequest,
  GroupCreateRequest,
  GroupJoinRequest,
  TodoCreateRequest,
  TodoPatchRequest,
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
  diaries: ["diaries"] as const,
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

export const useDiaries = (enabled = true) => {
  const api = useApi();
  return useQuery({ queryKey: queryKeys.diaries, queryFn: api.diaries.list, enabled });
};

export const useCreateGroup = () => {
  const api = useApi();
  const cache = useQueryClient();
  return useMutation({
    mutationFn: (body: GroupCreateRequest) => api.groups.create(body),
    onSuccess: () => cache.invalidateQueries({ queryKey: queryKeys.groups }),
  });
};
export const useJoinGroup = () => {
  const api = useApi();
  const cache = useQueryClient();
  return useMutation({
    mutationFn: (body: GroupJoinRequest) => api.groups.join(body),
    onSuccess: () => cache.invalidateQueries({ queryKey: queryKeys.groups }),
  });
};
export const useUpdateProfile = () => {
  const api = useApi();
  const cache = useQueryClient();
  return useMutation({
    mutationFn: (body: UserUpdateRequest | FormData) => api.users.updateMe(body),
    onSuccess: () => cache.invalidateQueries({ queryKey: queryKeys.me }),
  });
};
export const useUpdateFont = () => {
  const api = useApi();
  const cache = useQueryClient();
  return useMutation({
    mutationFn: (body: UserFontUpdateRequest) => api.users.updateFont(body),
    onSuccess: () => cache.invalidateQueries({ queryKey: queryKeys.me }),
  });
};
export const useCreateCategory = () => {
  const api = useApi();
  const cache = useQueryClient();
  return useMutation({
    mutationFn: (body: CategoryRequest) => api.categories.create(body),
    onSuccess: () => cache.invalidateQueries({ queryKey: queryKeys.categories }),
  });
};
export const useUpdateCategory = () => {
  const api = useApi();
  const cache = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: CategoryRequest }) => api.categories.update(id, body),
    onSuccess: () => cache.invalidateQueries({ queryKey: queryKeys.categories }),
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
  const cache = useQueryClient();
  return useCallback(() => cache.invalidateQueries({ queryKey: ["todos"] }), [cache]);
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
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: TodoPatchRequest }) => api.todos.update(id, body),
    onSuccess: invalidate ? () => invalidateTodos() : undefined,
  });
};
export const useDeleteTodo = () => {
  const api = useApi();
  const cache = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.todos.remove(id),
    onSuccess: () => cache.invalidateQueries({ queryKey: ["todos"] }),
  });
};
export const useCompleteTodo = () => {
  const api = useApi();
  const cache = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.todos.complete(id),
    onSuccess: () => cache.invalidateQueries({ queryKey: ["todos"] }),
  });
};
export const useUncompleteTodo = () => {
  const api = useApi();
  const cache = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.todos.uncomplete(id),
    onSuccess: () => cache.invalidateQueries({ queryKey: ["todos"] }),
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
  const cache = useQueryClient();
  return useMutation({
    mutationFn: (payload: { id?: number; body: DiaryCreateRequest | DiaryPatchRequest }) =>
      payload.id
        ? api.diaries.update(payload.id, payload.body as DiaryPatchRequest)
        : api.diaries.create(payload.body as DiaryCreateRequest),
    onSuccess: () => cache.invalidateQueries({ queryKey: queryKeys.diaries }),
  });
};
