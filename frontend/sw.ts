// frontend/src/sw.ts
/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope;

self.addEventListener('push', (event: PushEvent) => {
  if (!event.data) return;
  
  const data = event.data.json();
  
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon,
      badge: data.badge,
      tag: data.tag,
      requireInteraction: data.requireInteraction,
      data: data.data,
      actions: [
        { action: 'open', title: 'Открыть чат' },
        { action: 'close', title: 'Закрыть' }
      ]
    })
  );
});

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();
  
  if (event.action === 'open' && event.notification.data?.url) {
    event.waitUntil(
      clients.openWindow(event.notification.data.url)
    );
  }
  // Если действие 'close' или нет действия — просто закрываем
});