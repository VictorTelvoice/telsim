import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

const Login = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<'email' | 'login' | 'register'>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleContinueEmail = () => {
    if (!email) return;
    setError(null);
    // Por ahora simplemente pasamos a login como solicita el usuario
    setStep('login');
  };

  const handleGoogleLogin = async () => {
    const savedPlan = localStorage.getItem('selected_plan');
    await (supabase.auth as any).signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: savedPlan
          ? `${window.location.origin}/#/onboarding/checkout`
          : window.location.origin,
      },
    });
  };

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    const { error } = await (supabase.auth as any).signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    navigate('/dashboard');
  };

  const handleRegister = async () => {
    setLoading(true);
    setError(null);
    const { error } = await (supabase.auth as any).signUp({ 
      email, 
      password, 
      options: { data: { full_name: nombre } } 
    });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    const savedPlan = localStorage.getItem('selected_plan');
    navigate(savedPlan ? '/onboarding/checkout' : '/onboarding/plan');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-blue-50 via-indigo-50 to-white font-sans">
      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(-6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      
      <div className="bg-white rounded-3xl shadow-xl p-8 w-full max-w-sm flex flex-col items-center">
        {/* Logo */}
        <div className="flex flex-col items-center mt-[-8px] mb-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-11 h-11 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-blue-200">
              <span className="material-symbols-rounded text-white text-[24px]">sim_card</span>
            </div>
            <span className="font-extrabold text-2xl tracking-tight text-slate-900">Telsim</span>
          </div>
          <p className="text-sm text-slate-500 text-center">
            Donde la privacidad y la tecnología se encuentran.
          </p>
        </div>

        {error && (
          <div className="w-full p-3 mb-4 bg-red-50 border border-red-100 text-red-600 text-[11px] font-bold rounded-xl animate-[slideIn_0.2s_ease]">
            {error}
          </div>
        )}

        {step === 'email' && (
          <div className="w-full space-y-4 animate-[slideIn_0.2s_ease]">
            <button
              onClick={handleGoogleLogin}
              className="w-full h-12 rounded-full font-bold text-sm flex items-center justify-center gap-2.5 bg-[#0f172a] text-white hover:opacity-90 transition-opacity"
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continuar con Google
            </button>
            
            <button
              disabled
              className="w-full h-12 rounded-full font-bold text-sm flex items-center justify-center gap-2.5 bg-[#94a3b8] text-white opacity-70 cursor-not-allowed"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.11.8 1.12-.16 2.13-.83 3.59-.73 1.82.13 3.19.8 3.99 2.02-3.69 2.14-3.12 6.64.49 8.12-.36.94-.9 1.83-1.63 2.76zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
              </svg>
              Continuar con Apple
            </button>

            <div className="flex items-center gap-4 py-2">
              <div className="h-px bg-slate-200 flex-1"></div>
              <div className="w-2 h-2 rounded-full bg-slate-200"></div>
              <div className="h-px bg-slate-200 flex-1"></div>
            </div>

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Correo electrónico personal o laboral"
              className="w-full h-12 px-4 rounded-xl border border-slate-200 text-sm font-medium focus:border-blue-600 outline-none transition-all"
            />

            <button
              onClick={handleContinueEmail}
              className="w-full h-12 bg-[#1d4ed8] text-white rounded-full font-bold text-sm shadow-lg shadow-blue-200/60 hover:opacity-90 transition-opacity"
            >
              Continuar
            </button>
          </div>
        )}

        {(step === 'login' || step === 'register') && (
          <div className="w-full space-y-4">
            {/* Email Read-only */}
            <div className="w-full h-12 px-4 rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-between animate-[slideIn_0.2s_ease]">
              <div className="flex items-center gap-2 overflow-hidden">
                <span className="material-symbols-rounded text-slate-400 text-[18px]">mail</span>
                <span className="text-sm font-medium text-slate-600 truncate">{email}</span>
              </div>
              <button 
                onClick={() => setStep('email')}
                className="text-blue-600 text-xs font-bold hover:underline"
              >
                Editar
              </button>
            </div>

            {step === 'register' && (
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Nombre completo"
                className="w-full h-12 px-4 rounded-xl border border-slate-200 text-sm font-medium focus:border-blue-600 outline-none animate-[slideIn_0.2s_ease]"
              />
            )}

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Contraseña"
              className="w-full h-12 px-4 rounded-xl border border-slate-200 text-sm font-medium focus:border-blue-600 outline-none animate-[slideIn_0.2s_ease]"
            />

            <button
              onClick={step === 'login' ? handleLogin : handleRegister}
              disabled={loading}
              className="w-full h-12 bg-[#1d4ed8] text-white rounded-full font-bold text-sm shadow-lg shadow-blue-200/60 hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? 'Cargando...' : step === 'login' ? 'Continuar' : 'Crear cuenta'}
            </button>

            <div className="text-center">
              {step === 'login' ? (
                <button 
                  onClick={() => setStep('register')}
                  className="text-blue-600 text-xs font-bold hover:underline"
                >
                  ¿Primera vez en TELSIM? Crear cuenta
                </button>
              ) : (
                <button 
                  onClick={() => setStep('login')}
                  className="text-blue-600 text-xs font-bold hover:underline"
                >
                  ¿Ya tienes cuenta? Ingresar
                </button>
              )}
            </div>
          </div>
        )}

        <p className="mt-8 text-[10px] text-slate-400 text-center leading-relaxed">
          Al continuar, aceptas nuestros <span className="underline cursor-pointer">Términos de uso</span> y nuestra <span className="underline cursor-pointer">Política de privacidad</span>.
        </p>
      </div>
    </div>
  );
};

export default Login;
