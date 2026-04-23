import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const importantKeywords = ["bloqueado", "inscriba", "imei", "multibanda", "bloqueo", "urgente"];
  
  const potentialFixes = await prisma.smsLog.findMany({
    where: { 
      isSpam: true,
      OR: importantKeywords.map(kw => ({ content: { contains: kw } }))
    }
  });

  console.log(`Found ${potentialFixes.length} messages to fix.`);

  for (const msg of potentialFixes) {
    await prisma.smsLog.update({
      where: { id: msg.id },
      data: { isSpam: false }
    });
    console.log(`FIXED: [${msg.sender}] -> ${msg.content.slice(0, 50)}...`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
