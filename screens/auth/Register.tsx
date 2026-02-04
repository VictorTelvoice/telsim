
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

const Register: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logoError, setLogoError] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          }
        }
      });

      if (signUpError) {
        throw signUpError;
      }

      if (data.user) {
        const { error: insertError } = await supabase
          .from('users')
          .insert([
            { 
              id: data.user.id, 
              email: email,
              nombre: fullName 
            }
          ]);

        if (insertError) {
          console.error("Critical error: User auth created but public profile insert failed:", insertError);
          throw new Error("No se pudo sincronizar el perfil público (tabla 'users'). Contacta a soporte.");
        }

        navigate('/dashboard');
      }
    } catch (err: any) {
      console.error("Registration process failed:", err);
      setError(err.message || "Error al crear la cuenta. Inténtalo de nuevo.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background-light dark:bg-background-dark font-display relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-[-5%] left-[-5%] w-48 h-48 bg-primary/10 rounded-full blur-2xl pointer-events-none"></div>

      <div className="w-full max-sm relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-6 relative group">
            <div className="absolute inset-0 rounded-3xl bg-primary/10 animate-pulse scale-125"></div>
            {!logoError ? (
              <img 
                src="/logo.png" 
                alt="TELSIM" 
                className="w-20 h-20 object-contain drop-shadow-lg relative z-10" 
                onError={() => setLogoError(true)}
              />
            ) : (
              <div className="w-20 h-20 bg-primary rounded-3xl flex items-center justify-center text-white shadow-xl relative z-10">
                <span className="font-black text-xl uppercase tracking-tighter">TELSIM</span>
              </div>
            )}
          </div>
          
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Únete a TELSIM
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium leading-relaxed">
            Crea tu línea privada en segundos y <br/>mantén tu identidad segura.
          </p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          {error && (
            <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/50 text-red-600 dark:text-red-400 text-sm font-semibold flex items-center gap-3 animate-in fade-in slide-in-from-top-1">
              <span className="material-symbols-rounded text-lg shrink-0">error</span>
              <span className="flex-1">{error}</span>
            </div>
          )}
          
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">
              Nombre completo
            </label>
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">
                <span className="material-symbols-rounded text-[20px]">person</span>
              </div>
              <input 
                type="text" 
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full h-14 pl-12 pr-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600"
                placeholder="Ej. Alex Smith"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">
              Correo electrónico
            </label>
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">
                <span className="material-symbols-rounded text-[20px]">mail</span>
              </div>
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-14 pl-12 pr-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600"
                placeholder="nombre@email.com"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">
              Contraseña segura
            </label>
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">
                <span className="material-symbols-rounded text-[20px]">lock_open</span>
              </div>
              <input 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-14 pl-12 pr-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600"
                placeholder="Mínimo 6 caracteres"
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full h-14 bg-primary hover:bg-primary-dark disabled:opacity-50 text-white font-bold rounded-2xl shadow-button hover:shadow-primary/30 transition-all flex items-center justify-center gap-3 mt-6 group active:scale-[0.98]"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white"></div>
            ) : (
              <>
                <span>Crear Cuenta</span>
                <span className="material-symbols-rounded text-[20px] group-hover:translate-x-1 transition-transform">arrow_forward</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-10 pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-col items-center gap-4">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            ¿Ya tienes una línea activa?
          </p>
          <Link 
            to="/login" 
            className="w-full h-12 flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <span className="material-symbols-rounded text-[18px]">login</span>
            Inicia Sesión
          </Link>
        </div>

        <p className="mt-8 text-[10px] text-center text-slate-400 dark:text-slate-500 font-medium px-4">
          Al unirte a TELSIM, aceptas nuestros <span className="underline">Términos de Servicio</span> y la <span className="underline">Política de Privacidad</span>.
        </p>
      </div>
    </div>
  );
};

export default Register;
