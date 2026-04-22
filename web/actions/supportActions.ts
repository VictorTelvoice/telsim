'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export type TicketStatus = 'open' | 'pending' | 'closed';
export type TicketCategory = 'technical' | 'billing' | 'sales' | 'account' | 'other';

export async function getSupportTickets() {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');

  const tickets = await prisma.supportTicket.findMany({
    where: { userId: session.user.id },
    include: {
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      }
    },
    orderBy: { updatedAt: 'desc' }
  });

  return tickets.map(t => ({
    id: t.id,
    subject: t.subject,
    category: t.category as TicketCategory,
    status: t.status as TicketStatus,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
    lastMessage: t.messages[0]?.content ?? null,
    unread: t.messages[0]?.senderType === 'admin',
  }));
}

export async function createTicket(data: { subject: string; category: TicketCategory; message: string }) {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');

  if (!data.subject.trim() || !data.message.trim()) throw new Error('Campos requeridos');

  const ticket = await prisma.supportTicket.create({
    data: {
      userId: session.user.id,
      subject: data.subject.trim(),
      category: data.category,
      status: 'open',
      messages: {
        create: {
          content: data.message.trim(),
          senderType: 'user',
        }
      }
    }
  });

  revalidatePath('/app/support');
  return { success: true, ticketId: ticket.id };
}

export async function getTicketMessages(ticketId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');

  const ticket = await prisma.supportTicket.findFirst({
    where: { id: ticketId, userId: session.user.id },
    include: {
      messages: { orderBy: { createdAt: 'asc' } }
    }
  });

  if (!ticket) throw new Error('Ticket not found');

  return {
    id: ticket.id,
    subject: ticket.subject,
    category: ticket.category as TicketCategory,
    status: ticket.status as TicketStatus,
    createdAt: ticket.createdAt.toISOString(),
    messages: ticket.messages.map(m => ({
      id: m.id,
      content: m.content,
      senderType: m.senderType,
      createdAt: m.createdAt.toISOString(),
    }))
  };
}

export async function replyToTicket(ticketId: string, message: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');

  const ticket = await prisma.supportTicket.findFirst({
    where: { id: ticketId, userId: session.user.id }
  });

  if (!ticket) throw new Error('Ticket not found');
  if (ticket.status === 'closed') throw new Error('Este ticket está cerrado');

  await prisma.supportMessage.create({
    data: {
      ticketId,
      content: message.trim(),
      senderType: 'user',
    }
  });

  await prisma.supportTicket.update({
    where: { id: ticketId },
    data: { status: 'open', updatedAt: new Date() }
  });

  revalidatePath(`/app/support/${ticketId}`);
  return { success: true };
}

export async function closeTicket(ticketId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');

  await prisma.supportTicket.updateMany({
    where: { id: ticketId, userId: session.user.id },
    data: { status: 'closed' }
  });

  revalidatePath('/app/support');
  revalidatePath(`/app/support/${ticketId}`);
  return { success: true };
}
