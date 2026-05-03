import React, { useRef, useState, useEffect } from 'react';
import { useAppStore, Message } from '../store/useAppStore';
import { authFetch } from '../lib/api';
import { getSocket } from '../lib/socket';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';

// === МОДАЛКА ПЕРЕСЫЛКИ ===
function ForwardModal({
  message,
  onClose
}: {
  message: Message;
  onClose: () => void;
}) {
  const { chats, me, setUi } = useAppStore();
  const [loading, setLoading] = useState(false);

  const handleForward = async (targetChatId: string) => {
    setLoading(true);
    try {
      const res = await authFetch(`/messages/${message.id}/forward`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetChatId })
      });
      if (!res.ok) throw new Error((await res.json()).message);
      setUi({ toast: 'Сообщение переслано' });
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
        <div className="p-4 border-b border-[var(--color-border)] font-bold text-[var(--color-text)]">
          Переслать сообщение
        </div>
        <div className="max-h-60 overflow-y-auto p-2">
          {chats.filter(c => c.id !== message.chatId).map(chat => {
            const peer = chat.members.find(m => m.user.id !== me?.id)?.user;
            const chatName = chat.isDirect ? peer?.name || 'Личный чат' : chat.title || 'Группа';
            const subtext = chat.isDirect ? peer?.email : `${chat.members.length} участников`;
            
            return (
              <button 
                key={chat.id} 
                onClick={() => handleForward(chat.id)} 
                disabled={loading}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-[var(--color-sidebar-alt)] transition-colors text-left disabled:opacity-50"
              >
                <div className="w-10 h-10 rounded-full bg-[var(--color-accent-soft)] text-[var(--color-accent)] grid place-items-center font-bold flex-shrink-0">
                  {chatName[0]?.toUpperCase() || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-[var(--color-text)] truncate">{chatName}</div>
                  <div className="text-xs text-[var(--color-text-muted)] truncate">{subtext}</div>
                </div>
              </button>
            );
          })}
        </div>
        <div className="p-3 border-t border-[var(--color-border)] flex justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-xl border border-[var(--color-border)] text-[var(--color-text)] cursor-pointer">
            Отмена
          </button>
        </div>
      </div>
    </div>
  );
}

