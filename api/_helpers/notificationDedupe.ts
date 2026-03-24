import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Evita reenvíos duplicados en notification_history.
 * Si `channel` se omite, se considera duplicado si existe cualquier fila con mismo user/event/recipient (comportamiento legacy).
 * Si `channel` es 'email' | 'telegram', solo compara filas de ese canal (mismo recipient que el envío real).
 */
export async function hasRecentNotificationDuplicate(
  supabase: SupabaseClient,
  params: {
    userId: string;
    eventName: string;
    recipient: string;
    windowMs: number;
    channel?: 'email' | 'telegram' | 'sms_product';
  }
): Promise<boolean> {
  const since = new Date(Date.now() - params.windowMs).toISOString();
  let q = supabase
    .from('notification_history')
    .select('id')
    .eq('user_id', params.userId)
    .eq('event_name', params.eventName)
    .eq('recipient', params.recipient)
    .gte('created_at', since)
    .limit(1);
  if (params.channel) {
    q = q.eq('type', params.channel);
  }
  const { data, error } = await q;
  if (error) return false;
  return (data?.length ?? 0) > 0;
}

/** In-app: misma clave canónica que `source_notification_key` en createNotification. */
export async function hasRecentAppNotificationDuplicate(
  supabase: SupabaseClient,
  params: { userId: string; sourceNotificationKey: string; windowMs: number }
): Promise<boolean> {
  const since = new Date(Date.now() - params.windowMs).toISOString();
  const { data, error } = await supabase
    .from('notifications')
    .select('id')
    .eq('user_id', params.userId)
    .eq('source_notification_key', params.sourceNotificationKey)
    .gte('created_at', since)
    .limit(1);
  if (error) return false;
  return (data?.length ?? 0) > 0;
}
