/* 랜딩의 자리와 모양. 컴포넌트 파일과 갈라 둡니다 — 한 파일에 섞이면 Fast Refresh가 통째로 다시 불러옵니다. */
import styled from "@emotion/styled";
import { palette, theme } from "@/shared/ui";

/** 랜딩 본문의 가로 폭. 앱의 `AppShell`은 아래 네비 여백을 전제하므로 쓰지 않습니다. */
export const Container = styled.div`
  width: min(1120px, 100%);
  margin: 0 auto;
  padding: 0 24px;
  /* 한글은 글자 사이 어디서든 줄이 바뀌어 한 글자가 홀로 남습니다. 낱말 단위로 끊습니다. */
  word-break: keep-all;
  overflow-wrap: break-word;
  @media (max-width: 600px) {
    padding: 0 16px;
  }
`;

/* 붙는 줄은 배경이 불투명해야 아래 내용이 비쳐 보이지 않습니다. */
export const Header = styled.header`
  position: sticky;
  top: 0;
  z-index: 40;
  background: ${palette.white};
  border-bottom: 1px solid ${theme.colors.line};
`;

export const HeaderInner = styled(Container)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 64px;
`;

export const Brand = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: ${theme.colors.ink};
  font-size: ${theme.text.h3};
  text-decoration: none;
  img {
    width: 32px;
    height: 32px;
    border-radius: 8px;
  }
`;

export const Section = styled.section<{ tone?: "panel" }>`
  padding: 72px 0;
  background: ${({ tone }) => (tone === "panel" ? palette.gray100 : "transparent")};
  @media (max-width: 600px) {
    padding: 48px 0;
  }
`;

export const SectionTitle = styled.h2`
  margin: 0 0 12px;
  font-size: ${theme.text.h1};
  @media (max-width: 600px) {
    font-size: ${theme.text.h2};
  }
`;

export const SectionLead = styled.p`
  margin: 0 0 40px;
  color: ${theme.colors.muted};
  font-size: ${theme.text.s};
`;

export const Hero = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  align-items: center;
  gap: 40px;
  padding: 72px 0 56px;
  @media (min-width: 900px) {
    grid-template-columns: 1.05fr 1fr;
    gap: 56px;
  }
  @media (max-width: 600px) {
    padding: 40px 0 32px;
  }
`;

export const HeroTitle = styled.h1`
  margin: 0 0 16px;
  font-size: 40px;
  line-height: 1.3;
  @media (max-width: 600px) {
    font-size: ${theme.text.h1};
  }
`;

export const HeroLead = styled.p`
  margin: 0 0 28px;
  color: ${theme.colors.secondary};
  font-size: ${theme.text.h3};
  @media (max-width: 600px) {
    font-size: ${theme.text.s};
  }
`;

export const CtaRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
`;

/* 큰 시작 버튼. 검은 pill이 주 동작이라는 `Button`의 규칙을 그대로 따릅니다. */
export const StartMark = styled.span`
  font-family: Arial, sans-serif;
  font-size: 18px;
`;

export const Steps = styled.ol`
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
  margin: 0;
  padding: 0;
  list-style: none;
  /* 세 걸음이 두 줄로 쪼개져 하나만 남지 않도록, 한 줄에 셋 아니면 한 줄에 하나입니다. */
  @media (min-width: 700px) {
    grid-template-columns: repeat(3, 1fr);
  }
`;

export const Step = styled.li`
  display: grid;
  gap: 8px;
  padding: 24px;
  border: 1px solid ${theme.colors.line};
  border-radius: ${theme.radius.md};
  background: ${palette.white};
  h3 {
    margin: 0;
    font-size: ${theme.text.h3};
  }
  p {
    margin: 0;
    color: ${theme.colors.muted};
  }
`;

export const StepNumber = styled.span`
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: ${palette.black};
  color: ${palette.white};
  font-size: ${theme.text.s};
`;

export const FeatureGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 24px;
  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

export const FeatureCard = styled.article`
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-width: 0;
  padding: 28px;
  border: 1px solid ${theme.colors.line};
  border-radius: ${theme.radius.md};
  background: ${palette.white};
  h3 {
    margin: 0 0 6px;
    font-size: ${theme.text.h3};
  }
  p {
    margin: 0;
    color: ${theme.colors.muted};
  }
  @media (max-width: 600px) {
    padding: 20px;
  }
`;

/*
 * 실제 컴포넌트로 그린 미리보기. 눌리지 않아야 하고, 읽는 사람에게는 옆의 설명이
 * 같은 말을 하므로 접근성 트리에서도 뺍니다(`aria-hidden`은 쓰는 쪽에서 붙입니다).
 */
export const Preview = styled.div`
  pointer-events: none;
  user-select: none;
  min-width: 0;
  padding: 16px 12px;
  border-radius: ${theme.radius.sm};
  background: ${palette.gray100};
`;

export const HeroPreview = styled(Preview)`
  padding: 24px 20px;
  border: 1px solid ${theme.colors.line};
  border-radius: ${theme.radius.md};
  background: ${palette.white};
  box-shadow: ${theme.shadow};
`;

export const PreviewColumn = styled.div`
  display: grid;
  gap: 4px;
`;

export const ClusterRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  padding: 4px;
  span {
    display: grid;
    justify-items: center;
    gap: 4px;
    color: ${theme.colors.muted};
    font-size: ${theme.text.xs};
  }
`;

export const MemberChips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

export const MemberChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  border-radius: ${theme.radius.pill};
  background: ${palette.gray200};
  color: ${theme.colors.ink};
`;

export const FontChips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

export const FontChip = styled.span`
  padding: 4px 12px;
  border: 1px solid ${theme.colors.line};
  border-radius: ${theme.radius.pill};
  background: ${palette.white};
  font-size: ${theme.text.xs};
`;

export const FinalCta = styled.div`
  display: grid;
  justify-items: center;
  gap: 20px;
  text-align: center;
  h2 {
    margin: 0;
    font-size: ${theme.text.h1};
    @media (max-width: 600px) {
      font-size: ${theme.text.h2};
    }
  }
  p {
    margin: 0;
    color: ${theme.colors.muted};
  }
`;

export const Footer = styled.footer`
  padding: 32px 0 48px;
  border-top: 1px solid ${theme.colors.line};
  color: ${theme.colors.muted};
  font-size: ${theme.text.xs};
  text-align: center;
`;

export const ErrorBar = styled.div`
  padding-top: 12px;
`;
