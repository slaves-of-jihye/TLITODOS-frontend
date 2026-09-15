import styled from "@emotion/styled";
import { hoverable, icons, palette, theme, useDismissable } from "@tlitodos/ui";
import { useCallback, useState } from "react";
import { MonthArrow } from "./monthStyles";

export const MonthPicker = ({ month, onChange }: { month: Date; onChange: (next: Date) => void }) => {
  const [open, setOpen] = useState(false);
  /** 펼친 칸이 보고 있는 해. 달을 고르기 전까지 달력은 움직이지 않습니다. */
  const [year, setYear] = useState(month.getFullYear());
  const dismiss = useCallback(() => setOpen(false), []);
  const anchor = useDismissable<HTMLDivElement>(open, dismiss);
  return (
    <MonthAnchor ref={anchor}>
      <MonthTrigger
        type="button"
        aria-expanded={open}
        onClick={() => {
          // 펼칠 때마다 지금 보고 있는 해에서 다시 시작합니다.
          setYear(month.getFullYear());
          setOpen(!open);
        }}
      >
        <span>
          {month.getFullYear()}년 {month.getMonth() + 1}월
        </span>
        <img src={icons.calendar} alt="" aria-hidden />
      </MonthTrigger>
      {open ? (
        <MonthBox role="dialog" aria-label="월 빠른 이동">
          <MonthYearRow>
            <MonthArrow direction="prev" aria-label="이전 해" onClick={() => setYear(year - 1)}>
              <img src={icons.arrowUp} alt="" aria-hidden />
            </MonthArrow>
            <b>{year}년</b>
            <MonthArrow direction="next" aria-label="다음 해" onClick={() => setYear(year + 1)}>
              <img src={icons.arrowUp} alt="" aria-hidden />
            </MonthArrow>
          </MonthYearRow>
          <MonthGrid>
            {Array.from({ length: 12 }, (_, index) => {
              const current = year === month.getFullYear() && index === month.getMonth();
              return (
                <MonthChoice
                  key={index}
                  type="button"
                  selected={current}
                  aria-current={current ? "true" : undefined}
                  onClick={() => {
                    onChange(new Date(year, index, 1));
                    setOpen(false);
                  }}
                >
                  {index + 1}월
                </MonthChoice>
              );
            })}
          </MonthGrid>
        </MonthBox>
      ) : null}
    </MonthAnchor>
  );
};

const MonthAnchor = styled.div`
  position: relative;
  min-width: 0;
`;

const MonthTrigger = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  max-width: 100%;
  border: 0;
  border-radius: ${theme.radius.sm};
  background: transparent;
  padding: 2px 4px;
  font-size: ${theme.text.h3};
  color: ${theme.colors.ink};
  img {
    flex: none;
    width: 20px;
    height: 20px;
    opacity: 0.45;
  }
  span {
    min-width: 0;
    white-space: nowrap;
  }
  ${hoverable} {
    &:hover {
      background: ${palette.gray100};
    }
  }
  @media (max-width: 600px) {
    font-size: 18px;
  }
`;

const MonthBox = styled.div`
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  z-index: 1;
  width: max(100%, 260px);
  border: 1px solid ${palette.gray200};
  border-radius: 12px;
  background: ${palette.white};
  padding: 12px;
  box-shadow: ${theme.shadow};
`;

const MonthYearRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  padding: 0 4px;
  b {
    font-size: ${theme.text.s};
  }
`;

const MonthGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 4px;
`;

const MonthChoice = styled.button<{ selected: boolean }>`
  border: 0;
  border-radius: 8px;
  padding: 8px 0;
  font-size: ${theme.text.s};
  background: ${({ selected }) => (selected ? palette.black : "transparent")};
  color: ${({ selected }) => (selected ? palette.white : theme.colors.ink)};
  ${hoverable} {
    &:hover {
      background: ${({ selected }) => (selected ? palette.black : palette.gray100)};
    }
  }
`;
