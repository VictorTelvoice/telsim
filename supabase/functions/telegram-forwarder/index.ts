/**
 * TELSIM · Telegram Forwarder (Edge Function)
 *
 * ÚNICA plantilla en este repo para enviar SMS reales a Telegram.
 * Formato: HTML Premium (📩 NUEVO SMS RECIBIDO, 📱 De:, 🔑 Código OTP:, 💬 Mensaje:, 📡 Enviado vía Telsim).
 * Si recibes mensajes con formato antiguo (🏢 Servicio:, 👤 De:, 🔑 Código (toca para copiar):),
 * ese mensaje lo genera otro servicio: revisa Supabase → Database Webhooks / Edge Functions
 * y asegúrate de que al insertar en automation_logs se invoque ESTA función (o una que POSTee aquí)
 * con payload: { token, chat_id, sender, verification_code, content }.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Manejo de CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { token, chat_id, sender, verification_code, content } = await req.json()

    if (!token || !chat_id) {
      throw new Error("Credenciales de Telegram incompletas (Token/ChatID)")
    }

    const escapeHtml = (s: string) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const safeSender = escapeHtml(sender ?? '')
    const safeCode = escapeHtml(verification_code || '---')
    const safeContent = escapeHtml(content ?? '')

    const message = `<b>📩 NUEVO SMS RECIBIDO</b>
━━━━━━━━━━━━━━━━━━
<b>📱 De:</b> <code>${safeSender}</code>
<b>🔑 Código OTP:</b> <code>${safeCode}</code>
<b>💬 Mensaje:</b>
<blockquote>${safeContent}</blockquote>
<i>📡 Enviado vía Telsim</i>`

    console.log(`TELSIM LOG: Enviando mensaje de ${sender} a ChatID ${chat_id}`);

    const tgResponse = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chat_id,
        text: message,
        parse_mode: 'HTML',
      }),
    })

    const result = await tgResponse.json()

    if (!tgResponse.ok) {
      throw new Error(result.description || "Error desconocido en Telegram API")
    }

    return new Response(JSON.stringify({ status: 'success', data: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error(`TELSIM ERROR: ${error.message}`);
    return new Response(JSON.stringify({ status: 'error', message: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
