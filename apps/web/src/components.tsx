import styled from "@emotion/styled";
import {
  addMonths,
  CATEGORY_PRESETS,
  categoryAccent,
  coversDate,
  dateOnly,
  formatLocalDate,
  getCalendarDays,
  isHobbyCategory,
  isInviteCode,
  isTodoCategory,
  parseLocalDate,
  sortCategories,
  toRecurrence,
  repeatUsesWeekdays,
  weekdayOf,
  ROUTINE_REPEATS,
  WEEKDAYS,
  type RoutineRepeat,
} from "@tlitodos/core";
import {
  useAddDependency,
  useApi,
  useConvertToRoutine,
  useCreateGroup,
  useDeleteGroup,
  useDeleteRoutine,
  useDeleteTodo,
  useGroups,
  useInvalidateTodos,
  useJoinGroup,
  useMe,
  useRemoveGroupMembers,
  useRenameGroup,
  useUpdateCategory,
  useUpdateTodo,
} from "@tlitodos/hooks";
import type {
  Category,
  DailyTodoStatus,
  GroupDetail,
  GroupMember,
  Importance,
  Todo,
  TodoPatchRequest,
} from "@tlitodos/types";
import {
  Button,
  CategoryPill,
  DayStash,
  ErrorText,
  HeaderRow,
  icons,
  Modal,
  palette,
  StatusCluster,
  theme,
  TodoRow as SharedTodoRow,
  ViewChip,
} from "@tlitodos/ui";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { dismissInstallBanner, promptInstall, usePwaInstall } from "./app/pwaInstall";
import { useAssetObjectUrl } from "./app/assetUrl";
import { useSessionStore } from "./app/sessionStore";

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : "요청을 처리하지 못했습니다.");
const googleOAuthResultKey = "tlitodos-google-oauth-result";
const googleOAuthReturnKey = "tlitodos-google-oauth-return";
const googleOAuthStateKey = "tlitodos-google-oauth-state";

type GoogleOAuthResult = {
  accessToken?: string;
  error?: string;
};

