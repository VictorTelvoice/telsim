import type { VercelRequest, VercelResponse } from '@vercel/node';
import { processSkylineMessage } from '../_helpers/skyline.js';

/**
 * Webhook para dispositivos Skyline (MoIP64/512).
 * Recibe SMS y sincroniza slots de manera pasiva.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Solo permitir POST (aunque podrías permitir GET para debug si quieres)
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    let rawBody = req.body;
    const query = req.query || {};

    if (Buffer.isBuffer(rawBody)) {
      rawBody = rawBody.toString('utf-8');
    }

    let payload: any = {};

    // Formato Skyline: variables en Query Strings y texto de SMS en Raw Body
    if (typeof rawBody === 'string') {
      let extractedContent = rawBody;
      // El Skyline manda cabeceras (Sender, Receiver, Slot, etc) separadas por un doble salto de línea del SMS real
      const parts = rawBody.trim().split(/\r?\n\s*\r?\n/);
      if (parts.length > 1) {
        extractedContent = parts[parts.length - 1].trim();
      }

      payload = {
        sender: query.sender,
        receiver: query.receiver,
        port: query.port,
        charset: query.charset,
        content: extractedContent
      };
    } else if (typeof rawBody === 'object' && rawBody !== null) {
      // Para compatibilidad con POSTMAN (JSON)
      payload = { ...query, ...rawBody };
    }

    // Normalizar arrays por si mandan parámetros repetidos
    for (const key in payload) {
      if (Array.isArray(payload[key])) {
        payload[key] = payload[key][0];
      }
    }

    if (!payload || Object.keys(payload).length === 0) {
      return res.status(400).json({ error: 'Empty payload (body and query are empty)' });
    }

    console.log('[Skyline Webhook] Incoming resolved payload:', payload);

    const result = await processSkylineMessage(payload);

    if (result.success) {
      return res.status(200).json({ 
        ok: true, 
        message: 'Processed successfully',
        warning: result.warning 
      });
    } else {
      return res.status(400).json({ 
        ok: false, 
        error: result.error 
      });
    }

  } catch (error: any) {
    console.error('[Skyline Webhook] Error:', error.message);
    return res.status(500).json({ 
      error: 'Internal Server Error', 
      details: error.message 
    });
  }
}
