/**
 * Valores estables de onboarding_step en public.users (alineados con rutas /onboarding/*).
 */
export const ONBOARDING_STEPS = {
  REGION: 'region',
  SUMMARY: 'summary',
  PAYMENT: 'payment',
  PROCESSING: 'processing',
  ACTIVATION_SUCCESS: 'activation-success',
  COMPLETED: 'completed',
} as const;

export type OnboardingStepValue = (typeof ONBOARDING_STEPS)[keyof typeof ONBOARDING_STEPS];

const VALID = new Set<string>(Object.values(ONBOARDING_STEPS));

export function isValidOnboardingStep(s: string | null | undefined): boolean {
  return !!s && VALID.has(String(s));
}

export function routeForOnboardingStep(
  step: string,
  checkoutSessionId: string | null | undefined
): { pathname: string; search?: string } | null {
  switch (step) {
    case ONBOARDING_STEPS.REGION:
      return { pathname: '/onboarding/region' };
    case ONBOARDING_STEPS.SUMMARY:
      return { pathname: '/onboarding/summary' };
    case ONBOARDING_STEPS.PAYMENT:
      return { pathname: '/onboarding/payment' };
    case ONBOARDING_STEPS.PROCESSING: {
      if (checkoutSessionId) {
        return {
          pathname: '/onboarding/processing',
          search: `?session_id=${encodeURIComponent(checkoutSessionId)}`,
        };
      }
      return { pathname: '/onboarding/region' };
    }
    case ONBOARDING_STEPS.ACTIVATION_SUCCESS: {
      if (checkoutSessionId) {
        return {
          pathname: '/onboarding/activation-success',
          search: `?session_id=${encodeURIComponent(checkoutSessionId)}`,
        };
      }
      return { pathname: '/onboarding/region' };
    }
    case ONBOARDING_STEPS.COMPLETED:
      return { pathname: '/web' };
    default:
      return null;
  }
}
