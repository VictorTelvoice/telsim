import crypto from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';

const CANCEL_EVENT = 'cancellation';
const TEMPLATE_EMAIL = `template_email_${CANCEL_EVENT}`;

function replaceVariables(text: string, data: Record<string, unknown>): string {
  let out = text;
  for (const [key, value] of Object.entries(data)) {
    const val = value != null ? String(value) : '';
    out = out.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), val);
  }
  return out;
}

/** Reserva 48h desde slot ocupado (soft cancel): token en slots, sin pasar por libre. */
export async function reserveSlotSoftCancel(
  supabaseAdmin: SupabaseClient,
  params: { slotId: string; userId: string }
): Promise<{ token: string | null; expiresAt: string | null }> {
  const token = crypto.randomBytes(16).toString('hex');
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabaseAdmin
    .from('slots')
    .update({
      status: 'reserved',
      reservation_token: token,
      reservation_expires_at: expiresAt,
      reservation_user_id: params.userId,
      reservation_stripe_session_id: null,
      assigned_to: null,
      plan_type: null,
      label: null,
      forwarding_active: false,
    })
    .eq('slot_id', params.slotId)
    .eq('status', 'ocupado')
    .select('reservation_token, reservation_expires_at')
    .maybeSingle();

  if (error) {
    console.error('[soft-cancel] slot reservation update failed', error);
    return { token: null, expiresAt: null };
  }
  if (!data) {
    console.error('[soft-cancel] slot no actualizado (¿no estaba ocupado?)', { slot_id: params.slotId });
    return { token: null, expiresAt: null };
  }
  return { token, expiresAt };
}

/**
 * Envío del correo canónico de cancelación desde manage (mismo contrato que api/webhooks/stripe triggerEmail).
 */
export async function sendCancellationEmailFromManage(
  supabaseAdmin: SupabaseClient,
  params: { userId: string; cancellationPayload: Record<string, unknown> }
): Promise<void> {
  const { data: row } = await supabaseAdmin
    .from('admin_settings')
    .select('content, subject')
    .eq('id', TEMPLATE_EMAIL)
    .maybeSingle();
  const r = row as { content?: string | null; subject?: string | null } | null;
  const contentRaw = r?.content != null && String(r.content).trim() !== '' ? String(r.content).trim() : null;
  const subjectRaw = r?.subject != null && String(r.subject).trim() !== '' ? String(r.subject).trim() : null;

  let bodyOverride =
    contentRaw != null
      ? replaceVariables(contentRaw, params.cancellationPayload)
      : `<p>Hola <strong>${params.cancellationPayload.nombre ?? 'Cliente'}</strong>,</p><p>Tu suscripción <strong>${params.cancellationPayload.plan ?? ''}</strong> quedó en periodo de reactivación (48 h).</p>`;

  let subjectResolved =
    subjectRaw != null
      ? replaceVariables(subjectRaw, params.cancellationPayload)
      : `[Telsim] Aviso de baja: SIM ${params.cancellationPayload.phone_number ?? ''}.`;

  let email =
    (params.cancellationPayload.to_email as string) ||
    (params.cancellationPayload.email as string) ||
    undefined;
  if (!email) {
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('email')
      .eq('id', params.userId)
      .maybeSingle();
    email = userData?.email ?? undefined;
  }
  if (!email) return;

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return;

  const res = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${serviceKey}` },
    body: JSON.stringify({
      event: CANCEL_EVENT,
      user_id: params.userId,
      to_email: email,
      data: params.cancellationPayload,
      template_id: TEMPLATE_EMAIL,
      content: bodyOverride,
      subject: subjectResolved,
    }),
  });
  await res.json().catch(() => ({}));
  /** Historial: un solo registro en la Edge send-email (evitar duplicar con el caller). */
}
