import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import {
  isValidOnboardingStep,
  ONBOARDING_STEPS,
  routeForOnboardingStep,
} from '../../lib/onboardingSteps';

const AuthCallback: React.FC = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [timedOut, setTimedOut] = React.useState(false);
  const [resolving, setResolving] = React.useState(false);
  const resolveStartedForUserRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    resolveStartedForUserRef.current = null;
  }, [user?.id]);

  React.useEffect(() => {
    if (loading || !user) return;

    const t = window.setTimeout(() => setTimedOut(true), 6000);
    return () => window.clearTimeout(t);
  }, [user, loading]);

  React.useEffect(() => {
    if (loading || !user) return;
    if (resolveStartedForUserRef.current === user.id) return;
    resolveStartedForUserRef.current = user.id;
    let cancelled = false;

    const resolveRoute = async () => {
      setResolving(true);
      try {
        const redirect = localStorage.getItem('post_login_redirect');
        if (redirect) {
          localStorage.removeItem('post_login_redirect');
          const plan = localStorage.getItem('selected_plan') || 'pro';
          const billing = localStorage.getItem('selected_billing') || 'monthly';
          localStorage.setItem('selected_plan_annual', billing === 'annual' ? 'true' : 'false');
          if (!cancelled) navigate(`${redirect}?plan=${plan}&billing=${billing}`, { replace: true });
          return;
        }

        // Registro/login rápido con Google: asegurar fila en public.users.
        const fullName =
          user?.user_metadata?.full_name ||
          user?.user_metadata?.name ||
          user?.email?.split('@')?.[0] ||
          null;
        const avatarFromAuth =
          user?.user_metadata?.avatar_url ||
          user?.user_metadata?.picture ||
          user?.avatar_url ||
          null;

        await supabase.from('users').upsert(
          {
            id: user.id,
            email: user.email,
            nombre: fullName,
            avatar_url: avatarFromAuth,
          },
          { onConflict: 'id', ignoreDuplicates: false }
        );

        const { data: profileRow } = await supabase
          .from('users')
          .select('onboarding_completed, onboarding_step, onboarding_checkout_session_id')
          .eq('id', user.id)
          .maybeSingle();

        // onboarding_completed gana sobre step desfasado o nulo
        const onboardingCompleted = !!profileRow?.onboarding_completed;
        if (onboardingCompleted) {
          if (!cancelled) navigate('/web', { replace: true });
          return;
        }

        const stepRawEarly = profileRow?.onboarding_step ?? null;
        if (stepRawEarly === ONBOARDING_STEPS.COMPLETED) {
          await supabase
            .from('users')
            .update({ onboarding_completed: true, onboarding_checkout_session_id: null })
            .eq('id', user.id);
          if (!cancelled) navigate('/web', { replace: true });
          return;
        }

        // Compatibilidad con usuarios históricos: si ya tiene suscripciones, lo marcamos completo.
        const { data: existingSub } = await supabase
          .from('subscriptions')
          .select('id')
          .eq('user_id', user.id)
          .limit(1)
          .maybeSingle();

        if (existingSub?.id) {
          await supabase
            .from('users')
            .update({
              onboarding_completed: true,
              onboarding_step: ONBOARDING_STEPS.COMPLETED,
              onboarding_checkout_session_id: null,
            })
            .eq('id', user.id);
          if (!cancelled) navigate('/web', { replace: true });
          return;
        }

        const stepRaw = profileRow?.onboarding_step ?? null;
        const checkoutSessionId = profileRow?.onboarding_checkout_session_id ?? null;

        if (isValidOnboardingStep(stepRaw)) {
          const route = routeForOnboardingStep(String(stepRaw), checkoutSessionId);
          if (route) {
            if (!cancelled) {
              navigate(
                { pathname: route.pathname, search: route.search || '' },
                { replace: true }
              );
            }
            return;
          }
        }

        if (!cancelled) navigate('/onboarding/region', { replace: true });
      } catch {
        if (!cancelled) navigate('/onboarding/region', { replace: true });
      } finally {
        if (!cancelled) setResolving(false);
      }
    };

    void resolveRoute();
    return () => {
      cancelled = true;
    };
  }, [user, loading, navigate]);

  if (loading || resolving || !timedOut) {
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
