import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type User = { id: string; name: string; email: string; online?: boolean };
export type Attachment = { id: string; url: string; originalName: string; mimeType: string; sizeBytes: number };
export type ReadReceipt = { userId: string; readAt: string };
export type Message = {
  id: string; chatId: string; body?: string; createdAt: string;
  sender: User; reads?: ReadReceipt[]; attachments?: Attachment[];
  replyTo?: { id: string; body?: string; senderName?: string } | null;
  reactions?: Record<string, number>;
};
export type Chat = {
  id: string; title?: string | null; isDirect?: boolean; unreadCount?: number;
  members: { user: User }[]; messages: Message[]; pinned?: boolean; draft?: string;
};
export type ThemeMode = 'light' | 'dark';

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
  notifications: any[]; setNotifications: (n: any[]) => void;
  theme: ThemeMode; toggleTheme: () => void;
  ui: { showUsers: boolean; showSettings: boolean; showNotifications: boolean; search: string; toast: string };
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
      ui: { showUsers: true, showSettings: false, showNotifications: false, search: '', toast: '' },
      setUi: (p) => set(s => ({ ui: { ...s.ui, ...p } })),
      reset: () => set({ token: null, me: null, chats: [], messages: [], users: [], activeChatId: '', typingUsers: {}, notifications: [], pendingFiles: [], ui: { ...get().ui, showSettings: false, showNotifications: false, toast: '' } })
    }),
    { name: 'messenger-v5.1', storage: createJSONStorage(() => sessionStorage) }
  )
);