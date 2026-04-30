import { createClient } from 'redis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

export const presenceClient = createClient({ url: REDIS_URL });
export const streamsClient = createClient({ url: REDIS_URL });

async function safeConnect(client: ReturnType<typeof createClient>, label: string) {
  if (client.isOpen) return;
  client.on('error', (err) => console.warn(`[redis:${label}]`, err.message));
  try {
    await client.connect();
  } catch (err) {
    console.warn(`[redis:${label}] degraded mode`, err instanceof Error ? err.message : err);
  }
}

export async function connectPresenceRedis() {
  await safeConnect(presenceClient, 'presence');
}

export async function connectStreamsRedis() {
  await safeConnect(streamsClient, 'streams');
}
