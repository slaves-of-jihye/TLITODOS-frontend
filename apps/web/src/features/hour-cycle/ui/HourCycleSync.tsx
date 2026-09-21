import { useEffect } from "react";
import { useMe } from "@/entities/user";
import { resolveHourCycle } from "@/shared/lib";
import { useHourCycleStore } from "@/shared/model";

/**
 * 서버에 저장된 시간 표기를 이 기기에도 맞춥니다.
 *
 * 부팅 시점에는 기기에 남은 마지막 선택으로 그리고, 여기서 서버 값이 도착하면
 * 보정합니다 — 다른 기기에서 바꾼 선택이 따라오는 경로입니다. 폰트의 `FontSync`와
 * 같은 자리, 같은 일입니다.
 *
 * 설정에서 방금 고른 값을 덮지 않습니다 — 저장이 성공하면 `me`에 같은 값이
 * 써지므로 이 효과가 다시 돌아도 바뀌는 것이 없습니다.
 */
export const HourCycleSync = () => {
  const { data: me } = useMe();
  const timeFormat = me?.timeFormat;
  useEffect(() => {
    if (timeFormat) useHourCycleStore.getState().setHourCycle(resolveHourCycle(timeFormat));
  }, [timeFormat]);
  return null;
};
