
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  ShieldCheck, 
  Lock, 
  Smartphone, 
  Fingerprint, 
  Key, 
  LogOut, 
  ShieldAlert, 
  History,
  Globe,
  Monitor,
  CheckCircle2,
  ChevronRight,
  Eye,
  EyeOff,
  RefreshCw,
  Trash2
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface Session {
  id: string;
  device_name: string;
  location: string;
  last_active: string;
  is_current: boolean;
}

const Security: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [showPass, setShowPass] = useState(false);

  const fetchSessions = async () => {
    if (!user) return;
    setFetching(true);
    try {
      const { data, error } = await supabase
        .from('device_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('last_active', { ascending: false });
      if (error) throw error;
      setSessions(data || []);
    } catch (err) {
      console.error("Error fetching sessions", err);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [user]);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) return;
    
    setLoading(true);
    try {
      // Cast supabase.auth to any to bypass SupabaseAuthClient type missing updateUser
      const { error } = await (supabase.auth as any).updateUser({ password: newPassword });
      if (error) throw error;
      alert("Contraseña actualizada con éxito");
      setShowPasswordForm(false);
      setNewPassword('');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const closeSession = async (id: string) => {
    try {
      const { error } = await supabase.from('device_sessions').delete().eq('id', id);
      if (error) throw error;
      setSessions(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      console.error("Error closing session", err);
    }
  };

  const closeAllSessions = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Borramos todas excepto la actual para no desloguear al usuario de inmediato
      const { error } = await supabase
        .from('device_sessions')
        .delete()
        .eq('user_id', user.id)
        .eq('is_current', false);
      
      if (error) throw error;
      await fetchSessions();
    } catch (err) {
      console.error("Error closing all sessions", err);
    } finally {
      setLoading(false);
    }
  };

  const formatFriendlyDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = (now.getTime() - date.getTime()) / 1000;
    if (diff < 60) return 'Hace un momento';
    if (diff < 3600) return `Hace ${Math.floor(diff/60)} min`;
    return date.toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-background-dark font-display pb-32">
      {/* HEADER */}
      <header className="flex items-center justify-between px-6 py-6 bg-white/80 dark:bg-background-dark/80 backdrop-blur-md sticky top-0 z-50 border-b border-slate-100 dark:border-slate-800">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition text-slate-400">
          <ArrowLeft className="size-5" />
        </button>
        <h1 className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-[0.25em]">Seguridad</h1>
        <div className="size-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
            <ShieldCheck className="size-4 text-emerald-500" />
        </div>
      </header>

      <main className="px-5 py-8 max-w-lg mx-auto space-y-8">
        
        {/* SECCIÓN A: ACCESO */}
        <div className="space-y-4">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-2">Acceso a la cuenta</h3>
          
          <div className="bg-white dark:bg-surface-dark rounded-[2rem] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
            {/* Password Item */}
            <div className="p-6">
               {!showPasswordForm ? (
                 <div className="flex items-center justify-between">
                   <div className="flex items-center gap-4">
                     <div className="size-11 rounded-2xl bg-blue-50 dark:bg-blue-900/20 text-primary flex items-center justify-center">
                        <Key className="size-5" />
                     </div>
                     <div>
                        <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Contraseña</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          {user?.updated_at ? `Actualizada: ${new Date(user.updated_at).toLocaleDateString()}` : 'Actualizada recientemente'}
                        </p>
                     </div>
                   </div>
                   <button 
                    onClick={() => setShowPasswordForm(true)}
                    className="text-[10px] font-black text-primary uppercase tracking-widest px-4 py-2 bg-primary/5 rounded-xl"
                   >
                     Cambiar
                   </button>
                 </div>
               ) : (
                 <form onSubmit={handleUpdatePassword} className="space-y-4 animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center justify-between mb-2">
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nueva Contraseña</span>
                       <button type="button" onClick={() => setShowPasswordForm(false)} className="text-[10px] font-black text-slate-300 uppercase">Cancelar</button>
                    </div>
                    <div className="relative">
                       <input 
                        type={showPass ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Mínimo 6 caracteres"
                        className="w-full h-12 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl px-4 text-sm font-bold outline-none focus:border-primary transition-all"
                       />
                       <button 
                        type="button" 
                        onClick={() => setShowPass(!showPass)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                       >
                         {showPass ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                       </button>
                    </div>
                    <button 
                      type="submit"
                      disabled={loading || newPassword.length < 6}
                      className="w-full h-12 bg-primary text-white font-black rounded-xl text-[10px] uppercase tracking-widest shadow-lg shadow-blue-500/20 disabled:opacity-50"
                    >
                      {loading ? 'Sincronizando...' : 'Confirmar Nueva Clave'}
                    </button>
                 </form>
               )}
            </div>
          </div>
        </div>

        {/* SECCIÓN B: DISPOSITIVOS */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Sesiones Iniciadas</h3>
            <button 
              onClick={closeAllSessions}
              disabled={loading || sessions.length <= 1}
              className="text-[9px] font-black text-primary uppercase tracking-widest disabled:opacity-30"
            >
              Cerrar todas las remotas
            </button>
          </div>
          
          <div className="space-y-3">
            {fetching ? (
              <div className="py-12 flex flex-col items-center gap-3">
                <RefreshCw className="size-6 text-slate-300 animate-spin" />
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Sincronizando sesiones...</span>
              </div>
            ) : sessions.length === 0 ? (
              <div className="p-10 text-center bg-white dark:bg-surface-dark rounded-3xl border border-dashed border-slate-200">
                <p className="text-xs font-bold text-slate-400 italic">No hay sesiones activas registradas.</p>
              </div>
            ) : (
              sessions.map((session) => {
                const isMobile = session.device_name.includes('iPhone') || session.device_name.includes('Android');
                return (
                  <div key={session.id} className="bg-white dark:bg-surface-dark p-5 rounded-3xl border border-slate-100 dark:border-slate-800 flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-bottom-2">
                    <div className="flex items-center gap-4">
                        <div className="size-12 bg-slate-50 dark:bg-slate-900 rounded-2xl flex items-center justify-center text-slate-400">
                          {isMobile ? <Smartphone className="size-5" /> : <Monitor className="size-5" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">{session.device_name}</h4>
                            {session.is_current && (
                              <span className="text-[7px] font-black bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded uppercase">Actual</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Globe className="size-3 text-slate-300" />
                            <span className="text-[10px] font-bold text-slate-400 uppercase">{session.location} • {formatFriendlyDate(session.last_active)}</span>
                          </div>
                        </div>
                    </div>
                    {!session.is_current && (
                      <button 
                        onClick={() => closeSession(session.id)}
                        className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
                      >
                          <LogOut className="size-4" />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* SECCIÓN C: SEGURIDAD AVANZADA */}
        <div className="bg-rose-500/5 border border-rose-500/10 rounded-3xl p-6 flex items-start gap-4">
           <div className="size-10 bg-rose-500/10 rounded-2xl flex items-center justify-center text-rose-500 shrink-0">
             <ShieldAlert className="size-5" />
           </div>
           <div className="space-y-1">
              <p className="text-[10px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-[0.15em]">Zona de Riesgo</p>
              <button className="text-[10px] font-bold text-slate-500 dark:text-slate-400 leading-relaxed hover:text-rose-500 transition-colors">
                ¿Sospechas de un acceso no autorizado? Cambia tu contraseña inmediatamente y contacta al nodo de soporte.
              </button>
           </div>
        </div>

        <div className="flex flex-col items-center gap-6 pt-12 pb-6">
           <div className="flex items-center gap-3 px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-full">
              <History className="size-4 text-slate-400" />
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Logs de Auditoría Disponibles</span>
           </div>
           <p className="text-[8px] font-black text-slate-300 uppercase tracking-[0.4em] text-center px-8">Telsim Crypto-Vault Protection v4.2</p>
        </div>

      </main>
    </div>
  );
};

export default Security;
