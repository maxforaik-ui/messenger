import { io, Socket } from 'socket.io-client';
import { useAppStore, Message, Attachment } from '../store/useAppStore';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL || 'http://localhost:4000';
const DEVICE_ID = Math.random().toString(36).slice(2);
let socket: Socket | null = null;

export function initSocket() {
  const store = useAppStore.getState();
  if (!store.token || socket?.connected) return;
  
  socket = io(SOCKET_URL, { auth: { token: store.token, deviceId: DEVICE_ID } });

  socket.on('message:new', (msg: Message) => {
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
    useAppStore.setState((s) => ({
      messages: s.messages.map(m => m.id === msg.id ? { ...m, ...msg } : m),
      chats: s.chats.map(c => c.id === msg.chatId ? { 
        ...c, 
        messages: c.messages?.[0]?.id === msg.id ? [msg] : c.messages 
      } : c)
    }));
  });

  socket.on('attachment:new', ({ chatId, messageId, attachment }: { chatId: string; messageId: string; attachment: Attachment }) => {
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

  socket.on('message:read:updated', ({ messageId, userId, readAt, chatId }: { messageId: string; userId: string; readAt: string; chatId: string }) => {
    if (chatId !== useAppStore.getState().activeChatId) return;
    useAppStore.setState((s) => ({
      messages: s.messages.map(m => m.id === messageId ? { ...m, reads: [...(m.reads || []).filter(r => r.userId !== userId), { userId, readAt }] } : m)
    }));
  });
  
  return socket;
}

export function getSocket() { return socket; }
export function disconnectSocket() { if (socket) { socket.disconnect(); socket = null; } }