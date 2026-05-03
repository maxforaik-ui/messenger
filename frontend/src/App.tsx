import React from 'react';
import { useAppStore } from './store/useAppStore';
import { AuthScreen } from './components/AuthScreen';
import { Sidebar } from './components/Sidebar';
import { ChatWindow } from './components/ChatWindow';
import { PasswordModal } from './components/PasswordModal';
import { InstallPrompt } from './components/InstallPrompt';
import { initSocket, disconnectSocket } from './lib/socket';
import { authFetch } from './lib/api';

export function App() {
  const { me, token, theme, ui, setUi, setUsers, setChats, setNotifications } = useAppStore();

  React.useEffect(() => {
    if (!token || !me?.id) return;
    initSocket();
    Promise.all([
      authFetch('/users').then(r => r.json()),
      authFetch('/chats').then(r => r.json()),
      authFetch('/notifications').then(r => r.json())
    ]).then(([usersData, chatsData, notificationsData]) => {
      setUsers(usersData);
      setChats(chatsData.map((c: any) => ({...c, pinned: false, draft: ''})));
      setNotifications(notificationsData);
    }).catch(console.error);
    return () => disconnectSocket();
  }, [token, me?.id, setUsers, setChats, setNotifications]);

  // ✅ FIX: Переключение темы через класс на html
  React.useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  React.useEffect(() => {
    if (ui.toast) {
      const t = setTimeout(() => setUi({ toast: '' }), 3000);
      return () => clearTimeout(t);
    }
  }, [ui.toast, setUi]);

  if (!me || !token) return <AuthScreen />;

  return (
    // ✅ FIX: Используем Tailwind классы, а не s.layout
    <div className="flex h-screen w-screen overflow-hidden bg-[var(--color-bg)] text-[var(--color-text)] font-sans">
      {ui.toast && (
        <div className="fixed top-4 right-4 z-30 bg-gray-900 text-white px-3 py-2 rounded-xl shadow-lg">
          {ui.toast}
        </div>
      )}
      <InstallPrompt />
      <Sidebar />
      <ChatWindow />
      <PasswordModal />
    </div>
  );
}