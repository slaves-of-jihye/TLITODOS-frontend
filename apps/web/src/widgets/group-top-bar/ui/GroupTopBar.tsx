import styled from "@emotion/styled";
import { icons, theme } from "@/shared/ui";

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
