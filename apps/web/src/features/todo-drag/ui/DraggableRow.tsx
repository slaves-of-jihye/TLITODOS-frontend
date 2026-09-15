import styled from "@emotion/styled";

/**
 * 끌 수 있는 할 일 한 줄.
 *
 * 끌고 있는 줄은 원래 자리에 옅게 남겨 어디서 떠났는지 보이게 합니다. 손가락으로
 * 길게 누르는 동안 글자가 선택되지 않도록 막아 둡니다.
 */
export const DraggableRow = styled.div<{ dragging?: boolean }>`
  opacity: ${({ dragging }) => (dragging ? 0.35 : 1)};
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
`;
