import type { Todo } from "@tlitodos/types";
import { useCallback, useState, type PointerEvent as ReactPointerEvent } from "react";

/** 손가락으로 끌기 시작하기까지 누르고 있어야 하는 시간. 그 전에 움직이면 목록을 굴리는 것으로 봅니다. */
const HOLD_MS = 250;
/** 마우스는 이만큼 움직여야 끌기로 봅니다. 누르고 떼는 것과 갈라놓기 위함입니다. */
const MOVE_TOLERANCE = 8;
/** 칸을 표시하는 자리표. 포인터 아래의 칸을 이 이름으로 찾습니다. */
export const CATEGORY_DROP_ATTRIBUTE = "data-category-drop";

const categoryUnder = (x: number, y: number) => {
  const column = document.elementFromPoint(x, y)?.closest<HTMLElement>(`[${CATEGORY_DROP_ATTRIBUTE}]`);
  const value = column?.getAttribute(CATEGORY_DROP_ATTRIBUTE);
  return value ? Number(value) : null;
};

type Dragging = { todo: Todo; x: number; y: number; over: number | null };

/**
 * 할 일을 끌어 다른 카테고리로 옮깁니다.
 *
 * 마우스는 조금 움직이면 바로 끌기가 되고, 손가락은 잠깐 누르고 있어야 시작합니다
 * — 그래야 목록을 위아래로 굴리는 손짓과 섞이지 않습니다. 끌기가 시작된 뒤에는
 * `touchmove`를 직접 막아 화면이 따라 굴러가지 않게 합니다(리액트가 다는 리스너는
 * passive라 막을 수 없어 창에 직접 답니다).
 *
 * 놓을 자리는 포인터 아래에 있는 칸으로 정합니다. 칸은 `CATEGORY_DROP_ATTRIBUTE`로
 * 자기 카테고리를 밝혀 둡니다.
 */
export const useTodoDrag = ({
  enabled,
  onDrop,
}: {
  enabled: boolean;
  onDrop: (todo: Todo, categoryId: number) => void;
}) => {
  const [dragging, setDragging] = useState<Dragging | null>(null);

  const startFrom = useCallback(
    (todo: Todo) => (event: ReactPointerEvent<HTMLElement>) => {
      if (!enabled || event.button !== 0) return;
      const { pointerId, pointerType, clientX: startX, clientY: startY } = event;
      const byTouch = pointerType === "touch";
      let started = false;
      let timer: number | null = null;

      const begin = (x: number, y: number) => {
        started = true;
        setDragging({ todo, x, y, over: categoryUnder(x, y) });
      };
      const move = (moveEvent: PointerEvent) => {
        if (moveEvent.pointerId !== pointerId) return;
        const far = Math.hypot(moveEvent.clientX - startX, moveEvent.clientY - startY) > MOVE_TOLERANCE;
        if (!started) {
          // 손가락은 누르고 기다려야 시작합니다. 그 전에 움직이면 굴리려는 것입니다.
          if (byTouch) {
            if (far) stop();
            return;
          }
          if (!far) return;
          begin(moveEvent.clientX, moveEvent.clientY);
        }
        moveEvent.preventDefault();
        setDragging(current =>
          current
            ? {
                ...current,
                x: moveEvent.clientX,
                y: moveEvent.clientY,
                over: categoryUnder(moveEvent.clientX, moveEvent.clientY),
              }
            : current,
        );
      };
      const holdScroll = (touchEvent: TouchEvent) => {
        if (started) touchEvent.preventDefault();
      };
      const up = (upEvent: PointerEvent) => {
        if (upEvent.pointerId !== pointerId) return;
        const target = started ? categoryUnder(upEvent.clientX, upEvent.clientY) : null;
        const moved = started;
        stop();
        // 끌고 놓은 손짓이 상세 열기로 이어지지 않게 뒤따르는 클릭 한 번을 삼킵니다.
        if (moved) {
          window.addEventListener("click", swallow, { capture: true, once: true });
          /*
           * 그 클릭은 놓은 그 자리에서 곧바로 옵니다. 오지 않는 경우(끌다가 창
           * 밖에서 놓기 등)에는 귀를 남겨 두면 안 됩니다 — 한참 뒤 엉뚱한 클릭을
           * 삼킵니다. 타이머는 그 클릭 다음 차례라 안전하게 걷어냅니다.
           */
          window.setTimeout(() => window.removeEventListener("click", swallow, { capture: true }), 0);
        }
        if (target !== null && target !== todo.categoryId) onDrop(todo, target);
      };
      const swallow = (clickEvent: MouseEvent) => {
        clickEvent.preventDefault();
        clickEvent.stopPropagation();
      };
      const onKey = (keyEvent: KeyboardEvent) => {
        if (keyEvent.key === "Escape") stop();
      };
      const stop = () => {
        if (timer !== null) window.clearTimeout(timer);
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        window.removeEventListener("pointercancel", stop);
        window.removeEventListener("touchmove", holdScroll);
        window.removeEventListener("keydown", onKey);
        started = false;
        setDragging(null);
      };

      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
      window.addEventListener("pointercancel", stop);
      window.addEventListener("touchmove", holdScroll, { passive: false });
      window.addEventListener("keydown", onKey);
      if (byTouch) timer = window.setTimeout(() => begin(startX, startY), HOLD_MS);
    },
    [enabled, onDrop],
  );

  return {
    /** 끌고 있는 할 일. 원래 자리는 옅게 둡니다. */
    activeId: dragging?.todo.todoId ?? null,
    /** 지금 포인터가 올라가 있는 칸. */
    overId: dragging?.over ?? null,
    /** 손끝을 따라다니는 쪽지. */
    preview: dragging ? { title: dragging.todo.title, x: dragging.x, y: dragging.y } : null,
    rowProps: (todo: Todo) => ({ onPointerDown: startFrom(todo) }),
  };
};

export type TodoDrag = ReturnType<typeof useTodoDrag>;
