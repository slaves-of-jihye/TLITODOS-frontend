import { HashRouter, Route, Routes } from "react-router-dom";
import { AlarmPage } from "@/pages/alarm";
import { DiaryPage } from "@/pages/diary";
import { GroupHome } from "@/pages/group";
import { MyHome } from "@/pages/home";
import { NotFoundPage } from "@/pages/not-found";
import { ProfilePage } from "@/pages/profile";
import { FontSync } from "@/features/font-select";
import { LoginModal } from "@/features/auth-google";
import { InstallPrompt } from "@/features/pwa-install";
import { useSessionStore } from "@/shared/model";
import { ServerBusyBar } from "./ui/ServerBusyBar";

/**
 * 어느 화면을 보여줄지 정하는 자리.
 *
 * 로그인하기 전에는 모든 길이 막히고 로그인 모달만 뜹니다. 그 위에 얹히는 것들
 * (글꼴 맞추기, 설치 안내, 진행 줄)은 화면을 가리지 않고 앱 전체에 한 번씩만
 * 답니다.
 */
function App() {
  const accessToken = useSessionStore(state => state.accessToken);
  return (
    <HashRouter>
      {accessToken ? <FontSync /> : null}
      {accessToken ? <ServerBusyBar /> : null}
      {accessToken ? <InstallPrompt /> : null}
      {accessToken ? (
        <Routes>
          <Route path="/" element={<MyHome />} />
          <Route path="/alarm" element={<AlarmPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/diary" element={<DiaryPage />} />
          <Route path="/groups/:groupId" element={<GroupHome />} />
          <Route path="/groups/:groupId/members/:userId" element={<GroupHome />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      ) : null}
      <LoginModal />
    </HashRouter>
  );
}

export default App;
