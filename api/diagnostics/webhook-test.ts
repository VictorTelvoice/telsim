import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2026-01-28.clover' as any,
});

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

/**
 * Diagnostic endpoint to test webhook processing
 * POST body should contain:
 * {
 *   "userId": "test-user-id",
 *   "slotId": "test-slot-id",
 *   "planName": "Power",
 *   "isAnnual": true,
 *   "amount": 99000 (in cents)
 * }
 */
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method Not Allowed',
      info: 'Use POST with test data to simulate webhook processing'
    });
  }

  const { userId, slotId, planName, isAnnual, amount } = req.body;

  if (!userId || !slotId || !planName) {
    return res.status(400).json({
      error: 'Missing required fields: userId, slotId, planName',
      example: {
        userId: 'test-user-123',
        slotId: 'slot-001',
        planName: 'Power',
        isAnnual: true,
        amount: 99000
      }
    });
  }

  try {
    console.log(`[WEBHOOK TEST] Starting test with:`, { userId, slotId, planName, isAnnual, amount });

    // Check if slot exists
    const { data: slot, error: slotError } = await supabaseAdmin
      .from('slots')
      .select('phone_number, status')
      .eq('slot_id', slotId)
      .maybeSingle();

    if (slotError) {
      return res.status(400).json({
        error: `Slot lookup failed: ${slotError.message}`,
        details: slotError
      });
    }

    if (!slot) {
      return res.status(400).json({
        error: `Slot not found: ${slotId}`,
        info: 'Make sure the slot_id exists in your database'
      });
    }

    // Plan catalogue
    const PLAN_PRICES: Record<string, { monthly: number; annual: number }> = {
      'Starter': { monthly: 19.90, annual: 199 },
      'Pro': { monthly: 39.90, annual: 399 },
      'Power': { monthly: 99.00, annual: 990 }
    };

    const planPrices = PLAN_PRICES[planName];
    if (!planPrices) {
      return res.status(400).json({
        error: `Invalid plan name: ${planName}`,
        validPlans: Object.keys(PLAN_PRICES)
      });
    }

    const correctAmount = isAnnual ? planPrices.annual : planPrices.monthly;
    const sessionId = `test_session_${Date.now()}`;

    console.log(`[WEBHOOK TEST] Inserting subscription with:`, {
      user_id: userId,
      slot_id: slotId,
      phone_number: slot.phone_number,
      plan_name: planName,
      amount: correctAmount,
      billing_type: isAnnual ? 'annual' : 'monthly',
      stripe_session_id: sessionId,
      status: 'active'
    });

    const { data: newSub, error: insertError } = await supabaseAdmin
      .from('subscriptions')
      .insert({
        user_id: userId,
        slot_id: slotId,
        phone_number: slot.phone_number,
        plan_name: planName,
        monthly_limit: ({ 'Starter': 150, 'Pro': 400, 'Power': 1400 } as Record<string, number>)[planName] || 150,
        status: 'active',
        stripe_session_id: sessionId,
        amount: correctAmount,
        billing_type: isAnnual ? 'annual' : 'monthly',
        currency: 'usd',
        created_at: new Date().toISOString(),
      })
      .select();

    if (insertError) {
      console.error(`[WEBHOOK TEST ERROR]`, insertError);
      return res.status(500).json({
        error: `Failed to insert subscription: ${insertError.message}`,
        code: insertError.code,
        details: insertError
      });
    }

    console.log(`[WEBHOOK TEST SUCCESS] Inserted:`, newSub);

    return res.status(200).json({
      success: true,
      message: 'Test webhook payload processed successfully',
      data: {
        subscription: newSub,
        calculated: {
          planPrices,
          correctAmount,
          billingType: isAnnual ? 'annual' : 'monthly'
        }
      }
    });

  } catch (err: any) {
    console.error('[WEBHOOK TEST EXCEPTION]', err);
    return res.status(500).json({
      error: `Test failed: ${err.message}`,
      stack: err.stack
    });
  }
}
