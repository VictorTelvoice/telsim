import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const userId = "69e7f0462d64b1f71f154f65";
  const spam = await prisma.smsLog.findMany({ 
    where: { userId, isSpam: true },
    select: { sender: true, content: true }
  });
  
  spam.forEach(m => {
    console.log(`[${m.sender}] -> ${m.content}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
