process.on('unhandledRejection', (reason) => console.error('[unhandledRejection]', reason));
process.on('uncaughtException', (error) => console.error('[uncaughtException]', error));

import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { prisma } from './db.js';
import { authMiddleware, comparePassword, hashPassword, signToken, type AuthUser } from './auth.js';
import { connectPresenceRedis, connectStreamsRedis, presenceClient, streamsClient } from './redis.js';
import { subscribeUser, unsubscribeUser, sendPushNotification } from './push.js';

const app = express();
app.use(cors({ origin: process.env.CLIENT_ORIGIN, credentials: true }));
app.use(express.json());

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: { message: 'Too many auth attempts.' } });
const messageLimiter = rateLimit({ windowMs: 60 * 1000, max: 30 });
app.use('/auth', authLimiter);
app.use('/messages', messageLimiter);

const uploadDir = process.env.UPLOAD_DIR || './uploads';
fs.mkdirSync(uploadDir, { recursive: true });
app.use('/uploads', express.static(uploadDir));

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${crypto.randomUUID()}-${file.originalname.replace(/\s+/g, '_')}`)
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: process.env.CLIENT_ORIGIN, credentials: true } });

await connectPresenceRedis();
await connectStreamsRedis();

// ✅ Redis Adapter активирован
if (presenceClient.isOpen && streamsClient.isOpen) {
  io.adapter(createAdapter(presenceClient, streamsClient));
  console.log('[socket.io] Redis adapter enabled');
} else {
  console.log('[socket.io] Redis adapter disabled (degraded mode)');
}

const typingTimers = new Map<string, NodeJS.Timeout>();
const socketHeartbeatTimers = new Map<string, NodeJS.Timeout>();
const presenceCounts = new Map<string, number>();
const lastSeenMap = new Map<string, string>();
const processedMutations = new Map<string, any>();

function updatePresence(userId: string, delta: 1 | -1) {
  const prev = presenceCounts.get(userId) || 0;
  const next = Math.max(0, prev + delta);
  presenceCounts.set(userId, next);
  const now = new Date().toISOString();
  if (next === 0) lastSeenMap.set(userId, now);
  io.emit('presence:update', { userId, online: next > 0, lastSeenAt: lastSeenMap.get(userId) || now });
}

const registerSchema = z.object({ email: z.string().email(), name: z.string().min(2), password: z.string().min(6) });
const loginSchema = z.object({ email: z.string().email(), password: z.string().min(6) });
const createDirectChatSchema = z.object({ peerUserId: z.string().min(1) });
const createGroupChatSchema = z.object({ title: z.string().min(2), memberIds: z.array(z.string().min(1)).min(2) });
const sendMessageSchema = z.object({ chatId: z.string().min(1), body: z.string().max(4000).optional().default(''), replyToMessageId: z.string().min(1).optional(), editMessageId: z.string().min(1).optional() });
const readMessageSchema = z.object({ messageId: z.string().min(1) });
const markChatReadSchema = z.object({ chatId: z.string().min(1) });
const reactionSchema = z.object({ emoji: z.string().min(1).max(8) });
const searchSchema = z.object({ q: z.string().min(1).max(100), type: z.enum(['all','users','chats','messages','files']).optional().default('all') });
const updateMeSchema = z.object({ name: z.string().min(2).max(100) });
const changePasswordSchema = z.object({ currentPassword: z.string().min(1), nextPassword: z.string().min(6), confirmPassword: z.string().min(6) });
const deleteMeSchema = z.object({ confirm: z.literal('DELETE') });

async function ensureChatMembership(userId: string, chatId: string) {
  return prisma.chatMember.findUnique({ where: { userId_chatId: { userId, chatId } } });
}

function formatMessage(message: any) {
  return {
    ...message,
    body: message.deletedAt ? '[deleted]' : message.body,
    replyTo: message.replyTo ? { id: message.replyTo.id, body: message.replyTo.deletedAt ? '[deleted]' : message.replyTo.body, senderName: message.replyTo.sender?.name || 'Unknown' } : null,
    reactions: message.reactions || {}
  };
}

async function markReadForMessage(userId: string, messageId: string) {
  const message = await prisma.message.findUnique({ where: { id: messageId } });
  if (!message) return null;
  const member = await ensureChatMembership(userId, message.chatId);
  if (!member) return null;
  const now = new Date();
  const read = await prisma.messageRead.upsert({ where: { messageId_userId: { messageId, userId } }, update: { readAt: now }, create: { messageId, userId, readAt: now } });
  await prisma.chatMember.update({ where: { userId_chatId: { userId, chatId: message.chatId } }, data: { lastReadAt: now } });
  io.to(`chat:${message.chatId}`).emit('message:read:updated', { messageId, userId, readAt: read.readAt, chatId: message.chatId });
  return read;
}

app.get('/health', (_req, res) => res.json({ ok: true }));

app.post('/auth/register', async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  const { email, name, password } = parsed.data;
  const exists = await prisma.user.findUnique({ where: { email, deletedAt: null } });
  if (exists) return res.status(409).json({ message: 'Email already exists' });
  const user = await prisma.user.create({ data: { email, name, passwordHash: await hashPassword(password) } });
  const token = signToken({ userId: user.id, email: user.email, name: user.name });
  res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
});

app.post('/auth/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email, deletedAt: null } });
  if (!user || !(await comparePassword(password, user.passwordHash))) return res.status(401).json({ message: 'Invalid credentials' });
  const token = signToken({ userId: user.id, email: user.email, name: user.name });
  res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
});

app.get('/users', authMiddleware, async (req: express.Request & { user?: AuthUser }, res) => {
  const users = await prisma.user.findMany({ where: { id: { not: req.user!.userId }, deletedAt: null }, select: { id: true, email: true, name: true, createdAt: true }, orderBy: { createdAt: 'desc' } });
  res.json(users.map((u) => ({ ...u, online: false })));
});

app.post('/chats/direct', authMiddleware, async (req: express.Request & { user?: AuthUser }, res) => {
  const parsed = createDirectChatSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  const currentUserId = req.user!.userId;
  const peerUserId = parsed.data.peerUserId;
  const existing = await prisma.chat.findFirst({ where: { isDirect: true, deletedAt: null, members: { some: { userId: currentUserId } }, AND: [{ members: { some: { userId: peerUserId } } }] }, include: { members: { include: { user: { select: { id: true, name: true, email: true } } } }, messages: { orderBy: { createdAt: 'desc' }, take: 1, include: { attachments: true } } } });
  if (existing) return res.json(existing);
  const chat = await prisma.chat.create({ data: { isDirect: true, members: { create: [{ userId: currentUserId }, { userId: peerUserId }] } }, include: { members: { include: { user: { select: { id: true, name: true, email: true } } } }, messages: true } });
  res.json(chat);
});

app.post('/chats/group', authMiddleware, async (req: express.Request & { user?: AuthUser }, res) => {
  const parsed = createGroupChatSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  const creatorId = req.user!.userId;
  const uniqueMemberIds = Array.from(new Set([creatorId, ...parsed.data.memberIds]));
  const chat = await prisma.chat.create({ data: { title: parsed.data.title, isDirect: false, members: { create: uniqueMemberIds.map((userId) => ({ userId, role: userId === creatorId ? 'owner' : 'member' })) } }, include: { members: { include: { user: { select: { id: true, name: true, email: true } } } } } });
  res.json(chat);
});

app.post('/push/subscribe', authMiddleware, async (req, res) => {
  try { const { subscription, userAgent } = req.body; if (!subscription?.endpoint) return res.status(400).json({ message: 'Invalid subscription' }); const sub = await subscribeUser(req.user!.userId, subscription, userAgent); res.json({ success: true, subscription: sub }); } catch (error) { console.error('Subscribe error:', error); res.status(500).json({ message: 'Failed to subscribe' }); }
});
app.post('/push/unsubscribe', authMiddleware, async (req, res) => {
  try { const { endpoint } = req.body; if (!endpoint) return res.status(400).json({ message: 'Endpoint required' }); await unsubscribeUser(req.user!.userId, endpoint); res.json({ success: true }); } catch (error) { console.error('Unsubscribe error:', error); res.status(500).json({ message: 'Failed to unsubscribe' }); }
});
app.post('/push/test', authMiddleware, async (req, res) => {
  try { await sendPushNotification(req.user!.userId, '🔔 Тест', 'Push-уведомления работают!', '/icon-192.png'); res.json({ success: true }); } catch (error) { console.error('Test push error:', error); res.status(500).json({ message: 'Failed to send test push' }); }
});

app.get('/chats', authMiddleware, async (req: express.Request & { user?: AuthUser }, res) => {
  const userId = req.user!.userId;
  const chats = await prisma.chat.findMany({ where: { members: { some: { userId } }, deletedAt: null }, include: { members: { include: { user: { select: { id: true, name: true, email: true } } } }, messages: { where: { deletedAt: null }, orderBy: { createdAt: 'desc' }, take: 1, include: { reads: { select: { userId: true, readAt: true } }, attachments: true, replyTo: { include: { sender: { select: { name: true } } } } } }, pins: { include: { message: { include: { sender: { select: { name: true } } } } }, orderBy: { createdAt: 'desc' }, take: 1 } }, orderBy: { createdAt: 'desc' } });
  const withUnread = await Promise.all(chats.map(async (chat) => { const membership = await prisma.chatMember.findUnique({ where: { userId_chatId: { userId, chatId: chat.id } } }); const unreadCount = await prisma.message.count({ where: { chatId: chat.id, senderId: { not: userId }, deletedAt: null, createdAt: membership?.lastReadAt ? { gt: membership.lastReadAt } : undefined } }); return { ...chat, unreadCount }; }));
  res.json(withUnread.map((chat) => ({ ...chat, messages: chat.messages.map(formatMessage) })));
});

app.get('/chats/:chatId/messages', authMiddleware, async (req, res) => {
  const { chatId } = req.params;
  const member = await ensureChatMembership(req.user!.userId, chatId);
  if (!member) return res.status(403).json({ message: 'Forbidden' });
  const limit = Math.min(Number(req.query.limit) || 50, 100);
  const before = req.query.before ? new Date(String(req.query.before)) : undefined;
  const where: any = { chatId, deletedAt: null };
  if (before) where.createdAt = { lt: before };
  const messages = await prisma.message.findMany({ where, include: { sender: { select: { id: true, name: true, email: true } }, reads: { select: { userId: true, readAt: true } }, attachments: true, replyTo: { include: { sender: { select: { name: true } } } } }, orderBy: { createdAt: 'desc' }, take: limit + 1 });
  const hasNext = messages.length > limit;
  if (hasNext) messages.pop();
  res.json({ messages: messages.map(formatMessage).reverse(), pagination: { hasNext, before: messages.length ? messages[0].createdAt.toISOString() : null } });
});

app.post('/messages', authMiddleware, async (req: express.Request & { user?: AuthUser }, res) => {
  const parsed = sendMessageSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  const { chatId, body, replyToMessageId, editMessageId } = parsed.data;
  const senderId = req.user!.userId;
  const idempotencyKey = String(req.get('x-idempotency-key') || '');
  if (idempotencyKey && processedMutations.has(`${senderId}:${idempotencyKey}`)) return res.json(processedMutations.get(`${senderId}:${idempotencyKey}`));
  const member = await ensureChatMembership(senderId, chatId);
  if (!member) return res.status(403).json({ message: 'Forbidden' });

  // === РЕДАКТИРОВАНИЕ СООБЩЕНИЯ ===
// === РЕДАКТИРОВАНИЕ СООБЩЕНИЯ ===
if (editMessageId) {
  const existing = await prisma.message.findUnique({ where: { id: editMessageId } });
  if (!existing || existing.senderId !== senderId || existing.chatId !== chatId) return res.status(404).json({ message: 'Message not found or forbidden' });
  
  const updated = await prisma.message.update({
    where: { id: editMessageId },
    data: { body },
    include: {
      sender: { select: { id: true, name: true, email: true } },
      reads: true,
      attachments: true,
      replyTo: { include: { sender: { select: { name: true } } } }
    }
  });
  
  const formatted = formatMessage(updated);
  io.to(`chat:${chatId}`).emit('message:updated', formatted);
  io.to(`chat:${chatId}`).emit('typing:update', { chatId, userId: senderId, isTyping: false });
  
  // ❌ НЕ отправляем пуш при редактировании
  
  if (idempotencyKey) processedMutations.set(`${senderId}:${idempotencyKey}`, formatted);
  return res.json(formatted);
}

// === НОВОЕ СООБЩЕНИЕ ===
let replyToMessageIdSafe = replyToMessageId;
if (replyToMessageIdSafe) {
  const replyTarget = await prisma.message.findUnique({ where: { id: replyToMessageIdSafe } });
  if (!replyTarget || replyTarget.chatId !== chatId) replyToMessageIdSafe = undefined;
}

const message = await prisma.message.create({
  data: { chatId, senderId, body, replyToMessageId: replyToMessageIdSafe },
  include: {
    sender: { select: { id: true, name: true, email: true } },
    reads: true,
    attachments: true,
    replyTo: { include: { sender: { select: { name: true } } } }
  }
});

const formatted = formatMessage(message);
io.to(`chat:${chatId}`).emit('message:new', formatted);
io.to(`chat:${chatId}`).emit('typing:update', { chatId, userId: senderId, isTyping: false });

// 🔔 PUSH-УВЕДОМЛЕНИЯ (только для новых сообщений!)
const chatMembers = await prisma.chatMember.findMany({ where: { chatId }, include: { user: true } });
for (const m of chatMembers) {
  if (m.userId !== senderId) {
    const isOnline = (presenceCounts.get(m.userId) || 0) > 0;
    if (!isOnline) {
      sendPushNotification(
        m.userId,
        `💬 ${message.sender.name}`,
        formatted.body || '📎 Новое вложение',
        '/icon-192.png',
        { chatId, messageId: message.id }
      ).catch(console.error);
    }
  }
}

if (idempotencyKey) processedMutations.set(`${senderId}:${idempotencyKey}`, formatted);
res.json(formatted);
});

app.post('/messages/:messageId/reactions', authMiddleware, async (req: express.Request & { user?: AuthUser }, res) => {
  const parsed = reactionSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  const message = await prisma.message.findUnique({ where: { id: req.params.messageId } });
  if (!message) return res.status(404).json({ message: 'Message not found' });
  const member = await ensureChatMembership(req.user!.userId, message.chatId);
  if (!member) return res.status(403).json({ message: 'Forbidden' });
  const current = (message as any).reactions || {};
  const next = { ...current, [parsed.data.emoji]: Number(current[parsed.data.emoji] || 0) + 1 };
  const updated = await prisma.message.update({ where: { id: message.id }, data: { reactions: next }, include: { sender: { select: { id: true, name: true, email: true } }, reads: true, attachments: true, replyTo: { include: { sender: { select: { name: true } } } } } });
  io.to(`chat:${message.chatId}`).emit('message:updated', formatMessage(updated));
  res.json(formatMessage(updated));
});

app.delete('/messages/:messageId', authMiddleware, async (req: express.Request & { user?: AuthUser }, res) => {
  const message = await prisma.message.findUnique({ where: { id: req.params.messageId } });
  if (!message) return res.status(404).json({ message: 'Message not found' });
  if (message.senderId !== req.user!.userId) return res.status(403).json({ message: 'Forbidden' });
  const updated = await prisma.message.update({ where: { id: message.id }, data: { body: null, deletedAt: new Date() }, include: { sender: { select: { id: true, name: true, email: true } }, reads: true, attachments: true, replyTo: { include: { sender: { select: { name: true } } } } } });
  io.to(`chat:${message.chatId}`).emit('message:updated', formatMessage(updated));
  res.json(formatMessage(updated));
});

app.post('/messages/:messageId/attachments', authMiddleware, upload.single('file'), async (req: express.Request & { user?: AuthUser, file?: Express.Multer.File }, res) => {
  const { messageId } = req.params;
  const userId = req.user!.userId;
  const file = req.file;
  if (!file) return res.status(400).json({ message: 'File is required' });
  const message = await prisma.message.findUnique({ where: { id: messageId } });
  if (!message) return res.status(404).json({ message: 'Message not found' });
  const member = await ensureChatMembership(userId, message.chatId);
  if (!member) return res.status(403).json({ message: 'Forbidden' });
  const url = `${req.protocol}://${req.get('host')}/uploads/${path.basename(file.path)}`;
  const attachment = await prisma.attachment.create({ data: { messageId, uploaderId: userId, originalName: file.originalname, mimeType: file.mimetype, sizeBytes: file.size, storagePath: file.path, url } });
  io.to(`chat:${message.chatId}`).emit('attachment:new', { chatId: message.chatId, messageId, attachment });
  res.json(attachment);
});

