import React, { Suspense } from 'react';
import { getMessagesPageData } from '@/actions/dashboardActions';
import MessagesContent from './MessagesContent';
import { Loader2 } from 'lucide-react';

export const metadata = {
  title: 'Mensajes | Telsim',
  description: 'Consulta todos tus mensajes y códigos OTP recibidos.',
};

export default async function MessagesPage() {
  const initialData = await getMessagesPageData();

  return (
    <div className="min-h-screen">
      <Suspense fallback={<MessagesLoading />}>
        <MessagesContent initialData={initialData} />
      </Suspense>
    </div>
  );
}

function MessagesLoading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="relative">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
        <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
      </div>
      <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-600 dark:text-slate-400 animate-pulse">
        Cargando historial de mensajes...
      </p>
    </div>
  );
}
