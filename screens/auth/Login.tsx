import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase, isDemoMode } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { devLogin } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    if (isDemoMode) {
      setTimeout(() => {
        setLoading(false);
        devLogin(); // Also use devLogin if in demo mode for consistency
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
    // Simula login de desarrollador inyectando usuario en el contexto
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
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary text-white shadow-lg mb-6">
            <span className="material-symbols-rounded text-[32px]">sim_card</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Bienvenido a TELSIM</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">Ingresa a tu panel de control</p>
        </div>

        {isDemoMode && (
          <div className="mb-6 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 text-amber-700 dark:text-amber-400 text-[10px] font-bold uppercase tracking-wider text-center">
            Modo Demostración Activo
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 text-red-600 dark:text-red-400 text-sm font-medium flex items-center gap-2">
               <span className="material-symbols-rounded text-lg">error</span>
              {error}
            </div>
          )}
          
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Email</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-14 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all"
              placeholder="tu@email.com"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Contraseña</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-14 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all"
              placeholder="••••••••"
            />
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full h-14 bg-primary hover:bg-primary-dark disabled:opacity-50 text-white font-bold rounded-2xl shadow-button transition-all flex items-center justify-center gap-2 mt-4 active:scale-[0.98]"
          >
            {loading ? <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white"></div> : 'Iniciar Sesión'}
          </button>
        </form>

        <p className="mt-8 text-center text-sm font-medium text-slate-500 dark:text-slate-400">
          ¿No tienes cuenta? <Link to="/register" className="text-primary font-bold hover:underline">Regístrate ahora</Link>
        </p>

        {/* Developer Shortcut */}
        <div className="mt-12 pt-6 border-t border-slate-100 dark:border-slate-800">
           <button 
            onClick={handleDevLogin}
            disabled={loading}
            className="w-full h-12 flex items-center justify-center gap-2 rounded-xl text-slate-400 dark:text-slate-500 hover:text-primary dark:hover:text-blue-400 text-[10px] font-black uppercase tracking-[0.2em] transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-700 active:scale-95"
           >
              <span className="material-symbols-rounded text-base">terminal</span>
              {loading ? 'Accediendo...' : 'Acceso Desarrollador (Bypass)'}
           </button>
        </div>
      </div>
    </div>
  );
};

export default Login;