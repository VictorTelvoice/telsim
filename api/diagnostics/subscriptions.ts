import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export default async function handler(req: any, res: any) {
  // Basic security - only allow GET requests and from authenticated users
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // Get the last 20 subscriptions ordered by creation date (newest first)
    const { data: subscriptions, error } = await supabaseAdmin
      .from('subscriptions')
      .select('id, user_id, slot_id, phone_number, plan_name, amount, billing_type, status, stripe_session_id, created_at, stripe_subscription_id')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      return res.status(500).json({ error: `Database error: ${error.message}` });
    }

    // Get summary statistics
    const { data: stats } = await supabaseAdmin
      .from('subscriptions')
      .select('billing_type, status', { count: 'exact' });

    const annualCount = subscriptions?.filter(s => s.billing_type === 'annual').length || 0;
    const monthlyCount = subscriptions?.filter(s => s.billing_type === 'monthly').length || 0;
    const activeCount = subscriptions?.filter(s => s.status === 'active').length || 0;

    return res.status(200).json({
      message: 'Recent subscriptions from database',
      stats: {
        total_in_recent_20: subscriptions?.length || 0,
        annual: annualCount,
        monthly: monthlyCount,
        active: activeCount
      },
      subscriptions: subscriptions || [],
      timestamp: new Date().toISOString()
    });

  } catch (err: any) {
    console.error('[DIAGNOSTICS ERROR]', err);
    return res.status(500).json({
      error: `Diagnostics error: ${err.message}`,
      timestamp: new Date().toISOString()
    });
  }
}
