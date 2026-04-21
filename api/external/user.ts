import { db } from './_lib/db.js';
import { verifyExternalClientAuth } from './_lib/auth.js';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 1. Autenticación con JWT
  const clientId = await verifyExternalClientAuth(req);
  if (!clientId) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or missing JWT' });
  }

  try {
    const { user_id: externalUserId } = req.query || req.body || {};

    if (!externalUserId) {
      return res.status(400).json({ error: 'Missing external user_id.' });
    }

    // Buscar el mapeo del usuario sombra
    // Necesitamos el telsimUserId
    const { data: telsimUserId, error: mapErr } = await db.findOrCreateExternalUser(clientId, externalUserId);
    
    if (mapErr || !telsimUserId) {
        return res.status(404).json({ error: 'Internal user mapping not found.' });
    }

    switch (req.method) {
      case 'GET': {
        const { data, error } = await db.getUserWebhookConfig(telsimUserId);
        if (error) throw error;
        return res.status(200).json({ data });
      }

      case 'POST': {
        const { webhook_url, api_secret_key } = req.body || {};
        if (!webhook_url) {
            return res.status(400).json({ error: 'Missing webhook_url parameter.' });
        }

        const { error } = await db.updateUserWebhook(telsimUserId, webhook_url, api_secret_key || Buffer.from(Math.random().toString()).toString('base64').slice(0, 32));
        if (error) throw error;

        return res.status(200).json({ message: 'Webhook configuration updated successfully.' });
      }

      case 'DELETE': {
        // En este contexto, el usuario desea eliminar el mapeo y liberar recursos
        // releaseSlot ya maneja el auto-borrado, pero aquí forzamos la limpieza
        const { data: slots, error: slotsErr } = await db.listSlots(clientId);
        if (slotsErr) throw slotsErr;

        // Liberar todos los slots del usuario si existen
        const userSlots = slots?.filter((s: any) => s.assigned_to === telsimUserId) || [];
        for (const slot of userSlots) {
            await db.releaseSlot(slot.slot_id); 
        }

        // Finalmente limpiar el usuario
        await db.cleanupShadowUserIfEmpty(clientId, telsimUserId);
        
        return res.status(200).json({ message: 'Shadow user and all associated mappings deleted.' });
      }

      default:
        res.setHeader('Allow', 'GET, POST, DELETE, OPTIONS');
        return res.status(405).json({ error: 'Method Not Allowed' });
    }
  } catch (err: any) {
    console.error(`[API External User] Error processing ${req.method}`, err);
    return res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
}
