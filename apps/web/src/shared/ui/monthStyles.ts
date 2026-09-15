/*
 * 이 조각들은 여러 파일이 나눠 쓰므로 여기 따로 둡니다.
 *
 * 컴포넌트와 같은 파일에 두면 Fast Refresh가 그 파일을 통째로 다시 불러옵니다 —
 * styled로 만든 것은 컴포넌트로 세어지지 않기 때문입니다. 모양만 있는 파일과
 * 컴포넌트만 있는 파일로 갈라 둡니다.
 */
import styled from "@emotion/styled";
import { theme } from "@tlitodos/ui";

export const MonthHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px;
  border-bottom: 1px solid ${theme.colors.line};
  gap: 10px;
`;

export const MonthArrow = styled.button<{ direction: "prev" | "next" }>`
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  padding: 0;
  border: 0;
  background: transparent;
  img {
    width: 24px;
    height: 24px;
    transform: rotate(${({ direction }) => (direction === "prev" ? "-90deg" : "90deg")});
  }
`;
/**
 * 달력 제목이자 달 빠른 이동.
 *
 * 전에는 `<input type="month">` 하나였습니다. 크롬은 그 형식을 "2026년 9월"로
 * 그려 주고 달력 아이콘까지 붙여 주지만, 파이어폭스와 사파리는 이 형식을 아예
 * 모릅니다 — 모르는 형식은 그냥 글자칸이 되므로 제목 자리에 `2026-09`라는
 * 날것이 뜨고, 눌러도 아무것도 열리지 않았습니다. 브라우저가 그려 주기를
 * 기대하지 않고 직접 그립니다.
 */

/**
 * 달력 제목이자 달 빠른 이동.
 *
 * 전에는 `<input type="month">` 하나였습니다. 크롬은 그 형식을 "2026년 9월"로
 * 그려 주고 달력 아이콘까지 붙여 주지만, 파이어폭스와 사파리는 이 형식을 아예
 * 모릅니다 — 모르는 형식은 그냥 글자칸이 되므로 제목 자리에 `2026-09`라는
 * 날것이 뜨고, 눌러도 아무것도 열리지 않았습니다. 브라우저가 그려 주기를
 * 기대하지 않고 직접 그립니다.
 */

export const MonthButtons = styled.div`
  display: flex;
  gap: 5px;
  flex: 0 0 auto;
`;