app.post('/messages/read', authMiddleware, async (req: express.Request & { user?: AuthUser }, res) => {
  const parsed = readMessageSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  const read = await markReadForMessage(req.user!.userId, parsed.data.messageId);
  if (!read) return res.status(404).json({ message: 'Message not found or forbidden' });
  res.json(read);
});

app.post('/chats/read', authMiddleware, async (req: express.Request & { user?: AuthUser }, res) => {
  const parsed = markChatReadSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  const member = await ensureChatMembership(req.user!.userId, parsed.data.chatId);
  if (!member) return res.status(403).json({ message: 'Forbidden' });
  const now = new Date();
  await prisma.chatMember.update({ where: { userId_chatId: { userId: req.user!.userId, chatId: parsed.data.chatId } }, data: { lastReadAt: now } });
  res.json({ ok: true, chatId: parsed.data.chatId, lastReadAt: now });
});

app.get('/search', authMiddleware, async (req: express.Request & { user?: AuthUser }, res) => {
  const parsed = searchSchema.safeParse({ q: String(req.query.q || '') });
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  const q = parsed.data.q.trim();
  const filterType = parsed.data.type || 'all';
  const userId = req.user!.userId;
  const chats = await prisma.chat.findMany({ where: { members: { some: { userId } }, deletedAt: null, OR: filterType === 'users' ? [] : [{ title: { contains: q, mode: 'insensitive' } }, { messages: { some: { body: { contains: q, mode: 'insensitive' }, deletedAt: null } } }] }, include: { members: { include: { user: { select: { id: true, name: true, email: true } } } }, messages: { where: { deletedAt: null }, orderBy: { createdAt: 'desc' }, take: 5, include: { sender: { select: { id: true, name: true, email: true } }, reads: { select: { userId: true, readAt: true } }, attachments: true, replyTo: { include: { sender: { select: { name: true } } } } } } }, take: 20 });
  const users = await prisma.user.findMany({ where: { id: { not: userId }, deletedAt: null, OR: [{ name: { contains: q, mode: 'insensitive' } }, { email: { contains: q, mode: 'insensitive' } }] }, select: { id: true, name: true, email: true, createdAt: true }, take: 20 });
  res.json({ chats: chats.map((chat) => ({ ...chat, messages: chat.messages.map(formatMessage) })), users: users.map((u) => ({ ...u, online: (presenceCounts.get(u.id) || 0) > 0, lastSeenAt: lastSeenMap.get(u.id) || null })), messages: chats.flatMap((chat) => chat.messages.map((message) => ({ ...formatMessage(message), chatId: chat.id }))) });
});

