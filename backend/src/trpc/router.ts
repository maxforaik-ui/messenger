import { initTRPC, TRPCError } from '@trpc/server';
import { z } from 'zod';
import type { TrpcContext } from './context.js';
import { hashPassword, comparePassword, signToken } from '../auth.js';

const t = initTRPC.context<TrpcContext>().create();

const publicProcedure = t.procedure;
const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Not authenticated' });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

// Schemas
const registerSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  password: z.string().min(6)
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

const createDirectChatSchema = z.object({ peerUserId: z.string().min(1) });
const createGroupChatSchema = z.object({ title: z.string().min(2), memberIds: z.array(z.string().min(1)).min(2) });
const sendMessageSchema = z.object({ chatId: z.string().min(1), body: z.string().max(4000).optional().default(''), replyToMessageId: z.string().min(1).optional() });
const markChatReadSchema = z.object({ chatId: z.string().min(1) });
const reactionSchema = z.object({ emoji: z.string().min(1).max(8) });

async function ensureChatMembership(userId: string, chatId: string, prisma: any) {
  return prisma.chatMember.findUnique({ where: { userId_chatId: { userId, chatId } } });
}

export const appRouter = t.router({
  // Auth
  auth: t.router({
    register: publicProcedure.input(registerSchema).mutation(async ({ input, ctx }) => {
      const { email, name, password } = input;
      const exists = await ctx.prisma.user.findUnique({ where: { email, deletedAt: null } });
      if (exists) throw new TRPCError({ code: 'CONFLICT', message: 'Email already exists' });
      
      const user = await ctx.prisma.user.create({
        data: { email, name, passwordHash: await hashPassword(password) }
      });
      
      const token = signToken({ userId: user.id, email: user.email, name: user.name });
      return { token, user: { id: user.id, email: user.email, name: user.name } };
    }),

    login: publicProcedure.input(loginSchema).mutation(async ({ input, ctx }) => {
      const { email, password } = input;
      const user = await ctx.prisma.user.findUnique({ where: { email, deletedAt: null } });
      if (!user || !(await comparePassword(password, user.passwordHash))) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid credentials' });
      }
      
      const token = signToken({ userId: user.id, email: user.email, name: user.name });
      return { token, user: { id: user.id, email: user.email, name: user.name } };
    })
  }),

  // Users
  users: t.router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const users = await ctx.prisma.user.findMany({
        where: { id: { not: ctx.user.userId }, deletedAt: null },
        select: { id: true, email: true, name: true, createdAt: true },
        orderBy: { createdAt: 'desc' }
      });
      // Добавляем статусы онлайн из presenceCounts (будет обновляться через WebSocket)
      return users.map((u: any) => ({ ...u, online: false, lastSeenAt: null }));
    }),

    updateMe: protectedProcedure
      .input(z.object({ name: z.string().min(2).max(100) }))
      .mutation(async ({ input, ctx }) => {
        const updated = await ctx.prisma.user.update({
          where: { id: ctx.user.userId },
          data: { name: input.name }
        });
        return { id: updated.id, email: updated.email, name: updated.name };
      }),

    changePassword: protectedProcedure
      .input(z.object({ 
        currentPassword: z.string().min(1),
        nextPassword: z.string().min(6),
        confirmPassword: z.string().min(6)
      }))
      .mutation(async ({ input, ctx }) => {
        if (input.nextPassword !== input.confirmPassword) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Passwords do not match' });
        }
        const user = await ctx.prisma.user.findUnique({ where: { id: ctx.user.userId } });
        if (!user || !(await comparePassword(input.currentPassword, user.passwordHash))) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Current password is incorrect' });
        }
        await ctx.prisma.user.update({
          where: { id: ctx.user.userId },
          data: { passwordHash: await hashPassword(input.nextPassword) }
        });
        return { success: true };
      }),

    deleteMe: protectedProcedure
      .input(z.object({ confirm: z.literal('DELETE') }))
      .mutation(async ({ ctx }) => {
        await ctx.prisma.user.update({
          where: { id: ctx.user.userId },
          data: { deletedAt: new Date() }
        });
        return { success: true };
      })
  }),

  // Chats
  chats: t.router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const userId = ctx.user.userId;
      const chats = await ctx.prisma.chat.findMany({
        where: { members: { some: { userId } }, deletedAt: null },
        include: {
          members: { include: { user: { select: { id: true, name: true, email: true } } } },
          messages: {
            where: { deletedAt: null },
            orderBy: { createdAt: 'desc' },
            take: 1,
            include: {
              reads: { select: { userId: true, readAt: true } },
              attachments: true,
              replyTo: { include: { sender: { select: { name: true } } } }
            }
          },
          pins: {
            include: { message: { include: { sender: { select: { name: true } } } } },
            orderBy: { createdAt: 'desc' },
            take: 1
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      const withUnread = await Promise.all(chats.map(async (chat: any) => {
        const membership = await ctx.prisma.chatMember.findUnique({
          where: { userId_chatId: { userId, chatId: chat.id } }
        });
        const unreadCount = await ctx.prisma.message.count({
          where: {
            chatId: chat.id,
            senderId: { not: userId },
            deletedAt: null,
            createdAt: membership?.lastReadAt ? { gt: membership.lastReadAt } : undefined
          }
        });
        return { ...chat, unreadCount };
      }));

      return withUnread;
    }),

    createDirect: protectedProcedure.input(createDirectChatSchema).mutation(async ({ input, ctx }) => {
      const currentUserId = ctx.user.userId;
      const peerUserId = input.peerUserId;
      
      const existing = await ctx.prisma.chat.findFirst({
        where: {
          isDirect: true,
          deletedAt: null,
          members: { some: { userId: currentUserId } },
          AND: [{ members: { some: { userId: peerUserId } } }]
        },
        include: {
          members: { include: { user: { select: { id: true, name: true, email: true } } } },
          messages: { orderBy: { createdAt: 'desc' }, take: 1, include: { attachments: true } }
        }
      });
      
      if (existing) return existing;
      
      const chat = await ctx.prisma.chat.create({
        data: {
          isDirect: true,
          members: { create: [{ userId: currentUserId }, { userId: peerUserId }] }
        },
        include: {
          members: { include: { user: { select: { id: true, name: true, email: true } } } },
          messages: true
        }
      });
      
      return chat;
    }),

    createGroup: protectedProcedure.input(createGroupChatSchema).mutation(async ({ input, ctx }) => {
      const creatorId = ctx.user.userId;
      const uniqueMemberIds = Array.from(new Set([creatorId, ...input.memberIds]));
      
      const chat = await ctx.prisma.chat.create({
        data: {
          title: input.title,
          isDirect: false,
          members: { create: uniqueMemberIds.map((userId) => ({ userId, role: userId === creatorId ? 'owner' : 'member' })) }
        },
        include: {
          members: { include: { user: { select: { id: true, name: true, email: true } } } }
        }
      });
      
      return chat;
    }),

    markRead: protectedProcedure.input(markChatReadSchema).mutation(async ({ input, ctx }) => {
      const { chatId } = input;
      const userId = ctx.user.userId;
      
      const member = await ensureChatMembership(userId, chatId, ctx.prisma);
      if (!member) throw new TRPCError({ code: 'FORBIDDEN', message: 'Not a member of this chat' });
      
      const now = new Date();
      await ctx.prisma.chatMember.update({
        where: { userId_chatId: { userId, chatId } },
        data: { lastReadAt: now }
      });
      
      return { success: true, chatId, readAt: now };
    })
  }),

  // Messages
  messages: t.router({
    list: protectedProcedure
      .input(z.object({ chatId: z.string(), limit: z.number().max(100).optional(), before: z.string().optional() }))
      .query(async ({ input, ctx }) => {
        const { chatId, limit = 50, before } = input;
        
        const member = await ensureChatMembership(ctx.user.userId, chatId, ctx.prisma);
        if (!member) throw new TRPCError({ code: 'FORBIDDEN', message: 'Not a member of this chat' });
        
        const where: any = { chatId, deletedAt: null };
        if (before) where.createdAt = { lt: new Date(before) };
        
        const messages = await ctx.prisma.message.findMany({
          where,
          include: {
            sender: { select: { id: true, name: true, email: true } },
            reads: { select: { userId: true, readAt: true } },
            attachments: true,
            replyTo: { include: { sender: { select: { name: true } } } }
          },
          orderBy: { createdAt: 'desc' },
          take: limit + 1
        });
        
        const hasNext = messages.length > limit;
        if (hasNext) messages.pop();
        
        return {
          messages: messages.reverse(),
          pagination: { hasNext, before: messages.length ? messages[0].createdAt.toISOString() : null }
        };
      }),

    send: protectedProcedure.input(sendMessageSchema).mutation(async ({ input, ctx }) => {
      const { chatId, body, replyToMessageId } = input;
      const senderId = ctx.user.userId;
      
      const member = await ensureChatMembership(senderId, chatId, ctx.prisma);
      if (!member) throw new TRPCError({ code: 'FORBIDDEN', message: 'Not a member of this chat' });
      
      let replyToMessageIdSafe = replyToMessageId;
      if (replyToMessageIdSafe) {
        const replyTarget = await ctx.prisma.message.findUnique({ where: { id: replyToMessageIdSafe } });
        if (!replyTarget || replyTarget.chatId !== chatId) replyToMessageIdSafe = undefined;
      }
      
      const message = await ctx.prisma.message.create({
        data: { chatId, senderId, body, replyToMessageId: replyToMessageIdSafe },
        include: {
          sender: { select: { id: true, name: true, email: true } },
          reads: true,
          attachments: true,
          replyTo: { include: { sender: { select: { name: true } } } }
        }
      });
      
      return message;
    }),

    delete: protectedProcedure
      .input(z.object({ messageId: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const { messageId } = input;
        const userId = ctx.user.userId;
        
        const message = await ctx.prisma.message.findUnique({ where: { id: messageId } });
        if (!message || message.senderId !== userId) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Message not found or forbidden' });
        }
        
        const updated = await ctx.prisma.message.update({
          where: { id: messageId },
          data: { deletedAt: new Date(), body: '' }
        });
        
        return updated;
      }),

    addReaction: protectedProcedure
      .input(z.object({ messageId: z.string(), emoji: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const { messageId, emoji } = input;
        const userId = ctx.user.userId;
        
        const message = await ctx.prisma.message.findUnique({ where: { id: messageId } });
        if (!message) throw new TRPCError({ code: 'NOT_FOUND', message: 'Message not found' });
        
        const reactions = (message.reactions as Record<string, number>) || {};
        const key = `${emoji}:${userId}`;
        
        if (reactions[key]) {
          delete reactions[key];
        } else {
          reactions[key] = (reactions[key] || 0) + 1;
        }
        
        const updated = await ctx.prisma.message.update({
          where: { id: messageId },
          data: { reactions }
        });
        
        return updated;
      })
  })
});

export type AppRouter = typeof appRouter;