const buildGoogleOAuthUrl = (clientId: string, state: string) => {
  const redirectUri = `${window.location.origin}/oauth-callback.html`;
  const query = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "token",
    scope: "openid email profile",
    include_granted_scopes: "true",
    prompt: "select_account",
    state,
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${query}`;
};

const redirectToGoogle = (clientId: string) => {
  const returnPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  const state = window.crypto.randomUUID();
  window.sessionStorage.setItem(googleOAuthReturnKey, returnPath);
  window.sessionStorage.setItem(googleOAuthStateKey, state);
  window.location.assign(buildGoogleOAuthUrl(clientId, state));
};

export const LoginModal = () => {
  const accessToken = useSessionStore(state => state.accessToken);
  const setSession = useSessionStore(state => state.setSession);
  const api = useApi();
  const queryClient = useQueryClient();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const acceptGoogleToken = useCallback(
    async (accessTokenValue: string) => {
      setLoading(true);
      setError("");
      try {
        const session = await api.auth.google({ googleAccessToken: accessTokenValue });
        setSession(session);
        const current = await api.categories.list();
        if (session.isNewUser || current.length < 4) {
          const desired = CATEGORY_PRESETS.map((preset, index) => ({
            name: index === 0 ? "해야할 일" : index === 3 ? "취미" : `사용자 설정 ${index}`,
            color: preset.strong,
          }));
          if (current.length === 0) {
            await Promise.all(desired.map(category => api.categories.create(category)));
          } else {
            const todoCategory = current.find(isTodoCategory);
            const hobbyCategory = current.find(isHobbyCategory);
            let total = current.length;
            if (todoCategory) await api.categories.update(todoCategory.categoryId, desired[0]!);
            else if (total < 5) {
              await api.categories.create(desired[0]!);
              total += 1;
            }
            const customCount = current.filter(
              category => !isTodoCategory(category) && !isHobbyCategory(category),
            ).length;
            for (let index = customCount; index < 2 && total < 5; index += 1) {
              await api.categories.create(desired[index + 1]!);
              total += 1;
            }
            if (hobbyCategory) await api.categories.update(hobbyCategory.categoryId, desired[3]!);
            else if (total < 5) await api.categories.create(desired[3]!);
          }
        }
        await queryClient.invalidateQueries();
      } catch (reason) {
        useSessionStore.getState().clearSession();
        setError(errorMessage(reason));
      } finally {
        setLoading(false);
      }
    },
    [api, queryClient, setSession],
  );
  useEffect(() => {
    const handleResult = ({ accessToken: googleAccessToken, error: googleError }: GoogleOAuthResult) => {
      if (googleError || !googleAccessToken) setError("Google 로그인에 실패했습니다.");
      else void acceptGoogleToken(googleAccessToken);
    };
    const storedResult = window.sessionStorage.getItem(googleOAuthResultKey);
    if (storedResult) {
      window.sessionStorage.removeItem(googleOAuthResultKey);
      try {
        handleResult(JSON.parse(storedResult) as GoogleOAuthResult);
      } catch {
        setError("Google 로그인 결과를 확인하지 못했습니다.");
      }
    }
    const receiveToken = (event: MessageEvent<GoogleOAuthResult & { type?: string }>) => {
      if (event.origin !== window.location.origin || event.data?.type !== "tlitodos-google-oauth") return;
      handleResult(event.data);
    };
    window.addEventListener("message", receiveToken);
    return () => window.removeEventListener("message", receiveToken);
  }, [acceptGoogleToken]);
  const login = () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) {
      setError("VITE_GOOGLE_CLIENT_ID 환경변수를 설정해 주세요.");
      return;
    }
    if (window.google?.accounts.oauth2) {
      window.google.accounts.oauth2
        .initTokenClient({
          client_id: clientId,
          scope: "openid email profile",
          callback: response => {
            if (response.error || !response.access_token) setError("Google 로그인에 실패했습니다.");
            else void acceptGoogleToken(response.access_token);
          },
          error_callback: response => {
            if (response.type === "popup_failed_to_open") {
              redirectToGoogle(clientId);
              return;
            }
            if (response.type === "popup_closed") {
              setError("Google 로그인 창이 닫혔습니다. 다시 시도해 주세요.");
              return;
            }
            setError("Google 로그인 창을 열지 못했습니다.");
          },
        })
        .requestAccessToken();
      return;
    }
    redirectToGoogle(clientId);
  };
  return (
    <Modal open={!accessToken} login title="TLITODOS에 오신 걸 환영해요">
      <LoginCopy>오늘 할 일과 하루의 기록을 한곳에서 관리해 보세요.</LoginCopy>
      {error ? <ErrorText>{error}</ErrorText> : null}
      <GoogleButton type="button" onClick={login} disabled={loading}>
        <GoogleMark>G</GoogleMark>
        {loading ? "로그인 중..." : "Google로 로그인하기"}
      </GoogleButton>
    </Modal>
  );
};
const LoginCopy = styled.p`
  margin: -14px 0 28px;
  color: ${theme.colors.muted};
  @media (max-width: 600px) {
    margin: -8px 0 24px;
  }
`;
const GoogleButton = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  border: 0;
  border-radius: 12px;
  background: ${palette.gray200};
  padding: 10px 20px;
  font-size: ${theme.text.s};
  color: ${theme.colors.ink};
  &:disabled {
    opacity: 0.45;
    cursor: progress;
  }
`;
/* 구글 마크는 브랜드 색과 서체를 그대로 씁니다. */
const GoogleMark = styled.span`
  font-family: Arial, sans-serif;
  font-size: 20px;
  color: #4285f4;
`;

const iosInstallHint = "공유 버튼을 누르고 '홈 화면에 추가'를 선택해 주세요.";

export const InstallPrompt = () => {
  const { canPrompt, installed, needsManualSteps, bannerDismissed } = usePwaInstall();
  const [installing, setInstalling] = useState(false);
  if (installed || bannerDismissed || (!canPrompt && !needsManualSteps)) return null;
  return (
    <InstallBanner aria-label="앱 설치 안내">
      <img src={`${import.meta.env.BASE_URL}icons/icon-192.png`} alt="" width={44} height={44} />
      <InstallCopy>
        <strong>홈 화면에 TLITODOS 추가하기</strong>
        <span>{canPrompt ? "앱처럼 전체 화면으로 더 빠르게 열 수 있어요." : iosInstallHint}</span>
      </InstallCopy>
      <InstallActions>
        {canPrompt ? (
          <Button
            type="button"
            variant="primary"
            disabled={installing}
            onClick={async () => {
              setInstalling(true);
              const outcome = await promptInstall();
              setInstalling(false);
              // 설치를 거절했다면 다시 권하지 않습니다. 브라우저 메뉴로는 언제든 설치할 수 있습니다.
              if (outcome === "dismissed") dismissInstallBanner();
            }}
          >
            {installing ? "설치 중..." : "설치"}
          </Button>
        ) : null}
        <Button type="button" variant="ghost" onClick={dismissInstallBanner}>
          닫기
        </Button>
      </InstallActions>
    </InstallBanner>
  );
};
const InstallBanner = styled.aside`
  position: fixed;
  z-index: 80;
  right: 24px;
  bottom: 24px;
  width: min(380px, calc(100vw - 48px));
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 10px 14px;
  align-items: center;
  border: 1px solid ${palette.gray200};
  border-radius: ${theme.radius.md};
  background: white;
  padding: 16px 18px;
  box-shadow: ${theme.shadow};
  img {
    border-radius: 12px;
  }
  @media (max-width: 600px) {
    left: 12px;
    right: 12px;
    width: auto;
    /* 하단 내비게이션 위에 겹치지 않게 띄웁니다. */
    bottom: calc(84px + env(safe-area-inset-bottom));
  }
`;
const InstallCopy = styled.div`
  display: grid;
  gap: 4px;
  strong {
    font-size: ${theme.text.s};
  }
  span {
    color: ${theme.colors.muted};
    font-size: ${theme.text.xs};
  }
`;
const InstallActions = styled.div`
  grid-column: 1 / -1;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  button {
    padding: 9px 18px;
  }
`;

export const WorkspaceHeader = ({
  activeGroupId,
  onCreate,
  onJoin,
}: {
  activeGroupId?: number;
  onCreate: () => void;
  onJoin: () => void;
}) => {
  const navigate = useNavigate();
  const { data: groups = [] } = useGroups();
  return (
    <HeaderRow>
      {groups.map(group => (
        <ViewChip
          key={group.groupId}
          active={activeGroupId === group.groupId}
          onClick={() => navigate(`/groups/${group.groupId}`)}
        >
          {group.name}
        </ViewChip>
      ))}
      <Button type="button" onClick={onCreate}>
        ＋ 그룹 생성
      </Button>
      <Button type="button" variant="ghost" onClick={onJoin}>
        초대코드로 참여하기
      </Button>
    </HeaderRow>
  );
};

/**
 * 그룹 화면 맨 위 줄. 뒤로가기 · 그룹 이름 · 그룹 설정입니다.
 *
 * 시트 안의 동작이 모두 그룹장 전용이라, `onSettings`는 그룹장일 때만 넘어옵니다.
 * 없으면 버튼 자리를 비웁니다 — 그래도 이름은 가운데에 남습니다.
 */
export const GroupTopBar = ({
  name,
  onBack,
  onSettings,
}: {
  name: string;
  onBack: () => void;
  onSettings?: () => void;
}) => (
  <GroupBar>
    <GroupBarButton type="button" onClick={onBack}>
      <BackArrow src={icons.arrowUp} alt="" aria-hidden />
      뒤로가기
    </GroupBarButton>
    <GroupBarTitle>{name}</GroupBarTitle>
    <GroupBarEnd>
      {onSettings ? (
        <GroupBarButton type="button" onClick={onSettings}>
          그룹 설정
        </GroupBarButton>
      ) : null}
    </GroupBarEnd>
  </GroupBar>
);
/** 양쪽 칸을 같은 너비로 두어, 오른쪽 버튼이 없어도 이름이 가운데 있습니다. */
const GroupBar = styled.header`
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 16px;
  margin-bottom: 26px;
`;
const GroupBarEnd = styled.div`
  display: flex;
  justify-content: flex-end;
`;
const GroupBarButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 0;
  background: transparent;
  padding: 0;
  font-size: ${theme.text.h3};
  color: ${theme.colors.ink};
  white-space: nowrap;
`;
const GroupBarTitle = styled.p`
  margin: 0;
  min-width: 0;
  font-size: ${theme.text.h2};
  color: ${theme.colors.ink};
  overflow-wrap: anywhere;
`;
const BackArrow = styled.img`
  width: 24px;
  height: 24px;
  transform: rotate(-90deg);
`;

/** 그룹 멤버를 고르는 줄. 나를 맨 앞에 둡니다. */
export const MemberTabs = ({
  members,
  activeUserId,
  onSelect,
  onShareInvite,
}: {
  members: GroupMember[];
  activeUserId: number | null;
  onSelect: (userId: number) => void;
  onShareInvite?: () => void;
}) => (
  <MemberBar>
    <MemberRow>
      {members.map(member => (
        <MemberChip
          key={member.userId}
          member={member}
          active={member.userId === activeUserId}
          onClick={() => onSelect(member.userId)}
        />
      ))}
    </MemberRow>
    {/* 멤버가 넘쳐 줄이 옆으로 밀려도 같이 밀리지 않게, 스크롤되는 칩 줄 밖에 둡니다. */}
    {onShareInvite ? (
      <InviteShareButton type="button" variant="ghost" onClick={onShareInvite}>
        초대코드 공유하기
      </InviteShareButton>
    ) : null}
  </MemberBar>
);
/** 사진은 인증이 필요해 멤버마다 따로 받아 옵니다 — 훅을 목록 안에서 부를 수 없으니 한 칩씩 나눕니다. */
const MemberChip = ({ member, active, onClick }: { member: GroupMember; active: boolean; onClick: () => void }) => (
  <ViewChip active={active} avatar={useAssetObjectUrl(member.profileImageUrl)} onClick={onClick}>
    {member.name}
  </ViewChip>
);
/** 홈의 `HeaderRow`와 같은 자리에서 같은 방식으로 화면 위에 붙습니다. */
const MemberBar = styled.div`
  position: sticky;
  top: 0;
  z-index: 40;
  background: ${palette.white};
  /* 붙었을 때만 여백이 되도록, 같은 값만큼 위로 당겨 평소 간격을 지킵니다. */
  padding-top: 12px;
  margin-top: -12px;
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 36px;
  min-width: 0;
`;
const InviteShareButton = styled(Button)`
  flex: none;
`;
const MemberRow = styled.div`
  display: flex;
  gap: 16px;
  min-width: 0;
  overflow-x: auto;
  scrollbar-width: none;
  &::-webkit-scrollbar {
    display: none;
  }
  > * {
    flex: 0 0 auto;
  }
`;

/**
 * 그룹 설정 시트.
 *
 * 디자인의 `groupinfo`입니다. 그룹장만 이름을 바꾸고, 멤버를 내보내고, 그룹을
 * 지울 수 있습니다. 강퇴는 여러 명을 골라 한 번에 보냅니다.
 */
export const GroupInfoModal = ({
  open,
  group,
  onClose,
}: {
  open: boolean;
  group: GroupDetail | null;
  onClose: () => void;
}) => {
  const navigate = useNavigate();
  const { data: me } = useMe();
  // 시트가 열릴 때마다 새로 마운트되므로(호출 쪽 `key`) 초깃값이 그때의 그룹 이름입니다.
  const [selected, setSelected] = useState<number[]>([]);
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(group?.name ?? "");
  const removeMembers = useRemoveGroupMembers(group?.groupId ?? null);
  const renameGroup = useRenameGroup(group?.groupId ?? null);
  const deleteGroup = useDeleteGroup();
  // 내가 누구인지 알기 전에는 목록을 비워 둡니다 — 나 자신이 강퇴 대상으로 보이면 안 됩니다.
  const others = me ? (group?.members.filter(member => member.userId !== me.userId) ?? []) : [];
  const isLeader = group?.members.find(member => member.userId === me?.userId)?.role === "LEADER";
  const error = removeMembers.error ?? renameGroup.error ?? deleteGroup.error;
  return (
    <Modal open={open} sheet onClose={onClose} aria-label="그룹 설정">
      <SheetForm>
        <GroupInfoTitle>{group?.name ?? "그룹"}</GroupInfoTitle>
        <SheetActions>
          <GroupInfoAction
            type="button"
            disabled={!group || !isLeader}
            title={isLeader ? undefined : "그룹장만 그룹 이름을 바꿀 수 있습니다."}
            onClick={() => setRenaming(!renaming)}
          >
            <img src={icons.edit} alt="" aria-hidden />
            그룹명 수정
          </GroupInfoAction>
          <GroupInfoAction
            type="button"
            disabled={!group || !isLeader || deleteGroup.isPending}
            title={isLeader ? undefined : "그룹장만 그룹을 삭제할 수 있습니다."}
            onClick={async () => {
              if (!group) return;
              if (!window.confirm(`${group.name} 그룹을 삭제할까요? 되돌릴 수 없습니다.`)) return;
              try {
                await deleteGroup.mutateAsync(group.groupId);
                onClose();
                navigate("/");
              } catch {
                /* mutation.error를 시트에 표시합니다. */
              }
            }}
          >
            <img src={icons.trash} alt="" aria-hidden />
            {deleteGroup.isPending ? "삭제 중..." : "그룹 삭제"}
          </GroupInfoAction>
        </SheetActions>
        {renaming ? (
          <SheetField>
            <SheetLabel htmlFor="group-rename">새 그룹 이름</SheetLabel>
            <SheetBox>
              <input
                id="group-rename"
                value={name}
                maxLength={GROUP_NAME_LIMIT}
                placeholder="그룹 이름을 입력하세요"
                onChange={event => setName(event.target.value)}
              />
              <small>
                {name.length}/{GROUP_NAME_LIMIT}
              </small>
            </SheetBox>
            <SheetSubmit
              type="button"
              disabled={!name.trim() || name.trim() === group?.name || renameGroup.isPending}
              onClick={async () => {
                try {
                  await renameGroup.mutateAsync(name.trim());
                  setRenaming(false);
                } catch {
                  /* mutation.error를 표시합니다. */
                }
              }}
            >
              {renameGroup.isPending ? "저장 중..." : "그룹명 수정하기"}
            </SheetSubmit>
          </SheetField>
        ) : null}
        <MemberOptions role="group" aria-label="멤버 고르기">
          {others.length ? (
            others.map(member => (
              <MemberOption
                key={member.userId}
                type="button"
                aria-pressed={selected.includes(member.userId)}
                selected={selected.includes(member.userId)}
                onClick={() =>
                  setSelected(
                    selected.includes(member.userId)
                      ? selected.filter(id => id !== member.userId)
                      : [...selected, member.userId],
                  )
                }
              >
                <i aria-hidden />
                {member.name}
              </MemberOption>
            ))
          ) : (
            <DetailEmpty>아직 다른 멤버가 없습니다.</DetailEmpty>
          )}
        </MemberOptions>
        {error ? <ErrorText>{errorMessage(error)}</ErrorText> : null}
        <SheetCancel
          type="button"
          disabled={selected.length === 0 || removeMembers.isPending || !isLeader}
          title={isLeader ? undefined : "그룹장만 멤버를 내보낼 수 있습니다."}
          onClick={async () => {
            if (!selected.length) return;
            const names = others
              .filter(member => selected.includes(member.userId))
              .map(member => member.name)
              .join(", ");
            if (!window.confirm(`${names}님을 그룹에서 내보낼까요?`)) return;
            try {
              await removeMembers.mutateAsync(selected);
              setSelected([]);
            } catch {
              /* mutation.error를 표시합니다. */
            }
          }}
        >
          {removeMembers.isPending ? "내보내는 중..." : "선택한 멤버 강퇴"}
        </SheetCancel>
      </SheetForm>
    </Modal>
  );
};
const GroupInfoTitle = styled.p`
  margin: 0;
  width: 100%;
  text-align: center;
  font-size: ${theme.text.h2};
  color: ${theme.colors.ink};
  overflow-wrap: anywhere;
`;
const GroupInfoAction = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 0;
  border-radius: 12px;
  background: ${palette.gray200};
  padding: 10px 20px;
  font-size: ${theme.text.s};
  color: ${theme.colors.ink};
  img {
    width: 18px;
    height: 18px;
  }
  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
`;
const MemberOptions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  width: 100%;
`;
const MemberOption = styled.button<{ selected: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 1px solid ${palette.gray200};
  border-radius: ${theme.radius.pill};
  background: ${palette.white};
  padding: 4px 12px 4px 4px;
  font-size: ${theme.text.s};
  color: ${theme.colors.ink};
  white-space: nowrap;
  i {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    border: 1px solid ${palette.gray300};
    background: ${({ selected }) => (selected ? palette.black : palette.gray100)};
  }
`;

/**
 * 초대코드 공유 시트.
 *
 * Figma에 없는 화면이라 `초대코드로 참여하기` 시트를 뒤집은 꼴로 세웠습니다 —
 * 같은 제목 줄과 같은 회색 상자에, 입력칸 대신 그룹의 실제 코드를 보여줍니다.
 * 코드는 `GET /api/v1/groups/{groupId}` 응답에 이미 들어 있어 따로 부르지 않습니다.
 */
export const GroupInviteModal = ({
  open,
  group,
  onClose,
}: {
  open: boolean;
  group: GroupDetail | null;
  onClose: () => void;
}) => {
  const code = group?.inviteCode ?? "";
  // 시트가 열릴 때마다 새로 마운트되므로(호출 쪽 `key`) 안내 문구가 남지 않습니다.
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);
  const copy = async () => {
    if (!code) return;
    setFailed(false);
    try {
      await copyText(code);
      setCopied(true);
    } catch {
      setCopied(false);
      setFailed(true);
    }
  };
  return (
    <Modal open={open} sheet onClose={onClose} aria-label="초대코드 공유하기">
      <SheetForm>
        <SheetHeading>초대코드 공유하기</SheetHeading>
        <SheetField>
          <SheetLabel htmlFor="group-invite-code">초대코드</SheetLabel>
          <SheetBox>
            {/* 읽기 전용 입력칸이라 손으로 고를 수도 있습니다. */}
            <InviteCodeInput id="group-invite-code" value={code} readOnly onFocus={e => e.target.select()} />
          </SheetBox>
        </SheetField>
        {failed ? <ErrorText>복사할 수 없었습니다. 코드를 직접 골라 복사해 주세요.</ErrorText> : null}
        <SheetActions>
          <SheetCancel type="button" onClick={onClose}>
            닫기
          </SheetCancel>
          <SheetSubmit type="button" disabled={!code} onClick={copy}>
            {copied ? "복사했습니다" : "복사하기"}
          </SheetSubmit>
        </SheetActions>
      </SheetForm>
    </Modal>
  );
};
const InviteCodeInput = styled.input`
  letter-spacing: 0.12em;
`;
/**
 * 클립보드 API는 안전한 컨텍스트에서만 있고, 있어도 창이 포커스를 잃었거나 권한이
 * 없으면 거절합니다. 그래서 없을 때뿐 아니라 거절할 때도 옛 방식으로 물러납니다.
 */
