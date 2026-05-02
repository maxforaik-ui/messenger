import { PrismaClient } from '@prisma/client';

declare global {
  var prisma: PrismaClient | undefined;
}

export const prisma = globalThis.prisma || new PrismaClient({
  log: ['warn', 'error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma;
}

// Обработка ошибок подключения
prisma.$on('error', (e) => {
  console.error('[prisma] error:', e);
});

prisma.$on('warn', (e) => {
  console.warn('[prisma] warn:', e);
});