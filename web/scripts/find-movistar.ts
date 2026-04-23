import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const msgs = await prisma.smsLog.findMany({
    where: { sender: { contains: 'MOVISTAR' } }
  });
  console.log(`Found ${msgs.length} messages from MOVISTAR`);
  msgs.forEach(m => {
    console.log(`ID: ${m.id} | Sender: ${m.sender} | isSpam: ${m.isSpam} | Content: ${m.content}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
