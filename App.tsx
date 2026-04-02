import React, { Suspense, useEffect, useRef } from 'react';
import { HashRouter, Routes, Route, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NotificationsProvider } from './contexts/NotificationsContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { MessagesProvider, useMessagesCount } from './contexts/MessagesContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { SettingsProvider } from './contexts/SettingsContext';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import AdminGuard from './components/AdminGuard';
import ScrollToTop from './components/ScrollToTop';
import AdminLayout from './components/layouts/AdminLayout';
import { ImpersonationProvider } from './contexts/ImpersonationContext';
import ImpersonationBanner, { ImpersonationBannerSpacer } from './components/ImpersonationBanner';
import { Analytics } from './components/Analytics';

// Importación de Lucide Icons para el Navbar (Fallback de alta fiabilidad)
import { Home, MessageSquare, Plus, Smartphone, Settings } from 'lucide-react';
import { useTheme } from './contexts/ThemeContext';

const Landing = React.lazy(() => import('./screens/Landing'));
const Login = React.lazy(() => import('./screens/auth/Login'));
const AuthCallback = React.lazy(() => import('./screens/auth/AuthCallback'));
const RegionSelect = React.lazy(() => import('./screens/onboarding/RegionSelect'));
const PlanSelect = React.lazy(() => import('./screens/onboarding/PlanSelect'));
const Summary = React.lazy(() => import('./screens/onboarding/Summary'));
const Payment = React.lazy(() => import('./screens/onboarding/Payment'));
const Processing = React.lazy(() => import('./screens/onboarding/Processing'));
const Success = React.lazy(() => import('./screens/onboarding/Success'));
const ActivationSuccess = React.lazy(() => import('./screens/onboarding/ActivationSuccess'));
const QuickCheckout = React.lazy(() => import('./screens/onboarding/QuickCheckout'));
const loadDashboard = () => import('./screens/dashboard/Dashboard');
const loadMyNumbers = () => import('./screens/dashboard/MyNumbers');
const loadMessages = () => import('./screens/dashboard/Messages');
const loadBilling = () => import('./screens/dashboard/Billing');
const loadSettingsScreen = () => import('./screens/dashboard/Settings');