// === МОДАЛКА СОЗДАНИЯ ГРУППЫ ===
function CreateGroupModal({ onClose }: { onClose: () => void }) {
  const { me, users, setChats, setUi } = useAppStore();
  const [title, setTitle] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

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
        <div className="p-4 border-b border-[var(--color-border)] font-bold text-[var(--color-text)]">
          Новая группа
        </div>
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

// === МОДАЛКА НАСТРОЕК ГРУППЫ ===
function GroupSettingsModal({ chat, onClose }: { chat: any; onClose: () => void }) {
  const { me, users, setChats, setUi, setActiveChatId } = useAppStore();
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (chat?.id) {
      authFetch(`/chats/${chat.id}/members`)
        .then(r => r.json())
        .then(setMembers)
        .catch(console.error);
    }
  }, [chat]);

  const handleAddMember = async () => {
    const user = users.find(u => u.name.toLowerCase().includes(search.toLowerCase()));
    if (!user) return;
    setLoading(true);
    try {
      await authFetch(`/chats/${chat.id}/members`, { 
        method: 'POST', 
        headers: {'Content-Type':'application/json'}, 
        body: JSON.stringify({ userId: user.id }) 
      });
      setMembers(prev => [...prev, { user }]);
      setSearch('');
      setUi({ toast: 'Участник добавлен' });
    } catch (e) { 
      setUi({ toast: 'Ошибка добавления' }); 
    } finally { 
      setLoading(false); 
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!window.confirm('Удалить участника?')) return;
    try {
      await authFetch(`/chats/${chat.id}/members/${userId}`, { method: 'DELETE' });
      setMembers(prev => prev.filter(m => m.user.id !== userId));
      setUi({ toast: 'Участник удалён' });
    } catch (e) { 
      setUi({ toast: 'Ошибка удаления' }); 
    }
  };

  const handleDeleteChat = async () => {
    if (!window.confirm(chat.members?.length > 2 ? 'Удалить группу для всех?' : 'Покинуть группу?')) return;
    try {
      await authFetch(`/chats/${chat.id}`, { method: 'DELETE' });
      setChats(prev => prev.filter(c => c.id !== chat.id));
      setActiveChatId('');
      onClose();
      setUi({ toast: 'Готово' });
    } catch (e) { 
      setUi({ toast: 'Ошибка' }); 
    }
  };

  const isOwner = members.some(m => m.userId === me?.id && m.role === 'owner');

  return (
    <div className="fixed inset-0 bg-black/50 grid place-items-center z-[100] p-4">
      <div className="bg-[var(--color-surface)] w-full max-w-md rounded-2xl border border-[var(--color-border)] shadow-xl overflow-hidden flex flex-col max-h-[80vh]">
        <div className="p-4 border-b border-[var(--color-border)] flex justify-between items-center">
          <div className="font-bold text-[var(--color-text)]">Настройки группы</div>
          <button onClick={onClose} className="text-xl text-[var(--color-text-muted)]">×</button>
        </div>
        
        <div className="p-4 overflow-y-auto flex-1">
          {/* Участники */}
          <div className="mb-4">
            <div className="text-sm font-semibold text-[var(--color-text-muted)] mb-2">Участники ({members.length})</div>
            <div className="space-y-2">
              {members.map(m => (
                <div key={m.user.id} className="flex items-center justify-between p-2 rounded-lg bg-[var(--color-sidebar-alt)]">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-[var(--color-accent)] text-white grid place-items-center text-xs">
                      {m.user.name?.[0] || '?'}
                    </div>
                    <div className="text-sm text-[var(--color-text)]">
                      {m.user.name} {m.role === 'owner' && '👑'}
                    </div>
                  </div>
                  {isOwner && m.userId !== me?.id && (
                    <button onClick={() => handleRemoveMember(m.user.id)} className="text-red-500 hover:bg-red-50 px-2 py-1 rounded text-xs">
                      Удалить
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Добавить участника */}
          {isOwner && (
            <div className="flex gap-2 mb-6">
              <input 
                value={search} 
                onChange={e => setSearch(e.target.value)} 
                placeholder="Имя участника" 
                className="flex-1 py-2 px-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] text-sm outline-none" 
              />
              <button onClick={handleAddMember} disabled={loading || !search} className="px-3 py-2 bg-[var(--color-accent)] text-white rounded-lg text-sm disabled:opacity-50">
                +
              </button>
            </div>
          )}
        </div>

        {/* Удаление группы */}
        <div className="p-4 border-t border-[var(--color-border)]">
           {isOwner ? (
             <button onClick={handleDeleteChat} className="w-full py-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 font-semibold">
               🗑️ Удалить группу
             </button>
           ) : (
             <button onClick={handleDeleteChat} className="w-full py-2 rounded-xl border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-sidebar-alt)]">
               🚪 Покинуть группу
             </button>
           )}
        </div>
      </div>
    </div>
  );
}

// === КОМПОНЕНТ ПУЗЫРЯ СООБЩЕНИЯ ===
function MessageBubble({
  msg, isMine, onReply, onEdit, onDelete, onReaction, readStatus, openContextMenu, onForward
}: {
  msg: Message; isMine: boolean; onReply: () => void; onEdit: () => void;
  onDelete: () => void; onReaction: (emoji: string) => void;
  readStatus: 'sent' | 'delivered' | 'read'; openContextMenu: (e: React.MouseEvent, msg: Message) => void; onForward: () => void;
}) {
  return (
    <div className={`flex mb-2 relative cursor-context-menu ${isMine ? 'justify-end' : 'justify-start'}`} id={`msg-${msg.id}`} onContextMenu={(e) => { e.preventDefault(); openContextMenu(e, msg); }}>
      <div className={`max-w-[560px] rounded-[18px] px-3 py-2.5 shadow-sm break-words ${isMine ? 'bg-[var(--color-outgoing)] self-end' : 'bg-[var(--color-incoming)] self-start'}`}>
        
        {msg.replyTo && (
          <div className={`mb-2 p-2 rounded-xl text-xs ${isMine ? 'bg-black/5' : 'bg-[var(--color-accent-soft)]'}`}>
            <strong>{msg.replyTo.senderName || 'Пользователь'}: </strong>
            <div className="opacity-80 truncate">{msg.replyTo.body || 'Вложение'}</div>
          </div>
        )}

        {msg.body && (
          <div className={`text-[var(--color-text)] whitespace-pre-wrap leading-snug ${msg.deletedAt ? 'italic opacity-60' : ''}`}>
            {msg.deletedAt ? 'Сообщение удалено' : msg.body}
          </div>
        )}

        {msg.attachments?.map(att => (
          <div key={att.id} className="mt-1 bg-black/5 rounded-lg p-1">
            {att.mimeType.startsWith('image/') ? (
              <img src={att.url} alt="attach" className="max-w-[250px] max-h-[200px] rounded-md object-cover cursor-pointer" />
            ) : (
              <a href={att.url} target="_blank" rel="noreferrer" className="text-[var(--color-accent)] text-sm underline block truncate">📎 {att.originalName}</a>
            )}
          </div>
        ))}

        {Object.keys(msg.reactions || {}).length > 0 && (
          <div className="flex gap-1 mt-1 flex-wrap">
            {Object.entries(msg.reactions).map(([emoji, count]) => (
              <span key={emoji} onClick={() => onReaction(emoji)} className="px-1.5 py-0.5 bg-[var(--color-sidebar-alt)] rounded-full text-xs border border-[var(--color-border)] cursor-pointer hover:scale-110 transition-transform select-none">
                {emoji} <sub>{count}</sub>
              </span>
            ))}
          </div>
        )}

        <div className="flex justify-between items-center mt-1.5 gap-2 select-none">
          <div className="flex items-center gap-1 text-[11px] text-[var(--color-text-muted)]">
            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            {isMine && !msg.deletedAt && (
              <span className="ml-0.5">
                {readStatus === 'sent' && <span>✓</span>}
                {readStatus === 'delivered' && <span>✓✓</span>}
                {readStatus === 'read' && <span className="text-[#3b82f6]">✓✓</span>}
              </span>
            )}
          </div>
          <button onClick={(e) => { e.stopPropagation(); openContextMenu(e as any, msg); }} className="text-lg text-[var(--color-text-muted)] hover:text-[var(--color-text)] p-0.5 -mr-1 rounded transition-colors">
            ⋮
          </button>
        </div>
      </div>
    </div>
  );
}

// === ОСНОВНОЙ КОМПОНЕНТ ===
export function ChatWindow() {
  const { activeChatId, messages, setMessages, me, typingUsers, chats, setChats, setUi, drafts, setDraft } = useAppStore();
  
  // ✅ ИСПОЛЬЗУЕМ ЧЕРНОВИК ИЗ STORE ДЛЯ КОНКРЕТНОГО ЧАТА
  const draft = activeChatId ? (drafts[activeChatId] || '') : '';
  
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; message: Message } | null>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [hasUserScrolled, setHasUserScrolled] = useState(false);
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [forwardingMessage, setForwardingMessage] = useState<Message | null>(null);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showGroupSettings, setShowGroupSettings] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const chat = chats.find(c => c.id === activeChatId);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const peerUser = chat?.members.find(m => m.user.id !== me?.id)?.user;
  const typingLabel = typingUsers[activeChatId || ''] ? 'печатает…' : '';
  const isPeerOnline = (peerUser as any)?.online;
  const chatTitle = chat?.isDirect ? peerUser?.name : chat?.title;
  const chatAvatar = chat?.isDirect ? (peerUser as any)?.avatarUrl : (chat as any)?.avatarUrl;

  // 1. Отслеживание скролла
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 50;
      setIsAtBottom(isNearBottom);
      if (!isNearBottom) setHasUserScrolled(true);
    };
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // 2. Сброс при смене чата
  useEffect(() => {
    setHasUserScrolled(false);
    setIsAtBottom(true);
  }, [activeChatId]);

  // 3. Авто-скролл
  useEffect(() => {
    if (messages.length > 0 && !isLoading && isAtBottom && !hasUserScrolled) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
    }
  }, [messages.length, pendingFiles, isAtBottom, isLoading, hasUserScrolled]);

  // 4. Read receipts
  useEffect(() => {
    const socket = getSocket();
    if (!socket?.connected || !activeChatId || messages.length === 0) return;
    if (isAtBottom) {
      const unread = messages.filter(m => m.sender.id !== me?.id && !m.reads?.some(r => r.userId === me?.id));
      if (unread.length > 0) {
        unread.forEach(m => socket.emit('message:read', { messageId: m.id }));
      }
    }
  }, [messages.length, isAtBottom, activeChatId, me]);

  // 5. Typing
  useEffect(() => {
    const socket = getSocket();
    if (!socket?.connected || !activeChatId) return;
    
    if (draft.trim()) {
      socket.emit('typing:start', { chatId: activeChatId });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('typing:stop', { chatId: activeChatId });
        typingTimeoutRef.current = null;
      }, 2000);
    } else {
      socket.emit('typing:stop', { chatId: activeChatId });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    }
    
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      socket.emit('typing:stop', { chatId: activeChatId });
    };
  }, [draft, activeChatId]);

  // 6. Загрузка сообщений
  useEffect(() => {
    if (!activeChatId) { setMessages([]); return; }
    const socket = getSocket();
    if (socket) socket.emit('chat:join', activeChatId);

    setIsLoading(true);
    authFetch(`/chats/${activeChatId}/messages?limit=50`)
      .then(r => r.json())
      .then(data => {
        const msgs = Array.isArray(data) ? data : (data.messages || []);
        setMessages(msgs);
        setTimeout(() => {
          if (messagesContainerRef.current) {
            messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
          }
        }, 50);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [activeChatId, setMessages]);

  // 7. Mark as read
  useEffect(() => {
    if (!activeChatId) return;
    authFetch('/chats/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatId: activeChatId })
    }).catch(console.error);
  }, [activeChatId]);

  const handleContextMenu = (e: React.MouseEvent, message: Message) => {
    e.preventDefault();
    setContextMenu({ x: Math.min(e.clientX, window.innerWidth - 200), y: Math.min(e.clientY, window.innerHeight - 200), message });
  };

  const handleSend = async () => {
    if ((!draft.trim() && pendingFiles.length === 0) && !editingMessage) return;
    try {
      if (editingMessage) {
        const res = await authFetch(`/messages`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chatId: activeChatId, body: draft, editMessageId: editingMessage.id })
        });
        if (!res.ok) throw new Error('Ошибка обновления');
        const updated = await res.json();
        setMessages(prev => prev.map(m => m.id === updated.id ? updated : m));
        if (activeChatId) setDraft(activeChatId, '');
        setEditingMessage(null); return;
      }
      const payload: any = { chatId: activeChatId, body: draft };
      if (replyTo) payload.replyToMessageId = replyTo.id;
      const res = await authFetch('/messages', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Ошибка отправки');
      const msg = await res.json();
      
      if (activeChatId) setDraft(activeChatId, '');
      setReplyTo(null);
      
      if (pendingFiles.length > 0) {
        for (const file of pendingFiles) {
          const form = new FormData(); form.append('file', file);
          await authFetch(`/messages/${msg.id}/attachments`, { method: 'POST', body: form });
        }
        setPendingFiles([]);
      }
      
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
      
    } catch (e: any) { setUi({ toast: e.message }); }
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    try {
      const res = await authFetch(`/messages/${messageId}/reactions`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ emoji })
      });
      if (res.ok) {
        const updated = await res.json();
        setMessages(prev => prev.map(m => m.id === updated.id ? updated : m));
      }
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (messageId: string) => {
    if (!window.confirm('Удалить сообщение?')) return;
    try {
      const res = await authFetch(`/messages/${messageId}`, { method: 'DELETE' });
      if (res.ok) {
        const updated = await res.json();
        setMessages(prev => prev.map(m => m.id === updated.id ? updated : m));
      }
    } catch (e) { console.error(e); }
  };

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
      if (data.user) {
        useAppStore.getState().setMe(data.user);
      }
      setUi({ toast: 'Аватар обновлен' });
    } catch (err: any) {
      setUi({ toast: err.message });
    } finally {
      setAvatarUploading(false);
    }
  };

  // ✅ СТАТУС ПРОЧТЕНИЯ: для групп — только если ВСЕ прочитали
  const getReadStatus = (msg: Message) => {
    if (!msg.reads || msg.reads.length === 0) return 'sent';
    
    if (chat && !chat.isDirect) {
      const othersReadCount = msg.reads.filter(r => r.userId !== me?.id).length;
      const totalOthers = chat.members?.length ? chat.members.length - 1 : 0;
      return othersReadCount === totalOthers ? 'read' : 'delivered';
    } else {
      const othersRead = msg.reads.filter(r => r.userId !== me?.id).length;
      return othersRead > 0 ? 'read' : 'delivered';
    }
  };

  if (!chat) return (
    <main className="flex-1 flex flex-col h-full bg-[var(--color-chat-bg)] relative">
      <div className="m-auto bg-[var(--color-panel)] px-5 py-4 rounded-2xl text-[var(--color-text-muted)] shadow-sm text-sm">
        Выберите чат или пользователя слева
      </div>
    </main>
  );

  return (
    <main className="flex-1 flex flex-col h-full bg-[var(--color-chat-bg)] relative overflow-hidden">
      
      {/* === Header === */}
      <div className="flex items-center gap-3 px-5 h-[72px] bg-[var(--color-surface)] border-b border-[var(--color-border)] shrink-0 z-10">
        
        {/* ✅ Аватар: кликабелен только для смены СВОЕГО аватара в личных чатах */}
        <div className="relative">
          <div 
            className={`w-11 h-11 rounded-full bg-[var(--color-accent)] text-white grid place-items-center font-bold text-lg shrink-0 overflow-hidden ${!chat.isDirect ? 'cursor-pointer' : ''}`}
            onClick={() => !chat.isDirect && setShowGroupSettings(true)}
          >
            {chatAvatar ? (
              <img src={chatAvatar} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              chatTitle?.[0]?.toUpperCase() || '?'
            )}
          </div>
          
          {/* ✅ Индикатор группы */}
          {!chat.isDirect && (
            <span className="absolute -bottom-1 -right-1 bg-[var(--color-accent)] text-white text-[10px] px-1 rounded-full border-2 border-[var(--color-surface)]">
              👥
            </span>
          )}
          
          {/* Скрытый инпут для загрузки аватара (только для профиля, не для чата) */}
          <input type="file" ref={avatarInputRef} hidden accept="image/*" onChange={handleAvatarUpload} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="font-bold text-[var(--color-text)] truncate flex items-center">
            {chatTitle}
            {/* ✅ Бейдж группы */}
            {!chat.isDirect && (
              <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-accent-soft)] text-[var(--color-accent)] font-medium">
                GROUP
              </span>
            )}
            {chat.isDirect && (
              <span className={`ml-2 text-[11px] px-2 py-0.5 rounded-full ${isPeerOnline ? 'bg-[#22c55e]/10 text-[#22c55e]' : 'bg-[var(--color-sidebar-alt)] text-[var(--color-text-muted)]'}`}>
                {isPeerOnline ? 'Онлайн' : 'Офлайн'}
              </span>
            )}
          </div>
          <div className="text-[13px] text-[var(--color-text-muted)] truncate">
            {typingLabel}
          </div>
        </div>
        
        {/* ✅ Кнопка настроек группы (только для групп) */}
        {!chat.isDirect && (
          <button 
            onClick={() => setShowGroupSettings(true)} 
            className="w-10 h-10 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] cursor-pointer grid place-items-center hover:bg-[var(--color-sidebar-alt)] transition-colors" 
            title="Настройки группы"
          >
            ⚙️
          </button>
        )}
      </div>

      {/* === Область сообщений === */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-5 flex flex-col gap-3 chat-pattern relative">
        {isLoading && messages.length > 0 && <div className="text-center py-2 text-[var(--color-text-muted)] text-xs animate-pulse">Загрузка...</div>}
        {messages.length === 0 && !isLoading && <div className="m-auto bg-[var(--color-panel)] px-5 py-4 rounded-2xl text-[var(--color-text-muted)] shadow-sm text-sm">Нет сообщений. Напишите первым!</div>}
        
        {messages.map(m => (
          <MessageBubble
            key={m.id} msg={m} isMine={m.sender.id === me?.id}
            onReply={() => setReplyTo(m)}
            onEdit={() => { if (activeChatId) setDraft(activeChatId, m.body || ''); setEditingMessage(m); setReplyTo(null); }}
            onDelete={() => handleDelete(m.id)}
            onReaction={(emoji) => handleReaction(m.id, emoji)}
            readStatus={getReadStatus(m)}
            openContextMenu={handleContextMenu}
            onForward={() => { setForwardingMessage(m); setShowForwardModal(true); }}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* === Панель ввода === */}
      <div className="bg-[var(--color-surface)] border-t border-[var(--color-border)] p-3.5 shrink-0">
        
        {replyTo && (
          <div className="flex justify-between items-center mb-2 p-2 rounded-xl bg-[var(--color-accent-soft)] text-sm border border-[var(--color-accent)]/20">
            <div className="truncate"><strong>Ответ для {replyTo.sender.name}:</strong> {replyTo.body?.slice(0, 30)}...</div>
            <button onClick={() => setReplyTo(null)} className="text-xl text-[var(--color-text-muted)] hover:text-[var(--color-text)] px-1">×</button>
          </div>
        )}
        {editingMessage && (
          <div className="flex justify-between items-center mb-2 p-2 rounded-xl bg-[var(--color-sidebar-alt)] text-sm border border-[var(--color-border)]">
            <div><strong>Редактирование сообщения:</strong></div>
            <button onClick={() => { if (activeChatId) setDraft(activeChatId, ''); setEditingMessage(null); }} className="text-xl text-[var(--color-text-muted)] hover:text-[var(--color-text)] px-1">×</button>
          </div>
        )}

        {pendingFiles.length > 0 && (
          <div className="flex gap-2 mb-2 overflow-x-auto pb-1">
            {pendingFiles.map((f, i) => (
              <div key={i} className="flex items-center gap-2 bg-[var(--color-sidebar-alt)] px-2 py-1 rounded-lg text-xs border border-[var(--color-border)] shrink-0">
                📎 {f.name}
                <span onClick={() => setPendingFiles(prev => prev.filter((_, idx) => idx !== i))} className="cursor-pointer hover:text-[#dc2626]">×</span>
              </div>
            ))}
          </div>
        )}

        {showEmojiPicker && (
          <div className="absolute bottom-[80px] left-5 z-[100] shadow-xl rounded-xl overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface)]">
            <Picker data={data} onEmojiSelect={(emoji: any) => { if (activeChatId) setDraft(activeChatId, draft + emoji.native); setShowEmojiPicker(false); }} theme="auto" previewPosition="none" skinTonePosition="none" perLine={8} />
          </div>
        )}

        <div className="flex items-end gap-2.5">
          <button onClick={() => fileInputRef.current?.click()} className="w-11 h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] cursor-pointer text-xl grid place-items-center hover:bg-[var(--color-sidebar-alt)] transition-colors">
            📎
          </button>
          <input type="file" hidden multiple ref={fileInputRef} onChange={e => setPendingFiles(prev => [...prev, ...Array.from(e.target.files || [])])} />
          
          <textarea
            value={draft}
            onChange={e => { if (activeChatId) setDraft(activeChatId, e.target.value); }}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
            className="flex-1 px-4 py-3 rounded-xl border border-[var(--color-border)] outline-none bg-[var(--color-sidebar-alt)] text-[var(--color-text)] resize-none min-h-[44px] max-h-[120px] box-border font-inherit leading-snug focus:border-[var(--color-accent)] transition-colors"
            placeholder={replyTo ? "Ваш ответ..." : editingMessage ? "Редактирование..." : "Сообщение..."}
          />
          
          <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="w-11 h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] cursor-pointer text-xl grid place-items-center hover:bg-[var(--color-sidebar-alt)] transition-colors">
            😊
          </button>
          
          <button onClick={handleSend} className="w-11 h-11 rounded-xl border-none bg-[var(--color-accent)] text-white cursor-pointer grid place-items-center text-xl hover:opacity-90 active:scale-95 transition-all">
            {editingMessage ? '💾' : '🚀'}
          </button>
        </div>
      </div>

      {/* === Контекстное меню === */}
      {contextMenu && (
        <div className="context-menu fixed z-[1000] rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-custom)] min-w-[180px] overflow-hidden" style={{ left: contextMenu.x, top: contextMenu.y }}>
          <div className="flex gap-1 p-2 border-b border-[var(--color-border)]">
            {['👍', '❤️', '😂', '', '😢'].map(emoji => (
              <button key={emoji} onClick={() => { handleReaction(contextMenu.message.id, emoji); setContextMenu(null); }} className="text-lg p-0.5 rounded hover:bg-[var(--color-sidebar-alt)] transition-colors">
                {emoji}
              </button>
            ))}
          </div>
          <div className="py-1">
            <button onClick={() => { setForwardingMessage(contextMenu.message); setShowForwardModal(true); setContextMenu(null); }} className="w-full text-left px-4 py-2.5 text-sm text-[var(--color-text)] hover:bg-[var(--color-sidebar-alt)] flex items-center gap-2">
              ➡️ Переслать
            </button>
            <button onClick={() => { setReplyTo(contextMenu.message); setContextMenu(null); }} className="w-full text-left px-4 py-2.5 text-sm text-[var(--color-text)] hover:bg-[var(--color-sidebar-alt)] flex items-center gap-2">
              ↩️ Ответить
            </button>
            {contextMenu.message.sender.id === me?.id && !contextMenu.message.deletedAt && (
              <>
                <button onClick={() => { if (activeChatId) setDraft(activeChatId, contextMenu.message.body || ''); setEditingMessage(contextMenu.message); setReplyTo(null); setContextMenu(null); }} className="w-full text-left px-4 py-2.5 text-sm text-[var(--color-text)] hover:bg-[var(--color-sidebar-alt)] flex items-center gap-2">
                  ✏️ Редактировать
                </button>
                <button onClick={() => { handleDelete(contextMenu.message.id); setContextMenu(null); }} className="w-full text-left px-4 py-2.5 text-sm text-[#dc2626] hover:bg-[#dc2626]/10 flex items-center gap-2">
                  🗑️ Удалить
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* === Модальные окна === */}
      {showForwardModal && forwardingMessage && (
        <ForwardModal message={forwardingMessage} onClose={() => { setShowForwardModal(false); setForwardingMessage(null); }} />
      )}
      {showGroupModal && (
        <CreateGroupModal onClose={() => setShowGroupModal(false)} />
      )}
      {showGroupSettings && chat && !chat.isDirect && (
        <GroupSettingsModal chat={chat} onClose={() => setShowGroupSettings(false)} />
      )}
    </main>
  );
}