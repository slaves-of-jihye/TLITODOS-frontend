import { useNavigate } from "react-router-dom";
import { useNotificationUnreadStatus } from "@/entities/notification";
import { BottomNav } from "@/shared/ui";

/**
 * 아래 네비게이션. 어느 화면에 있든 같은 자리에 있습니다.
 *
 * 안 읽은 알림이 하나라도 남아 있으면 종에 점이 붙습니다 — 갈래를 가리지 않고
 * 하나로 묶습니다. 어느 갈래인지는 알림 화면의 칩이 따로 알려 주므로, 여기서는
 * 볼 것이 있는지 없는지만 말하면 됩니다.
 */
export const PageNav = ({ active }: { active: "home" | "alarm" | "settings" }) => {
  const navigate = useNavigate();
  const { data: unread } = useNotificationUnreadStatus();
  return (
    <BottomNav
      active={active}
      alarm={Boolean(unread && Object.values(unread).some(Boolean))}
      onNavigate={next => navigate(next === "home" ? "/" : `/${next}`)}
    />
  );
};
