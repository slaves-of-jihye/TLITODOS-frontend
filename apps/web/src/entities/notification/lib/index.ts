/** 알림을 사람이 읽는 말로 옮기는 규칙입니다. */
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

/** 알림 한 줄에 쓰는 문구. 종류마다 다릅니다. */

/** 알림 한 줄에 쓰는 문구. 종류마다 다릅니다. */

/** 알림 한 줄에 쓰는 문구. 종류마다 다릅니다. */
export const alarmSentence = (item: AppNotification) => {
  const who = item.actor.name || "친구";
  if (item.type === "TODO_COMPLETED") return `${who}님이 "${item.todo?.title ?? "할 일"}"을 완료했어요.`;
  if (item.type === "DIARY_CREATED") return `${who}님이 일기를 남겼어요.`;
  return `${who}님이 나의 할 일에 내기를 요청했어요.`;
};

/** 아직 오지 않은 알림 목록. 줄 높이가 같아 도착해도 화면이 밀리지 않습니다. */
