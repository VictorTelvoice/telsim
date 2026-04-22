import React, { Suspense } from 'react';
import { getBillingData } from '@/actions/billingActions';
import BillingContent from './BillingContent';
import { Loader2 } from 'lucide-react';

export const metadata = {
  title: 'Facturación | Telsim',
  description: 'Gestiona tus suscripciones y facturas en Telsim.',
};

export default async function BillingPage() {
  const initialData = await getBillingData();

  return (
    <div className="min-h-screen pt-4">
      <Suspense fallback={<BillingLoading />}>
        <BillingContent initialData={initialData} />
      </Suspense>
    </div>
  );
}

function BillingLoading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="relative">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
        <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
      </div>
      <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-600 dark:text-slate-400 animate-pulse">
        Cargando historial financiero...
      </p>
    </div>
  );
}
