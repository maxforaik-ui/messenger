import React from 'react';
import { useAppStore } from '../store/useAppStore';
import { trpc, useSendMessage } from '../lib/trpc';
import { themeTokens, createStyles } from '../styles/theme';

// Компонент индикатора статуса с эмодзи
const StatusDot = ({ online, lastSeenAt }: { online?: boolean; lastSeenAt?: string }) => {
  if (online) return <span style={{ marginRight: 6, flexShrink: 0 }}>🟢</span>;
  if (lastSeenAt) {
    const date = new Date(lastSeenAt);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    let timeAgo;
    if (diffMins < 1) timeAgo = 'только что';
    else if (diffMins < 60) timeAgo = `${diffMins} мин назад`;
    else if (diffHours < 24) timeAgo = `${diffHours} ч назад`;
    else timeAgo = `${diffDays} дн назад`;
    
    return <span style={{ marginRight: 6, flexShrink: 0, fontSize: 12 }}>⚫️ {timeAgo}</span>;
  }
  return <span style={{ marginRight: 6, flexShrink: 0 }}>⚪️</span>;
};

export function Sidebar() {
  const { theme, ui, setUi, me, users, chats, activeChatId, setActiveChatId, setChats, setUsers, toggleTheme, setMe, reset } = useAppStore();
  const p = themeTokens[theme];
  const s = React.useMemo(() => createStyles(p), [p]);
  const [name, setName] = React.useState(me?.name || '');
  const [saving, setSaving] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<'chats' | 'users' | 'settings'>('chats');

  const { data: usersData } = trpc.users.list.useQuery(undefined, { enabled: !!me?.id });
  React.useEffect(() => {
    if (usersData) setUsers(usersData);
  }, [usersData, setUsers]);

  const createDirectMutation = trpc.chats.createDirect.useMutation({
    onSuccess: (chat) => {
      setChats(prev => prev.some(c => c.id === chat.id) ? prev : [{ ...chat, pinned: false, draft: '' }, ...prev]);
      setActiveChatId(chat.id);
      setActiveTab('chats');
    }
  });

  const createDirect = async (id: string) => {
    createDirectMutation.mutate({ peerUserId: id });
  };

  const updateMeMutation = trpc.users.updateMe.useMutation({
    onSuccess: (updated) => {
      setMe(updated);
      setUi({ toast: 'Имя обновлено' });
      setSaving(false);
    },
    onError: (err) => {
      setUi({ toast: err.message });
      setSaving(false);
    }
  });

  const saveName = async () => {
    if (!name.trim() || name === me?.name) return;
    setSaving(true);
    updateMeMutation.mutate({ name });
  };

  return (
    <aside style={s.sidebar}>
      {/* Topbar: Только поиск (шестеренка убрана) */}
      <div style={s.sidebarTopbar}>
        <input 
          placeholder="Поиск..." value={ui.search} 
          onChange={e => setUi({ search: e.target.value })} 
          style={{ ...s.searchInput, flex: 1 }} 
        />
      </div>

      {/* Профиль пользователя */}
      <div style={{ ...s.meCard, borderBottom: `1px solid ${p.border}`, padding: 16 }}>
        <div style={{ ...s.meAvatar, width: 56, height: 56, fontSize: 20 }}>
          {me?.name?.split(' ').map(x => x[0]).join('').toUpperCase() || '?'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ ...s.meName, fontSize: 16 }}>{me?.name}</div>
          <div style={s.meMeta}>{me?.email}</div>
        </div>
      </div>

      {/* Вкладки: Чаты | Контакты | Настройки */}
      <div style={{ display: 'flex', gap: 4, padding: '8px 12px', borderBottom: `1px solid ${p.border}` }}>
        <button onClick={() => setActiveTab('chats')} style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: 'none', background: activeTab === 'chats' ? p.accentSoft : 'transparent', color: activeTab === 'chats' ? p.accent : p.muted, cursor: 'pointer', fontWeight: activeTab === 'chats' ? 600 : 400, fontSize: 13 }}>💬 Чаты</button>
        <button onClick={() => setActiveTab('users')} style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: 'none', background: activeTab === 'users' ? p.accentSoft : 'transparent', color: activeTab === 'users' ? p.accent : p.muted, cursor: 'pointer', fontWeight: activeTab === 'users' ? 600 : 400, fontSize: 13 }}>👥 Контакты</button>
        <button onClick={() => setActiveTab('settings')} style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: 'none', background: activeTab === 'settings' ? p.accentSoft : 'transparent', color: activeTab === 'settings' ? p.accent : p.muted, cursor: 'pointer', fontWeight: activeTab === 'settings' ? 600 : 400, fontSize: 13 }}>⚙️</button>
      </div>

      {/* Контент вкладок */}
      <div style={s.panelWrap}>
        {activeTab === 'chats' && (
          <div style={s.chatList}>
            {visibleChats.length === 0 && <div style={s.emptyState}>Нет чатов</div>}
            {visibleChats.map(c => {
              const peer = c.members.find(m => m.user.id !== me?.id)?.user;
              const title = c.isDirect ? peer?.name || 'Личный' : c.title || 'Группа';
              return (
                <div key={c.id} style={{ ...s.chatRowWrap, background: activeChatId === c.id ? p.accentSoft : 'transparent' }}>
                  <button onClick={() => { setActiveChatId(c.id); setActiveTab('chats'); }} style={s.chatRow}>
                    <div style={s.avatarSmall}>{title?.[0]?.toUpperCase() || '#'}</div>
                    <div style={{ flex: 1, textAlign: 'left' }}>
                      <div style={s.chatTopLine}>
                        <span style={s.chatName}>
                          {c.isDirect && <StatusDot online={peer?.online} lastSeenAt={(peer as any)?.lastSeenAt} />}
                          {title}
                        </span>
                      </div>
                      <div style={s.chatSubline}>
                        {c.isDirect 
                          ? (peer?.online ? 'Онлайн' : (peer as any)?.lastSeenAt ? `Был(а) ${new Date((peer as any).lastSeenAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Офлайн')
                          : `${c.members.length} участников`}
                      </div>
                    </div>
                    {!!c.unreadCount && <span style={s.unreadBadge}>{c.unreadCount}</span>}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'users' && (
          <div style={s.userList}>
            {users.filter(u => u.id !== me?.id).map(u => (
              <button key={u.id} onClick={() => createDirect(u.id)} style={s.userRow}>
                <div style={s.avatarSmall}>{u.name?.[0]?.toUpperCase() || '?'}</div>
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <div style={s.userName}>
                    <StatusDot online={u.online} lastSeenAt={(u as any).lastSeenAt} />
                    {u.name}
                  </div>
                  <div style={s.userMeta}>{u.email}</div>
                </div>
                <span style={s.messageCta}>Написать</span>
              </button>
            ))}
          </div>
        )}

        {activeTab === 'settings' && (
          <div style={{ display: 'grid', gap: 16, padding: '12px 8px' }}>
            {/* Тема */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: p.text, marginBottom: 8 }}>Тема оформления</div>
              <div style={s.segmentedRow}>
                <button onClick={() => theme !== 'light' && toggleTheme()} style={theme === 'light' ? s.segmentedActive : s.segmentedBtn}>☀️ Светлая</button>
                <button onClick={() => theme !== 'dark' && toggleTheme()} style={theme === 'dark' ? s.segmentedActive : s.segmentedBtn}>🌙 Тёмная</button>
              </div>
            </div>

            {/* Имя */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: p.text, marginBottom: 8 }}>Ваше имя</div>
              <input value={name} onChange={e => setName(e.target.value)} style={{ ...s.input, marginBottom: 8 }} placeholder="Введите имя" />
              <button onClick={saveName} disabled={saving || name === me?.name} style={{ ...s.primaryBtn, opacity: (saving || name === me?.name) ? 0.6 : 1, cursor: (saving || name === me?.name) ? 'not-allowed' : 'pointer', width: '100%' }}>
                {saving ? 'Сохранение...' : 'Сохранить'}
              </button>
            </div>

            {/* Смена пароля */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: p.text, marginBottom: 8 }}>Безопасность</div>
              <button onClick={() => setUi({ showPasswordModal: true })} style={{ ...s.secondaryBtn, width: '100%', justifyContent: 'flex-start' }}>
                🔐 Сменить пароль
              </button>
            </div>

            {/* Уведомления */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: p.text, marginBottom: 8 }}>Уведомления</div>
              <div style={{ fontSize: 13, color: p.muted, padding: '8px 0' }}>🔔 Push-уведомления активны</div>
            </div>

            {/* Выход */}
            <div style={{ marginTop: 'auto', paddingTop: 16, borderTop: `1px solid ${p.border}` }}>
              <button onClick={() => reset()} style={{ ...s.dangerBtn, width: '100%' }}>🚪 Выйти из аккаунта</button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}