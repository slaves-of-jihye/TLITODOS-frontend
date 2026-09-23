import { css, keyframes } from "@emotion/react";
import styled from "@emotion/styled";
import { useEffect, useRef } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import type { Todo } from "@tlitodos/types";
import { stashFills } from "@tlitodos/core";
import { icons } from "./icons";
import { palette, theme, uiGlyphFont } from "./theme";

/** 아이콘으로 쓰는 문장부호를 감쌉니다. 이유는 `uiGlyphFont` 주석에 있습니다. */
export const Glyph = styled.span`
  font-family: ${uiGlyphFont};
`;

/** 붙었을 때 화면 끝과 띄울 거리. 평소에는 같은 값만큼 당겨 상쇄합니다. */
const STICKY_TOP_PAD = "12px";

/**
 * 화면 위에 붙는 줄의 공통 규칙입니다.
 *
 * 흰 배경이 있어야 아래 내용이 비쳐 보이지 않고, 붙었을 때 화면 끝에 딱 닿지
 * 않도록 안쪽 위 여백을 둡니다. 아래 네비게이션(z-index 60)보다는 낮게 둡니다.
 *
 * 그 여백만큼 위로 당겨, 붙지 않은 평소에는 원래 간격 그대로 보이게 합니다.
 */
const stickyTopRow = css`
  position: sticky;
  top: 0;
  z-index: 40;
  background: ${palette.white};
  padding-top: ${STICKY_TOP_PAD};
  margin-top: -${STICKY_TOP_PAD};
`;

/** 손을 올릴 수 있는 기기에서 칩 줄 스크롤바가 차지하는 높이. */
export const SCROLLBAR_GUTTER = "6px";

/**
 * 손을 올릴 수 있는 기기에서만 적용하는 조건.
 *
 * hover 상태를 주는 곳은 모두 이 뒤에 둡니다 — 손가락으로 한 번 누르면 손을 뗀
 * 뒤에도 hover가 남아, 누르고 있는 것처럼 보이는 자리가 생깁니다. 스크롤바도
 * 마찬가지로 손을 올릴 수 없는 기기에는 애초에 필요가 없습니다.
 */
export const hoverable = "@media (hover: hover) and (pointer: fine)";

/**
 * 옆으로 넘치는 칩 줄의 스크롤바입니다.
 *
 * 평소에는 투명해 보이지 않다가, 줄에 손을 올리거나 안으로 초점이 들어오면
 * 막대가 옅게 나타납니다.
 *
 * macOS와 iOS가 기본으로 쓰는, 내용 위에 겹쳐 그리는 스크롤바는 스크롤하는
 * 동안에만 나타납니다 — `scrollbar-color`만 주면 손을 올려도 한 번 굴리기
 * 전에는 아무것도 보이지 않습니다. 그래서 `::-webkit-scrollbar`로 늘 자리를
 * 차지하는 막대를 두고 색만 바꿉니다. 크롬은 `scrollbar-width`/`scrollbar-color`가
 * `auto`가 아니면 이 의사 요소를 무시하므로, 표준 속성은 그 둘을 지원하지 않는
 * 파이어폭스 쪽에만 둡니다.
 *
 * 막대가 자리를 차지하는 만큼 줄이 두꺼워지므로, 쓰는 쪽에서 `hoverScrollbarPull`
 * 이나 그와 같은 값으로 아래 여백에서 덜어 내 평소 간격을 지킵니다. 손을 올릴 수
 * 없는 기기에서는 이 규칙을 아예 두지 않아, 자리를 차지하지 않는 기본 스크롤바가
 * 그대로 남고 덜어 낼 것도 없습니다.
 */
export const hoverScrollbarX = css`
  overflow-x: auto;
  overscroll-behavior-inline: contain;
  > * {
    flex: 0 0 auto;
  }
  ${hoverable} {
    &::-webkit-scrollbar {
      height: ${SCROLLBAR_GUTTER};
    }
    &::-webkit-scrollbar-track {
      background: transparent;
    }
    &::-webkit-scrollbar-thumb {
      border-radius: ${SCROLLBAR_GUTTER};
      background: transparent;
    }
    &:hover::-webkit-scrollbar-thumb,
    &:focus-within::-webkit-scrollbar-thumb {
      background: rgba(29, 29, 29, 0.22);
    }
    @supports not selector(::-webkit-scrollbar) {
      scrollbar-width: thin;
      scrollbar-color: transparent transparent;
      &:hover,
      &:focus-within {
        scrollbar-color: rgba(29, 29, 29, 0.22) transparent;
      }
    }
  }
`;

/** 막대가 줄 아래에 매달리도록 그만큼 당깁니다 — 아래 내용은 있던 자리에 그대로 있습니다. */
export const hoverScrollbarPull = css`
  ${hoverable} {
    margin-bottom: -${SCROLLBAR_GUTTER};
  }
`;

