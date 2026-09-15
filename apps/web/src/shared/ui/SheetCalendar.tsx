import styled from "@emotion/styled";
import { addMonths, formatLocalDate, getCalendarDays, parseLocalDate } from "@tlitodos/core";
import { icons, palette, theme } from "@tlitodos/ui";
import { useState } from "react";
import { weekdayTone } from "@/shared/lib";
import { MonthPicker } from "./MonthPicker";
import { MonthArrow, MonthButtons, MonthHeader } from "./monthStyles";

/** 시트 안에 들어가는 달력. 날짜 하나만 고릅니다. */
export const SheetCalendar = ({ value, onChange }: { value: string; onChange: (next: string) => void }) => {
  const [month, setMonth] = useState(() => parseLocalDate(value));
  return (
    <SheetCalendarWrap>
      <MonthHeader>
        <MonthPicker month={month} onChange={setMonth} />
        <MonthButtons>
          <MonthArrow direction="prev" aria-label="이전 달" onClick={() => setMonth(addMonths(month, -1))}>
            <img src={icons.arrowUp} alt="" aria-hidden />
          </MonthArrow>
          <MonthArrow direction="next" aria-label="다음 달" onClick={() => setMonth(addMonths(month, 1))}>
            <img src={icons.arrowUp} alt="" aria-hidden />
          </MonthArrow>
        </MonthButtons>
      </MonthHeader>
      <SheetWeekRow>
        {["일", "월", "화", "수", "목", "금", "토"].map((day, index) => (
          <span key={day} style={{ color: weekdayTone(index) }}>
            {day}
          </span>
        ))}
      </SheetWeekRow>
      <SheetDaysGrid>
        {getCalendarDays(month).map((date, index) => {
          if (!date) return <span key={`empty-${index}`} />;
          const day = formatLocalDate(date);
          return (
            <SheetDay
              key={day}
              type="button"
              selected={day === value}
              tone={weekdayTone(date.getDay())}
              onClick={() => onChange(day)}
            >
              {String(date.getDate()).padStart(2, "0")}
            </SheetDay>
          );
        })}
      </SheetDaysGrid>
    </SheetCalendarWrap>
  );
};
/** 일요일은 빨강, 토요일은 파랑입니다. */

const SheetCalendarWrap = styled.div`
  width: 100%;
`;

const SheetWeekRow = styled.div`
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  justify-items: center;
  margin: 12px 0 16px;
  font-size: ${theme.text.s};
`;

const SheetDaysGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  justify-items: center;
  row-gap: 16px;
`;

const SheetDay = styled.button<{ selected: boolean; tone: string }>`
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  padding: 0;
  border: 0;
  border-radius: ${theme.radius.pill};
  font-size: ${theme.text.s};
  background: ${({ selected }) => (selected ? palette.black : "transparent")};
  color: ${({ selected, tone }) => (selected ? palette.white : tone)};
`;

/** 시(hour)/분(minute)을 pill로 고르는 판. Figma의 `deadline - time`입니다. */
