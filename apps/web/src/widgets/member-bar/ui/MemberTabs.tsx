import styled from "@emotion/styled";
import type { GroupMember } from "@/shared/api";
import { MemberChip } from "@/entities/group";
import { Button, Skeleton, SrOnly, hoverScrollbarPull, hoverScrollbarX, palette, theme } from "@/shared/ui";

export const MemberTabs = ({
  members,
  activeUserId,
  loading = false,
  onSelect,
  onShareInvite,
}: {
  members: GroupMember[];
  activeUserId: number | null;
  /** 그룹을 아직 받아 오는 중인지. 빈 줄 대신 칩 자리를 잡아 둡니다. */
  loading?: boolean;
  onSelect: (userId: number) => void;
  onShareInvite?: () => void;
}) => (
  <MemberBar>
    <MemberRow role={loading ? "status" : undefined}>
      {loading ? (
        <>
          <SrOnly>멤버를 불러오는 중</SrOnly>
          {["132px", "108px", "124px"].map(width => (
            <Skeleton key={width} width={width} height="48px" radius={theme.radius.pill} />
          ))}
        </>
      ) : null}
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
  ${hoverScrollbarX}
  display: flex;
  gap: 16px;
  min-width: 0;
  ${hoverScrollbarPull}
`;