export const AppShell = styled.div`
  width: min(1280px, 100%);
  min-height: 100vh;
  min-height: 100dvh;
  margin: 0 auto;
  /* 아래 여백은 네비게이션 높이에 16px을 더한 값입니다 — 마지막 내용이 가리지 않게. */
  padding: 76px 7% calc(${theme.layout.nav} + 16px);
  position: relative;
  background: white;
  @media (max-width: 800px) {
    padding: 24px 18px calc(96px + env(safe-area-inset-bottom));
  }
`;

/**
 * 디자인의 `selection` 컴포넌트입니다. 회색 테두리 pill이 기본이고, 주 동작은
 * 검은 pill입니다. 초록 계열은 새 디자인에 없어 없앴습니다.
 */
export const Button = styled.button<{ variant?: "primary" | "soft" | "dark" | "ghost" | "danger" }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1px solid ${({ variant = "soft" }) => (variant === "soft" ? palette.gray200 : "transparent")};
  border-radius: ${theme.radius.pill};
  padding: 4px 12px;
  font-size: ${theme.text.s};
  background: ${({ variant = "soft" }) =>
    variant === "primary" || variant === "dark"
      ? palette.black
      : variant === "ghost"
        ? "transparent"
        : variant === "danger"
          ? "#fff0f3"
          : palette.gray100};
  color: ${({ variant = "soft" }) =>
    variant === "primary" || variant === "dark"
      ? palette.white
      : variant === "danger"
        ? theme.colors.red
        : theme.colors.ink};
  transition: background 0.16s ease;
  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
  @media (max-width: 600px) {
    min-height: 40px;
    padding: 6px 14px;
  }
`;

export const HeaderRow = styled.header`
  ${stickyTopRow}
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
  margin-bottom: 54px;
  @media (max-width: 800px) {
    ${hoverScrollbarX}
    flex-wrap: nowrap;
    gap: 10px;
    margin: -12px -18px 34px;
    padding: 12px 18px 10px;
    /* 칩은 위 여백이 잡아 주므로, 스크롤바 몫은 아래 여백에서만 덜어 냅니다. */
    ${hoverable} {
      margin-bottom: calc(34px - ${SCROLLBAR_GUTTER});
    }
  }
`;

/**
 * 사진을 올리지 않은 사람의 자리.
 *
 * 프로필, 멤버 칩, 그룹 화면 머리줄, 알림 줄 네 곳이 같은 자리를 그리는데 두
 * 곳은 새싹, 두 곳은 토끼였습니다. 사람마다 화면마다 다른 얼굴이 되지 않도록
 * 한 곳에서 정합니다.
 */
export const DEFAULT_AVATAR = "🌱";

export const ViewChip = ({
  active,
  avatar,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean; avatar?: string | null }) => (
  <ViewChipButton active={Boolean(active)} {...props}>
    {avatar ? <Avatar src={avatar} alt="" /> : <AvatarFallback>{DEFAULT_AVATAR}</AvatarFallback>}
    <span>{children}</span>
  </ViewChipButton>
);
const ViewChipButton = styled.button<{ active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 0;
  padding: 4px 10px 4px 4px;
  border-radius: ${theme.radius.pill};
  font-size: ${theme.text.h3};
  background: ${({ active }) => (active ? palette.black : palette.gray200)};
  color: ${({ active }) => (active ? palette.white : theme.colors.ink)};
  white-space: nowrap;
`;
const Avatar = styled.img`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
  background: white;
`;
const AvatarFallback = styled.span`
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: white;
`;

/**
 * 할 일 개수를 사분면 점으로 보여주는 표식.
 *
 * Figma의 `day/status5`입니다. 30px 안에 20px 원 네 개를 10px씩 어긋나게 겹쳐
 * 두고, 채워지지 않은 칸은 회색으로 남깁니다. 가운데에는 남은 개수를 숫자로
 * 얹고, 남은 게 없으면 대신 체크를 올립니다.
 */
export const StatusCluster = ({
  fills,
  checked,
  count,
  size = 30,
}: {
  fills: (string | null)[];
  checked?: boolean;
  count?: number;
  size?: number;
}) => (
  // 가운데 표시는 사분면이 얼마나 찼든 항상 흰색입니다.
  <Cluster style={{ width: size, height: size }}>
    {[0, 1, 2, 3].map(index => (
      <Quadrant key={index} data-slot={index} style={{ background: fills[index] ?? palette.gray200 }} />
    ))}
    {checked ? <ClusterCheck aria-hidden /> : null}
    {!checked && count ? <ClusterCount>{count}</ClusterCount> : null}
  </Cluster>
);
const Cluster = styled.span`
  position: relative;
  display: block;
  flex: none;
`;
const Quadrant = styled.i`
  position: absolute;
  width: 66.67%;
  aspect-ratio: 1;
  border-radius: 50%;
  opacity: 0.8;
  &[data-slot="0"] {
    left: 0;
    top: 0;
  }
  &[data-slot="1"] {
    right: 0;
    top: 0;
  }
  &[data-slot="2"] {
    left: 0;
    bottom: 0;
  }
  &[data-slot="3"] {
    right: 0;
    bottom: 0;
  }
`;
/**
 * 체크 표시.
 *
 * 내보낸 아이콘은 흰색으로 칠해져 있어 그대로는 색을 바꿀 수 없습니다. 같은
 * 파일을 마스크로 쓰고 색은 배경으로 넣어, 한 장으로 흰색과 검은색을 다 냅니다.
 */
