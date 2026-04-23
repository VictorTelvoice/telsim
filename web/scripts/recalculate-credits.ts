import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Recalculating Credits Used for All Active Subscriptions ---');

  const subscriptions = await prisma.subscription.findMany({
    where: { status: 'active' }
  });

  console.log(`Found ${subscriptions.length} active subscriptions.`);

  for (const sub of subscriptions) {
    // Contar mensajes no-spam para este slot/usuario
    const count = await prisma.smsLog.count({
      where: {
        slotId: sub.slotId,
        userId: sub.userId,
        isSpam: false
      }
    });

    console.log(`Sub ID: ${sub.id} | Slot: ${sub.slotId} | Current: ${sub.creditsUsed} | Real: ${count}`);

    if (sub.creditsUsed !== count) {
      await prisma.subscription.update({
        where: { id: sub.id },
        data: { creditsUsed: count }
      });
      console.log(` -> Updated to ${count}`);
    } else {
      console.log(` -> Already in sync.`);
    }
  }

  console.log('--- Finished ---');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
