/** 무엇을 걸었는지 적는 칸. 요청 시트와 받은 시트가 같은 칸을 씁니다. */
import styled from "@emotion/styled";
import { theme } from "@tlitodos/ui";

export const BetBox = styled.div`
  display: flex;
  align-items: center;
  width: 100%;
  border-radius: ${theme.radius.sm};
  background: ${theme.colors.panel};
  padding: 12px 20px;
  p {
    margin: 0;
    overflow-wrap: anywhere;
  }
  input {
    flex: 1;
    min-width: 0;
    border: 0;
    background: transparent;
    padding: 0;
    font-size: ${theme.text.s};
    color: ${theme.colors.ink};
    &::placeholder {
      color: ${theme.colors.muted};
    }
  }
`;