/** 내보낸 SVG가 흰 단색이라, 색을 바꿀 수 있게 마스크로 얹습니다. */
const ClusterCheck = styled.span`
  position: absolute;
  left: 50%;
  top: 50%;
  width: 40%;
  height: 40%;
  transform: translate(-50%, -50%);
  background: ${palette.white};
  -webkit-mask: url(${icons.check}) center / contain no-repeat;
  mask: url(${icons.check}) center / contain no-repeat;
`;
const ClusterCount = styled.span`
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  color: ${palette.white};
  font-size: ${theme.text.s};
  line-height: 1;
`;

export const CategoryPill = ({
  name,
  accent,
  own,
  onAdd,
  onManage,
}: {
  name: string;
  accent: string;
  own: boolean;
  onAdd?: () => void;
  onManage?: () => void;
}) => {
  const hasAddAction = own && Boolean(onAdd);
  return (
    <Pill
      accent={accent}
      hasAddAction={hasAddAction}
      interactive={Boolean(onManage)}
      onClick={onManage}
      role={onManage ? "button" : undefined}
    >
      <span>{name}</span>
      {own && onAdd ? (
        <PlusButton
          aria-label={`${name} 할 일 추가`}
          onClick={event => {
            event.stopPropagation();
            onAdd();
          }}
        >
          <img src={icons.plus} alt="" aria-hidden />
        </PlusButton>
      ) : null}
    </Pill>
  );
};
const Pill = styled.div<{ accent: string; hasAddAction: boolean; interactive: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 16px;
  max-width: 100%;
  padding: ${({ hasAddAction }) => (hasAddAction ? "6px 8px 6px 28px" : "6px 28px")};
  border-radius: ${theme.radius.pill};
  background: ${palette.gray200};
  color: ${({ accent }) => accent};
  font-size: 18px;
  transition: background 0.16s ease;
  /*
   * 디자인의 category 배리언트에 있는 hover 상태입니다: gray/200 -> gray/300.
   *
   * 이름을 눌러 고칠 수 있는 이름표에만 줍니다 — 프로필의 이름표처럼 누를 일이
   * 없는 곳까지 색이 바뀌면 누를 수 있다고 잘못 알려 줍니다. 손을 올릴 수 없는
   * 기기에서는 두지 않습니다: 한 번 누르면 손을 뗀 뒤에도 hover가 남습니다.
   */
  ${({ interactive }) =>
    interactive &&
    css`
      cursor: pointer;
      ${hoverable} {
        &:hover {
          background: ${palette.gray300};
        }
      }
    `}
  > span {
    min-width: 0;
    overflow-wrap: anywhere;
  }
  @media (max-width: 600px) {
    width: ${({ hasAddAction }) => (hasAddAction ? "100%" : "fit-content")};
    justify-content: space-between;
  }
`;
const PlusButton = styled.button`
  display: grid;
  place-items: center;
  flex: none;
  width: 24px;
  height: 24px;
  padding: 0;
  border: 0;
  background: transparent;
  img {
    width: 24px;
    height: 24px;
  }
  @media (max-width: 600px) {
    width: 32px;
    height: 32px;
  }
`;

export const TodoRow = ({
  todo,
  accent,
  own,
  deadline,
  onToggle,
  onEdit,
  onBet,
  betClosed,
}: {
  todo: Todo;
  accent: string;
  own: boolean;
  /**
   * 세부사항 옆에 붙는 마감 한마디. 언제까지인지는 읽는 사람의 오늘과 시간 체계에
   * 따라 달라지므로, 문구는 부르는 쪽에서 지어 넘깁니다(`formatDeadline`).
   */
  deadline?: string | null;
  onToggle?: () => void;
  onEdit?: () => void;
  /** 남의 할 일에 내기를 걸 때. 넘기지 않으면 덮개를 띄우지 않습니다. */
  onBet?: () => void;
  /**
   * 기한이 지나 내기를 걸 수 없는 줄인지.
   *
   * `onBet` 자체를 거두지 않고 따로 받습니다 — 덮개를 아예 없애면 왜 못 거는지
   * 알 길이 없어, 덮개는 그대로 뜨되 이유를 적고 눌리지 않게 합니다.
   */
  betClosed?: boolean;
}) => {
  const detail = todo.description || todo.subtasks.map(item => item.content).join(" · ");
  // 완료하면 사분면이 카테고리 색으로 차고 체크가 올라갑니다.
  const fills = todo.isCompleted ? Array<string>(4).fill(accent) : [null, null, null, null];
  return (
    <TodoItem interactive={own}>
      <CheckButton aria-label={todo.isCompleted ? "완료됨" : "완료하기"} disabled={!own} onClick={onToggle}>
        <StatusCluster fills={fills} checked={todo.isCompleted} />
      </CheckButton>
      {/*
       * 남의 할 일에서는 줄 자체가 내기 요청으로 이어집니다.
       *
       * 디자인은 손을 올렸을 때 덮개를 띄우지만, 손가락에는 hover가 없어 그
       * 길밖에 없습니다. 마우스로는 덮개가 먼저 덮여 있어 이 버튼까지 닿지
       * 않으니 두 길이 겹치지 않습니다.
       */}
      {/* 손가락에는 hover가 없어 줄 자체가 내기로 이어지는데, 걸 수 없는 줄은 그 길도 막습니다. */}
      <TodoTextButton
        disabled={own ? !onEdit : !onBet || betClosed}
        onClick={own ? onEdit : betClosed ? undefined : onBet}
      >
        <strong>{todo.title}</strong>
        {detail || deadline ? (
          <TodoSubline>
            {detail ? <small>{detail}</small> : null}
            {deadline ? <TodoDeadline>{deadline}</TodoDeadline> : null}
          </TodoSubline>
        ) : null}
      </TodoTextButton>
      {/* 남의 할 일에만, 아직 끝나지 않은 것에만 덮개가 올라옵니다. */}
      {!own && !todo.isCompleted && onBet ? (
        <BetOverlay type="button" closed={Boolean(betClosed)} onClick={betClosed ? undefined : onBet}>
          {betClosed ? "기한이 지나 내기할 수 없어요" : "내기 요청하기"}
        </BetOverlay>
      ) : null}
    </TodoItem>
  );
};
const TodoItem = styled.div<{ interactive: boolean }>`
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 6px 8px;
  border-radius: ${theme.radius.sm};
  transition: background 0.16s ease;
  /* 걸 수 없는 줄에서도 덮개는 떠야 합니다 — 이유를 읽을 자리가 거기뿐입니다. */
  &:hover > button:last-child {
    opacity: 1;
  }
  /*
   * 손을 올린 줄에만 옅은 바탕을 깝니다. 흰 바탕에서 한 단 어두운 gray/100이고,
   * 이름표가 gray/200 -> gray/300으로 가는 것과 같은 한 걸음입니다.
   *
   * 누를 수 있는 줄에만 줍니다 — 읽기 전용인 남의 줄까지 반응하면 누를 수 있다고
   * 잘못 알려 줍니다. 손을 올릴 수 없는 기기에서는 두지 않습니다: 한 번 누르면
   * 손을 뗀 뒤에도 hover가 남습니다.
   */
  ${({ interactive }) =>
    interactive &&
    css`
      ${hoverable} {
        &:hover {
          background: ${theme.colors.panel};
        }
      }
    `}
  @media (max-width: 600px) {
    padding: 8px 6px;
  }
`;
const CheckButton = styled.button`
  display: grid;
  place-items: center;
  flex: none;
  padding: 4px 0;
  border: 0;
  background: transparent;
  &:disabled {
    cursor: default;
  }
`;
const TodoTextButton = styled.button`
  min-width: 0;
  flex: 1;
  display: grid;
  justify-items: start;
  border: 0;
  background: transparent;
  text-align: left;
  padding: 0;
  color: ${theme.colors.ink};
  strong {
    font-size: ${theme.text.h3};
    overflow-wrap: anywhere;
  }
  small {
    color: ${theme.colors.muted};
    font-size: ${theme.text.s};
    overflow-wrap: anywhere;
  }
  &:disabled {
    cursor: default;
  }
`;
/*
 * 세부사항과 마감이 한 줄에 섭니다.
 *
 * 마감은 앞이 아니라 뒤에 둡니다 — 줄을 훑을 때 먼저 읽혀야 하는 것은 무슨
 * 일인지이고, 언제까지인지는 그다음입니다. 좁아지면 마감이 아래로 내려가되
 * 줄어들지는 않습니다: 세부사항은 잘려도 뜻이 남지만 `2시까지`는 잘리면
 * 남는 것이 없습니다.
 */
const TodoSubline = styled.span`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 8px;
  min-width: 0;
`;
const TodoDeadline = styled.small`
  flex: none;
  /*
   * 마감은 경고입니다. 본문 회색과 같은 크기로, 색만 다르게 둡니다.
   *
   * 선택자를 두 번 겹쳐 무게를 싣습니다 — 감싸는 버튼이 small 전체를 회색으로
   * 칠하고 있어, 클래스 하나로는 그 자손 선택자를 이기지 못합니다.
   */
  && {
    color: ${theme.colors.red};
  }
`;
const BetOverlay = styled.button<{ closed: boolean }>`
  position: absolute;
  inset: 0;
  border: 0;
  border-radius: ${theme.radius.sm};
  background: rgba(255, 255, 255, 0.86);
  /* 걸 수 있는 줄은 검은 글씨로 권하고, 닫힌 줄은 옅은 회색으로 알리기만 합니다. */
  color: ${({ closed }) => (closed ? theme.colors.muted : theme.colors.ink)};
  cursor: ${({ closed }) => (closed ? "default" : "pointer")};
  opacity: 0;
  transition: opacity 0.18s;
  &:disabled {
    cursor: not-allowed;
  }
`;

export const DiaryBadge = ({
  emotion,
  nickname,
  date,
  onClick,
}: {
  emotion?: string | null;
  nickname: string;
  /** 날짜를 보여줄 자리가 있는 곳(`modal / diary`)에서만 넘깁니다. */
  date?: string;
  onClick?: () => void;
}) => (
  <DiaryButton onClick={onClick}>
    <span aria-hidden>{emotion || "😀"}</span>
    <strong>{nickname}</strong>
    {date ? <small>{date}</small> : null}
  </DiaryButton>
);
const DiaryButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 1px solid ${palette.gray200};
  border-radius: ${theme.radius.pill};
  padding: 4px 12px;
  background: ${palette.gray100};
  color: ${theme.colors.ink};
  font-size: ${theme.text.s};
  white-space: nowrap;
  strong {
    font-size: ${theme.text.s};
  }
  small {
    color: ${theme.colors.muted};
    font-size: ${theme.text.xs};
  }
  @media (max-width: 600px) {
    min-height: 40px;
    max-width: 100%;
  }
`;

export const DayStash = ({
  marks,
  incompleteCount,
  seed,
  selected,
  today,
  date,
  onClick,
}: {
  /** 그 날 할 일이 있는 카테고리별 강조색과, 끝낸 할 일이 하나라도 있는지입니다. */
  marks: { accent: string; done: boolean }[];
  /** 그 날 남은 할 일 수. 0이면 숫자 대신 체크를 올립니다. */
  incompleteCount: number;
  /** 남는 사분면을 누가 가져갈지 정하는 씨앗. 그 날짜와 채워진 카테고리로 만듭니다. */
  seed: string;
  selected?: boolean;
  today?: boolean;
  date: number;
  onClick?: () => void;
}) => {
  // 나누는 규칙은 `stashFills`에 있습니다. 점 색은 카테고리 색 그대로이고,
  // 80% 불투명도는 사분면 자체에 걸려 있습니다.
  const fills = stashFills(marks, seed);
  return (
    <DayButton onClick={onClick}>
      <StatusCluster
        fills={fills}
        checked={incompleteCount === 0 && marks.length > 0}
        count={incompleteCount || undefined}
      />
      <DateLabel selected={Boolean(selected)} today={Boolean(today)}>
        {String(date).padStart(2, "0")}
      </DateLabel>
    </DayButton>
  );
};
const DayButton = styled.button`
  width: 100%;
  border: 0;
  background: transparent;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 0;
  color: inherit;
`;
const DateLabel = styled.span<{ selected: boolean; today: boolean }>`
  width: 26px;
  height: 26px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: ${({ selected, today }) => (selected ? palette.black : today ? palette.gray200 : "transparent")};
  color: ${({ selected }) => (selected ? palette.white : "inherit")};
  font-size: ${theme.text.s};
`;

export const BottomNav = ({
  active,
  alarm = false,
  onNavigate,
}: {
  active: "home" | "alarm" | "settings";
  /** 안 읽은 알림이 남아 있는지. 종 위에 점 하나로만 알립니다. */
  alarm?: boolean;
  onNavigate: (next: "home" | "alarm" | "settings") => void;
}) => (
  <Nav>
    {(
      [
        ["home", icons.home, "홈"],
        ["alarm", icons.bell, "알림"],
        ["settings", icons.settings, "설정"],
      ] as const
    ).map(([key, src, label]) => (
      <NavButton key={key} onClick={() => onNavigate(key)} aria-label={label}>
        <NavIcon
          active={active === key}
          style={{ maskImage: `url(${src})`, WebkitMaskImage: `url(${src})` }}
          aria-hidden
        />
        {/* 점은 모양일 뿐이라, 읽어 주는 말은 탭 이름에 붙여 따로 답니다. */}
        {key === "alarm" && alarm ? (
          <>
            <NavDot aria-hidden />
            <SrOnly>안 읽은 알림 있음</SrOnly>
          </>
        ) : null}
      </NavButton>
    ))}
  </Nav>
);
/*
 * 뷰포트 아래에 붙습니다.
 *
 * 예전에는 `absolute`라 페이지 끝에 붙어 있었고, 내용이 길면 스크롤과 함께
 * 사라졌습니다. `AppShell`의 아래 여백이 이 높이만큼 잡혀 있어 내용이 가려지지
 * 않습니다.
 */
const Nav = styled.nav`
  position: fixed;
  z-index: 60;
  left: 0;
  right: 0;
  bottom: 0;
  height: ${theme.layout.nav};
  display: flex;
  justify-content: center;
  gap: 140px;
  align-items: center;
  background: ${palette.white};
  /* 그림자 대신 선 하나로 본문과 가릅니다. 높이를 먹지 않도록 border-box입니다. */
  border-top: 1px solid ${theme.colors.line};
  @media (max-width: 600px) {
    height: calc(72px + env(safe-area-inset-bottom));
    padding: 0 max(18px, env(safe-area-inset-left)) env(safe-area-inset-bottom) max(18px, env(safe-area-inset-right));
    justify-content: space-around;
    gap: 0;
  }
`;
const NavButton = styled.button`
  position: relative;
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border: 0;
  border-radius: 50%;
  background: transparent;
`;
/*
 * 종 오른쪽 위에 얹는 점.
 *
 * 아이콘 자체는 마스크라 안에 무엇을 넣을 수 없어 버튼 위에 따로 놓습니다.
 * 흰 테두리를 두르는 것은 아이콘의 진한 획과 맞닿아도 점이 뭉개지지 않게
 * 하려는 것입니다. 알림 화면의 갈래 칩에 붙는 점과 같은 크기·같은 색입니다.
 */
const NavDot = styled.i`
  position: absolute;
  top: 6px;
  right: 6px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${theme.colors.red};
  box-shadow: 0 0 0 2px ${palette.white};
`;
/**
 * 아이콘을 마스크로 얹어 색을 코드에서 정합니다.
 *
 * 내보낸 SVG마다 색이 박혀 있어 그대로 쓰면 파일끼리 어긋납니다. 모양만 마스크로
 * 가져오고 색은 여기서 주면, 고른 탭은 ink로 진하게 나머지는 gray/400으로 옅게
 * 갈라집니다.
 */
const NavIcon = styled.span<{ active: boolean }>`
  width: 32px;
  height: 32px;
  background: ${({ active }) => (active ? theme.colors.ink : palette.gray400)};
  -webkit-mask-position: center;
  -webkit-mask-size: contain;
  -webkit-mask-repeat: no-repeat;
  mask-position: center;
  mask-size: contain;
  mask-repeat: no-repeat;
  transition: background 0.16s ease;
`;

/**
 * 지우기 전에 한 번 묻는 드롭다운.
 *
 * `window.confirm`은 화면 밖의 브라우저 창을 띄우고, 확인/취소 두 갈래밖에
 * 없습니다. 루틴 회차는 "이것만"과 "루틴 전체"를 골라야 하므로 누른 버튼 바로
 * 아래에 붙여 고르게 합니다. 바깥을 누르거나 Esc를 누르는 것도 취소입니다 —
 * 여는 버튼까지 감싼 자리 안쪽만 "안"으로 봅니다. 그래야 같은 버튼을 다시 눌러
 * 닫을 때 바깥 클릭으로 먼저 닫히고 다시 열리는 일이 없습니다.
 */
/**
 * 바깥을 누르거나 Esc를 누르면 닫히는 자리.
 *
 * 돌려주는 ref는 여는 버튼까지 감싼 자리에 걸어야 합니다 — 그래야 그 버튼이
 * "안"으로 세어져, 같은 버튼을 다시 눌러 닫을 때 바깥 클릭으로 먼저 닫히고
 * 곧바로 다시 열리는 일이 없습니다.
 */
export const useDismissable = <Element extends HTMLElement>(open: boolean, onDismiss: () => void) => {
  const anchor = useRef<Element>(null);
  useEffect(() => {
    if (!open) return;
    const dismissOutside = (event: PointerEvent) => {
      if (!anchor.current?.contains(event.target as Node)) onDismiss();
    };
    const dismissOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onDismiss();
    };
    document.addEventListener("pointerdown", dismissOutside);
    document.addEventListener("keydown", dismissOnEscape);
    return () => {
      document.removeEventListener("pointerdown", dismissOutside);
      document.removeEventListener("keydown", dismissOnEscape);
    };
  }, [open, onDismiss]);
  return anchor;
};

