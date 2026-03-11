import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2026-01-28.clover' as any,
});

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') return res.status(405).end();

    const { subscriptionId } = req.body;
    if (!subscriptionId) return res.status(400).json({ error: 'Missing subscriptionId' });

    try {
        // Cancelar inmediatamente en Stripe
        // Esto genera customer.subscription.deleted → webhook → correo + Telegram
        await stripe.subscriptions.cancel(subscriptionId);
        return res.status(200).json({ ok: true });
    } catch (err: any) {
        console.error('[CANCEL-SUBSCRIPTION]', err.message);
        return res.status(500).json({ error: err.message });
    }
}

