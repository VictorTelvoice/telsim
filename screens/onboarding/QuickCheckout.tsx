import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

type Step = 'email' | 'password' | 'register';

const planMap: Record<string, { planName: string; price: number; limit: number; stripePriceId: string; features: string[] }> = {
  starter: {
    planName: 'Starter', price: 19.90, limit: 150,
    stripePriceId: 'price_1SzJRLEADSrtMyiaQaDEp44E',
    features: ['Número SIM Real (no VoIP baratos)', 'Notificaciones en tiempo real', 'Soporte técnico vía Ticket']
  },
  pro: {
    planName: 'Pro', price: 39.90, limit: 400,
    stripePriceId: 'price_1SzJS9EADSrtMyiagxHUI2qM',
    features: ['Acceso a API, Webhooks y TelegramBot', 'SMS 100% automatizados', 'Soporte vía Ticket y Chat en vivo']
  },
  power: {
    planName: 'Power', price: 99.00, limit: 1400,
    stripePriceId: 'price_1SzJSbEADSrtMyiaPEMzNKUe',
    features: ['Seguridad y Control Empresarial', 'Integraciones Personalizadas', 'Soporte Prioritario 24/7']
  }
};

const planAccent: Record<string, string> = {
  starter: '#10b981', pro: '#1d4ed8', power: '#f59e0b'
};

