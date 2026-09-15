import styled from "@emotion/styled";
import { icons, palette, SrOnly, theme } from "@/shared/ui";
import { TRASH_DROP_ATTRIBUTE } from "../model/useTodoDrag";

/**
 * 끌고 있는 동안에만 뜨는 휴지통.
 *
 * 끌기가 시작되면 아래에서 올라오고, 놓으면 사라집니다. 손끝을 따라다니는 쪽지
 * (z-index 90)보다는 아래, 아래 네비게이션(60)보다는 위에 둡니다 — 쪽지에 가려지지
 * 않으면서 화면 아래쪽 어디에 놓아도 걸리게 하려고요.
 *
 * 위에 올라왔을 때는 커지고 붉어집니다. 크기만 바꾸면 손가락에 가려 잘 보이지 않고,
 * 색만 바꾸면 끌던 것에 눈이 가 있는 사람이 놓칩니다. 내보낸 휴지통 아이콘에는 색이
 * 박혀 있어 마스크로 얹고 색은 여기서 줍니다.
 */
export const TrashDropZone = ({ visible, over }: { visible: boolean; over: boolean }) => (
  <TrashZone {...{ [TRASH_DROP_ATTRIBUTE]: "" }} visible={visible} over={over} aria-hidden={!visible}>
    <TrashIcon over={over} />
    <TrashLabel over={over}>{over ? "놓으면 삭제" : "여기로 끌어 삭제"}</TrashLabel>
    {visible ? <SrOnly>할 일을 여기에 놓으면 삭제할지 묻습니다.</SrOnly> : null}
  </TrashZone>
);

const TrashZone = styled.div<{ visible: boolean; over: boolean }>`
  position: fixed;
  left: 50%;
  /* 네비게이션 위에 띄웁니다. 끌지 않을 때는 아래로 내려 두고 눌리지도 않게 합니다. */
  bottom: calc(${theme.layout.nav} + 20px);
  z-index: 80;
  display: grid;
  justify-items: center;
  gap: 8px;
  border-radius: ${theme.radius.lg};
  border: 2px dashed ${({ over }) => (over ? theme.colors.red : palette.gray400)};
  background: ${({ over }) => (over ? theme.colors.red : palette.white)};
  padding: ${({ over }) => (over ? "22px 34px" : "16px 24px")};
  box-shadow: ${theme.shadow};
  pointer-events: ${({ visible }) => (visible ? "auto" : "none")};
  opacity: ${({ visible }) => (visible ? 1 : 0)};
  transform: translate(-50%, ${({ visible }) => (visible ? "0" : "16px")}) scale(${({ over }) => (over ? 1.12 : 1)});
  transition:
    opacity 0.16s ease,
    transform 0.16s ease,
    padding 0.16s ease,
    background 0.16s ease,
    border-color 0.16s ease;
  @media (max-width: 600px) {
    bottom: calc(72px + env(safe-area-inset-bottom) + 16px);
  }
`;

const TrashIcon = styled.span<{ over: boolean }>`
  width: ${({ over }) => (over ? "34px" : "26px")};
  height: ${({ over }) => (over ? "34px" : "26px")};
  background: ${({ over }) => (over ? palette.white : theme.colors.red)};
  -webkit-mask: url(${icons.trash}) center / contain no-repeat;
  mask: url(${icons.trash}) center / contain no-repeat;
  transition:
    width 0.16s ease,
    height 0.16s ease,
    background 0.16s ease;
`;

const TrashLabel = styled.small<{ over: boolean }>`
  font-size: ${theme.text.xs};
  white-space: nowrap;
  color: ${({ over }) => (over ? palette.white : theme.colors.muted)};
`;
