import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User, Attachment, ReadReceipt, Message, Chat, ThemeMode, NotificationPayload } from '../types';

export type { User, Attachment, ReadReceipt, Message, Chat, ThemeMode };

interface AppState {
  token: string | null; setToken: (t: string | null) => void;
  me: User | null; setMe: (u: User | null) => void;
  users: User[]; setUsers: (u: User[]) => void;
  chats: Chat[]; setChats: (c: Chat[] | ((p: Chat[]) => Chat[])) => void;
  activeChatId: string; setActiveChatId: (id: string) => void;
  messages: Message[]; setMessages: (m: Message[] | ((p: Message[]) => Message[])) => void;
  messagePagination: Record<string, { before: string | null; hasNext: boolean }>;
  setMessagePagination: (chatId: string, p: { before: string | null; hasNext: boolean }) => void;
  pendingFiles: File[]; setPendingFiles: (f: File[]) => void;
  isDragging: boolean; setIsDragging: (v: boolean) => void;
  typingUsers: Record<string, boolean>; setTypingUsers: (t: Record<string, boolean> | ((p: Record<string, boolean>) => Record<string, boolean>)) => void;
  notifications: NotificationPayload[]; setNotifications: (n: NotificationPayload[]) => void;
  theme: ThemeMode; toggleTheme: () => void;
  drafts: Record<string, string>;
  setDraft: (chatId: string, text: string) => void;

  ui: { 
    showUsers: boolean; 
    showSettings: boolean; 
    showNotifications: boolean; 
    showProfile: boolean; // ← Добавлено
    search: string; 
    toast: string;
    sOnline: boolean;
    setIsOnline: (v: boolean) => void;
  };
  setUi: (p: Partial<AppState['ui']>) => void;
  reset: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      token: null, setToken: (t) => set({ token: t }),
      me: null, setMe: (m) => set({ me: m }),
      users: [], setUsers: (u) => set({ users: u }),
      chats: [], setChats: (c) => set({ chats: typeof c === 'function' ? c(get().chats) : c }),
      activeChatId: '', setActiveChatId: (id) => set({ activeChatId: id }),
      messages: [], setMessages: (m) => set({ messages: typeof m === 'function' ? m(get().messages) : m }),
      messagePagination: {}, setMessagePagination: (chatId, p) => set(s => ({ messagePagination: { ...s.messagePagination, [chatId]: p } })),
      pendingFiles: [], setPendingFiles: (f) => set({ pendingFiles: f }),
      isDragging: false, setIsDragging: (v) => set({ isDragging: v }),
      typingUsers: {}, setTypingUsers: (t) => set({ typingUsers: typeof t === 'function' ? t(get().typingUsers) : t }),
      notifications: [], setNotifications: (n) => set({ notifications: n }),
      theme: 'light', toggleTheme: () => set(s => ({ theme: s.theme === 'light' ? 'dark' : 'light' })),
      ui: { showUsers: false, showSettings: false, showNotifications: false, showProfile: false, search: '', toast: '' },
      setUi: (p) => set(s => ({ ui: { ...s.ui, ...p } })),
      reset: () => set({ token: null, me: null, chats: [], messages: [], users: [], activeChatId: '', typingUsers: {}, notifications: [], pendingFiles: [], ui: { ...get().ui, showSettings: false, showNotifications: false, toast: '' } }),
      drafts: {},
      setDraft: (chatId, text) => set(s => ({ drafts: { ...s.drafts, [chatId]: text } })),
      isOnline: true,
      setIsOnline: (v) => set({ isOnline: v })
    }),
    { name: 'messenger-v5.4', storage: createJSONStorage(() => sessionStorage) }
  )
);