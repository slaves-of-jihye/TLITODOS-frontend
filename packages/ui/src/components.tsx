import styled from "@emotion/styled";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";
import { CATEGORY_PRESETS, splitTodoContent, type CategoryTone } from "@tlitodos/core";
import type { GroupMember, Todo } from "@tlitodos/types";
import { theme } from "./theme";

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

export const Button = styled.button<{ variant?: "primary" | "soft" | "dark" | "ghost" }>`
  border: 0;
  border-radius: ${theme.radius.pill};
  padding: 12px 20px;
  font-weight: 700;
  background: ${({ variant = "soft" }) => (variant === "primary" ? "#dff6ad" : variant === "dark" ? theme.colors.selected : variant === "ghost" ? "transparent" : theme.colors.panel)};
  color: ${({ variant = "soft" }) => (variant === "dark" ? "white" : theme.colors.ink)};
  transition:
    transform 0.16s ease,
    background 0.16s ease;
  &:hover {
    transform: translateY(-1px);
  }
  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
    transform: none;
  }
  @media (max-width: 600px) {
    min-height: 44px;
    padding: 11px 16px;
  }
`;

export const IconButton = styled.button`
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  border: 0;
  border-radius: 50%;
  background: ${theme.colors.panel};
  font-size: 22px;
  @media (max-width: 600px) {
    width: 44px;
    height: 44px;
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
  padding: 5px 15px 5px 5px;
  border-radius: ${theme.radius.pill};
  font-weight: 700;
  background: ${({ active }) => (active ? theme.colors.selected : "#f0f3f7")};
  color: ${({ active }) => (active ? "white" : theme.colors.ink)};
  white-space: nowrap;
  @media (max-width: 600px) {
    min-height: 44px;
  }
`;
const Avatar = styled.img`
  width: 38px;
  height: 38px;
  border-radius: 50%;
  object-fit: cover;
  background: white;
`;
const AvatarFallback = styled.span`
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: white;
`;

export const CategoryPill = ({
  name,
  tone,
  own,
  onAdd,
  onManage,
}: {
  name: string;
  tone: CategoryTone;
  own: boolean;
  onAdd?: () => void;
  onManage?: () => void;
}) => {
  const preset = CATEGORY_PRESETS.find(item => item.key === tone) ?? CATEGORY_PRESETS[0];
  return (
    <Pill
      background={preset.background}
      onClick={own && !preset.locked ? onManage : undefined}
      role={own && !preset.locked ? "button" : undefined}
    >
      <span>{name}</span>
      {own && onAdd ? (
        <PlusButton
          aria-label={`${name} 할 일 추가`}
          background={preset.color}
          onClick={event => {
            event.stopPropagation();
            onAdd();
          }}
        >
          +
        </PlusButton>
      ) : null}
    </Pill>
  );
};
const Pill = styled.div<{ background: string }>`
  display: inline-flex;
  align-items: center;
  gap: 11px;
  min-height: 40px;
  padding: 5px 7px 5px 22px;
  border-radius: ${theme.radius.pill};
  background: ${({ background }) => background};
  font-weight: 700;
  @media (max-width: 600px) {
    width: 100%;
    min-height: 46px;
    justify-content: space-between;
    padding-left: 18px;
  }
`;
const PlusButton = styled.button<{ background: string }>`
  width: 28px;
  height: 28px;
  border: 0;
  border-radius: 50%;
  background: ${({ background }) => background};
  color: white;
  font-size: 22px;
  line-height: 1;
  @media (max-width: 600px) {
    width: 34px;
    height: 34px;
  }
`;

