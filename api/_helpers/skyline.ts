import { createClient } from '@supabase/supabase-js';
import { sendUnified } from './notifications.js';

let _supabaseAdmin: any = null;
function getSupabaseAdmin(): any {
  if (!_supabaseAdmin) {
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
    console.log('[Skyline Debug] URL resolved to:', url ? 'exists' : 'undefined');
    if (!url) throw new Error('SUPABASE_URL or VITE_SUPABASE_URL is required (current: ' + url + ')');
    if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required');
    _supabaseAdmin = createClient(url, key);
  }
  return _supabaseAdmin;
}

export interface SkylinePayload {
  username?: string;
  password?: string;
  sender: string;
  receiver: string;
  port?: string | number;
  content?: string;
  charset?: string;
}

/**
 * Procesa un mensaje entrante de un dispositivo Skyline.
 * Realiza sincronización pasiva de slots y dispara notificaciones.
 */
export async function processSkylineMessage(payload: SkylinePayload) {
  const { sender, receiver, port, content, username, charset } = payload;

  if (!sender || !receiver) {
    console.error('[Skyline] Missing required fields (sender or receiver)', payload);
    throw new Error('Sender and receiver are required');
  }

  const slotId = String(port || '').trim();
  if (!slotId) {
    console.error('[Skyline] Missing port in payload', payload);
    throw new Error('Missing port');
  }

  // 1. & 2. Obtener el Slot (Soportando DB Local para Testing vs Prod)
  let slot: any = null;
  const isLocalTest = process.env.IS_LOCAL_TEST === 'true';

  let resolvedUserId: string | null = null;
  let smsLog: any = null;

  if (isLocalTest) {
    // ---- LECTURA EN BASE DE DATOS LOCAL POSTGRES (telsim_test) ----
    const pgModule = await import('pg');
    const Pool = pgModule.default?.Pool || pgModule.Pool || (pgModule as any).default;
    const pool = (global as any).__pgPool || new Pool({ connectionString: process.env.DATABASE_URL });
    (global as any).__pgPool = pool;

    if (receiver) {
      const phone = String(receiver).trim();
      if (phone) {
        await pool.query("UPDATE slots SET phone_number = $1 WHERE slot_id = $2", [phone, slotId]);
      }
    }
    
    console.log(`[Skyline Debug PG] Querying slot_id='${slotId}'`);
    let res = await pool.query("SELECT assigned_to, phone_number, status, forwarding_active, forwarding_channel FROM slots WHERE slot_id = $1 LIMIT 1", [slotId]);
    console.log(`[Skyline Debug PG] Row by slot_id:`, res.rows[0]);

    if (res.rows.length === 0 && receiver) {
      console.log(`[Skyline Debug PG] Querying phone_number='${String(receiver).trim()}'`);
      res = await pool.query("SELECT assigned_to, phone_number, status, forwarding_active, forwarding_channel FROM slots WHERE phone_number = $1 LIMIT 1", [String(receiver).trim()]);
      console.log(`[Skyline Debug PG] Row by phone:`, res.rows[0]);
    }
    slot = res.rows[0];

    if (!slot) {
      console.warn(`[Skyline] Message on port ${slotId} but slot not found in DB.`);
      return { success: false, error: 'Slot not found' };
    }

    resolvedUserId = slot.assigned_to;
    if (!resolvedUserId) {
      console.log(`[Skyline] Message on port ${slotId} but no user assigned.`);
      return { success: true, warning: 'No user assigned' };
    }

    // 3. Registrar en sms_logs local
    const insRes = await pool.query(
      "INSERT INTO sms_logs (user_id, slot_id, sender, content, received_at) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [resolvedUserId, slotId, sender || 'Unknown', content || '', new Date().toISOString()]
    );
    smsLog = insRes.rows[0];

  } else {
    // ---- LECTURA EN BASE DE DATOS SUPABASE (Producción) ----
    if (receiver) {
      const phone = String(receiver).trim();
      if (phone) {
        await getSupabaseAdmin().from('slots').update({ phone_number: phone }).eq('slot_id', slotId);
      }
    }

    const query = getSupabaseAdmin().from('slots').select('assigned_to, phone_number, status, forwarding_active, forwarding_channel');
    const { data: slotById, error: slotError } = await query.eq('slot_id', slotId).maybeSingle();
    slot = slotById;

    if (!slot && receiver) {
      const { data: slotByPhone } = await getSupabaseAdmin().from('slots').select('assigned_to, phone_number, status, forwarding_active, forwarding_channel').eq('phone_number', String(receiver).trim()).maybeSingle();
      slot = slotByPhone;
    }

    if (slotError) {
      console.error(`[Skyline] Error querying slot ${slotId}`, slotError);
      throw slotError;
    }

    if (!slot) {
      console.warn(`[Skyline] Message on port ${slotId} but slot not found in DB.`);
      return { success: false, error: 'Slot not found' };
    }

    resolvedUserId = slot.assigned_to;
    if (!resolvedUserId) {
      console.log(`[Skyline] Message on port ${slotId} but no user assigned.`);
      return { success: true, warning: 'No user assigned' };
    }

    // 3. Registrar en sms_logs supabase
    const { data: smsData, error: smsError } = await getSupabaseAdmin().from('sms_logs').insert({
      user_id: resolvedUserId,
      slot_id: slotId,
      sender: sender || 'Unknown',
      content: content || '',
      received_at: new Date().toISOString()
    }).select().single();

    if (smsError) {
      console.error(`[Skyline] Error inserting SMS log`, smsError);
      throw smsError;
    }
    
    smsLog = smsData;
  }

  // 4. Notificaciones Automáticas (Forwarding)
  if (slot.forwarding_active && slot.forwarding_channel) {
    const safeSender = (sender || 'Desconocido').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const safeContent = (content || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    
    // Formato premium para Telegram (HTML)
    const message = `<b>📩 NUEVO SMS RECIBIDO</b>\n━━━━━━━━━━━━━━━━━━\n<b>📱 De:</b> <code>${safeSender}</code>\n<b>💬 Mensaje:</b>\n<blockquote>${safeContent}</blockquote>\n<i>📡 Enviado vía Telsim (Skyline)</i>`;

    let channel = slot.forwarding_channel;
    // Mapeo de canales (si es webhook o discord, por ahora usamos el sistema unificado si lo soporta)
    // Nota: El sistema unificado actual soporta 'telegram' y 'email'.
    if (channel === 'telegram') {
      await sendUnified({
        channel: 'telegram',
        userId: resolvedUserId,
        event: 'incoming_sms',
        content: message
      });
    }
    // TODO: Implementar discord/webhook si es necesario en el futuro
  }

  // 5. Notificar por Webhook Externo si el usuario lo configuró
  try {
    let userRecord: any = null;
    if (isLocalTest) {
      const pool = (global as any).__pgPool;
      const uRes = await pool.query("SELECT user_webhook_url, webhook_is_active, api_secret_key FROM users WHERE id = $1 LIMIT 1", [resolvedUserId]);
      userRecord = uRes.rows[0];
    } else {
      const { data } = await getSupabaseAdmin().from('users').select('user_webhook_url, webhook_is_active, api_secret_key').eq('id', resolvedUserId).maybeSingle();
      userRecord = data;
    }

    if (userRecord && userRecord.webhook_is_active && userRecord.user_webhook_url) {
      const webhookPayload = {
        smsId: smsLog.id,
        sender: sender,
        receiver: receiver,
        content: content,
        timestamp: smsLog.received_at || new Date().toISOString()
      };

      console.log(`[Skyline Webhook] Forwarding SMS to ${userRecord.user_webhook_url}`);
      
      // Enviamos el webhook en background, no bloqueamos la respuesta al dispositivo
      fetch(userRecord.user_webhook_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(userRecord.api_secret_key ? { 'Authorization': `Bearer ${userRecord.api_secret_key}` } : {})
        },
        body: JSON.stringify(webhookPayload)
      }).catch(err => {
        console.error('[Skyline Webhook] Failed to forward SMS:', err);
      });
    }
  } catch (error) {
    console.error('[Skyline Webhook] Error processing webhook step:', error);
  }

  return { 
    success: true, 
    smsId: smsLog.id, 
    userId: resolvedUserId, 
    phoneNumber: slot.phone_number 
  };
}
