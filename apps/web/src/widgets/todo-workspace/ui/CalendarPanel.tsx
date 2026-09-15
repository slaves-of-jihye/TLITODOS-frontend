import styled from "@emotion/styled";
import { useMemo } from "react";
import type { Category, DailyTodoStatus } from "@/shared/api";
import { categoryAccent, sortCategories } from "@/entities/category";
import { addMonths, formatLocalDate, getCalendarDays } from "@/shared/lib";
import { DayStash, MonthArrow, MonthButtons, MonthHeader, MonthPicker, icons, theme } from "@/shared/ui";

export const CalendarPanel = ({
  month,
  selectedDate,
  statuses,
  categories,
  onMonthChange,
  onDateChange,
}: {
  month: Date;
  selectedDate: string;
  /** 날짜별 요약. 서버의 daily-status이거나 목록으로 접어 만든 같은 모양입니다. */
  statuses: DailyTodoStatus[];
  categories: Category[];
  onMonthChange: (date: Date) => void;
  onDateChange: (date: string) => void;
}) => {
  const sorted = sortCategories(categories);
  const days = getCalendarDays(month);
  const today = formatLocalDate(new Date());
  const byDate = useMemo(() => new Map(statuses.map(status => [status.date, status])), [statuses]);
  return (
    <CalendarWrap>
      <MonthHeader>
        <MonthPicker month={month} onChange={onMonthChange} />
        <MonthButtons>
          <MonthArrow direction="prev" aria-label="이전 달" onClick={() => onMonthChange(addMonths(month, -1))}>
            <img src={icons.arrowUp} alt="" aria-hidden />
          </MonthArrow>
          <MonthArrow direction="next" aria-label="다음 달" onClick={() => onMonthChange(addMonths(month, 1))}>
            <img src={icons.arrowUp} alt="" aria-hidden />
          </MonthArrow>
        </MonthButtons>
      </MonthHeader>
      <WeekRow>
        {["일", "월", "화", "수", "목", "금", "토"].map(day => (
          <span key={day}>{day}</span>
        ))}
      </WeekRow>
      <DaysGrid>
        {days.map((date, index) => {
          if (!date) return <span key={`empty-${index}`} />;
          const value = formatLocalDate(date);
          const status = byDate.get(value);
          // 점은 카테고리 순서(해야할 일 -> 사용자 -> 취미)대로 찍습니다. 서버는
          // categoryId 순으로 주므로 정렬된 카테고리를 훑어 맞춥니다.
          const marks = sorted.flatMap((category, catIndex) => {
            const categoryStatus = status?.categoryStatuses.find(item => item.categoryId === category.categoryId);
            return categoryStatus
              ? [{ accent: categoryAccent(category.color, catIndex), done: categoryStatus.isCompleted }]
              : [];
          });
          return (
            <DayStash
              key={value}
              date={date.getDate()}
              marks={marks}
              incompleteCount={status?.incompleteCount ?? 0}
              /*
               * 사분면 배치가 흔들리지 않도록 씨앗은 배치를 정하는 것만 담습니다 —
               * 그 날짜와, 쓰인 카테고리가 채워졌는지 여부(0/1)입니다. 남은 할 일
               * 수를 넣으면 관계없는 할 일을 하나 체크할 때마다 남는 칸이 다른
               * 카테고리로 옮겨 다닙니다.
               */
              seed={`${value}:${marks.map(mark => (mark.done ? 1 : 0)).join("")}`}
              selected={value === selectedDate}
              today={value === today}
              onClick={() => onDateChange(value)}
            />
          );
        })}
      </DaysGrid>
    </CalendarWrap>
  );
};
/** 달력 한 칸의 너비. `StatusCluster` 기본 크기와 같습니다. */

/** 달력 한 칸의 너비. `StatusCluster` 기본 크기와 같습니다. */
const DAY_CELL = 30;
/**
 * 날짜 칸 사이 간격.
 *
 * 디자인의 450px 달력이 40px 간격입니다(7*30 + 6*40 = 450). 그보다 좁은 자리에
 * 놓이면 칸 크기는 두고 간격만 좁혀 넘치지 않게 합니다 — 1100px 아래에서 두 단이
 * 함께 줄어들 때가 그렇습니다. 화면 폭이 아니라 놓인 자리의 폭에 맞춰야 하므로
 * 미디어쿼리로는 할 수 없고, 격자 간격의 퍼센트가 그 자리의 너비를 가리킵니다.
 */

/**
 * 날짜 칸 사이 간격.
 *
 * 디자인의 450px 달력이 40px 간격입니다(7*30 + 6*40 = 450). 그보다 좁은 자리에
 * 놓이면 칸 크기는 두고 간격만 좁혀 넘치지 않게 합니다 — 1100px 아래에서 두 단이
 * 함께 줄어들 때가 그렇습니다. 화면 폭이 아니라 놓인 자리의 폭에 맞춰야 하므로
 * 미디어쿼리로는 할 수 없고, 격자 간격의 퍼센트가 그 자리의 너비를 가리킵니다.
 */
const dayColumnGap = `clamp(4px, calc((100% - ${DAY_CELL * 7}px) / 6), 40px)`;

const CalendarWrap = styled.section`
  width: 100%;
  max-width: ${theme.layout.calendar};
`;

const WeekRow = styled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  column-gap: ${dayColumnGap};
  text-align: center;
  margin: 12px 0 20px;
  font-size: ${theme.text.h3};
  /* 일요일은 빨강, 토요일은 파랑입니다. */
  span:first-of-type {
    color: ${theme.colors.red};
  }
  span:last-of-type {
    color: ${theme.colors.blue};
  }
  @media (max-width: 600px) {
    gap: 8px;
    font-size: ${theme.text.s};
  }
`;

const DaysGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  column-gap: ${dayColumnGap};
  row-gap: 16px;
  justify-items: center;
  /* 일요일 열은 빨강, 토요일 열은 파랑입니다. */
  > *:nth-child(7n + 1) {
    color: ${theme.colors.red};
  }
  > *:nth-child(7n) {
    color: ${theme.colors.blue};
  }
`;