export const ConfirmMenu = ({
  open,
  label,
  above = false,
  trigger,
  onDismiss,
  children,
}: {
  open: boolean;
  label: string;
  /** 시트 아래쪽 버튼은 위로 펼칩니다. */
  above?: boolean;
  trigger: ReactNode;
  onDismiss: () => void;
  children: ReactNode;
}) => {
  const anchor = useDismissable<HTMLDivElement>(open, onDismiss);
  return (
    <ConfirmAnchor ref={anchor}>
      {trigger}
      {open ? (
        <ConfirmBox above={above} role="dialog" aria-label={label}>
          {children}
        </ConfirmBox>
      ) : null}
    </ConfirmAnchor>
  );
};

export const ConfirmAnchor = styled.div`
  position: relative;
  display: flex;
  flex: 1;
  > button {
    flex: 1;
  }
`;
export const ConfirmBox = styled.div<{ above: boolean }>`
  position: absolute;
  ${({ above }) => (above ? "bottom: calc(100% + 8px);" : "top: calc(100% + 8px);")}
  left: 0;
  z-index: 1;
  display: grid;
  gap: 2px;
  min-width: max(100%, 232px);
  border: 1px solid ${palette.gray200};
  border-radius: 12px;
  background: ${palette.white};
  padding: 8px;
  box-shadow: ${theme.shadow};
`;
export const ConfirmNote = styled.p`
  margin: 0;
  padding: 6px 12px;
  font-size: ${theme.text.xs};
  color: ${theme.colors.muted};
`;
export const ConfirmChoice = styled.button<{ tone?: "danger" }>`
  border: 0;
  border-radius: 8px;
  background: transparent;
  padding: 10px 12px;
  text-align: left;
  font-size: ${theme.text.s};
  color: ${({ tone }) => (tone === "danger" ? theme.colors.red : theme.colors.ink)};
  &:hover:not(:disabled) {
    background: ${palette.gray100};
  }
  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
`;

