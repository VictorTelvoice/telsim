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
      <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-[-5%] left-[-5%] w-48 h-48 bg-primary/10 rounded-full blur-2xl pointer-events-none"></div>

      <div className="w-full max-w-sm relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-6 transform -rotate-2 relative">
            <div className="absolute inset-0 rounded-3xl bg-primary/10 blur-xl animate-pulse scale-110"></div>
            <img 
              src="/logo.png" 
              alt="TELSIM" 
              className="w-24 h-24 object-contain drop-shadow-2xl relative z-10" 
              onError={(e) => {
                (e.target as any).style.display = 'none';
                (e.target as any).nextSibling.style.display = 'flex';
              }}
            />
            <div style={{ display: 'none' }} className="w-24 h-24 bg-gradient-to-br from-primary to-blue-600 rounded-3xl items-center justify-center text-white shadow-2xl border-2 border-white/20 relative z-10">
              <span className="font-black text-2xl tracking-tighter uppercase">TS</span>
            </div>
          </div>
          
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">
            Únete a TELSIM
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 font-bold italic leading-relaxed">
            Tu Infraestructura de <br/>Comunicaciones Privada
          </p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          {error && (
            <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/50 text-red-600 dark:text-red-400 text-[11px] font-black uppercase tracking-widest flex items-center gap-3 animate-in fade-in slide-in-from-top-1">
              <span className="material-symbols-rounded text-lg shrink-0">error</span>
              <span className="flex-1">{error}</span>
            </div>
          )}
          
          <div className="space-y-1.5">
            <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">
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
                className="w-full h-14 pl-12 pr-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:border-primary outline-none transition-all font-bold"
                placeholder="Ej. Alex Smith"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">
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
                className="w-full h-14 pl-12 pr-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:border-primary outline-none transition-all font-bold"
                placeholder="nombre@email.com"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">
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
                className="w-full h-14 pl-12 pr-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:border-primary outline-none transition-all font-bold"
                placeholder="Mínimo 6 caracteres"
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full h-16 bg-primary hover:bg-primary-dark disabled:opacity-50 text-white font-black rounded-2xl shadow-button transition-all flex items-center justify-center gap-3 mt-6 active:scale-[0.98] uppercase tracking-widest"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-white/30 border-t-white"></div>
            ) : (
              <>
                <span>Crear Cuenta</span>
                <span className="material-symbols-rounded text-[20px]">arrow_forward</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-10 pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-col items-center gap-4">
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 italic">
            ¿Ya tienes una línea activa?
          </p>
          <Link 
            to="/login" 
            className="w-full h-12 flex items-center justify-center gap-2 rounded-xl border-2 border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-200 font-black uppercase tracking-widest hover:border-primary transition-colors text-[10px]"
          >
            <span className="material-symbols-rounded text-[18px]">login</span>
            Acceder al Panel
          </Link>
        </div>

        <p className="mt-8 text-[9px] text-center text-slate-400 dark:text-slate-500 font-black uppercase tracking-[0.2em] px-4">
          Al unirte, aceptas los <span className="underline cursor-pointer">Términos</span> y la <span className="underline cursor-pointer">Privacidad</span>.
        </p>
      </div>
    </div>
  );
};

export default Register;