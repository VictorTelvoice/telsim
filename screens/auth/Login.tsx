import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { getPostAuthRoute } from '../../lib/routing';

// ─── Decorative Live SMS Cards ────────────────────────────────────────────────

const SAMPLE_SMS = [
  { service: 'WhatsApp', code: '847 291', color: '#25D366', bg: '#dcfce7', icon: 'WA', time: 'Ahora' },
  { service: 'Google',   code: '523 188', color: '#4285F4', bg: '#dbeafe', icon: 'G',  time: '1m' },
  { service: 'Instagram',code: '091 347', color: '#E1306C', bg: '#fce7f3', icon: 'IG', time: '3m' },
  { service: 'Amazon',   code: '764 012', color: '#FF9900', bg: '#fef3c7', icon: 'A',  time: '5m' },
];

const SMSCard = ({ service, code, color, bg, icon, time, delay }: {
  service: string; code: string; color: string; bg: string; icon: string; time: string; delay: string;
}) => (
  <div
    className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl px-4 py-3 flex items-center gap-3"
    style={{ animation: `floatCard 3s ease-in-out ${delay} infinite alternate` }}
  >
    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-[11px] font-black flex-shrink-0"
      style={{ background: bg, color }}>
      {icon}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-white text-[12px] font-bold">{service}</p>
      <p className="text-white/50 text-[10px]">Código de verificación</p>
    </div>
    <div className="text-right flex-shrink-0">
      <p className="text-white text-[15px] font-black tracking-widest">{code}</p>
      <p className="text-white/40 text-[9px]">{time}</p>
    </div>
  </div>
);

// ─── Feature Bullet ───────────────────────────────────────────────────────────

