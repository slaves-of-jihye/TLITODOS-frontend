import styled from "@emotion/styled";
import { palette, theme } from "@tlitodos/ui";
import { useHourCycle } from "@/shared/model";

/**
 * 시각을 고르는 판.
 *
 * 프로필에서 고른 시간 체계를 그대로 따릅니다. 24시간제로 읽는 사람에게
 * 오전/오후를 고르게 하고 1~12만 늘어놓으면, 읽을 때와 고를 때가 서로 다른
 * 셈법이 되어 머릿속에서 한 번 옮겨야 합니다. 24시간제에서는 오전/오후 줄이
 * 통째로 빠지고 0~23이 그대로 놓입니다.
 */
export const TimeChooser = ({ value, onChange }: { value: string; onChange: (next: string) => void }) => {
  const wide = useHourCycle() === "24H";
  const [hour = "", minute = "00"] = value ? value.split(":") : [];
  const hourNumber = value ? Number(hour) : null;
  const meridiem = hourNumber === null ? null : hourNumber < 12 ? "AM" : "PM";
  const displayHour = hourNumber === null ? null : hourNumber % 12 || 12;
  const compose = (nextMeridiem: "AM" | "PM", nextHour: number, nextMinute: string) => {
    const base = nextHour % 12;
    onChange(`${String(nextMeridiem === "AM" ? base : base + 12).padStart(2, "0")}:${nextMinute}`);
  };
  /** 24시간제에서 시를 고르는 길. 오전/오후를 거치지 않습니다. */
  const composeWide = (nextHour: number, nextMinute: string) =>
    onChange(`${String(nextHour).padStart(2, "0")}:${nextMinute}`);
  const pickHour = (nextHour: number, nextMinute = minute) =>
    wide ? composeWide(nextHour, nextMinute) : compose(meridiem ?? "AM", nextHour, nextMinute);
  const pickMinute = (nextMinute: string) =>
    wide ? composeWide(hourNumber ?? 0, nextMinute) : compose(meridiem ?? "AM", displayHour ?? 12, nextMinute);
  return (
    <TimePanel>
      <TimeBlock>
        <TimeLabel>{wide ? "시각 설정하기" : "오전/오후 선택하기"}</TimeLabel>
        <TimePills>
          <TimePill type="button" selected={value === ""} onClick={() => onChange("")}>
            설정하지 않음
          </TimePill>
          {wide
            ? null
            : (["AM", "PM"] as const).map(key => (
                <TimePill
                  key={key}
                  type="button"
                  selected={meridiem === key}
                  onClick={() => compose(key, displayHour ?? 12, minute)}
                >
                  {key === "AM" ? "오전(AM)" : "오후(PM)"}
                </TimePill>
              ))}
        </TimePills>
      </TimeBlock>
      <TimeColumns>
        <TimeBlock>
          <TimeLabel>시(hour) 선택하기</TimeLabel>
          <TimeGrid>
            {(wide
              ? Array.from({ length: 24 }, (_, index) => index)
              : Array.from({ length: 12 }, (_, index) => index + 1)
            ).map(item => (
              <TimeCell
                key={item}
                type="button"
                selected={wide ? hourNumber === item : displayHour === item}
                onClick={() => pickHour(item)}
              >
                {wide ? String(item).padStart(2, "0") : item}
              </TimeCell>
            ))}
          </TimeGrid>
        </TimeBlock>
        <TimeBlock>
          <TimeLabel>분(minute) 선택하기</TimeLabel>
          <TimeGrid>
            {Array.from({ length: 12 }, (_, index) => String(index * 5).padStart(2, "0")).map(item => (
              <TimeCell
                key={item}
                type="button"
                selected={value !== "" && minute === item}
                onClick={() => pickMinute(item)}
              >
                {item}
              </TimeCell>
            ))}
          </TimeGrid>
        </TimeBlock>
      </TimeColumns>
    </TimePanel>
  );
};

const TimePanel = styled.div`
  display: grid;
  gap: 20px;
  padding: 20px;
  @media (max-width: 600px) {
    padding: 12px 0;
  }
`;

const TimeBlock = styled.div`
  display: grid;
  gap: 8px;
  justify-items: start;
`;

const TimeLabel = styled.p`
  margin: 0;
  font-size: ${theme.text.s};
  color: ${theme.colors.ink};
`;

const TimeColumns = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 40px;
`;

const TimePills = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
`;

const TimeGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(6, 36px);
  gap: 8px;
`;

const TimePill = styled.button<{ selected: boolean }>`
  display: grid;
  place-items: center;
  border: 1px solid ${({ selected }) => (selected ? "transparent" : palette.gray200)};
  border-radius: ${theme.radius.pill};
  padding: 4px 30px;
  font-size: ${theme.text.s};
  background: ${({ selected }) => (selected ? palette.black : palette.gray100)};
  color: ${({ selected }) => (selected ? palette.white : theme.colors.ink)};
`;

const TimeCell = styled(TimePill)`
  width: 36px;
  height: 36px;
  padding: 0;
`;
