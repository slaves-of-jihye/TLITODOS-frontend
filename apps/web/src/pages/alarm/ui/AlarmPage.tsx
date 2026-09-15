import styled from "@emotion/styled";
import { useMemo, useState } from "react";
import type { Bet, NotificationType } from "@/shared/api";
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
} from "@/entities/notification";
import { BetReceivedModal } from "@/features/bet-answer";
import { DiaryViewModal } from "@/features/diary-view";
import { errorMessage } from "@/shared/lib";
import { AppShell, Button, ErrorText, PageTitle, SrOnly, palette, theme } from "@/shared/ui";
import { PageNav } from "@/widgets/page-nav";

export const AlarmPage = () => {
  const [filter, setFilter] = useState<NotificationType>("TODO_COMPLETED");
  /** 열어 둔 일기. 알림에 딸려 온 작성자 이름은 일기 응답에 없어 함께 들고 있습니다. */
  const [openDiary, setOpenDiary] = useState<{ diaryId: number; actor: string } | null>(null);
  /** 열어 둔 내기. 알림이 내기를 통째로 담아 오므로 따로 받아 올 것이 없습니다. */
  const [openBet, setOpenBet] = useState<{ bet: Bet; actor: string } | null>(null);
  const label = ALARM_FILTERS.find(item => item.key === filter)?.label ?? "";
  const { data, isLoading, error, hasNextPage, isFetchingNextPage, fetchNextPage } = useNotifications(filter);
  /*
   * 갈래마다 안 읽은 알림이 남아 있는지.
   *
   * 목록은 고른 갈래만 받아 오므로, 다른 갈래에 새 알림이 왔는지는 목록으로 알 수
   * 없습니다. 읽음으로 넘길 때 거는 무효화가 이 표시도 같이 다시 받아 옵니다.
   */
  const { data: unread } = useNotificationUnreadStatus();
  const markRead = useMarkNotificationRead();
  const items = useMemo(() => data?.pages.flatMap(page => page.items) ?? [], [data]);
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
        </AlarmFilters>
        {error ? (
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