const Feature = ({ icon, title, desc }: { icon: string; title: string; desc: string }) => (
  <div className="flex items-start gap-3">
    <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0 mt-0.5">
      <span className="text-[15px]">{icon}</span>
    </div>
    <div>
      <p className="text-white text-[13px] font-bold">{title}</p>
      <p className="text-white/50 text-[11px] mt-0.5">{desc}</p>
    </div>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

const Login = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState<'email' | 'login' | 'register'>('email');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre]     = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [showPass, setShowPass] = useState(false);
  const prevUserRef = useRef(user);

  // Destino post-auth: si hay plan guardado → ir a region, sino al dashboard
  const getDestination = () => {
    const hasPlan = !!localStorage.getItem('selected_plan');
    if (hasPlan) return '/onboarding/region';
    return getPostAuthRoute();
  };

  // Cuando user pasa de null → autenticado, ir al destino correcto
  useEffect(() => {
    if (!prevUserRef.current && user) {
      navigate(getDestination());
    }
    prevUserRef.current = user;
  }, [user, navigate]);

  // Si ya tiene sesión activa al cargar, ir directo
  useEffect(() => {
    if (user) navigate(getDestination());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // STEP 1: Detectar si el email existe o es nuevo
  const handleContinueEmail = async () => {
    if (!email) return;
    setError(null);
    setLoading(true);
    try {
      const { error: err } = await supabase.auth.signInWithPassword({
        email: email.trim(), password: '___check___'
      });
      const msg = err?.message?.toLowerCase() ?? '';
      if (msg.includes('invalid login credentials') || msg.includes('invalid credentials') || msg.includes('email not confirmed')) {
        setStep('login');
      } else {
        setStep('register');
      }
    } catch {
      setStep('login');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    await (supabase.auth as any).signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
  };

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      setError('Contraseña incorrecta. Inténtalo de nuevo.');
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { full_name: nombre } }
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (step === 'email') handleContinueEmail();
      else if (step === 'login') handleLogin();
      else handleRegister();
    }
  };

  return (
    <div className="min-h-screen flex font-display">
      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes floatCard {
          from { transform: translateY(0px); }
          to   { transform: translateY(-6px); }
        }
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }
      `}</style>

      {/* ── LEFT PANEL (solo desktop) ────────────────────────────────────────── */}
      <div
        className="hidden lg:flex flex-col flex-1 relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #060d1f 0%, #0a1628 40%, #0f1f3d 70%, #0c1832 100%)',
        }}
      >
        {/* Gradient glow decorations */}
        <div className="absolute top-[-80px] left-[-80px] w-[400px] h-[400px] rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #1152d4 0%, transparent 70%)' }} />
        <div className="absolute bottom-[-60px] right-[-60px] w-[300px] h-[300px] rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle, #0ea5e9 0%, transparent 70%)' }} />
        <div className="absolute top-[40%] right-[10%] w-[200px] h-[200px] rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #8b5cf6 0%, transparent 70%)' }} />

        {/* Content */}
        <div className="relative z-10 flex flex-col h-full px-12 py-10">

          {/* Logo */}
          <div className="flex items-center gap-3">
            <img src="/logo.svg" alt="Telsim" className="w-9 h-9" />
            <span className="text-white text-xl font-black tracking-tight">telsim</span>
          </div>

          {/* Hero */}
          <div className="mt-16">
            <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-3 py-1.5 mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" style={{ animation: 'pulse-dot 2s infinite' }} />
              <span className="text-white/70 text-[11px] font-semibold tracking-wider uppercase">Plataforma activa 24/7</span>
            </div>
            <h1 className="text-[38px] font-black text-white leading-[1.1] tracking-tight">
              La privacidad<br />
              <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(90deg, #60a5fa, #818cf8)' }}>
                que tu negocio
              </span><br />
              merece
            </h1>
            <p className="text-white/50 text-[14px] mt-4 leading-relaxed max-w-sm">
              Gestiona SIMs físicas en más de 30 países y automatiza la verificación 2FA de forma segura, sin restricciones.
            </p>
          </div>

          {/* Features */}
          <div className="mt-10 flex flex-col gap-5">
            <Feature icon="🛡️" title="SIMs físicas en 30+ países" desc="Números reales, no virtuales. Activación inmediata." />
            <Feature icon="⚡" title="SMS en tiempo real" desc="Recibe códigos al instante con latencia <2 segundos." />
            <Feature icon="🤖" title="API & Webhooks" desc="Integra en tu stack con nuestra API REST documentada." />
            <Feature icon="🔐" title="Privacidad total" desc="Tus datos nunca son compartidos. Zero logs policy." />
          </div>

          {/* Live SMS preview */}
          <div className="mt-auto pt-10">
            <p className="text-white/30 text-[10px] font-bold uppercase tracking-widest mb-4">Feed en vivo</p>
            <div className="flex flex-col gap-2.5">
              {SAMPLE_SMS.map((s, i) => (
                <SMSCard key={s.service} {...s} delay={`${i * 0.4}s`} />
              ))}
            </div>
          </div>

          {/* Bottom trust */}
          <div className="mt-6 flex items-center gap-6 pb-2">
            <div className="text-center">
              <p className="text-white text-[18px] font-black">500+</p>
              <p className="text-white/40 text-[10px]">Empresas</p>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="text-center">
              <p className="text-white text-[18px] font-black">99.9%</p>
              <p className="text-white/40 text-[10px]">Uptime</p>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="text-center">
              <p className="text-white text-[18px] font-black">30+</p>
              <p className="text-white/40 text-[10px]">Países</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL / MOBILE FULL SCREEN ─────────────────────────────────── */}
      <div className="flex flex-col w-full lg:w-[440px] lg:flex-shrink-0 bg-white dark:bg-slate-950 relative">

        {/* Mobile: botón ir al landing */}
        <button
          onClick={() => navigate('/')}
          title="Ir al sitio web"
          className="absolute top-5 left-5 flex items-center gap-2 group lg:hidden"
        >
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-100 dark:bg-slate-800 group-hover:bg-blue-50 transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="text-slate-500 group-hover:text-primary transition-colors">
              <circle cx="12" cy="12" r="10" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
          </div>
          <span className="text-[11px] font-semibold text-slate-400 group-hover:text-primary transition-colors hidden sm:block">telsim.app</span>
        </button>

        {/* Desktop: nav superior derecho */}
        <div className="hidden lg:flex items-center justify-between px-10 pt-8 pb-0">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 text-slate-400 hover:text-primary transition-colors text-[12px] font-semibold"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Volver al inicio
          </button>
          <span className="text-[11px] text-slate-300 dark:text-slate-600">
            {step === 'register' ? '¿Ya tienes cuenta?' : '¿Eres nuevo?'}
            {' '}
            <button
              onClick={() => setStep(step === 'register' ? 'login' : 'register')}
              className="text-primary font-bold hover:underline"
            >
              {step === 'register' ? 'Ingresar' : 'Crear cuenta'}
            </button>
          </span>
        </div>

        {/* Form area */}
        <div className="flex-1 flex items-center justify-center px-8 lg:px-10 py-12">
          <div className="w-full max-w-sm lg:max-w-none">

            {/* Mobile logo */}
            <div className="flex flex-col items-center mb-10 lg:hidden">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-11 h-11 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-blue-200">
                  <span className="material-symbols-rounded text-white text-[24px]">sim_card</span>
                </div>
                <span className="font-extrabold text-2xl tracking-tight text-slate-900 dark:text-white">Telsim</span>
              </div>
              <p className="text-sm text-slate-500 text-center">Donde la privacidad y la tecnología se encuentran.</p>
            </div>

            {/* Desktop heading */}
            <div className="hidden lg:block mb-8">
              <h2 className="text-[28px] font-black text-slate-900 dark:text-white tracking-tight">
                {step === 'register' ? 'Crea tu cuenta' : 'Bienvenido de vuelta'}
              </h2>
              <p className="text-slate-400 text-[14px] mt-1.5">
                {step === 'register'
                  ? 'Empieza a gestionar tus SIMs en minutos.'
                  : 'Ingresa a tu panel de gestión de SIMs.'}
              </p>
            </div>

            {/* Error */}
            {error && (
              <div className="w-full p-3 mb-5 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 text-red-600 dark:text-red-400 text-[12px] font-bold rounded-xl"
                style={{ animation: 'slideIn 0.2s ease' }}>
                {error}
              </div>
            )}

            {/* STEP: email */}
            {step === 'email' && (
              <div className="space-y-3" style={{ animation: 'slideIn 0.2s ease' }}>
                {/* Google */}
                <button
                  onClick={handleGoogleLogin}
                  className="w-full h-12 rounded-xl font-bold text-[13px] flex items-center justify-center gap-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90 transition-opacity"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Continuar con Google
                </button>

                {/* Apple (disabled) */}
                <button
                  disabled
                  className="w-full h-12 rounded-xl font-bold text-[13px] flex items-center justify-center gap-2.5 bg-slate-100 dark:bg-slate-800 text-slate-400 opacity-60 cursor-not-allowed"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.11.8 1.12-.16 2.13-.83 3.59-.73 1.82.13 3.19.8 3.99 2.02-3.69 2.14-3.12 6.64.49 8.12-.36.94-.9 1.83-1.63 2.76zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                  </svg>
                  Continuar con Apple
                </button>

                {/* Divider */}
                <div className="flex items-center gap-3 py-1">
                  <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1" />
                  <span className="text-slate-400 dark:text-slate-600 text-[11px] font-semibold">o con tu email</span>
                  <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1" />
                </div>

                {/* Email input */}
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Correo electrónico"
                    autoFocus
                    className="w-full h-12 pl-4 pr-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-[13px] font-medium placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  />
                </div>

                <button
                  onClick={handleContinueEmail}
                  disabled={loading || !email}
                  className="w-full h-12 bg-primary text-white rounded-xl font-bold text-[13px] shadow-lg shadow-blue-200/60 dark:shadow-blue-900/40 hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                      </svg>
                      Verificando...
                    </span>
                  ) : 'Continuar'}
                </button>
              </div>
            )}

            {/* STEP: login / register */}
            {(step === 'login' || step === 'register') && (
              <div className="space-y-3" style={{ animation: 'slideIn 0.2s ease' }}>

                {/* Email pill */}
                <div className="w-full h-12 px-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-between">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                      <polyline points="22,6 12,13 2,6"/>
                    </svg>
                    <span className="text-[13px] font-medium text-slate-600 dark:text-slate-300 truncate">{email}</span>
                  </div>
                  <button onClick={() => setStep('email')} className="text-primary text-[11px] font-bold hover:underline flex-shrink-0 ml-2">
                    Cambiar
                  </button>
                </div>

                {/* Name (only register) */}
                {step === 'register' && (
                  <input
                    type="text"
                    value={nombre}
                    onChange={e => setNombre(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Nombre completo"
                    autoFocus
                    className="w-full h-12 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-[13px] font-medium placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    style={{ animation: 'slideIn 0.2s ease' }}
                  />
                )}

                {/* Password */}
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={step === 'register' ? 'Crea una contraseña' : 'Contraseña'}
                    autoFocus={step === 'login'}
                    className="w-full h-12 pl-4 pr-12 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-[13px] font-medium placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    style={{ animation: 'slideIn 0.2s ease' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPass ? (
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                        <line x1="1" y1="1" x2="23" y2="23"/>
                      </svg>
                    ) : (
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    )}
                  </button>
                </div>

                {/* Forgot password link */}
                {step === 'login' && (
                  <div className="flex justify-end">
                    <button className="text-[11px] text-slate-400 hover:text-primary transition-colors font-medium">
                      ¿Olvidaste tu contraseña?
                    </button>
                  </div>
                )}

                {/* Submit */}
                <button
                  onClick={step === 'login' ? handleLogin : handleRegister}
                  disabled={loading || !password || (step === 'register' && !nombre)}
                  className="w-full h-12 bg-primary text-white rounded-xl font-bold text-[13px] shadow-lg shadow-blue-200/60 dark:shadow-blue-900/40 hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                      </svg>
                      Cargando...
                    </span>
                  ) : step === 'login' ? 'Ingresar al dashboard' : 'Crear cuenta gratis'}
                </button>

                {/* Toggle step (mobile only — desktop has it in header) */}
                <div className="text-center lg:hidden">
                  {step === 'login' ? (
                    <button onClick={() => setStep('register')} className="text-primary text-[12px] font-bold hover:underline">
                      ¿Primera vez en TELSIM? Crear cuenta
                    </button>
                  ) : (
                    <button onClick={() => setStep('login')} className="text-primary text-[12px] font-bold hover:underline">
                      ¿Ya tienes cuenta? Ingresar
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Terms */}
            <p className="mt-6 text-[10px] text-slate-400 dark:text-slate-600 text-center leading-relaxed">
              Al continuar, aceptas nuestros{' '}
              <button onClick={() => navigate('/legal?tab=terms')} className="underline text-slate-500 dark:text-slate-400 font-semibold hover:text-primary transition-colors">
                Términos de uso
              </button>
              {' '}y nuestra{' '}
              <button onClick={() => navigate('/legal?tab=privacy')} className="underline text-slate-500 dark:text-slate-400 font-semibold hover:text-primary transition-colors">
                Política de privacidad
              </button>.
            </p>

          </div>
        </div>

        {/* Bottom brand (desktop) */}
        <div className="hidden lg:flex items-center justify-between px-10 pb-8">
          <span className="text-[10px] text-slate-300 dark:text-slate-700 font-semibold tracking-wider">TELSIM © 2025</span>
          <span className="text-[10px] text-slate-300 dark:text-slate-700">v2.4.1</span>
        </div>
      </div>
    </div>
  );
};

export default Login;
