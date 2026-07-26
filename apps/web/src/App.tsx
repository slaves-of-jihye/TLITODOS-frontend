import { HashRouter, Route, Routes } from "react-router-dom";
import { useSessionStore } from "./app/sessionStore";
import { InstallPrompt, LoginModal } from "./components";
import { AlarmPage, DiaryPage, FriendHome, GroupHome, MyHome, NotFoundPage, ProfilePage } from "./screens";

function App() {
  const accessToken = useSessionStore(state => state.accessToken);
  return (
    <HashRouter>
      {accessToken ? <InstallPrompt /> : null}
      {accessToken ? (
        <Routes>
          <Route path="/" element={<MyHome />} />
          <Route path="/alarm" element={<AlarmPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/diary" element={<DiaryPage />} />
          <Route path="/groups/:groupId" element={<GroupHome />} />
          <Route path="/groups/:groupId/members/:userId" element={<FriendHome />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      ) : null}
      <LoginModal />
    </HashRouter>
  );
}

export default App;