export const Modal = ({
  open,
  title,
  children,
  onClose,
  nested = false,
  login = false,
  sheet = false,
  compact = false,
  "aria-label": ariaLabel,
}: {
  open: boolean;
  title?: string;
  children: ReactNode;
  onClose?: () => void;
  nested?: boolean;
  login?: boolean;
  /** 디자인의 상세 시트처럼 넓은 화면에서도 아래에 붙는 형태입니다. */
  sheet?: boolean;
  /**
   * 한두 줄만 묻는 창.
   *
   * 기본 크기는 800px 폭에 54/60px 여백이라, 한 줄짜리 물음을 담으면 글자보다
   * 빈자리가 훨씬 넓어집니다. 짧은 물음은 내용만큼만 차지하게 좁힙니다.
   */
  compact?: boolean;
  /**
   * 제목을 보여주지 않는 시트에 이름을 붙입니다.
   *
   * 부르는 쪽은 처음부터 이 이름을 넘기고 있었지만 받는 자리가 없어 그냥
   * 버려졌습니다 — 이름표가 붙은 대화상자가 하나도 없었던 셈입니다. TS는
   * 붙임표가 든 JSX 속성을 남는 속성으로 보지 않아 조용히 지나갑니다.
   */
  "aria-label"?: string;
}) =>
  open ? (
    <Overlay
      login={login}
      sheet={sheet}
      onMouseDown={event => {
        if (event.target === event.currentTarget && !nested) onClose?.();
      }}
    >
      <Dialog
        login={login}
        sheet={sheet}
        compact={compact}
        role="dialog"
        aria-modal="true"
        aria-label={title ?? ariaLabel}
      >
        {title ? <h2>{title}</h2> : null}
        {children}
      </Dialog>
    </Overlay>
  ) : null;