app.get('/chats/:chatId/pins', authMiddleware, async (req: express.Request & { user?: AuthUser }, res) => {
  const member = await ensureChatMembership(req.user!.userId, req.params.chatId);
  if (!member) return res.status(403).json({ message: 'Forbidden' });
  const pins = await prisma.pinnedMessage.findMany({ where: { chatId: req.params.chatId }, include: { message: { include: { sender: { select: { id: true, name: true, email: true } }, reads: { select: { userId: true, readAt: true } }, attachments: true, replyTo: { include: { sender: { select: { name: true } } } } } }, pinnedBy: { select: { id: true, name: true, email: true } } }, orderBy: { createdAt: 'desc' } });
  res.json(pins.map((pin) => ({ ...pin, message: formatMessage(pin.message) })));
});

app.post('/messages/:messageId/pin', authMiddleware, async (req: express.Request & { user?: AuthUser }, res) => {
  const message = await prisma.message.findUnique({ where: { id: req.params.messageId } });
  if (!message) return res.status(404).json({ message: 'Message not found' });
  const member = await ensureChatMembership(req.user!.userId, message.chatId);
  if (!member) return res.status(403).json({ message: 'Forbidden' });
  const pin = await prisma.pinnedMessage.upsert({ where: { chatId_messageId: { chatId: message.chatId, messageId: message.id } }, update: {}, create: { chatId: message.chatId, messageId: message.id, pinnedById: req.user!.userId }, include: { message: { include: { sender: { select: { id: true, name: true, email: true } }, reads: { select: { userId: true, readAt: true } }, attachments: true, replyTo: { include: { sender: { select: { name: true } } } } } }, pinnedBy: { select: { id: true, name: true, email: true } } } });
  io.to(`chat:${message.chatId}`).emit('message:pinned', { chatId: message.chatId, pin: { ...pin, message: formatMessage(pin.message) } });
  res.json({ ...pin, message: formatMessage(pin.message) });
});

