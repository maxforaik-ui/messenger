import { prisma } from './db.js';

async function run() {
  const memberships = await prisma.chatMember.findMany();
  const now = new Date();
  console.log(`[worker] scanned ${memberships.length} memberships at`, now.toISOString());
}

run()
  .then(() => {
    console.log('[worker] done');
    process.exit(0);
  })
  .catch((err) => {
    console.error('[worker] error', err);
    process.exit(1);
  });
