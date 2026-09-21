import styled from "@emotion/styled";
import { useState } from "react";
import type { HourCycle } from "@/shared/lib";
import { useHourCycle, useHourCycleStore } from "@/shared/model";
import { FieldBlock, FieldLabel, palette, theme } from "@/shared/ui";

const OPTIONS = [
  { key: "12H", label: "12시간제", sample: "오후 2시" },
  { key: "24H", label: "24시간제", sample: "14시" },
] as const;

/**
 * 시각을 12시간제로 읽을지 24시간제로 읽을지 고르는 줄.
 *
 * 이름·자기소개·폰트와 달리 확인 버튼이 없습니다 — 고를 것이 둘뿐이라 누른 것이
 * 곧 결정입니다. 되돌리려면 다른 쪽을 누르면 됩니다. 색을 고르는 줄이 이미 같은
 * 방식입니다.
 *
 * 화면은 누른 즉시 바뀌고 저장은 뒤따릅니다. 서버가 거절하면 누르기 전으로
 * 되돌립니다 — 저장되지 않은 것을 저장된 것처럼 보여 두면, 다음에 열었을 때
 * 아무도 손대지 않은 설정이 혼자 바뀐 것처럼 보입니다.
 *
 * 보기를 함께 적어 둡니다. `12시간제`라는 말만으로는 화면이 어떻게 달라지는지
 * 알 수 없지만, `오후 2시`와 `14시`를 나란히 보면 한눈에 갈립니다.
 */
export const HourCycleProfileRow = ({ onSave }: { onSave: (next: HourCycle) => Promise<void> }) => {
  const value = useHourCycle();
  const setHourCycle = useHourCycleStore(state => state.setHourCycle);
  const [busy, setBusy] = useState(false);
  const choose = async (next: HourCycle) => {
    if (next === value || busy) return;
    setHourCycle(next);
    setBusy(true);
    try {
      await onSave(next);
    } catch {
      setHourCycle(value);
    } finally {
      setBusy(false);
    }
  };
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
            disabled={busy}
            onClick={() => void choose(option.key)}
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
  &:disabled {
    cursor: progress;
  }
`;
