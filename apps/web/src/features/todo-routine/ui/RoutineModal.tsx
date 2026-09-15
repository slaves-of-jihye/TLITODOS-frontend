import styled from "@emotion/styled";
import { useRef, useState } from "react";
import type { RoutineRepeat } from "@/entities/todo";
import { ROUTINE_REPEATS, WEEKDAYS, repeatUsesWeekdays, weekdayOf } from "@/entities/todo";
import { randomId } from "@/shared/lib";
import {
  ErrorText,
  Modal,
  SheetCalendar,
  SheetForm,
  SheetHeading,
  SheetRow,
  SheetRows,
  SheetSubmit,
  TimeChooser,
  formatSheetDate,
  formatSheetTime,
  palette,
  theme,
} from "@/shared/ui";

export interface RoutineValue {
  start: string;
  end: string;
  time: string;
  repeat: RoutineRepeat;
  /** 월=1 ~ 일=7. 매주/격주에서만 씁니다. */
  weekdays: number[];
}
/**
 * 루틴 시트.
 *
 * 서버가 반복 날짜를 한 요청으로 펼치므로, 여기서는 규칙만 모아 `onRegister`에
 * 넘깁니다. 매주/격주를 고르면 요일 줄이 열립니다.
 *
 * `requestId`는 시트가 한 번 뽑아 들고 있다가 등록마다 같은 값을 넘깁니다 —
 * 실패하고 다시 눌렀을 때 새 키를 쓰면 서버가 루틴을 하나 더 만들기 때문입니다.
 */

/**
 * 루틴 시트.
 *
 * 서버가 반복 날짜를 한 요청으로 펼치므로, 여기서는 규칙만 모아 `onRegister`에
 * 넘깁니다. 매주/격주를 고르면 요일 줄이 열립니다.
 *
 * `requestId`는 시트가 한 번 뽑아 들고 있다가 등록마다 같은 값을 넘깁니다 —
 * 실패하고 다시 눌렀을 때 새 키를 쓰면 서버가 루틴을 하나 더 만들기 때문입니다.
 */
