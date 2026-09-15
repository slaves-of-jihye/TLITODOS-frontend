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

/**
 * 할 일 상세 시트.
 *
 * 제목은 여기서 고치지 않습니다 — "할 일 수정하기"를 누르면 시트를 닫고 목록에서
 * 바로 고치게 합니다(추가할 때와 같은 입력 줄). 세부사항·중요도·선행 할 일은 이
 * 안에서 저장하고, 마감기한과 루틴은 각자의 모달을 엽니다.
 */
