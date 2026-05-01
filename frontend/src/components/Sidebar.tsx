import React from 'react';
import { useAppStore } from '../store/useAppStore';
import { themeTokens, createStyles } from '../styles/theme';
import { authFetch, createIdempotencyKey } from '../lib/api';

// Компонент индикатора статуса
const StatusDot = ({ online }: { online?: boolean }) => (
  <span style={{
    display: 'inline-block',
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: online ? '#22c55e' : '#9ca3af',
    marginRight: 6,
    flexShrink: 0
  }} />
);

export function Sidebar() {
  const { theme, ui, setUi, me, users, chats, activeChatId, setActiveChatId, setChats, setUsers, toggleTheme, setMe, reset } = useAppStore();
  const p = themeTokens[theme];
  const s = React.useMemo(() => createStyles(p), [p]);
  
  const [name, setName] = React.useState(me?.name || '');
  const [saving, setSaving] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<'chats' | 'users' | 'settings'>('chats');

  React.useEffect(() => {
    if (!me?.id) return;
    authFetch('/users')
      .then(r => r.json())
      .then(data => setUsers(data))
      .catch(console.error);
  }, [me?.id, setUsers]);

  const visibleChats = React.useMemo(() => {
    const search = ui.search.toLowerCase();
    return chats
      .filter(c => {
        const peer = c.members.find(m => m.user.id !== me?.id)?.user;
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
    setActiveTab('chats');
  };

  const saveName = async () => {
    if (!name.trim() || name === me?.name) return;
    setSaving(true);
    try {
      const res = await authFetch('/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      if (!res.ok) throw new Error('Ошибка сохранения');
      const updated = await res.json();
      setMe(updated);
      setUi({ toast: 'Имя обновлено' });
    } catch (e: any) {
      setUi({ toast: e.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <aside style={s.sidebar}>
      {/* Topbar: Поиск + Настройки (⚙️) */}
      <div style={s.sidebarTopbar}>
        <input 
          placeholder="Поиск..." 
          value={ui.search} 
          onChange={e => setUi({ search: e.target.value })} 
          style={{ ...s.searchInput, flex: 1 }} 
        />
        {/* Кнопка настроек открывает SettingsModal (смена пароля) */}
        <button style={s.iconBtn} onClick={() => setUi({ showSettings: true })} title="Настройки">⚙️</button>
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
        <button 
          onClick={() => setActiveTab('chats')}
          style={{ 
            flex: 1, 
            padding: '8px 12px', 
            borderRadius: 8, 
            border: 'none', 
            background: activeTab === 'chats' ? p.accentSoft : 'transparent',
            color: activeTab === 'chats' ? p.accent : p.muted,
            cursor: 'pointer',
            fontWeight: activeTab === 'chats' ? 600 : 400,
            fontSize: 13
          }}
        >
          💬 Чаты
        </button>
        <button 
          onClick={() => setActiveTab('users')}
          style={{ 
            flex: 1, 
            padding: '8px 12px', 
            borderRadius: 8, 
            border: 'none', 
            background: activeTab === 'users' ? p.accentSoft : 'transparent',
            color: activeTab === 'users' ? p.accent : p.muted,
            cursor: 'pointer',
            fontWeight: activeTab === 'users' ? 600 : 400,
            fontSize: 13
          }}
        >
          👥 Контакты
        </button>
        <button 
          onClick={() => setActiveTab('settings')}
          style={{ 
            flex: 1, 
            padding: '8px 12px', 
            borderRadius: 8, 
            border: 'none', 
            background: activeTab === 'settings' ? p.accentSoft : 'transparent',
            color: activeTab === 'settings' ? p.accent : p.muted,
            cursor: 'pointer',
            fontWeight: activeTab === 'settings' ? 600 : 400,
            fontSize: 13
          }}
        >
          ⚙️
        </button>
      </div>

      {/* Контент вкладок */}
      <div style={s.panelWrap}>
        {/* Вкладка ЧАТЫ */}
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
                          {c.isDirect && <StatusDot online={peer?.online} />}
                          {title}
                        </span>
                      </div>
                      <div style={s.chatSubline}>
                        {c.isDirect ? (peer?.online ? 'online' : 'offline') : `${c.members.length} участников`}
                      </div>
                    </div>
                    {!!c.unreadCount && <span style={s.unreadBadge}>{c.unreadCount}</span>}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Вкладка КОНТАКТЫ */}
        {activeTab === 'users' && (
          <div style={s.userList}>
            {users.filter(u => u.id !== me?.id).map(u => (
              <button key={u.id} onClick={() => createDirect(u.id)} style={s.userRow}>
                <div style={s.avatarSmall}>{u.name?.[0]?.toUpperCase() || '?'}</div>
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <div style={s.userName}>
                    <StatusDot online={u.online} />
                    {u.name}
                  </div>
                  <div style={s.userMeta}>{u.email}</div>
                </div>
                <span style={s.messageCta}>Написать</span>
              </button>
            ))}
          </div>
        )}

        {/* Вкладка НАСТРОЙКИ */}
        {activeTab === 'settings' && (
          <div style={{ display: 'grid', gap: 16, padding: '12px 8px' }}>
            {/* Тема */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: p.text, marginBottom: 8 }}>Тема оформления</div>
              <div style={s.segmentedRow}>
                <button 
                  onClick={() => theme !== 'light' && toggleTheme()} 
                  style={theme === 'light' ? s.segmentedActive : s.segmentedBtn}
                >
                  ☀️ Светлая
                </button>
                <button 
                  onClick={() => theme !== 'dark' && toggleTheme()} 
                  style={theme === 'dark' ? s.segmentedActive : s.segmentedBtn}
                >
                  🌙 Тёмная
                </button>
              </div>
            </div>

            {/* Имя */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: p.text, marginBottom: 8 }}>Ваше имя</div>
              <input 
                value={name} 
                onChange={e => setName(e.target.value)} 
                style={{ ...s.input, marginBottom: 8 }}
                placeholder="Введите имя"
              />
              <button 
                onClick={saveName} 
                disabled={saving || name === me?.name}
                style={{ 
                  ...s.primaryBtn, 
                  opacity: (saving || name === me?.name) ? 0.6 : 1,
                  cursor: (saving || name === me?.name) ? 'not-allowed' : 'pointer',
                  width: '100%'
                }}
              >
                {saving ? 'Сохранение...' : 'Сохранить'}
              </button>
            </div>

            {/* Смена пароля — ссылка на модалку */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: p.text, marginBottom: 8 }}>Безопасность</div>
              <button 
                onClick={() => setUi({ showSettings: true })}
                style={{ ...s.secondaryBtn, width: '100%', justifyContent: 'flex-start' }}
              >
                🔐 Сменить пароль
              </button>
            </div>

            {/* Уведомления */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: p.text, marginBottom: 8 }}>Уведомления</div>
              <div style={{ fontSize: 13, color: p.muted, padding: '8px 0' }}>
                🔔 Push-уведомления активны
              </div>
            </div>

            {/* Выход */}
            <div style={{ marginTop: 'auto', paddingTop: 16, borderTop: `1px solid ${p.border}` }}>
              <button onClick={() => reset()} style={{ ...s.dangerBtn, width: '100%' }}>
                🚪 Выйти из аккаунта
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}