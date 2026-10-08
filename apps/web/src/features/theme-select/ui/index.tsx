import styled from "@emotion/styled";
import { useState } from "react";
import { applyThemeMode, readStoredThemeMode, type ThemeMode } from "@/shared/lib";
import { FieldBlock, FieldLabel, palette, theme } from "@/shared/ui";

const OPTIONS = [
  { key: "system", label: "기기와 맞춤" },
  { key: "light", label: "화이트" },
  { key: "dark", label: "다크" },
] as const satisfies readonly { key: ThemeMode; label: string }[];

/**
 * 화면을 화이트로 볼지 다크로 볼지 고르는 줄.
 *
 * 시간 표시와 같은 모양입니다 — 확인 버튼 없이 누른 것이 곧 결정이고, 화면은 그 자리에서
 * 바뀝니다. 저장은 이 기기에만 남으므로 서버를 거치지 않고, 따라서 거절당해 되돌릴 일도
 * 없습니다.
 *
 * 카테고리 색은 이 선택과 상관없이 그대로입니다. 색을 고르는 줄에서 사용자가 정한 색이
 * 모드마다 다르게 보이면 정한 의미가 없습니다.
 */
export const ThemeProfileRow = () => {
  const [value, setValue] = useState<ThemeMode>(readStoredThemeMode);
  return (
    <FieldBlock>
      <FieldLabel>화면 모드</FieldLabel>
      <ThemePills role="radiogroup" aria-label="화면 모드">
        {OPTIONS.map(option => (
          <ThemePill
            key={option.key}
            type="button"
            role="radio"
            aria-checked={value === option.key}
            selected={value === option.key}
            onClick={() => setValue(applyThemeMode(option.key))}
          >
            {option.label}
          </ThemePill>
        ))}
      </ThemePills>
    </FieldBlock>
  );
};

const ThemePills = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 4px;
`;

const ThemePill = styled.button<{ selected: boolean }>`
  border: 1px solid ${({ selected }) => (selected ? "transparent" : palette.gray200)};
  border-radius: ${theme.radius.pill};
  background: ${({ selected }) => (selected ? palette.black : palette.gray100)};
  padding: 10px 22px;
  font-size: ${theme.text.s};
  color: ${({ selected }) => (selected ? palette.white : theme.colors.ink)};
`;
