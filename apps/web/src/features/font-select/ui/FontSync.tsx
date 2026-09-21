import { useEffect } from "react";
import { useMe } from "@/entities/user";
import { applyFont } from "@/shared/lib";

/**
 * 서버에 저장된 폰트를 앱 전체에 반영합니다.
 *
 * 부팅 시점에는 `main.tsx`가 로컬에 남은 마지막 선택을 먼저 적용하고, 여기서
 * 서버 값이 도착하면 보정합니다. 다른 기기에서 바꾼 선택이 따라오는 경로입니다.
 *
 * 프로필에서 미리보기 중에는 `me.font`가 그대로이므로 이 효과가 다시 돌지 않아
 * 미리보기를 덮어쓰지 않습니다.
 */
export const FontSync = () => {
  const { data: me } = useMe();
  const font = me?.font;
  useEffect(() => {
    if (font) applyFont(font);
  }, [font]);
  return null;
};
