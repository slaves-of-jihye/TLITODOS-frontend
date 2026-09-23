import styled from "@emotion/styled";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { AppNotification, Bet, NotificationType, TodoPreview } from "@/shared/api";
import {
  ALARM_FILTERS,
  ActorAvatar,
  AlarmDot,
  AlarmEmpty,
  AlarmList,
  AlarmListSkeleton,
  AlarmRow,
  UnreadDot,
  alarmSentence,
  useMarkNotificationRead,
  useNotificationUnreadStatus,
  useNotifications,
  useReadAllTodoCompleted,
} from "@/entities/notification";
import { BET_STAGE_LABEL, betStage, useBets } from "@/entities/bet";
import { useFindMemberGroup } from "@/entities/group";
import { coversDate, dateOnly } from "@/entities/todo";
import { useMe } from "@/entities/user";
import { BetReceivedModal } from "@/features/bet-answer";
import { BetProofModal } from "@/features/bet-proof";
import { BetVerifyModal } from "@/features/bet-verify";
import { DiaryViewModal } from "@/features/diary-view";
import { errorMessage, formatLocalDate } from "@/shared/lib";
import { AppShell, Button, ErrorText, PageTitle, SrOnly, palette, theme } from "@/shared/ui";
import { PageNav } from "@/widgets/page-nav";

/**
 * 그 할 일을 보러 갈 날.
 *
 * 할 일은 시작일부터 마감일까지 매일 같은 자리에 서 있으므로 고를 날이 여럿입니다.
 * 오늘이 그 안에 들면 오늘로 갑니다 — 보러 가는 사람의 기준점이고, 달력을 괜히
 * 옮겨 두면 돌아올 곳을 잃습니다. 밖이면 마감일로 갑니다: 그 할 일이 마지막으로
 * 서 있는 날이고, 지난 것이든 앞으로 올 것이든 "언제까지였나"가 먼저 궁금합니다.
 */
const boardDate = (todo: TodoPreview) => {
  const today = formatLocalDate(new Date());
  if (coversDate(todo, today)) return today;
  return dateOnly(todo.dueDate) ?? dateOnly(todo.startDate) ?? today;
};

/**
 * 알림 갈래 셋에 내기 칸 하나를 더한 것이 이 화면의 칩 줄입니다.
 *
 * 내기는 알림이 아닙니다 — 알림은 그때 일어난 일을 한 줄 남길 뿐이고, 내기는
 * 수락하고 인증하고 확인하기까지 며칠을 걸쳐 오갑니다. 그런데 오가는 상대가 같고
 * 들여다보는 이유도 같아서, 화면을 새로 만들기보다 여기 한 칸을 더 둡니다.
 */
const BETS_TAB = "BETS" as const;
type AlarmTab = NotificationType | typeof BETS_TAB;

/**
 * 내기 한 줄.
 *
 * 무엇을 걸었는지가 가장 크고, 어느 할 일에 걸린 것인지가 그 아래에 붙습니다.
 * 받은 내기에는 건 사람의 이름도 함께 답니다 — 보낸 내기에서 `requesterName`은
 * 내 이름이라 상대를 가리키지 못하고, 할 일 주인의 이름은 목록에 없습니다.
 *
 * 오른쪽 끝에는 지금 내 차례인지가 섭니다: 차례가 아닌 줄은 무엇을 기다리는
 * 중인지 적기만 하고, 내 차례인 줄에만 누를 것이 있습니다.
 */
