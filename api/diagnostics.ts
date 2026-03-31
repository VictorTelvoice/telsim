/**
 * TELSIM · /api/diagnostics
 *
 * GET: últimas 20 suscripciones y estadísticas.
 * POST: simular webhook (webhook-test) para pruebas.
 */
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

const ADMIN_UIDS = [
  '8e7bcada-3f7a-482f-93a7-9d0fd4828231',
  'd310eaf8-2c82-4c29-9ea8-6d64616774da',
];

function isAdminUid(uid: string | null | undefined): boolean {
  return ADMIN_UIDS.some((adminUid) => adminUid.toLowerCase() === String(uid || '').toLowerCase());
}

async function getRequester(req: any) {
  const authHeader = req.headers?.authorization || req.headers?.Authorization;
  const token = typeof authHeader === 'string' ? authHeader.replace(/^Bearer\s+/i, '') : '';
  if (!token) return null;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const url = process.env.SUPABASE_URL || '';
  if (!anonKey || !url) return null;
  const supabaseAuth = createClient(url, anonKey, { global: { fetch } });
  const { data, error } = await supabaseAuth.auth.getUser(token);
  if (error || !data?.user?.id) return null;
  return data.user;
}

export default async function handler(req: any, res: any) {
  const requester = await getRequester(req);
  const isAdmin = isAdminUid(requester?.id);
  if (!requester || !isAdmin) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  if (req.method === 'GET') {
    try {
      const { data: subscriptions, error } = await supabaseAdmin
        .from('subscriptions')
        .select('id, user_id, slot_id, phone_number, plan_name, amount, billing_type, status, stripe_session_id, created_at, stripe_subscription_id')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        return res.status(500).json({ error: `Database error: ${error.message}` });
      }

      const annualCount = subscriptions?.filter((s: any) => s.billing_type === 'annual').length || 0;
      const monthlyCount = subscriptions?.filter((s: any) => s.billing_type === 'monthly').length || 0;
      const activeCount = subscriptions?.filter((s: any) => s.status === 'active').length || 0;

      return res.status(200).json({
        message: 'Recent subscriptions from database',
        stats: { total_in_recent_20: subscriptions?.length || 0, annual: annualCount, monthly: monthlyCount, active: activeCount },
        subscriptions: subscriptions || [],
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error('[DIAGNOSTICS GET]', err);
      return res.status(500).json({ error: `Diagnostics error: ${err.message}`, timestamp: new Date().toISOString() });
    }
  }

  if (req.method === 'POST') {
    const { userId, slotId, planName, isAnnual, amount } = req.body;
    if (!userId || !slotId || !planName) {
      return res.status(400).json({
        error: 'Missing required fields: userId, slotId, planName',
        example: { userId: 'test-user-123', slotId: 'slot-001', planName: 'Power', isAnnual: true, amount: 99000 },
      });
    }
    try {
      const { data: slot, error: slotError } = await supabaseAdmin
        .from('slots')
        .select('phone_number, status')
        .eq('slot_id', slotId)
        .maybeSingle();

      if (slotError || !slot) {
        return res.status(400).json({ error: slotError ? `Slot lookup failed: ${slotError.message}` : `Slot not found: ${slotId}` });
      }

      const PLAN_PRICES: Record<string, { monthly: number; annual: number }> = {
        Starter: { monthly: 19.9, annual: 199 },
        Pro: { monthly: 39.9, annual: 399 },
        Power: { monthly: 99, annual: 990 },
      };
      const planPrices = PLAN_PRICES[planName];
      if (!planPrices) {
        return res.status(400).json({ error: `Invalid plan name: ${planName}`, validPlans: Object.keys(PLAN_PRICES) });
      }

      const correctAmount = isAnnual ? planPrices.annual : planPrices.monthly;
      const sessionId = `test_session_${Date.now()}`;

      const { data: newSub, error: insertError } = await supabaseAdmin
        .from('subscriptions')
        .insert({
          user_id: userId,
          slot_id: slotId,
          phone_number: slot.phone_number,
          plan_name: planName,
          monthly_limit: ({ Starter: 150, Pro: 400, Power: 1400 } as Record<string, number>)[planName] || 150,
          status: 'active',
          stripe_session_id: sessionId,
          amount: correctAmount,
          billing_type: isAnnual ? 'annual' : 'monthly',
          currency: 'usd',
          created_at: new Date().toISOString(),
        })
        .select();

      if (insertError) {
        return res.status(500).json({ error: `Failed to insert: ${insertError.message}`, code: insertError.code });
      }

      return res.status(200).json({
        success: true,
        message: 'Test webhook payload processed successfully',
        data: { subscription: newSub, calculated: { planPrices, correctAmount, billingType: isAnnual ? 'annual' : 'monthly' } },
      });
    } catch (err: any) {
      console.error('[DIAGNOSTICS POST]', err);
      return res.status(500).json({ error: `Test failed: ${err.message}` });
    }
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Method Not Allowed' });
}
