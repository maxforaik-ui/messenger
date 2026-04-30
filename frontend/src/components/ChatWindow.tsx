import React from 'react';
import { useAppStore, Message } from '../store/useAppStore';
import { themeTokens, createStyles } from '../styles/theme';
import { authFetch } from '../lib/api';

function MessageBubble({ msg }: { msg: Message }) {
  const { me, theme } = useAppStore();
  const p = themeTokens[theme];
  const s = createStyles(p);
  const mine = msg.sender.id === me?.id;

  return (
    <div style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start' }} id={`msg-${msg.id}`}>
      <div style={{ ...s.bubble, background: mine ? p.outgoing : p.incoming }}>
        {!mine && <div style={s.bubbleAuthor}>{msg.sender.name}</div>}
        {msg.replyTo && (
          <div style={s.replyPreview}>
            <strong>{msg.replyTo.senderName}</strong>
            <div>{msg.replyTo.body}</div>
          </div>
        )}
        {!!msg.body && <div style={s.bubbleText}>{msg.body}</div>}
        <div style={s.bubbleMeta}>
          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
}

export function ChatWindow() {
  const { theme, activeChatId, messages, setMessages, me, typingUsers, chats } = useAppStore();
  const p = themeTokens[theme];
  const s = React.useMemo(() => createStyles(p), [p]);
  const [draft, setDraft] = React.useState('');

  const chat = chats.find(c => c.id === activeChatId);
  const typingLabel = Object.values(typingUsers).some(Boolean) ? 'печатает…' : '';

  React.useEffect(() => {
    if (!activeChatId) { setMessages([]); return; }
    setMessages([]);
    authFetch(`/chats/${activeChatId}/messages`)
      .then(r => r.json())
      .then(data => setMessages(Array.isArray(data) ? data : (data.messages || [])))
      .catch(err => console.error("Ошибка загрузки сообщений:", err));
  }, [activeChatId, setMessages]);

  const send = async () => {
    if (!draft.trim() || !activeChatId) return;
    try {
      const res = await authFetch('/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId: activeChatId, body: draft })
      });
      
      // ✅ ИСПРАВЛЕНИЕ: Убрали setMessages. 
      // Сообщение придет через Socket.IO автоматически, это предотвратит дубликаты.
      
      if (!res.ok) throw new Error('Ошибка отправки');
      const msg = await res.json();
      
      // Оптимистично очищаем поле ввода, но не добавляем сообщение вручную
      setDraft(''); 
    } catch (e: any) {
      console.error(e);
      useAppStore.setState({ ui: { ...useAppStore.getState().ui, toast: e.message } });
    }
  };

  if (!chat) {
    return (
      <main style={s.main}>
        <div style={{ ...s.messagesArea, display: 'grid', placeItems: 'center' }}>
          <div style={s.emptyCanvas}>Выберите чат слева или создайте новый</div>
        </div>
      </main>
    );
  }

  return (
    <main style={s.main}>
      <div style={s.chatHeader}>
        <div style={s.avatar}>
          {chat.isDirect ? chat.members.find(m => m.user.id !== me?.id)?.user.name?.[0]?.toUpperCase() : chat.title?.[0]?.toUpperCase() || '?'}
        </div>
        <div style={{ flex: 1 }}>
          <div style={s.chatHeaderTitle}>
            {chat.isDirect ? chat.members.find(m => m.user.id !== me?.id)?.user.name : chat.title}
          </div>
          <div style={s.chatHeaderMeta}>{typingLabel}</div>
        </div>
      </div>

      <div style={s.messagesArea}>
        {messages.length === 0 && <div style={s.emptyCanvas}>Нет сообщений. Напишите первым!</div>}
        {messages.map(m => <MessageBubble key={m.id} msg={m} />)}
      </div>

      <div style={s.composerWrap}>
        <textarea
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
          style={s.composerTextarea}
          placeholder="Сообщение..."
        />
        <button onClick={send} style={s.sendBtn}>Отправить</button>
      </div>
    </main>
  );
}