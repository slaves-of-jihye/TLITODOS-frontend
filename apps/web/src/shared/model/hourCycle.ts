import { create } from "zustand";
import { DEFAULT_HOUR_CYCLE, resolveHourCycle, type HourCycle } from "@tlitodos/core";

const STORAGE_KEY = "tlitodos.hourCycle";

/*
 * 화면이 지금 쓰고 있는 시간 표기.
 *
 * 진짜 자리는 서버입니다(`PATCH /users/me/time-format`) — 기기를 옮겨도 따라와야
 * 하니까요. 여기 남는 것은 그 값의 사본이고, 폰트가 하는 일과 같습니다: 서버 값은
 * `GET /users/me`로 오므로 매 접속마다 12시간제로 한 번 그렸다가 바뀝니다. 마지막
 * 선택을 기기에 남겨 두고 첫 그림부터 적용한 뒤, 응답이 오면 보정합니다.
 *
 * 서버가 아직 이 필드를 내려주지 않아도 고른 대로 보입니다 — 사본이 그대로 남고
 * 보정할 값이 오지 않을 뿐입니다.
 *
 * `localStorage`는 있다고 믿지 않습니다 — 세션 저장과 같은 이유입니다.
 */
const readStored = (): HourCycle => {
  if (typeof window === "undefined") return DEFAULT_HOUR_CYCLE;
  try {
    return resolveHourCycle(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return DEFAULT_HOUR_CYCLE;
  }
};

interface HourCycleState {
  hourCycle: HourCycle;
  setHourCycle: (next: HourCycle) => void;
}

export const useHourCycleStore = create<HourCycleState>(set => ({
  hourCycle: readStored(),
  setHourCycle: next => {
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* 저장하지 못해도 이번 세션에는 적용됩니다. */
    }
    set({ hourCycle: next });
  },
}));

/** 시각을 그리는 곳이 구독하는 값. 프로필에서 바꾸면 그 자리에서 다시 그려집니다. */
export const useHourCycle = () => useHourCycleStore(state => state.hourCycle);
