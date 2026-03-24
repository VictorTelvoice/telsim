import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import {
  isValidOnboardingStep,
  ONBOARDING_STEPS,
  routeForOnboardingStep,
} from '../../lib/onboardingSteps';
import { getPostAuthRoute } from '../../lib/routing';

const AUTH_CALLBACK_RESOLVE_MS = 14_000;
const AUTH_CALLBACK_NO_SESSION_MS = 12_000;

function logAuthCallback(stage: string, payload?: Record<string, unknown>) {
  if (payload) {
    console.warn(`[AuthCallback] ${stage}`, payload);
  } else {
    console.warn(`[AuthCallback] ${stage}`);
  }
}

/** PostgREST: columnas ausentes suelen devolver 400 con "does not exist" / "schema cache". */
function logIfUsersOnboardingColumnsMissing(
  context: string,
  err: { message?: string | null; details?: string | null; hint?: string | null }
) {
  const blob = `${err.message ?? ''} ${err.details ?? ''} ${err.hint ?? ''}`;
  if (!/does not exist|schema cache|could not find.*column/i.test(blob)) return;
  console.error(
    `[${context}] DIAGNÓSTICO: faltan columnas de onboarding en public.users. ` +
      'Aplicar SQL idempotente: docs/sql/production_public_users_onboarding_columns.sql\n' +
      '  (equivale a migraciones 20260320000002_users_onboarding_completed + 20260321000000_users_onboarding_step)'
  );
}

