import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const allMsgs = await prisma.smsLog.findMany({
    orderBy: { createdAt: 'desc' },
  });
  
  console.log("Total messages:", allMsgs.length);
  const nonSpam = allMsgs.filter(m => !m.isSpam);
  console.log("Non-spam messages:", nonSpam.length);
  
  nonSpam.forEach(m => {
    const code = m.content.match(/\b(\d{4,8})\b/);
    console.log(`ID: ${m.id} | Sender: ${m.sender} | isOtp: ${!!code} | Content: ${m.content}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
