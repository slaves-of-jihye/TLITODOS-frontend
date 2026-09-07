/**
 * Figma에서 내보낸 아이콘입니다.
 *
 * 벡터 데이터를 손으로 다시 그리면 원본과 달라지므로, 내보낸 파일을 그대로
 * `apps/web/public/icons/ui/`에 두고 경로만 참조합니다. 문서 기준 상대 경로라
 * Vite의 `base: "./"` 설정과 HashRouter 아래에서도 그대로 맞습니다.
 */
const base = "icons/ui";
export const icons = {
  home: `${base}/home.svg`,
  bell: `${base}/bell.svg`,
  profile: `${base}/profile.svg`,
  plus: `${base}/plus.svg`,
  arrowUp: `${base}/arrow-up.svg`,
  check: `${base}/check.svg`,
  emojiAdd: `${base}/emoji-add.svg`,
  imageBox: `${base}/image-box.svg`,
} as const;
