
import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'en' | 'es';

interface Translations {
  [key: string]: {
    [key: string]: string;
  };
}

const translations: Translations = {
  en: {
    'landing.hero': 'Your second private number in seconds',
    'landing.sub': 'Secure SMS verifications without compromising your real identity. Rent your SIM number.',
    'landing.privacy': 'Privacy Guaranteed',
    'landing.offer': 'LIMITED OFFER',
    'landing.free_trial': 'FREE first 15 days',
    'landing.then': 'Then only $13.90 USD/mo.',
    'landing.cta': 'Get my Free Number',
    'landing.lock': 'No binding contracts. Secure payment via Stripe.',
    'landing.feature1': 'Real Physical SIM Numbers (Non-VoIP)',
    'landing.feature2': 'Unlimited SMS Reception',
    'landing.feature3': 'WhatsApp, Telegram, Uber compatible',
    'login.title': 'Welcome to TELSIM',
    'login.sub': 'Enter your control panel',
    'login.demo': 'Demo Mode Active',
    'login.email': 'Email',
    'login.pass': 'Password',
    'login.btn': 'Sign In',
    'login.no_account': "Don't have an account?",
    'login.register': 'Register now',
    'register.title': 'Join TELSIM',
    'register.sub': 'Create your private line in seconds and keep your identity secure.',
    'register.name': 'Full Name',
    'register.email': 'Email',
    'register.pass': 'Secure Password',
    'register.btn': 'Create Account',
    'register.have_account': 'Already have an active line?',
    'register.login': 'Sign In',
    'dashboard.active': 'ACTIVE',
    'dashboard.no_line': 'NO LINE',
    'dashboard.main_line': 'Primary TELSIM Line',
    'dashboard.connected': '4G LTE NETWORK CONNECTED',
    'dashboard.copy': 'Copy',
    'dashboard.inbox': 'Inbox',
    'dashboard.get_first': 'Get my first number',
    'dashboard.recent': 'Recent Activity',
    'dashboard.view_all': 'View All',
    'dashboard.infra_ready': 'Infrastructure Ready',
    'dashboard.sms_active': 'Line active for SMS reception.',
    'dashboard.another': 'Another number?',
    'dashboard.add_more': 'Add more lines for WhatsApp or Telegram.',
    'dashboard.start_now': 'Start now',
    'nav.home': 'Home',
    'nav.messages': 'Messages',
    'nav.numbers': 'My Numbers',
    'nav.profile': 'Profile',
    'profile.title': 'My Profile',
    'profile.subscription': 'Subscription & Balance',
    'profile.plan_flex': 'FLEX PLAN',
    'profile.billing': 'Monthly Billing',
    'profile.next_charge': 'Next auto-charge: Oct 24',
    'profile.trial': 'ACTIVE TRIAL',
    'profile.update': 'Update',
    'profile.upgrade': 'Upgrade to Power Plan',
    'profile.history': 'Payment History',
    'profile.settings': 'Settings',
    'profile.privacy': 'Privacy & Security',
    'profile.help': 'Help Center',
    'profile.logout': 'Sign Out',
    'profile.lang': 'Language',
    'onboarding.step': 'Step',
    'onboarding.of': 'of',
    'onboarding.next': 'Next',
    'onboarding.region_title': 'Step 1: Choose your region',
    'onboarding.region_sub': 'Select between Chile, Argentina or Peru to get a real local physical number.',
    'onboarding.plan_title': 'Choose your plan',
    'onboarding.plan_sub': 'Select the power your communication needs.',
    'onboarding.summary_title': 'Review your subscription',
    'onboarding.summary_sub': 'Confirm details before proceeding to secure payment.',
    'onboarding.total_today': 'Total today',
    'onboarding.free_trial_btn': 'Start Free Trial',
    'onboarding.success_title': 'All ready!',
    'onboarding.success_sub_flex': 'Your private number has been successfully activated and you can now receive SMS.',
    'onboarding.success_sub_power': 'Automation infrastructure initialized successfully.',
    'onboarding.enter_panel': 'Enter Panel'
  },
  es: {
    'landing.hero': 'Tu segundo número privado en segundos',
    'landing.sub': 'Verificaciones SMS seguras sin comprometer tu identidad real. Alquila tu número SIM.',
    'landing.privacy': 'Privacidad Garantizada',
    'landing.offer': 'OFERTA LIMITADA',
    'landing.free_trial': 'GRATIS primeros 15 días',
    'landing.then': 'Luego solo $13.90 USD/mes.',
    'landing.cta': 'Obtener mi Número Gratis',
    'landing.lock': 'Sin contratos forzosos. Pago seguro via Stripe.',
    'landing.feature1': 'Números SIM de uso exclusivo',
    'landing.feature2': 'Recepción ilimitada de SMS',
    'landing.feature3': 'Compatible con WhatsApp, Telegram, Uber',
    'login.title': 'Bienvenido a TELSIM',
    'login.sub': 'Ingresa a tu panel de control',
    'login.demo': 'Modo Demostración Activo',
    'login.email': 'Email',
    'login.pass': 'Contraseña',
    'login.btn': 'Iniciar Sesión',
    'login.no_account': '¿No tienes cuenta?',
    'login.register': 'Regístrate ahora',
    'register.title': 'Únete a TELSIM',
    'register.sub': 'Crea tu línea privada en segundos y mantén tu identidad segura.',
    'register.name': 'Nombre completo',
    'register.email': 'Correo electrónico',
    'register.pass': 'Contraseña segura',
    'register.btn': 'Crear Cuenta',
    'register.have_account': '¿Ya tienes una línea activa?',
    'register.login': 'Inicia Sesión',
    'dashboard.active': 'ACTIVO',
    'dashboard.no_line': 'SIN LÍNEA',
    'dashboard.main_line': 'Línea TELSIM Principal',
    'dashboard.connected': 'RED 4G LTE CONECTADA',
    'dashboard.copy': 'Copiar',
    'dashboard.inbox': 'Inbox',
    'dashboard.get_first': 'Obtener mi primer número',
    'dashboard.recent': 'Actividad Reciente',
    'dashboard.view_all': 'Ver Todo',
    'dashboard.infra_ready': 'Infraestructura Lista',
    'dashboard.sms_active': 'Línea activa para recepción SMS.',
    'dashboard.another': '¿Otro número?',
    'dashboard.add_more': 'Añade más líneas para WhatsApp o Telegram.',
    'dashboard.start_now': 'Empezar ahora',
    'nav.home': 'Inicio',
    'nav.messages': 'Mensajes',
    'nav.numbers': 'Mis Números',
    'nav.profile': 'Perfil',
    'profile.title': 'Mi Perfil',
    'profile.subscription': 'Suscripción y Saldo',
    'profile.plan_flex': 'PLAN FLEX',
    'profile.billing': 'Facturación Mensual',
    'profile.next_charge': 'Próximo cargo automático: 24 Oct',
    'profile.trial': 'PRUEBA ACTIVA',
    'profile.update': 'Actualizar',
    'profile.upgrade': 'Subir a Plan Power',
    'profile.history': 'Historial de Pagos',
    'profile.settings': 'Configuración',
    'profile.privacy': 'Privacidad y Seguridad',
    'profile.help': 'Centro de Ayuda',
    'profile.logout': 'Cerrar Sesión',
    'profile.lang': 'Idioma',
    'onboarding.step': 'Paso',
    'onboarding.of': 'de',
    'onboarding.next': 'Siguiente',
    'onboarding.region_title': 'Paso 1: Elige tu región',
    'onboarding.region_sub': 'Selecciona entre Chile, Argentina o Perú para obtener un número local físico y real.',
    'onboarding.plan_title': 'Elige tu plan',
    'onboarding.plan_sub': 'Selecciona la potencia que necesita tu comunicación.',
    'onboarding.summary_title': 'Revisa tu suscripción',
    'onboarding.summary_sub': 'Confirma los detalles antes de proceder al pago seguro.',
    'onboarding.total_today': 'Total hoy',
    'onboarding.free_trial_btn': 'Iniciar Prueba Gratis',
    'onboarding.success_title': '¡Todo listo!',
    'onboarding.success_sub_flex': 'Tu número privado ha sido activado con éxito y ya puedes recibir SMS.',
    'onboarding.success_sub_power': 'Infraestructura de automatización inicializada correctamente.',
    'onboarding.enter_panel': 'Entrar al Panel'
  }
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('telsim_lang');
    return (saved as Language) || 'es';
  });

  useEffect(() => {
    localStorage.setItem('telsim_lang', language);
  }, [language]);

  const t = (key: string) => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
