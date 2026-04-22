"use client";

import React from 'react';
import TelsimBrandLogo from '../TelsimBrandLogo';
import { useRouter } from 'next/navigation';

interface AuthLayoutProps {
  children: React.ReactNode;
  step: 'email' | 'login' | 'register';
  setStep: (step: 'email' | 'login' | 'register') => void;
}

const AuthLayout: React.FC<AuthLayoutProps> = ({ children, step, setStep }) => {
  const router = useRouter();

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
          onClick={() => router.push('/')}
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
            <TelsimBrandLogo compact={false} />
            <h1 className="mt-6 text-[26px] font-black text-slate-900 dark:text-white tracking-tight text-center">
              {step === 'register' ? 'Crea tu cuenta' : 'Bienvenido de vuelta'}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-[13px] mt-1.5 text-center">
              {step === 'register'
                ? 'Empieza a gestionar tus SIMs en minutos.'
                : 'Ingresa a tu panel de gestión de SIMs.'}
            </p>
          </div>

          {children}

          {/* Terms */}
          <p className="mt-6 text-[10px] text-slate-400 dark:text-slate-600 text-center leading-relaxed">
            Al continuar, aceptas nuestros{' '}
            <button
              onClick={() => router.push('/legal?tab=terms')}
              className="underline text-slate-500 dark:text-slate-400 font-semibold hover:text-primary transition-colors"
            >
              Términos de uso
            </button>{' '}
            y nuestra{' '}
            <button
              onClick={() => router.push('/legal?tab=privacy')}
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

export default AuthLayout;
