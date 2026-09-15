/** 달력에서 일요일은 빨강, 토요일은 파랑입니다. */
import { theme } from "@tlitodos/ui";

/** 일요일은 빨강, 토요일은 파랑입니다. */
export const weekdayTone = (day: number) =>
  day === 0 ? theme.colors.red : day === 6 ? theme.colors.blue : theme.colors.ink;
