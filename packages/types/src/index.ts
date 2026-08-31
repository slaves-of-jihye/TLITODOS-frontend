export type Importance = "NONE" | "LOW" | "HIGH";
export type Visibility = "PRIVATE" | "GROUP" | "PUBLIC";
export type UiVisibility = "PRIVATE" | "GROUP";
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
  title: string;
  categoryId: number;
  importance: Importance;
  hardship: number;
  dueDate: string | null;
  visibility: Visibility;
  groupId: number | null;
  x: number;
  y: number;
  isRoutine: boolean;
  isCompleted: boolean;
  subtasks: Subtask[];
  dependencies: number[];
  createdAt: string | null;
  completedAt: string | null;
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

export interface Diary {
  diaryId: number;
  userId: number;
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
  /** `@tlitodos/core`의 `FontKey`. 순환 의존을 피하려고 여기서는 문자열로 둡니다. */
  font?: string | null;
}
export interface GroupCreateRequest {
  name: string;
  description?: string;
}
export interface GroupJoinRequest {
  inviteCode: string;
}
export interface CategoryRequest {
  name: string;
  color: string;
}

export interface TodoCreateRequest {
  title: string;
  categoryId: number;
  importance?: Importance;
  hardship?: number;
  dueDate?: string | null;
  visibility?: Visibility;
  groupId?: number | null;
  x?: number;
  y?: number;
  isRoutine?: boolean;
}

export interface TodoPatchRequest {
  title?: string | null;
  categoryId?: number | null;
  importance?: Importance | null;
  hardship?: number | null;
  dueDate?: string | null;
  visibility?: Visibility | null;
  groupId?: number | null;
  x?: number | null;
  y?: number | null;
}

export interface DependencyCreateRequest {
  dependencyTodoId: number;
}
export interface SubtaskCreateRequest {
  content: string;
}
export interface DiaryCreateRequest {
  content: string;
  imageUrl?: string | null;
  emotion?: string | null;
  visibility?: Visibility;
}
export interface DiaryPatchRequest {
  content?: string | null;
  imageUrl?: string | null;
  emotion?: string | null;
  visibility?: Visibility | null;
}
