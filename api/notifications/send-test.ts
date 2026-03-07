/**
 * TELSIM · POST /api/notifications/send-test
 *
 * Envía un mensaje de prueba a Telegram usando telegram_token y telegram_chat_id
 * de la tabla users. Formato HTML Premium (mismo que telegram-forwarder).
 */
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const TEST_PAYLOAD = {
  sender: 'Telsim Support',
  verification_code: '999999',
  content: '¡Felicidades! Tu sistema de notificaciones de Telsim está configurado correctamente.',
};

function escapeHtml(s: string) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'Se requiere userId.', code: 'MISSING_USER' });
    }

    const { data: userRow, error: userError } = await supabaseAdmin
      .from('users')
      .select('telegram_token, telegram_chat_id')
      .eq('id', userId)
      .maybeSingle();

    if (userError || !userRow) {
      return res.status(400).json({ error: 'Usuario no encontrado.', code: 'USER_NOT_FOUND' });
    }

    const token = userRow?.telegram_token;
    const chatId = userRow?.telegram_chat_id;

    if (!token || !chatId) {
      return res.status(400).json({
        error: 'Configura tu Bot de Telegram en Ajustes → Telegram Bot para enviar notificaciones de prueba.',
        code: 'TELEGRAM_NOT_CONFIGURED',
      });
    }

    const safeSender = escapeHtml(TEST_PAYLOAD.sender);
    const safeCode = escapeHtml(TEST_PAYLOAD.verification_code);
    const safeContent = escapeHtml(TEST_PAYLOAD.content);

    const message = `<b>📩 NUEVO SMS RECIBIDO</b>
━━━━━━━━━━━━━━━━━━
<b>📱 De:</b> <code>${safeSender}</code>
<b>🔑 Código OTP:</b> <code>${safeCode}</code>
<b>💬 Mensaje:</b>
<blockquote>${safeContent}</blockquote>
<i>📡 Enviado vía Telsim</i>`;

    const tgRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
      }),
    });

    const result = await tgRes.json();
    if (!tgRes.ok) {
      return res.status(400).json({
        error: result.description || 'Error al enviar el mensaje a Telegram.',
        code: 'TELEGRAM_ERROR',
      });
    }

    return res.status(200).json({ ok: true });
  } catch (err: any) {
    console.error('[SEND-TEST NOTIFICATION]', err?.message);
    return res.status(500).json({ error: err?.message || 'Error interno.' });
  }
}
