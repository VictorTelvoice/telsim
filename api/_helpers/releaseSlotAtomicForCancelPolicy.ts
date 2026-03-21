import { type SupabaseClient } from '@supabase/supabase-js';

/**
 * Cliente Supabase sin `Database` generado: permite `rpc('release_slot_atomic', …)`.
 * `ReturnType<typeof createClient>` sin genéricos infiere `rpc` con args `never` / `undefined`.
 */
export type SupabaseAdminForRpc = SupabaseClient<any, 'public', 'public'>;

/**
 * Única política de liberación de número en servidor (RPC `release_slot_atomic`).
 * Usar desde `case 'cancel'` en manage, webhooks u otros handlers server-side alineados.
 */
export async function releaseSlotAtomicForCancelPolicy(client: SupabaseAdminForRpc, p_slot_id: string) {
  return client.rpc('release_slot_atomic', { p_slot_id });
}
