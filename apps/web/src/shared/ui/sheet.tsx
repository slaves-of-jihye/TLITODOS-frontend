import styled from "@emotion/styled";
import { palette, theme } from "@tlitodos/ui";
import { DEFAULT_HOUR_CYCLE, type HourCycle } from "@tlitodos/core";

/* 시트가 공통으로 쓰는 조각입니다. 회색 줄을 누르면 그 아래에 고르는 판이 열립니다. */
export const SheetForm = styled.div`
  display: grid;
  gap: 20px;
`;

export const SheetHeading = styled.p`
  margin: 0;
  font-size: ${theme.text.h3};
  color: ${theme.colors.ink};
  b {
    margin-left: 8px;
    font-weight: inherit;
    color: ${theme.colors.red};
  }
`;

export const SheetRows = styled.div`
  display: grid;
  gap: 8px;
`;

export const SheetRow = styled.button`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  border: 0;
  border-radius: ${theme.radius.sm};
  background: ${theme.colors.panel};
  padding: 8px 20px;
  font-size: ${theme.text.s};
  color: ${theme.colors.ink};
  text-align: left;
  &[aria-expanded="true"] {
    background: ${palette.gray200};
  }
`;

export const SheetSubmit = styled.button`
  width: 100%;
  border: 0;
  border-radius: 12px;
  background: ${palette.black};
  padding: 6px 20px;
  font-size: ${theme.text.s};
  color: ${palette.white};
  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
`;

export const SheetCancel = styled(SheetSubmit)`
  background: ${palette.gray200};
  color: ${theme.colors.ink};
`;

export const SheetField = styled.div`
  display: grid;
  gap: 8px;
  width: 100%;
`;

export const SheetLabel = styled.label`
  font-size: ${theme.text.s};
  color: ${theme.colors.ink};
`;
/** 라벨 아래 회색 입력 상자. 글자 수는 상자 안 오른쪽에 붙습니다. */

/** 라벨 아래 회색 입력 상자. 글자 수는 상자 안 오른쪽에 붙습니다. */
export const SheetBox = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 12px;
  width: 100%;
  border-radius: ${theme.radius.sm};
  background: ${theme.colors.panel};
  padding: 12px 20px;
  input,
  textarea {
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
  textarea {
    min-height: 72px;
    resize: vertical;
  }
  small {
    flex: none;
    font-size: ${theme.text.s};
    color: ${theme.colors.muted};
  }
`;

export const SheetActions = styled.div`
  display: flex;
  gap: 20px;
  > * {
    flex: 1;
  }
  @media (max-width: 600px) {
    gap: 12px;
  }
`;

export const formatSheetDate = (value: string) => value.replaceAll("-", ".");

/** 시트에 적어 두는 시각. 숫자를 채워 쓰는 꼴이라 문장용 `formatClock`과 따로 둡니다. */
export const formatSheetTime = (value: string, cycle: HourCycle = DEFAULT_HOUR_CYCLE) => {
  if (!value) return "설정하지 않음";
  const [hour = "0", minute = "00"] = value.split(":");
  const hourNumber = Number(hour);
  if (cycle === "24H") return `${String(hourNumber).padStart(2, "0")}:${minute}`;
  return `${hourNumber < 12 ? "AM" : "PM"} ${String(hourNumber % 12 || 12).padStart(2, "0")}:${minute}`;
};
