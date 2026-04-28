import { useState } from 'react';
import LoginPage from './sections/LoginPage';
import Sidebar from './sections/Sidebar';
import Topbar from './sections/Topbar';
import SettingsPage from './sections/SettingsPage';
import MSADashboard from './sections/MSADashboard';

const PAGE_TITLES: Record<string, string> = {
  msa: 'MSA 看板',
  settings: '系统设置',
};

export default function App() {
  const [auth, setAuth] = useState<{ username: string; role: string } | null>(null);
  const [page, setPage] = useState('msa');

  const handleLogin = (username: string, role: string) => setAuth({ username, role });
  const handleLogout = () => { setAuth(null); setPage('msa'); };

  if (!auth) return <LoginPage onLogin={handleLogin} />;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar
        activePage={page}
        onNavigate={setPage}
        username={auth.username}
        role={auth.role}
        onLogout={handleLogout}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <Topbar title={PAGE_TITLES[page] || ''} username={auth.username} />

        <main className="flex-1 p-6 overflow-auto">
          {page === 'msa' && <MSADashboard />}
          {page === 'settings' && <SettingsPage />}
        </main>
      </div>
    </div>
  );
}
