import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Shield, FileText, Lock, CheckCircle } from 'lucide-react';

type Tab = 'terms' | 'privacy';

const LegalScreen: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<Tab>('terms');

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'privacy') setActiveTab('privacy');
    else setActiveTab('terms');
  }, [searchParams]);

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 pb-16">

      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md px-5 pt-12 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3 mb-5">
          <button
            onClick={handleBack}
            className="p-2 -ml-2 rounded-full hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="size-5 text-slate-700" />
          </button>
          <h1 className="text-lg font-black tracking-tight">Información Legal</h1>
        </div>

        {/* Segmented control */}
        <div className="bg-slate-100 p-1 rounded-2xl flex items-center">
          <button
            onClick={() => setActiveTab('terms')}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              activeTab === 'terms'
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            Términos de Uso
          </button>
          <button
            onClick={() => setActiveTab('privacy')}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              activeTab === 'privacy'
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            Privacidad
          </button>
        </div>
      </header>

      <main className="px-5 py-8 max-w-lg mx-auto space-y-8">

        {/* Icono de encabezado */}
        <div className="flex flex-col items-center text-center">
          <div className={`size-20 rounded-[2rem] flex items-center justify-center mb-4 border shadow-sm transition-colors ${
            activeTab === 'terms'
              ? 'bg-blue-50 text-blue-700 border-blue-100'
              : 'bg-emerald-50 text-emerald-600 border-emerald-100'
          }`}>
            {activeTab === 'terms'
              ? <FileText className="size-10" />
              : <Shield className="size-10" />
            }
          </div>
          <h2 className="text-2xl font-black tracking-tight mb-1">
            {activeTab === 'terms' ? 'Términos de Uso' : 'Política de Privacidad'}
          </h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Última actualización: Enero 2025
          </p>
        </div>

        {/* Contenido dinámico */}
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-400">
          {activeTab === 'terms' ? <TermsContent /> : <PrivacyContent />}
        </div>

        {/* Banner de garantía */}
        <div className="p-5 bg-slate-50 rounded-[2rem] border border-slate-100 flex items-center gap-4">
          <div className="size-12 rounded-2xl bg-white shadow-sm flex items-center justify-center shrink-0">
            <Lock className="size-5 text-blue-700" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900 mb-0.5">Tu privacidad es una prioridad</p>
            <p className="text-[10px] font-medium text-slate-500 leading-relaxed uppercase tracking-wider">
              Nunca vendemos ni compartimos tus datos personales con terceros.
            </p>
          </div>
        </div>

        {/* Badges */}
        <footer className="text-center space-y-3 pt-2">
          <div className="flex justify-center gap-5 opacity-40">
            <div className="flex items-center gap-1">
              <CheckCircle className="size-3" />
              <span className="text-[8px] font-black uppercase tracking-widest">GDPR Ready</span>
            </div>
            <div className="flex items-center gap-1">
              <CheckCircle className="size-3" />
              <span className="text-[8px] font-black uppercase tracking-widest">SSL Secure</span>
            </div>
            <div className="flex items-center gap-1">
              <CheckCircle className="size-3" />
              <span className="text-[8px] font-black uppercase tracking-widest">Stripe Verified</span>
            </div>
          </div>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.4em]">
            TELSIM Legal Framework v1.0
          </p>
        </footer>

      </main>
    </div>
  );
};

