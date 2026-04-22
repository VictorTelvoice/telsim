import React, { Suspense } from 'react';
import { getDashboardData } from '@/actions/dashboardActions';
import DashboardContent from './DashboardContent';
import { Loader2 } from 'lucide-react';

export const metadata = {
  title: 'Dashboard | Telsim',
  description: 'Gestiona tus números y mensajes en tiempo real.',
};

export default async function DashboardPage() {
  // Fetch initial data for SSR
  const initialData = await getDashboardData();

  return (
    <div className="min-h-screen">
      <Suspense fallback={<DashboardLoading />}>
        <DashboardContent initialData={initialData} />
      </Suspense>
    </div>
  );
}

function DashboardLoading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="relative">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
        <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
      </div>
      <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-600 dark:text-slate-400 animate-pulse">
        Sincronizando con la red...
      </p>
    </div>
  );
}
