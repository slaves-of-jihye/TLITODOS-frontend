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
  settings: `${base}/settings.svg`,
  plus: `${base}/plus.svg`,
  arrowUp: `${base}/arrow-up.svg`,
  check: `${base}/check.svg`,
  emojiAdd: `${base}/emoji-add.svg`,
  imageBox: `${base}/image-box.svg`,
  edit: `${base}/edit.svg`,
  trash: `${base}/trash.svg`,
  calendar: `${base}/calendar.svg`,
  routine: `${base}/routine.svg`,
} as const;

/**
 * 서비스의 표식. 탭 아이콘으로 쓰는 그림 그대로입니다.
 *
 * 사람에게는 프로필 사진이 있지만 그룹에는 없어, 그룹 칩은 기본 아바타 자리를
 * 이것으로 채웁니다 — 사람 자리에 서는 새싹과 갈라져 보여야 사람 칩과 그룹 칩을
 * 눈으로 구분할 수 있습니다. 아이콘들과 같은 이유로 문서 기준 상대 경로입니다.
 */
export const brandMark = "images/favicon.png";
