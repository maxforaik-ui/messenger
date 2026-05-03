import React from 'react';
import { useAppStore } from '../store/useAppStore';
import { authFetch } from '../lib/api';

// Компонент индикатора статуса
const StatusDot = ({ online }: { online?: boolean }) => (
  <span className={`inline-block w-2 h-2 rounded-full mr-1.5 flex-shrink-0 ${online ? 'bg-[#22c55e]' : 'bg-[#9ca3af]'}`} />
);

// === МОДАЛКА СОЗДАНИЯ ГРУППЫ ===
function CreateGroupModal({ onClose }: { onClose: () => void }) {
  const { me, users, setChats, setUi } = useAppStore();
  const [title, setTitle] = React.useState('');
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(false);

  const toggleUser = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleCreate = async () => {
    if (!title.trim() || selectedIds.length === 0) {
      return setUi({ toast: 'Введите название и выберите участников' });
    }
    setLoading(true);
    try {
      const res = await authFetch('/chats/group', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, memberIds: selectedIds })
      });
      if (!res.ok) throw new Error((await res.json()).message);
      const chat = await res.json();
      setChats(prev => [chat, ...prev]);
      setUi({ toast: 'Группа создана' });
      onClose();
    } catch (e: any) {
      setUi({ toast: e.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 grid place-items-center z-[100] p-4">
      <div className="bg-[var(--color-surface)] w-full max-w-sm rounded-2xl border border-[var(--color-border)] shadow-xl overflow-hidden">
        <div className="p-4 border-b border-[var(--color-border)] font-bold text-[var(--color-text)]">Новая группа</div>
        <div className="p-4 space-y-4">
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Название группы"
            className="w-full py-2.5 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-sidebar-alt)] text-[var(--color-text)] outline-none"
          />
          <div className="max-h-40 overflow-y-auto space-y-1">
            {users.filter(u => u.id !== me?.id).map(u => (
              <label key={u.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--color-sidebar-alt)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(u.id)}
                  onChange={() => toggleUser(u.id)}
                  className="w-4 h-4 rounded border-[var(--color-border)] accent-[var(--color-accent)]"
                />
                <div className="flex-1">
                  <div className="text-sm font-medium text-[var(--color-text)]">{u.name}</div>
                  <div className="text-xs text-[var(--color-text-muted)]">{u.email}</div>
                </div>
              </label>
            ))}
          </div>
        </div>
        <div className="p-3 border-t border-[var(--color-border)] flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-xl border border-[var(--color-border)] text-[var(--color-text)] cursor-pointer">
            Отмена
          </button>
          <button onClick={handleCreate} disabled={loading} className="px-4 py-2 rounded-xl bg-[var(--color-accent)] text-white cursor-pointer disabled:opacity-50">
            Создать
          </button>
        </div>
      </div>
    </div>
  );
}

