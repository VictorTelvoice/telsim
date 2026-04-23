import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Retroactive Spam Correction ---');
  
  // 1. Find all messages from MOVISTAR or containing Movistar welcome text that are not marked as spam
  const messagesToFix = await prisma.smsLog.findMany({
    where: {
      isSpam: false,
      OR: [
        { sender: { contains: 'MOVISTAR', mode: 'insensitive' } },
        { content: { contains: 'Bienvenido a Movistar', mode: 'insensitive' } },
        { content: { contains: 'configuraciones que optimizaran', mode: 'insensitive' } }
      ]
    },
    include: {
      slot: {
        include: {
          subscriptions: {
            where: { status: 'active' },
            take: 1
          }
        }
      }
    }
  });

  console.log(`Found ${messagesToFix.length} messages to fix.`);

  for (const msg of messagesToFix) {
    console.log(`Fixing message ${msg.id}...`);
    
    // Mark as spam
    await prisma.smsLog.update({
      where: { id: msg.id },
      data: { isSpam: true }
    });

    // Refund credit if applicable
    const activeSub = msg.slot.subscriptions[0];
    if (activeSub && activeSub.creditsUsed > 0) {
      await prisma.subscription.update({
        where: { id: activeSub.id },
        data: { creditsUsed: { decrement: 1 } }
      });
      console.log(` -> Credited back 1 token to sub ${activeSub.id}. New count: ${activeSub.creditsUsed - 1}`);
    }
  }

  console.log('--- Finished ---');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
