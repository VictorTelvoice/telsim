'use client';

import React, { useState } from 'react';
import { Shield, Lock, CheckCircle2, Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { updateSecurity } from '@/actions/settingsActions';

export default function SecurityContent() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setErrorMsg('Las contraseñas no coinciden');
      setStatus('error');
      return;
    }

    setLoading(true);
    setStatus('idle');
    try {
      await updateSecurity({ currentPassword, newPassword });
      setStatus('success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setStatus('idle'), 3000);
    } catch (error: any) {
      console.error(error);
      setErrorMsg(error.message || 'Error al actualizar seguridad');
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center gap-4">
        <div className="bg-primary/10 p-4 rounded-3xl text-primary">
          <Shield size={32} />
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Seguridad</h1>
          <p className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">Protége tu cuenta y accesos</p>
        </div>
      </div>

      <div className="bg-[var(--card)] rounded-[2.5rem] border border-slate-100 dark:border-slate-800 p-8 shadow-[var(--shadow)] transition-colors">
        <form onSubmit={handleSubmit} className="space-y-6">
          
          <div>
            <label className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest ml-4 mb-2 block">Contraseña Actual</label>
            <div className="relative">
               <input 
                 type={showPass ? "text" : "password"} 
                 value={currentPassword}
                 onChange={(e) => setCurrentPassword(e.target.value)}
                 className="w-full px-6 py-4 bg-[var(--muted)] border-2 border-slate-200 dark:border-slate-700 rounded-3xl text-sm font-bold focus:border-primary outline-none transition-all text-slate-900 dark:text-white"
               />
               <button 
                 type="button" 
                 onClick={() => setShowPass(!showPass)}
                 className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary transition-colors"
               >
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
               </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest ml-4 mb-2 block">Nueva Contraseña</label>
              <input 
                type="password" 
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-6 py-4 bg-[var(--muted)] border-2 border-slate-200 dark:border-slate-700 rounded-3xl text-sm font-bold focus:border-primary outline-none transition-all text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest ml-4 mb-2 block">Confirmar</label>
              <input 
                type="password" 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
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
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Lock size={18} />}
              Actualizar Contraseña
            </button>
          </div>

          {status === 'success' && (
            <div className="flex items-center gap-2 text-emerald-500 justify-center text-[10px] font-black uppercase tracking-widest animate-in fade-in zoom-in duration-300">
               <CheckCircle2 size={14} />
               Contraseña actualizada con éxito
            </div>
          )}

          {status === 'error' && (
            <div className="flex items-center gap-2 text-red-500 justify-center text-[10px] font-black uppercase tracking-widest animate-in shake duration-300">
               <AlertCircle size={14} />
               {errorMsg}
            </div>
          )}
        </form>
      </div>

      <div className="bg-amber-500/10 border border-amber-500/20 rounded-[2.5rem] p-8 flex gap-6 items-center">
         <div className="p-4 bg-amber-500 text-white rounded-2xl shadow-xl shadow-amber-500/20">
            <AlertCircle size={24} />
         </div>
         <div>
            <h3 className="text-sm font-black text-amber-700 dark:text-amber-500 uppercase tracking-tight">Seguridad de Cuenta</h3>
            <p className="text-[11px] font-bold text-amber-800/60 dark:text-amber-500/60 leading-relaxed uppercase">Nunca compartas tu contraseña ni tus API keys con terceros. Telsim nunca te pedirá tus claves por correo ni chat.</p>
         </div>
      </div>
    </div>
  );
}