const Overlay = styled.div<{ login: boolean; sheet: boolean }>`
  position: fixed;
  inset: 0;
  z-index: 100;
  display: grid;
  place-items: ${({ sheet }) => (sheet ? "end center" : "center")};
  padding: ${({ sheet }) => (sheet ? "22px 22px 0" : "22px")};
  background: ${({ login }) => (login ? theme.colors.loginOverlay : theme.colors.overlay)};
  @media (max-width: 600px) {
    place-items: ${({ login }) => (login ? "center" : "end center")};
    padding: ${({ login }) => (login ? "16px" : "0")};
  }
`;
const Dialog = styled.div<{ login: boolean; sheet: boolean; compact: boolean }>`
  width: ${({ compact }) => (compact ? "min(420px, 100%)" : "min(800px, 100%)")};
  max-height: calc(100vh - 44px);
  overflow: auto;
  border-radius: ${({ sheet }) => (sheet ? "40px 40px 0 0" : theme.radius.lg)};
  background: white;
  padding: ${({ sheet, compact }) => (sheet ? "60px" : compact ? "32px 28px" : "54px 60px")};
  box-shadow: ${theme.shadow};
  h2 {
    margin: 0 0 30px;
  }
  @media (max-width: 600px) {
    width: 100%;
    max-height: calc(100dvh - 24px);
    padding: ${({ login }) => (login ? "28px 18px" : "30px 20px calc(24px + env(safe-area-inset-bottom))")};
    border-radius: ${({ login }) => (login ? "26px" : "28px 28px 0 0")};
    overscroll-behavior: contain;
    h2 {
      margin-bottom: 24px;
      font-size: clamp(20px, 5.6vw, 22px);
      line-height: 1.35;
    }
  }
`;

