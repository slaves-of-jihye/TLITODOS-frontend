export type Importance = "NONE" | "LOW" | "HIGH";
/**
 * 일기 공개 범위.
 *
 * `PUBLIC`은 같은 그룹원, `PRIVATE`은 나만입니다. `GROUP`(일부 공개)은 서버에서
 * 보류 상태라 작성자만 볼 수 있어, 화면에서는 고를 수 없습니다. 할 일에는 공개
 * 범위가 없습니다 — 로그인한 사용자면 누구나 보고, 고치는 것은 주인만 합니다.
 */
export type Visibility = "PRIVATE" | "GROUP" | "PUBLIC";
/** 일기 화면이 고르게 하는 두 갈래. 보류된 `GROUP`은 넣지 않습니다. */
export type UiVisibility = "PRIVATE" | "PUBLIC";
export type GroupRole = "LEADER" | "MEMBER";
export type BetStatus = "PENDING" | "ACCEPTED" | "REJECTED" | "VERIFIED";

export interface User {
  userId: number;
  name: string;
  profileImageUrl: string | null;
  bio: string;
  isDiscordLinked: boolean;
  discordAlertEnabled: boolean;
  /** 선택한 폰트 키. 서버가 아직 내려주지 않으면 로컬에 남은 선택을 씁니다. */
  font?: string | null;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  isNewUser: boolean;
}

export interface TokenRefreshResponse {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  refreshExpiresAt: string;
}

export interface UserProfileUpdateResponse {
  userId: number;
  name: string;
  profileImageUrl: string | null;
  bio: string;
}

export interface GroupListItem {
  groupId: number;
  name: string;
  memberCount: number;
  isLeader: boolean;
}

export interface GroupMember {
  userId: number;
  name: string;
  profileImageUrl: string | null;
  role: GroupRole;
  bio?: string;
}

export interface GroupDetail {
  groupId: number;
  name: string;
  description: string;
  inviteCode: string;
  members: GroupMember[];
}

export interface GroupCreateResponse {
  groupId: number;
  name: string;
  inviteCode: string;
}

export interface GroupJoinResponse {
  groupId: number;
  name: string;
  message: string;
}

export interface GroupInviteCodeResponse {
  groupId: number;
  inviteCode: string;
}

export interface Category {
  categoryId: number;
  name: string;
  color: string;
  isDeletable: boolean;
}

export interface CategoryUpdateResponse {
  categoryId: number;
  name: string;
  color: string;
}

export interface Subtask {
  subtaskId: number;
  content: string;
  isCompleted: boolean;
}

export interface Todo {
  todoId: number;
  userId: number;
  /** 최대 40자. */
  title: string;
  /** 세부사항. 최대 100자이고, 없으면 빈 문자열입니다. */
  description: string;
  categoryId: number;
  /** `YYYY-MM-DD`. 기간 할 일의 첫 날입니다. */
  startDate: string;
  /** `YYYY-MM-DD`. 기간의 마지막 날이며 양끝을 포함합니다. */
  dueDate: string | null;
  /** `HH:MM` 5분 단위. 설정하지 않으면 `null`입니다. */
  time: string | null;
  /** IANA 시간대. 기본은 `Asia/Seoul`입니다. */
  timezone: string;
  importance: Importance;
  hardship: number;
  x: number;
  y: number;
  isRoutine: boolean;
  /** 루틴 회차면 그 루틴의 id. 예전 데이터는 `isRoutine`만 있고 이 값이 없습니다. */
  routineId: number | null;
  isCompleted: boolean;
  subtasks: Subtask[];
  dependencies: number[];
  createdAt: string | null;
  completedAt: string | null;
}

/** 알림에 딸려 오는 할 일 요약. */
export interface TodoPreview {
  todoId: number;
  title: string;
  description: string;
}

/** `GET /api/v1/todos/daily-status`가 그 달의 날마다 하나씩 돌려주는 요약입니다. */
export interface DailyTodoStatus {
  date: string;
  /** 그 날 아직 끝내지 않은 할 일 수. */
  incompleteCount: number;
  /** 그 날 할 일이 있는 카테고리만 담깁니다. `isCompleted`는 그 카테고리를 다 끝냈는지입니다. */
  categoryStatuses: { categoryId: number; isCompleted: boolean }[];
}

export interface TodoCompleteResponse {
  success: boolean;
  todoId: number;
  isCompleted: boolean;
}

export interface TodoDependencyResponse {
  success: boolean;
  todoId: number;
  dependencyTodoId: number;
}

export type RoutineFrequency = "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";

/** 루틴 반복 규칙. 날짜는 서버가 펼칩니다. */
export interface Recurrence {
  frequency: RoutineFrequency;
  /** `WEEKLY`에서 1은 매주, 2는 격주. 나머지 주기는 1만 받습니다. */
  interval?: 1 | 2;
  /** `WEEKLY`에서 월=1 ~ 일=7. 생략하면 시작일의 요일입니다. */
  weekdays?: number[] | null;
}

