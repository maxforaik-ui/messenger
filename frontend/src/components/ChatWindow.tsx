import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import React, { useRef, useState } from 'react';
import { useAppStore, Message } from '../store/useAppStore';
import { themeTokens, createStyles } from '../styles/theme';
import { authFetch } from '../lib/api';


// Простой набор эмодзи для вставки
const EMOJI_LIST = ['😀', '😂', '🥰', '😎', '🤔', '👍', '🔥', '❤️', '🎉', '👀', '🚀', '✅'];

function MessageBubble({ 
  msg, 
  isMine, 
  onReply, 
  onEdit, 
  onDelete, 
  onReaction,
  readStatus 
}: { 
  msg: Message; 
  isMine: boolean; 
  onReply: () => void; 
  onEdit: () => void; 
  onDelete: () => void; 
  onReaction: (emoji: string) => void;
  readStatus: 'sent' | 'delivered' | 'read';
}) {
  const { theme } = useAppStore();
  const p = themeTokens[theme];
  const s = createStyles(p);

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: isMine ? 'flex-end' : 'flex-start', 
      marginBottom: 8,
      position: 'relative'
    }} id={`msg-${msg.id}`}>
      
      <div style={{ ...s.bubble, background: isMine ? p.outgoing : p.incoming }}>
        
        {/* Блок ответа */}
        {msg.replyTo && (
          <div style={{ ...s.replyPreview, background: isMine ? 'rgba(0,0,0,0.05)' : p.accentSoft }}>
            <strong style={{ fontSize: 12 }}>{msg.replyTo.senderName || 'Пользователь'}:</strong>
            <div style={{ fontSize: 12, opacity: 0.8 }}>{msg.replyTo.body || 'Вложение'}</div>
          </div>
        )}

        {/* Текст сообщения */}
        {!!msg.body && (
          <div style={{ 
            ...s.bubbleText, 
            color: msg.deletedAt ? p.muted : p.text,
            fontStyle: msg.deletedAt ? 'italic' : 'normal' 
          }}>
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
              <span key={emoji} style={{ ...s.reactionChip, cursor: 'pointer', border: '1px solid ' + p.border }}>
                {emoji} <sub>{count}</sub>
              </span>
            ))}
          </div>
        )}

        {/* Мета-информация и действия */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
          
          {/* Время и статус */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: p.muted }}>
            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            {isMine && !msg.deletedAt && (
              <span>
                {readStatus === 'sent' ? '✓' : readStatus === 'delivered' ? '✓✓' : <span style={{ color: p.accent }}>✓✓</span>}
              </span>
            )}
          </div>

          {/* Кнопки действий (появляются при наведении) */}
          {!msg.deletedAt && (
            <div style={{ display: 'none', position: 'absolute', top: -10, right: isMine ? 0 : 'auto', left: isMine ? 'auto' : 0, background: p.surface, borderRadius: 8, boxShadow: p.shadow, padding: 4, gap: 4, zIndex: 2 }} className="msg-actions">
              <button onClick={onReply} style={{ ...s.iconBtn, width: 28, height: 28, fontSize: 12 }} title="Ответить">↩️</button>
              {isMine && <button onClick={onEdit} style={{ ...s.iconBtn, width: 28, height: 28, fontSize: 12 }} title="Редактировать">✏️</button>}
              {isMine && <button onClick={onDelete} style={{ ...s.iconBtn, width: 28, height: 28, fontSize: 12 }} title="Удалить">🗑️</button>}
              <button onClick={() => onReaction('👍')} style={{ ...s.iconBtn, width: 28, height: 28, fontSize: 12 }}>👍</button>
            </div>
          )}
        </div>
      </div>

      {/* CSS для показа действий при наведении */}
      <style>{`
        .bubble-container:hover .msg-actions { display: flex !important; }
      `}</style>
    </div>
  );
}

