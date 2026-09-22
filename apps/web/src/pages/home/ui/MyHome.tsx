import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { GroupActionModals } from "@/features/group-join";
import { AppShell } from "@/shared/ui";
import { PageNav } from "@/widgets/page-nav";
import { TodoWorkspace } from "@/widgets/todo-workspace";
import { WorkspaceHeader } from "@/widgets/workspace-header";

const useHeaderModal = () => {
  const [mode, setMode] = useState<"create" | "join" | null>(null);
  return { mode, openCreate: () => setMode("create"), openJoin: () => setMode("join"), close: () => setMode(null) };
};

/**
 * 화면 맨 위에 걸리는 진행 줄.
 *
 * 저장·삭제 같은 쓰기는 끝나도 목록을 뒤에서 다시 받아 옵니다. 그 왕복까지가
 * 사용자가 기다리는 시간이므로 쓰기와 읽기를 가리지 않고 하나로 켭니다. 어느
 * 화면에서 무엇을 하든 자리가 같도록 한 군데서만 답니다.
 */

export const MyHome = () => {
  const header = useHeaderModal();
  /*
   * 일기를 저장하고 돌아온 길.
   *
   * 그 날로 보드를 열고 일기 시트도 함께 펴 줍니다 — 홈은 늘 오늘로 열리므로
   * 날짜를 들려 보내지 않으면 다른 날에 쓴 일기가 어디로 갔는지 알 수 없습니다.
   */
  const [search] = useSearchParams();
  const savedDiaryDate = search.get("diary") ?? undefined;
  return (
    <AppShell>
      <WorkspaceHeader onCreate={header.openCreate} onJoin={header.openJoin} />
      <TodoWorkspace own groupId={null} initialDate={savedDiaryDate} openDiary={Boolean(savedDiaryDate)} />
      <PageNav active="home" />
      <GroupActionModals mode={header.mode} onClose={header.close} />
    </AppShell>
  );
};

/**
 * 그룹 화면.
 *
 * Figma의 group 섹션 `main / today`입니다. 맨 위 줄에서 그룹을 빠져나가거나 설정을
 * 열고, 그 아래 멤버 줄에서 누구의 할 일을 볼지 고릅니다. 나를 골랐을 때는 홈과
 * 같은 내 할 일(그룹으로 좁히지 않은 전체)을 보여주고, 다른 멤버는 그룹에 공개된
 * 할 일만 읽기 전용으로 보여줍니다.
 */
