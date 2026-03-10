/**
 * TELSIM · Edge Function: test-webhook-connection
 *
 * Prueba la URL de webhook del usuario desde el servidor (evita CORS).
 * Recibe url y opcionalmente secret; hace POST con un payload de prueba
 * e incluye X-Telsim-Signature (HMAC-SHA256) si se envía secret.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function computeHmacSha256(secret: string, body: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(body)
  );
  return toHex(signature);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ success: false, error: "Method Not Allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const { url, secret } = (await req.json()) as { url?: string; secret?: string };
    const targetUrl = typeof url === "string" ? url.trim() : "";

    if (!targetUrl) {
      return new Response(
        JSON.stringify({ success: false, error: "URL is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload = {
      event: "test",
      message: "Webhook de prueba desde Telsim",
      timestamp: new Date().toISOString(),
      source: "telsim-webhook-test",
    };

    const bodyString = JSON.stringify(payload);
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-Telsim-Test": "1",
    };

    if (secret && typeof secret === "string" && secret.trim()) {
      const signature = await computeHmacSha256(secret.trim(), bodyString);
      headers["X-Telsim-Signature"] = `sha256=${signature}`;
    }

    const res = await fetch(targetUrl, {
      method: "POST",
      headers,
      body: bodyString,
    });

    const statusCode = res.status;
    const success = statusCode >= 200 && statusCode < 300;

    return new Response(
      JSON.stringify({
        success,
        statusCode,
        ok: success,
        statusText: res.statusText || undefined,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ success: false, error: message, statusCode: null }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