const AuthCallback: React.FC = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const userRef = React.useRef(user);
  userRef.current = user;
  const [resolving, setResolving] = React.useState(false);
  const [noSessionYet, setNoSessionYet] = React.useState(false);

  /** Sin sesión tras OAuth: timeout para no quedar en spinner eterno */
  React.useEffect(() => {
    if (loading) return;
    if (user) {
      setNoSessionYet(false);
      return;
    }
    const t = window.setTimeout(() => setNoSessionYet(true), AUTH_CALLBACK_NO_SESSION_MS);
    return () => window.clearTimeout(t);
  }, [loading, user]);

  /**
   * Resolución post-login: nunca debe colgarse indefinidamente.
   * - Cleanup (Strict Mode / cambio de ruta) siempre baja `resolving`.
   * - Timeout duro fuerza fallback si algo quedara colgado.
   *
   * Bug histórico corregido: `resolveStartedForUserRef` + `if (!cancelled) setResolving(false)`
   * + condición `!timedOut` dejaba `resolving` en true y bloqueaba re-ejecución en Strict Mode.
   */
  React.useEffect(() => {
    if (loading || !userRef.current?.id) return;

    let cancelled = false;
    let resolveTimer: number | undefined;
    const u = userRef.current;
    if (!u?.id) return;

    const finishResolving = () => {
      if (!cancelled) setResolving(false);
    };

    const safeNavigate = (to: string, replace = true) => {
      if (cancelled) return;
      try {
        navigate(to, { replace });
      } catch (e) {
        logAuthCallback('navigate failed', { to, error: String(e) });
        const hashPath = to.startsWith('/') ? to : `/${to}`;
        window.location.hash = `#${hashPath}`;
      }
    };

    const run = async () => {
      setResolving(true);
      resolveTimer = window.setTimeout(() => {
        if (cancelled) return;
        logAuthCallback(`resolve exceeded ${AUTH_CALLBACK_RESOLVE_MS}ms — fallback /onboarding/region`);
        finishResolving();
        safeNavigate('/onboarding/region');
      }, AUTH_CALLBACK_RESOLVE_MS);

      try {
        const redirect = localStorage.getItem('post_login_redirect');
        if (redirect) {
          localStorage.removeItem('post_login_redirect');
          const plan = localStorage.getItem('selected_plan') || 'pro';
          const billing = localStorage.getItem('selected_billing') || 'monthly';
          localStorage.setItem('selected_plan_annual', billing === 'annual' ? 'true' : 'false');
          safeNavigate(`${redirect}?plan=${plan}&billing=${billing}`);
          return;
        }

        const fullName =
          u.user_metadata?.full_name ||
          u.user_metadata?.name ||
          u.email?.split('@')?.[0] ||
          null;
        const avatarFromAuth =
          u.user_metadata?.avatar_url ||
          u.user_metadata?.picture ||
          u.avatar_url ||
          null;

        // Regla de prioridad:
        // - Si el usuario ya tiene foto manual guardada (supabase.co) en `public.users.avatar_url`,
        //   NO sobrescribirla con el avatar nuevo de Google durante el login.
        // - Si no existe foto manual, guardar el avatar que venga de auth.
        const { data: existingUserForAvatar } = await supabase
          .from('users')
          .select('avatar_url')
          .eq('id', u.id)
          .maybeSingle();
        const existingAvatarUrl = (existingUserForAvatar?.avatar_url ?? null) as string | null;

        const hasSupabaseAvatar =
          existingAvatarUrl != null && existingAvatarUrl !== '' && existingAvatarUrl.includes('supabase.co');
        const isGoogleAvatar =
          avatarFromAuth != null &&
          (avatarFromAuth.includes('google') || avatarFromAuth.includes('googleusercontent'));

        const avatarToSave =
          // preservar manual si el nuevo viene de Google
          hasSupabaseAvatar && isGoogleAvatar
            ? existingAvatarUrl
            : avatarFromAuth ?? existingAvatarUrl;

        const { error: upsertErr } = await supabase.from('users').upsert(
          {
            id: u.id,
            email: u.email,
            nombre: fullName,
            avatar_url: avatarToSave,
          },
          { onConflict: 'id', ignoreDuplicates: false }
        );

        if (upsertErr) {
          logIfUsersOnboardingColumnsMissing('AuthCallback', upsertErr);
          logAuthCallback('public.users upsert failed (auth OK — continuar con rutas seguras)', {
            code: upsertErr.code,
            message: upsertErr.message,
            details: upsertErr.details,
            hint: upsertErr.hint,
          });
        }

        const {
          data: profileRow,
          error: profileErr,
        } = await supabase
          .from('users')
          .select('onboarding_completed, onboarding_step, onboarding_checkout_session_id')
          .eq('id', u.id)
          .maybeSingle();

        let effectiveProfile = profileRow;

        if (profileErr) {
          logIfUsersOnboardingColumnsMissing('AuthCallback', profileErr);
          logAuthCallback('public.users profile select failed (400 suele ser columnas, RLS o migración pendiente)', {
            code: profileErr.code,
            message: profileErr.message,
            details: profileErr.details,
          });
          const fallback = await supabase.from('users').select('id').eq('id', u.id).maybeSingle();
          if (fallback.error) {
            logAuthCallback('public.users minimal select also failed', {
              code: fallback.error.code,
              message: fallback.error.message,
            });
          }
          effectiveProfile = null;
        }

        const onboardingCompleted = !!effectiveProfile?.onboarding_completed;
        if (onboardingCompleted) {
          safeNavigate(getPostAuthRoute());
          return;
        }

        const stepRawEarly = effectiveProfile?.onboarding_step ?? null;
        if (stepRawEarly === ONBOARDING_STEPS.COMPLETED) {
          const { error: patchErr } = await supabase
            .from('users')
            .update({ onboarding_completed: true, onboarding_checkout_session_id: null })
            .eq('id', u.id);
          if (patchErr) {
            logIfUsersOnboardingColumnsMissing('AuthCallback', patchErr);
            logAuthCallback('users update COMPLETED→done failed', { message: patchErr.message });
          }
          safeNavigate(getPostAuthRoute());
          return;
        }

        const { data: existingSub } = await supabase
          .from('subscriptions')
          .select('id')
          .eq('user_id', u.id)
          .limit(1)
          .maybeSingle();

        if (existingSub?.id) {
          const { error: subPatchErr } = await supabase
            .from('users')
            .update({
              onboarding_completed: true,
              onboarding_step: ONBOARDING_STEPS.COMPLETED,
              onboarding_checkout_session_id: null,
            })
            .eq('id', u.id);
          if (subPatchErr) {
            logIfUsersOnboardingColumnsMissing('AuthCallback', subPatchErr);
            logAuthCallback('users update from existing subscription failed', { message: subPatchErr.message });
          }
          safeNavigate(getPostAuthRoute());
          return;
        }

        const stepRaw = effectiveProfile?.onboarding_step ?? null;
        const checkoutSessionId = effectiveProfile?.onboarding_checkout_session_id ?? null;

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

        safeNavigate('/onboarding/region');
      } catch (e) {
        console.error('[AuthCallback] unhandled error', e);
        safeNavigate('/onboarding/region');
      } finally {
        if (resolveTimer != null) window.clearTimeout(resolveTimer);
        finishResolving();
      }
    };

    void run();

    return () => {
      cancelled = true;
      if (resolveTimer != null) window.clearTimeout(resolveTimer);
      setResolving(false);
    };
  }, [loading, navigate, user?.id]);

  const showSpinner = loading || (!!user && resolving);

  if (showSpinner) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-400">Iniciando sesión...</p>
        </div>
      </div>
    );
  }

  if (!loading && !user && noSessionYet) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-950 px-4">
        <div className="flex flex-col items-center gap-4 max-w-sm text-center">
          <p className="text-xs font-semibold text-slate-400">
            No recibimos la sesión desde Google. Revisa la consola (red / Supabase) o vuelve a intentarlo.
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
  }

  if (!loading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-400">Conectando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-950">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-semibold text-slate-400">Redirigiendo...</p>
      </div>
    </div>
  );
};

export default AuthCallback;
