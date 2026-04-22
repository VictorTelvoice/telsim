"use client";

import React, { useState, useCallback, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { registerUser } from '@/actions/authActions';
import AuthLayout from './AuthLayout';

const UnifiedAuthForm = ({ defaultStep = 'email' }: { defaultStep?: 'email' | 'login' | 'register' }) => {
  const router = useRouter();
  const [step, setStep] = useState<'email' | 'login' | 'register'>(defaultStep);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPass, setShowPass] = useState(false);

  const redirectAfterAuth = useCallback(() => {
    const redirect = localStorage.getItem('post_login_redirect');
    if (redirect) {
      localStorage.removeItem('post_login_redirect');
      router.push(redirect);
      return;
    }

    const hasPlan = !!localStorage.getItem('selected_plan');
    if (hasPlan) {
      router.push('/onboarding/region');
      return;
    }

    // Default redirect logic based on UA (simplified for Next.js)
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    router.push(isMobile ? '/dashboard' : '/dashboard'); // Adjust if /web is needed
  }, [router]);

  const handleContinueEmail = async () => {
    if (!email) return;
    setError(null);
    setStep('login'); // Defaulting to login step for simplicity in the prototype
  };

  const handleGoogleLogin = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await signIn('google', { callbackUrl: '/dashboard' });
    } catch (err) {
      setError('No pudimos iniciar sesión con Google.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogin = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await signIn('credentials', {
        email: email.trim(),
        password,
        redirect: false,
      });

      if (res?.error) {
        setError('Email o contraseña incorrectos.');
      } else {
        redirectAfterAuth();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await registerUser({ name: nombre, email: email.trim(), pass: password });
      if (res.success) {
        // Auto-login after register
        await signIn('credentials', {
           email: email.trim(),
           password,
           redirect: false
        });
        redirectAfterAuth();
      } else {
        setError(res.error || 'Error al crear la cuenta.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (step === 'email') handleContinueEmail();
      else if (step === 'login') handleLogin();
      else handleRegister();
    }
  };

  return (
    <AuthLayout step={step} setStep={setStep}>
      {/* Error */}
      {error && (
        <div
          className="w-full p-3 mb-5 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 text-red-600 dark:text-red-400 text-[12px] font-bold rounded-xl animate-in fade-in"
        >
          {error}
        </div>
      )}

      {/* STEP: email */}
      {step === 'email' && (
        <div className="space-y-3 animate-in slide-in-from-top-1">
          {/* Google */}
          <button
            onClick={handleGoogleLogin}
            disabled={submitting}
            className="w-full h-12 rounded-xl font-bold text-[13px] flex items-center justify-center gap-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90 transition-opacity"
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Continuar con Google
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 py-1">
            <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1" />
            <span className="text-slate-400 dark:text-slate-600 text-[11px] font-semibold">
              o con tu email
            </span>
            <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1" />
          </div>

          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Correo electrónico"
            autoFocus
            className="w-full h-12 pl-4 pr-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-[13px] font-medium focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
          />

          <button
            onClick={handleContinueEmail}
            disabled={submitting || !email}
            className="w-full h-12 bg-primary text-white rounded-xl font-bold text-[13px] shadow-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {submitting ? 'Cargando...' : 'Continuar'}
          </button>
        </div>
      )}

      {/* STEP: login / register */}
      {(step === 'login' || step === 'register') && (
        <div className="space-y-3 animate-in slide-in-from-top-1">
          <div className="w-full h-12 px-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-between">
            <span className="text-[13px] font-medium text-slate-600 dark:text-slate-300 truncate">{email}</span>
            <button onClick={() => setStep('email')} className="text-primary text-[11px] font-bold hover:underline ml-2">Cambiar</button>
          </div>

          {step === 'register' && (
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Nombre completo"
              autoFocus
              className="w-full h-12 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-[13px] font-medium focus:border-primary outline-none transition-all"
            />
          )}

          <div className="relative">
            <input
              type={showPass ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={step === 'register' ? 'Crea una contraseña' : 'Contraseña'}
              autoFocus={step === 'login'}
              className="w-full h-12 pl-4 pr-12 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-[13px] font-medium focus:border-primary outline-none transition-all"
            />
            <button onClick={() => setShowPass(!showPass)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400">
               {/* Icon toggle simplified */}
               {showPass ? 'OCULTAR' : 'VER'}
            </button>
          </div>

          <button
            onClick={step === 'login' ? handleLogin : handleRegister}
            disabled={submitting || !password || (step === 'register' && !nombre)}
            className="w-full h-12 bg-primary text-white rounded-xl font-bold text-[13px] shadow-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {submitting ? 'Cargando...' : step === 'login' ? 'Ingresar' : 'Crear cuenta'}
          </button>
        </div>
      )}
    </AuthLayout>
  );
};

export default UnifiedAuthForm;