/* ─────────────────────────────────────────
   TÉRMINOS DE USO
───────────────────────────────────────── */
const TermsContent: React.FC = () => (
  <div className="space-y-8">
    <Section
      title="1. Aceptación de los Términos"
      content="Al acceder y utilizar la plataforma Telsim, aceptas estar legalmente vinculado por estos Términos de Uso. Si no estás de acuerdo con alguna parte de estos términos, no debes utilizar nuestros servicios. Telsim se reserva el derecho de actualizar estos términos en cualquier momento, notificando a los usuarios a través de los canales disponibles en la plataforma."
    />
    <Section
      title="2. Descripción del Servicio"
      content="Telsim es una plataforma SaaS B2B que permite a empresas y desarrolladores gestionar tarjetas SIM físicas para la recepción de mensajes SMS, incluyendo códigos OTP y verificaciones de doble factor (2FA). El acceso a los servicios está condicionado a la contratación de un plan de suscripción activo y al cumplimiento de estas condiciones de uso."
    />
    <Section
      title="3. Uso Permitido"
      content="Los servicios de Telsim están destinados exclusivamente para fines legítimos de negocio, como la automatización de procesos de verificación, pruebas de software y gestión de cuentas corporativas. Queda estrictamente prohibido el uso de la plataforma para actividades ilícitas, spam, fraude, suplantación de identidad, o cualquier actividad que infrinja las leyes aplicables o los derechos de terceros."
    />
    <Section
      title="4. Cuentas de Usuario"
      content="Eres responsable de mantener la confidencialidad de tus credenciales de acceso (contraseña, API Key). Cualquier actividad realizada bajo tu cuenta es de tu entera responsabilidad. Debes notificar a Telsim inmediatamente si sospechas de un acceso no autorizado a tu cuenta. Telsim se reserva el derecho de suspender o cancelar cuentas que violen estos términos."
    />
    <Section
      title="5. Planes y Facturación"
      content="Los planes de suscripción se facturan de forma recurrente (mensual o anual) a través de Stripe. Los precios están sujetos a cambios con previo aviso. No se realizan reembolsos por periodos no utilizados, salvo en los casos expresamente previstos en nuestra garantía de satisfacción. Esta garantía permite solicitar un reembolso del 100% dentro de los primeros 7 días desde la compra, sujeto a revisión técnica, válido solo para la primera compra o primera línea de la cuenta, y únicamente cuando el servicio no cumple lo prometido y hubo un uso legítimo y razonable. No aplica en casos de abuso, fraude, múltiples cuentas relacionadas, consumo sustancial del servicio o uso intensivo destinado únicamente a validaciones puntuales. La falta de pago puede resultar en la suspensión del servicio."
    />
    <Section
      title="6. Disponibilidad del Servicio"
      content="Telsim se esfuerza por mantener una disponibilidad del servicio del 99.5% mensual. Sin embargo, no garantizamos un servicio ininterrumpido. Realizamos mantenimientos programados con previo aviso. No somos responsables por interrupciones causadas por factores fuera de nuestro control, como fallas de operadoras de telecomunicaciones o eventos de fuerza mayor."
    />
    <Section
      title="7. Propiedad Intelectual"
      content="Todo el contenido, software, diseño, logos y tecnología de Telsim son propiedad exclusiva de Telsim o sus licenciantes, protegidos por leyes de propiedad intelectual. No se otorga ninguna licencia implícita más allá del acceso necesario para usar el servicio contratado. Queda prohibida la reproducción, distribución o ingeniería inversa de cualquier componente de la plataforma."
    />
    <Section
      title="8. Limitación de Responsabilidad"
      content="En ningún caso Telsim será responsable por daños indirectos, incidentales, especiales o consecuentes derivados del uso o la imposibilidad de uso del servicio. Nuestra responsabilidad máxima total no superará el importe pagado por el usuario en los últimos 3 meses de servicio. Esta limitación aplica en la máxima medida permitida por la ley aplicable."
    />
    <Section
      title="9. Ley Aplicable"
      content="Estos Términos de Uso se rigen por las leyes vigentes en la República de Chile. Cualquier disputa derivada del uso del servicio será resuelta ante los tribunales competentes de Santiago de Chile. Las partes acuerdan intentar resolver cualquier disputa de manera amistosa antes de iniciar acciones legales formales."
    />
    <Section
      title="10. Contacto"
      content="Para consultas sobre estos términos, puedes contactarnos a través del módulo de soporte dentro de la plataforma, o enviando un correo a legal@telsim.io. Responderemos en un plazo máximo de 5 días hábiles."
    />
  </div>
);

