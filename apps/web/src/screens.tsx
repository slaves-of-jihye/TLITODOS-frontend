import styled from "@emotion/styled";
import { useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import type { Bet, NotificationType } from "@/shared/api";
import { isDiaryForDate, useDiaries } from "@/entities/diary";
import { useGroup } from "@/entities/group";
import {
  ALARM_FILTERS,
  ActorAvatar,
  AlarmDot,
  AlarmEmpty,
  AlarmList,
  AlarmListSkeleton,
  AlarmRow,
  UnreadDot,
  alarmSentence,
  useMarkNotificationRead,
  useNotificationUnreadStatus,
  useNotifications,
} from "@/entities/notification";
import { resolveFont, useMe, useUpdateFont, useUpdateProfile } from "@/entities/user";
import { BetReceivedModal } from "@/features/bet-answer";
import { CategoryColorSection } from "@/features/category-color";
import { DiaryViewModal } from "@/features/diary-view";
import { FontProfileRow } from "@/features/font-select";
import { GroupInviteModal } from "@/features/group-invite";
import { GroupActionModals } from "@/features/group-join";
import { GroupInfoModal } from "@/features/group-settings";
import {
  BIO_LIMIT,
  EditableProfileRow,
  MAX_PROFILE_IMAGE_BYTES,
  NAME_LIMIT,
  PhotoRow,
  ProfileImageAction,
} from "@/features/profile-edit";
import { useApi, useAssetObjectUrl, useServerBusy } from "@/shared/api";
import { errorMessage, formatLocalDate, readStoredFont } from "@/shared/lib";
import { useSessionStore } from "@/shared/model";
import {
  AppShell,
  BusyBar,
  Button,
  EmptyState,
  ErrorText,
  FieldBlock,
  FieldLabel,
  PageTitle,
  SrOnly,
  palette,
  theme,
} from "@/shared/ui";
import { DiaryForm, DiaryFormSkeleton } from "@/widgets/diary-form";
import { PageNav } from "@/widgets/page-nav";
import { GroupTopBar } from "@/widgets/group-top-bar";
import { MemberTabs } from "@/widgets/member-bar";
import { TodoWorkspace } from "@/widgets/todo-workspace";
import { WorkspaceHeader } from "@/widgets/workspace-header";

const useHeaderModal = () => {
  const [mode, setMode] = useState<"create" | "join" | null>(null);
  return { mode, openCreate: () => setMode("create"), openJoin: () => setMode("join"), close: () => setMode(null) };
};

/**
 * 화면 맨 위에 걸리는 진행 줄.
 *
 * 저장·삭제 같은 쓰기는 끝나도 목록을 뒤에서 다시 받아 옵니다. 그 왕복까지가
 * 사용자가 기다리는 시간이므로 쓰기와 읽기를 가리지 않고 하나로 켭니다. 어느
 * 화면에서 무엇을 하든 자리가 같도록 한 군데서만 답니다.
 */
export const ServerBusyBar = () => <BusyBar busy={useServerBusy()} label="서버와 주고받는 중" />;

export const MyHome = () => {
  const header = useHeaderModal();
  return (
    <AppShell>
      <WorkspaceHeader onCreate={header.openCreate} onJoin={header.openJoin} />
      <TodoWorkspace own groupId={null} />
      <PageNav active="home" />
      <GroupActionModals mode={header.mode} onClose={header.close} />
    </AppShell>
  );
};

/**
 * 그룹 화면.
 *
 * Figma의 group 섹션 `main / today`입니다. 맨 위 줄에서 그룹을 빠져나가거나 설정을
 * 열고, 그 아래 멤버 줄에서 누구의 할 일을 볼지 고릅니다. 나를 골랐을 때는 홈과
 * 같은 내 할 일(그룹으로 좁히지 않은 전체)을 보여주고, 다른 멤버는 그룹에 공개된
 * 할 일만 읽기 전용으로 보여줍니다.
 */
export const GroupHome = () => {
  const { groupId, userId } = useParams();
  const id = Number(groupId);
  const navigate = useNavigate();
  const { data: me } = useMe();
  const { data: group, isLoading: groupLoading } = useGroup(Number.isFinite(id) ? id : null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const members = useMemo(() => {
    const list = group?.members ?? [];
    const mine = list.find(member => member.userId === me?.userId);
    return mine ? [mine, ...list.filter(member => member.userId !== mine.userId)] : list;
  }, [group, me]);
  const activeId = userId ? Number(userId) : (me?.userId ?? null);
  const active = members.find(member => member.userId === activeId);
  const own = activeId !== null && activeId === me?.userId;
  // 시트 안의 그룹명 수정·삭제·강퇴가 모두 그룹장 전용이라, 그룹장에게만 버튼을 보입니다.
  const isLeader = me ? members.find(member => member.userId === me.userId)?.role === "LEADER" : false;
  return (
    <AppShell>
      <GroupTopBar
        name={group?.name || "그룹"}
        onBack={() => navigate("/")}
        onSettings={isLeader ? () => setSettingsOpen(true) : undefined}
      />
      <MemberTabs
        members={members}
        activeUserId={activeId}
        loading={groupLoading}
        onSelect={next => navigate(next === me?.userId ? `/groups/${id}` : `/groups/${id}/members/${next}`)}
        onShareInvite={() => setInviteOpen(true)}
      />
      {own ? (
        <TodoWorkspace own groupId={null} />
      ) : (
        <TodoWorkspace own={false} ownerId={activeId ?? undefined} ownerName={active?.name} groupId={id} />
      )}
      <PageNav active="home" />
      <GroupInfoModal
        key={`settings-${settingsOpen}-${group?.name ?? ""}`}
        open={settingsOpen}
        group={group ?? null}
        onClose={() => setSettingsOpen(false)}
      />
      <GroupInviteModal
        key={`invite-${inviteOpen}`}
        open={inviteOpen}
        group={group ?? null}
        onClose={() => setInviteOpen(false)}
      />
    </AppShell>
  );
};

export const AlarmPage = () => {
  const [filter, setFilter] = useState<NotificationType>("TODO_COMPLETED");
  /** 열어 둔 일기. 알림에 딸려 온 작성자 이름은 일기 응답에 없어 함께 들고 있습니다. */
  const [openDiary, setOpenDiary] = useState<{ diaryId: number; actor: string } | null>(null);
  /** 열어 둔 내기. 알림이 내기를 통째로 담아 오므로 따로 받아 올 것이 없습니다. */
  const [openBet, setOpenBet] = useState<{ bet: Bet; actor: string } | null>(null);
  const label = ALARM_FILTERS.find(item => item.key === filter)?.label ?? "";
  const { data, isLoading, error, hasNextPage, isFetchingNextPage, fetchNextPage } = useNotifications(filter);
  /*
   * 갈래마다 안 읽은 알림이 남아 있는지.
   *
   * 목록은 고른 갈래만 받아 오므로, 다른 갈래에 새 알림이 왔는지는 목록으로 알 수
   * 없습니다. 읽음으로 넘길 때 거는 무효화가 이 표시도 같이 다시 받아 옵니다.
   */
  const { data: unread } = useNotificationUnreadStatus();
  const markRead = useMarkNotificationRead();
  const items = useMemo(() => data?.pages.flatMap(page => page.items) ?? [], [data]);
  return (
    <AppShell>
      <AlarmColumn>
        <PageTitle>알림</PageTitle>
        <AlarmFilters role="tablist">
          {ALARM_FILTERS.map(item => (
            <AlarmFilter
              key={item.key}
              type="button"
              role="tab"
              aria-selected={filter === item.key}
              selected={filter === item.key}
              onClick={() => setFilter(item.key)}
            >
              {item.label}
              {/* 안 읽은 것이 남아 있는 갈래에만. 점은 모양일 뿐이라 읽어 줄 말은 따로 답니다. */}
              {unread?.[item.key] ? (
                <>
                  <UnreadDot aria-hidden />
                  <SrOnly>안 읽은 알림 있음</SrOnly>
                </>
              ) : null}
            </AlarmFilter>
          ))}
        </AlarmFilters>
        {error ? (
          <ErrorText>{errorMessage(error)}</ErrorText>
        ) : isLoading ? (
          <AlarmListSkeleton />
        ) : items.length ? (
          <AlarmList>
            {items.map(item => (
              <AlarmRow
                key={item.notificationId}
                type="button"
                unread={item.readAt === null}
                onClick={() => {
                  // 누르면 읽음으로 넘깁니다. 서버가 목록을 다시 주면 표시가 사라집니다.
                  if (item.readAt === null) markRead.mutate(item.notificationId);
                  // 일기 알림은 그 자리에서 바로 펴 봅니다.
                  if (item.type === "DIARY_CREATED" && item.diaryId !== null) {
                    setOpenDiary({ diaryId: item.diaryId, actor: item.actor.name || "친구" });
                  }
                  // 내기 알림은 수락/거절을 그 자리에서 정합니다.
                  if (item.type === "BET_REQUESTED" && item.bet) {
                    setOpenBet({ bet: item.bet, actor: item.actor.name || "친구" });
                  }
                }}
              >
                <ActorAvatar url={item.actor.profileImageUrl} />
                <div>
                  <strong>{alarmSentence(item)}</strong>
                  {/* 내기는 무엇을 걸었는지가 먼저입니다. 나머지는 할 일의 세부사항을 둡니다. */}
                  {item.bet ? (
                    <small>{item.bet.content}</small>
                  ) : item.todo?.description ? (
                    <small>{item.todo.description}</small>
                  ) : null}
                </div>
                {item.readAt === null ? <AlarmDot aria-label="읽지 않음" /> : null}
              </AlarmRow>
            ))}
          </AlarmList>
        ) : (
          <AlarmEmpty>아직 도착한 {label} 알림이 없습니다.</AlarmEmpty>
        )}
        {hasNextPage ? (
          <Button type="button" disabled={isFetchingNextPage} onClick={() => void fetchNextPage()}>
            {isFetchingNextPage ? "불러오는 중..." : "더 보기"}
          </Button>
        ) : null}
      </AlarmColumn>
      {openDiary ? (
        <DiaryViewModal diaryId={openDiary.diaryId} author={openDiary.actor} onClose={() => setOpenDiary(null)} />
      ) : null}
      <BetReceivedModal
        key={openBet?.bet.betId ?? 0}
        bet={openBet?.bet ?? null}
        requesterName={openBet?.actor ?? "친구"}
        open={openBet !== null}
        onClose={() => setOpenBet(null)}
      />
      <PageNav active="alarm" />
    </AppShell>
  );
};

const AlarmColumn = styled.div`
  display: grid;
  gap: 32px;
  width: min(485px, 100%);
  justify-items: start;
`;
/** 홈의 `HeaderRow`, 그룹의 `MemberBar`와 같은 자리에서 같은 방식으로 화면 위에 붙습니다. */
const AlarmFilters = styled.div`
  position: sticky;
  top: 0;
  z-index: 40;
  background: ${palette.white};
  /*
   * 붙었을 때 화면 끝에 닿지 않도록 12px을 두되, 제목과의 간격은 원래 20px
   * 그대로 보이게 합니다. 칸 사이 32px에서 24px을 당기면 8px이 남고, 여기에
   * 안쪽 여백 12px이 더해져 20px이 됩니다.
   */
  padding-top: 12px;
  margin-top: -24px;
  /* 목록보다 좁으면 옆으로 내용이 비쳐 보입니다. */
  width: 100%;
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
`;
const AlarmFilter = styled.button<{ selected: boolean }>`
  /* 점이 붙어도 글자가 가운데를 지키도록 한 줄로 늘어놓습니다. */
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 0;
  border-radius: ${theme.radius.pill};
  padding: 6px 20px;
  font-size: ${theme.text.h3};
  background: ${({ selected }) => (selected ? palette.black : palette.gray200)};
  color: ${({ selected }) => (selected ? palette.white : theme.colors.ink)};
`;

export const ProfilePage = () => {
  const { data: me } = useMe();
  const update = useUpdateProfile();
  const updateFont = useUpdateFont();
  const api = useApi();
  const refreshToken = useSessionStore(s => s.refreshToken);
  const clear = useSessionStore(s => s.clearSession);
  const cache = useQueryClient();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  // 서버가 아직 폰트를 내려주지 않는 동안에는 이 기기에 남은 선택을 기준으로 삼습니다.
  const font = resolveFont(me?.font ?? readStoredFont()).key;
  const guard = async (run: () => Promise<unknown>) => {
    setError("");
    try {
      await run();
    } catch (reason) {
      setError(errorMessage(reason));
      throw reason;
    }
  };
  const save = (body: { name?: string; bio?: string }) => guard(() => update.mutateAsync(body));
  const profileImage = useAssetObjectUrl(me?.profileImageUrl);
  const uploadProfileImage = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("이미지 파일만 올릴 수 있습니다.");
      return Promise.resolve();
    }
    if (file.size > MAX_PROFILE_IMAGE_BYTES) {
      setError("이미지는 5MB까지 올릴 수 있습니다.");
      return Promise.resolve();
    }
    const body = new FormData();
    body.append("image", file);
    return guard(() => update.mutateAsync(body));
  };
  return (
    <AppShell>
      <ProfileTitle>나의 프로필</ProfileTitle>
      <ProfileColumns>
        <ProfilePanel>
          <FieldBlock>
            <FieldLabel>프로필 사진</FieldLabel>
            <PhotoRow>
              {profileImage ? <img src={profileImage} alt="프로필" /> : <span aria-hidden>🌱</span>}
              <ProfileImageAction onPick={uploadProfileImage} />
            </PhotoRow>
          </FieldBlock>
          <EditableProfileRow
            label="이름"
            value={me?.name ?? ""}
            placeholder="이름을 작성하세요"
            limit={NAME_LIMIT}
            onSave={name => save({ name })}
          />
          <EditableProfileRow
            label="자기소개"
            value={me?.bio ?? ""}
            placeholder="자기소개를 작성하세요"
            limit={BIO_LIMIT}
            onSave={bio => save({ bio })}
          />
          <FontProfileRow value={font} onSave={next => guard(() => updateFont.mutateAsync({ font: next }))} />
          {error ? <ErrorText>{error}</ErrorText> : null}
          <LogoutButton
            onClick={async () => {
              try {
                if (refreshToken) await api.auth.logout({ refreshToken });
              } catch {
                /* 로컬 세션은 항상 종료합니다. */
              } finally {
                clear();
                // 다음 사용자가 이전 계정의 캐시를 잠깐이라도 보지 않게 비웁니다.
                cache.clear();
                navigate("/");
              }
            }}
          >
            로그아웃
          </LogoutButton>
        </ProfilePanel>
        <CategoryColorSection onError={setError} />
      </ProfileColumns>
      <PageNav active="profile" />
    </AppShell>
  );
};

