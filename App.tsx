
import React from 'react';
import { HashRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationsProvider, useNotifications } from './contexts/NotificationsContext';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
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

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const { unreadSmsCount } = useMessagesCount();
  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="fixed bottom-0 w-full bg-surface-light dark:bg-surface-dark border-t border-slate-200 dark:border-slate-800 pb-[env(safe-area-inset-bottom)] z-30 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.02)]">
      <div className="relative flex items-center justify-between px-2 h-16 max-w-md mx-auto">
        <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 pointer-events-none z-10">
          <div className="w-16 h-16 bg-background-light dark:bg-background-dark rounded-full flex items-center justify-center">
            <button 
              onClick={() => navigate('/onboarding/region')}
              className="pointer-events-auto w-14 h-14 bg-primary text-white rounded-full shadow-lg shadow-blue-500/40 flex items-center justify-center transform transition active:scale-95 hover:bg-blue-700"
            >
              <span className="material-icons-round text-3xl">add</span>
            </button>
          </div>
        </div>

        <button 
          onClick={() => navigate('/dashboard')}
          className={`flex-1 flex flex-col items-center justify-center gap-1 h-full transition group ${isActive('/dashboard') ? 'text-primary dark:text-blue-400' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}
        >
          <span className="material-icons-round text-2xl group-active:scale-90 transition-transform">home</span>
          <span className="text-[10px] font-medium">{t('nav.home')}</span>
        </button>

        <button 
          onClick={() => navigate('/dashboard/messages')}
          className={`flex-1 flex flex-col items-center justify-center gap-1 h-full transition group relative ${isActive('/dashboard/messages') ? 'text-primary dark:text-blue-400' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}
        >
          <span className="material-icons-round text-2xl group-active:scale-90 transition-transform">chat_bubble_outline</span>
          <span className="text-[10px] font-medium">{t('nav.messages')}</span>
          {unreadSmsCount > 0 && (
            <span className="absolute top-2 right-4 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center px-1 border border-white dark:border-surface-dark animate-in zoom-in">
              {unreadSmsCount > 99 ? '99+' : unreadSmsCount}
            </span>
          )}
        </button>

        <div className="w-16 flex-shrink-0"></div>

        <button 
          onClick={() => navigate('/dashboard/numbers')}
          className={`flex-1 flex flex-col items-center justify-center gap-1 h-full transition group ${isActive('/dashboard/numbers') ? 'text-primary dark:text-blue-400' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}
        >
          <span className="material-icons-round text-2xl group-active:scale-90 transition-transform">sim_card</span>
          <span className="text-[10px] font-medium">{t('nav.numbers')}</span>
        </button>

        <button 
          onClick={() => navigate('/dashboard/profile')}
          className={`flex-1 flex flex-col items-center justify-center gap-1 h-full transition group relative ${isActive('/dashboard/profile') ? 'text-primary dark:text-blue-400' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}
        >
          <span className="material-icons-round text-2xl group-active:scale-90 transition-transform">person</span>
          <span className="text-[10px] font-medium">{t('nav.profile')}</span>
        </button>
      </div>
    </nav>
  );
};

const DashboardLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark pb-20">
      {children}
      <BottomNav />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <NotificationsProvider>
          <AuthProvider>
            <MessagesProvider>
              <HashRouter>
                <div className="mx-auto max-w-md bg-white dark:bg-background-dark min-h-screen shadow-2xl overflow-hidden relative">
                  <Routes>
                    {/* Public Routes */}
                    <Route path="/" element={<Landing />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    
                    {/* Protected Onboarding Flow */}
                    <Route path="/onboarding/region" element={<ProtectedRoute><RegionSelect /></ProtectedRoute>} />
                    <Route path="/onboarding/plan" element={<ProtectedRoute><PlanSelect /></ProtectedRoute>} />
                    <Route path="/onboarding/summary" element={<ProtectedRoute><Summary /></ProtectedRoute>} />
                    <Route path="/onboarding/payment" element={<ProtectedRoute><Payment /></ProtectedRoute>} />
                    <Route path="/onboarding/processing" element={<ProtectedRoute><Processing /></ProtectedRoute>} />
                    <Route path="/onboarding/success" element={<ProtectedRoute><Success /></ProtectedRoute>} />

                    {/* Protected Dashboard Flow */}
                    <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout><Dashboard /></DashboardLayout></ProtectedRoute>} />
                    <Route path="/dashboard/messages" element={<ProtectedRoute><DashboardLayout><Messages /></DashboardLayout></ProtectedRoute>} />
                    <Route path="/dashboard/numbers" element={<ProtectedRoute><DashboardLayout><MyNumbers /></DashboardLayout></ProtectedRoute>} />
                    <Route path="/dashboard/profile" element={<ProtectedRoute><DashboardLayout><Profile /></DashboardLayout></ProtectedRoute>} />
                    
                    {/* Independient Notification Screen */}
                    <Route path="/dashboard/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
                  </Routes>
                </div>
              </HashRouter>
            </MessagesProvider>
          </AuthProvider>
        </NotificationsProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
};

export default App;
