'use client';

import React, { useState } from 'react';
import { Link2, CheckCircle2, Loader2, AlertCircle, Terminal, Copy, ShieldCheck } from 'lucide-react';
import { updateWebhookConfig } from '@/actions/settingsActions';

export default function WebhooksContent({ initialUser }: { initialUser: any }) {
  const [url, setUrl] = useState(initialUser?.webhookUrl || '');
  const [active, setActive] = useState(initialUser?.webhookActive || false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const secretKey = initialUser?.apiSecretKey || 'sk_telsim_********************';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus('idle');
    try {
      await updateWebhookConfig({ url, active });
      setStatus('success');
      setTimeout(() => setStatus('idle'), 3000);
    } catch (error) {
      console.error(error);
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Simple alert for feedback
    alert('Copiado al portapapeles');
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center gap-4">
        <div className="bg-primary/10 p-4 rounded-3xl text-primary">
          <Link2 size={32} />
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Webhooks & API</h1>
          <p className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">Integra Telsim con tus aplicaciones</p>
        </div>
      </div>

      <div className="bg-[var(--card)] rounded-[2.5rem] border border-slate-100 dark:border-slate-800 p-8 shadow-[var(--shadow)] transition-colors">
        <form onSubmit={handleSubmit} className="space-y-6">
          
          <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-4">
               <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 text-primary">
                  <CheckCircle2 size={18} />
               </div>
               <div>
                  <p className="text-sm font-black text-slate-900 dark:text-white uppercase">Estado Webhook</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">{active ? 'Webhook habilitado' : 'Webhook deshabilitado'}</p>
               </div>
            </div>
            <button 
              type="button"
              onClick={() => setActive(!active)}
              className={`w-12 h-6 rounded-full relative transition-colors duration-300 ${active ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-600'}`}
            >
               <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-xl transition-all duration-300 ${active ? 'right-1' : 'left-1'}`} />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest ml-4 mb-2 block">Webhook URL (POST)</label>
              <input 
                type="url" 
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://tudominio.com/api/webhook"
                className="w-full px-6 py-4 bg-[var(--muted)] border-2 border-slate-200 dark:border-slate-700 rounded-3xl text-sm font-bold focus:border-primary outline-none transition-all text-slate-900 dark:text-white"
              />
            </div>

            <div className="pt-4 border-t border-slate-50 dark:border-slate-800">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-2 block flex items-center gap-2">
                 <ShieldCheck size={14} className="text-emerald-500" />
                 Signing Secret / API Key
               </label>
               <div className="flex gap-2">
                  <div className="flex-1 px-6 py-4 bg-[var(--muted)] rounded-3xl text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400 overflow-hidden truncate flex items-center shadow-inner">
                    {secretKey}
                  </div>
                  <button 
                    type="button"
                    onClick={() => copyToClipboard(secretKey)}
                    className="p-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-3xl hover:scale-105 active:scale-95 transition-all shadow-lg"
                  >
                     <Copy size={18} />
                  </button>
               </div>
            </div>
          </div>

          <div className="pt-4">
            <button 
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-8 py-5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-3xl text-xs font-black uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-slate-200 dark:shadow-none"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Terminal size={18} />}
              Guardar Cambios
            </button>
          </div>

          {status === 'success' && (
            <div className="flex items-center gap-2 text-emerald-500 justify-center text-[10px] font-black uppercase tracking-widest animate-in fade-in zoom-in duration-300">
               <CheckCircle2 size={14} />
               Webhook actualizado correctamente
            </div>
          )}
        </form>
      </div>

      <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl shadow-slate-200 dark:shadow-none">
         <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <Terminal size={150} />
         </div>
         <h3 className="text-xl font-black italic uppercase tracking-tight mb-4 flex items-center gap-2">
            Formato de la Carga Útil
         </h3>
         <div className="bg-slate-800 rounded-2xl p-4 font-mono text-[10px] text-slate-300 space-y-1">
            <p>&#123;</p>
            <p className="pl-4">"type": "sms.received",</p>
            <p className="pl-4">"data": &#123;</p>
            <p className="pl-8">"id": "msg_12345",</p>
            <p className="pl-8">"phoneNumber": "+56912345678",</p>
            <p className="pl-8">"sender": "Google",</p>
            <p className="pl-8">"content": "G-492103 es tu código...",</p>
            <p className="pl-8">"verificationCode": "492103"</p>
            <p className="pl-4">&#125;</p>
            <p>&#125;</p>
         </div>
         <p className="text-[10px] font-bold text-slate-400 mt-6 uppercase tracking-widest italic">Consulte la documentación para verificar la firma de seguridad.</p>
      </div>
    </div>
  );
}
