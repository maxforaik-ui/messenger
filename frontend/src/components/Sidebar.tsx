import React from 'react';
import { useAppStore } from '../store/useAppStore';
import { themeTokens, createStyles } from '../styles/theme';
import { authFetch, createIdempotencyKey } from '../lib/api';

export function Sidebar() {
  // ✅ FIX: Добавлен 'setUsers'
  const { theme, ui, setUi, me, users, chats, activeChatId, setActiveChatId, setChats, setUsers } = useAppStore();
  const p = themeTokens[theme];
  const s = React.useMemo(() => createStyles(p), [p]);

  React.useEffect(() => {
    if (!me?.id || users.length > 0) return;
    authFetch('/users')
      .then(r => r.json())
      .then(setUsers)
      .catch(() => {});
  }, [me?.id, users.length, setUsers]);

  const visibleChats = React.useMemo(() => {
    const search = ui.search.toLowerCase();
    return chats
      .filter(c => {
        const peer = c.members.find(m => m.user.id !== me?.id)?.user; // ✅ FIX: m =>
        const title = c.isDirect ? peer?.name || 'Личный' : c.title || 'Группа';
        return title.toLowerCase().includes(search);
      })
      .sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned));
  }, [chats, ui.search, me?.id]);

  const createDirect = async (id: string) => {
    const idem = createIdempotencyKey();
    const res = await authFetch('/chats/direct', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ peerUserId: id })
    });
    const chat = await res.json();
    setChats(prev => prev.some(c => c.id === chat.id) ? prev : [{ ...chat, pinned: false, draft: '' }, ...prev]);
    setActiveChatId(chat.id);
    setUi({ showUsers: false });
  };

  return (
    <aside style={s.sidebar}>
      <div style={s.sidebarTopbar}>
        {/* ✅ FIX: () => */}
        <button style={s.iconBtn} onClick={() => setUi({ showUsers: !ui.showUsers })}>☰</button>
        <input placeholder="Поиск..." value={ui.search} onChange={e => setUi({ search: e.target.value })} style={s.searchInput} />
        <button style={s.iconBtn} onClick={() => setUi({ showSettings: true })}>⚙️</button>
      </div>

      <div style={s.meCard}>
        <div style={s.meAvatar}>{me?.name?.split(' ').map(x => x[0]).join('').toUpperCase() || '?'}</div>
        <div style={{ flex: 1 }}>
          <div style={s.meName}>{me?.name}</div>
          <div style={s.meMeta}>{me?.email}</div>
        </div>
        <button style={s.logoutBtn} onClick={() => useAppStore.getState().reset()}>Выйти</button>
      </div>

      {ui.showUsers ? (
        <div style={s.panelWrap}>
          <div style={s.userList}>
            {users.filter(u => u.id !== me?.id).map(u => (
              <button key={u.id} onClick={() => createDirect(u.id)} style={s.userRow}>
                <div style={s.avatarSmall}>{u.name?.[0]?.toUpperCase() || '?'}</div>
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <div style={s.userName}>{u.name}</div>
                  <div style={s.userMeta}>{u.email}</div>
                </div>
                <span style={s.messageCta}>Написать</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div style={s.panelWrap}>
          <div style={s.chatList}>
            {/* ✅ FIX: && */}
            {visibleChats.length === 0 && <div style={s.emptyState}>Нет чатов</div>}
            {visibleChats.map(c => {
              const peer = c.members.find(m => m.user.id !== me?.id)?.user;
              const title = c.isDirect ? peer?.name || 'Личный' : c.title || 'Группа';
              return (
                <div key={c.id} style={{ ...s.chatRowWrap, background: activeChatId === c.id ? p.accentSoft : 'transparent' }}>
                  <button onClick={() => setActiveChatId(c.id)} style={s.chatRow}>
                    <div style={s.avatarSmall}>{title?.[0]?.toUpperCase() || '#'}</div>
                    <div style={{ flex: 1, textAlign: 'left' }}>
                      <div style={s.chatTopLine}><span style={s.chatName}>{title}</span></div>
                      <div style={s.chatSubline}>{c.isDirect ? (peer?.online ? 'online' : 'offline') : `${c.members.length} участников`}</div>
                    </div>
                    {!!c.unreadCount && <span style={s.unreadBadge}>{c.unreadCount}</span>}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </aside>
  );
}