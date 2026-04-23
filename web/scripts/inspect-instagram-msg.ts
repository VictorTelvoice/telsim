import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const msg = await prisma.smsLog.findUnique({
    where: { id: '69e80489657c2b72aa591263' }
  });
  console.log(JSON.stringify(msg, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
