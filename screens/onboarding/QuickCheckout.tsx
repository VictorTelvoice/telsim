import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { STRIPE_PRICES } from '../../constants/stripePrices';
import TelsimBrandLogo from '../../components/TelsimBrandLogo';

type Step = 'email' | 'password' | 'register' | 'confirm';

type PlanConfig = {
  planName: string;
  priceMonthly: number;
  priceAnnual: number;
  limit: number;
  stripePriceIdMonthly: string;
  stripePriceIdAnnual: string;
  features: string[];
};

const planMap: Record<string, PlanConfig> = {
  starter: {
    planName: 'Starter',
    priceMonthly: 19.90,
    priceAnnual: 199,
    limit: 150,
    stripePriceIdMonthly: STRIPE_PRICES.STARTER.MONTHLY,
    stripePriceIdAnnual: STRIPE_PRICES.STARTER.ANNUAL,
    features: [
      'Número SIM Real (no VoIP baratos)',
      'Notificaciones en tiempo real',
      'Soporte técnico vía Ticket',
      '150 créditos SMS / mes',
    ],
  },
  pro: {
    planName: 'Pro',
    priceMonthly: 39.90,
    priceAnnual: 399,
    limit: 400,
    stripePriceIdMonthly: STRIPE_PRICES.PRO.MONTHLY,
    stripePriceIdAnnual: STRIPE_PRICES.PRO.ANNUAL,
    features: [
      'Acceso a API, Webhooks y TelegramBot',
      'SMS 100% automatizados',
      'Soporte vía Ticket y Chat en vivo',
      '400 créditos SMS / mes',
    ],
  },
  power: {
    planName: 'Power',
    priceMonthly: 99.00,
    priceAnnual: 990,
    limit: 1400,
    stripePriceIdMonthly: STRIPE_PRICES.POWER.MONTHLY,
    stripePriceIdAnnual: STRIPE_PRICES.POWER.ANNUAL,
    features: [
      'Seguridad y Control Empresarial',
      'Integraciones Personalizadas',
      'Soporte Prioritario 24/7',
      '1400 créditos SMS / mes',
    ],
  },
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

  // Si ya tiene sesión activa → mostrar botón "Ir a pagar" (no redirigir)
  // El navigate lo hacemos solo cuando el user cambia de null → autenticado (tras login/registro)
  const prevUserRef = React.useRef(user);
  useEffect(() => {
    if (!prevUserRef.current && user) {
      // Recién autenticado → navegar a elegir región (el plan ya está en localStorage)
      navigate('/onboarding/region');
    }
    prevUserRef.current = user;
  }, [user, navigate]);

  // Email pre-cargado desde sessionStorage
  useEffect(() => {
    const savedEmail = sessionStorage.getItem('checkout_email');
    if (savedEmail) { setEmail(savedEmail); sessionStorage.removeItem('checkout_email'); }
  }, []);

  const storedPlanId = localStorage.getItem('selected_plan') || 'pro';
  const isAnnual = localStorage.getItem('selected_plan_annual') === 'true';
  const baseConfig = planMap[storedPlanId] || planMap.pro;

  const storedPrice = parseFloat(localStorage.getItem('selected_plan_price') || '0');
  const storedStripePriceId = localStorage.getItem('selected_plan_price_id') || '';

  const resolvedPrice = storedPrice || (isAnnual ? baseConfig.priceAnnual : baseConfig.priceMonthly);
  const resolvedStripePriceId =
    storedStripePriceId || (isAnnual ? baseConfig.stripePriceIdAnnual : baseConfig.stripePriceIdMonthly);

  const plan = {
    planName: baseConfig.planName,
    price: resolvedPrice,
    limit: baseConfig.limit,
    stripePriceId: resolvedStripePriceId,
    features: baseConfig.features,
  };

  const billingDate = useMemo(() => {
    const d = new Date();
    if (isAnnual) {
      d.setFullYear(d.getFullYear() + 1);
    } else {
      d.setMonth(d.getMonth() + 1);
    }
    return d.toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' });
  }, [isAnnual]);

  // STEP 1: Verificar si el email existe
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      const { error: err } = await supabase.auth.signInWithPassword({
        email: email.trim(), password: '___check___'
      });
      const msg = err?.message?.toLowerCase() ?? '';
      if (
        msg.includes('invalid login credentials') ||
        msg.includes('invalid credentials') ||
        msg.includes('email not confirmed') ||
        msg.includes('correo no confirmado')
      ) {
        setStep('password');
      } else {
        setStep('register');
      }
    } catch {
      setStep('register');
    } finally {
      setLoading(false);
    }
  };

  // STEP 2a: Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (err) { setError('Contraseña incorrecta. Inténtalo de nuevo.'); setLoading(false); }
      // Si ok → onAuthStateChange actualiza user → useEffect navega
    } catch { setError('Error de conexión.'); setLoading(false); }
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
      if (err) {
        const msg = err.message.toLowerCase();
        if (msg.includes('already') || msg.includes('registered') || msg.includes('ya existe')) {
          setStep('password');
          setError('Ya tienes cuenta con este correo. Ingresa tu contraseña.');
        } else { setError(err.message); }
        setLoading(false); return;
      }
      if (data.user) {
        await supabase.from('users').upsert([{ id: data.user.id, email: email.trim(), nombre: fullName }]);
        if (data.session) {
          // onAuthStateChange actualizará user → useEffect navega al dashboard
        } else {
          setStep('confirm'); setLoading(false);
        }
      }
    } catch { setError('Error al crear la cuenta.'); setLoading(false); }
  };

  // Google OAuth
  const handleGoogle = async () => {
    setLoading(true);
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: 'https://www.telsim.io/dashboard#/login?oauth=1',
      },
    });
  };

  // ─── Google Icon SVG ───
  const GoogleIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" className="shrink-0">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );

  // ─── Plan Panel (izquierdo en desktop / tarjeta en mobile) ───
  const PlanPanel = ({ mobile = false }: { mobile?: boolean }) => (
    <div className={`
      flex flex-col gap-5
      ${mobile
        ? 'mx-4 mt-4 mb-2 rounded-[24px] p-5'
        : 'rounded-none p-10 justify-center min-h-full'
      }
      bg-gradient-to-br from-slate-900 via-[#1B3A6B] to-[#1d4ed8] relative overflow-hidden
    `}>
      {/* Círculos decorativos */}
      <div className="absolute -top-16 -right-16 w-52 h-52 rounded-full bg-white/[0.03] pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-white/[0.03] pointer-events-none" />

      {/* Logo (solo desktop) */}
      {!mobile && (
        <div className="mb-4">
          <TelsimBrandLogo
            compact
            iconClassName="h-10 w-10 rounded-xl"
            textClassName="text-[1.65rem] text-white"
          />
        </div>
      )}

      {/* Badge */}
      <div className="flex items-center gap-1.5 w-fit">
        <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
        <span className="text-[9px] font-black text-white/50 uppercase tracking-[0.18em]">Plan seleccionado</span>
      </div>

      {/* Nombre + precio */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className={`font-black text-white tracking-tight leading-none ${mobile ? 'text-3xl' : 'text-4xl'}`}>
            {plan.planName.toUpperCase()}
          </div>
          <div className="text-[10px] font-600 text-white/40 mt-1.5">
            {plan.limit} créditos SMS / mes · {isAnnual ? 'Facturación anual' : 'Facturación mensual'}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className={`font-black text-white tracking-tight leading-none ${mobile ? 'text-3xl' : 'text-4xl'}`}>
            ${plan.price.toFixed(2)}
          </div>
          <div className="text-[9px] font-bold text-white/40 uppercase tracking-widest mt-1">
            {isAnnual ? '/año' : '/mes'}
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-white/[0.08]" />

      {/* Features */}
      <div className="flex flex-col gap-2.5">
        {plan.features.map((f, i) => (
          <div key={i} className="flex items-center gap-2.5">
            <div className="w-[18px] h-[18px] rounded-full bg-emerald-400/15 flex items-center justify-center shrink-0">
              <span className="material-symbols-rounded text-emerald-400 text-[11px]">check</span>
            </div>
            <span className="text-[11px] font-semibold text-white/80">{f}</span>
          </div>
        ))}
      </div>

      {/* Guarantee badge */}
      <div className="flex items-center justify-between bg-emerald-400/10 border border-emerald-400/20 rounded-[14px] px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-rounded text-emerald-400 text-[16px]">verified_user</span>
          <div>
            <div className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Garantía 100%</div>
            <div className="text-[9px] text-white/40 font-medium">Revisión de satisfacción y uso legítimo</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[8px] font-bold text-white/40 uppercase tracking-widest">Próxima renovación</div>
          <div className="text-[10px] font-black text-white/80">{billingDate}</div>
        </div>
      </div>

      {/* Total */}
      <div className="flex items-center justify-between pt-1">
        <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Total hoy</span>
        <span className={`font-black text-white ${mobile ? 'text-xl' : 'text-2xl'}`}>${plan.price.toFixed(2)}</span>
      </div>

      {/* Trust (solo mobile) */}
      {mobile && (
        <div className="flex items-center justify-center gap-4 pt-1 flex-wrap">
          {[
            { icon: 'lock', label: 'Stripe Secure' },
            { icon: 'cancel', label: 'Cancela cuando quieras' },
            { icon: 'shield', label: 'SSL 256-bit' },
          ].map(b => (
            <div key={b.label} className="flex items-center gap-1">
              <span className="material-symbols-rounded text-white/30 text-[11px]">{b.icon}</span>
              <span className="text-[9px] font-600 text-white/30">{b.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ─── Auth Form ───
  const AuthForm = ({ mobile = false }: { mobile?: boolean }) => (
    <div className={`flex flex-col gap-5 ${mobile ? 'mx-4 mb-4 p-5 bg-white dark:bg-slate-900 rounded-[24px] border border-slate-100 dark:border-slate-800' : 'p-10 justify-center'}`}>

      {/* Usuario ya autenticado → botón directo a pagar */}
      {user ? (
        <div className="flex flex-col gap-4">
          {!mobile && (
            <div className="mb-2">
              <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                ¡Listo para pagar!
              </h2>
              <p className="text-[12px] text-slate-400 dark:text-slate-500 font-medium mt-1.5">
                Continúa para completar tu suscripción.
              </p>
            </div>
          )}
          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20">
            <span className="material-symbols-rounded text-blue-500 text-[18px]">account_circle</span>
            <div className="flex-1 min-w-0">
              <p className="text-[9px] font-black uppercase tracking-widest text-blue-500">Cuenta activa</p>
              <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 truncate">{user.email}</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/onboarding/region')}
            className="w-full h-12 rounded-[14px] bg-[#1d4ed8] text-white font-black text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity">
            <span>Ir a pagar</span>
            <span className="material-symbols-rounded text-[18px]">arrow_forward</span>
          </button>
          <p className="text-center text-[10px] text-slate-400 dark:text-slate-500 leading-relaxed">
            Al continuar, aceptas los{' '}
            <button onClick={() => navigate('/legal?tab=terms')} className="underline text-slate-500 dark:text-slate-400 hover:text-blue-600 transition-colors font-semibold">Términos</button>
            {' '}y la{' '}
            <button onClick={() => navigate('/legal?tab=privacy')} className="underline text-slate-500 dark:text-slate-400 hover:text-blue-600 transition-colors font-semibold">Política de Privacidad</button>
            {' '}de Telsim.
          </p>
        </div>
      ) : (
        <>
          {!mobile && (
            <div className="mb-2">
              <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                Crea tu cuenta<br />y empieza ahora
              </h2>
              <p className="text-[12px] text-slate-400 dark:text-slate-500 font-medium mt-1.5">
                Ingresa con tu correo o continúa con Google
              </p>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 text-red-600 dark:text-red-300 text-[11px] font-bold flex items-center gap-2">
              <span className="material-symbols-rounded text-[16px]">error</span>
              {error}
            </div>
          )}

          {/* STEP: EMAIL */}
          {step === 'email' && (
            <form onSubmit={handleEmailSubmit} className="flex flex-col gap-3">
              <div className="relative">
                <span className="material-symbols-rounded absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 text-[19px]">mail</span>
                <input
                  type="email" required value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  className="w-full h-12 pl-11 pr-4 rounded-[14px] border-[1.5px] border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-semibold text-slate-900 dark:text-white focus:border-blue-600 dark:focus:bg-slate-800 outline-none transition-all font-sans"
                />
              </div>
              <button type="submit" disabled={loading}
                className="w-full h-12 rounded-[14px] bg-[#1d4ed8] text-white font-black text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50">
                {loading
                  ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <><span>Continuar</span><span className="material-symbols-rounded text-[18px]">arrow_forward</span></>
                }
              </button>
              <div className="flex items-center gap-3 py-1">
                <div className="flex-1 h-px bg-slate-100 dark:bg-slate-800" />
                <span className="text-[9px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest">o</span>
                <div className="flex-1 h-px bg-slate-100 dark:bg-slate-800" />
              </div>
              <button type="button" onClick={handleGoogle} disabled={loading}
                className="w-full h-12 rounded-[14px] border-[1.5px] border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex items-center justify-center gap-2.5 hover:border-blue-400 transition-colors disabled:opacity-50">
                <GoogleIcon />
                <span className="text-[11px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest">Continuar con Google</span>
              </button>
            </form>
          )}

          {/* STEP: PASSWORD */}
          {step === 'password' && (
            <form onSubmit={handleLogin} className="flex flex-col gap-3">
              <div className="flex items-center gap-2 p-3 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20">
                <span className="material-symbols-rounded text-blue-500 text-[16px]">person</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] font-black uppercase tracking-widest text-blue-500">Cuenta encontrada</p>
                  <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 truncate">{email}</p>
                </div>
                <button type="button" onClick={() => { setStep('email'); setError(null); }}
                  className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest hover:text-blue-600 shrink-0">
                  Cambiar
                </button>
              </div>
              <div className="relative">
                <span className="material-symbols-rounded absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 text-[19px]">lock</span>
                <input type="password" required value={password} onChange={e => setPassword(e.target.value)} autoFocus
                  placeholder="Tu contraseña"
                  className="w-full h-12 pl-11 pr-4 rounded-[14px] border-[1.5px] border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-semibold text-slate-900 dark:text-white focus:border-blue-600 dark:focus:bg-slate-800 outline-none transition-all font-sans" />
              </div>
              <button type="submit" disabled={loading}
                className="w-full h-12 rounded-[14px] bg-[#1d4ed8] text-white font-black text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50">
                {loading
                  ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <><span>Ingresar y continuar</span><span className="material-symbols-rounded text-[18px]">arrow_forward</span></>
                }
              </button>
            </form>
          )}

          {/* STEP: CONFIRM EMAIL */}
          {step === 'confirm' && (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <span className="material-symbols-rounded text-emerald-500 text-[48px]">mark_email_read</span>
              <div>
                <p className="text-sm font-black text-slate-900 dark:text-white mb-1">¡Revisa tu correo!</p>
                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 leading-relaxed">
                  Enviamos un enlace a <strong className="text-slate-700 dark:text-slate-200">{email}</strong>.<br />
                  Confírmalo para continuar con tu compra.
                </p>
              </div>
              <button type="button" onClick={() => { setStep('email'); setError(null); }}
                className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 hover:text-blue-600 transition-colors">
                ← Usar otro correo
              </button>
            </div>
          )}

          {/* STEP: REGISTER */}
          {step === 'register' && (
            <form onSubmit={handleRegister} className="flex flex-col gap-3">
              <div className="flex items-start gap-2 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20">
                <span className="material-symbols-rounded text-emerald-500 text-[16px] mt-0.5">info</span>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-emerald-600 mb-0.5">Cuenta nueva</p>
                  <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 leading-relaxed">
                    Crearemos tu cuenta con <strong className="text-slate-700 dark:text-slate-200">{email}</strong> para continuar.
                  </p>
                </div>
              </div>
              <div className="relative">
                <span className="material-symbols-rounded absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 text-[19px]">person</span>
                <input type="text" required value={fullName} onChange={e => setFullName(e.target.value)} autoFocus
                  placeholder="Tu nombre completo"
                  className="w-full h-12 pl-11 pr-4 rounded-[14px] border-[1.5px] border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-semibold text-slate-900 dark:text-white focus:border-blue-600 dark:focus:bg-slate-800 outline-none transition-all font-sans" />
              </div>
              <div className="relative">
                <span className="material-symbols-rounded absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 text-[19px]">lock</span>
                <input type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="Elige una contraseña (mín. 6 caracteres)"
                  className="w-full h-12 pl-11 pr-4 rounded-[14px] border-[1.5px] border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-semibold text-slate-900 dark:text-white focus:border-blue-600 dark:focus:bg-slate-800 outline-none transition-all font-sans" />
              </div>
              <button type="submit" disabled={loading}
                className="w-full h-12 rounded-[14px] bg-[#1d4ed8] text-white font-black text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50">
                {loading
                  ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <><span>Crear cuenta y continuar</span><span className="material-symbols-rounded text-[18px]">arrow_forward</span></>
                }
              </button>
              <button type="button" onClick={() => { setStep('email'); setError(null); }}
                className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 hover:text-blue-600 transition-colors text-center">
                ← Usar otro correo
              </button>
            </form>
          )}

          {/* Trust badges (solo desktop) */}
          {!mobile && (
            <div className="flex items-center gap-4 flex-wrap pt-1">
              {[
                { icon: 'lock', label: 'Pago seguro Stripe' },
                { icon: 'cancel', label: 'Cancela cuando quieras' },
                { icon: 'shield', label: 'SSL 256-bit' },
              ].map(b => (
                <div key={b.label} className="flex items-center gap-1.5">
                  <span className="material-symbols-rounded text-slate-300 dark:text-slate-600 text-[13px]">{b.icon}</span>
                  <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">{b.label}</span>
                </div>
              ))}
            </div>
          )}

          {/* Legal */}
          <p className="text-center text-[10px] text-slate-400 dark:text-slate-500 leading-relaxed">
            Al continuar, aceptas los{' '}
            <button onClick={() => navigate('/legal?tab=terms')} className="underline text-slate-500 dark:text-slate-400 hover:text-blue-600 transition-colors font-semibold">Términos</button>
            {' '}y la{' '}
            <button onClick={() => navigate('/legal?tab=privacy')} className="underline text-slate-500 dark:text-slate-400 hover:text-blue-600 transition-colors font-semibold">Política de Privacidad</button>
            {' '}de Telsim.
          </p>
        </>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-background-dark font-sans antialiased">

      {/* Header móvil */}
      <div className="md:hidden sticky top-0 z-20 flex items-center bg-white/90 dark:bg-slate-950/90 backdrop-blur-sm px-4 py-3 border-b border-slate-100 dark:border-slate-800">
        <button onClick={() => navigate('/')}
          className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
          <span className="material-symbols-rounded text-slate-600 dark:text-slate-300 text-[20px]">arrow_back</span>
        </button>
        <h2 className="flex-1 text-center text-[15px] font-black text-slate-900 dark:text-white pr-9">Completa tu pedido</h2>
      </div>

      {/* ── MOBILE: columna única ── */}
      <div className="md:hidden flex flex-col pb-10">
        <PlanPanel mobile />
        <AuthForm mobile />
      </div>

      {/* ── DESKTOP: dos columnas ── */}
      <div className="hidden md:flex items-center justify-center min-h-screen p-8">
        <div className="w-full max-w-[860px] grid grid-cols-2 rounded-[28px] overflow-hidden shadow-2xl shadow-slate-900/20">
          <PlanPanel />
          <div className="bg-white dark:bg-slate-950 flex flex-col">
            {/* Header desktop */}
            <div className="flex items-center gap-3 px-10 pt-10 pb-0">
              <button onClick={() => navigate('/')}
                className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <span className="material-symbols-rounded text-slate-500 dark:text-slate-400 text-[20px]">arrow_back</span>
              </button>
              <span className="text-[12px] font-bold text-slate-400 dark:text-slate-500">Volver al inicio</span>
            </div>
            <AuthForm />
          </div>
        </div>
      </div>

    </div>
  );
};

export default QuickCheckout;
