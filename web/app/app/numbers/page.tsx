import React, { Suspense } from 'react';
import { getNumbersPageData } from '@/actions/dashboardActions';
import NumbersContent from './NumbersContent';
import { Loader2 } from 'lucide-react';

export const metadata = {
  title: 'Mis Números | Telsim',
  description: 'Gestiona tus líneas activas, etiquetas y reenvío de mensajes.',
};

export default async function NumbersPage() {
  const initialData = await getNumbersPageData();

  return (
    <div className="min-h-screen">
      <Suspense fallback={<NumbersLoading />}>
        <NumbersContent initialData={initialData} />
      </Suspense>
    </div>
  );
}

function NumbersLoading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="relative">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
        <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
      </div>
      <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-600 dark:text-slate-400 animate-pulse">
        Sincronizando tus líneas...
      </p>
    </div>
  );
}
