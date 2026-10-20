/* 보드가 앉는 자리. 컴포넌트 파일과 갈라 둡니다 — 한 파일에 섞이면 Fast Refresh가 통째로 다시 불러옵니다. */
import styled from "@emotion/styled";
import { theme } from "@/shared/ui";

export const TodoArea = styled.section`
  min-width: 0;
`;

export const CategoryBoard = styled.div`
  display: grid;
  gap: 32px;
  @media (max-width: 600px) {
    gap: 28px;
  }
`;

/** 선행 표시 비교용 스위치. 어느 쪽으로 갈지 정해지면 이 줄째로 지웁니다. */
export const VariantSwitch = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-bottom: 12px;
  font-size: ${theme.text.xs};
  color: ${theme.colors.muted};
  button {
    padding: 2px 10px;
    border: 1px solid ${theme.colors.line};
    border-radius: ${theme.radius.pill};
    background: transparent;
    color: ${theme.colors.secondary};
    font-size: ${theme.text.xs};
    &[aria-pressed="true"] {
      background: ${theme.colors.selected};
      border-color: ${theme.colors.selected};
      color: ${theme.colors.white};
    }
  }
`;