const copyText = async (text: string) => {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
  } catch {
    /* 아래 execCommand로 다시 시도합니다. */
  }
  const holder = document.createElement("textarea");
  holder.value = text;
  holder.setAttribute("readonly", "");
  holder.style.position = "fixed";
  holder.style.opacity = "0";
  document.body.append(holder);
  holder.select();
  const done = document.execCommand("copy");
  holder.remove();
  if (!done) throw new Error("copy failed");
};

/**
 * 그룹 만들기 / 초대코드로 참여하기.
 *
 * Figma에 없는 화면이라, 같은 파일의 `modal / category`가 세운 꼴을 따릅니다 —
 * 제목, 라벨 붙은 회색 입력칸, 취소/완료 두 버튼.
 */
export const GroupActionModals = ({ mode, onClose }: { mode: "create" | "join" | null; onClose: () => void }) => {
  const createGroup = useCreateGroup();
  const joinGroup = useJoinGroup();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [code, setCode] = useState("");
  const close = () => {
    setName("");
    setDescription("");
    setCode("");
    onClose();
  };
  const error = createGroup.error ?? joinGroup.error;
  const busy = createGroup.isPending || joinGroup.isPending;
  return (
    <Modal
      open={mode !== null}
      sheet
      onClose={close}
      aria-label={mode === "create" ? "새 그룹 만들기" : "초대코드로 참여하기"}
    >
      <SheetForm>
        <SheetHeading>{mode === "create" ? "새 그룹 만들기" : "초대코드로 참여하기"}</SheetHeading>
        {mode === "create" ? (
          <>
            <SheetField>
              <SheetLabel htmlFor="group-name">그룹 이름</SheetLabel>
              <SheetBox>
                <input
                  id="group-name"
                  value={name}
                  maxLength={GROUP_NAME_LIMIT}
                  placeholder="그룹 이름을 입력하세요"
                  onChange={e => setName(e.target.value)}
                />
                <small>
                  {name.length}/{GROUP_NAME_LIMIT}
                </small>
              </SheetBox>
            </SheetField>
            <SheetField>
              <SheetLabel htmlFor="group-description">그룹 소개</SheetLabel>
              <SheetBox>
                <textarea
                  id="group-description"
                  value={description}
                  maxLength={GROUP_BIO_LIMIT}
                  placeholder="우리 그룹을 소개해 주세요"
                  onChange={e => setDescription(e.target.value)}
                />
                <small>
                  {description.length}/{GROUP_BIO_LIMIT}
                </small>
              </SheetBox>
            </SheetField>
          </>
        ) : (
          <SheetField>
            <SheetLabel htmlFor="group-code">초대코드</SheetLabel>
            <SheetBox>
              <input
                id="group-code"
                value={code}
                maxLength={8}
                placeholder="영문 소문자와 숫자 8자리"
                onChange={e => setCode(e.target.value.toLowerCase())}
              />
            </SheetBox>
          </SheetField>
        )}
        {error ? <ErrorText>{errorMessage(error)}</ErrorText> : null}
        <SheetActions>
          <SheetCancel type="button" onClick={close}>
            취소
          </SheetCancel>
          <SheetSubmit
            type="button"
            disabled={busy || (mode === "create" ? !name.trim() : !isInviteCode(code))}
            onClick={async () => {
              try {
                const group =
                  mode === "create"
                    ? await createGroup.mutateAsync({ name: name.trim(), description: description.trim() })
                    : await joinGroup.mutateAsync({ inviteCode: code });
                close();
                navigate(`/groups/${group.groupId}`);
              } catch {
                /* mutation.error를 시트에 표시합니다. */
              }
            }}
          >
            완료
          </SheetSubmit>
        </SheetActions>
      </SheetForm>
    </Modal>
  );
};
const GROUP_NAME_LIMIT = 20;
const GROUP_BIO_LIMIT = 80;

