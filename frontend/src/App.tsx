import React from 'react';
import { useAppStore } from './store/useAppStore';
import { themeTokens, createStyles } from './styles/theme';
import { AuthScreen } from './components/AuthScreen';
import { Sidebar } from './components/Sidebar';
import { ChatWindow } from './components/ChatWindow';
import { SettingsModal } from './components/SettingsModal';
import { initSocket, disconnectSocket } from './lib/socket';
import { authFetch } from './lib/api';
import { requestPushPermission, subscribeToPush } from './lib/push';

export function App() {
  // ✅ FIX: Добавлено 'ui' в деструктуризацию
  const { me, token, theme, ui, setUi, setUsers, setChats, setNotifications } = useAppStore();
  const p = themeTokens[theme];
  const s = React.useMemo(() => createStyles(p), [p]);

  React.useEffect(() => {
    if (!token || !me?.id) return;
    initSocket();
    Promise.all([
      authFetch('/users').then(r => r.json()),
      authFetch('/chats').then(r => r.json()),
      authFetch('/notifications').then(r => r.json())
    ]).then(([usersData, chatsData, notificationsData]) => {
      setUsers(usersData);
      setChats(chatsData.map((c: any) => ({ ...c, pinned: false, draft: '' })));
      setNotifications(notificationsData);
    }).catch(console.error);
    return () => disconnectSocket();
  }, [token, me?.id, setUsers, setChats, setNotifications]);

  React.useEffect(() => {
    document.body.style.margin = '0';
    document.body.style.background = p.bg;
    document.body.style.color = p.text;
  }, [p]);

React.useEffect(() => {
  if (!token || !me?.id) return;
  
  // Инициализация сокета и загрузка данных (существующий код)
  initSocket();
  Promise.all([/* ... */]).then(/* ... */);

  // 🔔 Инициализация Push-уведомлений
  const initPush = async () => {
    const hasPermission = await requestPushPermission();
    if (hasPermission && import.meta.env.VITE_VAPID_PUBLIC_KEY) {
      try {
        await subscribeToPush(import.meta.env.VITE_VAPID_PUBLIC_KEY);
      } catch (e) {
        console.error('Push subscribe error:', e);
      }
    }
  };
  initPush();
  
  return () => disconnectSocket();
}, [token, me?.id]);

  React.useEffect(() => {
    // ✅ FIX: Используем реактивную переменную ui.toast
    if (ui.toast) {
      const t = setTimeout(() => setUi({ toast: '' }), 3000);
      return () => clearTimeout(t);
    }
  }, [ui.toast, setUi]);

  if (!me || !token) return <AuthScreen />;

  return (
    <div style={s.layout}>
      {/* ✅ FIX: Убраны артефакты & & */}
      {ui.toast && <div style={s.toast}>{ui.toast}</div>}
      <Sidebar />
      <ChatWindow />
      <SettingsModal />
    </div>
  );
}