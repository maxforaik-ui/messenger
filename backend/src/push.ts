// backend/src/push.ts
import webpush from 'web-push';
import { prisma } from './db.js';

// Инициализация VAPID
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || 'mailto:admin@messenger.local',
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function subscribeUser(userId: string, subscription: PushSubscriptionJSON, userAgent?: string) {
  return prisma.pushSubscription.upsert({
    where: { endpoint: subscription.endpoint! },
    update: {
      keys: subscription.keys as any,
      userAgent,
      lastUsedAt: new Date()
    },
    create: {
      userId,
      endpoint: subscription.endpoint!,
      keys: subscription.keys as any,
      userAgent,
      lastUsedAt: new Date()
    }
  });
}

export async function unsubscribeUser(userId: string, endpoint: string) {
  return prisma.pushSubscription.deleteMany({
    where: { userId, endpoint }
  });
}

export async function sendPushNotification(userId: string, title: string, body: string, icon = '/icon-192.png', data?: any) {
  const subscriptions = await prisma.pushSubscription.findMany({ where: { userId } });
  
  const payload = JSON.stringify({
    title,
    body,
    icon,
    badge: '/icon-192.png',
    tag: `msg-${Date.now()}`,
    requireInteraction: true,
    data: {
      ...data,
      timestamp: Date.now(),
      url: data?.chatId ? `/chat/${data.chatId}` : '/'
    }
  });

  const sendPromises = subscriptions.map(async (sub) => {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: {
            p256dh: (sub.keys as any).p256dh,
            auth: (sub.keys as any).auth
          }
        } as any,
        payload
      );
      // Обновляем lastUsedAt при успешной отправке
      await prisma.pushSubscription.update({
        where: { id: sub.id },
        data: { lastUsedAt: new Date() }
      });
    } catch (error: any) {
      // Если подписка недействительна (410/404) — удаляем её
      if (error.statusCode === 410 || error.statusCode === 404) {
        await prisma.pushSubscription.delete({ where: { id: sub.id } });
      } else {
        console.error('Push error:', error);
      }
    }
  });

  await Promise.all(sendPromises);
}