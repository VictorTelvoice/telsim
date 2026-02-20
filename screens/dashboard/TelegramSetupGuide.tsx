import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Shield, Smartphone, Zap } from 'lucide-react';

const TelegramSetupGuide: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-background-dark font-display pb-32">
      <header className="flex items-center justify-between px-6 py-5 bg-white/80 dark:bg-background-dark/80 backdrop-blur-md sticky top-0 z-50 border-b border-slate-100 dark:border-slate-800">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition text-slate-400">
          <ArrowLeft className="size-5" />
        </button>
        <h1 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">Guía Telegram</h1>
        <div className="size-5"></div>
      </header>

      <main className="px-5 py-8 space-y-8 max-w-lg mx-auto">
        <div className="text-center space-y-4">
          <div className="size-20 bg-[#0088cc] rounded-[2rem] flex items-center justify-center mx-auto shadow-lg shadow-blue-500/20">
            <Send className="size-10 text-white" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Configura tu cuenta de Telegram</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
            Sigue estos pasos para activar tu línea TELSIM en Telegram de forma segura y anónima.
          </p>
        </div>

        <div className="space-y-4">
          <div className="bg-white dark:bg-surface-dark p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="size-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center shrink-0 text-primary">
                <span className="font-black">1</span>
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase mb-1">Copia tu número</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Ve a la sección "Mis Números" y copia tu número TELSIM activo.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-surface-dark p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="size-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center shrink-0 text-primary">
                <span className="font-black">2</span>
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase mb-1">Ingresa el número en Telegram</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Abre Telegram, selecciona el país correspondiente y pega tu número.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-surface-dark p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="size-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center shrink-0 text-primary">
                <span className="font-black">3</span>
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase mb-1">Recibe el código</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Espera unos segundos y revisa tu bandeja de "Mensajes" en TELSIM para obtener el código de verificación.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-slate-900 dark:bg-blue-950/20 p-6 rounded-3xl text-white space-y-4">
          <div className="flex items-center gap-3">
            <Shield className="size-6 text-blue-400" />
            <h4 className="text-sm font-black uppercase tracking-tight">Consejo de Seguridad</h4>
          </div>
          <p className="text-xs text-white/70 leading-relaxed">
            Una vez activado, te recomendamos activar la <strong>Verificación en Dos Pasos</strong> dentro de los ajustes de privacidad de Telegram para una capa extra de protección.
          </p>
        </div>

        <button 
          onClick={() => navigate('/dashboard/numbers')}
          className="w-full h-16 bg-primary text-white font-black rounded-2xl shadow-lg shadow-blue-500/20 flex items-center justify-center gap-3 text-sm uppercase tracking-widest active:scale-95 transition-all"
        >
          <Smartphone className="size-5" />
          Ver mis números
        </button>
      </main>
    </div>
  );
};

export default TelegramSetupGuide;