app.delete('/messages/:messageId/pin', authMiddleware, async (req: express.Request & { user?: AuthUser }, res) => {
  const message = await prisma.message.findUnique({ where: { id: req.params.messageId } });
  if (!message) return res.status(404).json({ message: 'Message not found' });
  const member = await ensureChatMembership(req.user!.userId, message.chatId);
  if (!member) return res.status(403).json({ message: 'Forbidden' });
  await prisma.pinnedMessage.deleteMany({ where: { chatId: message.chatId, messageId: message.id } });
  io.to(`chat:${message.chatId}`).emit('message:unpinned', { chatId: message.chatId, messageId: message.id });
  res.json({ ok: true, chatId: message.chatId, messageId: message.id });
});

app.get('/chats/:chatId/media', authMiddleware, async (req: express.Request & { user?: AuthUser }, res) => {
  const member = await ensureChatMembership(req.user!.userId, req.params.chatId);
  if (!member) return res.status(403).json({ message: 'Forbidden' });
  const attachments = await prisma.attachment.findMany({ where: { message: { chatId: req.params.chatId, deletedAt: null } }, include: { uploader: { select: { id: true, name: true, email: true } }, message: { select: { id: true, body: true, createdAt: true } } }, orderBy: { createdAt: 'desc' } });
  res.json(attachments);
});

