import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

function extractCode(content: string): string | null {
  const m = content.match(/\b(\d{2,4}[\s-]?\d{2,4})\b/);
  if (!m) return null;
  const clean = m[1].replace(/[\s-]/g, '');
  if (clean.length >= 4 && clean.length <= 8) return clean;
  return null;
}

async function main() {
  const userId = "69e7f0462d64b1f71f154f65"; // ID del usuario Alexander
  const messages = await prisma.smsLog.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' }
  });

  console.log(`Total messages in DB: ${messages.length}`);

  const filtered = messages.filter((msg: any) => {
    const code = extractCode(msg.content);
    const isOtp = !!code;
    const isSpam = msg.isSpam;
    
    // Simulating "Todos" filter
    const matchesType = true; // typeFilter === 'all'
    const matchesSlot = true; // slotFilter === 'all'
    const matchesSearch = true; // no search
    
    return matchesSearch && matchesType && matchesSlot && !isSpam;
  });

  console.log(`Visible in "Todos": ${filtered.length}`);
  console.log(`Hidden as Spam: ${messages.length - filtered.length}`);

  const hidden = messages.filter(m => m.isSpam);
  console.log("\n--- HIDDEN AS SPAM ---");
  hidden.forEach(m => {
    console.log(`Sender: ${m.sender} | Content: ${m.content}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