export const TodoRow = ({
  todo,
  tone,
  own,
  onToggle,
  onEdit,
}: {
  todo: Todo;
  tone: CategoryTone;
  own: boolean;
  onToggle?: () => void;
  onEdit?: () => void;
}) => {
  const preset = CATEGORY_PRESETS.find(item => item.key === tone) ?? CATEGORY_PRESETS[0];
  const content = splitTodoContent(todo.title);
  const detail = content.detail || todo.subtasks.map(item => item.content).join(" · ");
  return (
    <TodoItem>
      <CheckButton
        aria-label={todo.isCompleted ? "완료됨" : "완료하기"}
        disabled={!own}
        done={todo.isCompleted}
        color={preset.color}
        onClick={onToggle}
      >
        {todo.isCompleted ? "✓" : ""}
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
  gap: 14px;
  min-height: 48px;
  padding: 4px 0;
  &:hover > button:last-child:not(:disabled) {
    opacity: 1;
  }
  @media (max-width: 600px) {
    min-height: 56px;
    gap: 12px;
    padding: 6px 2px;
  }
`;
const CheckButton = styled.button<{ done: boolean; color: string }>`
  display: grid;
  place-items: center;
  flex: 0 0 24px;
  width: 24px;
  height: 24px;
  margin-top: 2px;
  border-radius: 50%;
  border: 2px solid ${({ color }) => color};
  background: ${({ done, color }) => (done ? color : "transparent")};
  color: white;
  font-weight: 800;
  &:disabled {
    cursor: default;
  }
  @media (max-width: 600px) {
    flex-basis: 28px;
    width: 28px;
    height: 28px;
  }
`;
const TodoTextButton = styled.button`
  min-width: 0;
  flex: 1;
  border: 0;
  background: transparent;
  text-align: left;
  padding: 0;
  color: ${theme.colors.ink};
  strong,
  small {
    display: block;
  }
  strong {
    font-size: 15px;
    overflow-wrap: anywhere;
  }
  small {
    margin-top: 7px;
    color: ${theme.colors.muted};
    font-size: 12px;
  }
  &:disabled {
    cursor: default;
  }
`;
const BetOverlay = styled.button`
  position: absolute;
  inset: 0;
  border: 0;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.86);
  color: ${theme.colors.ink};
  font-weight: 800;
  opacity: 0;
  transition: opacity 0.18s;
  &:disabled {
    cursor: not-allowed;
  }
`;

export const Selection = ({ label, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: ReactNode }) => (
  <RadioLabel>
    <input type="radio" {...props} />
    <span>{label}</span>
  </RadioLabel>
);
export const Option = Selection;
const RadioLabel = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  input {
    position: absolute;
    opacity: 0;
  }
  span {
    padding: 8px 13px;
    border: 1px solid ${theme.colors.line};
    border-radius: ${theme.radius.pill};
    background: #f8f9fb;
  }
  input:checked + span {
    background: #effad9;
    border-color: #d2eb9e;
  }
  @media (max-width: 600px) {
    span {
      min-height: 42px;
      display: inline-flex;
      align-items: center;
      padding: 9px 13px;
    }
  }
`;

export const ProfileCard = ({ member, onClick }: { member: GroupMember; onClick?: () => void }) => (
  <ProfileButton onClick={onClick}>
    {member.profileImageUrl ? <ProfileImage src={member.profileImageUrl} alt="" /> : <ProfileAvatar>🐰</ProfileAvatar>}
    <span>
      <strong>{member.name}</strong>
      <small>{member.bio || `${member.userId} ${member.name}`}</small>
    </span>
  </ProfileButton>
);
const ProfileButton = styled.button`
  display: flex;
  align-items: center;
  gap: 18px;
  width: 100%;
  padding: 12px;
  border: 0;
  border-radius: 12px;
  background: white;
  text-align: left;
  transition: background 0.15s;
  &:hover {
    background: #f6f8fa;
  }
  strong,
  small {
    display: block;
  }
  strong {
    font-size: 20px;
  }
  small {
    color: ${theme.colors.muted};
    margin-top: 7px;
  }
  @media (max-width: 600px) {
    gap: 14px;
    min-height: 76px;
    padding: 10px 8px;
    strong {
      font-size: 18px;
    }
  }
`;
const ProfileImage = styled.img`
  width: 62px;
  height: 62px;
  border-radius: 50%;
  object-fit: cover;
`;
const ProfileAvatar = styled.span`
  width: 62px;
  height: 62px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: #fff3f7;
  font-size: 33px;
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
    {emotion ? <span>{emotion}</span> : null}
    <strong>{nickname}</strong>
    <small>{date}</small>
  </DiaryButton>
);
const DiaryButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  border: 0;
  border-radius: ${theme.radius.pill};
  padding: 9px 14px;
  background: #f7f9fb;
  strong {
    font-size: 13px;
  }
  small {
    color: ${theme.colors.muted};
    font-size: 11px;
  }
  @media (max-width: 600px) {
    min-height: 42px;
    max-width: 100%;
  }
`;

export const DayStash = ({
  tones,
  completed,
  selected,
  today,
  date,
  onClick,
}: {
  tones: CategoryTone[];
  completed: CategoryTone[];
  selected?: boolean;
  today?: boolean;
  date: number;
  onClick?: () => void;
}) => (
  <DayButton onClick={onClick} selected={Boolean(selected)} today={Boolean(today)}>
    <Stashes data-count={tones.length}>
      {tones.length ? (
        tones.slice(0, 4).map((tone, index) => {
          const p = CATEGORY_PRESETS.find(x => x.key === tone) ?? CATEGORY_PRESETS[0];
          return <Dot key={`${tone}-${index}`} style={{ background: completed.includes(tone) ? p.strong : p.stash }} />;
        })
      ) : (
        <EmptyDot />
      )}
    </Stashes>
    <DateLabel selected={Boolean(selected)} today={Boolean(today)}>
      {String(date).padStart(2, "0")}
    </DateLabel>
  </DayButton>
);
const DayButton = styled.button<{ selected: boolean; today: boolean }>`
  width: 54px;
  height: 68px;
  border: 0;
  background: transparent;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  padding: 0;
  color: ${({ today }) => (today ? theme.colors.blue : theme.colors.ink)};
  @media (max-width: 600px) {
    width: 40px;
    height: 64px;
  }
`;
const Stashes = styled.span`
  height: 36px;
  width: 36px;
  position: relative;
  display: block;
  i {
    position: absolute;
  }
  &[data-count="1"] i {
    left: 9px;
    top: 9px;
  }
  &[data-count="2"] i:nth-of-type(1) {
    left: 3px;
    top: 9px;
  }
  &[data-count="2"] i:nth-of-type(2) {
    left: 15px;
    top: 9px;
  }
  &[data-count="3"] i:nth-of-type(1) {
    left: 9px;
    top: 1px;
  }
  &[data-count="3"] i:nth-of-type(2) {
    left: 2px;
    top: 15px;
  }
  &[data-count="3"] i:nth-of-type(3) {
    left: 16px;
    top: 15px;
  }
  &[data-count="4"] i:nth-of-type(1) {
    left: 2px;
    top: 2px;
  }
  &[data-count="4"] i:nth-of-type(2) {
    left: 16px;
    top: 2px;
  }
  &[data-count="4"] i:nth-of-type(3) {
    left: 2px;
    top: 16px;
  }
  &[data-count="4"] i:nth-of-type(4) {
    left: 16px;
    top: 16px;
  }
`;
const Dot = styled.i`
  display: block;
  width: 18px;
  height: 18px;
  border-radius: 50%;
`;
const EmptyDot = styled.i`
  display: block;
  width: 20px;
  height: 20px;
  left: 8px;
  top: 8px;
  border: 2px solid #d7dde3;
  border-radius: 50%;
`;
const DateLabel = styled.span<{ selected: boolean; today: boolean }>`
  min-width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: ${({ selected, today }) => (today ? theme.colors.selected : selected ? "#e2e5e8" : "transparent")};
  color: ${({ today }) => (today ? "white" : "inherit")};
`;

export const BottomNav = ({
  active,
  onNavigate,
}: {
  active: "home" | "alarm" | "profile";
  onNavigate: (next: "home" | "alarm" | "profile") => void;
}) => (
  <Nav>
    <NavButton active={active === "home"} onClick={() => onNavigate("home")} aria-label="home">
      <svg viewBox="0 0 24 24">
        <path d="M3 11 12 3l9 8v9a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z" />
      </svg>
    </NavButton>
    <NavButton active={active === "alarm"} onClick={() => onNavigate("alarm")} aria-label="alarm">
      <svg viewBox="0 0 24 24">
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
      </svg>
    </NavButton>
    <NavButton active={active === "profile"} onClick={() => onNavigate("profile")} aria-label="profile">
      <svg viewBox="0 0 24 24">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </svg>
    </NavButton>
  </Nav>
);
const Nav = styled.nav`
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 100px;
  display: flex;
  justify-content: center;
  gap: 110px;
  align-items: center;
  background: white;
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
  border: 0;
  background: transparent;
  color: ${({ active }) => (active ? theme.colors.ink : "#c6d0df")};
  line-height: 1;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  svg {
    width: 30px;
    height: 30px;
    fill: ${({ active }) => (active ? "currentColor" : "none")};
    stroke: currentColor;
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
`;

export const Modal = ({
  open,
  title,
  children,
  onClose,
  nested = false,
  login = false,
}: {
  open: boolean;
  title?: string;
  children: ReactNode;
  onClose?: () => void;
  nested?: boolean;
  login?: boolean;
}) =>
  open ? (
    <Overlay
      login={login}
      onMouseDown={event => {
        if (event.target === event.currentTarget && !nested) onClose?.();
      }}
    >
      <Dialog login={login} role="dialog" aria-modal="true" aria-label={title}>
        {title ? <h2>{title}</h2> : null}
        {children}
      </Dialog>
    </Overlay>
  ) : null;
const Overlay = styled.div<{ login: boolean }>`
  position: fixed;
  inset: 0;
  z-index: 100;
  display: grid;
  place-items: center;
  padding: 22px;
  background: ${({ login }) => (login ? theme.colors.loginOverlay : theme.colors.overlay)};
  @media (max-width: 600px) {
    place-items: ${({ login }) => (login ? "center" : "end center")};
    padding: ${({ login }) => (login ? "16px" : "0")};
  }
`;
const Dialog = styled.div<{ login: boolean }>`
  width: min(800px, 100%);
  max-height: calc(100vh - 44px);
  overflow: auto;
  border-radius: ${theme.radius.lg};
  background: white;
  padding: 54px 60px;
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

export const Field = styled.label`
  display: grid;
  gap: 9px;
  font-weight: 700;
  input,
  textarea,
  select {
    width: 100%;
    border: 1px solid transparent;
    border-radius: 10px;
    background: #f7f9fb;
    padding: 14px 16px;
    color: ${theme.colors.ink};
  }
  textarea {
    min-height: 96px;
    resize: vertical;
  }
  small {
    justify-self: end;
    color: ${theme.colors.muted};
    font-weight: 500;
  }
`;
export const FormGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 28px 60px;
  @media (max-width: 700px) {
    grid-template-columns: 1fr;
  }
`;
export const ButtonStack = styled.div`
  display: grid;
  gap: 10px;
  margin-top: 28px;
`;
export const ErrorText = styled.p`
  color: ${theme.colors.red};
  font-size: 13px;
  margin: 12px 0;
`;
