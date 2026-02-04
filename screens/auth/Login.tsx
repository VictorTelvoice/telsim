
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase, isDemoMode } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { AlertCircle, Mail, Lock, Terminal } from 'lucide-react';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { devLogin } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logoError, setLogoError] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    if (isDemoMode) {
      setTimeout(() => {
        setLoading(false);
        devLogin();
        navigate('/dashboard');
      }, 1000);
      return;
    }

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
        setLoading(false);
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError("Error de red. Verifica tus credenciales.");
      setLoading(false);
    }
  };

  const handleDevLogin = async () => {
    setLoading(true);
    setTimeout(() => {
      devLogin();
      navigate('/dashboard');
      setLoading(false);
    }, 500);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background-light dark:bg-background-dark font-display relative overflow-hidden">
       {/* Elementos decorativos de fondo */}
      <div className="absolute top-[-5%] left-[-5%] w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>
      
      <div className="w-full max-w-sm relative z-10">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center mb-8 transform -rotate-3">
            {!logoError ? (
              <img 
                src="/logo.png" 
                alt="TELSIM" 
                className="w-24 h-24 object-contain drop-shadow-xl" 
                onError={() => setLogoError(true)}
              />
            ) : (
              <div className="w-24 h-24 bg-gradient-to-br from-primary to-blue-600 rounded-3xl flex items-center justify-center text-white shadow-2xl border-2 border-white/20">
                <span className="font-black text-2xl tracking-tighter uppercase">TS</span>
              </div>
            )}
          </div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Acceso Telsim</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 font-bold italic">Panel de Control de Infraestructura</p>
        </div>

        {isDemoMode && (
          <div className="mb-6 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 text-amber-700 dark:text-amber-400 text-[10px] font-black uppercase tracking-widest text-center">
            Modo Demostración Activo
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          {error && (
            <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 text-red-600 dark:text-red-400 text-[11px] font-black uppercase tracking-widest flex items-center gap-3">
               <AlertCircle className="size-5 shrink-0" />
              {error}
            </div>
          )}
          
          <div className="space-y-2">
            <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">Email Corporativo</label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                <Mail className="size-5" />
              </div>
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-14 pl-12 pr-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:border-primary outline-none transition-all font-bold"
                placeholder="usuario@telsim.pro"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">Clave de Acceso</label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                <Lock className="size-5" />
              </div>
              <input 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-14 pl-12 pr-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:border-primary outline-none transition-all font-bold"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full h-16 bg-primary hover:bg-primary-dark disabled:opacity-50 text-white font-black rounded-2xl shadow-button transition-all flex items-center justify-center gap-2 mt-4 active:scale-[0.98] uppercase tracking-widest"
          >
            {loading ? <div className="animate-spin rounded-full h-6 w-6 border-2 border-white/30 border-t-white"></div> : 'Sincronizar Panel'}
          </button>
        </form>

        <p className="mt-8 text-center text-xs font-bold text-slate-500 dark:text-slate-400 tracking-tight">
          ¿Nuevo en la red? <Link to="/register" className="text-primary dark:text-blue-400 font-black hover:underline uppercase tracking-widest">Crear Cuenta</Link>
        </p>

        {/* Developer Shortcut */}
        <div className="mt-12 pt-6 border-t border-slate-100 dark:border-slate-800">
           <button 
            onClick={handleDevLogin}
            disabled={loading}
            className="w-full h-12 flex items-center justify-center gap-3 rounded-xl text-slate-400 dark:text-slate-500 hover:text-primary dark:hover:text-blue-400 text-[9px] font-black uppercase tracking-[0.3em] transition-all border-2 border-dashed border-slate-100 dark:border-slate-800 hover:border-primary active:scale-95"
           >
              <Terminal className="size-4" />
              {loading ? 'ACCEDIENDO...' : 'Bypass Desarrollador'}
           </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
