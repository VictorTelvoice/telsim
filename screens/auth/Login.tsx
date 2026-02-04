import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase, isDemoMode } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { AlertCircle, Mail, Lock, Terminal, ShieldCheck } from 'lucide-react';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { devLogin } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    console.log("Login Screen Mounted. Auth Mode:", isDemoMode ? "DEMO" : "PRODUCTION");
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    if (isDemoMode) {
      setTimeout(() => {
        setLoading(false);
        devLogin();
        navigate('/dashboard');
      }, 800);
      return;
    }

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        setError(signInError.message === "Invalid login credentials" 
          ? "Credenciales incorrectas. Verifica tu email y contraseña." 
          : signInError.message);
        setLoading(false);
      } else if (data.user) {
        navigate('/dashboard');
      }
    } catch (err: any) {
      console.error("Critical login error:", err);
      if (err.message?.includes('quota')) {
        setError("El almacenamiento de tu navegador está lleno. Intenta cerrar otras pestañas o borrar caché.");
      } else {
        setError("Error de conexión. Revisa tu conexión a internet.");
      }
      setLoading(false);
    }
  };

  const handleDevLogin = () => {
    setLoading(true);
    devLogin();
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background-light dark:bg-background-dark font-display relative overflow-hidden">
      <div className="absolute top-[-5%] left-[-5%] w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>
      
      <div className="w-full max-w-sm relative z-10">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center mb-8 transform -rotate-3 relative">
            <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full scale-150 animate-pulse"></div>
            {!logoError ? (
              <img 
                src="/logo.png" 
                alt="TELSIM" 
                className="w-24 h-24 object-contain drop-shadow-xl relative z-10" 
                onError={() => setLogoError(true)}
              />
            ) : (
              <div className="w-24 h-24 bg-gradient-to-br from-primary to-blue-600 rounded-3xl flex items-center justify-center text-white shadow-2xl border-2 border-white/20 relative z-10">
                <span className="font-black text-2xl tracking-tighter uppercase">TS</span>
              </div>
            )}
          </div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Panel Telsim</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 font-bold italic">Infraestructura de Simulación Física</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          {error && (
            <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 text-red-600 dark:text-red-400 text-[11px] font-black uppercase tracking-widest flex items-center gap-3 animate-in slide-in-from-top-1">
               <AlertCircle className="size-5 shrink-0" />
               <span className="flex-1">{error}</span>
            </div>
          )}

          {!isDemoMode ? (
            <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-2">
              <ShieldCheck className="size-3 text-emerald-500" />
              <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Conexión Segura Cloud Activa</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-amber-500/10 border border-amber-500/20 mb-2">
              <AlertCircle className="size-3 text-amber-500" />
              <span className="text-[9px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest">Modo Local / Demostración</span>
            </div>
          )}
          
          <div className="space-y-2">
            <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">Correo Electrónico</label>
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">
                <Mail className="size-5" />
              </div>
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-14 pl-12 pr-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:border-primary outline-none transition-all font-bold"
                placeholder="tu@email.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">Contraseña</label>
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">
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
          ¿Problemas de acceso? <Link to="/register" className="text-primary dark:text-blue-400 font-black hover:underline uppercase tracking-widest">Crear Cuenta</Link>
        </p>

        <div className="mt-12 pt-6 border-t border-slate-100 dark:border-slate-800">
           <button 
            onClick={handleDevLogin}
            className="w-full h-12 flex items-center justify-center gap-3 rounded-xl text-slate-400 dark:text-slate-500 hover:text-primary dark:hover:text-blue-400 text-[9px] font-black uppercase tracking-[0.3em] transition-all border-2 border-dashed border-slate-100 dark:border-slate-800 hover:border-primary active:scale-95"
           >
              <Terminal className="size-4" />
              Entrar como Invitado
           </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
