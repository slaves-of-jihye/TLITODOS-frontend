import { unresolvedDependencies } from "@tlitodos/core";
import { useCompleteTodo, useUncompleteTodo } from "@tlitodos/hooks";
import type { Todo } from "@tlitodos/types";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * 체크박스는 즉시 반응하되 서버 호출은 미뤄 두는 완료/해제 토글.
 *
 * 같은 할 일을 연달아 누르면 마지막 상태 하나만 전송하고, 되돌아와 서버 상태와
 * 같아지면 아예 요청하지 않습니다. 화면에는 `overrides`를 씌워 지연을 감춥니다.
 * 요청은 할 일마다 직렬로 보내고, 반영이 끝나면 override를 걷어내 쿼리 데이터를
 * 다시 신뢰합니다.
 */
const FLUSH_DELAY_MS = 500;

export const useTodoCompletion = ({
  serverTodos,
  onBlocked,
  onRevert,
}: {
  serverTodos: Todo[];
  onBlocked?: (blockers: Todo[]) => void;
  onRevert?: () => void;
}) => {
  const complete = useCompleteTodo();
  const uncomplete = useUncompleteTodo();
  const [overrides, setOverrides] = useState<Record<number, boolean>>({});

  // 화면에 보이는 값과 판단에 쓰는 값이 어긋나지 않도록 ref와 state를 함께 갱신합니다.
  const overridesRef = useRef(overrides);
  const queued = useRef(new Map<number, boolean>());
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const chains = useRef(new Map<number, Promise<void>>());
  const latest = useRef({ serverTodos, onBlocked, onRevert, complete, uncomplete });
  useEffect(() => {
    latest.current = { serverTodos, onBlocked, onRevert, complete, uncomplete };
  });

  const writeOverride = useCallback((todoId: number, value: boolean | null) => {
    const next = { ...overridesRef.current };
    if (value === null) delete next[todoId];
    else next[todoId] = value;
    overridesRef.current = next;
    setOverrides(next);
  }, []);

  /** 사용자가 지금 보고 있는 완료 여부입니다. */
  const completionOf = useCallback((todoId: number) => {
    const override = overridesRef.current[todoId];
    if (override !== undefined) return override;
    return latest.current.serverTodos.find(todo => todo.todoId === todoId)?.isCompleted ?? false;
  }, []);

  /** 아직 끝나지 않은 선행 할 일을 낙관적 상태까지 반영해 찾습니다. */
  const blockersFor = useCallback(
    (todoId: number) => {
      const todos = latest.current.serverTodos;
      const todo = todos.find(candidate => candidate.todoId === todoId);
      if (!todo) return [];
      const view = todos.map(candidate => ({ ...candidate, isCompleted: completionOf(candidate.todoId) }));
      return unresolvedDependencies(todo, view);
    },
    [completionOf],
  );

  // 타이머와 체인 콜백이 오래된 값을 붙잡지 않도록 매 렌더마다 최신 구현을 담아 둡니다.
  const flushRef = useRef<(todoId: number) => Promise<void>>(async () => {});
  useEffect(() => {
    flushRef.current = async todoId => {
      const target = queued.current.get(todoId);
      queued.current.delete(todoId);
      if (target === undefined) return;
      const { serverTodos: todos, onBlocked: blocked, onRevert: revert } = latest.current;
      const server = todos.find(todo => todo.todoId === todoId);
      if (!server) {
        // 목록에서 사라진 할 일입니다. override를 두면 영영 가려지므로 걷어냅니다.
        writeOverride(todoId, null);
        revert?.();
        return;
      }
      if (server.isCompleted === target) {
        // 눌렀다 되돌린 경우입니다. 보낼 요청이 없으니 서버 값을 다시 신뢰합니다.
        writeOverride(todoId, null);
        return;
      }
      if (target) {
        // 보내기 직전 다시 확인합니다. 기다리는 사이 선행 할 일을 되돌렸을 수 있습니다.
        const blockers = blockersFor(todoId);
        if (blockers.length) {
          writeOverride(todoId, null);
          blocked?.(blockers);
          return;
        }
      }
      try {
        await (target ? latest.current.complete : latest.current.uncomplete).mutateAsync(todoId);
        // 성공하면 쿼리도 함께 갱신되므로 override를 걷어내 서버 값을 다시 신뢰합니다.
        if (!queued.current.has(todoId)) writeOverride(todoId, null);
      } catch {
        writeOverride(todoId, null);
        revert?.();
      }
    };
  });

  /** 같은 할 일의 요청이 겹쳐 순서가 뒤집히지 않도록 직렬로 이어 붙입니다. */
  const enqueueFlush = useCallback((todoId: number) => {
    timers.current.delete(todoId);
    const previous = chains.current.get(todoId) ?? Promise.resolve();
    const chained = previous.catch(() => undefined).then(() => flushRef.current(todoId));
    chains.current.set(todoId, chained);
    void chained.finally(() => {
      if (chains.current.get(todoId) === chained) chains.current.delete(todoId);
    });
    return chained;
  }, []);

  const toggle = useCallback(
    (todoId: number) => {
      const next = !completionOf(todoId);
      if (next) {
        const blockers = blockersFor(todoId);
        if (blockers.length) {
          latest.current.onBlocked?.(blockers);
          return;
        }
      }
      writeOverride(todoId, next);
      queued.current.set(todoId, next);
      const pending = timers.current.get(todoId);
      if (pending) clearTimeout(pending);
      timers.current.set(
        todoId,
        setTimeout(() => void enqueueFlush(todoId), FLUSH_DELAY_MS),
      );
    },
    [blockersFor, completionOf, enqueueFlush, writeOverride],
  );

  useEffect(
    () => () => {
      // 화면을 떠나도 마지막 선택은 잃지 않도록 즉시 보냅니다.
      timers.current.forEach((timer, todoId) => {
        clearTimeout(timer);
        void enqueueFlush(todoId);
      });
      timers.current.clear();
    },
    [enqueueFlush],
  );

  return { overrides, toggle };
};
