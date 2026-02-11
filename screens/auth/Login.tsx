import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationsContext';
import { AlertCircle, Mail, Lock, ShieldCheck } from 'lucide-react';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { addNotification } = useNotifications();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
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
        // Notificación de seguridad real
        await addNotification({
          title: 'Nuevo Inicio de Sesión',
          message: 'Se ha accedido a tu cuenta TELSIM exitosamente.',
          type: 'info'
        });
        navigate('/dashboard');
      }
    } catch (err: any) {
      console.error("Critical login error:", err);
      setError("Error de conexión. Revisa tu conexión a internet.");
      setLoading(false);
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'apple') => {
    setLoading(true);
    try {
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (authError) throw authError;
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark font-display relative overflow-hidden flex flex-col items-center justify-center p-6">
      <div className="absolute top-[-5%] left-[-5%] w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>
      
      <div className="w-full max-w-sm relative z-10">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center mb-4 transform -rotate-3 relative">
            <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full scale-150 animate-pulse"></div>
            <img 
              src="/logo.png" 
              alt="TELSIM" 
              className="w-24 h-24 object-contain drop-shadow-xl relative z-10" 
              onError={(e) => {
                (e.target as any).style.display = 'none';
                (e.target as any).nextSibling.style.display = 'flex';
              }}
            />
            <div style={{ display: 'none' }} className="w-24 h-24 bg-gradient-to-br from-primary to-blue-600 rounded-[2rem] items-center justify-center text-white shadow-2xl border-2 border-white/20 relative z-10">
              <span className="material-symbols-outlined text-[48px]">sim_card</span>
            </div>
          </div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">TELSIM PANEL</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 font-bold italic">Automatizaciones Inteligentes</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          {error && (
            <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 text-red-600 dark:text-red-400 text-[11px] font-black uppercase tracking-widest flex items-center gap-3 animate-in slide-in-from-top-1">
               <AlertCircle className="size-5 shrink-0" />
               <span className="flex-1">{error}</span>
            </div>
          )}

          <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-2">
            <ShieldCheck className="size-3 text-emerald-500" />
            <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Conexión Segura</span>
          </div>
          
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
            {loading ? <div className="animate-spin rounded-full h-6 w-6 border-2 border-white/30 border-t-white"></div> : 'INGRESAR'}
          </button>
        </form>

        {/* OAuth Section */}
        <div className="mt-8 space-y-4">
          <div className="flex items-center gap-4">
            <div className="h-px bg-slate-100 dark:bg-slate-800 flex-1"></div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">O continuar con</span>
            <div className="h-px bg-slate-100 dark:bg-slate-800 flex-1"></div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={() => handleSocialLogin('google')}
              disabled={loading}
              className="flex items-center justify-center gap-2 h-14 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 rounded-2xl hover:border-primary transition-all active:scale-95 group"
            >
              <svg className="size-5 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 12-4.53z" fill="#EA4335"/>
              </svg>
              <span className="text-[11px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300">Google</span>
            </button>

            <button 
              onClick={() => handleSocialLogin('apple')}
              disabled={loading}
              className="flex items-center justify-center gap-2 h-14 bg-black text-white rounded-2xl hover:bg-slate-900 transition-all active:scale-95 group shadow-lg shadow-black/10"
            >
              <svg className="size-5 group-hover:scale-110 transition-transform fill-white" viewBox="0 0 384 512">
                <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/>
              </svg>
              <span className="text-[11px] font-black uppercase tracking-widest">Apple</span>
            </button>
          </div>
        </div>

        <p className="mt-8 text-center text-xs font-bold text-slate-500 dark:text-slate-400 tracking-tight">
          ¿Problemas de acceso? <Link to="/register" className="text-primary dark:text-blue-400 font-black hover:underline uppercase tracking-widest">Crear Cuenta</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;