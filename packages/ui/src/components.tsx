import styled from "@emotion/styled";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";
import { CATEGORY_PRESETS, categoryToneAt, type CategoryTone } from "@tlitodos/core";
import type { GroupMember, Todo } from "@tlitodos/types";
import { theme } from "./theme";

export const AppShell = styled.div`
  width: min(1280px, 100%); min-height: 100vh; margin: 0 auto; padding: 76px 7% 116px; position: relative; background: white;
  @media (max-width: 800px) { padding: 28px 22px 100px; }
`;

export const Button = styled.button<{ variant?: "primary" | "soft" | "dark" | "ghost" }>`
  border: 0; border-radius: ${theme.radius.pill}; padding: 12px 20px; font-weight: 700;
  background: ${({ variant = "soft" }) => variant === "primary" ? "#dff6ad" : variant === "dark" ? theme.colors.selected : variant === "ghost" ? "transparent" : theme.colors.panel};
  color: ${({ variant = "soft" }) => variant === "dark" ? "white" : theme.colors.ink};
  transition: transform .16s ease, background .16s ease;
  &:hover { transform: translateY(-1px); }
  &:disabled { opacity: .45; cursor: not-allowed; transform: none; }
`;

export const IconButton = styled.button`
  width: 40px; height: 40px; display: grid; place-items: center; border: 0; border-radius: 50%; background: ${theme.colors.panel}; font-size: 22px;
`;

export const HeaderRow = styled.header`
  display: flex; align-items: center; gap: 14px; flex-wrap: wrap; margin-bottom: 54px;
`;

export const ViewChip = ({ active, avatar, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean; avatar?: string | null }) => (
  <ViewChipButton active={Boolean(active)} {...props}>{avatar ? <Avatar src={avatar} alt="" /> : <AvatarFallback>🌱</AvatarFallback>}<span>{children}</span></ViewChipButton>
);
const ViewChipButton = styled.button<{ active: boolean }>`
  display: inline-flex; align-items: center; gap: 8px; border: 0; padding: 5px 15px 5px 5px; border-radius: ${theme.radius.pill}; font-weight: 700;
  background: ${({ active }) => active ? theme.colors.selected : "#f0f3f7"}; color: ${({ active }) => active ? "white" : theme.colors.ink};
`;
const Avatar = styled.img`width: 38px; height: 38px; border-radius: 50%; object-fit: cover; background: white;`;
const AvatarFallback = styled.span`width: 38px; height: 38px; display:grid; place-items:center; border-radius:50%; background:white;`;

export const CategoryPill = ({ name, tone, own, onAdd, onManage }: { name: string; tone: CategoryTone; own: boolean; onAdd?: () => void; onManage?: () => void }) => {
  const preset = CATEGORY_PRESETS.find((item) => item.key === tone) ?? CATEGORY_PRESETS[0];
  return <Pill background={preset.background} onClick={own && !preset.locked ? onManage : undefined} role={own && !preset.locked ? "button" : undefined}>
    <span>{name}</span>{own && onAdd ? <PlusButton aria-label={`${name} 할 일 추가`} background={preset.color} onClick={(event) => { event.stopPropagation(); onAdd(); }}>+</PlusButton> : null}
  </Pill>;
};
const Pill = styled.div<{ background: string }>`display:inline-flex; align-items:center; gap:11px; min-height:40px; padding:5px 7px 5px 22px; border-radius:${theme.radius.pill}; background:${({background}) => background}; font-weight:700;`;
const PlusButton = styled.button<{ background: string }>`width:28px; height:28px; border:0; border-radius:50%; background:${({background})=>background}; color:white; font-size:22px; line-height:1;`;

