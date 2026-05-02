import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '../../../backend/src/trpc/router.js';

export const trpc = createTRPCReact<AppRouter>();

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export function getTrpcClient(getToken: () => string | null) {
  return trpc.createClient({
    transformer: {
      input: (data) => JSON.stringify(data),
      output: (data) => JSON.parse(data as string),
    },
    links: [
      trpc.link.httpBatchLink({
        url: `${API_URL}/trpc`,
        headers() {
          const token = getToken();
          return { Authorization: `Bearer ${token}` };
        },
      }),
    ],
  });
}

export type { AppRouter };
