'use client';

import React, { useState } from 'react';
import { User, CheckCircle2, Loader2, AlertCircle, Camera, Mail } from 'lucide-react';
import { updateProfile } from '@/actions/settingsActions';
import { useSession } from 'next-auth/react';

export default function ProfileContent() {
  const { data: session, update } = useSession();
  const [name, setName] = useState(session?.user?.name || '');
  const [image, setImage] = useState(session?.user?.image || '');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus('idle');
    try {
      await updateProfile({ name, image });
      await update({ name, image }); // Updates NextAuth session client-side
      setStatus('success');
      setTimeout(() => setStatus('idle'), 3000);
    } catch (error) {
      console.error(error);
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  const userInitials = (name || session?.user?.email?.split('@')[0] || 'U')
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center gap-4">
        <div className="bg-primary/10 p-4 rounded-3xl text-primary">
          <User size={32} />
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Mi Perfil</h1>
          <p className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">Información personal y de contacto</p>
        </div>
      </div>

      <div className="bg-[var(--card)] rounded-[2.5rem] border border-slate-100 dark:border-slate-800 p-8 shadow-[var(--shadow)] transition-colors">
        <form onSubmit={handleSubmit} className="space-y-8">
          
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="relative group">
               {image ? (
                 <img 
                   src={image} 
                   alt={name}
                   className="w-32 h-32 rounded-[2.5rem] object-cover border-4 border-slate-50 dark:border-slate-800 shadow-2xl transition-transform group-hover:scale-105"
                 />
               ) : (
                 <div className="w-32 h-32 rounded-[2.5rem] bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-white text-5xl font-black shadow-2xl transition-transform group-hover:scale-105">
                    {userInitials}
                 </div>
               )}
               <button 
                 type="button"
                 title="Subir Avatar"
                 className="absolute -bottom-2 -right-2 p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 text-slate-400 hover:text-primary transition-all"
               >
                  <Camera size={20} />
               </button>
            </div>
            <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Resolución recomendada: 512x512px</p>
          </div>

          <div className="space-y-6">
            <div>
              <label className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest ml-4 mb-2 block font-display">Nombre Completo</label>
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Juan Pérez"
                className="w-full px-6 py-4 bg-[var(--muted)] border-2 border-slate-50 dark:border-slate-700 rounded-3xl text-sm font-bold focus:border-primary outline-none transition-all dark:text-white"
              />
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest ml-4 mb-2 block font-display">Correo Electrónico (Solo Lectura)</label>
              <div className="relative">
                <input 
                  type="email" 
                  value={session?.user?.email || ''}
                  disabled
                  className="w-full px-6 py-4 bg-slate-100 dark:bg-slate-800/50 border-2 border-transparent rounded-3xl text-sm font-bold text-slate-400 cursor-not-allowed outline-none"
                />
                <Mail size={18} className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300" />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest ml-4 mb-2 block font-display">Avatar URL</label>
              <input 
                type="text" 
                value={image}
                onChange={(e) => setImage(e.target.value)}
                placeholder="https://..."
                className="w-full px-6 py-4 bg-[var(--muted)] border-2 border-slate-50 dark:border-slate-700 rounded-3xl text-sm font-mono focus:border-primary outline-none transition-all dark:text-white"
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
              Actualizar Perfil
            </button>
          </div>

          {status === 'success' && (
            <div className="flex items-center gap-2 text-emerald-500 justify-center text-[10px] font-black uppercase tracking-widest animate-in fade-in zoom-in duration-300">
               <CheckCircle2 size={14} />
               Perfil actualizado con éxito
            </div>
          )}

          {status === 'error' && (
            <div className="flex items-center gap-2 text-red-500 justify-center text-[10px] font-black uppercase tracking-widest animate-in shake duration-300">
               <AlertCircle size={14} />
               Error al actualizar el perfil
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
