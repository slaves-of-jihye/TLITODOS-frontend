import { useNavigate } from "react-router-dom";
import { useGroups } from "@/entities/group";
import { Button, HeaderRow, ViewChip } from "@/shared/ui";

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