const Dashboard = React.lazy(loadDashboard);
const MyNumbers = React.lazy(loadMyNumbers);
const Profile = React.lazy(() => import('./screens/dashboard/Profile'));
const Messages = React.lazy(loadMessages);
const Notifications = React.lazy(() => import('./screens/dashboard/Notifications'));
const Billing = React.lazy(loadBilling);
const Security = React.lazy(() => import('./screens/dashboard/Security'));
const IdentityVerification = React.lazy(() => import('./screens/dashboard/IdentityVerification'));
const Support = React.lazy(() => import('./screens/dashboard/Support'));
const HelpCenter = React.lazy(() => import('./screens/dashboard/HelpCenter'));
const FAQ = React.lazy(() => import('./screens/dashboard/FAQ'));
const TermsPrivacy = React.lazy(() => import('./screens/dashboard/TermsPrivacy'));
const SettingsScreen = React.lazy(loadSettingsScreen);
const MobileNotificationSettings = React.lazy(() => import('./screens/dashboard/MobileNotificationSettings'));
const UpgradeSummary = React.lazy(() => import('./screens/dashboard/UpgradeSummary'));
const UpgradeSuccess = React.lazy(() => import('./screens/dashboard/UpgradeSuccess'));
const UpgradePlanSelector = React.lazy(() => import('./screens/dashboard/UpgradePlanSelector'));
const TelegramSetupGuide = React.lazy(() => import('./screens/dashboard/TelegramSetupGuide'));
const ApiGuide = React.lazy(() => import('./screens/dashboard/ApiGuide'));
const TelegramConfig = React.lazy(() => import('./screens/dashboard/TelegramConfig'));
const Webhooks = React.lazy(() => import('./screens/dashboard/Webhooks'));
const WebhookGuide = React.lazy(() => import('./screens/dashboard/WebhookGuide'));
const WebhookLogs = React.lazy(() => import('./screens/dashboard/WebhookLogs'));
const AdminLogs = React.lazy(() => import('./screens/dashboard/AdminLogs'));
const AdminOverview = React.lazy(() => import('./screens/admin/AdminOverview'));
const InventoryManager = React.lazy(() => import('./screens/admin/InventoryManager'));
const SubscriptionMonitor = React.lazy(() => import('./screens/admin/SubscriptionMonitor'));
const UserManager = React.lazy(() => import('./screens/admin/UserManager'));
const UserDetail = React.lazy(() => import('./screens/admin/UserDetail'));
const ContentCMS = React.lazy(() => import('./screens/admin/ContentCMS'));
const SupportCenter = React.lazy(() => import('./screens/admin/SupportCenter'));
const AdminTicketChat = React.lazy(() => import('./screens/admin/AdminTicketChat'));
const AdminNotifications = React.lazy(() => import('./screens/admin/AdminNotifications'));
const AdminTemplates = React.lazy(() => import('./screens/admin/AdminTemplates'));
const AdminFinanceRevenueOps = React.lazy(() => import('./screens/admin/AdminFinanceRevenueOps'));
const AdminIncomingSms = React.lazy(() => import('./screens/admin/AdminIncomingSms'));
const AdminRatings = React.lazy(() => import('./screens/admin/AdminRatings'));
const ApiDocs = React.lazy(() => import('./screens/ApiDocs'));
const LegalScreen = React.lazy(() => import('./screens/legal/LegalScreen'));
const AnonymousRegistration = React.lazy(() => import('./screens/use-cases/AnonymousRegistration'));
const Vault2FA = React.lazy(() => import('./screens/use-cases/Vault2FA'));
const BypassAntibots = React.lazy(() => import('./screens/use-cases/BypassAntibots'));
const SniperBots = React.lazy(() => import('./screens/use-cases/SniperBots'));
const SecureShopping = React.lazy(() => import('./screens/use-cases/SecureShopping'));
const ScaleAds = React.lazy(() => import('./screens/use-cases/ScaleAds'));
const WebDashboard = React.lazy(() => import('./screens/dashboard/WebDashboard'));
const UserTickets = React.lazy(() => import('./screens/dashboard/UserTickets'));
const UserTicketChat = React.lazy(() => import('./screens/dashboard/UserTicketChat'));
const ReactivateLine = React.lazy(() => import('./screens/ReactivateLine'));

const RouteFallback = () => (
  <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center">
    <div className="flex items-center justify-center rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 px-5 py-4 shadow-sm">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-primary dark:border-slate-600 dark:border-t-blue-400" />
    </div>
  </div>
);

