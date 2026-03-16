import React, { useEffect } from 'react';
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
import Landing from './screens/Landing';
import Login from './screens/auth/Login';
import RegionSelect from './screens/onboarding/RegionSelect';
import PlanSelect from './screens/onboarding/PlanSelect';
import Summary from './screens/onboarding/Summary';
import Payment from './screens/onboarding/Payment';
import Processing from './screens/onboarding/Processing';
import Success from './screens/onboarding/Success';
import ActivationSuccess from './screens/onboarding/ActivationSuccess';
import QuickCheckout from './screens/onboarding/QuickCheckout';
import Dashboard from './screens/dashboard/Dashboard';
import MyNumbers from './screens/dashboard/MyNumbers';
import Profile from './screens/dashboard/Profile';
import Messages from './screens/dashboard/Messages';
import Notifications from './screens/dashboard/Notifications';
import Billing from './screens/dashboard/Billing';
import Security from './screens/dashboard/Security';
import IdentityVerification from './screens/dashboard/IdentityVerification';
import Support from './screens/dashboard/Support';
import HelpCenter from './screens/dashboard/HelpCenter';
import TermsPrivacy from './screens/dashboard/TermsPrivacy';
import SettingsScreen from './screens/dashboard/Settings';
import MobileNotificationSettings from './screens/dashboard/MobileNotificationSettings';
import UpgradeSummary from './screens/dashboard/UpgradeSummary';
import UpgradeSuccess from './screens/dashboard/UpgradeSuccess';
import UpgradePlanSelector from './screens/dashboard/UpgradePlanSelector';
import TelegramSetupGuide from './screens/dashboard/TelegramSetupGuide';
import ApiGuide from './screens/dashboard/ApiGuide';
import TelegramConfig from './screens/dashboard/TelegramConfig';
import Webhooks from './screens/dashboard/Webhooks';
import WebhookGuide from './screens/dashboard/WebhookGuide';
import WebhookLogs from './screens/dashboard/WebhookLogs';
import AdminLogs from './screens/dashboard/AdminLogs';
import AdminLayout from './components/layouts/AdminLayout';
import { ImpersonationProvider } from './contexts/ImpersonationContext';
import ImpersonationBanner, { ImpersonationBannerSpacer } from './components/ImpersonationBanner';
import AdminOverview from './screens/admin/AdminOverview';
import InventoryManager from './screens/admin/InventoryManager';
import SubscriptionMonitor from './screens/admin/SubscriptionMonitor';
import UserManager from './screens/admin/UserManager';
import UserDetail from './screens/admin/UserDetail';
import ContentCMS from './screens/admin/ContentCMS';
import SupportCenter from './screens/admin/SupportCenter';
import AdminTicketChat from './screens/admin/AdminTicketChat';
import AdminNotifications from './screens/admin/AdminNotifications';
import AdminTemplates from './screens/admin/AdminTemplates';
import ApiDocs from './screens/ApiDocs';
import LegalScreen from './screens/legal/LegalScreen';
import AnonymousRegistration from './screens/use-cases/AnonymousRegistration';
import Vault2FA from './screens/use-cases/Vault2FA';
import BypassAntibots from './screens/use-cases/BypassAntibots';
import SniperBots from './screens/use-cases/SniperBots';
import SecureShopping from './screens/use-cases/SecureShopping';
import ScaleAds from './screens/use-cases/ScaleAds';
import WebDashboard from './screens/dashboard/WebDashboard';

// Importación de Lucide Icons para el Navbar (Fallback de alta fiabilidad)
import { Home, MessageSquare, Plus, Smartphone, Settings } from 'lucide-react';

const isMobileDevice = (): boolean =>
  /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

const LandingOrDashboard: React.FC = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (loading) return;
    if (user) {
      const dest = isMobileDevice() ? '/dashboard' : '/web';
      navigate(dest, { replace: true });
    }
  }, [user, loading, navigate]);

  // Si hay sesión cargando o usuario autenticado, no mostrar landing
  if (loading || user) return null;

  return <Landing />;
};

/** Red de seguridad: si el usuario llega al app ya logueado (p. ej. OAuth) y hay post_login_redirect, ir a onboarding */
const PostLoginRedirectHandler: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    const redirect = localStorage.getItem('post_login_redirect');
    if (redirect && user) {
      localStorage.removeItem('post_login_redirect');
      const plan = localStorage.getItem('selected_plan') || 'pro';
      const billing = localStorage.getItem('selected_billing') || 'monthly';
      localStorage.setItem('selected_plan_annual', billing === 'annual' ? 'true' : 'false');
      navigate(`${redirect}?plan=${plan}&billing=${billing}`);
    }
  }, [user, navigate]);
  return null;
};

/** Si la app queda en blanco/loading más de 2s tras volver a visible, refresca AuthContext (iOS PWA rutas congeladas). */
const NavigationWatchdog: React.FC = () => {
  const { loading, refreshProfile } = useAuth();
  React.useEffect(() => {
    let t: ReturnType<typeof setTimeout> | null = null;
    const onVisibilityChange = () => {
      if (t) clearTimeout(t);
      t = null;
      if (document.visibilityState === 'visible') {
        t = setTimeout(() => {
          if (document.visibilityState === 'visible') refreshProfile();
        }, 2000);
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    if (document.visibilityState === 'visible' && loading) {
      t = setTimeout(() => refreshProfile(), 2000);
    }
    return () => {
      if (t) clearTimeout(t);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [loading, refreshProfile]);
  return null;
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
                <ImpersonationProvider>
                  <ScrollToTop />
                  <ImpersonationBanner />
                  <ImpersonationBannerSpacer />
                  <PostLoginRedirectHandler />
                  <NavigationWatchdog />
                <Routes>
                  <Route path="/" element={<LandingOrDashboard />} />
                  <Route path="/api-docs" element={<ApiDocs />} />
                  <Route path="/web" element={<ProtectedRoute><WebDashboard /></ProtectedRoute>} />

                  {/* ── Rutas full-width (desktop responsivo, sin max-w-md) ── */}
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Navigate to="/login" replace />} />
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
                    <Route path="inventory" element={<InventoryManager />} />
                    <Route path="users" element={<UserManager />} />
                    <Route path="users/:userId" element={<UserDetail />} />
                    <Route path="subscriptions" element={<SubscriptionMonitor />} />
                    <Route path="content" element={<ContentCMS />} />
                    <Route path="notifications" element={<AdminNotifications />} />
                    <Route path="templates" element={<AdminTemplates />} />
                    <Route path="support" element={<SupportCenter />} />
                    <Route path="support/:ticketId" element={<AdminTicketChat backTo="/admin/support" />} />
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
