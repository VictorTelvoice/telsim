import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const messages = await prisma.smsLog.findMany({
      where: { userId: session.user.id },
      include: { slot: true },
      orderBy: { createdAt: 'desc' },
      take: 300
    });
    
    return NextResponse.json(messages);
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
