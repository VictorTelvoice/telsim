import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const query = searchParams.get('q');

  if (!query || query.length < 2) {
    return NextResponse.json({ results: [] });
  }

  try {
    const userId = session.user.id;

    // Search in Slots (Labels and Phone Numbers)
    const slots = await prisma.slot.findMany({
      where: {
        assignedTo: userId,
        OR: [
          { label: { contains: query, mode: 'insensitive' } },
          { phoneNumber: { contains: query, mode: 'insensitive' } },
          { slotId: { contains: query, mode: 'insensitive' } }
        ]
      },
      take: 5
    });

    // Search in SmsLogs (Content, Sender, VerificationCode)
    const messages = await prisma.smsLog.findMany({
      where: {
        userId,
        OR: [
          { content: { contains: query, mode: 'insensitive' } },
          { sender: { contains: query, mode: 'insensitive' } },
          { serviceName: { contains: query, mode: 'insensitive' } },
          { verificationCode: { contains: query, mode: 'insensitive' } }
        ]
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    return NextResponse.json({
      results: {
        slots: slots.map(s => ({
          id: s.id,
          type: 'slot',
          title: s.label || s.phoneNumber,
          subtitle: s.phoneNumber,
          link: `/app/numbers?q=${s.phoneNumber}`
        })),
        messages: messages.map(m => ({
          id: m.id,
          type: 'message',
          title: m.serviceName || m.sender,
          subtitle: m.content,
          code: m.verificationCode,
          link: `/app/messages?num=${m.sender}`
        }))
      }
    });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