const ThemeRouteSync: React.FC = () => {
  const location = useLocation();
  const { theme } = useTheme();

  useEffect(() => {
    const root = window.document.documentElement;
    const path = location.pathname || '/';
    const canUseDark =
      path.startsWith('/dashboard') ||
      path.startsWith('/web') ||
      path.startsWith('/admin') ||
      path.startsWith('/onboarding');

    if (theme === 'dark' && canUseDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [location.pathname, theme]);

  return null;
};

const MOBILE_ROUTE_PRELOADERS = [
  loadDashboard,
  loadMessages,
  loadMyNumbers,
  loadSettingsScreen,
  loadBilling,
];

type IdleCallbackLike = (deadline: { didTimeout: boolean; timeRemaining: () => number }) => void;

const scheduleIdle = (callback: IdleCallbackLike) => {
  if (typeof window === 'undefined') return () => {};

  if ('requestIdleCallback' in window) {
    const id = (window as Window & {
      requestIdleCallback: (cb: IdleCallbackLike, options?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    }).requestIdleCallback(callback, { timeout: 1200 });

    return () => {
      (window as Window & { cancelIdleCallback?: (id: number) => void }).cancelIdleCallback?.(id);
    };
  }

  const id = globalThis.setTimeout(() => callback({ didTimeout: false, timeRemaining: () => 0 }), 250);
  return () => globalThis.clearTimeout(id);
};

const LandingOrDash_v2: React.FC = () => {
  const { user, loading } = useAuth();

  // Mientras el auth carga, no mostrar nada (evita flash de contenido incorrecto)
  if (loading) return null;

  // Redirect SÍNCRONO: sin useEffect, sin navigate() — se resuelve en el mismo
  // ciclo de render, eliminando la race condition que mostraba la versión
  // de escritorio en móvil durante la primera carga.
  if (user) {
    const dest = isMobileDeviceUA() ? '/dashboard' : '/web';
    return <Navigate to={dest} replace />;
  }

  return <Landing />;
};

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { unreadSmsCount } = useMessagesCount();
  
  const isActive = (path: string) => location.pathname === path;

  const isSettingsActive = 
    isActive('/dashboard/profile') || 
    isActive('/dashboard/settings') || 
    isActive('/dashboard/notification-settings') ||
    isActive('/dashboard/help') || 
    isActive('/dashboard/faq') || 
    isActive('/dashboard/terms') || 
    isActive('/dashboard/security') ||
    isActive('/dashboard/support') ||
    isActive('/dashboard/billing');

  const isHomeActive = 
    isActive('/dashboard') && !isSettingsActive;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-surface-light/95 dark:bg-surface-dark/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 pb-safe pt-2 px-2 max-w-md mx-auto shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-50">
      <div className="flex justify-between items-center h-16">
        <button 
          onClick={() => navigate('/dashboard')}
          className="flex-1 flex flex-col items-center justify-center gap-1 group"
        >
          <Home 
            size={24} 
            className={`transition-colors ${isHomeActive ? 'text-primary' : 'text-slate-400 group-hover:text-primary'}`}
            fill={isHomeActive ? 'currentColor' : 'none'}
          />
          <span className={`text-[10px] font-medium transition-colors ${isHomeActive ? 'text-primary' : 'text-slate-400 group-hover:text-primary'}`}>
            Inicio
          </span>
        </button>

        <button 
          onClick={() => navigate('/dashboard/messages')}
          className="flex-1 flex flex-col items-center justify-center gap-1 group relative"
        >
          <MessageSquare 
            size={24} 
            className={`transition-colors ${isActive('/dashboard/messages') ? 'text-primary' : 'text-slate-400 group-hover:text-primary'}`}
            fill={isActive('/dashboard/messages') ? 'currentColor' : 'none'}
          />
          <span className={`text-[10px] font-medium transition-colors ${isActive('/dashboard/messages') ? 'text-primary' : 'text-slate-400 group-hover:text-primary'}`}>
            Mensajes
          </span>
          {unreadSmsCount > 0 && (
            <span className="absolute top-1 right-5 min-w-[14px] h-[14px] bg-red-500 text-white text-[8px] font-black rounded-full flex items-center justify-center px-1 border border-white dark:border-surface-dark">
              {unreadSmsCount}
            </span>
          )}
        </button>

        <div className="relative -top-5 px-2">
          <button 
            onClick={() => navigate('/onboarding/plan')}
            className="size-14 bg-primary rounded-full flex items-center justify-center text-white shadow-[0_4px_12px_rgba(17,82,212,0.4)] hover:scale-105 active:scale-95 transition-transform"
          >
            <Plus size={32} />
          </button>
        </div>

        <button 
          onClick={() => navigate('/dashboard/numbers')}
          className="flex-1 flex flex-col items-center justify-center gap-1 group"
        >
          <Smartphone 
            size={24} 
            className={`transition-colors ${isActive('/dashboard/numbers') ? 'text-primary' : 'text-slate-400 group-hover:text-primary'}`}
            fill={isActive('/dashboard/numbers') ? 'currentColor' : 'none'}
          />
          <span className={`text-[10px] font-medium transition-colors ${isActive('/dashboard/numbers') ? 'text-primary' : 'text-slate-400 group-hover:text-primary'}`}>
            Números
          </span>
        </button>

        <button 
          onClick={() => navigate('/dashboard/settings')}
          className="flex-1 flex flex-col items-center justify-center gap-1 group"
        >
          <Settings 
            size={24} 
            className={`transition-colors ${isSettingsActive ? 'text-primary' : 'text-slate-400 group-hover:text-primary'}`}
            fill={isSettingsActive ? 'currentColor' : 'none'}
          />
          <span className={`text-[10px] font-medium transition-colors ${isSettingsActive ? 'text-primary' : 'text-slate-400 group-hover:text-primary'}`}>
            Ajustes
          </span>
        </button>
      </div>
    </nav>
  );
};

/** Detecta si el dispositivo ES genuinamente móvil/tablet por user agent,
 *  independientemente del ancho del viewport (que puede estar reducido por
 *  paneles laterales como el agente de Cursor, DevTools, etc.) */
const isMobileDeviceUA = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
};

const DashboardLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const mobile = isMobileDeviceUA();

  // Si NO es un dispositivo móvil real, redirigir al web dashboard
  React.useEffect(() => {
    if (!mobile) {
      navigate('/web', { replace: true });
    }
  }, [navigate, mobile]);

  // En desktop/laptop no renderizar nada (se redirige de inmediato)
  if (!mobile) return null;

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark">
      {children}
      <BottomNav />
    </div>
  );
};

const MobileRoutePreloader = () => {
  const { user, loading } = useAuth();
  const preloadedForUserRef = useRef<string | null>(null);

  useEffect(() => {
    if (loading || !user?.id || !isMobileDeviceUA()) return;
    if (preloadedForUserRef.current === user.id) return;

    preloadedForUserRef.current = user.id;

    const cancel = scheduleIdle(() => {
      void Promise.allSettled(MOBILE_ROUTE_PRELOADERS.map((preload) => preload()));
    });

    return cancel;
  }, [user?.id, loading]);

  return null;
};

const App: React.FC = () => {
  React.useEffect(() => {
    const lockOrientation = async () => {
      try {
        if (screen.orientation && (screen.orientation as any).lock) {
          await (screen.orientation as any).lock('portrait');
        }
      } catch (_) {
        // No todos los navegadores soportan lock, se ignora silenciosamente
      }
    };
    lockOrientation();
  }, []);

  return (
    <ThemeProvider>
      <LanguageProvider>
        <SettingsProvider>
          <AuthProvider>
          <NotificationsProvider>
            <MessagesProvider>
              <HashRouter>
                <Analytics />
                <ImpersonationProvider>
                  <ThemeRouteSync />
                  <MobileRoutePreloader />
                  <ScrollToTop />
                  <ImpersonationBanner />
                  <ImpersonationBannerSpacer />
                <Suspense fallback={<RouteFallback />}>
                <Routes>
                  <Route path="/" element={<LandingOrDash_v2 />} />
                  <Route path="/api-docs" element={<ApiDocs />} />
                  <Route path="/web" element={<ProtectedRoute><WebDashboard /></ProtectedRoute>} />

                  {/* ── Rutas full-width (desktop responsivo, sin max-w-md) ── */}
                  <Route path="/login" element={<Login />} />
                  <Route path="/auth/callback" element={<AuthCallback />} />
                  <Route path="/register" element={<Navigate to="/login" replace />} />
                  <Route path="/web/reactivate-line" element={<ReactivateLine />} />
                  {/* Plan sin ProtectedRoute — usuario nuevo puede verlo */}
                  <Route path="/onboarding/plan" element={<PlanSelect />} />
                  <Route path="/onboarding/region" element={<ProtectedRoute><RegionSelect /></ProtectedRoute>} />
                  <Route path="/onboarding/summary" element={<ProtectedRoute><Summary /></ProtectedRoute>} />
                  <Route path="/onboarding/payment" element={<ProtectedRoute><Payment /></ProtectedRoute>} />
                  <Route path="/onboarding/processing" element={<ProtectedRoute><Processing /></ProtectedRoute>} />
                  <Route path="/onboarding/activation-success" element={<ProtectedRoute><ActivationSuccess /></ProtectedRoute>} />
                  <Route path="/dashboard/telegram-guide" element={<ProtectedRoute><TelegramSetupGuide /></ProtectedRoute>} />
                  <Route path="/dashboard/api-guide"      element={<ProtectedRoute><ApiGuide /></ProtectedRoute>} />
                  <Route path="/dashboard/upgrade-plan"   element={<ProtectedRoute><UpgradePlanSelector /></ProtectedRoute>} />
                  <Route path="/dashboard/upgrade-summary" element={<ProtectedRoute><UpgradeSummary /></ProtectedRoute>} />
                  <Route path="/dashboard/upgrade-success" element={<ProtectedRoute><UpgradeSuccess /></ProtectedRoute>} />

                  {/* Admin: UID exacto 8e7bcada-3f7a-482f-93a7-9d0fd4828231. Rutas a pantalla completa (fuera del contenedor max-w-md móvil). */}
                  <Route
                    path="/admin"
                    element={
                      <div className="w-full min-h-screen">
                        <ProtectedRoute>
                          <AdminGuard>
                            <AdminLayout />
                          </AdminGuard>
                        </ProtectedRoute>
                      </div>
                    }
                  >
                    <Route index element={<Navigate to="/admin/overview" replace />} />
                    <Route path="overview" element={<AdminOverview />} />
                    <Route path="finance" element={<AdminFinanceRevenueOps />} />
                    <Route path="inventory" element={<InventoryManager />} />
                    <Route path="users" element={<UserManager />} />
                    <Route path="users/:userId" element={<UserDetail />} />
                    <Route path="subscriptions" element={<SubscriptionMonitor />} />
                    <Route path="incoming-sms" element={<AdminIncomingSms />} />
                    <Route path="content" element={<ContentCMS />} />
                    <Route path="notifications" element={<AdminNotifications />} />
                    <Route path="templates" element={<AdminTemplates />} />
                    <Route path="support" element={<SupportCenter />} />
                    <Route path="support/:ticketId" element={<AdminTicketChat backTo="/admin/support" />} />
                    <Route path="ratings" element={<AdminRatings />} />
                    <Route path="logs" element={<AdminLogs />} />
                  </Route>

                  <Route path="*" element={
                    <div className="mx-auto w-full max-w-md bg-white dark:bg-background-dark min-h-screen shadow-2xl overflow-hidden relative">
                      <Routes>
                        <Route path="/legal" element={<LegalScreen />} />
                        <Route path="/onboarding/checkout" element={<QuickCheckout />} />
                        <Route
                          path="/onboarding/success"
                          element={<ProtectedRoute><Success /></ProtectedRoute>}
                        />
                        <Route 
                          path="/dashboard" 
                          element={<ProtectedRoute><DashboardLayout><Dashboard /></DashboardLayout></ProtectedRoute>} 
                        />
                        <Route 
                          path="/dashboard/messages" 
                          element={<ProtectedRoute><DashboardLayout><Messages /></DashboardLayout></ProtectedRoute>} 
                        />
                        <Route 
                          path="/dashboard/numbers" 
                          element={<ProtectedRoute><DashboardLayout><MyNumbers /></DashboardLayout></ProtectedRoute>} 
                        />
                        <Route 
                          path="/dashboard/profile" 
                          element={<ProtectedRoute><DashboardLayout><Profile /></DashboardLayout></ProtectedRoute>} 
                        />
                        <Route 
                          path="/dashboard/billing" 
                          element={<ProtectedRoute><DashboardLayout><Billing /></DashboardLayout></ProtectedRoute>} 
                        />
                        <Route 
                          path="/dashboard/security" 
                          element={<ProtectedRoute><DashboardLayout><Security /></DashboardLayout></ProtectedRoute>} 
                        />
                        <Route 
                          path="/dashboard/identity-verification" 
                          element={<ProtectedRoute><DashboardLayout><IdentityVerification /></DashboardLayout></ProtectedRoute>} 
                        />
                        <Route 
                          path="/dashboard/support" 
                          element={<ProtectedRoute><DashboardLayout><Support /></DashboardLayout></ProtectedRoute>} 
                        />
                        <Route 
                          path="/dashboard/help" 
                          element={<ProtectedRoute><DashboardLayout><HelpCenter /></DashboardLayout></ProtectedRoute>} 
                        />
                        <Route 
                          path="/dashboard/faq" 
                          element={<ProtectedRoute><DashboardLayout><FAQ /></DashboardLayout></ProtectedRoute>} 
                        />
                        <Route 
                          path="/dashboard/support/tickets" 
                          element={<ProtectedRoute><DashboardLayout><UserTickets /></DashboardLayout></ProtectedRoute>} 
                        />
                        <Route 
                          path="/dashboard/support/ticket/:ticketId" 
                          element={<ProtectedRoute><DashboardLayout><UserTicketChat /></DashboardLayout></ProtectedRoute>} 
                        />
                        <Route 
                          path="/dashboard/terms" 
                          element={<ProtectedRoute><DashboardLayout><TermsPrivacy /></DashboardLayout></ProtectedRoute>} 
                        />
                        <Route 
                          path="/dashboard/settings" 
                          element={<ProtectedRoute><DashboardLayout><SettingsScreen /></DashboardLayout></ProtectedRoute>} 
                        />
                        <Route 
                          path="/dashboard/notification-settings" 
                          element={<ProtectedRoute><DashboardLayout><MobileNotificationSettings /></DashboardLayout></ProtectedRoute>} 
                        />
                        <Route 
                          path="/dashboard/notifications" 
                          element={<ProtectedRoute><Notifications /></ProtectedRoute>} 
                        />
                        <Route
                          path="/dashboard/telegram-config"
                          element={<ProtectedRoute><DashboardLayout><TelegramConfig /></DashboardLayout></ProtectedRoute>}
                        />
                        <Route 
                          path="/dashboard/webhooks" 
                          element={<ProtectedRoute><DashboardLayout><Webhooks /></DashboardLayout></ProtectedRoute>} 
                        />
                        <Route 
                          path="/dashboard/webhooks/guide" 
                          element={<ProtectedRoute><DashboardLayout><WebhookGuide /></DashboardLayout></ProtectedRoute>} 
                        />
                        <Route 
                          path="/dashboard/webhook-logs" 
                          element={<ProtectedRoute><DashboardLayout><WebhookLogs /></DashboardLayout></ProtectedRoute>} 
                        />
                        <Route
                          path="/dashboard/admin/logs"
                          element={
                            <ProtectedRoute>
                              <AdminRoute>
                                <DashboardLayout>
                                  <AdminLogs />
                                </DashboardLayout>
                              </AdminRoute>
                            </ProtectedRoute>
                          }
                        />
                        <Route path="/use-case/anonymous" element={<ProtectedRoute><DashboardLayout><AnonymousRegistration /></DashboardLayout></ProtectedRoute>} />
                        <Route path="/use-case/vault-2fa" element={<ProtectedRoute><DashboardLayout><Vault2FA /></DashboardLayout></ProtectedRoute>} />
                        <Route path="/use-case/bypass-antibots" element={<ProtectedRoute><DashboardLayout><BypassAntibots /></DashboardLayout></ProtectedRoute>} />
                        <Route path="/use-case/sniper-bots" element={<ProtectedRoute><DashboardLayout><SniperBots /></DashboardLayout></ProtectedRoute>} />
                        <Route path="/use-case/secure-shopping" element={<ProtectedRoute><DashboardLayout><SecureShopping /></DashboardLayout></ProtectedRoute>} />
                        <Route path="/use-case/scale-ads" element={<ProtectedRoute><DashboardLayout><ScaleAds /></DashboardLayout></ProtectedRoute>} />
                      </Routes>
                    </div>
                  } />
                </Routes>
                </Suspense>
                </ImpersonationProvider>
            </HashRouter>
          </MessagesProvider>
        </NotificationsProvider>
      </AuthProvider>
        </SettingsProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
};

// v2.4.2
export default App;// force redeploy Mon Mar 16 18:26:10 -03 2026