/* ─────────────────────────────────────────
   POLÍTICA DE PRIVACIDAD
───────────────────────────────────────── */
const PrivacyContent: React.FC = () => (
  <div className="space-y-8">
    <Section
      title="1. Información que Recopilamos"
      content="Recopilamos información que nos proporcionas al registrarte: nombre completo, correo electrónico, número de teléfono, país y moneda de preferencia. Además, almacenamos datos técnicos necesarios para operar el servicio: API Keys, configuraciones de Webhook, tokens de Telegram, historial de SMS recibidos y datos de facturación procesados por Stripe (nunca almacenamos datos completos de tarjetas de crédito)."
    />
    <Section
      title="2. Cómo Usamos tu Información"
      content="Utilizamos tu información para: (a) proveer y mejorar los servicios contratados; (b) procesar pagos y gestionar suscripciones; (c) enviarte notificaciones del servicio, alertas de seguridad y actualizaciones importantes; (d) ofrecer soporte técnico personalizado; (e) cumplir con obligaciones legales. Nunca utilizamos tus datos para publicidad de terceros."
    />
    <Section
      title="3. Compartición de Datos"
      content="No vendemos, alquilamos ni compartimos tu información personal con terceros con fines comerciales. Podemos compartir datos únicamente con: (a) Stripe, para el procesamiento de pagos; (b) proveedores de infraestructura cloud (Supabase/AWS) que operan bajo estrictos acuerdos de confidencialidad; (c) autoridades competentes cuando sea legalmente requerido. Todos nuestros proveedores están sujetos a acuerdos de protección de datos."
    />
    <Section
      title="4. Seguridad de los Datos"
      content="Implementamos medidas de seguridad técnicas y organizativas para proteger tu información: cifrado SSL/TLS en todas las comunicaciones, cifrado en reposo para datos sensibles, autenticación de dos factores disponible, control de acceso basado en roles, y auditorías de seguridad periódicas. Sin embargo, ningún sistema es completamente invulnerable. Te recomendamos usar contraseñas seguras y no compartir tus credenciales."
    />
    <Section
      title="5. Retención de Datos"
      content="Conservamos tus datos personales mientras mantengas una cuenta activa en Telsim. Los mensajes SMS recibidos se almacenan por un periodo de 90 días. Los datos de facturación se conservan por el tiempo requerido por la legislación fiscal aplicable (generalmente 7 años). Puedes solicitar la eliminación de tu cuenta y datos asociados en cualquier momento desde el módulo de soporte."
    />
    <Section
      title="6. Tus Derechos"
      content="Tienes derecho a: (a) acceder a los datos personales que almacenamos sobre ti; (b) rectificar información incorrecta o desactualizada; (c) solicitar la eliminación de tus datos (derecho al olvido); (d) oponerte al tratamiento de tus datos; (e) solicitar la portabilidad de tus datos en formato estándar. Para ejercer estos derechos, contacta a nuestro equipo desde la sección de soporte de la plataforma."
    />
    <Section
      title="7. Cookies y Tecnologías de Seguimiento"
      content="Telsim utiliza únicamente cookies técnicas esenciales para el funcionamiento de la plataforma (sesión de usuario, preferencias de idioma y tema). No utilizamos cookies de rastreo publicitario ni compartimos datos de comportamiento con redes publicitarias. Puedes configurar tu navegador para rechazar cookies, aunque esto puede afectar la funcionalidad de la plataforma."
    />
    <Section
      title="8. Transferencias Internacionales"
      content="Telsim puede almacenar y procesar datos en servidores ubicados fuera de tu país de residencia. Estas transferencias se realizan bajo garantías adecuadas de protección (acuerdos de procesamiento de datos con proveedores certificados). Al utilizar nuestros servicios, aceptas que tus datos puedan ser transferidos y procesados en dichas jurisdicciones."
    />
    <Section
      title="9. Menores de Edad"
      content="Los servicios de Telsim están dirigidos exclusivamente a personas mayores de 18 años con capacidad legal para celebrar contratos. No recopilamos conscientemente información de menores de edad. Si detectamos que un usuario es menor de edad, procederemos a eliminar su cuenta y datos asociados de forma inmediata."
    />
    <Section
      title="10. Cambios a esta Política"
      content="Podemos actualizar esta Política de Privacidad periódicamente para reflejar cambios en nuestras prácticas o en la legislación aplicable. Notificaremos cualquier cambio material a través de la plataforma y/o por correo electrónico con al menos 15 días de anticipación. El uso continuado del servicio tras los cambios implica la aceptación de la política actualizada."
    />
  </div>
);

/* ─────────────────────────────────────────
   COMPONENTE SECCIÓN REUTILIZABLE
───────────────────────────────────────── */
interface SectionProps {
  title: string;
  content: string;
}

const Section: React.FC<SectionProps> = ({ title, content }) => (
  <div className="space-y-2.5">
    <h3 className="text-sm font-black text-slate-900 flex items-center gap-2.5">
      <div className="size-1.5 rounded-full bg-blue-600 shrink-0" />
      {title}
    </h3>
    <p className="text-sm font-medium text-slate-500 leading-relaxed pl-4">
      {content}
    </p>
  </div>
);

export default LegalScreen;
