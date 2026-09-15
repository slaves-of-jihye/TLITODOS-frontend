import { useNavigate } from "react-router-dom";
import { BottomNav } from "@/shared/ui";

export const PageNav = ({ active }: { active: "home" | "alarm" | "profile" }) => {
  const navigate = useNavigate();
  return <BottomNav active={active} onNavigate={next => navigate(next === "home" ? "/" : `/${next}`)} />;
};