export function ChatWindow() {
  const { theme, activeChatId, messages, setMessages, me, typingUsers, chats } = useAppStore();
  const p = themeTokens[theme];
  const s = React.useMemo(() => createStyles(p), [p]);
  const [draft, setDraft] = useState('');
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chat = chats.find(c => c.id === activeChatId);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const typingLabel = Object.values(typingUsers).some(Boolean) ? 'печатает…' : '';

  // Авто-скролл вниз
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, pendingFiles]);

  // Загрузка сообщений
  React.useEffect(() => {
    if (!activeChatId) { setMessages([]); return; }
    setMessages([]);
    authFetch(`/chats/${activeChatId}/messages`)
      .then(r => r.json())
      .then(data => setMessages(Array.isArray(data) ? data : (data.messages || [])))
      .catch(console.error);
  }, [activeChatId, setMessages]);

  const handleSend = async () => {
    if ((!draft.trim() && pendingFiles.length === 0) && !editingMessage) return;

    try {
      // 1. Логика редактирования
      if (editingMessage) {
        const res = await authFetch(`/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chatId: activeChatId, body: draft, editMessageId: editingMessage.id })
        });
        if (!res.ok) throw new Error('Ошибка обновления');
        const updatedMsg = await res.json();
        setMessages(prev => prev.map(m => m.id === updatedMsg.id ? updatedMsg : m));
        setDraft('');
        setEditingMessage(null);
        return;
      }

      // 2. Логика отправки нового сообщения
      const payload: any = { chatId: activeChatId, body: draft };
      if (replyTo) payload.replyToMessageId = replyTo.id;

      const res = await authFetch('/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Ошибка отправки');
      const msg = await res.json();
      
      // Сброс состояния
      setDraft('');
      setReplyTo(null);

      // 3. Загрузка файлов (если есть)
      if (pendingFiles.length > 0) {
        for (const file of pendingFiles) {
          const formData = new FormData();
          formData.append('file', file);
          await authFetch(`/messages/${msg.id}/attachments`, {
            method: 'POST',
            body: formData
          });
        }
        setPendingFiles([]);
      }

    } catch (e: any) {
      useAppStore.setState({ ui: { ...useAppStore.getState().ui, toast: e.message } });
    }
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    try {
      const res = await authFetch(`/messages/${messageId}/reactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emoji })
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

  // Статусы сообщений
  const getReadStatus = (msg: Message) => {
    if (!msg.reads || msg.reads.length === 0) return 'sent';
    // Если прочитали другие участники чата
    const othersRead = msg.reads.filter(r => r.userId !== me?.id).length;
    return othersRead > 0 ? 'read' : 'delivered';
  };

  if (!chat) {
    return (
      <main style={s.main}>
        <div style={{ ...s.messagesArea, display: 'grid', placeItems: 'center' }}>
          <div style={s.emptyCanvas}>Выберите чат или пользователя слева</div>
        </div>
      </main>
    );
  }

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

      {/* Messages Area */}
      <div style={s.messagesArea} className="bubble-container">
        {messages.length === 0 && <div style={s.emptyCanvas}>Нет сообщений. Напишите первым!</div>}
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
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Composer */}
      <div style={s.composerWrap}>
        
        {/* Баннер "Отвечаем на..." */}
        {replyTo && (
          <div style={{ padding: '8px 14px', background: p.accentSoft, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `1px solid ${p.border}` }}>
            <div style={{ fontSize: 13 }}>
              <strong>Ответ для {replyTo.sender.name}:</strong> {replyTo.body?.slice(0, 30)}...
            </div>
            <button onClick={() => setReplyTo(null)} style={{ background: 'transparent', border: 'none', fontSize: 18, cursor: 'pointer', color: p.muted }}>×</button>
          </div>
        )}

        {/* Баннер "Редактирование..." */}
        {editingMessage && (
          <div style={{ padding: '8px 14px', background: p.sidebarAlt, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `1px solid ${p.border}` }}>
            <div style={{ fontSize: 13 }}>
              <strong>Редактирование сообщения:</strong>
            </div>
            <button onClick={() => { setEditingMessage(null); setDraft(''); }} style={{ background: 'transparent', border: 'none', fontSize: 18, cursor: 'pointer', color: p.muted }}>×</button>
          </div>
        )}

        {/* Превью файлов */}
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

        {/* Панель эмодзи */}
        {showEmojiPicker && (
          <div style={{ 
            position: 'absolute', 
            bottom: 120, 
            left: 20, 
            zIndex: 100,
            boxShadow: s.shadow,
            borderRadius: 12,
            overflow: 'hidden'
          }}>
            <Picker 
              data={data}
              onEmojiSelect={(emoji: any) => {
                setDraft(prev => prev + emoji.native);
                setShowEmojiPicker(false);
              }}
              theme={theme === 'dark' ? 'dark' : 'light'}
              previewPosition="none"
              skinTonePosition="none"
              perLine={8}
            />
          </div>
        )}

        {/* Поле ввода */}
        <div style={s.composer}>
          <button onClick={() => fileInputRef.current?.click()} style={s.iconBtn}>📎</button>
          <input type="file" hidden multiple ref={fileInputRef} onChange={e => setPendingFiles(prev => [...prev, ...Array.from(e.target.files || [])])} />
          
          <textarea
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
            style={s.composerTextarea}
            placeholder={replyTo ? "Ваш ответ..." : editingMessage ? "Редактирование..." : "Сообщение..."}
          />
          
          <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} style={s.iconBtn}>😊</button>
          <button onClick={handleSend} style={s.sendBtn}>{editingMessage ? '💾' : '🚀'}</button>
        </div>
      </div>
    </main>
  );
}