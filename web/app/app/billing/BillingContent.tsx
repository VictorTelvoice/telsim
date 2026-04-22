'use client';

import React, { useState } from 'react';
import { 
  CreditCard, 
  ExternalLink, 
  FileText, 
  History, 
  Zap, 
  Smartphone, 
  ArrowUpRight,
  RefreshCw,
  Loader2,
  CheckCircle2,
  Clock,
  AlertCircle
} from 'lucide-react';
import { createStripePortalLink, syncInvoicesWithStripe } from '@/actions/billingActions';

interface BillingContentProps {
  initialData: {
    subscriptions: any[];
    invoices: any[];
  }
}

export default function BillingContent({ initialData }: BillingContentProps) {
  const [subscriptions, setSubscriptions] = useState(initialData.subscriptions);
  const [invoices, setInvoices] = useState(initialData.invoices);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isPortalLoading, setIsPortalLoading] = useState(false);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await syncInvoicesWithStripe();
      // Re-fetch logic or just window reload for simplicity in this demo
      window.location.reload();
    } catch (error) {
      console.error(error);
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePortal = async () => {
    setIsPortalLoading(true);
    try {
      const url = await createStripePortalLink();
      window.location.href = url;
    } catch (error) {
      console.error(error);
      alert("No se pudo generar el enlace al portal. Por favor contacta a soporte.");
    } finally {
      setIsPortalLoading(false);
    }
  };

  const activeSubs = subscriptions.filter(s => s.status === 'active' || s.status === 'trialing');
  const canceledSubs = subscriptions.filter(s => s.status === 'canceled' || s.status === 'expired');

  return (
    <div className="space-y-10 pb-32 animate-in fade-in duration-700">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row gap-6 items-center justify-between">
        <div className="flex items-center gap-4 w-full lg:w-auto">
          <div className="bg-primary/10 p-4 rounded-3xl text-primary shadow-xl shadow-primary/5">
            <CreditCard size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Facturación</h1>
            <p className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">Gestiona tus suscripciones y pagos</p>
          </div>
        </div>

        <button 
          onClick={handlePortal}
          disabled={isPortalLoading}
          className="w-full lg:w-auto flex items-center justify-center gap-2 px-8 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-3xl text-xs font-black uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all shadow-2xl shadow-slate-200 dark:shadow-none"
        >
          {isPortalLoading ? <Loader2 size={18} className="animate-spin" /> : <ExternalLink size={18} />}
          Portal de Pagos Stripe
        </button>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        
        {/* Left Column: Active Subscriptions */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
             <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
               Suscripciones Activas
               <span className="bg-primary/10 text-primary text-[10px] px-2 py-0.5 rounded-full">{activeSubs.length}</span>
             </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {activeSubs.length === 0 ? (
              <div className="col-span-2 bg-[var(--card)] rounded-[2.5rem] border border-dashed border-slate-200 dark:border-slate-800 p-12 text-center shadow-[var(--shadow)]">
                 <p className="text-sm font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">No tienes suscripciones activas</p>
              </div>
            ) : (
              activeSubs.map((sub) => (
                <SubscriptionCard key={sub.id} sub={sub} />
              ))
            )}
          </div>

          {canceledSubs.length > 0 && (
             <div className="mt-12 space-y-6">
                <h2 className="text-lg font-black text-slate-600 dark:text-slate-500 uppercase tracking-tight">Histórico / Canceladas</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
                  {canceledSubs.map((sub) => (
                    <SubscriptionCard key={sub.id} sub={sub} />
                  ))}
                </div>
             </div>
          )}
        </div>

        {/* Right Column: Invoices & History */}
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Facturas Recientes</h2>
            <button 
              onClick={handleSync}
              disabled={isSyncing}
              className="p-3 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-600 dark:text-slate-400"
            >
              <RefreshCw size={18} className={isSyncing ? 'animate-spin' : ''} />
            </button>
          </div>

          <div className="bg-[var(--card)] rounded-[2.5rem] border border-slate-100 dark:border-slate-800 p-6 space-y-4 shadow-[var(--shadow)] transition-colors">
            {invoices.length === 0 ? (
              <div className="py-12 text-center">
                 <History className="mx-auto mb-3 text-slate-200" size={32} />
                 <p className="text-[10px] font-black text-slate-500 dark:text-slate-600 uppercase tracking-widest">Sin facturas registradas</p>
              </div>
            ) : (
              invoices.map((inv) => (
                <InvoiceItem key={inv.id} inv={inv} />
              ))
            )}
            
            <p className="text-[9px] font-bold text-slate-500 text-center uppercase tracking-widest pt-4">
              Las facturas pueden tardar unos minutos en sincronizarse
            </p>
          </div>

          {/* Info Box */}
          <div className="bg-gradient-to-br from-blue-600 to-primary rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl shadow-primary/20">
             <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                <Zap size={120} />
             </div>
             <h3 className="text-lg font-black italic uppercase tracking-tight mb-2">Renovación Automática</h3>
             <p className="text-xs text-blue-100/80 leading-relaxed mb-6">Todas tus suscripciones se renuevan automáticamente cada mes para asegurar la continuidad de tu servicio.</p>
             <button 
               onClick={handlePortal}
               className="w-full py-4 bg-white/10 hover:bg-white/20 border border-white/20 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all backdrop-blur-md"
             >
               Editar Métodos de Pago
             </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SubscriptionCard({ sub }: any) {
  const isCanceled = sub.status === 'canceled' || sub.status === 'expired';

  return (
    <div className="bg-[var(--card)] rounded-[2.5rem] border border-slate-100 dark:border-slate-800 p-6 shadow-[var(--shadow)] hover:shadow-[var(--shadow-lg)] transition-all group overflow-hidden relative">
      <div className="flex justify-between items-start mb-6">
        <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
           <Zap size={20} className={sub.status === 'active' ? 'text-primary' : ''} />
        </div>
        <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-full ${
          sub.status === 'active' ? 'bg-emerald-500/10 text-emerald-500' : 
          sub.status === 'trialing' ? 'bg-blue-500/10 text-blue-500' :
          'bg-slate-500/10 text-slate-500'
        }`}>
          {sub.status === 'active' ? 'Activa' : sub.status === 'trialing' ? 'Trial' : 'Terminada'}
        </span>
      </div>

      <div className="space-y-1">
        <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">{sub.planName}</h4>
        <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">
           <Smartphone size={14} />
           {sub.phoneNumber || 'Número reservado'}
        </div>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-4">
        <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-2xl">
           <p className="text-[8px] font-black uppercase text-slate-600 dark:text-slate-400 mb-1">Costo</p>
           <p className="text-xs font-black text-slate-800 dark:text-slate-200 tabular-nums">
             ${(sub.amount || 0) / 100} / {sub.billingType === 'annual' ? 'Año' : 'Mes'}
           </p>
        </div>
        <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-2xl">
           <p className="text-[8px] font-black uppercase text-slate-600 dark:text-slate-400 mb-1">SMS</p>
           <p className="text-xs font-black text-slate-800 dark:text-slate-200 tabular-nums">
             {sub.creditsUsed} / {sub.monthlyLimit}
           </p>
        </div>
      </div>

      {!isCanceled && (
        <div className="mt-6 flex gap-2">
           <button className="flex-1 py-3 bg-slate-900 dark:bg-slate-800 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-colors">
             Detalles
           </button>
           <button className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              <ArrowUpRight size={16} className="text-slate-600 dark:text-slate-400" /></button>
        </div>
      )}
    </div>
  );
}

function InvoiceItem({ inv }: any) {
  const isPaid = inv.status === 'paid';

  return (
    <div className="flex items-center gap-4 p-4 rounded-3xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all group border border-transparent hover:border-slate-100 dark:hover:border-slate-800">
      <div className={`p-3 rounded-2xl ${isPaid ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
         {isPaid ? <CheckCircle2 size={20} /> : <Clock size={20} />}
      </div>
      <div className="flex-1 min-w-0">
         <p className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-tight truncate">
           {inv.number || `Factura #${inv.id.slice(-6)}`}
         </p>
         <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">
           {new Date(inv.createdAt).toLocaleDateString()}
         </p>
      </div>
      <div className="text-right flex flex-col items-end gap-2">
         <p className="text-xs font-black text-slate-900 dark:text-white tabular-nums">${inv.amount / 100}</p>
         <div className="flex gap-1">
           {inv.invoicePdf && (
             <button 
               onClick={() => window.open(inv.invoicePdf, '_blank')}
               className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-primary transition-colors"
             >
                <FileText size={14} />
             </button>
           )}
           {inv.hostedInvoiceUrl && (
             <button 
               onClick={() => window.open(inv.hostedInvoiceUrl, '_blank')}
               className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-primary transition-colors"
             >
                <ExternalLink size={14} />
             </button>
           )}
         </div>
      </div>
    </div>
  );
}
