import type {
  Category,
  CategoryRequest,
  CategoryUpdateResponse,
  DailyTodoStatus,
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
  LoginResponse,
  MessageResponse,
  RefreshTokenRequest,
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
  method?: "GET" | "POST" | "PATCH" | "DELETE";
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
  const request = async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
    const url = new URL(path, baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);
    Object.entries(options.query ?? {}).forEach(([key, value]) => {
      if (value !== null && value !== undefined) url.searchParams.set(key, String(value));
    });

    const send = async (token: string | null) => {
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

    let response = await send(getAccessToken());
    if (response.status === 401 && !options.noRefresh && refreshAccessToken) {
      const refreshed = await refreshAccessToken();
      if (refreshed) response = await send(refreshed);
    }
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

  return {
    ping: () => request<string>("/ping"),
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
      removeMember: (groupId: number, userId: number) =>
        request<void>(`/api/v1/groups/${groupId}/members/${userId}`, { method: "DELETE" }),
      remove: (groupId: number) => request<MessageResponse>(`/api/v1/groups/${groupId}`, { method: "DELETE" }),
    },
    categories: {
      list: (query?: { groupId?: number | null; userId?: number | null }) =>
        request<Category[]>("/api/v1/categories", { query }),
      create: (body: CategoryRequest) => request<Category>("/api/v1/categories", { method: "POST", body }),
      update: (id: number, body: CategoryRequest) =>
        request<CategoryUpdateResponse>(`/api/v1/categories/${id}`, { method: "PATCH", body }),
    },
    todos: {
      list: (query?: { groupId?: number | null; userId?: number | null; date?: string | null }) =>
        request<Todo[]>("/api/v1/todos", { query }),
      /** month는 `YYYY-MM`입니다. 다른 형식이면 서버가 422로 거절합니다. */
      dailyStatus: (month: string) => request<DailyTodoStatus[]>("/api/v1/todos/daily-status", { query: { month } }),
      create: (body: TodoCreateRequest) => request<Todo>("/api/v1/todos", { method: "POST", body }),
      update: (id: number, body: TodoPatchRequest) => request<Todo>(`/api/v1/todos/${id}`, { method: "PATCH", body }),
      remove: (id: number) => request<MessageResponse>(`/api/v1/todos/${id}`, { method: "DELETE" }),
      complete: (id: number) => request<TodoCompleteResponse>(`/api/v1/todos/${id}/complete`, { method: "PATCH" }),
      uncomplete: (id: number) => request<TodoCompleteResponse>(`/api/v1/todos/${id}/uncomplete`, { method: "PATCH" }),
      dependency: (id: number, body: DependencyCreateRequest) =>
        request<TodoDependencyResponse>(`/api/v1/todos/${id}/dependencies`, { method: "POST", body }),
      subtask: (id: number, body: SubtaskCreateRequest) =>
        request<Subtask>(`/api/v1/todos/${id}/subtasks`, { method: "POST", body }),
    },
    diaries: {
      list: () => request<Diary[]>("/api/v1/diaries"),
      create: (body: DiaryCreateRequest | FormData) => request<Diary>("/api/v1/diaries", { method: "POST", body }),
      get: (id: number) => request<Diary>(`/api/v1/diaries/${id}`),
      update: (id: number, body: DiaryPatchRequest) =>
        request<Diary>(`/api/v1/diaries/${id}`, { method: "PATCH", body }),
      remove: (id: number) => request<MessageResponse>(`/api/v1/diaries/${id}`, { method: "DELETE" }),
    },
  };
};

export type ApiClient = ReturnType<typeof createApiClient>;
