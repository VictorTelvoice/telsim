import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

const RESEND_FROM = process.env.RESEND_FROM_EMAIL
  ? `Telsim <${process.env.RESEND_FROM_EMAIL}>`
  : 'Telsim <noreply@telsim.io>';
const CONTACT_TO_EMAIL = process.env.CONTACT_TO_EMAIL || 'support@telsim.io';
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

function parseClientIp(req: any): string | null {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }
  const realIp = req.headers['x-real-ip'];
  return typeof realIp === 'string' && realIp.trim() ? realIp.trim() : null;
}

function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const name = String(req.body?.name || '').trim();
  const company = String(req.body?.company || '').trim();
  const email = String(req.body?.email || '').trim().toLowerCase();
  const message = String(req.body?.message || '').trim();
  const language = String(req.body?.language || 'es').trim() === 'en' ? 'en' : 'es';

  if (name.length < 2) {
    return res.status(400).json({ error: 'Ingresa un nombre válido.' });
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Ingresa un email válido.' });
  }
  if (message.length < 10) {
    return res.status(400).json({ error: 'Cuéntanos un poco más para poder ayudarte.' });
  }
  if (name.length > 120 || company.length > 160 || email.length > 180 || message.length > 4000) {
    return res.status(400).json({ error: 'El mensaje es demasiado largo.' });
  }

  const metadata = {
    ip: parseClientIp(req),
    user_agent: typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : null,
    referer: typeof req.headers.referer === 'string' ? req.headers.referer : null,
  };

  try {
    const { data: lead, error: insertError } = await supabaseAdmin
      .from('contact_leads')
      .insert({
        name,
        company: company || null,
        email,
        message,
        source: 'landing',
        language,
        metadata,
      })
      .select('id')
      .single();

    if (insertError || !lead?.id) {
      console.error('[CONTACT] lead insert error', insertError);
      return res.status(500).json({ error: 'No pudimos registrar tu mensaje. Intenta nuevamente.' });
    }

    const subject = `[Landing] Nuevo contacto de ${name}`;
    const html = `
      <div style="font-family:Arial,Helvetica,sans-serif;background:#f8fafc;padding:24px;color:#0f172a;">
        <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:20px;overflow:hidden;">
          <div style="padding:24px 28px;background:linear-gradient(135deg,#0f172a 0%,#1d4ed8 100%);color:#ffffff;">
            <div style="font-size:12px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;opacity:.75;">Nuevo contacto</div>
            <div style="font-size:28px;font-weight:800;margin-top:8px;">Lead desde el landing de Telsim</div>
          </div>
          <div style="padding:28px;">
            <div style="margin-bottom:20px;padding:18px;border-radius:16px;background:#f8fafc;border:1px solid #e2e8f0;">
              <div style="font-size:12px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:.12em;margin-bottom:10px;">Resumen</div>
              <div style="display:grid;grid-template-columns:140px 1fr;gap:8px 12px;font-size:14px;line-height:1.5;">
                <div style="color:#64748b;font-weight:700;">Nombre</div><div>${escapeHtml(name)}</div>
                <div style="color:#64748b;font-weight:700;">Empresa</div><div>${escapeHtml(company || 'No informada')}</div>
                <div style="color:#64748b;font-weight:700;">Email</div><div>${escapeHtml(email)}</div>
                <div style="color:#64748b;font-weight:700;">Idioma</div><div>${language === 'en' ? 'English' : 'Español'}</div>
              </div>
            </div>
            <div style="font-size:12px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:.12em;margin-bottom:10px;">Mensaje</div>
            <div style="padding:18px;border-radius:16px;background:#ffffff;border:1px solid #e2e8f0;font-size:15px;line-height:1.7;white-space:pre-wrap;">${escapeHtml(message)}</div>
          </div>
        </div>
      </div>
    `;

    const sendEmailRes = await fetch(`${SUPABASE_URL.replace(/\/$/, '')}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        event: 'scheduled_event',
        to_email: CONTACT_TO_EMAIL,
        language,
        from: RESEND_FROM,
        subject,
        html_body: html,
        reply_to: email,
        data: {
          lead_name: name,
          company,
          email,
        },
      }),
    });

    const sendEmailJson = await sendEmailRes.json().catch(() => null);

    if (!sendEmailRes.ok) {
      await supabaseAdmin
        .from('contact_leads')
        .update({
          last_error:
            typeof sendEmailJson?.error === 'string'
              ? sendEmailJson.error
              : typeof sendEmailJson?.message === 'string'
                ? sendEmailJson.message
                : `send_email_${sendEmailRes.status}`,
        })
        .eq('id', lead.id);

      console.error('[CONTACT] send-email error', sendEmailJson || sendEmailRes.statusText);
      return res.status(502).json({
        error: 'Recibimos tu mensaje, pero no pudimos enviarlo al equipo. Intenta nuevamente en unos minutos.',
      });
    }

    await supabaseAdmin
      .from('contact_leads')
      .update({
        resend_email_id: typeof sendEmailJson?.id === 'string' ? sendEmailJson.id : null,
        email_sent_at: new Date().toISOString(),
        last_error: null,
      })
      .eq('id', lead.id);

    return res.status(200).json({
      ok: true,
      message:
        language === 'en'
          ? 'Your message has been sent. Our team will reply shortly.'
          : 'Tu mensaje fue enviado. Nuestro equipo te responderá pronto.',
    });
  } catch (error: any) {
    console.error('[CONTACT] unexpected error', error);
    return res.status(500).json({
      error: 'No pudimos procesar tu solicitud en este momento.',
    });
  }
}
