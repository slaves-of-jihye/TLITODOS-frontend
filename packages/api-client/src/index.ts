import type {
  Category,
  CategoryPatchRequest,
  CategoryRequest,
  CategoryUpdateResponse,
  DailyTodoStatus,
  DependenciesRequest,
  DependencyCreateRequest,
  Diary,
  DiaryCreateRequest,
  DiaryPatchRequest,
  GoogleLoginRequest,
  GroupCreateRequest,
  GroupCreateResponse,
  GroupDetail,
  GroupInviteCodeResponse,
  GroupJoinRequest,
  GroupJoinResponse,
  GroupListItem,
  GroupRenameRequest,
  LoginResponse,
  MembersRemoveRequest,
  MessageResponse,
  NotificationsPage,
  NotificationType,
  RefreshTokenRequest,
  RoutineCreateRequest,
  RoutineCreateResponse,
  RoutineDeleteResponse,
  RoutineResponse,
  RoutineScheduleRequest,
  Subtask,
  SubtaskCreateRequest,
  Todo,
  TodoCompleteResponse,
  TodoCreateRequest,
  TodoDependencyResponse,
  TodoPatchRequest,
  TokenRefreshResponse,
  User,
  UserFontUpdateRequest,
  UserFontUpdateResponse,
  UserProfileUpdateResponse,
  UserUpdateRequest,
} from "@tlitodos/types";

