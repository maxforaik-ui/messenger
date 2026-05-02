import React, { useRef, useState, useEffect } from 'react';
import { useAppStore, Message } from '../store/useAppStore';
import { themeTokens, createStyles } from '../styles/theme';
import { authFetch } from '../lib/api';
import { getSocket } from '../lib/socket';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';

// --- Компонент Контекстного Меню (ПКМ) ---
function MessageContextMenu({
  x, y, message, isMine, onClose, onReply, onEdit, onDelete, onReaction
}: {
  x: number; y: number; message: Message; isMine: boolean;
  onClose: () => void; onReply: () => void; onEdit: () => void; onDelete: () => void; onReaction: (emoji: string) => void;
}) {
  const { theme } = useAppStore();
  const p = themeTokens[theme];

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.context-menu')) onClose();
    };
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [onClose]);

  return (
    <div className="context-menu" style={{
      position: 'fixed', left: x, top: y, zIndex: 1000,
      background: p.surface, border: `1px solid ${p.border}`,
      borderRadius: 12, boxShadow: p.shadow, minWidth: 180,
      overflow: 'hidden'
    }}>
      <div style={{ padding: '8px 12px', borderBottom: `1px solid ${p.border}`, display: 'flex', gap: 4 }}>
        {['👍', '❤️', '😂', '😮', '😢'].map(emoji => (
          <button key={emoji} onClick={() => { onReaction(emoji); onClose(); }}
            style={{ border: 'none', background: 'transparent', fontSize: 18, cursor: 'pointer', borderRadius: 4, padding: '2px 4px' }}>
            {emoji}
          </button>
        ))}
      </div>
      <div style={{ padding: '4px 0' }}>
        <button onClick={() => { onReply(); onClose(); }}
          style={{ width: '100%', padding: '10px 16px', textAlign: 'left', border: 'none', background: 'transparent', color: p.text, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          ↩️ Ответить
        </button>
        {isMine && !message.deletedAt && (
          <>
            <button onClick={() => { onEdit(); onClose(); }}
              style={{ width: '100%', padding: '10px 16px', textAlign: 'left', border: 'none', background: 'transparent', color: p.text, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              ✏️ Редактировать
            </button>
            <button onClick={() => { onDelete(); onClose(); }}
              style={{ width: '100%', padding: '10px 16px', textAlign: 'left', border: 'none', background: 'transparent', color: '#dc2626', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              🗑️ Удалить
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// --- Компонент Пузыря Сообщения ---
function MessageBubble({
  msg, isMine, onReply, onEdit, onDelete, onReaction, readStatus, openContextMenu
}: {
  msg: Message; isMine: boolean; onReply: () => void; onEdit: () => void;
  onDelete: () => void; onReaction: (emoji: string) => void;
  readStatus: 'sent' | 'delivered' | 'read'; openContextMenu: (e: React.MouseEvent, msg: Message) => void;
}) {
  const { theme } = useAppStore();
  const p = themeTokens[theme];
  const s = createStyles(p);

  return (
    <div style={{
      display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start',
      marginBottom: 8, position: 'relative', cursor: 'context-menu'
    }} id={`msg-${msg.id}`} onContextMenu={(e) => { e.preventDefault(); openContextMenu(e, msg); }}>
      
      <div style={{ ...s.bubble, background: isMine ? p.outgoing : p.incoming }}>
        {/* Блок ответа */}
        {msg.replyTo && (
          <div style={{ ...s.replyPreview, background: isMine ? 'rgba(0,0,0,0.05)' : p.accentSoft }}>
            <strong style={{ fontSize: 12 }}>{msg.replyTo.senderName || 'Пользователь'}: </strong>
            <div style={{ fontSize: 12, opacity: 0.8 }}>{msg.replyTo.body || 'Вложение'}</div>
          </div>
        )}

        {/* Текст */}
        {!!msg.body && (
          <div style={{ ...s.bubbleText, color: msg.deletedAt ? p.muted : p.text, fontStyle: msg.deletedAt ? 'italic' : 'normal' }}>
            {msg.deletedAt ? 'Сообщение удалено' : msg.body}
          </div>
        )}

        {/* Вложения */}
        {msg.attachments?.map(att => (
          <div key={att.id} style={{ marginTop: 4, background: 'rgba(0,0,0,0.05)', borderRadius: 8, padding: 4 }}>
            {att.mimeType.startsWith('image/') ? (
              <img src={att.url} alt="attach" style={{ maxWidth: 250, maxHeight: 200, borderRadius: 6, objectFit: 'cover' }} />
            ) : (
              <a href={att.url} target="_blank" rel="noreferrer" style={{ ...s.attachmentLink }}>📎 {att.originalName}</a>
            )}
          </div>
        ))}

        {/* Реакции */}
        {Object.keys(msg.reactions || {}).length > 0 && (
          <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
            {Object.entries(msg.reactions).map(([emoji, count]) => (
              <span key={emoji} style={{ ...s.reactionChip, cursor: 'pointer', border: '1px solid ' + p.border }} onClick={() => onReaction(emoji)}>
                {emoji} <sub>{count}</sub>
              </span>
            ))}
          </div>
        )}

        {/* Мета-информация и статусы */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: p.muted }}>
            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            {isMine && !msg.deletedAt && (
              <span style={{ marginLeft: 4 }}>
                {readStatus === 'sent' && <span style={{ color: p.muted }}>✓</span>}
                {readStatus === 'delivered' && <span style={{ color: p.muted }}>✓✓</span>}
                {readStatus === 'read' && <span style={{ color: '#3b82f6' }}>✓✓</span>}
              </span>
            )}
          </div>
          <button onClick={(e) => { e.stopPropagation(); openContextMenu(e as any, msg); }}
            style={{ background: 'transparent', border: 'none', fontSize: 18, cursor: 'pointer', color: p.muted, padding: '0 6px' }}>
            ⋮
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Основной Компонент Окна Чата ---
export function ChatWindow() {
  const { theme, activeChatId, messages, setMessages, me, typingUsers, chats, setChats, setUi } = useAppStore();
  const p = themeTokens[theme];
  const s = React.useMemo(() => createStyles(p), [p]);
  
  const [draft, setDraft] = useState('');
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; message: Message } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const chat = chats.find(c => c.id === activeChatId);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const typingLabel = Object.values(typingUsers).some(Boolean) ? 'печатает…' : '';

  // Авто-скролл вниз
  useEffect(() => {
    if (messages.length > 0 && !isLoading) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, pendingFiles]);

  // Загрузка сообщений
  useEffect(() => {
    if (!activeChatId) { setMessages([]); return; }
    
    // Присоединяемся к комнате чата через WebSocket
    const socket = getSocket();
    if (socket) {
      console.log('[ChatWindow] Joining chat room:', activeChatId);
      socket.emit('chat:join', activeChatId);
    }
    
    setIsLoading(true);
    authFetch(`/chats/${activeChatId}/messages?limit=50`)
      .then(r => r.json())
      .then(data => {
        const msgs = Array.isArray(data) ? data : (data.messages || []);
        setMessages(msgs);
        
        // Отправляем событие о прочтении для каждого сообщения от других пользователей
        console.log('[ChatWindow] Loaded messages, socket connected:', socket?.connected);
        if (socket) {
          msgs.forEach((msg: Message) => {
            if (msg.sender.id !== me?.id) {
              console.log('[ChatWindow] Emitting message:read for', msg.id);
              socket.emit('message:read', { messageId: msg.id });
            }
          });
        } else {
          console.error('[ChatWindow] Socket not initialized');
        }
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [activeChatId, setMessages, me]);

// ✅ Автоматически отмечаем чат прочитанным при открытии
  useEffect(() => {
    if (!activeChatId) return;
    
    console.log('[ChatWindow] Requesting read receipt for:', activeChatId);
    authFetch('/chats/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatId: activeChatId })
    }).catch(err => console.error('[ChatWindow] Mark read failed:', err));
  }, [activeChatId]);
  // Открытие контекстного меню
  const handleContextMenu = (e: React.MouseEvent, message: Message) => {
    e.preventDefault();
    setContextMenu({ x: Math.min(e.clientX, window.innerWidth - 200), y: Math.min(e.clientY, window.innerHeight - 200), message });
  };

  // Отправка сообщения
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
        setDraft(''); setEditingMessage(null); return;
      }

      const payload: any = { chatId: activeChatId, body: draft };
      if (replyTo) payload.replyToMessageId = replyTo.id;
      
      const res = await authFetch('/messages', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Ошибка отправки');
      const msg = await res.json();
      
      setDraft(''); setReplyTo(null);

      if (pendingFiles.length > 0) {
        for (const file of pendingFiles) {
          const form = new FormData(); form.append('file', file);
          await authFetch(`/messages/${msg.id}/attachments`, { method: 'POST', body: form });
        }
        setPendingFiles([]);
      }
    } catch (e: any) { setUi({ toast: e.message }); }
  };

  // Реакции
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

  // Удаление
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

  // Статусы прочтения
  const getReadStatus = (msg: Message) => {
    console.log('[ChatWindow] getReadStatus', {
      id: msg.id,
      reads: msg.reads,
      me: me?.id
    });
    
    if (!msg.reads || msg.reads.length === 0) {
      console.log('[ChatWindow] No reads - sent');
      return 'sent';
    }
    
    const othersRead = msg.reads.filter(r => {
      const isOther = r.userId !== me?.id;
      console.log(`[ChatWindow] Read by ${r.userId}, isOther: ${isOther}`);
      return isOther;
    }).length;
    
    const status = othersRead > 0 ? 'read' : 'delivered';
    console.log(`[ChatWindow] Status: ${status}, othersRead: ${othersRead}`);
    
    return status;
  };

  if (!chat) return (
    <main style={s.main}>
      <div style={{ ...s.messagesArea, display: 'grid', placeItems: 'center' }}>
        <div style={s.emptyCanvas}>Выберите чат или пользователя слева</div>
      </div>
    </main>
  );

  return (
    <main style={s.main}>
      {/* Header */}
      <div style={s.chatHeader}>
        <div style={s.avatar}>{chat.isDirect ? chat.members.find(m => m.user.id !== me?.id)?.user.name?.[0]?.toUpperCase() : chat.title?.[0]?.toUpperCase() || '?'}</div>
        <div style={{ flex: 1 }}>
          <div style={s.chatHeaderTitle}>{chat.isDirect ? chat.members.find(m => m.user.id !== me?.id)?.user.name : chat.title}</div>
          <div style={s.chatHeaderMeta}>{typingLabel}</div>
        </div>
      </div>

      {/* Область сообщений */}
      <div ref={messagesContainerRef} style={{ ...s.messagesArea, overflowY: 'auto', flex: 1 }}>
        {isLoading && messages.length > 0 && <div style={{ textAlign: 'center', padding: 8, color: p.muted, fontSize: 12 }}>Загрузка...</div>}
        {messages.length === 0 && !isLoading && <div style={s.emptyCanvas}>Нет сообщений. Напишите первым!</div>}
        {messages.map(m => (
          <MessageBubble
            key={m.id}
            msg={m}
            isMine={m.sender.id === me?.id}
            onReply={() => setReplyTo(m)}
            onEdit={() => { setDraft(m.body || ''); setEditingMessage(m); setReplyTo(null); }}
            onDelete={() => handleDelete(m.id)}
            onReaction={(emoji) => handleReaction(m.id, emoji)}
            readStatus={getReadStatus(m)}
            openContextMenu={handleContextMenu}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Ответ / Редактирование */}
      {replyTo && (
        <div style={{ padding: '8px 14px', background: p.accentSoft, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `1px solid ${p.border}` }}>
          <div style={{ fontSize: 13 }}><strong>Ответ для {replyTo.sender.name}:</strong> {replyTo.body?.slice(0, 30)}...</div>
          <button onClick={() => setReplyTo(null)} style={{ background: 'transparent', border: 'none', fontSize: 18, cursor: 'pointer', color: p.muted }}>×</button>
        </div>
      )}
      {editingMessage && (
        <div style={{ padding: '8px 14px', background: p.sidebarAlt, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `1px solid ${p.border}` }}>
          <div style={{ fontSize: 13 }}><strong>Редактирование сообщения:</strong></div>
          <button onClick={() => { setEditingMessage(null); setDraft(''); }} style={{ background: 'transparent', border: 'none', fontSize: 18, cursor: 'pointer', color: p.muted }}>×</button>
        </div>
      )}

      {/* Файлы */}
      {pendingFiles.length > 0 && (
        <div style={{ padding: '8px 14px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {pendingFiles.map((f, i) => (
            <div key={i} style={{ background: p.sidebarAlt, padding: '4px 8px', borderRadius: 8, fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
              📎 {f.name}
              <span onClick={() => setPendingFiles(prev => prev.filter((_, idx) => idx !== i))} style={{ cursor: 'pointer', color: p.muted }}>×</span>
            </div>
          ))}
        </div>
      )}

      {/* Emoji Picker */}
      {showEmojiPicker && (
        <div style={{ position: 'absolute', bottom: 80, left: 20, zIndex: 100, boxShadow: p.shadow, borderRadius: 12, overflow: 'hidden' }}>
          <Picker 
            data={data}
            onEmojiSelect={(emoji: any) => { setDraft(prev => prev + emoji.native); setShowEmojiPicker(false); }}
            theme={theme === 'dark' ? 'dark' : 'light'}
            previewPosition="none"
            skinTonePosition="none"
            perLine={8}
          />
        </div>
      )}

      {/* Поле ввода (Composer) - ИСПРАВЛЕННАЯ ВЕРСТКА */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'flex-end', 
        gap: 10, 
        padding: 14, 
        background: p.surface,
        borderTop: `1px solid ${p.border}`
      }}>
        <button onClick={() => fileInputRef.current?.click()} style={{ 
          width: 44, height: 44, borderRadius: 12, border: `1px solid ${p.border}`, 
          background: p.surface, color: p.text, cursor: 'pointer', fontSize: 18,
          display: 'grid', placeItems: 'center'
        }}>📎</button>
        <input type="file" hidden multiple ref={fileInputRef} onChange={e => setPendingFiles(prev => [...prev, ...Array.from(e.target.files || [])])} />
        
        <textarea
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
          style={{
            flex: 1,
            padding: '12px 16px',
            borderRadius: 18,
            border: `1px solid ${p.border}`,
            outline: 'none',
            background: p.sidebarAlt,
            color: p.text,
            resize: 'none',
            minHeight: 44,
            maxHeight: 120,
            boxSizing: 'border-box',
            fontFamily: 'inherit',
            lineHeight: 1.45
          }}
          placeholder={replyTo ? "Ваш ответ..." : editingMessage ? "Редактирование..." : "Сообщение..."}
        />
        
        <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} style={{ 
          width: 44, height: 44, borderRadius: 12, border: `1px solid ${p.border}`, 
          background: p.surface, color: p.text, cursor: 'pointer', fontSize: 18,
          display: 'grid', placeItems: 'center'
        }}>😊</button>
        
        <button onClick={handleSend} style={{ 
          width: 44, height: 44, borderRadius: 14, border: 'none', 
          background: p.accent, color: '#fff', cursor: 'pointer',
          display: 'grid', placeItems: 'center', fontSize: 18
        }}>{editingMessage ? '💾' : '🚀'}</button>
      </div>

      {/* Контекстное меню */}
      {contextMenu && (
        <MessageContextMenu 
          x={contextMenu.x} y={contextMenu.y} message={contextMenu.message} 
          isMine={contextMenu.message.sender.id === me?.id} 
          onClose={() => setContextMenu(null)} 
          onReply={() => setReplyTo(contextMenu.message)} 
          onEdit={() => { setDraft(contextMenu.message.body || ''); setEditingMessage(contextMenu.message); setReplyTo(null); }} 
          onDelete={() => handleDelete(contextMenu.message.id)} 
          onReaction={(emoji) => handleReaction(contextMenu.message.id, emoji)} 
        />
      )}
    </main>
  );
}