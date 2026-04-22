// lib/sendEmail.ts
// Helper para invocar la Edge Function send-email desde el cliente o desde otros Edge Functions.
// Uso:
//   import { sendEmail } from '@/lib/sendEmail';
//   await sendEmail({ event: 'purchase_success', user_id: user.id, data: { plan: 'Pro' } });

import { supabase } from './supabase';

type EmailEvent =
  | 'purchase_success'
  | 'subscription_cancelled'
  | 'invoice_paid'
  | 'invoice_failed'
  | 'scheduled_event'
  | 'low_credit';

interface SendEmailOptions {
  event: EmailEvent;
  user_id?: string;
  to?: string;
  language?: 'es' | 'en';
  data?: Record<string, unknown>;
}

export async function sendEmail(options: SendEmailOptions): Promise<void> {
  const { error } = await supabase.functions.invoke('send-email', {
    body: options,
  });

  if (error) {
    console.error('[sendEmail] Error:', error);
    throw error;
  }
}

// ─── Server-side (Vercel API / Node): invoca la Edge Function por fetch ─────────
const SUPABASE_URL = typeof process !== 'undefined' ? process.env.SUPABASE_URL ?? '' : '';
const SUPABASE_SERVICE_KEY = typeof process !== 'undefined' ? process.env.SUPABASE_SERVICE_ROLE_KEY ?? '' : '';

export async function triggerEmail(
  event: EmailEvent,
  userId: string,
  data: Record<string, unknown>
): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.warn('[triggerEmail] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing, skip email');
    return;
  }
  try {
    const res = await fetch(`${SUPABASE_URL.replace(/\/$/, '')}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
      body: JSON.stringify({ event, user_id: userId, data }),
    });
    if (!res.ok) {
      const err = await res.text();
      console.warn('[triggerEmail] Edge Function error:', res.status, err);
    }
  } catch (err) {
    console.error('[triggerEmail] Failed:', err);
  }
}
