import { useState, useEffect, useCallback } from 'react';
import type { KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import TelsimBrandLogo from '../../components/TelsimBrandLogo';

// ─── Main Component ───────────────────────────────────────────────────────────

const Login = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  const [step, setStep] = useState<'email' | 'login' | 'register'>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPass, setShowPass] = useState(false);

  const redirectAfterAuth = useCallback(() => {
    // 1) post_login_redirect (onboarding/checkout/flow)
    const redirect = localStorage.getItem('post_login_redirect');
    if (redirect) {
      localStorage.removeItem('post_login_redirect');
      const plan = localStorage.getItem('selected_plan') || 'pro';
      const billing = localStorage.getItem('selected_billing') || 'monthly';
      localStorage.setItem('selected_plan_annual', billing === 'annual' ? 'true' : 'false');

      navigate(`${redirect}?plan=${plan}&billing=${billing}`, { replace: true });
      return;
    }

    // 2) selected_plan => onboarding
    const hasPlan = !!localStorage.getItem('selected_plan');
    if (hasPlan) {
      navigate('/onboarding/region', { replace: true });
      return;
    }

    // 3) fallback por dispositivo real (UA)
    const isMobile =
      /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    navigate(isMobile ? '/dashboard' : '/web', { replace: true });
  }, [navigate]);

  // Respaldo: si el usuario entra ya autenticado a /login, redirigir cuando auth termine
  useEffect(() => {
    if (loading) return;
    if (!user) return;
    redirectAfterAuth();
  }, [user, loading, redirectAfterAuth]);

  // STEP 1: flujo neutro (sin fake login)
  const handleContinueEmail = async () => {
    if (!email) return;
    setError(null);
    setStep('login');
  };

  const handleGoogleLogin = async () => {
    const origin = typeof location !== 'undefined' ? location.origin : '';
    setSubmitting(true);
    setError(null);
    try {
      const { data, error: err } = await (supabase.auth as any).signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${origin}/#/auth/callback`,
        },
      });

      if (err) {
        setError('No pudimos iniciar sesión con Google. Inténtalo nuevamente.');
        return;
      }

      // Normalmente Supabase redirige inmediatamente; si no hay URL, dejamos que el usuario reintente.
      if (!data?.url) {
        setError('No pudimos iniciar el flujo de Google. Inténtalo nuevamente.');
      }
    } catch {
      setError('No pudimos iniciar sesión con Google. Inténtalo nuevamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogin = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const { data, error: err } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (err) {
        setError('Contraseña incorrecta. Inténtalo de nuevo.');
        return;
      }

      if (data?.session) {
        redirectAfterAuth();
      }
      // Si no hay session por alguna razón, AuthContext actualizará user
      // y el useEffect de respaldo hará el redirect.
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const { data, error: err } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { full_name: nombre } },
      });

      if (err) {
        setError(err.message);
        return;
      }

      if (data?.session) {
        redirectAfterAuth();
        return;
      }

      setError('Te enviamos un correo para confirmar tu cuenta. Revisa tu inbox y spam.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (step === 'email') handleContinueEmail();
      else if (step === 'login') handleLogin();
      else handleRegister();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-display flex flex-col">
      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-5 lg:px-10">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-1.5 text-slate-400 hover:text-primary transition-colors text-[12px] font-semibold"
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          Volver al inicio
        </button>
        <div className="text-[11px] text-slate-400">
          {step === 'register' ? '¿Ya tienes cuenta? ' : step === 'login' ? '¿No tienes cuenta? ' : null}
          {(step === 'register' || step === 'login') && (
            <button
              onClick={() => setStep(step === 'register' ? 'login' : 'register')}
              className="text-primary font-bold hover:underline"
            >
              {step === 'register' ? 'Ingresar' : 'Crear cuenta'}
            </button>
          )}
        </div>
      </div>

      {/* Form card */}
      <div className="flex-1 flex items-center justify-center px-5 py-8">
        <div className="w-full max-w-[400px] mx-auto">
          {/* Logo + heading */}
          <div className="flex flex-col items-center mb-8">
            <TelsimBrandLogo iconClassName="h-11 w-11 rounded-[0.95rem]" textClassName="text-[1.75rem]" />
            <h1 className="mt-6 text-[26px] font-black text-slate-900 dark:text-white tracking-tight text-center">
              {step === 'register' ? 'Crea tu cuenta' : 'Bienvenido de vuelta'}
            </h1>
            <p className="text-slate-400 dark:text-slate-500 text-[13px] mt-1.5 text-center">
              {step === 'register'
                ? 'Empieza a gestionar tus SIMs en minutos.'
                : 'Ingresa a tu panel de gestión de SIMs.'}
            </p>
          </div>

          {/* Error */}
          {error && (
            <div
              className="w-full p-3 mb-5 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 text-red-600 dark:text-red-400 text-[12px] font-bold rounded-xl"
              style={{ animation: 'slideIn 0.2s ease' }}
            >
              {error}
            </div>
          )}

          {/* STEP: email */}
          {step === 'email' && (
            <div className="space-y-3" style={{ animation: 'slideIn 0.2s ease' }}>
              {/* Google */}
              <button
                onClick={handleGoogleLogin}
                disabled={submitting}
                className="w-full h-12 rounded-xl font-bold text-[13px] flex items-center justify-center gap-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90 transition-opacity"
              >
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
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
                <span className="text-slate-400 dark:text-slate-600 text-[11px] font-semibold">
                  o con tu email
                </span>
                <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1" />
              </div>

              {/* Email input */}
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError(null);
                }}
                onKeyDown={handleKeyDown}
                placeholder="Correo electrónico"
                autoFocus
                className="w-full h-12 pl-4 pr-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-[13px] font-medium placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              />

              <button
                onClick={handleContinueEmail}
                disabled={submitting || !email}
                className="w-full h-12 bg-primary text-white rounded-xl font-bold text-[13px] shadow-lg shadow-blue-200/60 dark:shadow-blue-900/40 hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    Cargando...
                  </span>
                ) : (
                  'Continuar'
                )}
              </button>
            </div>
          )}

          {/* STEP: login / register */}
          {(step === 'login' || step === 'register') && (
            <div className="space-y-3" style={{ animation: 'slideIn 0.2s ease' }}>
              {/* Email pill */}
              <div className="w-full h-12 px-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-between">
                <div className="flex items-center gap-2 overflow-hidden">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#94a3b8"
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                  <span className="text-[13px] font-medium text-slate-600 dark:text-slate-300 truncate">
                    {email}
                  </span>
                </div>
                <button
                  onClick={() => setStep('email')}
                  className="text-primary text-[11px] font-bold hover:underline flex-shrink-0 ml-2"
                >
                  Cambiar
                </button>
              </div>

              {/* Name (only register) */}
              {step === 'register' && (
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => {
                    setNombre(e.target.value);
                    if (error) setError(null);
                  }}
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
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError(null);
                  }}
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
                    <svg
                      width="17"
                      height="17"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    >
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg
                      width="17"
                      height="17"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    >
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>

              {/* Forgot password */}
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
                disabled={submitting || !password || (step === 'register' && !nombre)}
                className="w-full h-12 bg-primary text-white rounded-xl font-bold text-[13px] shadow-lg shadow-blue-200/60 dark:shadow-blue-900/40 hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    Cargando...
                  </span>
                ) : step === 'login' ? (
                  'Ingresar al dashboard'
                ) : (
                  'Crear cuenta gratis'
                )}
              </button>
            </div>
          )}

          {/* Terms */}
          <p className="mt-6 text-[10px] text-slate-400 dark:text-slate-600 text-center leading-relaxed">
            Al continuar, aceptas nuestros{' '}
            <button
              onClick={() => navigate('/legal?tab=terms')}
              className="underline text-slate-500 dark:text-slate-400 font-semibold hover:text-primary transition-colors"
            >
              Términos de uso
            </button>{' '}
            y nuestra{' '}
            <button
              onClick={() => navigate('/legal?tab=privacy')}
              className="underline text-slate-500 dark:text-slate-400 font-semibold hover:text-primary transition-colors"
            >
              Política de privacidad
            </button>
            .
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-center pb-6">
        <span className="text-[10px] text-slate-300 dark:text-slate-700 font-semibold">
          TELSIM © 2025 · v2.4.2
        </span>
      </div>
    </div>
  );
};

export default Login;
