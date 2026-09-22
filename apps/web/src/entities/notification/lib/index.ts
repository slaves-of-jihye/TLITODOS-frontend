/** 알림을 사람이 읽는 말로 옮기는 규칙입니다. */
import { dateOnly } from "@tlitodos/core";
import type { AppNotification } from "@tlitodos/types";

/**
 * 알림을 고르는 세 갈래. 디자인의 pill 순서 그대로입니다.
 *
 * 서버의 `GET /api/v1/notifications`가 `type`으로 이 세 가지를 받습니다.
 */
export const ALARM_FILTERS = [
  { key: "TODO_COMPLETED", label: "친구의 할 일 완료" },
  { key: "DIARY_CREATED", label: "친구의 일기" },
  { key: "BET_REQUESTED", label: "친구의 내기 요청" },
] as const;

/**
 * 내기가 걸린 할 일을 가리키는 말. 언제의 무엇인지까지 적습니다.
 *
 * 마감일이 있으면 그 날이고, 없으면 시작일입니다 — 할 일이 서 있는 마지막 날이
 * 언제까지 해야 하는지를 말해 주고, 내기는 그 기한에 걸리는 것입니다.
 */
const betTarget = (todo: NonNullable<AppNotification["todo"]>) =>
  `${dateOnly(todo.dueDate) ?? dateOnly(todo.startDate) ?? ""} ${todo.title}`.trim();

/** 알림 한 줄에 쓰는 문구. 종류마다 다릅니다. */
export const alarmSentence = (item: AppNotification) => {
  const who = item.actor.name || "친구";
  if (item.type === "TODO_COMPLETED") return `${who}님이 "${item.todo?.title ?? "할 일"}"을 완료했어요.`;
  if (item.type === "DIARY_CREATED") return `${who}님이 일기를 남겼어요.`;
  /*
   * 어느 할 일에 걸린 내기인지 이름으로 말합니다.
   *
   * 예전에는 `나의 할 일`이라고만 해서, 할 일이 여럿인 날에 온 알림은 무엇에 대한
   * 것인지 열어 봐야 알 수 있었습니다. 알림이 할 일을 통째로 들고 오므로 따로
   * 받아 올 것도 없습니다 — 들고 오지 않은 옛 줄만 예전 말로 남습니다.
   */
  if (!item.todo) return `${who}님이 나의 할 일에 내기를 요청했어요.`;
  return `${who}님이 "${betTarget(item.todo)}"에 내기를 요청했어요.`;
};

/** 아직 오지 않은 알림 목록. 줄 높이가 같아 도착해도 화면이 밀리지 않습니다. */