export const CalendarPanel = ({
  month,
  selectedDate,
  statuses,
  categories,
  onMonthChange,
  onDateChange,
}: {
  month: Date;
  selectedDate: string;
  /** 날짜별 요약. 서버의 daily-status이거나 목록으로 접어 만든 같은 모양입니다. */
  statuses: DailyTodoStatus[];
  categories: Category[];
  onMonthChange: (date: Date) => void;
  onDateChange: (date: string) => void;
}) => {
  const sorted = sortCategories(categories);
  const days = getCalendarDays(month);
  const today = formatLocalDate(new Date());
  const byDate = useMemo(() => new Map(statuses.map(status => [status.date, status])), [statuses]);
  return (
    <CalendarWrap>
      <MonthHeader>
        <MonthInput
          type="month"
          value={`${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`}
          aria-label="월 빠른 이동"
          onChange={e => {
            const [y, m] = e.target.value.split("-").map(Number);
            if (y && m) onMonthChange(new Date(y, m - 1, 1));
          }}
        />
        <MonthButtons>
          <MonthArrow direction="prev" aria-label="이전 달" onClick={() => onMonthChange(addMonths(month, -1))}>
            <img src={icons.arrowUp} alt="" aria-hidden />
          </MonthArrow>
          <MonthArrow direction="next" aria-label="다음 달" onClick={() => onMonthChange(addMonths(month, 1))}>
            <img src={icons.arrowUp} alt="" aria-hidden />
          </MonthArrow>
        </MonthButtons>
      </MonthHeader>
      <WeekRow>
        {["일", "월", "화", "수", "목", "금", "토"].map(day => (
          <span key={day}>{day}</span>
        ))}
      </WeekRow>
      <DaysGrid>
        {days.map((date, index) => {
          if (!date) return <span key={`empty-${index}`} />;
          const value = formatLocalDate(date);
          const status = byDate.get(value);
          // 점은 카테고리 순서(해야할 일 -> 사용자 -> 취미)대로 찍습니다. 서버는
          // categoryId 순으로 주므로 정렬된 카테고리를 훑어 맞춥니다.
          const marks = sorted.flatMap((category, catIndex) => {
            const categoryStatus = status?.categoryStatuses.find(item => item.categoryId === category.categoryId);
            return categoryStatus
              ? [{ accent: categoryAccent(category.color, catIndex), done: categoryStatus.isCompleted }]
              : [];
          });
          return (
            <DayStash
              key={value}
              date={date.getDate()}
              marks={marks}
              incompleteCount={status?.incompleteCount ?? 0}
              // 같은 날 같은 완료 상태면 사분면 배치가 늘 같도록 씨앗을 고정합니다.
              seed={`${value}:${status?.incompleteCount ?? 0}`}
              selected={value === selectedDate}
              today={value === today}
              onClick={() => onDateChange(value)}
            />
          );
        })}
      </DaysGrid>
    </CalendarWrap>
  );
};
const CalendarWrap = styled.section`
  width: min(${theme.layout.calendar}, 100%);
`;
const MonthHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px;
  border-bottom: 1px solid ${theme.colors.line};
  gap: 10px;
`;
const MonthArrow = styled.button<{ direction: "prev" | "next" }>`
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  padding: 0;
  border: 0;
  background: transparent;
  img {
    width: 24px;
    height: 24px;
    transform: rotate(${({ direction }) => (direction === "prev" ? "-90deg" : "90deg")});
  }
`;
const MonthInput = styled.input`
  min-width: 0;
  max-width: 100%;
  border: 0;
  background: transparent;
  font-size: ${theme.text.h3};
  color: ${theme.colors.ink};
  &::-webkit-calendar-picker-indicator {
    opacity: 0.45;
    cursor: pointer;
  }
  @media (max-width: 600px) {
    width: 170px;
    font-size: 18px;
  }
`;
const MonthButtons = styled.div`
  display: flex;
  gap: 5px;
  flex: 0 0 auto;
`;
const WeekRow = styled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 40px;
  text-align: center;
  margin: 12px 0 20px;
  font-size: ${theme.text.h3};
  /* 일요일은 빨강, 토요일은 파랑입니다. */
  span:first-of-type {
    color: ${theme.colors.red};
  }
  span:last-of-type {
    color: ${theme.colors.blue};
  }
  @media (max-width: 600px) {
    gap: 8px;
    font-size: ${theme.text.s};
  }
`;
const DaysGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  column-gap: 40px;
  row-gap: 16px;
  justify-items: center;
  /* 일요일 열은 빨강, 토요일 열은 파랑입니다. */
  > *:nth-child(7n + 1) {
    color: ${theme.colors.red};
  }
  > *:nth-child(7n) {
    color: ${theme.colors.blue};
  }
  @media (max-width: 600px) {
    column-gap: 8px;
  }
