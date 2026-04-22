import React, { Suspense } from 'react';
import { getTicketMessages } from '@/actions/supportActions';
import { notFound } from 'next/navigation';
import TicketDetail from './TicketDetail';
import { Loader2 } from 'lucide-react';

export const metadata = {
  title: 'Ticket | Telsim Soporte',
};

export default async function TicketPage({ params }: { params: { id: string } }) {
  let ticket = null;
  try {
    ticket = await getTicketMessages(params.id);
  } catch {
    notFound();
  }

  if (!ticket) notFound();

  return (
    <div className="min-h-screen">
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
        </div>
      }>
        <TicketDetail initialTicket={ticket} />
      </Suspense>
    </div>
  );
}
