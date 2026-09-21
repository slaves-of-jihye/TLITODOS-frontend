import styled from "@emotion/styled";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { AppNotification, Bet, NotificationType, Todo } from "@/shared/api";
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
import { useFindMemberGroup } from "@/entities/group";
import { coversDate, dateOnly, useFetchTodo } from "@/entities/todo";
import { BetReceivedModal } from "@/features/bet-answer";
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
const boardDate = (todo: Todo) => {
  const today = formatLocalDate(new Date());
  if (coversDate(todo, today)) return today;
  return dateOnly(todo.dueDate) ?? dateOnly(todo.startDate) ?? today;
};

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
  const readAll = useReadAllTodoCompleted();
  const navigate = useNavigate();
  const findMemberGroup = useFindMemberGroup();
  const fetchTodo = useFetchTodo();
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
    setOpening(item.notificationId);
    setOpenError("");
    try {
      /*
       * 어느 그룹으로 들어갈지와 며칠로 갈지는 서로 기다릴 일이 없어 함께 물어봅니다.
       *
       * 알림이 들고 오는 할 일은 제목과 세부사항뿐이라 날짜는 따로 받아 와야 합니다.
       */
      const [groupId, todo] = await Promise.all([
        findMemberGroup(item.actor.userId),
        item.todo ? fetchTodo(item.todo.todoId) : Promise.resolve(null),
      ]);
      if (groupId === null) {
        setOpenError(`${item.actor.name || "친구"}님과 함께 있는 그룹을 찾지 못했습니다.`);
        return;
      }
      navigate(`/groups/${groupId}/members/${item.actor.userId}${todo ? `?date=${boardDate(todo)}` : ""}`);
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
        </AlarmFilters>
        {canReadAll ? (
          <AlarmBulkRow>
            <Button type="button" disabled={readAll.isPending} onClick={() => readAll.mutate()}>
              {readAll.isPending ? "확인하는 중..." : "전체 확인"}
            </Button>
          </AlarmBulkRow>
        ) : null}
        {openError ? <ErrorText>{openError}</ErrorText> : null}
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
