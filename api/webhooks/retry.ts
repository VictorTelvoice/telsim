/**
 * TELSIM · POST /api/webhooks/retry
 *
 * Reintenta el envío de un log de automation_logs:
 * - Recupera payload y destino (Telegram desde payload o URL desde user).
 * - Hace POST de nuevo a esa URL / Telegram.
 * - Actualiza el registro con el nuevo status y response_body.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

const ADMIN_UIDS = [
  '8e7bcada-3f7a-482f-93a7-9d0fd4828231',
  'd310eaf8-2c82-4c29-9ea8-6d64616774da',
];

function isAdminUid(uid: string | null | undefined): boolean {
  return ADMIN_UIDS.some((adminUid) => adminUid.toLowerCase() === String(uid || '').toLowerCase());
}

async function getRequester(req: any) {
  const authHeader = req.headers?.authorization || req.headers?.Authorization;
  const token = typeof authHeader === 'string' ? authHeader.replace(/^Bearer\s+/i, '') : '';
  if (!token) return null;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const url = process.env.SUPABASE_URL || '';
  if (!anonKey || !url) return null;
  const supabaseAuth = createClient(url, anonKey, { global: { fetch } });
  const { data, error } = await supabaseAuth.auth.getUser(token);
  if (error || !data?.user?.id) return null;
  return data.user;
}

function isTelegramPayload(p: Record<string, unknown>): boolean {
  return typeof p?.token === 'string' && (typeof p?.chat_id === 'string' || typeof p?.chat_id === 'number');
}

function buildTelegramMessage(p: Record<string, unknown>): string {
  const escapeHtml = (s: string) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const sender = escapeHtml(String(p.sender ?? p.from ?? ''));
  const code = escapeHtml(String(p.code ?? p.verification_code ?? '---'));
  const content = escapeHtml(String(p.text ?? p.content ?? ''));
  return `<b>📩 NUEVO SMS RECIBIDO</b>
━━━━━━━━━━━━━━━━━━
<b>📱 De:</b> <code>${sender}</code>
<b>🔑 Código OTP:</b> <code>${code}</code>
<b>💬 Mensaje:</b>
<blockquote>${content}</blockquote>
<i>📡 Enviado vía Telsim</i>`;
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const requester = await getRequester(req);
  if (!requester) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const isAdmin = isAdminUid(requester.id);

  try {
    const { log_id, userId } = req.body || {};
    const logId = typeof log_id === 'string' ? log_id.trim() : '';
    const uid = typeof userId === 'string' ? userId.trim() : '';

    if (!logId || !uid) {
      return res.status(400).json({ error: 'Missing log_id or userId' });
    }

    const { data: log, error: fetchError } = await supabaseAdmin
      .from('automation_logs')
      .select('id, user_id, slot_id, status, payload')
      .eq('id', logId)
      .single();

    if (fetchError || !log) {
      return res.status(404).json({ error: 'Log not found' });
    }

    if (!isAdmin && requester.id !== uid) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (log.user_id !== uid) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const payload = (log.payload as Record<string, unknown>) || {};
    let targetUrl: string;
    let body: string;
    let headers: Record<string, string> = { 'Content-Type': 'application/json' };

    if (isTelegramPayload(payload)) {
      const token = String(payload.token);
      targetUrl = `https://api.telegram.org/bot${token}/sendMessage`;
      const text = buildTelegramMessage(payload);
      const chatId = payload.chat_id;
      body = JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' });
    } else {
      const { data: userRow } = await supabaseAdmin
        .from('users')
        .select('user_webhook_url')
        .eq('id', uid)
        .single();

      const webhookUrl = (userRow as { user_webhook_url?: string } | null)?.user_webhook_url?.trim();
      if (!webhookUrl) {
        return res.status(400).json({ error: 'No webhook URL configured for this user' });
      }
      targetUrl = webhookUrl;
      body = JSON.stringify(payload);
    }

    const fetchRes = await fetch(targetUrl, {
      method: 'POST',
      headers,
      body,
    });

    const responseText = await fetchRes.text();
    let responseBody: unknown;
    try {
      responseBody = JSON.parse(responseText);
    } catch {
      responseBody = responseText || null;
    }

    const newStatus = String(fetchRes.status);

    const updatePayload: Record<string, unknown> = { status: newStatus };
    try {
      const { error: updateError } = await supabaseAdmin
        .from('automation_logs')
        .update(updatePayload)
        .eq('id', logId);

      if (updateError) {
        console.error('[WEBHOOK RETRY] Update log failed:', updateError.message);
      }
    } catch (e) {
      console.error('[WEBHOOK RETRY] Update log error:', e);
    }

    return res.status(200).json({
      success: true,
      status: newStatus,
      response_body: responseBody,
    });
  } catch (err: any) {
    console.error('[WEBHOOK RETRY]', err?.message);
    return res.status(500).json({ error: err?.message || 'Retry failed' });
  }
}
