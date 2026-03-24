import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Suscripciones que mantienen la línea asignada al usuario (no liberar slot al cerrar otra suscripción Stripe).
 */
export const LIVE_SUBSCRIPTION_STATUSES_FOR_SLOT_HOLD: readonly string[] = [
  'active',
  'trialing',
  'past_due',
  'pending_reactivation_cancel',
];

/** Variantes para matchear `phone_number` en BD. */
export function phoneNumberVariantsForSubscriptionQuery(raw: string | null | undefined): string[] {
  const t = String(raw ?? '').trim();
  if (!t) return [];
  const digits = t.replace(/\D/g, '');
  const out = new Set<string>();
  out.add(t);
  if (digits) {
    out.add(digits);
    out.add(`+${digits}`);
  }
  return [...out];
}

/**
 * Si existe otra fila “viva” para el mismo slot o número, con otro `stripe_subscription_id`,
 * no se debe liberar ni reservar el slot (p. ej. upgrade: nueva sub ya creada, vieja en deleted).
 */
export async function findOtherLiveSubscriptionExcludingStripeId(
  supabase: SupabaseClient,
  params: {
    slotId: string | null | undefined;
    phoneNumber: string | null | undefined;
    excludeStripeSubscriptionId: string;
  }
): Promise<{ id: string; stripe_subscription_id: string | null } | null> {
  const ex = String(params.excludeStripeSubscriptionId ?? '').trim();
  if (!ex) return null;

  const slotId = params.slotId ? String(params.slotId).trim() : '';
  if (slotId) {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('id, stripe_subscription_id')
      .eq('slot_id', slotId)
      .in('status', [...LIVE_SUBSCRIPTION_STATUSES_FOR_SLOT_HOLD])
      .neq('stripe_subscription_id', ex)
      .limit(1)
      .maybeSingle();
    if (error) {
      console.warn('[SLOT_GUARD] findOtherLive by slot_id failed', error.message);
    } else if (data?.id) {
      return data as { id: string; stripe_subscription_id: string | null };
    }
  }

  const variants = phoneNumberVariantsForSubscriptionQuery(params.phoneNumber);
  for (const v of variants) {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('id, stripe_subscription_id')
      .eq('phone_number', v)
      .in('status', [...LIVE_SUBSCRIPTION_STATUSES_FOR_SLOT_HOLD])
      .neq('stripe_subscription_id', ex)
      .limit(1)
      .maybeSingle();
    if (error) {
      console.warn('[SLOT_GUARD] findOtherLive by phone failed', error.message);
      continue;
    }
    if (data?.id) {
      return data as { id: string; stripe_subscription_id: string | null };
    }
  }

  return null;
}
