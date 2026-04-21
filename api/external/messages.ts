import { db } from './_lib/db.js';
import { verifyExternalClientAuth } from './_lib/auth.js';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
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
    const { user_id: externalUserId } = req.query || {};

    if (!externalUserId) {
      return res.status(400).json({ error: 'Missing external user_id.' });
    }

    switch (req.method) {
      case 'GET': {
        const { data, error } = await db.getMessagesByExternalUser(clientId, externalUserId);
        if (error) throw error;
        
        return res.status(200).json({
            count: data.length,
            data: data
        });
      }

      default:
        res.setHeader('Allow', 'GET, OPTIONS');
        return res.status(405).json({ error: 'Method Not Allowed' });
    }
  } catch (err: any) {
    console.error(`[API External Messages] Error processing ${req.method}`, err);
    return res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
}