export function Sidebar() {
  const {
    theme, ui, setUi, me, users, chats, activeChatId,
    setActiveChatId, setChats, setUsers, toggleTheme,
    setMe, reset, drafts
  } = useAppStore();
  const [name, setName] = React.useState(me?.name || '');
  const [saving, setSaving] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<'chats' | 'users' | 'settings'>('chats');
  const [showCreateGroup, setShowCreateGroup] = React.useState(false);
  
  const avatarInputRef = React.useRef<HTMLInputElement>(null);
  const [avatarUploading, setAvatarUploading] = React.useState(false);

  // Загрузка пользователей при входе
  React.useEffect(() => {
    if (!me?.id) return;
    authFetch('/users').then(r => r.json()).then(data => setUsers(data)).catch(console.error);
  }, [me?.id, setUsers]);

  // Загрузка аватара
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    try {
      const form = new FormData();
      form.append('avatar', file);
      const res = await authFetch('/me/avatar', { method: 'POST', body: form });
      if (!res.ok) throw new Error((await res.json()).message);
      const data = await res.json();
      setMe(data.user);
      setUi({ toast: 'Аватар обновлен' });
    } catch (err: any) {
      setUi({ toast: err.message });
    } finally {
      setAvatarUploading(false);
    }
  };

  // Фильтрация и сортировка чатов
  const visibleChats = React.useMemo(() => {
    const search = ui.search.toLowerCase();
    const filtered = chats.filter(c => {
      const peer = c.members.find(m => m.user.id !== me?.id)?.user;
      const title = c.isDirect ? peer?.name || 'Личный' : c.title || 'Группа';
      return title.toLowerCase().includes(search);
    });
    return filtered.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return 0;
    });
  }, [chats, ui.search, me?.id]);

  // Создание прямого чата
  const createDirect = async (id: string) => {
    try {
      const res = await authFetch('/chats/direct', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ peerUserId: id })
      });
      const chat = await res.json();
      setChats(prev => prev.some(c => c.id === chat.id) ? prev : [{ ...chat, pinned: false, draft: '' }, ...prev]);
      setActiveChatId(chat.id);
      setActiveTab('chats');
    } catch (e) { console.error(e); }
  };

  // Сохранение имени
  const saveName = async () => {
    if (!name.trim() || name === me?.name) return;
    setSaving(true);
    try {
      const res = await authFetch('/me', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
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
    <aside className="w-[320px] min-w-[260px] bg-[var(--color-sidebar)] border-r border-[var(--color-border)] flex flex-col h-full z-10">
      {/* Topbar: Поиск */}
      <div className="flex gap-2.5 items-center p-3.5 border-b border-[var(--color-border)]">
        <input
          placeholder="Поиск..." value={ui.search}
          onChange={e => setUi({ search: e.target.value })}
          className="flex-1 py-3 px-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-sidebar-alt)] text-[var(--color-text)] outline-none"
        />
      </div>

      {/* Профиль пользователя */}
      <div 
        className="flex gap-3 items-center p-4 border-b border-[var(--color-border)] cursor-pointer hover:bg-[var(--color-sidebar-alt)] transition-colors" 
        onClick={() => setActiveTab('settings')}
      >
        <div className="w-14 h-14 rounded-full bg-[var(--color-accent)] text-white grid place-items-center text-xl font-bold flex-shrink-0 overflow-hidden relative">
          {me?.avatarUrl ? (
            <img src={me.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
          ) : (
            me?.name?.split(' ').map(x => x[0]).join('').toUpperCase() || '?'
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-[var(--color-text)] truncate text-base">{me?.name}</div>
          <div className="text-[13px] text-[var(--color-text-muted)] truncate">{me?.email}</div>
        </div>
      </div>

      {/* Вкладки */}
      <div className="flex gap-1 p-2 pt-3 border-b border-[var(--color-border)]">
        <button onClick={() => setActiveTab('chats')} className={`flex-1 py-2 px-3 rounded-lg text-sm cursor-pointer font-semibold ${activeTab === 'chats' ? 'bg-[var(--color-accent-soft)] text-[var(--color-accent)]' : 'bg-transparent text-[var(--color-text-muted)]'}`}>💬 Чаты</button>
        <button onClick={() => setActiveTab('users')} className={`flex-1 py-2 px-3 rounded-lg text-sm cursor-pointer font-semibold ${activeTab === 'users' ? 'bg-[var(--color-accent-soft)] text-[var(--color-accent)]' : 'bg-transparent text-[var(--color-text-muted)]'}`}>👥 Контакты</button>
        <button onClick={() => setActiveTab('settings')} className={`flex-1 py-2 px-3 rounded-lg text-sm cursor-pointer font-semibold ${activeTab === 'settings' ? 'bg-[var(--color-accent-soft)] text-[var(--color-accent)]' : 'bg-transparent text-[var(--color-text-muted)]'}`}>⚙️ Настройки</button>
      </div>

      {/* Контент вкладок */}
      <div className="flex-1 overflow-y-auto p-2.5">
        
        {/* === Вкладка ЧАТЫ === */}
        {activeTab === 'chats' && (
          <div className="grid gap-0.5">
            {visibleChats.length === 0 && <div className="p-2.5 text-[var(--color-text-muted)] text-sm text-center mt-5">Нет чатов</div>}
            {visibleChats.map(c => {
              const peer = c.members.find(m => m.user.id !== me?.id)?.user;
              const title = c.isDirect ? peer?.name || 'Личный' : c.title || 'Группа';
              const draftText = drafts[c.id];
              const preview = draftText ? `✏️ ${draftText}` : (c.messages?.[0]?.body || 'Нет сообщений');
              
              return (
                <div key={c.id} className={`rounded-[14px] transition-colors ${activeChatId === c.id ? 'bg-[var(--color-accent-soft)]' : 'bg-transparent'}`}>
                  <button onClick={() => { setActiveChatId(c.id); setActiveTab('chats'); }} className="flex items-center gap-3 w-full border-none p-2.5 rounded-[14px] cursor-pointer bg-transparent text-[var(--color-text)] text-left">
                    <div className="w-[42px] h-[42px] rounded-full bg-[var(--color-accent-soft)] text-[var(--color-accent)] grid place-items-center font-bold flex-shrink-0 overflow-hidden">
                      {(c as any).avatarUrl ? <img src={(c as any).avatarUrl} className="w-full h-full object-cover" /> : (title?.[0]?.toUpperCase() || '#')}
                      {!c.isDirect && <span className="absolute -bottom-1 -right-1 bg-[var(--color-accent)] text-white text-[8px] px-1 rounded-full border-2 border-[var(--color-sidebar)]">👥</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center gap-2">
                        <span className="font-bold text-[var(--color-text)] truncate flex items-center">
                          {c.isDirect && <StatusDot online={peer?.online} />}
                          {title}
                        </span>
                      </div>
                      <div className={`text-[13px] truncate whitespace-nowrap overflow-hidden text-ellipsis ${draftText ? 'text-[var(--color-accent)] font-medium' : 'text-[var(--color-text-muted)]'}`}>
                        {preview}
                      </div>
                    </div>
                    {!!c.unreadCount && <span className="min-w-[22px] h-[22px] rounded-full bg-[var(--color-accent)] text-white grid place-items-center text-[12px] px-1.5 mr-2">{c.unreadCount}</span>}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* === Вкладка КОНТАКТЫ === */}
        {activeTab === 'users' && (
          <div className="grid gap-1">
            {users.filter(u => u.id !== me?.id).map(u => (
              <button key={u.id} onClick={() => createDirect(u.id)} className="flex items-center gap-3 w-full border-none bg-transparent p-2.5 rounded-[14px] cursor-pointer text-left">
                <div className="w-[42px] h-[42px] rounded-full bg-[var(--color-accent-soft)] text-[var(--color-accent)] grid place-items-center font-bold flex-shrink-0 overflow-hidden">
                  {u.avatarUrl ? <img src={u.avatarUrl} className="w-full h-full object-cover" /> : (u.name?.[0]?.toUpperCase() || '?')}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-[var(--color-text)] flex items-center">
                    <StatusDot online={u.online} />
                    {u.name}
                  </div>
                  <div className="text-[12px] text-[var(--color-text-muted)]">{u.email}</div>
                </div>
                <span className="text-[var(--color-accent)] font-bold text-[13px]">Написать</span>
              </button>
            ))}
          </div>
        )}

        {/* === Вкладка НАСТРОЙКИ === */}
        {activeTab === 'settings' && (
          <div className="grid gap-4 p-2">
            
            {/* Аватар */}
            <div>
              <div className="text-[13px] font-semibold text-[var(--color-text)] mb-2">Ваш аватар</div>
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-full bg-[var(--color-accent)] text-white grid place-items-center text-xl font-bold flex-shrink-0 overflow-hidden relative cursor-pointer" onClick={() => avatarInputRef.current?.click()}>
                  {me?.avatarUrl ? (
                    <img src={me.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                  ) : (
                    me?.name?.split(' ').map(x => x[0]).join('').toUpperCase() || '?'
                  )}
                  {avatarUploading && <div className="absolute inset-0 bg-black/50 grid place-items-center">⏳</div>}
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    📷
                  </div>
                </div>
                <input type="file" ref={avatarInputRef} hidden accept="image/*" onChange={handleAvatarUpload} />
                <button onClick={() => avatarInputRef.current?.click()} className="text-[var(--color-accent)] text-sm font-semibold cursor-pointer hover:underline">
                  Изменить
                </button>
              </div>
            </div>

            {/* Тема */}
            <div>
              <div className="text-[13px] font-semibold text-[var(--color-text)] mb-2">Тема оформления</div>
              <div className="flex gap-2">
                <button onClick={() => theme !== 'light' && toggleTheme()} className={`flex-1 py-2.5 px-3 rounded-xl border cursor-pointer text-sm ${theme === 'light' ? 'border-none bg-[var(--color-accent-soft)] text-[var(--color-accent)] font-bold' : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)]'}`}>☀️ Светлая</button>
                <button onClick={() => theme !== 'dark' && toggleTheme()} className={`flex-1 py-2.5 px-3 rounded-xl border cursor-pointer text-sm ${theme === 'dark' ? 'border-none bg-[var(--color-accent-soft)] text-[var(--color-accent)] font-bold' : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)]'}`}>🌙 Тёмная</button>
              </div>
            </div>

            {/* Имя */}
            <div>
              <div className="text-[13px] font-semibold text-[var(--color-text)] mb-2">Ваше имя</div>
              <input value={name} onChange={e => setName(e.target.value)} className="w-full py-3 px-3.5 rounded-xl border border-[var(--color-border)] outline-none bg-[var(--color-surface)] text-[var(--color-text)] box-border mb-2" placeholder="Введите имя" />
              <button onClick={saveName} disabled={saving || name === me?.name} className="w-full py-2.5 px-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] cursor-pointer font-semibold disabled:opacity-60">
                {saving ? 'Сохранение...' : 'Сохранить'}
              </button>
            </div>

            {/* Группы */}
            <div>
              <div className="text-[13px] font-semibold text-[var(--color-text)] mb-2">Управление</div>
              <button onClick={() => setShowCreateGroup(true)} className="w-full py-2.5 px-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] cursor-pointer font-semibold text-left mb-2">
                ➕ Создать группу
              </button>
            </div>

            {/* Безопасность */}
            <div>
               <div className="text-[13px] font-semibold text-[var(--color-text)] mb-2">Безопасность</div>
               <button onClick={() => setUi({ showPasswordModal: true })} className="w-full py-2.5 px-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] cursor-pointer font-semibold text-left">
                 🔐 Сменить пароль
               </button>
            </div>

            {/* Выход */}
            <div className="mt-auto pt-4 border-t border-[var(--color-border)]">
              <button onClick={() => reset()} className="w-full py-2.5 px-3.5 rounded-xl border-none bg-[#dc2626] text-white cursor-pointer font-bold">🚪 Выйти из аккаунта</button>
            </div>
          </div>
        )}
      </div>

      {/* Модалка создания группы */}
      {showCreateGroup && <CreateGroupModal onClose={() => setShowCreateGroup(false)} />}
    </aside>
  );
}