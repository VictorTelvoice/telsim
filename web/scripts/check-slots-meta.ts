import { prisma } from "../lib/prisma";

async function checkSlots() {
  const slots = await prisma.slot.findMany({
    take: 5,
    select: { slotId: true, phoneNumber: true, country: true, status: true }
  });
  console.log(JSON.stringify(slots, null, 2));
}
checkSlots();
