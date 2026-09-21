import { create } from "zustand";
import { DEFAULT_HOUR_CYCLE, resolveHourCycle, type HourCycle } from "@tlitodos/core";

const STORAGE_KEY = "tlitodos.hourCycle";

/*
 * 12시간제·24시간제 선택은 이 기기에만 남습니다.
 *
 * 폰트는 서버에 자리가 있어(`PATCH /users/me/font`) 기기를 옮겨도 따라오지만,
 * 시간 체계는 아직 없습니다. 서버가 필드를 내주면 폰트와 같은 길을 타면 됩니다 —
 * 그때까지는 읽는 사람의 기기에 두는 편이 맞습니다. 시간을 어떻게 읽을지는
 * 계정보다 화면에 가까운 취향이고, 저장할 데가 없다고 못 고르게 할 이유는 없습니다.
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
