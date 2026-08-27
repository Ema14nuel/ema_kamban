import { useEffect } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { useUiStore } from './store/uiStore';
import LoginScreen from './components/auth/LoginScreen';
import Shell from './components/layout/Shell';
import BoardsHome from './components/boards/BoardsHome';
import BoardDetail from './components/board/BoardDetail';
import ConsolidatedScreen from './components/consolidated/ConsolidatedScreen';
import RoutinesScreen from './components/routines/RoutinesScreen';
import LogScreen from './components/log/LogScreen';
import UsersScreen from './components/admin/UsersScreen';
import RequireStaff from './components/layout/RequireStaff';
import DashboardScreen from './components/dashboard/DashboardScreen';
import ActivitiesHistoryScreen from './components/history/ActivitiesHistoryScreen';

export default function App() {
  const auth = useAuthStore((s) => s.auth);
  const theme = useUiStore((s) => s.theme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  if (auth !== 'in') return <LoginScreen />;

  return (
    <HashRouter>
      <Routes>
        <Route element={<Shell />}>
          <Route path="/" element={<DashboardScreen />} />
          <Route path="/boards" element={<BoardsHome />} />
          <Route path="/boards/:boardId" element={<BoardDetail />} />
          <Route path="/consolidated" element={<ConsolidatedScreen />} />
          <Route path="/routines" element={<RoutinesScreen />} />
          <Route path="/log" element={<LogScreen />} />
          <Route path="/history" element={<ActivitiesHistoryScreen />} />
          <Route
            path="/users"
            element={
              <RequireStaff>
                <UsersScreen />
              </RequireStaff>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
