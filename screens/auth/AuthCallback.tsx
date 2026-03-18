import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const isMobileDevice = (): boolean =>
  /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

const AuthCallback: React.FC = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [timedOut, setTimedOut] = React.useState(false);

  React.useEffect(() => {
    if (loading) return;

    if (user) {
      const redirect = localStorage.getItem('post_login_redirect');

      if (redirect) {
        localStorage.removeItem('post_login_redirect');
        const plan = localStorage.getItem('selected_plan') || 'pro';
        const billing = localStorage.getItem('selected_billing') || 'monthly';
        localStorage.setItem('selected_plan_annual', billing === 'annual' ? 'true' : 'false');

        navigate(`${redirect}?plan=${plan}&billing=${billing}`, { replace: true });
        return;
      }

      const dest = isMobileDevice() ? '/dashboard' : '/web';
      navigate(dest, { replace: true });
      return;
    }

    const t = window.setTimeout(() => setTimedOut(true), 6000);
    return () => window.clearTimeout(t);
  }, [user, loading, navigate]);

  if (loading || !timedOut) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-400">Iniciando sesión...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-950">
      <div className="flex flex-col items-center gap-4">
        <p className="text-xs font-semibold text-slate-400">
          No pudimos completar el inicio de sesión.
        </p>
        <button
          type="button"
          onClick={() => navigate('/login', { replace: true })}
          className="h-10 px-4 rounded-xl bg-primary text-white text-xs font-bold"
        >
          Volver a Login
        </button>
      </div>
    </div>
  );
};

export default AuthCallback;
