import styled from "@emotion/styled";
import { useMemo, useState } from "react";
import type { Category } from "@/shared/api";
import {
  CATEGORY_SWATCHES,
  categoryAccent,
  sortCategories,
  useCategories,
  useUpdateCategory,
} from "@/entities/category";
import { errorMessage } from "@/shared/lib";
import { CategoryPill, FieldLabel, Glyph, theme } from "@/shared/ui";

export const CategoryColorSection = ({ onError }: { onError: (message: string) => void }) => {
  const { data: categories = [] } = useCategories();
  const sorted = useMemo(() => sortCategories(categories), [categories]);
  const update = useUpdateCategory();
  const [openId, setOpenId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const choose = async (category: Category, color: string) => {
    setBusy(true);
    onError("");
    try {
      await update.mutateAsync({ id: category.categoryId, body: { name: category.name, color } });
      setOpenId(null);
    } catch (reason) {
      onError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  };
  if (!sorted.length) return null;
  return (
    <ColorSection>
      <FieldLabel as="h2">카테고리 색상 변경</FieldLabel>
      {sorted.map((category, index) => {
        const accent = categoryAccent(category.color, index);
        const open = openId === category.categoryId;
        return (
          <div key={category.categoryId}>
            <ColorRow>
              <CategoryPill name={category.name} accent={accent} own={false} />
              <ColorEditButton
                open={open}
                aria-expanded={open}
                onClick={() => setOpenId(open ? null : category.categoryId)}
              >
                <ColorDot style={{ background: accent }} />
                <span>색상 편집</span>
                <Glyph>›</Glyph>
              </ColorEditButton>
            </ColorRow>
            {open ? (
              <SwatchGrid role="group" aria-label={`${category.name} 색상`}>
                {CATEGORY_SWATCHES.map(color => (
                  <Swatch
                    key={color}
                    type="button"
                    aria-label={color}
                    aria-pressed={color.toLowerCase() === accent.toLowerCase()}
                    disabled={busy}
                    style={{ background: color }}
                    onClick={() => choose(category, color)}
                  />
                ))}
              </SwatchGrid>
            ) : null}
          </div>
        );
      })}
    </ColorSection>
  );
};

const ColorSection = styled.section`
  display: grid;
  gap: 20px;
  padding: 0 20px;
  @media (min-width: 901px) {
    /* 디자인에서는 왼쪽 단의 이름 칸 높이에 맞춰 시작합니다. */
    margin-top: 113px;
  }
`;

const ColorRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
`;

const ColorEditButton = styled.button<{ open: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 12px;
  flex: none;
  border: 0;
  background: transparent;
  padding: 0;
  font-size: 18px;
  color: ${({ open }) => (open ? theme.colors.ink : theme.colors.muted)};
`;

const ColorDot = styled.span`
  width: 28px;
  height: 28px;
  border-radius: 50%;
  flex: none;
`;

const SwatchGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(6, 28px);
  gap: 22px;
  justify-content: center;
  margin: 22px 0;
`;

const Swatch = styled.button`
  width: 28px;
  height: 28px;
  border: 0;
  border-radius: 50%;
  padding: 0;
  &[aria-pressed="true"] {
    box-shadow:
      0 0 0 3px ${theme.colors.white},
      0 0 0 5px ${theme.colors.ink};
  }
  &:disabled {
    cursor: progress;
  }
`;
