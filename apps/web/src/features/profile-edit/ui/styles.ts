/* 프로필 사진 줄. 컴포넌트 파일과 갈라 둡니다 — 한 파일에 섞이면 Fast Refresh가 통째로 다시 불러옵니다. */
import styled from "@emotion/styled";
import { theme } from "@/shared/ui";

export const PhotoRow = styled.div`
  display: flex;
  align-items: center;
  gap: 32px;
  img,
  > span {
    flex: none;
    width: 100px;
    height: 100px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    object-fit: cover;
    background: ${theme.colors.panel};
    font-size: 44px;
  }
  @media (max-width: 600px) {
    gap: 18px;
    img,
    > span {
      width: 80px;
      height: 80px;
      font-size: 34px;
    }
  }
`;