export class ApiError extends Error {
  readonly status: number;
  readonly payload: unknown;
  constructor(status: number, message: string, payload: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  query?: Record<string, string | number | null | undefined>;
  body?: unknown;
  noRefresh?: boolean;
};

export interface ApiClientOptions {
  baseUrl: string;
  getAccessToken: () => string | null;
  refreshAccessToken?: () => Promise<string | null>;
  onUnauthorized?: () => void;
}

const getMessage = (payload: unknown, fallback: string) => {
  if (payload && typeof payload === "object" && "detail" in payload) {
    const detail = (payload as { detail?: unknown }).detail;
    if (typeof detail === "string") return detail;
    if (detail && typeof detail === "object" && "message" in detail && typeof detail.message === "string")
      return detail.message;
  }
  return fallback;
};

export const createApiClient = ({ baseUrl, getAccessToken, refreshAccessToken, onUnauthorized }: ApiClientOptions) => {
  /** 토큰을 붙여 보내고, 401이면 한 번 갱신해 다시 보냅니다. */
  const send = async (path: string, options: RequestOptions = {}) => {
    const url = new URL(path, baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);
    Object.entries(options.query ?? {}).forEach(([key, value]) => {
      if (value !== null && value !== undefined) url.searchParams.set(key, String(value));
    });

    const once = async (token: string | null) => {
      const headers = new Headers();
      if (token) headers.set("Authorization", `Bearer ${token}`);
      const isForm = typeof FormData !== "undefined" && options.body instanceof FormData;
      if (options.body !== undefined && !isForm) headers.set("Content-Type", "application/json");
      return fetch(url, {
        method: options.method ?? "GET",
        headers,
        body:
          options.body === undefined ? undefined : isForm ? (options.body as FormData) : JSON.stringify(options.body),
      });
    };

    const response = await once(getAccessToken());
    if (response.status === 401 && !options.noRefresh && refreshAccessToken) {
      const refreshed = await refreshAccessToken();
      if (refreshed) return once(refreshed);
    }
    return response;
  };

  const request = async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
    const response = await send(path, options);
    const text = await response.text();
    let payload: unknown = null;
    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        payload = text;
      }
    }
    if (!response.ok) {
      if (response.status === 401) onUnauthorized?.();
      throw new ApiError(response.status, getMessage(payload, response.statusText || "요청에 실패했습니다."), payload);
    }
    return payload as T;
  };

  /**
   * 인증이 필요한 파일을 받아 옵니다.
   *
   * 업로드된 일기/프로필/증빙 이미지는 `/uploads/...`에 있고 Bearer 없이는
   * 401입니다. `<img src>`는 헤더를 못 붙이므로, 여기서 받아 blob으로 넘깁니다.
   */
  const asset = async (path: string): Promise<Blob> => {
    const response = await send(path);
    if (!response.ok) {
      if (response.status === 401) onUnauthorized?.();
      throw new ApiError(response.status, response.statusText || "파일을 받아오지 못했습니다.", null);
    }
    return response.blob();
  };

  return {
    ping: () => request<string>("/ping"),
    asset,
    auth: {
      google: (body: GoogleLoginRequest) =>
        request<LoginResponse>("/api/v1/auth/google", { method: "POST", body, noRefresh: true }),
      refresh: (body: RefreshTokenRequest) =>
        request<TokenRefreshResponse>("/api/v1/auth/refresh", { method: "POST", body, noRefresh: true }),
      logout: (body: RefreshTokenRequest) =>
        request<MessageResponse>("/api/v1/auth/logout", { method: "POST", body, noRefresh: true }),
    },
    users: {
      me: () => request<User>("/api/v1/users/me"),
      updateMe: (body: UserUpdateRequest | FormData) =>
        request<UserProfileUpdateResponse>("/api/v1/users/me", { method: "PATCH", body }),
      updateFont: (body: UserFontUpdateRequest) =>
        request<UserFontUpdateResponse>("/api/v1/users/me/font", { method: "PATCH", body }),
    },
    groups: {
      list: () => request<GroupListItem[]>("/api/v1/groups"),
      create: (body: GroupCreateRequest) => request<GroupCreateResponse>("/api/v1/groups", { method: "POST", body }),
      join: (body: GroupJoinRequest) => request<GroupJoinResponse>("/api/v1/groups/join", { method: "POST", body }),
      get: (groupId: number) => request<GroupDetail>(`/api/v1/groups/${groupId}`),
      inviteCode: (groupId: number) => request<GroupInviteCodeResponse>(`/api/v1/groups/${groupId}/invite-code`),
      /** 그룹장만 이름을 바꿀 수 있습니다. */
      rename: (groupId: number, body: GroupRenameRequest) =>
        request<MessageResponse>(`/api/v1/groups/${groupId}`, { method: "PATCH", body }),
      removeMember: (groupId: number, userId: number) =>
        request<void>(`/api/v1/groups/${groupId}/members/${userId}`, { method: "DELETE" }),
      /** 여러 명을 한 번에 내보냅니다. */
      removeMembers: (groupId: number, body: MembersRemoveRequest) =>
        request<MessageResponse>(`/api/v1/groups/${groupId}/members/remove`, { method: "POST", body }),
      remove: (groupId: number) => request<MessageResponse>(`/api/v1/groups/${groupId}`, { method: "DELETE" }),
    },
    categories: {
      list: (query?: { groupId?: number | null; userId?: number | null }) =>
        request<Category[]>("/api/v1/categories", { query }),
      create: (body: CategoryRequest) => request<Category>("/api/v1/categories", { method: "POST", body }),
      update: (id: number, body: CategoryPatchRequest) =>
        request<CategoryUpdateResponse>(`/api/v1/categories/${id}`, { method: "PATCH", body }),
      remove: (id: number) => request<MessageResponse>(`/api/v1/categories/${id}`, { method: "DELETE" }),
    },
    todos: {
      list: (query?: { groupId?: number | null; userId?: number | null; date?: string | null }) =>
        request<Todo[]>("/api/v1/todos", { query }),
      get: (id: number) => request<Todo>(`/api/v1/todos/${id}`),
      /**
       * month는 `YYYY-MM`입니다. 다른 형식이면 서버가 422로 거절합니다.
       *
       * `userId`/`groupId`를 함께 보내면 그 멤버의 달을 받아 옵니다. 요청자와
       * 대상자가 같은 그룹이어야 합니다.
       */
      dailyStatus: (month: string, query?: { userId?: number | null; groupId?: number | null }) =>
        request<DailyTodoStatus[]>("/api/v1/todos/daily-status", { query: { month, ...query } }),
      create: (body: TodoCreateRequest) => request<Todo>("/api/v1/todos", { method: "POST", body }),
      update: (id: number, body: TodoPatchRequest) => request<Todo>(`/api/v1/todos/${id}`, { method: "PATCH", body }),
      remove: (id: number) => request<MessageResponse>(`/api/v1/todos/${id}`, { method: "DELETE" }),
      complete: (id: number) => request<TodoCompleteResponse>(`/api/v1/todos/${id}/complete`, { method: "PATCH" }),
      uncomplete: (id: number) => request<TodoCompleteResponse>(`/api/v1/todos/${id}/uncomplete`, { method: "PATCH" }),
      dependency: (id: number, body: DependencyCreateRequest) =>
        request<TodoDependencyResponse>(`/api/v1/todos/${id}/dependencies`, { method: "POST", body }),
      /** 선행 할 일을 통째로 바꿉니다. 빈 배열이면 모두 해제합니다. */
      setDependencies: (id: number, body: DependenciesRequest) =>
        request<unknown>(`/api/v1/todos/${id}/dependencies`, { method: "PUT", body }),
      removeDependency: (id: number, dependencyTodoId: number) =>
        request<unknown>(`/api/v1/todos/${id}/dependencies/${dependencyTodoId}`, { method: "DELETE" }),
      subtask: (id: number, body: SubtaskCreateRequest) =>
        request<Subtask>(`/api/v1/todos/${id}/subtasks`, { method: "POST", body }),
      /** 서버가 반복 날짜를 펼쳐 한 트랜잭션에 저장합니다. 날짜별 POST 루프는 없습니다. */
      createRoutine: (body: RoutineCreateRequest) =>
        request<RoutineCreateResponse>("/api/v1/todos/routines", { method: "POST", body }),
      /** 이미 있는 할 일을 루틴으로 돌립니다. 원본이 첫 회차가 됩니다. */
      convertToRoutine: (id: number, body: RoutineScheduleRequest) =>
        request<RoutineCreateResponse>(`/api/v1/todos/${id}/routine`, { method: "POST", body }),
      routine: (routineId: number) => request<RoutineResponse>(`/api/v1/todos/routines/${routineId}`),
      /** 완료한 회차와 원본까지 전부 지웁니다. */
      removeRoutine: (routineId: number) =>
        request<RoutineDeleteResponse>(`/api/v1/todos/routines/${routineId}`, { method: "DELETE" }),
    },
    notifications: {
      list: (query?: { type?: NotificationType | null; cursor?: number | null; limit?: number }) =>
        request<NotificationsPage>("/api/v1/notifications", { query }),
      markRead: (notificationId: number) =>
        request<unknown>(`/api/v1/notifications/${notificationId}/read`, { method: "PATCH" }),
    },
    diaries: {
      list: (query?: { date?: string | null; userId?: number | null; groupId?: number | null }) =>
        request<Diary[]>("/api/v1/diaries", { query }),
      create: (body: DiaryCreateRequest | FormData) => request<Diary>("/api/v1/diaries", { method: "POST", body }),
      get: (id: number) => request<Diary>(`/api/v1/diaries/${id}`),
      update: (id: number, body: DiaryPatchRequest) =>
        request<Diary>(`/api/v1/diaries/${id}`, { method: "PATCH", body }),
      remove: (id: number) => request<MessageResponse>(`/api/v1/diaries/${id}`, { method: "DELETE" }),
    },
  };
};

export type ApiClient = ReturnType<typeof createApiClient>;
