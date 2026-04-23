import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const messages = await prisma.smsLog.findMany({
    where: { isSpam: true },
    take: 20,
    orderBy: { createdAt: 'desc' }
  });

  console.log("--- RECENT SPAM MESSAGES ---");
  messages.forEach(m => {
    console.log(`ID: ${m.id} | Sender: ${m.sender} | Content: ${m.content}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
