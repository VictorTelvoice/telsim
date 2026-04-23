import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const msg = await prisma.smsLog.findFirst({
    where: { sender: '56989963338' },
    orderBy: { createdAt: 'desc' }
  });
  console.log(JSON.stringify(msg, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
