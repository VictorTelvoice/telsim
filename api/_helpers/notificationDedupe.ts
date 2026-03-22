import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Evita reenvíos duplicados en notification_history (mismo usuario, evento, destinatario en ventana corta).
 * Usar tras soft-cancel + customer.subscription.deleted u otros pares que no comparten stripe_event_id.
 */
export async function hasRecentNotificationDuplicate(
  supabase: SupabaseClient,
  params: {
    userId: string;
    eventName: string;
    recipient: string;
    windowMs: number;
  }
): Promise<boolean> {
  const since = new Date(Date.now() - params.windowMs).toISOString();
  const { data, error } = await supabase
    .from('notification_history')
    .select('id')
    .eq('user_id', params.userId)
    .eq('event_name', params.eventName)
    .eq('recipient', params.recipient)
    .gte('created_at', since)
    .limit(1);
  if (error) return false;
  return (data?.length ?? 0) > 0;
}
