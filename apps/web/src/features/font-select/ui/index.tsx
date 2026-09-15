import styled from "@emotion/styled";
import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import type { FontKey } from "@/entities/user";
import { FONT_PRESETS, fontFamilyStack, resolveFont } from "@/entities/user";
import { applyFont } from "@/shared/lib";
import {
  Button,
  FIELD_WIDTH,
  FieldActions,
  FieldBlock,
  FieldBox,
  FieldChevron,
  FieldLabel,
  FieldRow,
  FieldValue,
  Glyph,
  icons,
  theme,
} from "@/shared/ui";

const LIST_MAX_HEIGHT = 264;

const LIST_GAP = 6;

const LIST_EDGE_MARGIN = 12;

export const FontSelect = ({ value, onChange }: { value: FontKey; onChange: (next: FontKey) => void }) => {
  const [open, setOpen] = useState(false);
  // 키보드 이동 중인 항목. 선택과 달리 미리보기를 바꾸지 않습니다.
  const [active, setActive] = useState<FontKey>(value);
  // 남는 쪽으로 펼치고, 그래도 모자라면 그 높이에 맞춥니다.
  const [placement, setPlacement] = useState({ drop: "down" as "down" | "up", maxHeight: LIST_MAX_HEIGHT });
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const close = (focusTrigger = true) => {
    setOpen(false);
    if (focusTrigger) triggerRef.current?.focus();
  };
  const choose = (next: FontKey) => {
    onChange(next);
    setActive(next);
    close();
  };
  const show = () => {
    setActive(value);
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      // 목록과 트리거 사이 간격, 화면 가장자리 여백을 뺀 실제로 쓸 수 있는 높이입니다.
      const room = (edge: number) => edge - LIST_GAP - LIST_EDGE_MARGIN;
      const below = room(window.innerHeight - rect.bottom);
      const above = room(rect.top);
      const drop = below < LIST_MAX_HEIGHT && above > below ? "up" : "down";
      setPlacement({ drop, maxHeight: Math.min(LIST_MAX_HEIGHT, Math.max(120, drop === "up" ? above : below)) });
    }
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    listRef.current?.focus();
    listRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: "nearest" });
  }, [open]);
  // 바깥을 누르면 닫습니다. 포커스는 누른 곳에 두는 편이 자연스러워 되돌리지 않습니다.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const move = (step: number) => {
    const index = FONT_PRESETS.findIndex(preset => preset.key === active);
    const next = FONT_PRESETS[Math.min(FONT_PRESETS.length - 1, Math.max(0, index + step))];
    if (next) setActive(next.key);
  };
  // 키보드로 이동한 항목이 목록 밖으로 나가지 않게 합니다.
  useEffect(() => {
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: "nearest" });
  }, [active]);
  const onKeyDown = (event: ReactKeyboardEvent) => {
    const keys: Record<string, () => void> = {
      ArrowDown: () => move(1),
      ArrowUp: () => move(-1),
      Home: () => setActive(FONT_PRESETS[0].key),
      End: () => setActive(FONT_PRESETS[FONT_PRESETS.length - 1].key),
      Enter: () => choose(active),
      " ": () => choose(active),
      Escape: () => close(),
      Tab: () => close(false),
    };
    const handler = keys[event.key];
    if (!handler) return;
    if (event.key !== "Tab") event.preventDefault();
    handler();
  };

  return (
    <FontSelectRoot ref={rootRef}>
      <FontSelectTrigger
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        style={{ fontFamily: fontFamilyStack(value) }}
        onClick={() => (open ? close() : show())}
        onKeyDown={event => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            show();
          }
        }}
      >
        <span>{resolveFont(value).label}</span>
        <FontSelectCaret aria-hidden>
          <img src={icons.arrowUp} alt="" />
        </FontSelectCaret>
      </FontSelectTrigger>
      {open ? (
        <FontOptionList
          ref={listRef}
          role="listbox"
          aria-label="폰트"
          tabIndex={-1}
          data-drop={placement.drop}
          style={{ maxHeight: placement.maxHeight }}
          onKeyDown={onKeyDown}
        >
          {FONT_PRESETS.map(preset => (
            <FontOption
              key={preset.key}
              type="button"
              role="option"
              aria-selected={preset.key === value}
              data-active={preset.key === active}
              tabIndex={-1}
              style={{ fontFamily: fontFamilyStack(preset.key) }}
              onPointerEnter={() => setActive(preset.key)}
              onClick={() => choose(preset.key)}
            >
              <span>{preset.label}</span>
              {preset.key === value ? (
                <FontOptionCheck aria-hidden>
                  <Glyph>✓</Glyph>
                </FontOptionCheck>
              ) : null}
            </FontOption>
          ))}
        </FontOptionList>
      ) : null}
    </FontSelectRoot>
  );
};

