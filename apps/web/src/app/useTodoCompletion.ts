import { useCompleteTodo, useUncompleteTodo } from "@tlitodos/hooks";
import type { Todo } from "@tlitodos/types";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * 체크박스는 즉시 반응하되 서버 호출은 미뤄 두는 완료/해제 토글.
 *
 * 같은 할 일을 연달아 누르면 마지막 상태 하나만 전송하고, 되돌아와 서버 상태와
 * 같아지면 아예 요청하지 않습니다. 화면에는 `overrides`를 씌워 지연을 감춥니다.
 */
const FLUSH_DELAY_MS = 500;

export const useTodoCompletion = ({ serverTodos, onRevert }: { serverTodos: Todo[]; onRevert?: () => void }) => {
  const complete = useCompleteTodo();
  const uncomplete = useUncompleteTodo();
  const [overrides, setOverrides] = useState<Record<number, boolean>>({});
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const desired = useRef(new Map<number, boolean>());

  const dropOverride = useCallback(
    (todoId: number) =>
      setOverrides(current => {
        if (current[todoId] === undefined) return current;
        const rest = { ...current };
        delete rest[todoId];
        return rest;
      }),
    [],
  );

  // 타이머 콜백이 오래된 값을 붙잡지 않도록 매 렌더마다 최신 구현을 담아 둡니다.
  const flushRef = useRef<(todoId: number) => Promise<void>>(async () => {});
  useEffect(() => {
    flushRef.current = async todoId => {
      timers.current.delete(todoId);
      const next = desired.current.get(todoId);
      desired.current.delete(todoId);
      if (next === undefined) return;
      const server = serverTodos.find(todo => todo.todoId === todoId);
      if (!server) return;
      if (server.isCompleted === next) {
        // 눌렀다 되돌린 경우입니다. 보낼 요청이 없으니 서버 값을 다시 신뢰합니다.
        dropOverride(todoId);
        return;
      }
      try {
        await (next ? complete : uncomplete).mutateAsync(todoId);
      } catch {
        dropOverride(todoId);
        onRevert?.();
      }
    };
  });

  useEffect(
    () => () => {
      // 화면을 떠나도 마지막 선택은 잃지 않도록 즉시 보냅니다.
      timers.current.forEach((timer, todoId) => {
        clearTimeout(timer);
        void flushRef.current(todoId);
      });
      timers.current.clear();
    },
    [],
  );

  const setCompletion = useCallback((todoId: number, next: boolean) => {
    setOverrides(current => ({ ...current, [todoId]: next }));
    desired.current.set(todoId, next);
    const pending = timers.current.get(todoId);
    if (pending) clearTimeout(pending);
    timers.current.set(
      todoId,
      setTimeout(() => void flushRef.current(todoId), FLUSH_DELAY_MS),
    );
  }, []);

  return { overrides, setCompletion };
};
