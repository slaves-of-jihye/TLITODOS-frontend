import styled from "@emotion/styled";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";
import { CATEGORY_PRESETS, splitTodoContent, type CategoryTone } from "@tlitodos/core";
import type { GroupMember, Todo } from "@tlitodos/types";
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

export const Button = styled.button<{ variant?: "primary" | "soft" | "dark" | "ghost" | "danger" }>`
  border: 0;
  border-radius: ${theme.radius.pill};
  padding: 12px 20px;
  font-weight: 700;
  background: ${({ variant = "soft" }) =>
    variant === "primary"
      ? "#dff6ad"
      : variant === "dark"
        ? theme.colors.selected
        : variant === "ghost"
          ? "transparent"
          : variant === "danger"
            ? "#fff0f3"
            : theme.colors.panel};
  color: ${({ variant = "soft" }) =>
    variant === "dark" ? "white" : variant === "danger" ? theme.colors.red : theme.colors.ink};
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
  font-family: ${uiGlyphFont};
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

/**
 * 할 일 개수를 사분면 점으로 보여주는 표식.
 *
 * Figma의 `day/status5`입니다. 30px 안에 20px 원 네 개를 10px씩 어긋나게 겹쳐
 * 두고, 채워지지 않은 칸은 회색으로 남깁니다. 네 개를 넘으면 개수를 숫자로
 * 얹고, 그 날/그 할 일이 모두 끝났으면 가운데에 체크를 올립니다.
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
  <Cluster style={{ width: size, height: size }}>
    {[0, 1, 2, 3].map(index => (
      <Quadrant key={index} data-slot={index} style={{ background: fills[index] ?? palette.gray200 }} />
    ))}
    {checked ? <ClusterCheck src={icons.check} alt="" aria-hidden /> : null}
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
const ClusterCheck = styled.img`
  position: absolute;
  left: 50%;
  top: 50%;
  width: 40%;
  height: 40%;
  transform: translate(-50%, -50%);
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
  const hasAddAction = own && Boolean(onAdd);
  return (
    <Pill
      accent={preset.strong}
      hasAddAction={hasAddAction}
      onClick={own && !preset.locked ? onManage : undefined}
      role={own && !preset.locked ? "button" : undefined}
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
  // 완료하면 사분면이 카테고리 색으로 차고 체크가 올라갑니다.
  const fills = todo.isCompleted ? Array<string>(4).fill(preset.strong) : [null, null, null, null];
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
      {member.bio?.trim() ? <small>{member.bio}</small> : null}
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
}) => {
  // 점 색은 카테고리 색 그대로입니다. 80% 불투명도는 사분면 자체에 걸려 있고,
  // 완료 여부는 색이 아니라 가운데 체크로 나타냅니다.
  const fills = tones
    .slice(0, 4)
    .map(tone => (CATEGORY_PRESETS.find(item => item.key === tone) ?? CATEGORY_PRESETS[0]).strong);
  const allDone = tones.length > 0 && tones.every(tone => completed.includes(tone));
  return (
    <DayButton onClick={onClick}>
      <StatusCluster fills={fills} checked={allDone} count={tones.length > 4 ? tones.length : undefined} />
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
