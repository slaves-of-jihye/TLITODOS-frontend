import { CATEGORY_PRESETS } from "@/entities/category";
import { useGoogleLogin } from "@/features/auth-google";
import { FONT_PRESETS } from "@/shared/lib";
import { Button, CategoryPill, DEFAULT_AVATAR, DiaryBadge, ErrorText, StatusCluster, TodoRow } from "@/shared/ui";
import { MOCK_TODOS } from "./mock";
import {
  Brand,
  ClusterRow,
  Container,
  CtaRow,
  ErrorBar,
  FeatureCard,
  FeatureGrid,
  FinalCta,
  FontChip,
  FontChips,
  Footer,
  Header,
  HeaderInner,
  Hero,
  HeroLead,
  HeroPreview,
  HeroTitle,
  MemberChip,
  MemberChips,
  Preview,
  PreviewColumn,
  Section,
  SectionLead,
  SectionTitle,
  StartMark,
  Step,
  StepNumber,
  Steps,
} from "./styles";

const TAGLINE = "오늘 할 일과 하루의 기록을 한곳에서 관리해 보세요.";

const [todoSlot, , , hobbySlot] = CATEGORY_PRESETS;
const ACCENT = todoSlot.strong;
const HOBBY_ACCENT = hobbySlot.strong;

const STEPS = [
  { title: "할 일을 담아요", body: "해야할 일, 취미처럼 네 칸의 카테고리에 오늘 할 일을 적어 두세요." },
  { title: "끝내며 달력을 채워요", body: "할 일을 끝낼수록 그날의 달력 칸이 카테고리 색으로 채워져요." },
  { title: "하루를 일기로 남겨요", body: "하루 한 편, 사진과 함께 기록하고 비공개로 간직하거나 친구와 나눠요." },
];

/**
 * 목업은 눌리지 않고 설명이 옆에 있으므로 보조기기와 키보드에서 뺍니다. 안에 든 `TodoRow`의
 * 완료 버튼 같은 것이 탭 순서에 걸리지 않도록 `aria-hidden`만이 아니라 `inert`를 함께 씁니다.
 */
const mockProps = { "aria-hidden": true, inert: true } as const;

const BoardPreview = () => (
  <PreviewColumn>
    <CategoryPill name="해야할 일" accent={ACCENT} own={false} />
    <TodoRow todo={MOCK_TODOS.report} accent={ACCENT} own deadline="오후 2시까지" />
    <TodoRow todo={MOCK_TODOS.slides} accent={ACCENT} own blockedBy={1} />
    <CategoryPill name="취미" accent={HOBBY_ACCENT} own={false} />
    <TodoRow todo={MOCK_TODOS.vocab} accent={HOBBY_ACCENT} own />
  </PreviewColumn>
);

/** 완료한 만큼 사분면이 카테고리 색으로 차오르는 모습을 네 단계로 보여 줍니다. */
const CLUSTER_STAGES = [0, 1, 2, 4];

