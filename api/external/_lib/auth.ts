import jwt from 'jsonwebtoken';
import { db } from './db.js';

const JWT_SECRET = process.env.EXTERNAL_API_SECRET || process.env.SUPABASE_JWT_SECRET || 'secret';

export interface ApiClientPayload {
  clientId: string;
}

export async function verifyExternalClientAuth(req: any): Promise<string | null> {
  const authHeader = req.headers?.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
    if (!payload || !payload.clientId) {
      return null;
    }

    const { clientId } = payload;
    
    // Verify in db using the abstraction layer
    const { data: client, error } = await db.getClientStatus(clientId);

    if (error || !client || client.status !== 'active') {
      return null;
    }

    return clientId;
  } catch (error) {
    return null; // Invalid signature, expired, or malformed
  }
}