const BetListRow = ({
  bet,
  myUserId,
  onProve,
  onCheck,
  onAnswer,
}: {
  bet: Bet;
  myUserId: number;
  onProve: () => void;
  onCheck: () => void;
  onAnswer: () => void;
}) => {
  const stage = betStage(bet, myUserId);
  /** 내가 건 것인지 나에게 온 것인지. 같은 목록에 두 방향이 섞여 있습니다. */
  const received = bet.requesterId !== myUserId;
  const when = dateOnly(bet.todo.dueDate) ?? dateOnly(bet.todo.startDate) ?? "";
  const line = [received ? bet.requesterName : null, `${when} ${bet.todo.title}`.trim()].filter(Boolean).join(" · ");
  const action =
    stage === "ANSWER"
      ? { label: "답하기", run: onAnswer }
      : stage === "PROVE"
        ? { label: "인증하기", run: onProve }
        : stage === "CHECK"
          ? { label: "확인하기", run: onCheck }
          : null;
  return (
    <BetRow {...(action ? { as: "button" as const, type: "button" as const, onClick: action.run } : {})}>
      <div>
        {/*
         * 어느 쪽에서 온 내기인지 먼저 밝힙니다.
         *
         * 차례 표시만으로는 갈리지 않습니다 — `인증을 기다리는 중`은 내가 건
         * 내기에서도, 내가 받은 내기에서도 나올 수 있는 말입니다.
         */}
        <BetDirection received={received}>{received ? "받은 내기" : "보낸 내기"}</BetDirection>
        <strong>{bet.content}</strong>
        <small>{line}</small>
      </div>
      {action ? <BetAction aria-hidden>{action.label}</BetAction> : <BetWaiting>{BET_STAGE_LABEL[stage]}</BetWaiting>}
      {action ? <SrOnly>{BET_STAGE_LABEL[stage]}</SrOnly> : null}
    </BetRow>
  );
};

