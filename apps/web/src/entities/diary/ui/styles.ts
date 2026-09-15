/** 일기에 붙은 사진과, 사진 칸과 본문 칸을 가르는 줄입니다. */
import styled from "@emotion/styled";
import { palette, theme } from "@tlitodos/ui";

/** 사진은 원래 비율 그대로, 250px까지만 키웁니다. */
export const DiaryPhoto = styled.img`
  max-width: min(250px, 100%);
  height: auto;
  border-radius: ${theme.radius.md};
`;

export const DiaryDivider = styled.span`
  width: 100%;
  height: 3px;
  border-radius: 2px;
  background: ${palette.gray200};
`;
/** 사진은 인증이 필요해 한 줄씩 따로 받아 옵니다. */
