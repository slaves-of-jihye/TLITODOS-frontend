import { HashRouter, Route, Routes } from "react-router-dom";
import { FontSync } from "@/features/font-select";
import { useSessionStore } from "@/shared/model";
import { LoginModal } from "@/features/auth-google";
import { InstallPrompt } from "@/features/pwa-install";
import { AlarmPage, DiaryPage, GroupHome, MyHome, NotFoundPage, ProfilePage, ServerBusyBar } from "./screens";

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
