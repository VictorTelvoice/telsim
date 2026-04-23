import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const userId = "69e7f0462d64b1f71f154f65";
  const messages = await prisma.smsLog.findMany({ where: { userId } });
  
  const spam = messages.filter(m => m.isSpam);
  const nonSpam = messages.filter(m => !m.isSpam);
  
  console.log(`Total: ${messages.length}`);
  console.log(`Spam: ${spam.length}`);
  console.log(`Non-Spam: ${nonSpam.length}`);
  
  console.log("\n--- Senders in Non-Spam ---");
  const senders = [...new Set(nonSpam.map(m => m.sender))];
  console.log(senders);
}

main().catch(console.error).finally(() => prisma.$disconnect());
