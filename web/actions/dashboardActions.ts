'use server';

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function getDashboardData() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const userId = session.user.id;

  // 1. Fetch active slots with subscriptions (using correct model names)
  const slots = await prisma.slot.findMany({
    where: { 
      assignedTo: userId,
      status: 'ocupado'
    },
    include: {
      subscriptions: {
        where: { status: 'active' },
        take: 1
      }
    }
  });

  // 2. Fetch total SMS count
  const totalSms = await prisma.smsLog.count({
    where: { userId }
  });

  // 3. Fetch recent messages for the live feed
  const recentMessages = await prisma.smsLog.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 50
  });

  // 4. Calculate total credits
  const totalCredits = slots.reduce((acc, slot) => {
    const activeSub = slot.subscriptions[0];
    return acc + (activeSub?.monthlyLimit || 0);
  }, 0);

  const usedCredits = slots.reduce((acc, slot) => {
    const activeSub = slot.subscriptions[0];
    return acc + (activeSub?.creditsUsed || 0);
  }, 0);

  return {
    stats: {
      activeNumbers: slots.length,
      totalSms,
      totalCredits,
      usedCredits,
      remainingCredits: totalCredits - usedCredits
    },
    recentMessages,
    slots: slots.map(s => ({
      ...s,
      activeSubscription: s.subscriptions[0] || null
    }))
  };
}

export async function getMessagesPageData() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const userId = session.user.id;

  const [slots, messages] = await Promise.all([
    prisma.slot.findMany({
      where: { assignedTo: userId },
      select: { slotId: true, phoneNumber: true }
    }),
    prisma.smsLog.findMany({
      where: { userId },
      include: { slot: true },
      orderBy: { createdAt: 'desc' },
      take: 200
    })
  ]);

  return { slots, messages };
}

export async function getNumbersPageData() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const userId = session.user.id;

  const slots = await prisma.slot.findMany({
    where: { assignedTo: userId },
    include: {
      subscriptions: {
        where: { status: 'active' },
        take: 1
      }
    }
  });

  return { 
    slots: slots.map(s => ({
      ...s,
      activeSubscription: s.subscriptions[0] || null
    }))
  };
}

export async function updateSlotLabel(slotId: string, label: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  return await prisma.slot.update({
    where: { 
      slotId,
      assignedTo: session.user.id
    },
    data: { label }
  });
}

export async function toggleForwarding(slotId: string, active: boolean) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  return await prisma.slot.update({
    where: { 
      slotId,
      assignedTo: session.user.id
    },
    data: { forwardingActive: active }
  });
}

export async function releaseNumber(slotId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const slot = await prisma.slot.findFirst({
    where: { 
      slotId,
      assignedTo: session.user.id
    }
  });

  if (!slot) throw new Error("Slot not found or unauthorized");

  return await prisma.slot.update({
    where: { slotId },
    data: { 
      status: 'libre',
      assignedTo: null,
    }
  });
}

export async function getRecentMessages() {
  const session = await auth();
  if (!session?.user?.id) return [];

  return await prisma.smsLog.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    take: 20
  });
}

export async function getStatsData() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const userId = session.user.id;

  const since = new Date();
  since.setDate(since.getDate() - 29);
  since.setHours(0, 0, 0, 0);

  const [allMessages, slots, totalCount, recentMessages] = await Promise.all([
    prisma.smsLog.findMany({
      where: { userId, createdAt: { gte: since } },
      select: { createdAt: true, sender: true, content: true, slotId: true },
      orderBy: { createdAt: 'asc' }
    }),
    prisma.slot.findMany({
      where: { assignedTo: userId },
      include: {
        subscriptions: { where: { status: 'active' }, take: 1 }
      }
    }),
    prisma.smsLog.count({ where: { userId } }),
    prisma.smsLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 5
    })
  ]);

  // Build daily chart data (last 31 days to cover all timezones)
  const dailyMap: Record<string, number> = {};
  const today = new Date();
  
  // Generamos 31 días para estar seguros de cubrir el desfase UTC
  for (let i = 30; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    dailyMap[key] = 0;
  }

  for (const msg of allMessages) {
    const key = new Date(msg.createdAt).toISOString().slice(0, 10);
    if (dailyMap[key] !== undefined) {
      dailyMap[key]++;
    } else {
      // Si por algún motivo el mensaje es "del futuro" (UTC), lo sumamos al último día disponible
      const keys = Object.keys(dailyMap);
      const lastKey = keys[keys.length - 1];
      if (key > lastKey) dailyMap[lastKey]++;
    }
  }
  const dailyChart = Object.entries(dailyMap).map(([date, count]) => ({ date, count }));

  // Per-slot breakdown
  const slotBreakdown = slots.map(slot => {
    // IMPORTANTE: m.slotId es el ObjectId (id interno), slot.id es el mismo ObjectId
    const msgCount = allMessages.filter(m => m.slotId === slot.id).length;
    const sub = slot.subscriptions[0];
    return {
      slotId: slot.slotId, // Identificador externo (ej: Skyline:1)
      phoneNumber: slot.phoneNumber,
      label: slot.label,
      msgs30d: msgCount,
      creditsUsed: sub?.creditsUsed || 0,
      monthlyLimit: sub?.monthlyLimit || 150,
      planName: sub?.planName || 'Starter',
    };
  });

  // Top senders
  const senderMap: Record<string, number> = {};
  for (const msg of allMessages) {
    const key = msg.sender || 'Desconocido';
    senderMap[key] = (senderMap[key] || 0) + 1;
  }
  const topSenders = Object.entries(senderMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([sender, count]) => ({ sender, count }));

  // Week-over-week comparison
  const now = new Date();
  const cutoff7 = new Date(now); cutoff7.setDate(now.getDate() - 7);
  const cutoff14 = new Date(now); cutoff14.setDate(now.getDate() - 14);

  const last7 = allMessages.filter(m => new Date(m.createdAt) >= cutoff7).length;
  const prev7 = allMessages.filter(m => {
    const d = new Date(m.createdAt);
    return d >= cutoff14 && d < cutoff7;
  }).length;

  const weekChange = prev7 === 0 ? (last7 > 0 ? 100 : 0) : Math.round(((last7 - prev7) / prev7) * 100);

  return {
    totalMessages: totalCount,
    messages30d: allMessages.length,
    activeSlots: slots.filter(s => s.status === 'ocupado').length,
    last7,
    prev7,
    weekChange,
    dailyChart,
    slotBreakdown,
    topSenders,
    recentMessages,
  };
}
