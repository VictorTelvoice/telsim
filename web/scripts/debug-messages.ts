import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const msgs = await prisma.smsLog.findMany({
    take: 20,
    orderBy: { createdAt: 'desc' },
    select: { id: true, sender: true, content: true, isSpam: true }
  });
  console.log(JSON.stringify(msgs, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
