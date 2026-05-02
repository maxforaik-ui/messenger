import { io, Socket } from 'socket.io-client';
import { useAppStore, Message, Attachment } from '../store/useAppStore';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL || 'http://localhost:4000';
const DEVICE_ID = Math.random().toString(36).slice(2);
let socket: Socket | null = null;

export function initSocket() {
  const store = useAppStore.getState();
  if (!store.token || socket?.connected) return;
  
  console.log('[socket] Connecting to', SOCKET_URL);
  socket = io(SOCKET_URL, { auth: { token: store.token, deviceId: DEVICE_ID } });

  socket.on('connect', () => console.log('[socket] Connected:', socket?.id));
  socket.on('disconnect', () => console.log('[socket] Disconnected'));
  socket.on('connect_error', (err) => console.error('[socket] Connect error:', err));

  socket.on('message:new', (msg: Message) => {
    console.log('[socket] message:new', msg.id);
    useAppStore.setState((s) => {
      const active = s.activeChatId === msg.chatId;
      return {
        messages: s.messages.some(m => m.id === msg.id) ? s.messages : [...s.messages, { ...msg, reactions: msg.reactions || {} }],
        chats: s.chats.map(c => c.id !== msg.chatId ? c : {
          ...c,
          messages: [msg],
          unreadCount: (c.unreadCount || 0) + (!active && msg.sender.id !== s.me?.id ? 1 : 0)
        })
      };
    });
  });

  socket.on('message:updated', (msg: Message) => {
    console.log('[socket] message:updated', msg.id);
    useAppStore.setState((s) => ({
      messages: s.messages.map(m => m.id === msg.id ? { ...m, ...msg } : m),
      chats: s.chats.map(c => c.id === msg.chatId ? { ...c } : c)
    }));
  });

  socket.on('attachment:new', ({ chatId, messageId, attachment }: { chatId: string; messageId: string; attachment: Attachment }) => {
    console.log('[socket] attachment:new', attachment.id);
    if (chatId !== useAppStore.getState().activeChatId) return;
    useAppStore.setState((s) => ({
      messages: s.messages.map(m => m.id === messageId ? { ...m, attachments: [...(m.attachments || []), attachment] } : m)
    }));
  });

  socket.on('typing:update', ({ chatId, userId, isTyping }: { chatId: string; userId: string; isTyping: boolean }) => {
    if (chatId !== useAppStore.getState().activeChatId) return;
    useAppStore.setState((s) => ({
      typingUsers: { ...s.typingUsers, [userId]: isTyping }
    }));
  });

// ✅ FIX: Обработчик обновления статусов прочтения
socket.on('message:read:updated', ({ messageId, userId, readAt, chatId }: { 
  messageId: string; userId: string; readAt: string; chatId: string 
}) => {
  // ❌ УДАЛИ ЭТУ СТРОКУ, чтобы статус обновлялся даже если ты в другом чате
  // if (chatId !== useAppStore.getState().activeChatId) return; 
  
  useAppStore.setState((s) => ({
    messages: s.messages.map(m => {
      // Обновляем только если сообщение принадлежит этому чату (на всякий случай)
      if (m.chatId === chatId && m.id === messageId) {
        const exists = (m.reads || []).some(r => r.userId === userId);
        if (exists) return m;
        return { ...m, reads: [...(m.reads || []), { userId, readAt }] };
      }
      return m;
    })
  }));
});

// ✅ FIX: Обработчик обновления статусов пользователей (онлайн/офлайн)
socket.on('presence:update', ({ userId, online, lastSeenAt }: { 
  userId: string; online: boolean; lastSeenAt: string 
}) => {
  console.log('[socket] presence:update', { userId, online, lastSeenAt });
  useAppStore.setState((s) => ({
    users: s.users.map(u => {
      if (u.id === userId) {
        console.log('[socket] Updating user status:', u.name, '->', online ? 'online' : 'offline');
        return { ...u, online, lastSeenAt };
      }
      return u;
    }),
    chats: s.chats.map(c => ({
      ...c,
      members: c.members.map(m => m.user.id === userId ? { ...m, user: { ...m.user, online, lastSeenAt } } : m)
    }))
  }));
});

  return socket;
}

export function getSocket() { return socket; }
export function disconnectSocket() { 
  if (socket) { 
    console.log('[socket] Disconnecting');
    socket.disconnect(); 
    socket = null; 
  } 
}