const QuickCheckout: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Si ya está logueado, ir directo al summary
  useEffect(() => {
    if (user) navigate('/onboarding/summary');
  }, [user, navigate]);

  const planId = localStorage.getItem('selected_plan') || 'pro';
  const plan = planMap[planId] || planMap.pro;
  const accent = planAccent[planId] || '#1d4ed8';

  const billingDate = useMemo(() => {
    const d = new Date(); d.setDate(d.getDate() + 7);
    return d.toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' });
  }, []);

  // STEP 1: Verificar si el email existe
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      // Intentar login con contraseña falsa solo para detectar si el usuario existe
      const { error: err } = await supabase.auth.signInWithPassword({
        email: email.trim(), password: '___check___'
      });
      // "Invalid login credentials" = existe pero contraseña incorrecta
      // "Email not confirmed" = existe
      // Otros errores = no existe o error real
      if (err?.message?.includes('Invalid login credentials') || err?.message?.includes('Email not confirmed')) {
        setStep('password'); // Usuario existe → pedir contraseña
      } else {
        setStep('register'); // No existe → crear cuenta
      }
    } catch {
      setStep('register');
    } finally {
      setLoading(false);
    }
  };

  // STEP 2a: Login con contraseña
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      const { data, error: err } = await supabase.auth.signInWithPassword({
        email: email.trim(), password
      });
      if (err) { setError('Contraseña incorrecta. Inténtalo de nuevo.'); return; }
      if (data.user) navigate('/onboarding/summary');
    } catch { setError('Error de conexión.'); }
    finally { setLoading(false); }
  };

  // STEP 2b: Registro
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      const { data, error: err } = await supabase.auth.signUp({
        email: email.trim(), password,
        options: { data: { full_name: fullName } }
      });
      if (err) { setError(err.message); return; }
      if (data.user) {
        await supabase.from('users').insert([{ id: data.user.id, email: email.trim(), nombre: fullName }]);
        navigate('/onboarding/summary');
      }
    } catch { setError('Error al crear la cuenta.'); }
    finally { setLoading(false); }
  };

  // Google OAuth
  const handleGoogle = async () => {
    setLoading(true);
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/#/onboarding/summary` }
    });
  };

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark font-display antialiased">
      <div className="max-w-md mx-auto min-h-screen flex flex-col">

        {/* Header */}
        <div className="sticky top-0 z-20 flex items-center bg-background-light/90 dark:bg-background-dark/90 px-4 py-3 backdrop-blur-sm border-b border-slate-100 dark:border-slate-800">
          <button onClick={() => navigate('/')} className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <span className="material-symbols-rounded text-slate-600 dark:text-slate-300">arrow_back</span>
          </button>
          <h2 className="flex-1 text-center text-base font-bold text-slate-900 dark:text-white pr-10">Completa tu pedido</h2>
        </div>

        <div className="flex-1 px-6 py-6 flex flex-col gap-5">

          {/* Resumen del plan */}
          <div className="rounded-2xl bg-white dark:bg-[#1A2230] border border-slate-100 dark:border-slate-800 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Plan seleccionado</p>
                <p className="text-lg font-black uppercase tracking-tight" style={{ color: accent }}>{plan.planName}</p>
                <p className="text-[10px] font-semibold text-slate-400">{plan.limit} Créditos SMS/mes</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black text-slate-900 dark:text-white">${plan.price.toFixed(2)}</p>
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">/mes</p>
              </div>
            </div>
            <div className="px-5 py-3 flex flex-col gap-2">
              {plan.features.map((f, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="material-symbols-rounded text-emerald-500 text-[14px]">check_circle</span>
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">{f}</span>
                </div>
              ))}
            </div>
            {/* Trial badge */}
            <div className="mx-4 mb-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/40 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-rounded text-emerald-600 text-[16px]">verified_user</span>
                <span className="text-[10px] font-black uppercase tracking-wide text-emerald-700 dark:text-emerald-400">7 días gratis</span>
              </div>
              <div className="text-right">
                <p className="text-[9px] font-black uppercase tracking-widest text-emerald-600">Primer cobro</p>
                <p className="text-[10px] font-black text-emerald-700 dark:text-emerald-300">{billingDate}</p>
              </div>
            </div>
            {/* Total */}
            <div className="px-5 pb-4 flex items-center justify-between">
              <span className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white">Total hoy</span>
              <span className="text-2xl font-black text-slate-900 dark:text-white">$0.00</span>
            </div>
          </div>

          {/* Auth Form */}
          <div className="rounded-2xl bg-white dark:bg-[#1A2230] border border-slate-100 dark:border-slate-800 p-5">

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 text-red-600 text-[11px] font-bold flex items-center gap-2">
                <span className="material-symbols-rounded text-[16px]">error</span>
                {error}
              </div>
            )}

            {/* STEP: EMAIL */}
            {step === 'email' && (
              <form onSubmit={handleEmailSubmit} className="flex flex-col gap-4">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-3">Ingresa con tu correo</p>
                  <div className="relative">
                    <span className="material-symbols-rounded absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">mail</span>
                    <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                      className="w-full h-12 pl-10 pr-4 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-primary outline-none transition-all text-sm font-semibold"
                      placeholder="tu@email.com" />
                  </div>
                </div>
                <button type="submit" disabled={loading}
                  className="w-full h-12 rounded-xl text-white font-black text-sm uppercase tracking-widest transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{ background: accent }}>
                  {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>Continuar <span className="material-symbols-rounded text-[18px]">arrow_forward</span></>}
                </button>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-slate-100 dark:bg-slate-700" />
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">o</span>
                  <div className="flex-1 h-px bg-slate-100 dark:bg-slate-700" />
                </div>
                <button type="button" onClick={handleGoogle} disabled={loading}
                  className="w-full h-12 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-900 flex items-center justify-center gap-3 transition-all hover:border-primary active:scale-95">
                  <svg className="w-4 h-4" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                  <span className="text-[11px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300">Continuar con Google</span>
                </button>
              </form>
            )}

            {/* STEP: PASSWORD (usuario existe) */}
            {step === 'password' && (
              <form onSubmit={handleLogin} className="flex flex-col gap-4">
                <div className="flex items-center gap-2 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/40">
                  <span className="material-symbols-rounded text-blue-500 text-[16px]">person</span>
                  <div className="flex-1">
                    <p className="text-[9px] font-black uppercase tracking-widest text-blue-500">Cuenta encontrada</p>
                    <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">{email}</p>
                  </div>
                  <button type="button" onClick={() => { setStep('email'); setError(null); }} className="text-[9px] font-black text-slate-400 uppercase tracking-widest hover:text-primary">Cambiar</button>
                </div>
                <div className="relative">
                  <span className="material-symbols-rounded absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">lock</span>
                  <input type="password" required value={password} onChange={e => setPassword(e.target.value)} autoFocus
                    className="w-full h-12 pl-10 pr-4 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-primary outline-none transition-all text-sm font-semibold"
                    placeholder="Tu contraseña" />
                </div>
                <button type="submit" disabled={loading}
                  className="w-full h-12 rounded-xl text-white font-black text-sm uppercase tracking-widest transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{ background: accent }}>
                  {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>Ingresar y continuar <span className="material-symbols-rounded text-[18px]">arrow_forward</span></>}
                </button>
              </form>
            )}

            {/* STEP: REGISTER (usuario nuevo) */}
            {step === 'register' && (
              <form onSubmit={handleRegister} className="flex flex-col gap-4">
                <div className="flex items-start gap-2 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/40">
                  <span className="material-symbols-rounded text-emerald-500 text-[16px] mt-0.5">info</span>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-emerald-600 mb-1">Cuenta nueva</p>
                    <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 leading-relaxed">No encontramos una cuenta con <strong className="text-slate-700 dark:text-slate-200">{email}</strong>. Crearemos tu cuenta ahora para continuar.</p>
                  </div>
                </div>
                <div className="relative">
                  <span className="material-symbols-rounded absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">person</span>
                  <input type="text" required value={fullName} onChange={e => setFullName(e.target.value)} autoFocus
                    className="w-full h-12 pl-10 pr-4 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-primary outline-none transition-all text-sm font-semibold"
                    placeholder="Tu nombre completo" />
                </div>
                <div className="relative">
                  <span className="material-symbols-rounded absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">lock</span>
                  <input type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)}
                    className="w-full h-12 pl-10 pr-4 rounded-xl border-2 border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:border-primary outline-none transition-all text-sm font-semibold"
                    placeholder="Elige una contraseña (mín. 6 caracteres)" />
                </div>
                <button type="submit" disabled={loading}
                  className="w-full h-12 rounded-xl text-white font-black text-sm uppercase tracking-widest transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{ background: accent }}>
                  {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>Crear cuenta y continuar <span className="material-symbols-rounded text-[18px]">arrow_forward</span></>}
                </button>
                <button type="button" onClick={() => { setStep('email'); setError(null); }} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-primary transition-colors">
                  ← Usar otro correo
                </button>
              </form>
            )}
          </div>

          <p className="text-center text-[10px] text-slate-400 font-medium px-4">
            Al continuar, aceptas los <span className="underline cursor-pointer">Términos</span> y la <span className="underline cursor-pointer">Política de Privacidad</span> de Telsim.
          </p>
        </div>
      </div>
    </div>
  );
};

export default QuickCheckout;
