import { db } from './_lib/db.js';
import { verifyExternalClientAuth } from './_lib/auth.js';

export default async function handler(req: any, res: any) {
  // Configurar CORS básico si es necesario, o depender del proxy de Vercel
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
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
    switch (req.method) {
      case 'GET': {
        const { id } = req.query || {};

        if (id) {
          // Obtener detalle de un slot específico asociado al cliente
          const { data, error } = await db.getSlotDetail(clientId, id);

          if (error) throw error;
          if (!data) return res.status(404).json({ error: 'Number not found or not owned by you.' });

          return res.status(200).json({ data });
        } else {
          // Listar todos los slots del cliente
          const { data, error } = await db.listSlots(clientId);

          if (error) throw error;
          return res.status(200).json({ data: data || [] });
        }
      }

      case 'POST': {
        // Asignación de nuevo número desde el Inventario Real
        const { label, region = 'US', plan_type = 'basic', user_id, user_name, user_email } = req.body || {};

        if (!region || !plan_type) {
            return res.status(400).json({ error: 'Missing required parameters (region, plan_type)' });
        }

        if (!user_id) {
            return res.status(400).json({ error: 'Missing external user_id for assignment.' });
        }

        // 1. Buscar o crear el "Usuario Sombra" en Telsim
        const { data: telsimUserId, error: userErr } = await db.findOrCreateExternalUser(
            clientId, 
            user_id, 
            user_name, 
            user_email
        );

        if (userErr || !telsimUserId) {
            console.error('[API External POST] findOrCreateExternalUser error:', userErr);
            return res.status(500).json({ error: 'Failed to create internal user mapping.' });
        }

        // 2. Buscar un slot libre en el inventario real
        const { data: freeSlot, error: freeSelectErr } = await db.findFreeSlot();

        if (freeSelectErr || !freeSlot) {
            return res.status(422).json({ error: 'No numbers available in inventory at this moment.' });
        }

        // 3. Ocupar el slot para el cliente externo vinculado al usuario sombra
        const { data: updateData, error: updateError } = await db.occupySlot(
            freeSlot.slot_id, 
            clientId, 
            telsimUserId,
            plan_type, 
            label || `External: ${user_name || user_id}`
        );

        if (updateError) {
          console.error('[API External POST] occupying slot', updateError);
          return res.status(500).json({ error: 'Failed to assign a new number. Inventory lock error.' });
        }

        return res.status(201).json({
          message: 'Number successfully assigned',
          data: {
             slot_id: updateData.slot_id,
             phone_number: updateData.phone_number,
             status: updateData.status
          }
        });
      }

      case 'DELETE': {
        const { id } = req.query || {};
        if (!id) {
          return res.status(400).json({ error: 'Missing number ID to release.' });
        }

        // Verificar propiedad
        const { data: slot, error: fetchError } = await db.getSlotDetail(clientId, id);

        if (fetchError || !slot) {
           return res.status(404).json({ error: 'Number not found or not owned by you.' });
        }

        // Lógica de liberación: restaurar el inventario al pool público (status = 'libre')
        const { error: releaseError } = await db.releaseSlot(id, clientId);

        if (releaseError) {
          return res.status(500).json({ error: 'Failed to release number back to inventory.' });
        }

        return res.status(200).json({ message: 'Number successfully released.' });
      }

      default:
        res.setHeader('Allow', 'GET, POST, DELETE, OPTIONS');
        return res.status(405).json({ error: 'Method Not Allowed' });
    }
  } catch (err: any) {
    console.error(`[API External] Error processing ${req.method}`, err);
    return res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
}