app.get('/notifications', authMiddleware, async (req: express.Request & { user?: AuthUser }, res) => {
  const userId = req.user!.userId;
  const memberships = await prisma.chatMember.findMany({ where: { userId } });
  const notifications = await Promise.all(memberships.map(async (m) => {
    const msgs = await prisma.message.findMany({ where: { chatId: m.chatId, senderId: { not: userId }, deletedAt: null, createdAt: m.lastReadAt ? { gt: m.lastReadAt } : undefined }, include: { sender: { select: { id: true, name: true, email: true } }, attachments: true, replyTo: { include: { sender: { select: { name: true } } } } }, orderBy: { createdAt: 'desc' }, take: 5 });
    return msgs.map((msg) => ({ type: 'message', chatId: m.chatId, message: formatMessage(msg) }));
  }));
  res.json(notifications.flat().sort((a, b) => +new Date(b.message.createdAt) - +new Date(a.message.createdAt)));
});

app.get('/me', authMiddleware, async (req: express.Request & { user?: AuthUser }, res) => {
  try { const user = await prisma.user.findUnique({ where: { id: req.user!.userId, deletedAt: null }, select: { id: true, name: true, email: true } }); if (!user) return res.status(404).json({ message: 'User not found' }); res.json({ ...user, online: (presenceCounts.get(user.id) || 0) > 0 }); } catch (error) { console.error('GET /me error:', error); res.status(500).json({ message: 'Internal server error' }); }
});