export const DiaryPage = () => {
  const [search] = useSearchParams();
  const selectedDate = search.get("date") || formatLocalDate(new Date());
  const { data: me } = useMe();
  const { data: diaries = [], isLoading } = useDiaries({ date: selectedDate });
  const existing = diaries.find(diary => isDiaryForDate(diary, selectedDate));
  return (
    <AppShell>
      {isLoading ? (
        <DiaryFormSkeleton selectedDate={selectedDate} />
      ) : (
        <DiaryForm
          key={`${selectedDate}-${existing?.diaryId ?? "new"}`}
          selectedDate={selectedDate}
          existing={existing}
          userName={me?.name}
        />
      )}
      <PageNav active="home" />
    </AppShell>
  );
};

export const NotFoundPage = () => {
  const navigate = useNavigate();
  return (
    <AppShell>
      <EmptyState>
        <h1>페이지를 찾을 수 없어요.</h1>
        <Button onClick={() => navigate("/")}>홈으로</Button>
      </EmptyState>
    </AppShell>
  );
};

const ProfileTitle = styled.h1`
  margin: 0 0 40px;
  font-size: ${theme.text.h1};
`;
const ProfileColumns = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 560px) minmax(0, 410px);
  gap: 12px;
  align-items: start;
  @media (max-width: 900px) {
    grid-template-columns: 1fr;
    gap: 40px;
  }
`;
const ProfilePanel = styled.div`
  display: grid;
  justify-items: start;
  gap: 20px;
  max-width: 560px;
`;
const LogoutButton = styled.button`
  margin-top: 28px;
  border: 0;
  background: transparent;
  color: ${theme.colors.red};
  font-weight: 800;
  padding: 10px 0;
`;