export const AlarmPage = () => {
  const [filter, setFilter] = useState<AlarmTab>("TODO_COMPLETED");
  const onBets = filter === BETS_TAB;
  /** 열어 둔 일기. 알림에 딸려 온 작성자 이름은 일기 응답에 없어 함께 들고 있습니다. */
  const [openDiary, setOpenDiary] = useState<{ diaryId: number; actor: string } | null>(null);
  /** 열어 둔 내기. 알림이 내기를 통째로 담아 오므로 따로 받아 올 것이 없습니다. */
  const [openBet, setOpenBet] = useState<{ bet: Bet; actor: string } | null>(null);
  const label = ALARM_FILTERS.find(item => item.key === filter)?.label ?? "";
  // 내기 칸에 서 있는 동안에는 알림 목록을 받아 오지 않습니다.
  const { data, isLoading, error, hasNextPage, isFetchingNextPage, fetchNextPage } = useNotifications(
    onBets ? null : filter,
    !onBets,
  );
  const { data: bets = [], isLoading: betsLoading, error: betsError } = useBets(onBets);
  const { data: me } = useMe();
  /** 사진을 올리려고 연 내기와, 사진을 보려고 연 내기. */
  const [proving, setProving] = useState<Bet | null>(null);
  const [checking, setChecking] = useState<Bet | null>(null);
  /*
   * 갈래마다 안 읽은 알림이 남아 있는지.
   *
   * 목록은 고른 갈래만 받아 오므로, 다른 갈래에 새 알림이 왔는지는 목록으로 알 수
   * 없습니다. 읽음으로 넘길 때 거는 무효화가 이 표시도 같이 다시 받아 옵니다.
   */
  const { data: unread } = useNotificationUnreadStatus();
  const markRead = useMarkNotificationRead();
  const readAll = useReadAllTodoCompleted();
  const navigate = useNavigate();
  const findMemberGroup = useFindMemberGroup();
  /** 보드를 여는 중인 알림. 그룹을 되짚는 동안 그 줄만 눌린 티가 나게 합니다. */
  const [opening, setOpening] = useState<number | null>(null);
  const [openError, setOpenError] = useState("");
  /*
   * 할 일 완료 알림은 그 사람의 달력으로 건너갑니다.
   *
   * 남의 보드는 그룹 안에서만 보는데 알림에는 어느 그룹인지가 없어, 함께 있는
   * 그룹을 먼저 찾습니다. 못 찾으면 넘어가지 않고 그 자리에 이유를 적습니다 —
   * 그룹에서 나간 뒤에 온 알림이 그럴 수 있고, 아무 일도 없이 멈추는 것보다
   * 왜 안 되는지가 보이는 편이 낫습니다.
   */
  const openActorBoard = async (item: AppNotification) => {
    const date = item.todo ? `?date=${boardDate(item.todo)}` : "";
    const open = (groupId: number) => navigate(`/groups/${groupId}/members/${item.actor.userId}${date}`);
    if (item.groupId !== null) {
      open(item.groupId);
      return;
    }
    /*
     * 그룹을 모르는 줄만 되짚습니다.
     *
     * 알림이 어느 그룹에서 왔는지 들고 오기 전에 쌓인 것들입니다. 그런 줄이 다
     * 지나가면 이 갈래와 `useFindMemberGroup`은 함께 걷어낼 수 있습니다.
     */
    setOpening(item.notificationId);
    setOpenError("");
    try {
      const groupId = await findMemberGroup(item.actor.userId);
      if (groupId === null) {
        setOpenError(`${item.actor.name || "친구"}님과 함께 있는 그룹을 찾지 못했습니다.`);
        return;
      }
      open(groupId);
    } catch (reason) {
      setOpenError(errorMessage(reason));
    } finally {
      setOpening(null);
    }
  };
  const items = useMemo(() => data?.pages.flatMap(page => page.items) ?? [], [data]);
  /*
   * 할 일 완료 알림만 한 번에 넘길 수 있습니다.
   *
   * 서버가 그 갈래만 받아서(`todo-completed/read-all`) 다른 갈래를 보고 있을 때는
   * 누를 것이 없고, 남은 것이 없을 때도 누를 일이 없습니다. 눌러도 아무 일이
   * 없는 버튼을 세워 두느니 그때만 내놓습니다 — 같은 이유로 확인은 묻지 않습니다:
   * 읽음은 지우는 것이 아니라 표시를 거두는 것이고, 줄을 눌러도 같은 일이
   * 일어납니다.
   */
  const canReadAll = filter === "TODO_COMPLETED" && Boolean(unread?.TODO_COMPLETED);
  return (
    <AppShell>
      <AlarmColumn>
        <PageTitle>알림</PageTitle>
        <AlarmFilters role="tablist">
          {ALARM_FILTERS.map(item => (
            <AlarmFilter
              key={item.key}
              type="button"
              role="tab"
              aria-selected={filter === item.key}
              selected={filter === item.key}
              onClick={() => setFilter(item.key)}
            >
              {item.label}
              {/* 안 읽은 것이 남아 있는 갈래에만. 점은 모양일 뿐이라 읽어 줄 말은 따로 답니다. */}
              {unread?.[item.key] ? (
                <>
                  <UnreadDot aria-hidden />
                  <SrOnly>안 읽은 알림 있음</SrOnly>
                </>
              ) : null}
            </AlarmFilter>
          ))}
          {/* 내기 칸에는 점이 붙지 않습니다 — `unread-status`는 알림 세 갈래만 셉니다. */}
          <AlarmFilter
            type="button"
            role="tab"
            aria-selected={onBets}
            selected={onBets}
            onClick={() => setFilter(BETS_TAB)}
          >
            주고받은 내기
          </AlarmFilter>
        </AlarmFilters>
        {canReadAll ? (
          <AlarmBulkRow>
            <Button type="button" disabled={readAll.isPending} onClick={() => readAll.mutate()}>
              {readAll.isPending ? "확인하는 중..." : "전체 확인"}
            </Button>
          </AlarmBulkRow>
        ) : null}
        {openError ? <ErrorText>{openError}</ErrorText> : null}
        {onBets ? (
          betsError ? (
            <ErrorText>{errorMessage(betsError)}</ErrorText>
          ) : betsLoading ? (
            <AlarmListSkeleton />
          ) : bets.length && me ? (
            <AlarmList>
              {bets.map(bet => (
                <BetListRow
                  key={bet.betId}
                  bet={bet}
                  myUserId={me.userId}
                  onProve={() => setProving(bet)}
                  onCheck={() => setChecking(bet)}
                  onAnswer={() => setOpenBet({ bet, actor: bet.requesterName || "친구" })}
                />
              ))}
            </AlarmList>
          ) : (
            <AlarmEmpty>주고받은 내기가 없습니다.</AlarmEmpty>
          )
        ) : error ? (
          <ErrorText>{errorMessage(error)}</ErrorText>
        ) : isLoading ? (
          <AlarmListSkeleton />
        ) : items.length ? (
          <AlarmList>
            {items.map(item => (
              <AlarmRow
                key={item.notificationId}
                type="button"
                unread={item.readAt === null}
                onClick={() => {
                  // 누르면 읽음으로 넘깁니다. 서버가 목록을 다시 주면 표시가 사라집니다.
                  if (item.readAt === null) markRead.mutate(item.notificationId);
                  // 일기 알림은 그 자리에서 바로 펴 봅니다.
                  if (item.type === "DIARY_CREATED" && item.diaryId !== null) {
                    setOpenDiary({ diaryId: item.diaryId, actor: item.actor.name || "친구" });
                  }
                  // 내기 알림은 수락/거절을 그 자리에서 정합니다.
                  if (item.type === "BET_REQUESTED" && item.bet) {
                    setOpenBet({ bet: item.bet, actor: item.actor.name || "친구" });
                  }
                  // 할 일 완료 알림은 그 사람의 달력으로 넘어갑니다.
                  if (item.type === "TODO_COMPLETED") {
                    void openActorBoard(item);
                  }
                }}
              >
                <ActorAvatar url={item.actor.profileImageUrl} />
                <div>
                  <strong>{alarmSentence(item)}</strong>
                  {/* 내기는 무엇을 걸었는지가 먼저입니다. 나머지는 할 일의 세부사항을 둡니다. */}
                  {item.bet ? (
                    <small>{item.bet.content}</small>
                  ) : item.todo?.description ? (
                    <small>{item.todo.description}</small>
                  ) : null}
                </div>
                {opening === item.notificationId ? <SrOnly>보드를 여는 중</SrOnly> : null}
                {item.readAt === null ? <AlarmDot aria-label="읽지 않음" /> : null}
              </AlarmRow>
            ))}
          </AlarmList>
        ) : (
          <AlarmEmpty>아직 도착한 {label} 알림이 없습니다.</AlarmEmpty>
        )}
        {hasNextPage ? (
          <Button type="button" disabled={isFetchingNextPage} onClick={() => void fetchNextPage()}>
            {isFetchingNextPage ? "불러오는 중..." : "더 보기"}
          </Button>
        ) : null}
      </AlarmColumn>
      {openDiary ? (
        <DiaryViewModal diaryId={openDiary.diaryId} author={openDiary.actor} onClose={() => setOpenDiary(null)} />
      ) : null}
      <BetProofModal bet={proving} onClose={() => setProving(null)} />
      <BetVerifyModal bet={checking} onClose={() => setChecking(null)} />
      <BetReceivedModal
        key={openBet?.bet.betId ?? 0}
        bet={openBet?.bet ?? null}
        requesterName={openBet?.actor ?? "친구"}
        open={openBet !== null}
        onClose={() => setOpenBet(null)}
      />
      <PageNav active="alarm" />
    </AppShell>
  );
};

