import { useState } from "react";
import { VariantSwitch } from "./boardStyles";

export type BlockedStyle = "badge" | "lock" | "both" | "none";

const KEY = "tlitodos.blockedStyle";
const OPTIONS: { key: BlockedStyle; label: string }[] = [
  { key: "badge", label: "1 알약" },
  { key: "lock", label: "2 자물쇠" },
  { key: "both", label: "1+2" },
  { key: "none", label: "없음" },
];

const read = (): BlockedStyle => {
  try {
    const saved = window.localStorage.getItem(KEY);
    if (OPTIONS.some(option => option.key === saved)) return saved as BlockedStyle;
  } catch {
    // 저장을 거부하는 브라우저에서는 탭이 닫힐 때까지만 기억합니다.
  }
  return "both";
};

/** 선행 표시를 어떻게 할지 정하는 동안만 있는 비교용 상태입니다. */
export const useBlockedStyle = () => {
  const [style, setStyle] = useState<BlockedStyle>(read);
  const choose = (next: BlockedStyle) => {
    setStyle(next);
    try {
      window.localStorage.setItem(KEY, next);
    } catch {
      // 위와 같습니다.
    }
  };
  return [style, choose] as const;
};

export const DependencyStyleSwitch = ({
  value,
  onChange,
}: {
  value: BlockedStyle;
  onChange: (next: BlockedStyle) => void;
}) => (
  <VariantSwitch>
    선행 표시 비교
    {OPTIONS.map(option => (
      <button key={option.key} type="button" aria-pressed={value === option.key} onClick={() => onChange(option.key)}>
        {option.label}
      </button>
    ))}
  </VariantSwitch>
);
