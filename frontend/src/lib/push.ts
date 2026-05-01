// frontend/src/lib/push.ts
import { authFetch } from './api';

const urlBase64ToUint8Array = (base64String: string) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

export async function requestPushPermission() {
  if (!('Notification' in window)) {
    console.warn('Push notifications not supported');
    return false;
  }

  const permission = await Notification.requestPermission();
  return permission === 'granted';
}

export async function subscribeToPush(vapidPublicKey: string) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('Push Manager not supported');
    return null;
  }

  const registration = await navigator.serviceWorker.ready;
  
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
  });

  // Отправляем подписку на сервер
  await authFetch('/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      subscription,
      userAgent: navigator.userAgent
    })
  });

  return subscription;
}

export async function unsubscribeFromPush() {
  if (!('serviceWorker' in navigator)) return;
  
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  
  if (subscription) {
    await authFetch('/push/unsubscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: subscription.endpoint })
    });
    await subscription.unsubscribe();
  }
}