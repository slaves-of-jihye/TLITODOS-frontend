import styled from "@emotion/styled";
import { useHourCycle, useHourCycleStore } from "@/shared/model";
import { FieldBlock, FieldLabel, palette, theme } from "@/shared/ui";

const OPTIONS = [
  { key: "H12", label: "12시간제", sample: "오후 2시" },
  { key: "H24", label: "24시간제", sample: "14시" },
] as const;

/**
 * 시각을 12시간제로 읽을지 24시간제로 읽을지 고르는 줄.
 *
 * 이름·자기소개·폰트와 달리 확인 버튼이 없습니다 — 고를 것이 둘뿐이고 서버로
 * 가지 않아 실패할 일이 없으니, 누른 것이 곧 결정입니다. 되돌리려면 다른 쪽을
 * 누르면 됩니다. 색을 고르는 줄이 이미 같은 방식입니다.
 *
 * 보기를 함께 적어 둡니다. `12시간제`라는 말만으로는 화면이 어떻게 달라지는지
 * 알 수 없지만, `오후 2시`와 `14시`를 나란히 보면 한눈에 갈립니다.
 */
export const HourCycleProfileRow = () => {
  const value = useHourCycle();
  const setHourCycle = useHourCycleStore(state => state.setHourCycle);
  return (
    <FieldBlock>
      <FieldLabel>시간 표시</FieldLabel>
      <HourCyclePills role="radiogroup" aria-label="시간 표시">
        {OPTIONS.map(option => (
          <HourCyclePill
            key={option.key}
            type="button"
            role="radio"
            aria-checked={value === option.key}
            selected={value === option.key}
            onClick={() => setHourCycle(option.key)}
          >
            {option.label}
            <small>{option.sample}</small>
          </HourCyclePill>
        ))}
      </HourCyclePills>
    </FieldBlock>
  );
};

const HourCyclePills = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 4px;
`;

const HourCyclePill = styled.button<{ selected: boolean }>`
  display: flex;
  align-items: baseline;
  gap: 8px;
  border: 1px solid ${({ selected }) => (selected ? "transparent" : palette.gray200)};
  border-radius: ${theme.radius.pill};
  background: ${({ selected }) => (selected ? palette.black : palette.gray100)};
  padding: 10px 22px;
  font-size: ${theme.text.s};
  color: ${({ selected }) => (selected ? palette.white : theme.colors.ink)};
  small {
    font-size: ${theme.text.xs};
    opacity: 0.7;
  }
`;