export const LandingPage = () => {
  const { login, loading, error } = useGoogleLogin();
  const startLabel = loading ? "로그인 중..." : "Google로 시작하기";
  return (
    <>
      <Header>
        <HeaderInner>
          <Brand href="#/" aria-label="TLITODOS 처음으로">
            <img src="/images/favicon.png" alt="" />
            TLITODOS
          </Brand>
          <Button type="button" variant="dark" onClick={login} disabled={loading}>
            {loading ? "로그인 중..." : "로그인"}
          </Button>
        </HeaderInner>
        {error ? (
          <Container>
            <ErrorBar>
              <ErrorText role="alert">{error}</ErrorText>
            </ErrorBar>
          </Container>
        ) : null}
      </Header>
      <main>
        <Container>
          <Hero>
            <div>
              <HeroTitle>할 일을 끝낼수록 하루가 채워져요</HeroTitle>
              <HeroLead>{TAGLINE}</HeroLead>
              <CtaRow>
                <Button type="button" variant="dark" onClick={login} disabled={loading}>
                  <StartMark aria-hidden>G</StartMark>
                  {startLabel}
                </Button>
              </CtaRow>
            </div>
            <HeroPreview {...mockProps}>
              <BoardPreview />
            </HeroPreview>
          </Hero>
        </Container>

        <Section tone="panel" id="how">
          <Container>
            <SectionTitle>이렇게 써요</SectionTitle>
            <SectionLead>세 걸음이면 시작할 수 있어요.</SectionLead>
            <Steps>
              {STEPS.map((step, index) => (
                <Step key={step.title}>
                  <StepNumber aria-hidden>{index + 1}</StepNumber>
                  <h3>{step.title}</h3>
                  <p>{step.body}</p>
                </Step>
              ))}
            </Steps>
          </Container>
        </Section>

        <Section id="features">
          <Container>
            <SectionTitle>이런 기능이 있어요</SectionTitle>
            <SectionLead>하루를 정리하는 데 필요한 것만 담았어요.</SectionLead>
            <FeatureGrid>
              <FeatureCard>
                <Preview {...mockProps}>
                  <BoardPreview />
                </Preview>
                <div>
                  <h3>네 칸으로 나눈 오늘</h3>
                  <p>
                    해야할 일, 직접 만드는 카테고리 둘, 취미. 이름과 색은 마음대로 바꾸고, 할 일을 끌어서 다른 칸으로
                    옮길 수 있어요.
                  </p>
                </div>
              </FeatureCard>
              <FeatureCard>
                <Preview {...mockProps}>
                  <PreviewColumn>
                    <TodoRow todo={MOCK_TODOS.review} accent={ACCENT} own deadline="24일 오후 2시까지" blockedBy={1} />
                    <TodoRow todo={MOCK_TODOS.gym} accent={HOBBY_ACCENT} own />
                  </PreviewColumn>
                </Preview>
                <div>
                  <h3>마감, 중요도, 루틴, 선행</h3>
                  <p>
                    마감 시간과 중요도를 정하고, 매일부터 매년까지 반복하는 루틴을 만들 수 있어요. 먼저 끝내야 하는 할
                    일이 남아 있으면 자물쇠가 걸려요.
                  </p>
                </div>
              </FeatureCard>
              <FeatureCard>
                <Preview {...mockProps}>
                  <ClusterRow>
                    {CLUSTER_STAGES.map((filled, index) => (
                      <span key={filled}>
                        <StatusCluster
                          fills={[0, 1, 2, 3].map(slot => (slot < filled ? ACCENT : null))}
                          checked={filled === 4}
                          count={filled === 4 ? undefined : 4 - filled}
                        />
                        {index + 19}일
                      </span>
                    ))}
                  </ClusterRow>
                </Preview>
                <div>
                  <h3>달력이 채워져요</h3>
                  <p>
                    날마다 남은 할 일의 수가 달력에 보이고, 끝낸 만큼 그날의 칸이 카테고리 색으로 물들어요. 한 달을
                    한눈에 돌아볼 수 있어요.
                  </p>
                </div>
              </FeatureCard>
              <FeatureCard>
                <Preview {...mockProps}>
                  <DiaryBadge emotion="😊" nickname="오늘의 일기" date="2026-10-22" />
                </Preview>
                <div>
                  <h3>하루를 남기는 일기</h3>
                  <p>하루에 한 편, 사진도 함께 올릴 수 있어요. 전체 공개와 비밀 중에 고르고, 언제든 고칠 수 있어요.</p>
                </div>
              </FeatureCard>
              <FeatureCard>
                <Preview {...mockProps}>
                  <MemberChips>
                    {["나", "친구 1", "친구 2"].map(name => (
                      <MemberChip key={name}>
                        <span aria-hidden>{DEFAULT_AVATAR}</span>
                        {name}
                      </MemberChip>
                    ))}
                  </MemberChips>
                </Preview>
                <div>
                  <h3>그룹으로 함께</h3>
                  <p>
                    초대코드로 그룹에 모여 서로의 할 일과 일기를 읽어 볼 수 있어요. 친구가 할 일을 끝내거나 일기를 쓰면
                    알림이 와요.
                  </p>
                </div>
              </FeatureCard>
              <FeatureCard>
                <Preview {...mockProps}>
                  <FontChips>
                    {FONT_PRESETS.map(font => (
                      <FontChip key={font.key} style={{ fontFamily: `"${font.family}", system-ui, sans-serif` }}>
                        {font.label}
                      </FontChip>
                    ))}
                  </FontChips>
                </Preview>
                <div>
                  <h3>내 취향대로</h3>
                  <p>
                    폰트 여섯 가지, 라이트와 다크, 12시간과 24시간 표기를 고를 수 있고 홈 화면에 앱처럼 설치할 수도
                    있어요.
                  </p>
                </div>
              </FeatureCard>
            </FeatureGrid>
          </Container>
        </Section>

        <Section tone="panel">
          <Container>
            <FinalCta>
              <h2>오늘부터 시작해 볼까요?</h2>
              <p>Google 계정으로 바로 시작할 수 있어요.</p>
              <Button type="button" variant="dark" onClick={login} disabled={loading}>
                <StartMark aria-hidden>G</StartMark>
                {startLabel}
              </Button>
            </FinalCta>
          </Container>
        </Section>
      </main>
      <Footer>
        <Container>TLITODOS · {TAGLINE}</Container>
      </Footer>
    </>
  );
};
