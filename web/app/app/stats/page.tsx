import React, { Suspense } from 'react';
import { getStatsData } from '@/actions/dashboardActions';
import StatsContent from './StatsContent';
import { Loader2 } from 'lucide-react';

export const metadata = {
  title: 'Estadísticas | Telsim',
  description: 'Analiza el uso de tu infraestructura SMS: actividad diaria, desglose por línea y servicios más usados.',
};

export default async function StatsPage() {
  const initialData = await getStatsData();

  return (
    <div className="min-h-screen">
      <Suspense fallback={<StatsLoading />}>
        <StatsContent initialData={initialData} />
      </Suspense>
    </div>
  );
}

function StatsLoading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="relative">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
        <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
      </div>
      <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-600 dark:text-slate-400 animate-pulse">
        Calculando estadísticas...
      </p>
    </div>
  );
}