export interface RoutineCreateRequest {
  /** 생성 동작마다 새로 만드는 UUID. 재시도는 같은 키와 같은 본문으로 보냅니다. */
  requestId: string;
  title: string;
  description?: string;
  categoryId: number;
  importance?: Importance;
  hardship?: number;
  startDate: string;
  endDate: string;
  time?: string | null;
  timezone?: string;
  recurrence?: Recurrence | null;
  x?: number;
  y?: number;
}

/** 이미 있는 할 일을 루틴으로 돌릴 때. 제목·카테고리는 원본 것을 씁니다. */
export interface RoutineScheduleRequest {
  requestId: string;
  startDate: string;
  endDate: string;
  time?: string | null;
  timezone?: string;
  recurrence?: Recurrence | null;
}

export interface RoutineOccurrence {
  todoId: number;
  dueDate: string;
}

export interface RoutineCreateResponse {
  routineId: number;
  /** 원본을 재사용한 회차까지 포함한 총 회차 수. */
  createdCount: number;
  occurrences: RoutineOccurrence[];
}

export interface RoutineResponse {
  routineId: number;
  definition: Record<string, unknown>;
}

export interface RoutineDeleteResponse {
  success: boolean;
  routineId: number;
  deletedCount: number;
}

export type NotificationType = "TODO_COMPLETED" | "DIARY_CREATED" | "BET_REQUESTED";

export interface NotificationActor {
  userId: number;
  name: string;
  profileImageUrl: string | null;
}

export interface Bet {
  betId: number;
  todoId: number;
  content: string;
  requesterId: number;
  status: BetStatus;
  proofImageUrl: string | null;
  isVerified: boolean;
}

/** `Notification`은 DOM 전역 이름과 겹쳐 `AppNotification`으로 둡니다. */
export interface AppNotification {
  notificationId: number;
  type: NotificationType;
  actor: NotificationActor;
  todo: TodoPreview | null;
  diaryId: number | null;
  bet: Bet | null;
  createdAt: string;
  readAt: string | null;
}

export interface NotificationsPage {
  items: AppNotification[];
  /** 다음 쪽의 `cursor`. 마지막 쪽이면 `null`입니다. */
  nextCursor: number | null;
}

export interface Diary {
  diaryId: number;
  userId: number;
  /** `YYYY-MM-DD`. 일기가 가리키는 날입니다. */
  date: string;
  content: string;
  imageUrl: string | null;
  emotion: string | null;
  visibility: Visibility;
  createdAt: string | null;
}

export interface MessageResponse {
  success: boolean;
  message: string;
}

export interface GoogleLoginRequest {
  googleAccessToken: string;
}
export interface RefreshTokenRequest {
  refreshToken: string;
}
export interface UserUpdateRequest {
  name?: string | null;
  bio?: string | null;
  profileImageUrl?: string | null;
}
export interface UserFontUpdateRequest {
  /** `@tlitodos/core`의 `FontKey`. 순환 의존을 피하려고 여기서는 문자열로 둡니다. */
  font: string;
}
export interface UserFontUpdateResponse {
  userId: number;
  font: string;
}
export interface GroupCreateRequest {
  name: string;
  description?: string;
}
export interface GroupJoinRequest {
  inviteCode: string;
}
export interface GroupRenameRequest {
  name: string;
}
/** 한 번에 여러 명을 내보냅니다. 그룹장만 할 수 있습니다. */
export interface MembersRemoveRequest {
  userIds: number[];
}
export interface CategoryRequest {
  name: string;
  color: string;
}
export interface CategoryPatchRequest {
  name?: string | null;
  color?: string | null;
}

export interface TodoCreateRequest {
  title: string;
  description?: string;
  categoryId: number;
  importance?: Importance;
  hardship?: number;
  startDate?: string | null;
  dueDate?: string | null;
  time?: string | null;
  timezone?: string;
  x?: number;
  y?: number;
}

export interface TodoPatchRequest {
  title?: string | null;
  description?: string | null;
  categoryId?: number | null;
  importance?: Importance | null;
  hardship?: number | null;
  startDate?: string | null;
  dueDate?: string | null;
  time?: string | null;
  timezone?: string;
  x?: number | null;
  y?: number | null;
}

export interface DependencyCreateRequest {
  dependencyTodoId: number;
}
/** 선행 할 일을 통째로 바꿉니다. 빈 배열이면 모두 해제합니다. */
export interface DependenciesRequest {
  dependencyTodoIds: number[];
}
export interface SubtaskCreateRequest {
  content: string;
}
export interface DiaryCreateRequest {
  date?: string;
  content: string;
  imageUrl?: string | null;
  emotion?: string | null;
  visibility?: Visibility;
}
export interface DiaryPatchRequest {
  date?: string | null;
  content?: string | null;
  imageUrl?: string | null;
  emotion?: string | null;
  visibility?: Visibility | null;
}