app.patch('/me', authMiddleware, async (req: express.Request & { user?: AuthUser }, res) => {
  const parsed = updateMeSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  try { const updated = await prisma.user.update({ where: { id: req.user!.userId, deletedAt: null }, data: { name: parsed.data.name }, select: { id: true, name: true, email: true } }); res.json({ ...updated, online: (presenceCounts.get(updated.id) || 0) > 0 }); } catch (error) { console.error('PATCH /me error:', error); res.status(500).json({ message: 'Internal server error' }); }
});

app.post('/me/change-password', authMiddleware, async (req: express.Request & { user?: AuthUser }, res) => {
  const parsed = changePasswordSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  if (parsed.data.nextPassword !== parsed.data.confirmPassword) return res.status(400).json({ message: 'New passwords do not match' });
  try { const user = await prisma.user.findUnique({ where: { id: req.user!.userId, deletedAt: null } }); if (!user) return res.status(404).json({ message: 'User not found' }); const isValid = await comparePassword(parsed.data.currentPassword, user.passwordHash); if (!isValid) return res.status(400).json({ message: 'Current password is incorrect' }); await prisma.user.update({ where: { id: req.user!.userId }, data: { passwordHash: await hashPassword(parsed.data.nextPassword) } }); res.json({ message: 'Password successfully changed' }); } catch (error) { console.error('POST /me/change-password error:', error); res.status(500).json({ message: 'Internal server error' }); }
});

