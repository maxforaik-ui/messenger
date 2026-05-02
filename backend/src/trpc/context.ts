import { prisma } from '../db.js';
import type { AuthUser } from '../auth.js';

export interface TrpcContext {
  user: AuthUser | null;
  prisma: typeof prisma;
}

export function createTrpcContext(user: AuthUser | null): TrpcContext {
  return {
    user,
    prisma
  };
}
