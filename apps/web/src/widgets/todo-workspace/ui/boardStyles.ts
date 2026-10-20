/* 보드가 앉는 자리. 컴포넌트 파일과 갈라 둡니다 — 한 파일에 섞이면 Fast Refresh가 통째로 다시 불러옵니다. */
import styled from "@emotion/styled";

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
