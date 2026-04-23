import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Checking Recent Messages from MOVISTAR ---');
  
  const messages = await prisma.smsLog.findMany({
    where: {
      OR: [
        { sender: { contains: 'MOVISTAR', mode: 'insensitive' } },
        { content: { contains: 'Bienvenido a Movistar', mode: 'insensitive' } }
      ]
    },
    orderBy: { createdAt: 'desc' },
    take: 10
  });

  if (messages.length === 0) {
    console.log('No messages found matching criteria.');
  }

  for (const msg of messages) {
    console.log(`ID: ${msg.id} | Sender: ${msg.sender} | isSpam: ${msg.isSpam} | Content: ${msg.content.substring(0, 50)}...`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