export const ErrorText = styled.p`
  color: ${theme.colors.red};
  font-size: 13px;
  margin: 12px 0;
`;

/**
 * 한 가지를 묻고 답을 받는 작은 창.
 *
 * 되돌릴 수 없는 일은 보통 누른 버튼 아래 드롭다운(`ConfirmMenu`)으로 묻지만,
 * 물음이 어느 버튼에서 시작된 것이 아닐 때 — 끌어다 버린 자리, 시트를 닫으려는
 * 몸짓 — 는 매달 자리가 없어 화면 한가운데로 부릅니다. 그런 물음은 모두 같은
 * 모양이어야 해서, 틀은 여기 한 곳에 둡니다. 답은 부르는 쪽이 `children`으로
 * 넣는 버튼들입니다 — 둘일 수도, 셋일 수도 있습니다.
 */
export const ConfirmDialog = ({
  open,
  title,
  note,
  error,
  children,
  onClose,
  "aria-label": ariaLabel,
}: {
  open: boolean;
  title: ReactNode;
  note?: ReactNode;
  error?: string;
  children: ReactNode;
  /** 바깥을 눌러 물러날 수 있는지. 답하는 중이라면 넘기지 않습니다. */
  onClose?: () => void;
  "aria-label": string;
}) => (
  <Modal compact open={open} onClose={onClose} aria-label={ariaLabel}>
    <ConfirmDialogBody>
      <ConfirmDialogTitle>{title}</ConfirmDialogTitle>
      {note ? <ConfirmDialogNote>{note}</ConfirmDialogNote> : null}
      {error ? <ErrorText>{error}</ErrorText> : null}
      <ConfirmDialogActions>{children}</ConfirmDialogActions>
    </ConfirmDialogBody>
  </Modal>
);

