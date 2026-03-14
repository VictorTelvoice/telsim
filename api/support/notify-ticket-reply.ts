/**
 * TELSIM · POST /api/support/notify-ticket-reply
 *
 * Envía una notificación por Telegram al cliente cuando un agente responde su ticket.
 * Solo puede ser llamado por el admin (UID verificado con el JWT).
 */
import { createClient } from '@supabase/supabase-js';

const ADMIN_UID = '8e7bcada-3f7a-482f-93a7-9d0fd4828231';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace(/^Bearer\s+/i, '');
    if (!token) {
      return res.status(401).json({ error: 'No autorizado.' });
    }

    const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
    if (!anonKey) {
      return res.status(500).json({ error: 'Configuración de auth faltante.' });
    }
    const supabaseAuth = createClient(process.env.SUPABASE_URL!, anonKey, { global: { fetch: fetch } });
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !user || user.id !== ADMIN_UID) {
      return res.status(403).json({ error: 'Solo el administrador puede enviar esta notificación.' });
    }

    const { ticket_id: ticketId } = req.body;
    if (!ticketId) {
      return res.status(400).json({ error: 'Se requiere ticket_id.' });
    }

    const { data: ticket, error: ticketError } = await supabaseAdmin
      .from('support_tickets')
      .select('user_id')
      .eq('id', ticketId)
      .single();

    if (ticketError || !ticket) {
      return res.status(404).json({ error: 'Ticket no encontrado.' });
    }

    const userId = (ticket as { user_id: string }).user_id;
    const { data: userRow, error: userError } = await supabaseAdmin
      .from('users')
      .select('telegram_token, telegram_chat_id')
      .eq('id', userId)
      .maybeSingle();

    if (userError || !userRow?.telegram_token?.trim() || !userRow?.telegram_chat_id?.trim()) {
      return res.status(200).json({ ok: true, notified: false, reason: 'Telegram no configurado' });
    }

    const message = '🔔 *Tu ticket de soporte ha sido respondido por un agente.*\n\nRevisa tu panel.';
    const tgRes = await fetch(`https://api.telegram.org/bot${userRow.telegram_token.trim()}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: userRow.telegram_chat_id.trim(),
        text: message,
        parse_mode: 'Markdown',
      }),
    });

    if (!tgRes.ok) {
      const errBody = await tgRes.json().catch(() => ({}));
      console.warn('[notify-ticket-reply] Telegram error:', errBody?.description || tgRes.statusText);
      return res.status(200).json({ ok: true, notified: false, reason: 'Error enviando a Telegram' });
    }

    return res.status(200).json({ ok: true, notified: true });
  } catch (err: any) {
    console.error('[notify-ticket-reply]', err?.message);
    return res.status(500).json({ error: err?.message || 'Error interno.' });
  }
}
