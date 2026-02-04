
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Shield, 
  FileText, 
  Lock, 
  CheckCircle, 
  ChevronRight,
  Info
} from 'lucide-react';

type Tab = 'terms' | 'privacy';

const TermsPrivacy: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('terms');

  const handleBack = () => {
    navigate('/dashboard/profile');
  };

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-white pb-24 transition-colors duration-200">
      {/* Header Fijo */}
      <header className="sticky top-0 z-30 bg-background-light/90 dark:bg-background-dark/90 backdrop-blur-md px-6 py-6 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-4 mb-6">
          <button 
            onClick={handleBack}
            className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="size-5" />
          </button>
          <h1 className="text-xl font-black tracking-tight">Legal</h1>
        </div>

        {/* Selector de Pestañas (Segmented Control) */}
        <div className="bg-slate-100 dark:bg-slate-800/50 p-1.5 rounded-2xl flex items-center">
          <button 
            onClick={() => setActiveTab('terms')}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              activeTab === 'terms' 
              ? 'bg-white dark:bg-slate-700 text-primary dark:text-white shadow-sm' 
              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            Términos
          </button>
          <button 
            onClick={() => setActiveTab('privacy')}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              activeTab === 'privacy' 
              ? 'bg-white dark:bg-slate-700 text-primary dark:text-white shadow-sm' 
              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            Privacidad
          </button>
        </div>
      </header>

      <main className="px-6 py-8 max-w-lg mx-auto space-y-10">
        
        {/* Sección: Icono de Encabezado */}
        <div className="flex flex-col items-center text-center">
          <div className={`size-20 rounded-[2rem] flex items-center justify-center mb-4 border shadow-sm transition-colors ${
            activeTab === 'terms' 
            ? 'bg-blue-50 dark:bg-blue-900/20 text-primary border-blue-100 dark:border-blue-800' 
            : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-brand border-emerald-100 dark:border-emerald-800'
          }`}>
            {activeTab === 'terms' ? <FileText className="size-10" /> : <Shield className="size-10" />}
          </div>
          <h2 className="text-2xl font-black tracking-tight mb-2">
            {activeTab === 'terms' ? 'Términos de Servicio' : 'Política de Privacidad'}
          </h2>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
            Última actualización: Noviembre 2023
          </p>
        </div>

        {/* Contenido Dinámico */}
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
          {activeTab === 'terms' ? (
            <div className="space-y-8">
              <Section 
                title="1. Aceptación del Servicio"
                content="Al utilizar TELSIM, usted acepta cumplir con estos términos. Nuestro servicio consiste en el arrendamiento temporal de numeración física privada para la recepción de mensajes SMS de validación."
              />
              <Section 
                title="2. Uso Responsable"
                content="Queda estrictamente prohibido el uso de TELSIM para actividades ilícitas, acoso, fraude bancario o envío de spam masivo. TELSIM se reserva el derecho de suspender cualquier cuenta que viole estas normas."
              />
              <Section 
                title="3. Suscripción y Pagos"
                content="Los planes se cobran mensualmente por adelantado. Usted puede cancelar su suscripción en cualquier momento desde los ajustes, pero no se realizarán reembolsos por periodos parciales ya utilizados."
              />
              <Section 
                title="4. Disponibilidad del Puerto"
                content="Garantizamos una disponibilidad del 99.8% de nuestra infraestructura física. En caso de mantenimiento programado, los usuarios serán notificados con 24h de antelación."
              />
            </div>
          ) : (
            <div className="space-y-8">
              <Section 
                title="1. Recolección de Datos"
                content="Solo recolectamos los datos necesarios para operar el servicio: su correo electrónico para acceso y los metadatos de los SMS recibidos para mostrárselos en su panel."
              />
              <Section 
                title="2. Encriptación End-to-End"
                content="Sus mensajes SMS son procesados a través de canales encriptados y solo son accesibles mediante su sesión autenticada. No compartimos sus mensajes con terceros."
              />
              <Section 
                title="3. Eliminación de Registros"
                content="Usted tiene derecho a solicitar la eliminación total de su historial de mensajes y datos de cuenta en cualquier momento mediante una solicitud a soporte."
              />
              <Section 
                title="4. Cookies y Rastreo"
                content="TELSIM no utiliza cookies de seguimiento publicitario de terceros. Solo utilizamos cookies técnicas esenciales para mantener su sesión activa de forma segura."
              />
            </div>
          )}
        </div>

        {/* Banner de Garantía */}
        <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 flex items-center gap-5">
          <div className="size-12 rounded-2xl bg-white dark:bg-slate-700 shadow-sm flex items-center justify-center shrink-0">
            <Lock className="size-6 text-primary" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900 dark:text-white mb-1">Tu privacidad es ley</p>
            <p className="text-[10px] font-medium text-slate-500 leading-relaxed uppercase tracking-wider">Cumplimos con estándares internacionales de protección de datos.</p>
          </div>
        </div>

        <footer className="text-center space-y-4 pt-4">
          <div className="flex justify-center gap-6 opacity-40">
            <div className="flex items-center gap-1">
              <CheckCircle className="size-3" />
              <span className="text-[8px] font-black uppercase tracking-widest">GDPR Ready</span>
            </div>
            <div className="flex items-center gap-1">
              <CheckCircle className="size-3" />
              <span className="text-[8px] font-black uppercase tracking-widest">SSL Secure</span>
            </div>
          </div>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.4em]">TELSIM Legal Framework v2.1</p>
        </footer>
      </main>
    </div>
  );
};

interface SectionProps {
  title: string;
  content: string;
}

const Section: React.FC<SectionProps> = ({ title, content }) => (
  <div className="space-y-3">
    <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-3">
      <div className="size-1.5 rounded-full bg-primary"></div>
      {title}
    </h3>
    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 leading-relaxed pl-4.5">
      {content}
    </p>
  </div>
);

export default TermsPrivacy;
