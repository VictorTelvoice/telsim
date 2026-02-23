import React from 'react';
import { HashRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationsProvider } from './contexts/NotificationsContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { MessagesProvider, useMessagesCount } from './contexts/MessagesContext';
import { ThemeProvider } from './contexts/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import Landing from './screens/Landing';
import Login from './screens/auth/Login';
import Register from './screens/auth/Register';
import RegionSelect from './screens/onboarding/RegionSelect';
import PlanSelect from './screens/onboarding/PlanSelect';
import Summary from './screens/onboarding/Summary';
import Payment from './screens/onboarding/Payment';
import Processing from './screens/onboarding/Processing';
import Success from './screens/onboarding/Success';
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
import UpgradeSummary from './screens/dashboard/UpgradeSummary';
import UpgradeSuccess from './screens/dashboard/UpgradeSuccess';
import TelegramSetupGuide from './screens/dashboard/TelegramSetupGuide';
import AnonymousRegistration from './screens/use-cases/AnonymousRegistration';
import Vault2FA from './screens/use-cases/Vault2FA';
import BypassAntibots from './screens/use-cases/BypassAntibots';
import SniperBots from './screens/use-cases/SniperBots';
import SecureShopping from './screens/use-cases/SecureShopping';
import ScaleAds from './screens/use-cases/ScaleAds';

// Importación de Lucide Icons para el Navbar (Fallback de alta fiabilidad)
import { Home, MessageSquare, Plus, Smartphone, Settings } from 'lucide-react';

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { unreadSmsCount } = useMessagesCount();
  
  const isActive = (path: string) => location.pathname === path;

  const isSettingsActive = 
    isActive('/dashboard/profile') || 
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
            onClick={() => navigate('/onboarding/region')}
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
          onClick={() => navigate('/dashboard/profile')}
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

const DashboardLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark">
      {children}
      <BottomNav />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <NotificationsProvider>
            <MessagesProvider>
              <HashRouter>
                <Routes>
                  <Route path="/" element={<Landing />} />
                  <Route path="*" element={
                    <div className="mx-auto max-w-md bg-white dark:bg-background-dark min-h-screen shadow-2xl overflow-hidden relative">
                      <Routes>
                        <Route path="/login" element={<Login />} />
                        <Route path="/register" element={<Register />} />
                        <Route 
                          path="/onboarding/region" 
                          element={<ProtectedRoute><RegionSelect /></ProtectedRoute>} 
                        />
                        <Route 
                          path="/onboarding/plan" 
                          element={<ProtectedRoute><PlanSelect /></ProtectedRoute>} 
                        />
                        <Route 
                          path="/onboarding/summary" 
                          element={<ProtectedRoute><Summary /></ProtectedRoute>} 
                        />
                        <Route 
                          path="/onboarding/payment" 
                          element={<ProtectedRoute><Payment /></ProtectedRoute>} 
                        />
                        <Route 
                          path="/onboarding/processing" 
                          element={<ProtectedRoute><Processing /></ProtectedRoute>} 
                        />
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
                          path="/dashboard/notifications" 
                          element={<ProtectedRoute><Notifications /></ProtectedRoute>} 
                        />
                        <Route 
                          path="/dashboard/upgrade-summary" 
                          element={<ProtectedRoute><UpgradeSummary /></ProtectedRoute>} 
                        />
                        <Route 
                          path="/dashboard/upgrade-success" 
                          element={<ProtectedRoute><UpgradeSuccess /></ProtectedRoute>} 
                        />
                        <Route 
                          path="/dashboard/telegram-guide" 
                          element={<ProtectedRoute><DashboardLayout><TelegramSetupGuide /></DashboardLayout></ProtectedRoute>} 
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
              </HashRouter>
            </MessagesProvider>
          </NotificationsProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
};

export default App;