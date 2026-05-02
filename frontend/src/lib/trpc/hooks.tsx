import { useAppStore } from '../../store/useAppStore';
import { trpc, getTrpcClient } from './client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export function TrpcProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: { staleTime: 1000 * 60 * 5 }, // 5 minutes
    },
  }));

  const token = useAppStore((s) => s.token);
  const client = getTrpcClient(() => token);

  return (
    <trpc.Provider client={client} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </trpc.Provider>
  );
}

// Optimistic mutation hooks
export function useSendMessage() {
  const utils = trpc.useUtils();
  
  return trpc.messages.send.useMutation({
    onMutate: async (newMessage) => {
      await utils.messages.list.cancel();
      
      const previousMessages = utils.messages.list.getData({ chatId: newMessage.chatId });
      
      if (previousMessages) {
        utils.messages.list.setData({ chatId: newMessage.chatId }, (old) => ({
          messages: [...(old?.messages || []), {
            id: `temp-${Date.now()}`,
            chatId: newMessage.chatId,
            body: newMessage.body,
            senderId: 'optimistic',
            createdAt: new Date().toISOString(),
            reads: [],
            attachments: [],
            replyTo: null,
            reactions: {},
            deletedAt: null,
            sender: { id: 'optimistic', name: 'Me', email: '' }
          }],
          pagination: old?.pagination || { hasNext: false, before: null }
        }));
      }
      
      return { previousMessages };
    },
    onError: (err, newMessage, context) => {
      if (context?.previousMessages) {
        utils.messages.list.setData({ chatId: newMessage.chatId }, context.previousMessages);
      }
    },
    onSettled: () => {
      utils.messages.list.invalidate();
    }
  });
}

export function useDeleteMessage() {
  const utils = trpc.useUtils();
  
  return trpc.messages.delete.useMutation({
    onMutate: async ({ messageId }) => {
      await utils.messages.list.cancel();
      
      // Find which chat this message belongs to and update optimistically
      // This is simplified - in production you'd track chatId better
      return { messageId };
    },
    onSettled: () => {
      utils.messages.list.invalidate();
    }
  });
}

export function useAddReaction() {
  const utils = trpc.useUtils();
  
  return trpc.messages.addReaction.useMutation({
    onSettled: () => {
      utils.messages.list.invalidate();
    }
  });
}

export function useMarkChatRead() {
  const utils = trpc.useUtils();
  
  return trpc.chats.markRead.useMutation({
    onSettled: () => {
      utils.chats.list.invalidate();
    }
  });
}

export { trpc };
