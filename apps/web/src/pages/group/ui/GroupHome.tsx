import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useGroup } from "@/entities/group";
import { useMe } from "@/entities/user";
import { GroupInviteModal } from "@/features/group-invite";
import { GroupInfoModal } from "@/features/group-settings";
import { AppShell } from "@/shared/ui";
import { GroupTopBar } from "@/widgets/group-top-bar";
import { MemberTabs } from "@/widgets/member-bar";
import { PageNav } from "@/widgets/page-nav";
import { TodoWorkspace } from "@/widgets/todo-workspace";

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
      {/*
       * 누구의 할 일을 볼지 정해진 뒤에 보드를 겁니다.
       *
       * 내 차례인지 남의 차례인지는 `me`가 와야 알 수 있는데, 오기 전에 걸어 두면
       * 남의 보드로 한 번 그렸다가 내 보드로 바꿔 답니다. 그 사이 두 보드가 각자
       * 카테고리·할 일·달 요약·일기를 받아 오므로, 그룹 주소를 직접 열 때마다
       * 네 가지를 두 번씩 받고 첫 번은 버려집니다.
       */}
      {me === undefined ? null : own ? (
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
