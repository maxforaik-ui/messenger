// Common types for the messenger application

export type UserStatus = 'online' | 'offline' | 'away' | 'dnd';

export type User = { 
  id: string; 
  name: string; 
  email: string; 
  status?: UserStatus;
  online?: boolean;
  deletedAt?: Date | null;
};

export type Chat = { 
  id: string; 
  title?: string | null; 
  isDirect?: boolean; 
  unreadCount?: number;
  members: { user: User }[]; 
  pinned?: boolean; 
  draft?: string;
  deletedAt?: Date | null;
  lastMessage?: Message | null;
};

export type Attachment = { 
  id: string; 
  url: string; 
  originalName: string; 
  mimeType: string; 
  sizeBytes: number;
};

export type ReadReceipt = { 
  userId: string; 
  readAt: string;
};

export type Message = { 
  id: string; 
  chatId: string; 
  body?: string; 
  createdAt: string;
  sender: User; 
  reads?: ReadReceipt[]; 
  attachments?: Attachment[];
  replyTo?: { id: string; body?: string; senderName?: string } | null;
  reactions?: Record<string, number>;
  deletedAt?: Date | null;
};

export type PushSubscriptionData = {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
};

export type NotificationPayload = {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  requireInteraction?: boolean;
  data?: {
    url?: string;
    chatId?: string;
    messageId?: string;
  };
};

export type ThemeMode = 'light' | 'dark';
