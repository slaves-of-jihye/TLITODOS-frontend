import type { GroupMember } from "@/shared/api";
import { useAssetObjectUrl } from "@/shared/api";
import { ViewChip } from "@/shared/ui";

/** 사진은 인증이 필요해 멤버마다 따로 받아 옵니다 — 훅을 목록 안에서 부를 수 없으니 한 칩씩 나눕니다. */
export const MemberChip = ({
  member,
  active,
  onClick,
}: {
  member: GroupMember;
  active: boolean;
  onClick: () => void;
}) => (
  <ViewChip active={active} avatar={useAssetObjectUrl(member.profileImageUrl)} onClick={onClick}>
    {member.name}
  </ViewChip>
);
/** 홈의 `HeaderRow`와 같은 자리에서 같은 방식으로 화면 위에 붙습니다. */
