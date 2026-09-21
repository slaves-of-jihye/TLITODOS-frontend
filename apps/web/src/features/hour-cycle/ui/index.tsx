import styled from "@emotion/styled";
import { useEffect, useState } from "react";
import type { HourCycle } from "@/shared/lib";
import { useHourCycle, useHourCycleStore } from "@/shared/model";
import { FieldBlock, FieldLabel, formatSheetTime, palette, theme } from "@/shared/ui";

const OPTIONS = [
  { key: "12H", label: "12시간제" },
  { key: "24H", label: "24시간제" },
] as const;

const clock = () => {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
};

/**
 * 지금 몇 시인지. 분이 넘어가면 따라 바뀝니다.
 *
 * 보기로 적어 두는 시각이라 실제 시계와 어긋나 있으면 보기 구실을 못 합니다 —
 * 설정 화면을 열어 둔 채 한참 있다가 고르는 사람에게는 아까의 시각입니다.
 * 다음 분이 시작하는 순간에 맞춰 한 번 깨우고, 그다음부터는 1분마다 돕니다.
 */
const useClock = () => {
  const [now, setNow] = useState(clock);
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    const timeout = setTimeout(
      () => {
        setNow(clock());
        interval = setInterval(() => setNow(clock()), 60_000);
      },
      (60 - new Date().getSeconds()) * 1000,
    );
    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, []);
  return now;
};

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
 * 보기로는 지금 시각을 각각의 방식으로 적어 둡니다. `12시간제`라는 말만으로는
 * 화면이 어떻게 달라지는지 알 수 없지만, 같은 순간을 두 가지로 나란히 적어 두면
 * 한눈에 갈립니다. 아무 때나가 아니라 지금이어야 자기 시계와 맞춰 볼 수 있습니다.
 */
export const HourCycleProfileRow = ({ onSave }: { onSave: (next: HourCycle) => Promise<void> }) => {
  const value = useHourCycle();
  const setHourCycle = useHourCycleStore(state => state.setHourCycle);
  const [busy, setBusy] = useState(false);
  const now = useClock();
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
            <small>{formatSheetTime(now, option.key)}</small>
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
