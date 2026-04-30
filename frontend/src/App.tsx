import React from 'react';
import { useAppStore } from './store/useAppStore';
import { themeTokens, createStyles } from './styles/theme';
import { AuthScreen } from './components/AuthScreen';
import { Sidebar } from './components/Sidebar';
import { ChatWindow } from './components/ChatWindow';
import { SettingsModal } from './components/SettingsModal';
import { initSocket, disconnectSocket } from './lib/socket';
import { authFetch } from './lib/api';

export function App() {
  const { me, token, theme, ui, setUi, setUsers, setChats, setNotifications } = useAppStore();
  const p = themeTokens[theme];
  const s = React.useMemo(() => createStyles(p), [p]);

  // Загрузка данных при входе
  React.useEffect(() => {
    if (!token || !me?.id) return;

    console.log("🟢 Инициализация сессии для:", me.name);
    initSocket();

    Promise.all([
      authFetch('/users').then(r => r.json()),
      authFetch('/chats').then(r => r.json()),
      authFetch('/notifications').then(r => r.json())
    ]).then(([usersData, chatsData, notificationsData]) => {
      console.log("✅ Данные загружены:", { users: usersData.length, chats: chatsData.length });
      setUsers(usersData);
      setChats(chatsData.map((c: any) => ({ ...c, pinned: false, draft: '' })));
      setNotifications(notificationsData);
    }).catch(err => {
      console.error("❌ Ошибка загрузки данных:", err);
      setUi({ toast: "Ошибка подключения к серверу" });
    });

    return () => disconnectSocket();
  }, [token, me?.id, setUsers, setChats, setNotifications, setUi]);

  // Стили body
  React.useEffect(() => {
    document.body.style.margin = '0';
    document.body.style.background = p.bg;
    document.body.style.color = p.text;
  }, [p]);

  // Тосты
  React.useEffect(() => {
    if (ui.toast) {
      const t = setTimeout(() => setUi({ toast: '' }), 3000);
      return () => clearTimeout(t);
    }
  }, [ui.toast, setUi]);

  if (!me || !token) return <AuthScreen />;

  return (
    <div style={s.layout}>
      {ui.toast && <div style={s.toast}>{ui.toast}</div>}
      <Sidebar />
      <ChatWindow />
      <SettingsModal />
    </div>
  );
}