/*
 * 내기 줄. 알림 줄과 같은 카드 모양이되 아바타 자리가 없습니다 — 내기는 사람이
 * 아니라 할 일에 붙는 것이고, 목록은 상대의 사진을 들고 오지 않습니다.
 *
 * 누를 것이 있는 줄만 `button`으로 그립니다. 기다리는 줄까지 버튼으로 두면 눌러도
 * 아무 일이 없는 것을 눌러 보게 됩니다.
 */
const BetRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  border: 0;
  border-radius: ${theme.radius.sm};
  background: ${palette.white};
  padding: 16px 20px;
  text-align: left;
  color: ${theme.colors.ink};
  > div {
    display: grid;
    gap: 4px;
    min-width: 0;
    flex: 1;
  }
  strong {
    font-size: ${theme.text.s};
    overflow-wrap: anywhere;
  }
  small {
    font-size: ${theme.text.xs};
    color: ${theme.colors.muted};
    overflow-wrap: anywhere;
  }
`;

/**
 * 받은 내기인지 보낸 내기인지.
 *
 * 받은 쪽은 내가 답하거나 해내야 하는 것이라 채워서 눈에 걸리게 두고, 보낸 쪽은
 * 상대가 움직일 차례가 많아 테두리만 둡니다.
 */
const BetDirection = styled.span<{ received: boolean }>`
  justify-self: start;
  border: 1px solid ${({ received }) => (received ? "transparent" : palette.gray300)};
  border-radius: ${theme.radius.pill};
  background: ${({ received }) => (received ? palette.gray200 : "transparent")};
  padding: 2px 10px;
  font-size: ${theme.text.xs};
  color: ${({ received }) => (received ? theme.colors.ink : theme.colors.muted)};
