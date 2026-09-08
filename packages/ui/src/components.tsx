import styled from "@emotion/styled";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { splitTodoContent } from "@tlitodos/core";
import type { Todo } from "@tlitodos/types";
import { icons } from "./icons";
import { palette, theme, uiGlyphFont } from "./theme";

/** 아이콘으로 쓰는 문장부호를 감쌉니다. 이유는 `uiGlyphFont` 주석에 있습니다. */
export const Glyph = styled.span`
  font-family: ${uiGlyphFont};
`;

export const AppShell = styled.div`
  width: min(1280px, 100%);
  min-height: 100vh;
  min-height: 100dvh;
  margin: 0 auto;
  padding: 76px 7% 116px;
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
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
  margin-bottom: 54px;
  @media (max-width: 800px) {
    flex-wrap: nowrap;
    gap: 10px;
    margin: 0 -18px 34px;
    padding: 0 18px 10px;
    overflow-x: auto;
    overscroll-behavior-inline: contain;
    scrollbar-width: none;
    &::-webkit-scrollbar {
      display: none;
    }
    > * {
      flex: 0 0 auto;
    }
  }
`;

export const ViewChip = ({
  active,
  avatar,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean; avatar?: string | null }) => (
  <ViewChipButton active={Boolean(active)} {...props}>
    {avatar ? <Avatar src={avatar} alt="" /> : <AvatarFallback>🌱</AvatarFallback>}
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
}) => {
  /**
   * 가운데 글자는 사분면 네 칸이 다 찼을 때만 흰색입니다.
   *
   * 빈 칸은 gray/200이라 그 위에 흰 글자를 얹으면 읽히지 않습니다. 한 칸이라도
   * 비어 있으면 검은색으로 씁니다.
   */
  const onFilled = [0, 1, 2, 3].every(index => fills[index]);
  return (
    <Cluster style={{ width: size, height: size }}>
      {[0, 1, 2, 3].map(index => (
        <Quadrant key={index} data-slot={index} style={{ background: fills[index] ?? palette.gray200 }} />
      ))}
      {checked ? <ClusterCheck onFilled={onFilled} aria-hidden /> : null}
      {!checked && count ? <ClusterCount onFilled={onFilled}>{count}</ClusterCount> : null}
    </Cluster>
  );
};
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
const ClusterCheck = styled.span<{ onFilled: boolean }>`
  position: absolute;
  left: 50%;
  top: 50%;
  width: 40%;
  height: 40%;
  transform: translate(-50%, -50%);
  background: ${({ onFilled }) => (onFilled ? palette.white : palette.black)};
  -webkit-mask: url(${icons.check}) center / contain no-repeat;
  mask: url(${icons.check}) center / contain no-repeat;
`;
const ClusterCount = styled.span<{ onFilled: boolean }>`
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  color: ${({ onFilled }) => (onFilled ? palette.white : palette.black)};
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
    <Pill accent={accent} hasAddAction={hasAddAction} onClick={onManage} role={onManage ? "button" : undefined}>
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
const Pill = styled.div<{ accent: string; hasAddAction: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 16px;
  max-width: 100%;
  padding: ${({ hasAddAction }) => (hasAddAction ? "6px 8px 6px 28px" : "6px 28px")};
  border-radius: ${theme.radius.pill};
  background: ${palette.gray200};
  color: ${({ accent }) => accent};
  font-size: 18px;
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
  onToggle,
  onEdit,
}: {
  todo: Todo;
  accent: string;
  own: boolean;
  onToggle?: () => void;
  onEdit?: () => void;
}) => {
  const content = splitTodoContent(todo.title);
  const detail = content.detail || todo.subtasks.map(item => item.content).join(" · ");
  // 완료하면 사분면이 카테고리 색으로 차고 체크가 올라갑니다.
  const fills = todo.isCompleted ? Array<string>(4).fill(accent) : [null, null, null, null];
  return (
    <TodoItem>
      <CheckButton aria-label={todo.isCompleted ? "완료됨" : "완료하기"} disabled={!own} onClick={onToggle}>
        <StatusCluster fills={fills} checked={todo.isCompleted} />
      </CheckButton>
      <TodoTextButton disabled={!own} onClick={onEdit}>
        <strong>{content.title}</strong>
        {detail ? <small>{detail}</small> : null}
      </TodoTextButton>
      {!own && !todo.isCompleted ? (
        <BetOverlay type="button" disabled title="내기 기능은 MVP 이후 제공됩니다.">
          내기 요청하기
        </BetOverlay>
      ) : null}
    </TodoItem>
  );
};
const TodoItem = styled.div`
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 6px 8px;
  border-radius: ${theme.radius.sm};
  &:hover > button:last-child:not(:disabled) {
    opacity: 1;
  }
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
const BetOverlay = styled.button`
  position: absolute;
  inset: 0;
  border: 0;
  border-radius: ${theme.radius.sm};
  background: rgba(255, 255, 255, 0.86);
  color: ${theme.colors.ink};
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
  date: string;
  onClick?: () => void;
}) => (
  <DiaryButton onClick={onClick}>
    <span aria-hidden>{emotion || "😀"}</span>
    <strong>{nickname}</strong>
    <small>{date}</small>
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
  selected,
  today,
  date,
  onClick,
}: {
  /** 그 날 할 일이 있는 카테고리별 강조색과 완료 여부입니다. */
  marks: { accent: string; done: boolean }[];
  /** 그 날 남은 할 일 수. 0이면 숫자 대신 체크를 올립니다. */
  incompleteCount: number;
  selected?: boolean;
  today?: boolean;
  date: number;
  onClick?: () => void;
}) => {
  // 점 색은 카테고리 색 그대로입니다. 80% 불투명도는 사분면 자체에 걸려 있습니다.
  const fills = marks.slice(0, 4).map(mark => mark.accent);
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
  onNavigate,
}: {
  active: "home" | "alarm" | "profile";
  onNavigate: (next: "home" | "alarm" | "profile") => void;
}) => (
  <Nav>
    {(
      [
        ["home", icons.home, "홈"],
        ["alarm", icons.bell, "알림"],
        ["profile", icons.profile, "프로필"],
      ] as const
    ).map(([key, src, label]) => (
      <NavButton key={key} active={active === key} onClick={() => onNavigate(key)} aria-label={label}>
        <img src={src} alt="" aria-hidden />
      </NavButton>
    ))}
  </Nav>
);
const Nav = styled.nav`
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: ${theme.layout.nav};
  display: flex;
  justify-content: center;
  gap: 140px;
  align-items: center;
  background: ${palette.white};
  @media (max-width: 600px) {
    position: fixed;
    z-index: 60;
    height: calc(72px + env(safe-area-inset-bottom));
    padding: 0 max(18px, env(safe-area-inset-left)) env(safe-area-inset-bottom) max(18px, env(safe-area-inset-right));
    justify-content: space-around;
    gap: 0;
    box-shadow: 0 -8px 24px rgba(0, 0, 0, 0.05);
  }