/**
 * 폰트 선택 행.
 *
 * 고른 폰트는 화면 전체에 즉시 반영되지만 저장은 완료 버튼으로만 합니다.
 * 취소하거나 편집 도중 페이지를 벗어나면 직전 선택으로 되돌립니다.
 */

/**
 * 폰트 선택 행.
 *
 * 고른 폰트는 화면 전체에 즉시 반영되지만 저장은 완료 버튼으로만 합니다.
 * 취소하거나 편집 도중 페이지를 벗어나면 직전 선택으로 되돌립니다.
 */
export const FontProfileRow = ({ value, onSave }: { value: FontKey; onSave: (next: FontKey) => Promise<void> }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<FontKey>(value);
  const [busy, setBusy] = useState(false);
  const revert = () => {
    setDraft(value);
    applyFont(value);
    setEditing(false);
  };
  // 언마운트 시점의 확정값이 필요해 참조로 들고 있습니다.
  const committed = useRef(value);
  useEffect(() => {
    committed.current = value;
  }, [value]);
  // 저장하지 않은 미리보기를 들고 다른 화면으로 넘어가지 않게 합니다.
  useEffect(() => () => void applyFont(committed.current), []);
  const finish = async () => {
    setBusy(true);
    try {
      await onSave(draft);
      applyFont(draft);
      setEditing(false);
    } catch {
      /* 미리보기와 편집 상태를 유지해 다시 시도하거나 취소할 수 있게 둡니다. */
    } finally {
      setBusy(false);
    }
  };
  return (
    <FieldBlock>
      <FieldLabel>폰트 설정</FieldLabel>
      {editing ? (
        <FieldRow>
          <FontSelect
            value={draft}
            onChange={next => {
              setDraft(next);
              applyFont(next, { persist: false });
            }}
          />
          <FieldActions>
            <Button onClick={revert}>취소</Button>
            <Button variant="primary" disabled={busy} onClick={finish}>
              확인
            </Button>
          </FieldActions>
        </FieldRow>
      ) : (
        <FieldBox
          style={{ fontFamily: fontFamilyStack(value) }}
          onClick={() => {
            setDraft(value);
            setEditing(true);
          }}
        >
          <FieldValue>{resolveFont(value).label}</FieldValue>
          <FieldChevron src={icons.arrowUp} alt="" aria-hidden />
        </FieldBox>
      )}
    </FieldBlock>
  );
};

/**
 * 카테고리 색 바꾸기.
 *
 * 한 번에 한 카테고리만 펼쳐 팔레트를 보여줍니다. 색을 고르면 바로 저장합니다 —
 * 되돌릴 초안이 없어 이름·자기소개와 달리 확인 버튼을 두지 않았습니다.
 */

const FontSelectRoot = styled.div`
  position: relative;
  width: ${FIELD_WIDTH};
`;

const FontSelectTrigger = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  border: 0;
  border-radius: ${theme.radius.sm};
  background: ${theme.colors.panel};
  padding: 12px 20px;
  text-align: left;
  font-size: ${theme.text.s};
  color: ${theme.colors.ink};
`;

const FontSelectCaret = styled.span`
  display: grid;
  place-items: center;
  img {
    width: 20px;
    height: 20px;
    transform: rotate(180deg);
  }
`;

const FontOptionList = styled.div`
  position: absolute;
  z-index: 20;
  top: calc(100% + ${LIST_GAP}px);
  left: 0;
  right: 0;
  &[data-drop="up"] {
    top: auto;
    bottom: calc(100% + ${LIST_GAP}px);
  }
  overflow-y: auto;
  display: grid;
  gap: 2px;
  padding: 0;
  background: ${theme.colors.white};
  border: 1px solid ${theme.colors.panel};
  border-radius: ${theme.radius.sm};
  box-shadow: ${theme.shadow};
`;

const FontOption = styled.button`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  border: 0;
  border-radius: ${theme.radius.sm};
  background: transparent;
  padding: 8px 20px;
  text-align: left;
  font-size: ${theme.text.s};
  color: ${theme.colors.ink};
  &[data-active="true"],
  &[aria-selected="true"] {
    background: ${theme.colors.panel};
  }
`;

const FontOptionCheck = styled.span`
  color: ${theme.colors.blue};
  font-size: 14px;
`;