`;

/** 내 차례라는 표시. 줄 전체가 눌리므로 이 자리는 버튼이 아니라 글자입니다. */
const BetAction = styled.span`
  flex: none;
  border-radius: ${theme.radius.pill};
  background: ${palette.black};
  padding: 8px 16px;
  font-size: ${theme.text.xs};
  color: ${palette.white};
`;

const BetWaiting = styled.span`
  flex: none;
  font-size: ${theme.text.xs};
  color: ${theme.colors.muted};
  white-space: nowrap;
`;

const AlarmColumn = styled.div`
  display: grid;
  gap: 32px;
  width: min(485px, 100%);
  justify-items: start;
`;
/** 홈의 `HeaderRow`, 그룹의 `MemberBar`와 같은 자리에서 같은 방식으로 화면 위에 붙습니다. */

/** 홈의 `HeaderRow`, 그룹의 `MemberBar`와 같은 자리에서 같은 방식으로 화면 위에 붙습니다. */
const AlarmFilters = styled.div`
  position: sticky;
  top: 0;
  z-index: 40;
  background: ${palette.white};
  /*
   * 붙었을 때 화면 끝에 닿지 않도록 12px을 두되, 제목과의 간격은 원래 20px
   * 그대로 보이게 합니다. 칸 사이 32px에서 24px을 당기면 8px이 남고, 여기에
   * 안쪽 여백 12px이 더해져 20px이 됩니다.
   */
  padding-top: 12px;
  margin-top: -24px;
  /* 목록보다 좁으면 옆으로 내용이 비쳐 보입니다. */
  width: 100%;
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
`;

/*
 * 갈래 칩에 딸린 버튼이라 칸 사이 간격(32px)만큼 떼지 않고 바짝 붙입니다.
 *
 * 목록 위 오른쪽 끝에 세웁니다 — 왼쪽 끝은 칩과 같은 출발선이라 칩 하나가 더
 * 늘어난 것처럼 보이고, 이건 고르는 것이 아니라 하는 것입니다.
 */
const AlarmBulkRow = styled.div`
  display: flex;
  justify-content: flex-end;
  width: 100%;
  margin-top: -20px;
`;

const AlarmFilter = styled.button<{ selected: boolean }>`
  /* 점이 붙어도 글자가 가운데를 지키도록 한 줄로 늘어놓습니다. */
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 0;
  border-radius: ${theme.radius.pill};
  padding: 6px 20px;
  font-size: ${theme.text.h3};
  background: ${({ selected }) => (selected ? palette.black : palette.gray200)};
  color: ${({ selected }) => (selected ? palette.white : theme.colors.ink)};
`;