export const TodoRow = ({ todo, tone, own, onToggle, onEdit }: { todo: Todo; tone: CategoryTone; own: boolean; onToggle?: () => void; onEdit?: () => void }) => {
  const preset = CATEGORY_PRESETS.find((item) => item.key === tone) ?? CATEGORY_PRESETS[0];
  const detail = todo.subtasks.map((item) => item.content).join(" · ");
  return <TodoItem>
    <CheckButton aria-label={todo.isCompleted ? "완료됨" : "완료하기"} disabled={!own} done={todo.isCompleted} color={preset.color} onClick={onToggle}>{todo.isCompleted ? "✓" : ""}</CheckButton>
    <TodoTextButton disabled={!own} onClick={onEdit}><strong>{todo.title}</strong>{detail ? <small>{detail}</small> : null}</TodoTextButton>
    {!own && !todo.isCompleted ? <BetOverlay type="button" disabled title="내기 기능은 MVP 이후 제공됩니다.">내기 요청하기</BetOverlay> : null}
  </TodoItem>;
};
const TodoItem = styled.div`position:relative; display:flex; align-items:flex-start; gap:14px; min-height:48px; padding:4px 0; &:hover > button:last-child:not(:disabled){opacity:1;}`;
const CheckButton = styled.button<{done:boolean;color:string}>`display:grid; place-items:center; flex:0 0 24px; width:24px; height:24px; margin-top:2px; border-radius:50%; border:2px solid ${({color})=>color}; background:${({done,color})=>done?color:"transparent"}; color:white; font-weight:800; &:disabled{cursor:default;}`;
const TodoTextButton = styled.button`min-width:0; flex:1; border:0; background:transparent; text-align:left; padding:0; color:${theme.colors.ink}; strong,small{display:block;} strong{font-size:15px;} small{margin-top:7px;color:${theme.colors.muted};font-size:12px;} &:disabled{cursor:default;}`;
const BetOverlay = styled.button`position:absolute; inset:0; border:0; border-radius:10px; background:rgba(255,255,255,.86); color:${theme.colors.ink}; font-weight:800; opacity:0; transition:opacity .18s; &:disabled{cursor:not-allowed;}`;

export const Selection = ({ label, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: ReactNode }) => <RadioLabel><input type="radio" {...props}/><span>{label}</span></RadioLabel>;
export const Option = Selection;
const RadioLabel = styled.label`display:inline-flex; align-items:center; gap:8px; cursor:pointer; input{position:absolute;opacity:0;} span{padding:8px 13px;border:1px solid ${theme.colors.line};border-radius:${theme.radius.pill};background:#f8f9fb;} input:checked + span{background:#effad9;border-color:#d2eb9e;}`;

export const ProfileCard = ({ member, onClick }: { member: GroupMember; onClick?: () => void }) => <ProfileButton onClick={onClick}>
  {member.profileImageUrl ? <ProfileImage src={member.profileImageUrl} alt=""/> : <ProfileAvatar>🐰</ProfileAvatar>}
  <span><strong>{member.name}</strong><small>{member.bio || `${member.userId} ${member.name}`}</small></span>
</ProfileButton>;
const ProfileButton = styled.button`display:flex;align-items:center;gap:18px;width:100%;padding:12px;border:0;border-radius:12px;background:white;text-align:left;transition:background .15s;&:hover{background:#f6f8fa;}strong,small{display:block;}strong{font-size:20px;}small{color:${theme.colors.muted};margin-top:7px;}`;
const ProfileImage = styled.img`width:62px;height:62px;border-radius:50%;object-fit:cover;`;
const ProfileAvatar = styled.span`width:62px;height:62px;border-radius:50%;display:grid;place-items:center;background:#fff3f7;font-size:33px;`;

export const DiaryBadge = ({ emotion, nickname, date, onClick }: { emotion?: string | null; nickname: string; date: string; onClick?: () => void }) => <DiaryButton onClick={onClick}>{emotion ? <span>{emotion}</span> : null}<strong>{nickname}</strong><small>{date}</small></DiaryButton>;
const DiaryButton = styled.button`display:flex;align-items:center;gap:8px;border:0;border-radius:${theme.radius.pill};padding:9px 14px;background:#f7f9fb;strong{font-size:13px;}small{color:${theme.colors.muted};font-size:11px;}`;

