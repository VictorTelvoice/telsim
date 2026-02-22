
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

    const message = `[TELSIM] 🔔 *NUEVO MENSAJE*\n\n📱 *De:* ${sender}\n🔑 *Código:* \`${verification_code || '---'}\`\n💬 *Texto:* ${content}`;

    console.log(`TELSIM LOG: Enviando mensaje de ${sender} a ChatID ${chat_id}`);

    const tgResponse = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chat_id,
        text: message,
        parse_mode: 'Markdown',
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
