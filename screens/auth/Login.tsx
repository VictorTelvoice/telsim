
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
      // Cast supabase.auth to any to bypass SupabaseAuthClient type missing signInWithPassword
      const { data, error: signInError } = await (supabase.auth as any).signInWithPassword({
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
        
        const savedPlan = localStorage.getItem('selected_plan');
        if (savedPlan) {
          navigate('/onboarding/summary');
        } else {
          navigate('/dashboard');
        }
      }
    } catch (err: any) {
      console.error("Critical login error:", err);
      setError("Error de conexión. Revisa tu conexión a internet.");
      setLoading(false);
    }
  };

  const handleSocialLogin = async (provider: 'google') => {
    setLoading(true);
    try {
      // Cast supabase.auth to any to bypass SupabaseAuthClient type missing signInWithOAuth
      const { error: authError } = await (supabase.auth as any).signInWithOAuth({
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
      {/* Back Button */}
      <button 
        onClick={() => navigate('/')}
        className="absolute top-6 left-6 z-20 w-10 h-10 flex items-center justify-center rounded-xl bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 text-slate-500 hover:text-primary hover:border-primary transition-all shadow-soft"
      >
        <span className="material-symbols-rounded text-[24px]">arrow_back</span>
      </button>

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

          <button 
            onClick={() => handleSocialLogin('google')}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 h-14 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 rounded-2xl hover:border-primary transition-all active:scale-95 group"
          >
            <svg className="size-5 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 12-4.53z" fill="#EA4335"/>
            </svg>
            <span className="text-[11px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300">Acceder con Google</span>
          </button>
        </div>

        <p className="mt-8 text-center text-xs font-bold text-slate-500 dark:text-slate-400 tracking-tight">
          ¿Problemas de acceso? <Link to="/register" className="text-primary dark:text-blue-400 font-black hover:underline uppercase tracking-widest">Crear Cuenta</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
