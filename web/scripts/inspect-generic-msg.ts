import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const msg = await prisma.smsLog.findUnique({
    where: { id: '69e982f5abc7f5ab5a9c4995' }
  });
  console.log(JSON.stringify(msg, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