`;
const NavButton = styled.button<{ active: boolean }>`
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border: 0;
  border-radius: 50%;
  background: transparent;
  /* 아이콘 색이 파일에 박혀 있어, 선택 여부는 불투명도로 나타냅니다. */
  opacity: ${({ active }) => (active ? 1 : 0.3)};
  transition: opacity 0.16s ease;
  img {
    width: 32px;
    height: 32px;
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
}: {
  open: boolean;
  title?: string;
  children: ReactNode;
  onClose?: () => void;
  nested?: boolean;
  login?: boolean;
  /** 디자인의 상세 시트처럼 넓은 화면에서도 아래에 붙는 형태입니다. */
  sheet?: boolean;
}) =>
  open ? (
    <Overlay
      login={login}
      sheet={sheet}
      onMouseDown={event => {
        if (event.target === event.currentTarget && !nested) onClose?.();
      }}
    >
      <Dialog login={login} sheet={sheet} role="dialog" aria-modal="true" aria-label={title}>
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
const Dialog = styled.div<{ login: boolean; sheet: boolean }>`
  width: min(800px, 100%);
  max-height: calc(100vh - 44px);
  overflow: auto;
  border-radius: ${({ sheet }) => (sheet ? "40px 40px 0 0" : theme.radius.lg)};
  background: white;
  padding: ${({ sheet }) => (sheet ? "60px" : "54px 60px")};
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