app.delete('/me', authMiddleware, async (req: express.Request & { user?: AuthUser }, res) => {
  const parsed = deleteMeSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  try {
    // ✅ Soft Delete вместо Hard Delete
    await prisma.user.update({ where: { id: req.user!.userId }, data: { deletedAt: new Date() } });
    res.json({ message: 'Account successfully deleted' });
  } catch (error: any) {
    if (error.code === 'P2003') return res.status(400).json({ message: 'Cannot delete account: active relations exist.' });
    console.error('DELETE /me error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

const socketJwtSecret = process.env.JWT_SECRET || 'change_me';
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Unauthorized'));
  try { const user = jwt.verify(token, socketJwtSecret) as AuthUser; socket.data.user = user; socket.data.deviceId = socket.handshake.auth?.deviceId || crypto.randomUUID(); next(); } catch { next(new Error('Unauthorized')); }
});

io.on('connection', async (socket) => {
  const user = socket.data.user as AuthUser;
  const deviceId = socket.data.deviceId as string;
  const hb = setInterval(() => updatePresence(user.userId, 0), 15000);
  socketHeartbeatTimers.set(socket.id, hb);
  const memberships = await prisma.chatMember.findMany({ where: { userId: user.userId } });
  memberships.forEach((m) => socket.join(`chat:${m.chatId}`));
  socket.emit('presence:ready', { userId: user.userId, chatIds: memberships.map((m) => m.chatId) });
  socket.on('presence:heartbeat', () => updatePresence(user.userId, 0));
  socket.on('chat:join', async (chatId: string) => { const member = await ensureChatMembership(user.userId, chatId); if (member) socket.join(`chat:${chatId}`); });
  socket.on('message:send', async (payload: { chatId: string; body?: string }) => {
    const parsed = sendMessageSchema.safeParse(payload);
    if (!parsed.success) return;
    const member = await ensureChatMembership(user.userId, parsed.data.chatId);
    if (!member || !parsed.data.body?.trim()) return;
    const message = await prisma.message.create({ data: { chatId: parsed.data.chatId, senderId: user.userId, body: parsed.data.body }, include: { sender: { select: { id: true, name: true, email: true } }, reads: { select: { userId: true, readAt: true } }, attachments: true, replyTo: { include: { sender: { select: { name: true } } } } } });
    io.to(`chat:${parsed.data.chatId}`).emit('message:new', formatMessage(message));
  });
  socket.on('typing:start', async ({ chatId }: { chatId: string }) => {
    const member = await ensureChatMembership(user.userId, chatId);
    if (!member) return;
    const key = `${user.userId}:${chatId}`;
    if (typingTimers.has(key)) clearTimeout(typingTimers.get(key)!);
    typingTimers.set(key, setTimeout(() => { io.to(`chat:${chatId}`).emit('typing:update', { chatId, userId: user.userId, isTyping: false }); typingTimers.delete(key); }, 5000));
    socket.to(`chat:${chatId}`).emit('typing:update', { chatId, userId: user.userId, isTyping: true });
  });
  socket.on('typing:stop', async ({ chatId }: { chatId: string }) => {
    const member = await ensureChatMembership(user.userId, chatId);
    if (!member) return;
    const key = `${user.userId}:${chatId}`;
    if (typingTimers.has(key)) { clearTimeout(typingTimers.get(key)!); typingTimers.delete(key); }
    socket.to(`chat:${chatId}`).emit('typing:update', { chatId, userId: user.userId, isTyping: false });
  });
  socket.on('message:read', async ({ messageId }: { messageId: string }) => { await markReadForMessage(user.userId, messageId); });
  socket.on('disconnect', async () => { const timer = socketHeartbeatTimers.get(socket.id); if (timer) clearInterval(timer); socketHeartbeatTimers.delete(socket.id); updatePresence(user.userId, -1); });
});

const port = Number(process.env.PORT || 4000);
httpServer.listen(port, () => console.log(`API listening on http://localhost:${port}`));