`;

/** 기간 할 일이라 시작/마감을 함께 고릅니다. `time`이 빈 문자열이면 미설정입니다. */
type DeadlineValue = { start: string; date: string; time: string };
const formatSheetDate = (value: string) => value.replaceAll("-", ".");
const formatSheetTime = (value: string) => {
  if (!value) return "설정하지 않음";
  const [hour = "0", minute = "00"] = value.split(":");
  const hourNumber = Number(hour);
  return `${hourNumber < 12 ? "AM" : "PM"} ${String(hourNumber % 12 || 12).padStart(2, "0")}:${minute}`;
};

/** 시트 안에 들어가는 달력. 날짜 하나만 고릅니다. */
const SheetCalendar = ({ value, onChange }: { value: string; onChange: (next: string) => void }) => {
  const [month, setMonth] = useState(() => parseLocalDate(value));
  return (
    <SheetCalendarWrap>
      <MonthHeader>
        <MonthInput
          type="month"
          aria-label="월 빠른 이동"
          value={`${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`}
          onChange={e => {
            const [y, m] = e.target.value.split("-").map(Number);
            if (y && m) setMonth(new Date(y, m - 1, 1));
          }}
        />
        <MonthButtons>
          <MonthArrow direction="prev" aria-label="이전 달" onClick={() => setMonth(addMonths(month, -1))}>
            <img src={icons.arrowUp} alt="" aria-hidden />
          </MonthArrow>
          <MonthArrow direction="next" aria-label="다음 달" onClick={() => setMonth(addMonths(month, 1))}>
            <img src={icons.arrowUp} alt="" aria-hidden />
          </MonthArrow>
        </MonthButtons>
      </MonthHeader>
      <SheetWeekRow>
        {["일", "월", "화", "수", "목", "금", "토"].map((day, index) => (
          <span key={day} style={{ color: weekdayTone(index) }}>
            {day}
          </span>
        ))}
      </SheetWeekRow>
      <SheetDaysGrid>
        {getCalendarDays(month).map((date, index) => {
          if (!date) return <span key={`empty-${index}`} />;
          const day = formatLocalDate(date);
          return (
            <SheetDay
              key={day}
              type="button"
              selected={day === value}
              tone={weekdayTone(date.getDay())}
              onClick={() => onChange(day)}
            >
              {String(date.getDate()).padStart(2, "0")}
            </SheetDay>
          );
        })}
      </SheetDaysGrid>
    </SheetCalendarWrap>
  );
};
/** 일요일은 빨강, 토요일은 파랑입니다. */
const weekdayTone = (day: number) => (day === 0 ? theme.colors.red : day === 6 ? theme.colors.blue : theme.colors.ink);
const SheetCalendarWrap = styled.div`
  width: 100%;
`;
const SheetWeekRow = styled.div`
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  justify-items: center;
  margin: 12px 0 16px;
  font-size: ${theme.text.s};
`;
const SheetDaysGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  justify-items: center;
  row-gap: 16px;
`;
const SheetDay = styled.button<{ selected: boolean; tone: string }>`
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  padding: 0;
  border: 0;
  border-radius: ${theme.radius.pill};
  font-size: ${theme.text.s};
  background: ${({ selected }) => (selected ? palette.black : "transparent")};
  color: ${({ selected, tone }) => (selected ? palette.white : tone)};
`;

/** 시(hour)/분(minute)을 pill로 고르는 판. Figma의 `deadline - time`입니다. */
const TimeChooser = ({ value, onChange }: { value: string; onChange: (next: string) => void }) => {
  const [hour = "", minute = "00"] = value ? value.split(":") : [];
  const hourNumber = value ? Number(hour) : null;
  const meridiem = hourNumber === null ? null : hourNumber < 12 ? "AM" : "PM";
  const displayHour = hourNumber === null ? null : hourNumber % 12 || 12;
  const compose = (nextMeridiem: "AM" | "PM", nextHour: number, nextMinute: string) => {
    const base = nextHour % 12;
    onChange(`${String(nextMeridiem === "AM" ? base : base + 12).padStart(2, "0")}:${nextMinute}`);
  };
  return (
    <TimePanel>
      <TimeBlock>
        <TimeLabel>오전/오후 선택하기</TimeLabel>
        <TimePills>
          <TimePill type="button" selected={value === ""} onClick={() => onChange("")}>
            설정하지 않음
          </TimePill>
          {(["AM", "PM"] as const).map(key => (
            <TimePill
              key={key}
              type="button"
              selected={meridiem === key}
              onClick={() => compose(key, displayHour ?? 12, minute)}
            >
              {key === "AM" ? "오전(AM)" : "오후(PM)"}
            </TimePill>
          ))}
        </TimePills>
      </TimeBlock>
      <TimeColumns>
        <TimeBlock>
          <TimeLabel>시(hour) 선택하기</TimeLabel>
          <TimeGrid>
            {Array.from({ length: 12 }, (_, index) => index + 1).map(item => (
              <TimeCell
                key={item}
                type="button"
                selected={displayHour === item}
                onClick={() => compose(meridiem ?? "AM", item, minute)}
              >
                {item}
              </TimeCell>
            ))}
          </TimeGrid>
        </TimeBlock>
        <TimeBlock>
          <TimeLabel>분(minute) 선택하기</TimeLabel>
          <TimeGrid>
            {Array.from({ length: 12 }, (_, index) => String(index * 5).padStart(2, "0")).map(item => (
              <TimeCell
                key={item}
                type="button"
                selected={value !== "" && minute === item}
                onClick={() => compose(meridiem ?? "AM", displayHour ?? 12, item)}
              >
                {item}
              </TimeCell>
            ))}
          </TimeGrid>
        </TimeBlock>
      </TimeColumns>
    </TimePanel>
  );
};
const TimePanel = styled.div`
  display: grid;
  gap: 20px;
  padding: 20px;
  @media (max-width: 600px) {
    padding: 12px 0;
  }
`;
const TimeBlock = styled.div`
  display: grid;
  gap: 8px;
  justify-items: start;
`;
const TimeLabel = styled.p`
  margin: 0;
  font-size: ${theme.text.s};
  color: ${theme.colors.ink};
`;
const TimeColumns = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 40px;
`;
const TimePills = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
`;
const TimeGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(6, 36px);
  gap: 8px;
`;
const TimePill = styled.button<{ selected: boolean }>`
  display: grid;
  place-items: center;
  border: 1px solid ${({ selected }) => (selected ? "transparent" : palette.gray200)};
  border-radius: ${theme.radius.pill};
  padding: 4px 30px;
  font-size: ${theme.text.s};
  background: ${({ selected }) => (selected ? palette.black : palette.gray100)};
  color: ${({ selected }) => (selected ? palette.white : theme.colors.ink)};
`;
const TimeCell = styled(TimePill)`
  width: 36px;
  height: 36px;
  padding: 0;
`;

/* 시트가 공통으로 쓰는 조각입니다. 회색 줄을 누르면 그 아래에 고르는 판이 열립니다. */
const SheetForm = styled.div`
  display: grid;
  gap: 20px;
`;
const SheetHeading = styled.p`
  margin: 0;
  font-size: ${theme.text.h3};
  color: ${theme.colors.ink};
  b {
    margin-left: 8px;
    font-weight: inherit;
    color: ${theme.colors.red};
  }
`;
const SheetRows = styled.div`
  display: grid;
  gap: 8px;
`;
const SheetRow = styled.button`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  border: 0;
  border-radius: ${theme.radius.sm};
  background: ${theme.colors.panel};
  padding: 8px 20px;
  font-size: ${theme.text.s};
  color: ${theme.colors.ink};
  text-align: left;
  &[aria-expanded="true"] {
    background: ${palette.gray200};
  }
`;
const SheetSubmit = styled.button`
  width: 100%;
  border: 0;
  border-radius: 12px;
  background: ${palette.black};
  padding: 6px 20px;
  font-size: ${theme.text.s};
  color: ${palette.white};
  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
`;

const SheetCancel = styled(SheetSubmit)`
  background: ${palette.gray200};
  color: ${theme.colors.ink};
`;
const SheetField = styled.div`
  display: grid;
  gap: 8px;
  width: 100%;
`;
const SheetLabel = styled.label`
  font-size: ${theme.text.s};
  color: ${theme.colors.ink};
`;
/** 라벨 아래 회색 입력 상자. 글자 수는 상자 안 오른쪽에 붙습니다. */
const SheetBox = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 12px;
  width: 100%;
  border-radius: ${theme.radius.sm};
  background: ${theme.colors.panel};
  padding: 12px 20px;
  input,
  textarea {
    flex: 1;
    min-width: 0;
    border: 0;
    background: transparent;
    padding: 0;
    font-size: ${theme.text.s};
    color: ${theme.colors.ink};
    &::placeholder {
      color: ${theme.colors.muted};
    }
  }
  textarea {
    min-height: 72px;
    resize: vertical;
  }
  small {
    flex: none;
    font-size: ${theme.text.s};
    color: ${theme.colors.muted};
  }
`;
const SheetActions = styled.div`
  display: flex;
  gap: 20px;
  > * {
    flex: 1;
  }
  @media (max-width: 600px) {
    gap: 12px;
  }
`;

export const CategoryManageModal = ({
  category,
  open,
  onClose,
}: {
  category: Category | null;
  open: boolean;
  onClose: () => void;
}) => {
  const [name, setName] = useState(category?.name ?? "");
  const update = useUpdateCategory();
  return (
    <Modal open={open} sheet onClose={onClose} aria-label="카테고리 이름 변경">
      <SheetForm>
        <SheetHeading>카테고리 이름 변경</SheetHeading>
        <SheetField>
          <SheetLabel htmlFor="category-name">이름</SheetLabel>
          <SheetBox>
            <input id="category-name" value={name} maxLength={16} onChange={e => setName(e.target.value)} />
          </SheetBox>
        </SheetField>
        {update.error ? <ErrorText>{errorMessage(update.error)}</ErrorText> : null}
        <SheetActions>
          <SheetCancel type="button" onClick={onClose}>
            취소
          </SheetCancel>
          <SheetSubmit
            type="button"
            disabled={!category || !name.trim() || update.isPending}
            onClick={async () => {
              if (!category) return;
              try {
                await update.mutateAsync({
                  id: category.categoryId,
                  body: { name: name.trim(), color: category.color },
                });
                onClose();
              } catch {
                /* mutation.error를 표시합니다. */
              }
            }}
          >
            완료
          </SheetSubmit>
        </SheetActions>
      </SheetForm>
    </Modal>
  );
};

/** 선행 할 일이 남아 완료를 막을 때 뜨는 시트. Figma에는 없고 규칙상 필요합니다. */
export const DependencyBlockModal = ({
  todos,
  open,
  onClose,
}: {
  todos: Todo[];
  open: boolean;
  onClose: () => void;
}) => (
  <Modal open={open} sheet onClose={onClose} aria-label="먼저 완료해야 할 일이 있어요">
    <SheetForm>
      <SheetHeading>먼저 완료해야 할 일이 있어요</SheetHeading>
      <SheetRows>
        {todos.map(todo => (
          <SheetRow as="div" key={todo.todoId}>
            <span>{todo.title}</span>
          </SheetRow>
        ))}
      </SheetRows>
      <SheetSubmit type="button" onClick={onClose}>
        확인
      </SheetSubmit>
    </SheetForm>
  </Modal>
);

/** 세부사항 글자 수. 디자인의 카운터가 0/100입니다. */
const TODO_DETAIL_LIMIT = 100;

/**
 * 할 일 상세 시트.
 *
 * 제목은 여기서 고치지 않습니다 — "할 일 수정하기"를 누르면 시트를 닫고 목록에서
 * 바로 고치게 합니다(추가할 때와 같은 입력 줄). 세부사항·중요도·선행 할 일은 이
 * 안에서 저장하고, 마감기한과 루틴은 각자의 모달을 엽니다.
 */
export const TodoDetailModal = ({
  open,
  todo,
  categories,
  todos,
  selectedDate,
  onClose,
  onEditTitle,
}: {
  open: boolean;
  todo: Todo | null;
  categories: Category[];
  todos: Todo[];
  selectedDate: string;
  onClose: () => void;
  onEditTitle: (todo: Todo) => void;
}) => {
  const updateTodo = useUpdateTodo();
  const addDependency = useAddDependency();
  const deleteTodo = useDeleteTodo();
  const convertToRoutine = useConvertToRoutine();
  const deleteRoutine = useDeleteRoutine();
  const invalidateTodos = useInvalidateTodos();
  const [detail, setDetail] = useState(todo?.description ?? "");
  /**
   * 마지막으로 저장한 세부사항입니다.
   *
   * 엔터로 저장한 뒤 포커스가 빠질 때 같은 값을 또 보내지 않으려고 들고 있습니다.
   * `todo.description`과 비교하면 안 됩니다 — 상세 시트가 들고 있는 할 일은 저장
   * 뒤에도 갱신되지 않아 방금 보낸 값을 모릅니다.
   */
  const savedDetail = useRef(todo?.description ?? "");
  const [importance, setImportance] = useState<Importance>(todo?.importance ?? "NONE");
  const [dependency, setDependency] = useState<number | null>(todo?.dependencies[0] ?? null);
  const [deadline, setDeadline] = useState<DeadlineValue>({
    start: dateOnly(todo?.startDate) ?? selectedDate,
    date: dateOnly(todo?.dueDate) ?? dateOnly(todo?.startDate) ?? selectedDate,
    time: todo?.time ?? "",
  });
  const [deadlineOpen, setDeadlineOpen] = useState(false);
  const [routineOpen, setRoutineOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const ordered = sortCategories(categories);
  const candidates = todos.filter(
    candidate =>
      candidate.todoId !== todo?.todoId &&
      coversDate(candidate, selectedDate) &&
      !isHobbyCategory(ordered.find(category => category.categoryId === candidate.categoryId) ?? { name: "취미" }),
  );
  const saveDetail = () => {
    if (detail === savedDetail.current) return;
    savedDetail.current = detail;
    void patch({ description: detail });
  };
  const patch = async (body: TodoPatchRequest) => {
    if (!todo) return;
    setBusy(true);
    setError("");
    try {
      await updateTodo.mutateAsync({ id: todo.todoId, body });
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <Modal open={open} sheet onClose={onClose} aria-label="할 일 상세">
        {todo ? (
          <DetailSheet>
            <DetailTitle>{todo.title}</DetailTitle>
            <DetailBody>
              <div>
                <DetailActions>
                  <DetailAction onClick={() => onEditTitle(todo)}>
                    <img src={icons.edit} alt="" aria-hidden />할 일 수정하기
                  </DetailAction>
                  <DetailAction
                    disabled={deleteTodo.isPending}
                    onClick={async () => {
                      // 회차 하나를 지워도 서버는 루틴 전체를 지웁니다. 먼저 알립니다.
                      const question = todo.routineId
                        ? "이 할 일은 루틴입니다. 지우면 완료한 회차까지 루틴 전체가 사라집니다. 삭제할까요?"
                        : "이 할 일을 삭제할까요?";
                      if (!window.confirm(question)) return;
                      setError("");
                      try {
                        await deleteTodo.mutateAsync(todo.todoId);
                        onClose();
                      } catch (reason) {
                        setError(errorMessage(reason));
                      }
                    }}
                  >
                    <img src={icons.trash} alt="" aria-hidden />할 일 삭제하기
                  </DetailAction>
                </DetailActions>
                <DetailBlock>
                  <DetailLabel>할 일에 대한 세부사항 입력하기</DetailLabel>
                  <DetailField>
                    <input
                      value={detail}
                      maxLength={TODO_DETAIL_LIMIT}
                      placeholder="세부사항을 작성하세요..."
                      disabled={busy}
                      onChange={event => setDetail(event.target.value)}
                      // 엔터로 바로 저장합니다. 계속 고칠 수 있게 포커스는 두고 갑니다.
                      onKeyDown={event => {
                        if (event.key !== "Enter") return;
                        event.preventDefault();
                        saveDetail();
                      }}
                      onBlur={saveDetail}
                    />
                    <small>
                      {detail.length}/{TODO_DETAIL_LIMIT}
                    </small>
                  </DetailField>
                </DetailBlock>
                <DetailBlock>
                  <DetailLabel>Q. 이 일을 하기 전 선행해야 할 일이 있나요?</DetailLabel>
                  {candidates.length ? (
                    <DependencyRows>
                      {candidates.map(candidate => {
                        const index = ordered.findIndex(category => category.categoryId === candidate.categoryId);
                        const accent = categoryAccent(ordered[index]?.color, Math.max(index, 0));
                        const chosen = dependency === candidate.todoId;
                        return (
                          <DependencyRow
                            key={candidate.todoId}
                            aria-pressed={chosen}
                            disabled={busy}
                            onClick={async () => {
                              setDependency(chosen ? null : candidate.todoId);
                              if (chosen) return;
                              setError("");
                              try {
                                await addDependency.mutateAsync({
                                  id: todo.todoId,
                                  dependencyTodoId: candidate.todoId,
                                });
                                invalidateTodos();
                              } catch (reason) {
                                setError(errorMessage(reason));
                              }
                            }}
                          >
                            <StatusCluster
                              fills={chosen ? [accent, accent, accent, accent] : [null, null, null, null]}
                              checked={chosen}
                            />
                            <span>{candidate.title}</span>
                          </DependencyRow>
                        );
                      })}
                    </DependencyRows>
                  ) : (
                    <DetailEmpty>선택할 수 있는 선행 할 일이 없습니다.</DetailEmpty>
                  )}
                </DetailBlock>
              </div>
              <div>
                <DetailBlock>
                  <DetailLabel>중요도(우선순위) 설정하기</DetailLabel>
                  <DetailPills>
                    {(
                      [
                        ["NONE", "선택하지 않음"],
                        ["HIGH", "높음"],
                        ["LOW", "낮음"],
                      ] as const
                    ).map(([key, label]) => (
                      <Button
                        key={key}
                        variant={importance === key ? "primary" : "soft"}
                        disabled={busy}
                        onClick={() => {
                          setImportance(key);
                          void patch({ importance: key });
                        }}
                      >
                        {label}
                      </Button>
                    ))}
                  </DetailPills>
                </DetailBlock>
                <DetailBlock>
                  <DetailAction onClick={() => setDeadlineOpen(true)}>
                    <img src={icons.calendar} alt="" aria-hidden />
                    마감기한 설정하기
                  </DetailAction>
                  {todo.routineId ? (
                    <DetailAction
                      disabled={deleteRoutine.isPending}
                      onClick={async () => {
                        if (!todo.routineId) return;
                        if (!window.confirm("이 루틴의 모든 회차를 삭제할까요? 완료한 회차도 함께 사라집니다.")) return;
                        setError("");
                        try {
                          await deleteRoutine.mutateAsync(todo.routineId);
                          onClose();
                        } catch (reason) {
                          setError(errorMessage(reason));
                        }
                      }}
                    >
                      <img src={icons.routine} alt="" aria-hidden />
                      {deleteRoutine.isPending ? "삭제 중..." : "루틴 전체 삭제하기"}
                    </DetailAction>
                  ) : (
                    <DetailAction onClick={() => setRoutineOpen(true)}>
                      <img src={icons.routine} alt="" aria-hidden />
                      루틴으로 등록하기
                    </DetailAction>
                  )}
                </DetailBlock>
              </div>
            </DetailBody>
            {error ? <ErrorText>{error}</ErrorText> : null}
          </DetailSheet>
        ) : null}
      </Modal>
      <DeadlineModal
        open={deadlineOpen}
        value={deadline}
        onChange={next => {
          setDeadline(next);
          void patch({ startDate: next.start, dueDate: next.date, time: next.time || null });
        }}
        onClose={() => setDeadlineOpen(false)}
      />
      <RoutineModal
        key={`${routineOpen}-${selectedDate}`}
        open={routineOpen}
        initialDate={dateOnly(todo?.startDate) ?? selectedDate}
        initialTime={todo?.time ?? ""}
        onClose={() => setRoutineOpen(false)}
        onRegister={async (value, requestId) => {
          if (!todo) return;
          setError("");
          try {
            // 원본이 첫 회차가 되므로 새로 만들지 않고 이 할 일을 루틴으로 돌립니다.
            await convertToRoutine.mutateAsync({
              id: todo.todoId,
              body: {
                requestId,
                startDate: value.start,
                endDate: value.end,
                time: value.time || null,
                recurrence: toRecurrence(value.repeat, value.weekdays),
              },
            });
            invalidateTodos();
            setRoutineOpen(false);
            onClose();
          } catch (reason) {
            setError(errorMessage(reason));
          }
        }}
      />
    </>
  );
};

const DetailSheet = styled.div`
  display: grid;
  gap: 32px;
`;
const DetailTitle = styled.p`
  margin: 0;
  text-align: center;
  font-size: ${theme.text.h3};
  color: ${theme.colors.ink};
  overflow-wrap: anywhere;
`;
const DetailBody = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 357px) minmax(0, 1fr);
  gap: 60px;
  align-items: start;
  > div {
    display: grid;
    gap: 40px;
    align-content: start;
  }
  @media (max-width: 700px) {
    grid-template-columns: 1fr;
    gap: 32px;
    > div {
      gap: 28px;
    }
  }
`;
const DetailActions = styled.div`
  display: flex;
  gap: 20px;
`;
const DetailAction = styled.button`
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  gap: 10px;
  border: 0;
  border-radius: 12px;
  background: ${palette.gray200};
  padding: 10px 20px;
  font-size: ${theme.text.s};
  color: ${theme.colors.ink};
  white-space: nowrap;
  img {
    width: 18px;
    height: 18px;
  }
  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
`;
const DetailBlock = styled.div`
  display: grid;
  gap: 12px;
  justify-items: start;
`;
const DetailLabel = styled.p`
  margin: 0;
  font-size: ${theme.text.h3};
  color: ${theme.colors.ink};
`;
const DetailField = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  border-radius: ${theme.radius.sm};
  background: ${theme.colors.panel};
  padding: 12px 20px;
  input {
    flex: 1;
    min-width: 0;
    border: 0;
    background: transparent;
    padding: 0;
    font-size: ${theme.text.s};
    color: ${theme.colors.ink};
    &::placeholder {
      color: ${theme.colors.muted};
    }
  }
  small {
    flex: none;
    font-size: ${theme.text.s};
    color: ${theme.colors.muted};
  }
`;
const DependencyRows = styled.div`
  display: grid;
  width: 100%;
`;
const DependencyRow = styled.button`
  display: flex;
  align-items: center;
  gap: 12px;
  border: 0;
  border-radius: ${theme.radius.sm};
  background: transparent;
  padding: 6px 8px;
  text-align: left;
  font-size: ${theme.text.h3};
  color: ${theme.colors.ink};
  span {
    min-width: 0;
    overflow-wrap: anywhere;
  }
  &:disabled {
    cursor: progress;
  }
`;
const DetailEmpty = styled.small`
  color: ${theme.colors.muted};
`;
const DetailPills = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

/**
 * 마감기한 시트.
 *
 * 회색 줄을 누르면 그 아래에 달력과 시간 판이 열립니다. 디자인에 취소 버튼이 없어,
 * 뒤 배경을 눌러 닫습니다.
 *
 * 서버가 기간 할 일을 받으므로 시작 날짜 줄이 함께 있습니다 — 시작일부터 마감일까지
 * 양끝을 포함한 모든 날에 같은 할 일이 나타납니다. 마감일을 시작일보다 앞으로
 * 당기면 시작일도 같이 당겨 잘못된 기간을 서버에 보내지 않습니다.
 */
export const DeadlineModal = ({
  open,
  value,
  onChange,
  onClose,
}: {
  open: boolean;
  value: DeadlineValue;
  onChange: (next: DeadlineValue) => void;
  onClose: () => void;
}) => {
  const [panel, setPanel] = useState<"start" | "date" | "time" | null>("date");
  return (
    <Modal open={open} sheet onClose={onClose} aria-label="마감기한 설정하기">
      <SheetForm>
        <SheetHeading>
          마감기한 설정하기<b>*</b>
        </SheetHeading>
        <SheetRows>
          <SheetRow
            type="button"
            aria-expanded={panel === "start"}
            onClick={() => setPanel(panel === "start" ? null : "start")}
          >
            <span>시작 날짜</span>
            <span>{formatSheetDate(value.start)}</span>
          </SheetRow>
          {panel === "start" ? (
            <SheetCalendar
              value={value.start}
              onChange={start => onChange({ ...value, start, date: start > value.date ? start : value.date })}
            />
          ) : null}
          <SheetRow
            type="button"
            aria-expanded={panel === "date"}
            onClick={() => setPanel(panel === "date" ? null : "date")}
          >
            <span>마감 날짜</span>
            <span>{formatSheetDate(value.date)}</span>
          </SheetRow>
          {panel === "date" ? (
            <SheetCalendar
              value={value.date}
              onChange={date => onChange({ ...value, date, start: date < value.start ? date : value.start })}
            />
          ) : null}
          <SheetRow
            type="button"
            aria-expanded={panel === "time"}
            onClick={() => setPanel(panel === "time" ? null : "time")}
          >
            <span>시간 설정</span>
            <span>{formatSheetTime(value.time)}</span>
          </SheetRow>
          {panel === "time" ? <TimeChooser value={value.time} onChange={time => onChange({ ...value, time })} /> : null}
        </SheetRows>
        <SheetSubmit type="button" onClick={onClose}>
          마감기한 설정하기
        </SheetSubmit>
      </SheetForm>
    </Modal>
  );
};

export interface RoutineValue {
  start: string;
  end: string;
  time: string;
  repeat: RoutineRepeat;
  /** 월=1 ~ 일=7. 매주/격주에서만 씁니다. */
  weekdays: number[];
}
/**
 * 루틴 시트.
 *
 * 서버가 반복 날짜를 한 요청으로 펼치므로, 여기서는 규칙만 모아 `onRegister`에
 * 넘깁니다. 매주/격주를 고르면 요일 줄이 열립니다.
 *
 * `requestId`는 시트가 한 번 뽑아 들고 있다가 등록마다 같은 값을 넘깁니다 —
 * 실패하고 다시 눌렀을 때 새 키를 쓰면 서버가 루틴을 하나 더 만들기 때문입니다.
 */
export const RoutineModal = ({
  open,
  initialDate,
  initialTime = "",
  onRegister,
  onClose,
}: {
  open: boolean;
  initialDate: string;
  initialTime?: string;
  onRegister: (value: RoutineValue, requestId: string) => Promise<void>;
  onClose: () => void;
}) => {
  const [value, setValue] = useState<RoutineValue>({
    start: initialDate,
    end: initialDate,
    time: initialTime,
    repeat: "DAILY",
    weekdays: [weekdayOf(initialDate)],
  });
  const [panel, setPanel] = useState<"start" | "end" | "time" | "repeat" | "weekdays" | null>("repeat");
  const [busy, setBusy] = useState(false);
  // 같은 시트가 열려 있는 동안은 재시도해도 같은 키를 씁니다.
  const requestId = useRef(crypto.randomUUID());
  const toggle = (next: "start" | "end" | "time" | "repeat" | "weekdays") => () =>
    setPanel(panel === next ? null : next);
  const showWeekdays = repeatUsesWeekdays(value.repeat);
  const invalidRange = value.end < value.start;
  const missingWeekday = showWeekdays && value.weekdays.length === 0;
  return (
    <Modal open={open} sheet onClose={onClose} aria-label="루틴으로 등록하기">
      <SheetForm>
        <SheetHeading>
          루틴으로 등록하기<b>*</b>
        </SheetHeading>
        <SheetRows>
          <SheetRow type="button" aria-expanded={panel === "start"} onClick={toggle("start")}>
            <span>시작 날짜</span>
            <span>{formatSheetDate(value.start)}</span>
          </SheetRow>
          {panel === "start" ? (
            <SheetCalendar
              value={value.start}
              onChange={start => setValue({ ...value, start, end: start > value.end ? start : value.end })}
            />
          ) : null}
          <SheetRow type="button" aria-expanded={panel === "end"} onClick={toggle("end")}>
            <span>종료 날짜</span>
            <span>{formatSheetDate(value.end)}</span>
          </SheetRow>
          {panel === "end" ? <SheetCalendar value={value.end} onChange={end => setValue({ ...value, end })} /> : null}
          <SheetRow type="button" aria-expanded={panel === "time"} onClick={toggle("time")}>
            <span>시간 설정</span>
            <span>{formatSheetTime(value.time)}</span>
          </SheetRow>
          {panel === "time" ? <TimeChooser value={value.time} onChange={time => setValue({ ...value, time })} /> : null}
          <SheetRow type="button" aria-expanded={panel === "repeat"} onClick={toggle("repeat")}>
            <span>루틴 반복</span>
            <span>{ROUTINE_REPEATS.find(item => item.key === value.repeat)?.label}</span>
          </SheetRow>
          {panel === "repeat" ? (
            <RepeatList role="radiogroup" aria-label="루틴 반복">
              {ROUTINE_REPEATS.map(item => (
                <RepeatOption
                  key={item.key}
                  type="button"
                  role="radio"
                  aria-checked={value.repeat === item.key}
                  selected={value.repeat === item.key}
                  onClick={() =>
                    setValue({
                      ...value,
                      repeat: item.key,
                      // 요일을 지운 채로 매주를 다시 고르면 시작일 요일로 되돌립니다.
                      weekdays: value.weekdays.length ? value.weekdays : [weekdayOf(value.start)],
                    })
                  }
                >
                  <i aria-hidden />
                  {item.label}
                </RepeatOption>
              ))}
            </RepeatList>
          ) : null}
          {showWeekdays ? (
            <>
              <SheetRow type="button" aria-expanded={panel === "weekdays"} onClick={toggle("weekdays")}>
                <span>반복 요일</span>
                <span>
                  {value.weekdays.length
                    ? WEEKDAYS.filter(day => value.weekdays.includes(day.value))
                        .map(day => day.label)
                        .join(" ")
                    : "고르지 않음"}
                </span>
              </SheetRow>
              {panel === "weekdays" ? (
                <WeekdayRow role="group" aria-label="반복 요일">
                  {WEEKDAYS.map(day => {
                    const chosen = value.weekdays.includes(day.value);
                    return (
                      <WeekdayButton
                        key={day.value}
                        type="button"
                        aria-pressed={chosen}
                        selected={chosen}
                        onClick={() =>
                          setValue({
                            ...value,
                            weekdays: chosen
                              ? value.weekdays.filter(item => item !== day.value)
                              : [...value.weekdays, day.value],
                          })
                        }
                      >
                        {day.label}
                      </WeekdayButton>
                    );
                  })}
                </WeekdayRow>
              ) : null}
            </>
          ) : null}
        </SheetRows>
        {invalidRange ? <ErrorText>종료 날짜가 시작 날짜보다 앞설 수 없습니다.</ErrorText> : null}
        {missingWeekday ? <ErrorText>반복할 요일을 하나 이상 고르세요.</ErrorText> : null}
        <SheetSubmit
          type="button"
          disabled={busy || invalidRange || missingWeekday}
          onClick={async () => {
            setBusy(true);
            try {
              await onRegister(value, requestId.current);
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "등록 중..." : "루틴으로 등록하기"}
        </SheetSubmit>
      </SheetForm>
    </Modal>
  );
};
const WeekdayRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 8px 20px;
`;
const WeekdayButton = styled.button<{ selected: boolean }>`
  width: 36px;
  height: 36px;
  border: 1px solid ${palette.gray200};
  border-radius: 50%;
  background: ${({ selected }) => (selected ? palette.black : palette.white)};
  color: ${({ selected }) => (selected ? palette.white : theme.colors.ink)};
  font-size: ${theme.text.s};
`;
const RepeatList = styled.div`
  display: grid;
  justify-items: start;
  gap: 8px;
  padding: 8px 20px;
`;
const RepeatOption = styled.button<{ selected: boolean }>`
  display: flex;
  align-items: center;
  gap: 12px;
  border: 0;
  background: transparent;
  padding: 0;
  font-size: ${theme.text.s};
  color: ${theme.colors.ink};
  i {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    border: 1px solid ${palette.gray300};
    background: ${({ selected }) => (selected ? palette.black : palette.gray100)};
  }
`;

export const CategorySection = ({
  category,
  index,
  todos,
  own,
  adding,
  editingTitleId,
  onAdd,
  onCancelAdd,
  onCreate,
  onRenameTitle,
  onManage,
  onToggle,
  onEdit,
}: {
  category: Category;
  index: number;
  todos: Todo[];
  own: boolean;
  /** 이 카테고리에 인라인 입력 줄이 열려 있는지. */
  adding?: boolean;
  /** 제목을 인라인으로 고치는 중인 할 일. */
  editingTitleId?: number | null;
  onAdd: (category: Category) => void;
  onCancelAdd: () => void;
  onCreate: (category: Category, title: string) => Promise<void>;
  onRenameTitle: (todo: Todo, title: string) => Promise<void>;
  onManage: (category: Category) => void;
  onToggle: (todo: Todo) => void;
  onEdit: (todo: Todo) => void;
}) => {
  const accent = categoryAccent(category.color, index);
  return (
    <CategoryColumn>
      <CategoryPill
        name={category.name}
        accent={accent}
        own={own}
        onAdd={own ? () => onAdd(category) : undefined}
        onManage={own && index > 0 && index < 3 ? () => onManage(category) : undefined}
      />
      <TodoList>
        {todos.map(todo =>
          todo.todoId === editingTitleId ? (
            <TodoDraftRow
              key={todo.todoId}
              accent={accent}
              initial={todo.title}
              onCancel={onCancelAdd}
              onCommit={title => onRenameTitle(todo, title)}
            />
          ) : (
            <SharedTodoRow
              key={todo.todoId}
              todo={todo}
              accent={accent}
              own={own}
              onToggle={() => onToggle(todo)}
              onEdit={() => onEdit(todo)}
            />
          ),
        )}
        {adding ? (
          <TodoDraftRow accent={accent} onCancel={onCancelAdd} onCommit={title => onCreate(category, title)} />
        ) : null}
      </TodoList>
    </CategoryColumn>
  );
};

/** 할 일 제목 글자 수. 디자인의 카운터가 0/40입니다. */
const TODO_TITLE_LIMIT = 40;

/**
 * 목록 안에서 바로 쓰는 입력 줄.
 *
 * 제목만 받아 만들고, 나머지 설정은 만든 뒤 상세에서 손봅니다. Enter로 만들고
 * Esc로 접습니다. 내용 없이 포커스를 잃으면 그냥 닫힙니다.
 */
const TodoDraftRow = ({
  accent,
  initial = "",
  onCancel,
  onCommit,
}: {
  accent: string;
  initial?: string;
  onCancel: () => void;
  onCommit: (title: string) => Promise<void>;
}) => {
  const [title, setTitle] = useState(initial);
  const [busy, setBusy] = useState(false);
  const commit = async () => {
    if (!title.trim() || busy) return;
    setBusy(true);
    try {
      await onCommit(title.trim());
    } finally {
      setBusy(false);
    }
  };
  return (
    <DraftRow style={{ borderBottomColor: accent }}>
      <StatusCluster fills={[null, null, null, null]} />
      <input
        autoFocus
        value={title}
        maxLength={TODO_TITLE_LIMIT}
        disabled={busy}
        placeholder="할 일 입력"
        onChange={event => setTitle(event.target.value)}
        onKeyDown={event => {
          if (event.key === "Enter") void commit();
          if (event.key === "Escape") onCancel();
        }}
        onBlur={() => {
          if (!title.trim()) onCancel();
        }}
      />
      <small>
        {title.length}/{TODO_TITLE_LIMIT}
      </small>
    </DraftRow>
  );
};
const DraftRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 8px;
  /* 디자인에서는 입력 중인 줄만 카테고리 색 밑줄을 답니다. */
  border-bottom: 2px solid;
  input {
    flex: 1;
    min-width: 0;
    border: 0;
    background: transparent;
    padding: 0;
    font-size: ${theme.text.h3};
    color: ${theme.colors.ink};
    &::placeholder {
      color: ${theme.colors.muted};
    }
  }
  small {
    flex: none;
    font-size: ${theme.text.h3};
    color: ${theme.colors.muted};
  }
`;
const CategoryColumn = styled.section`
  min-width: 0;
`;
const TodoList = styled.div`
  display: grid;
  margin-top: 20px;
  @media (max-width: 600px) {
    margin-top: 14px;
  }
`;