export const DayStash = ({ tones, completed, selected, today, date, onClick }: { tones: CategoryTone[]; completed: CategoryTone[]; selected?: boolean; today?: boolean; date: number; onClick?: () => void }) => <DayButton onClick={onClick} selected={Boolean(selected)} today={Boolean(today)}>
  <Stashes>{tones.length ? tones.slice(0,4).map((tone,index)=>{const p=CATEGORY_PRESETS.find(x=>x.key===tone) ?? CATEGORY_PRESETS[0]; return <Dot key={`${tone}-${index}`} style={{background:completed.includes(tone)?p.strong:p.background}}/>;}) : <EmptyDot/>}</Stashes>
  <DateLabel selected={Boolean(selected)}>{String(date).padStart(2,"0")}</DateLabel>
</DayButton>;
const DayButton = styled.button<{selected:boolean;today:boolean}>`width:54px;height:68px;border:0;background:transparent;display:flex;flex-direction:column;align-items:center;gap:5px;padding:0;color:${({today})=>today?theme.colors.blue:theme.colors.ink};`;
const Stashes = styled.span`height:36px;width:36px;display:grid;grid-template-columns:repeat(2,1fr);grid-template-rows:repeat(2,1fr);place-items:center;`;
const Dot = styled.i`display:block;width:18px;height:18px;border-radius:50%;margin:-2px;`;
const EmptyDot = styled.i`display:block;width:20px;height:20px;border:2px solid #d7dde3;border-radius:50%;grid-area:1/1/3/3;`;
const DateLabel = styled.span<{selected:boolean}>`min-width:28px;height:28px;display:grid;place-items:center;border-radius:50%;background:${({selected})=>selected?'#e2e5e8':'transparent'};`;

export const BottomNav = ({ active, onNavigate }: { active: "home"|"alarm"|"profile"; onNavigate: (next:"home"|"alarm"|"profile")=>void }) => <Nav>
  {([['home','⌂'],['alarm','♟'],['profile','●']] as const).map(([key,icon])=><NavButton key={key} active={active===key} onClick={()=>onNavigate(key)} aria-label={key}>{icon}</NavButton>)}
</Nav>;
const Nav = styled.nav`position:absolute;left:0;right:0;bottom:0;height:100px;display:flex;justify-content:center;gap:110px;align-items:center;background:white;@media(max-width:600px){position:fixed;gap:72px;box-shadow:0 -8px 24px rgba(0,0,0,.05);}`;
const NavButton = styled.button<{active:boolean}>`border:0;background:transparent;color:${({active})=>active?theme.colors.ink:"#c6d0df"};font-size:34px;line-height:1;`;

export const Modal = ({ open, title, children, onClose, nested=false, login=false }: { open:boolean; title?:string; children:ReactNode; onClose?:()=>void; nested?:boolean; login?:boolean }) => open ? <Overlay login={login} onMouseDown={(event)=>{if(event.target===event.currentTarget&&!nested)onClose?.();}}><Dialog role="dialog" aria-modal="true" aria-label={title}>{title?<h2>{title}</h2>:null}{children}</Dialog></Overlay> : null;
const Overlay = styled.div<{login:boolean}>`position:fixed;inset:0;z-index:100;display:grid;place-items:center;padding:22px;background:${({login})=>login?theme.colors.loginOverlay:theme.colors.overlay};`;
const Dialog = styled.div`width:min(800px,100%);max-height:calc(100vh - 44px);overflow:auto;border-radius:${theme.radius.lg};background:white;padding:54px 60px;box-shadow:${theme.shadow};h2{margin:0 0 30px;}@media(max-width:600px){padding:32px 24px;border-radius:26px;}`;

export const Field = styled.label`display:grid;gap:9px;font-weight:700;input,textarea,select{width:100%;border:1px solid transparent;border-radius:10px;background:#f7f9fb;padding:14px 16px;color:${theme.colors.ink};}textarea{min-height:96px;resize:vertical;}small{justify-self:end;color:${theme.colors.muted};font-weight:500;}`;
export const FormGrid = styled.div`display:grid;grid-template-columns:1fr 1fr;gap:28px 60px;@media(max-width:700px){grid-template-columns:1fr;}`;
export const ButtonStack = styled.div`display:grid;gap:10px;margin-top:28px;`;
export const ErrorText = styled.p`color:${theme.colors.red};font-size:13px;margin:12px 0;`;
export const toneForCategoryIndex = (index:number) => categoryToneAt(index);
