import { useState } from "react";
import { useHourCycle } from "@/shared/model";
import {
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
} from "@/shared/ui";

/** 기간 할 일이라 시작/마감을 함께 고릅니다. `time`이 빈 문자열이면 미설정입니다. */
export type DeadlineValue = { start: string; date: string; time: string };

/**
 * 마감기한 시트.
 *
 * 회색 줄을 누르면 그 아래에 달력과 시간 판이 열립니다. 디자인에 취소 버튼이 없어,
 * 뒤 배경을 눌러 닫습니다.
 *
 * 서버가 기간 할 일을 받으므로 시작 날짜 줄이 함께 있습니다 — 시작일부터 마감일까지
 * 양끝을 포함한 모든 날에 같은 할 일이 나타납니다. 마감일을 시작일보다 앞으로
 * 당기면 시작일도 같이 당겨 잘못된 기간을 서버에 보내지 않습니다.
 */
export const DeadlineModal = ({
  open,
  value,
  onChange,
  onClose,
}: {
  open: boolean;
  value: DeadlineValue;
  onChange: (next: DeadlineValue) => void;
  onClose: () => void;
}) => {
  const [panel, setPanel] = useState<"start" | "date" | "time" | null>("date");
  const hourCycle = useHourCycle();
  return (
    <Modal open={open} sheet onClose={onClose} aria-label="마감기한 설정하기">
      <SheetForm>
        <SheetHeading>
          마감기한 설정하기<b>*</b>
        </SheetHeading>
        <SheetRows>
          <SheetRow
            type="button"
            aria-expanded={panel === "start"}
            onClick={() => setPanel(panel === "start" ? null : "start")}
          >
            <span>시작 날짜</span>
            <span>{formatSheetDate(value.start)}</span>
          </SheetRow>
          {panel === "start" ? (
            <SheetCalendar
              value={value.start}
              onChange={start => onChange({ ...value, start, date: start > value.date ? start : value.date })}
            />
          ) : null}
          <SheetRow
            type="button"
            aria-expanded={panel === "date"}
            onClick={() => setPanel(panel === "date" ? null : "date")}
          >
            <span>마감 날짜</span>
            <span>{formatSheetDate(value.date)}</span>
          </SheetRow>
          {panel === "date" ? (
            <SheetCalendar
              value={value.date}
              onChange={date => onChange({ ...value, date, start: date < value.start ? date : value.start })}
            />
          ) : null}
          <SheetRow
            type="button"
            aria-expanded={panel === "time"}
            onClick={() => setPanel(panel === "time" ? null : "time")}
          >
            <span>시간 설정</span>
            <span>{formatSheetTime(value.time, hourCycle)}</span>
          </SheetRow>
          {panel === "time" ? <TimeChooser value={value.time} onChange={time => onChange({ ...value, time })} /> : null}
        </SheetRows>
        <SheetSubmit type="button" onClick={onClose}>
          마감기한 설정하기
        </SheetSubmit>
      </SheetForm>
    </Modal>
  );
};