export const RoutineModal = ({
  open,
  initialDate,
  initialTime = "",
  onRegister,
  onClose,
}: {
  open: boolean;
  initialDate: string;
  initialTime?: string;
  onRegister: (value: RoutineValue, requestId: string) => Promise<void>;
  onClose: () => void;
}) => {
  const [value, setValue] = useState<RoutineValue>({
    start: initialDate,
    end: initialDate,
    time: initialTime,
    repeat: "DAILY",
    weekdays: [weekdayOf(initialDate)],
  });
  const [panel, setPanel] = useState<"start" | "end" | "time" | "repeat" | "weekdays" | null>("repeat");
  const [busy, setBusy] = useState(false);
  // 같은 시트가 열려 있는 동안은 재시도해도 같은 키를 씁니다.
  const requestId = useRef(randomId());
  const toggle = (next: "start" | "end" | "time" | "repeat" | "weekdays") => () =>
    setPanel(panel === next ? null : next);
  const showWeekdays = repeatUsesWeekdays(value.repeat);
  const invalidRange = value.end < value.start;
  const missingWeekday = showWeekdays && value.weekdays.length === 0;
  return (
    <Modal open={open} sheet onClose={onClose} aria-label="루틴으로 등록하기">
      <SheetForm>
        <SheetHeading>
          루틴으로 등록하기<b>*</b>
        </SheetHeading>
        <SheetRows>
          <SheetRow type="button" aria-expanded={panel === "start"} onClick={toggle("start")}>
            <span>시작 날짜</span>
            <span>{formatSheetDate(value.start)}</span>
          </SheetRow>
          {panel === "start" ? (
            <SheetCalendar
              value={value.start}
              onChange={start => setValue({ ...value, start, end: start > value.end ? start : value.end })}
            />
          ) : null}
          <SheetRow type="button" aria-expanded={panel === "end"} onClick={toggle("end")}>
            <span>종료 날짜</span>
            <span>{formatSheetDate(value.end)}</span>
          </SheetRow>
          {panel === "end" ? <SheetCalendar value={value.end} onChange={end => setValue({ ...value, end })} /> : null}
          <SheetRow type="button" aria-expanded={panel === "time"} onClick={toggle("time")}>
            <span>시간 설정</span>
            <span>{formatSheetTime(value.time)}</span>
          </SheetRow>
          {panel === "time" ? <TimeChooser value={value.time} onChange={time => setValue({ ...value, time })} /> : null}
          <SheetRow type="button" aria-expanded={panel === "repeat"} onClick={toggle("repeat")}>
            <span>루틴 반복</span>
            <span>{ROUTINE_REPEATS.find(item => item.key === value.repeat)?.label}</span>
          </SheetRow>
          {panel === "repeat" ? (
            <RepeatList role="radiogroup" aria-label="루틴 반복">
              {ROUTINE_REPEATS.map(item => (
                <RepeatOption
                  key={item.key}
                  type="button"
                  role="radio"
                  aria-checked={value.repeat === item.key}
                  selected={value.repeat === item.key}
                  onClick={() =>
                    setValue({
                      ...value,
                      repeat: item.key,
                      // 요일을 지운 채로 매주를 다시 고르면 시작일 요일로 되돌립니다.
                      weekdays: value.weekdays.length ? value.weekdays : [weekdayOf(value.start)],
                    })
                  }
                >
                  <i aria-hidden />
                  {item.label}
                </RepeatOption>
              ))}
            </RepeatList>
          ) : null}
          {showWeekdays ? (
            <>
              <SheetRow type="button" aria-expanded={panel === "weekdays"} onClick={toggle("weekdays")}>
                <span>반복 요일</span>
                <span>
                  {value.weekdays.length
                    ? WEEKDAYS.filter(day => value.weekdays.includes(day.value))
                        .map(day => day.label)
                        .join(" ")
                    : "고르지 않음"}
                </span>
              </SheetRow>
              {panel === "weekdays" ? (
                <WeekdayRow role="group" aria-label="반복 요일">
                  {WEEKDAYS.map(day => {
                    const chosen = value.weekdays.includes(day.value);
                    return (
                      <WeekdayButton
                        key={day.value}
                        type="button"
                        aria-pressed={chosen}
                        selected={chosen}
                        onClick={() =>
                          setValue({
                            ...value,
                            weekdays: chosen
                              ? value.weekdays.filter(item => item !== day.value)
                              : [...value.weekdays, day.value],
                          })
                        }
                      >
                        {day.label}
                      </WeekdayButton>
                    );
                  })}
                </WeekdayRow>
              ) : null}
            </>
          ) : null}
        </SheetRows>
        {invalidRange ? <ErrorText>종료 날짜가 시작 날짜보다 앞설 수 없습니다.</ErrorText> : null}
        {missingWeekday ? <ErrorText>반복할 요일을 하나 이상 고르세요.</ErrorText> : null}
        <SheetSubmit
          type="button"
          disabled={busy || invalidRange || missingWeekday}
          onClick={async () => {
            setBusy(true);
            try {
              await onRegister(value, requestId.current);
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "등록 중..." : "루틴으로 등록하기"}
        </SheetSubmit>
      </SheetForm>
    </Modal>
  );
};

const WeekdayRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 8px 20px;
`;

const WeekdayButton = styled.button<{ selected: boolean }>`
  width: 36px;
  height: 36px;
  border: 1px solid ${palette.gray200};
  border-radius: 50%;
  background: ${({ selected }) => (selected ? palette.black : palette.white)};
  color: ${({ selected }) => (selected ? palette.white : theme.colors.ink)};
  font-size: ${theme.text.s};
`;

const RepeatList = styled.div`
  display: grid;
  justify-items: start;
  gap: 8px;
  padding: 8px 20px;
`;

const RepeatOption = styled.button<{ selected: boolean }>`
  display: flex;
  align-items: center;
  gap: 12px;
  border: 0;
  background: transparent;
  padding: 0;
  font-size: ${theme.text.s};
  color: ${theme.colors.ink};
  i {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    border: 1px solid ${palette.gray300};
    background: ${({ selected }) => (selected ? palette.black : palette.gray100)};
  }
`;
