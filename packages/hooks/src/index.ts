import { createContext, useCallback, useContext, useMemo } from "react";
import {
  useInfiniteQuery,
  useIsFetching,
  useIsMutating,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { ApiClient } from "@tlitodos/api-client";
import type {
  BetCreateRequest,
  BetStatusRequest,
  Category,
  CategoryPatchRequest,
  CategoryRequest,
  DiaryCreateRequest,
  DiaryPatchRequest,
  GroupCreateRequest,
  GroupJoinRequest,
  NotificationType,
  RoutineCreateRequest,
  RoutineScheduleRequest,
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
  dailyStatus: (month: string, groupId: number | null, userId: number | null) =>
    ["todos-daily-status", month, groupId, userId] as const,
  diaries: (date: string | null, groupId: number | null, userId: number | null) =>
    ["diaries", date, groupId, userId] as const,
  /** 한 건은 `["diaries"]` 밑에 두지 않습니다 — `writeBack.diaries`가 그 접두사를 `Diary[]`로 덮습니다. */
  diary: (id: number) => ["diary", id] as const,
  notifications: (type: NotificationType | null) => ["notifications", type] as const,
  /**
   * 종류별 안 읽음 표시. 일부러 `["notifications"]` 밑에 둡니다.
   *
   * 알림 캐시는 접두사로 모양을 고쳐 쓰는 `writeBack`이 없어, 같은 접두사를 나눠
   * 써도 안전합니다. 오히려 그래야 알림 하나를 읽었을 때 거는 무효화 한 번이
   * 목록과 표시를 함께 다시 받아 옵니다. `"unread-status"`는 알림 종류가 아니라
   * `notifications(type)`와 겹치지 않습니다.
   */
  notificationUnread: ["notifications", "unread-status"] as const,
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
        cache.setQueriesData<Diary[]>({ queryKey: ["diaries"] }, previous => (previous ? update(previous) : previous)),
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
 * `groupId`/`userId`를 주면 그 멤버의 달을 받아 옵니다. 요청자와 대상자가 같은
 * 그룹이어야 하고, 아니면 서버가 403으로 거절합니다.
 */
export const useDailyTodoStatuses = (
  month: string | null,
  { groupId = null, userId = null }: { groupId?: number | null; userId?: number | null } = {},
  enabled = true,
) => {
  const api = useApi();
  return useQuery({
    queryKey: queryKeys.dailyStatus(month ?? "", groupId, userId),
    queryFn: () => api.todos.dailyStatus(month!, { groupId, userId }),
    enabled: enabled && month !== null,
  });
};

/** 알림에서 받은 일기 한 건. 볼 수 없는 일기면 서버가 막고, 그 메시지를 그대로 보여 줍니다. */
export const useDiary = (diaryId: number | null) => {
  const api = useApi();
  return useQuery({
    queryKey: queryKeys.diary(diaryId ?? -1),
    queryFn: () => api.diaries.get(diaryId!),
    enabled: diaryId !== null,
  });
};

export const useDiaries = (
  {
    date = null,
    groupId = null,
    userId = null,
  }: { date?: string | null; groupId?: number | null; userId?: number | null } = {},
  enabled = true,
) => {
  const api = useApi();
  return useQuery({
    queryKey: queryKeys.diaries(date, groupId, userId),
    queryFn: () => api.diaries.list({ date, groupId, userId }),
    enabled,
  });
};

/**
 * 알림 목록. `type`을 주면 그 종류만 받습니다.
 *
 * 서버가 `nextCursor`로 이어 주므로 무한 스크롤 형태로 받아 둡니다. 화면은
 * `pages`를 이어 붙여 씁니다.
 */
export const useNotifications = (type: NotificationType | null = null, enabled = true) => {
  const api = useApi();
  return useInfiniteQuery({
    queryKey: queryKeys.notifications(type),
    queryFn: ({ pageParam }) => api.notifications.list({ type, cursor: pageParam }),
    initialPageParam: null as number | null,
    getNextPageParam: page => page.nextCursor,
    enabled,
  });
};

/**
 * 종류마다 안 읽은 알림이 남아 있는지.
 *
 * 목록은 고른 갈래만 받아 오므로, 다른 갈래에 안 읽은 것이 있는지는 목록으로 알
 * 수 없습니다. 이 한 번의 요청이 세 갈래를 모두 답해 주고, 읽음 상태는 건드리지
 * 않습니다.
 */
export const useNotificationUnreadStatus = (enabled = true) => {
  const api = useApi();
  return useQuery({
    queryKey: queryKeys.notificationUnread,
    queryFn: api.notifications.unreadStatus,
    enabled,
  });
};

export const useMarkNotificationRead = () => {
  const api = useApi();
  const invalidate = useDetachedInvalidate();
  return useMutation({
    mutationFn: (notificationId: number) => api.notifications.markRead(notificationId),
    onSuccess: () => invalidate(["notifications"]),
  });
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
/** 그룹장만 이름을 바꿀 수 있습니다. */
export const useRenameGroup = (groupId: number | null) => {
  const api = useApi();
  const invalidate = useDetachedInvalidate();
  return useMutation({
    mutationFn: (name: string) => api.groups.rename(groupId!, { name }),
    onSuccess: () => {
      invalidate(queryKeys.group(groupId ?? -1));
      invalidate(queryKeys.groups);
    },
  });
};
/** 여러 명을 한 번에 내보냅니다. 그룹장만 할 수 있습니다. */
export const useRemoveGroupMembers = (groupId: number | null) => {
  const api = useApi();
  const invalidate = useDetachedInvalidate();
  return useMutation({
    mutationFn: (userIds: number[]) => api.groups.removeMembers(groupId!, { userIds }),
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
    mutationFn: ({ id, body }: { id: number; body: CategoryPatchRequest }) => api.categories.update(id, body),
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

/**
 * 할 일 목록을 무효화하고, 새 목록이 실제로 도착할 때까지 기다립니다.
 *
 * `useInvalidateTodos`와 달리 프로미스를 돌려줍니다. 방금 만든 할 일이 목록에
 * 나타날 때까지 자리를 비워 두어야 하는 곳(인라인 추가)이 그 끝을 알아야 하기
 * 때문입니다. 화면 전환을 기다리게 하면 안 되는 곳은 그대로 무효화만 겁니다.
 */
export const useRefillTodos = () => {
  const cache = useQueryClient();
  return useCallback(
    () =>
      Promise.all([
        cache.invalidateQueries({ queryKey: ["todos"] }),
        cache.invalidateQueries({ queryKey: ["todos-daily-status"] }),
      ]),
    [cache],
  );
};

/**
 * 지금 서버와 주고받는 중인지.
 *
 * 쓰기(mutation)와 읽기(query)를 가리지 않고 셉니다. 쓰기는 끝나도 목록은 뒤에서
 * 다시 받아 오므로(`useDetachedInvalidate`), 둘을 하나로 묶어야 "저장이 끝나고
 * 화면에 반영되기까지"가 한 값으로 나옵니다. 화면 맨 위 진행 줄이 이걸로 켜집니다.
 */
export const useServerBusy = () => useIsMutating() + useIsFetching() > 0;

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
/** 선행 할 일을 통째로 바꿉니다. 빈 배열이면 모두 해제합니다. */
export const useSetDependencies = ({ invalidate = true }: MutationOptions = {}) => {
  const api = useApi();
  const invalidateTodos = useInvalidateTodos();
  return useMutation({
    mutationFn: ({ id, dependencyTodoIds }: { id: number; dependencyTodoIds: number[] }) =>
      api.todos.setDependencies(id, { dependencyTodoIds }),
    onSuccess: invalidate ? () => invalidateTodos() : undefined,
  });
};

/**
 * 루틴을 한 번의 요청으로 만듭니다.
 *
 * `requestId`는 화면이 만들어 넘깁니다 — 재시도는 같은 키와 같은 본문이어야
 * 중복이 생기지 않기 때문에, 훅이 매번 새로 뽑아서는 안 됩니다.
 */
export const useCreateRoutine = () => {
  const api = useApi();
  const invalidateTodos = useInvalidateTodos();
  return useMutation({
    mutationFn: (body: RoutineCreateRequest) => api.todos.createRoutine(body),
    onSuccess: () => invalidateTodos(),
  });
};

/** 이미 있는 할 일을 루틴으로 돌립니다. 원본이 첫 회차가 됩니다. */
export const useConvertToRoutine = () => {
  const api = useApi();
  const invalidateTodos = useInvalidateTodos();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: RoutineScheduleRequest }) => api.todos.convertToRoutine(id, body),
    onSuccess: () => invalidateTodos(),
  });
};

/** 완료한 회차와 원본까지 전부 지웁니다. 화면에서 전체 삭제임을 먼저 알립니다. */
export const useDeleteRoutine = () => {
  const api = useApi();
  const invalidateTodos = useInvalidateTodos();
  return useMutation({
    mutationFn: (routineId: number) => api.todos.removeRoutine(routineId),
    onSuccess: () => invalidateTodos(),
  });
};

/** 일기를 지웁니다. 목록에서 먼저 걷어내 사라진 일기가 남아 보이지 않게 합니다. */
export const useDeleteDiary = () => {
  const api = useApi();
  const invalidate = useDetachedInvalidate();
  const writeBack = useWriteBack();
  return useMutation({
    mutationFn: (diaryId: number) => api.diaries.remove(diaryId),
    onSuccess: (_result, diaryId) => {
      writeBack.diaries(diaries => diaries.filter(diary => diary.diaryId !== diaryId));
      invalidate(["diaries"]);
      invalidate(["diary", diaryId]);
    },
  });
};

/**
 * 친구의 할 일에 내기를 겁니다.
 *
 * 상대에게는 알림으로 갑니다. 목록은 그 알림이 이미 캐시에 있으니 함께 무효화해
 * 방금 건 내기가 바로 보이게 합니다.
 */
export const useCreateBet = () => {
  const api = useApi();
  const invalidate = useDetachedInvalidate();
  return useMutation({
    mutationFn: ({ todoId, body }: { todoId: number; body: BetCreateRequest }) => api.bets.create(todoId, body),
    onSuccess: () => {
      invalidate(["bets"]);
      invalidate(["notifications"]);
    },
  });
};

/** 받은 내기를 수락하거나 거절합니다. */
export const useSetBetStatus = () => {
  const api = useApi();
  const invalidate = useDetachedInvalidate();
  return useMutation({
    mutationFn: ({ betId, body }: { betId: number; body: BetStatusRequest }) => api.bets.setStatus(betId, body),
    onSuccess: () => {
      invalidate(["bets"]);
      invalidate(["notifications"]);
    },
  });
};

export const useSaveDiary = () => {
  const api = useApi();
  const invalidate = useDetachedInvalidate();
  const writeBack = useWriteBack();
  return useMutation({
    mutationFn: (payload: { id?: number; body: DiaryCreateRequest | DiaryPatchRequest | FormData }) =>
      payload.id
        ? api.diaries.update(payload.id, payload.body as DiaryPatchRequest | FormData)
        : api.diaries.create(payload.body as DiaryCreateRequest | FormData),
    onSuccess: saved => {
      writeBack.diaries(diaries =>
        diaries.some(diary => diary.diaryId === saved.diaryId)
          ? diaries.map(diary => (diary.diaryId === saved.diaryId ? saved : diary))
          : [...diaries, saved],
      );
      invalidate(["diaries"]);
    },
  });
};
