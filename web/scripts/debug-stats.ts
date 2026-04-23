import { prisma } from '../lib/prisma';

async function testStats() {
  const email = 'xrasminx@gmail.com';
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return;

  const since = new Date();
  since.setDate(since.getDate() - 29);
  since.setHours(0, 0, 0, 0);

  const messages = await prisma.smsLog.findMany({
    where: { userId: user.id, createdAt: { gte: since } },
    select: { createdAt: true }
  });

  console.log('Messages found:', messages.length);

  const dailyMap: Record<string, number> = {};
  for (let i = 0; i < 30; i++) {
    const d = new Date(since);
    d.setDate(since.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    dailyMap[key] = 0;
  }

  for (const msg of messages) {
    const key = msg.createdAt.toISOString().slice(0, 10);
    if (dailyMap[key] !== undefined) {
      dailyMap[key]++;
    } else {
      console.log('Key not found in map:', key);
    }
  }

  const chart = Object.entries(dailyMap).map(([date, count]) => ({ date, count }));
  console.log('Chart with counts:', chart.filter(c => c.count > 0));
}

testStats().catch(console.error).finally(() => prisma.$disconnect());
