import React, { Suspense } from 'react';
import { getSupportTickets } from '@/actions/supportActions';
import SupportContent from './SupportContent';
import { Loader2 } from 'lucide-react';

export const metadata = {
  title: 'Soporte | Telsim',
  description: 'Centro de soporte Telsim. Abre tickets, consulta el estado de tus solicitudes y contacta a nuestro equipo.',
};

export default async function SupportPage() {
  let initialTickets: any[] = [];
  try {
    initialTickets = await getSupportTickets();
  } catch {
    // User not authenticated or DB error — SupportContent handles empty state
  }

  return (
    <div className="min-h-screen">
      <Suspense fallback={<SupportLoading />}>
        <SupportContent initialTickets={initialTickets} />
      </Suspense>
    </div>
  );
}

function SupportLoading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="relative">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
        <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
      </div>
      <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-600 dark:text-slate-400 animate-pulse">
        Cargando soporte...
      </p>
    </div>
  );
}
