import styled from "@emotion/styled";
import { palette, theme } from "@tlitodos/ui";

export const TimeChooser = ({ value, onChange }: { value: string; onChange: (next: string) => void }) => {
  const [hour = "", minute = "00"] = value ? value.split(":") : [];
  const hourNumber = value ? Number(hour) : null;
  const meridiem = hourNumber === null ? null : hourNumber < 12 ? "AM" : "PM";
  const displayHour = hourNumber === null ? null : hourNumber % 12 || 12;
  const compose = (nextMeridiem: "AM" | "PM", nextHour: number, nextMinute: string) => {
    const base = nextHour % 12;
    onChange(`${String(nextMeridiem === "AM" ? base : base + 12).padStart(2, "0")}:${nextMinute}`);
  };
  return (
    <TimePanel>
      <TimeBlock>
        <TimeLabel>오전/오후 선택하기</TimeLabel>
        <TimePills>
          <TimePill type="button" selected={value === ""} onClick={() => onChange("")}>
            설정하지 않음
          </TimePill>
          {(["AM", "PM"] as const).map(key => (
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
            {Array.from({ length: 12 }, (_, index) => index + 1).map(item => (
              <TimeCell
                key={item}
                type="button"
                selected={displayHour === item}
                onClick={() => compose(meridiem ?? "AM", item, minute)}
              >
                {item}
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
                onClick={() => compose(meridiem ?? "AM", displayHour ?? 12, item)}
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
