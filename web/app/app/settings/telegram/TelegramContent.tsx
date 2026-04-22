'use client';

import React, { useState } from 'react';
import { Send, CheckCircle2, Loader2, AlertCircle, ExternalLink, Bot } from 'lucide-react';
import { updateTelegramConfig } from '@/actions/settingsActions';
import { useSession } from 'next-auth/react';

export default function TelegramContent({ initialUser }: { initialUser: any }) {
  const [token, setToken] = useState(initialUser?.telegramToken || '');
  const [chatId, setChatId] = useState(initialUser?.telegramChatId || '');
  const [enabled, setEnabled] = useState(initialUser?.telegramEnabled || false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus('idle');
    try {
      await updateTelegramConfig({ token, chatId, enabled });
      setStatus('success');
      setTimeout(() => setStatus('idle'), 3000);
    } catch (error) {
      console.error(error);
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center gap-4">
        <div className="bg-[#0088cc]/10 p-4 rounded-3xl text-[#0088cc]">
          <Bot size={32} />
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Telegram Bot</h1>
          <p className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">Recibe tus SMS en tiempo real</p>
        </div>
      </div>

      <div className="bg-[var(--card)] rounded-[2.5rem] border border-slate-100 dark:border-slate-800 p-8 shadow-[var(--shadow)] transition-colors">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-4">
               <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 text-[#0088cc]">
                  <Send size={18} />
               </div>
               <div>
                  <p className="text-sm font-black text-slate-900 dark:text-white uppercase">Estado del Bot</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">{enabled ? 'Reenvío Activo' : 'Reenvío Deshabilitado'}</p>
               </div>
            </div>
            <button 
              type="button"
              onClick={() => setEnabled(!enabled)}
              className={`w-12 h-6 rounded-full relative transition-colors duration-300 ${enabled ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-600'}`}
            >
               <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-xl transition-all duration-300 ${enabled ? 'right-1' : 'left-1'}`} />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest ml-4 mb-2 block">Bot Token (BotFather)</label>
              <input 
                type="text" 
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="123456789:ABCdef..."
                className="w-full px-6 py-4 bg-[var(--muted)] border-2 border-slate-200 dark:border-slate-700 rounded-3xl text-sm font-bold focus:border-primary outline-none transition-all text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest ml-4 mb-2 block">Chat ID / Canal ID</label>
              <input 
                type="text" 
                value={chatId}
                onChange={(e) => setChatId(e.target.value)}
                placeholder="-100123456789"
                className="w-full px-6 py-4 bg-[var(--muted)] border-2 border-slate-200 dark:border-slate-700 rounded-3xl text-sm font-bold focus:border-primary outline-none transition-all text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="pt-4">
            <button 
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-8 py-5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-3xl text-xs font-black uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-slate-200 dark:shadow-none"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
              Guardar Configuración
            </button>
          </div>

          {status === 'success' && (
            <div className="flex items-center gap-2 text-emerald-500 justify-center text-[10px] font-black uppercase tracking-widest animate-in fade-in zoom-in duration-300">
               <CheckCircle2 size={14} />
               Configuración actualizada con éxito
            </div>
          )}

          {status === 'error' && (
            <div className="flex items-center gap-2 text-red-500 justify-center text-[10px] font-black uppercase tracking-widest animate-in shake duration-300">
               <AlertCircle size={14} />
               Error al actualizar. Intenta de nuevo.
            </div>
          )}
        </form>
      </div>

      {/* Guide Card */}
      <div className="bg-gradient-to-br from-[#0088cc] to-[#00a2ed] rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl shadow-[#0088cc]/20">
         <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <Send size={150} />
         </div>
         <h3 className="text-xl font-black italic uppercase tracking-tight mb-4 flex items-center gap-2">
            ¿Cómo configurar mi bot?
         </h3>
         <ul className="space-y-4 mb-8 text-sm font-medium">
           <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-bold">1</span>
              <span>Habla con <a href="https://t.me/BotFather" target="_blank" className="underline font-black">@BotFather</a> en Telegram y crea un nuevo bot.</span>
           </li>
           <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-bold">2</span>
              <span>Copia el **API Token** y pégalo arriba.</span>
           </li>
           <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-bold">3</span>
              <span>Obtén tu **Chat ID** enviando un mensaje a tu bot y consultando su API o usando bots como @userinfobot.</span>
           </li>
         </ul>
         <a 
           href="https://docs.telsim.app/integrations/telegram" 
           target="_blank"
           className="inline-flex items-center gap-2 px-6 py-4 bg-white/10 hover:bg-white/20 border border-white/20 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all backdrop-blur-md"
         >
           Ver Documentación Completa
           <ExternalLink size={14} />
         </a>
      </div>
    </div>
  );
}
