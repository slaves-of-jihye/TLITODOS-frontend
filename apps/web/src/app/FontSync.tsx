import { useMe } from "@tlitodos/hooks";
import { useEffect } from "react";
import { applyFont } from "./fontPreference";

/**
 * 서버에 저장된 폰트를 앱 전체에 반영합니다.
 *
 * 부팅 시점에는 `main.tsx`가 로컬에 남은 마지막 선택을 먼저 적용하고, 여기서
 * 서버 값이 도착하면 보정합니다. 다른 기기에서 바꾼 선택이 따라오는 경로입니다.
 *
 * 서버가 아직 `font`를 내려주지 않으면(필드 미배포) 아무것도 하지 않고 로컬
 * 선택을 그대로 둡니다. 프로필에서 미리보기 중에도 `me.font`는 그대로이므로
 * 이 효과가 다시 돌지 않아 미리보기를 덮어쓰지 않습니다.
 */
export const FontSync = () => {
  const { data: me } = useMe();
  const font = me?.font;
  useEffect(() => {
    if (font) applyFont(font);
  }, [font]);
  return null;
};