const ConfirmDialogBody = styled.div`
  display: grid;
  gap: 16px;
  justify-items: center;
  text-align: center;
`;

const ConfirmDialogTitle = styled.p`
  margin: 0;
  font-size: ${theme.text.h3};
  color: ${theme.colors.ink};
  overflow-wrap: anywhere;
`;

const ConfirmDialogNote = styled.p`
  margin: 0;
  font-size: ${theme.text.s};
  color: ${theme.colors.muted};
`;

const ConfirmDialogActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 12px;
  margin-top: 8px;
`;

/** 눈에는 보이지 않지만 읽어 주는 글자. */
export const SrOnly = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
`;

/* 왼쪽에서 오른쪽으로 한 번 훑고 지나가는 빛. */
const sweep = keyframes`
  from {
    background-position: 100% 0;
  }
  to {
    background-position: -100% 0;
  }
`;

/**
 * 아직 오지 않은 내용이 앉을 자리.
 *
 * "불러오는 중"이라고 한 줄 적는 대신, 들어올 것과 같은 크기의 회색 덩이를
 * 미리 놓습니다. 내용이 도착해도 자리가 그대로라 화면이 튀지 않고, 무엇이
 * 오는 중인지도 모양으로 보입니다. gray/200 위를 흰 빛이 훑고 지나가 멈춘
 * 화면이 아님을 알립니다 — 움직임을 줄여 달라고 한 기기에서는 덩이만 둡니다.
 */
export const Skeleton = styled.span<{ width?: string; height?: string; radius?: string }>`
  display: block;
  flex: none;
  width: ${({ width = "100%" }) => width};
  height: ${({ height = "16px" }) => height};
  border-radius: ${({ radius }) => radius ?? theme.radius.sm};
  background-color: ${palette.gray200};
  /* 양 끝은 투명한 흰색입니다. 그냥 transparent로 두면 회색 테가 생기는 브라우저가 있습니다. */
  background-image: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0) 0%,
    rgba(255, 255, 255, 0.7) 50%,
    rgba(255, 255, 255, 0) 100%
  );
  background-size: 200% 100%;
  background-repeat: no-repeat;
  animation: ${sweep} 1.3s linear infinite;
  @media (prefers-reduced-motion: reduce) {
    background-image: none;
    animation: none;
  }
`;

/* 끝에 닿으면 반대편에서 다시 들어오는 토막. 얼마나 남았는지는 알 수 없으니 길이로 말하지 않습니다. */
const slide = keyframes`
  from {
    transform: translateX(-100%);
  }
  to {
    transform: translateX(400%);
  }
`;

/**
 * 화면 맨 위에 걸리는 진행 줄.
 *
 * 저장·삭제 같은 쓰기가 끝나도 목록은 뒤에서 다시 받아 옵니다(`useDetachedInvalidate`).
 * 그 사이 화면은 옛 값을 들고 멈춰 있는 것처럼 보이므로, 아직 오가는 중임을
 * 여기서 한 줄로 알립니다. 어느 화면에서 무엇을 저장하든 자리가 같아 눈이
 * 찾아갈 곳이 하나입니다.
 *
 * 늘 자리에 두고 투명도만 바꿉니다. 짧게 끝나는 요청에 줄이 깜빡이지 않도록
 * 사라질 때만 조금 늦게 걷습니다.
 */
export const BusyBar = ({ busy, label = "처리 중" }: { busy: boolean; label?: string }) => (
  <BusyTrack busy={busy} role="status" aria-hidden={!busy}>
    {busy ? <SrOnly>{label}</SrOnly> : null}
    <i aria-hidden />
  </BusyTrack>
);
const BusyTrack = styled.div<{ busy: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  /* 모달(100)보다 위입니다 — 시트 안에서 저장할 때도 보여야 합니다. */
  z-index: 120;
  height: 3px;
  overflow: hidden;
  pointer-events: none;
  background: ${palette.gray200};
  opacity: ${({ busy }) => (busy ? 1 : 0)};
  transition: opacity 0.2s ease ${({ busy }) => (busy ? "0s" : "0.18s")};
  > i {
    display: block;
    width: 25%;
    height: 100%;
    background: ${theme.colors.ink};
    animation: ${slide} 1.1s ease-in-out infinite;
  }
  @media (prefers-reduced-motion: reduce) {
    > i {
      width: 100%;
      animation: none;
      opacity: 0.35;
    }
  }
`;
