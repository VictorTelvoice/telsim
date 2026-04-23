import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import crypto from 'crypto';
import {
  applyStripeCheckoutBillingCompliance,
  isSupportedOnboardingCountryCode,
  monthlySmsLimitForPlan,
  subscriptionBillingSnapshotFromStripe,
  ONBOARDING_ISO_TO_SLOT_COUNTRY_PATTERNS
} from '@/lib/helpers/checkout';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16' as any, // Adjusted to a stable version
});

const PLAN_PRICES: Record<string, { monthly: number; annual: number }> = {
  'Starter': { monthly: 19.90, annual: 199 },
  'Pro':     { monthly: 39.90, annual: 399 },
  'Power':   { monthly: 99.00, annual: 990 },
};

export async function POST(req: NextRequest) {
  const sessionAuth = await auth();
  console.log('API Checkout Session:', sessionAuth?.user?.id ? 'Authenticated' : 'NOT Authenticated', sessionAuth?.user?.id);
  
  if (!sessionAuth?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');

  try {
    const body = await req.json();

    if (action === 'verify') {
      const { sessionId } = body;
      if (!sessionId) return NextResponse.json({ error: 'Session ID requerido' }, { status: 400 });

      const session = await stripe.checkout.sessions.retrieve(sessionId);
      if (session.payment_status !== 'paid') {
        return NextResponse.json({ status: 'unpaid', message: 'El pago aún no ha sido confirmado.' });
      }

      const subscription = await prisma.subscription.findFirst({
         where: { stripeSubscriptionId: session.subscription as string }
      });

      if (subscription) {
        return NextResponse.json({
          status: 'completed',
          phoneNumber: subscription.phoneNumber,
          planName: subscription.planName,
          amount: 0, // Placeholder
          monthlyLimit: subscription.monthlyLimit,
        });
      }

      return NextResponse.json({
        status: 'pending_db',
        message: 'Pago confirmado. La infraestructura está asignando tu número.',
      });
    }

    if (action === 'session') {
      let { priceId, planName, isUpgrade, monthlyLimit, slot_id, isAnnual, region } = body;
      const userId = sessionAuth.user.id;

      if (!priceId) return NextResponse.json({ error: 'Price ID requerido' }, { status: 400 });

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { stripeCustomerId: true }
      });

      const customerId = user?.stripeCustomerId;
      const regionCode = typeof region === 'string' ? region.trim().toUpperCase() : 'CL';
      console.log('[DEBUG] Region selected:', regionCode);

      if (regionCode && !isSupportedOnboardingCountryCode(regionCode)) {
        console.warn('[DEBUG] Unsupported country code:', regionCode);
        return NextResponse.json({
          error: `El país "${regionCode}" no está soportado.`,
          code: 'UNSUPPORTED_COUNTRY'
        }, { status: 400 });
      }

      // Reservation Logic
      const RESERVATION_TTL_MS = 1000 * 60 * 30;
      let targetSlotId = slot_id;
      let targetPhoneNumber = "";
      let reservationToken = "";

      if (!isUpgrade) {
        // Find a free slot matching country patterns
        const countryPatterns = ONBOARDING_ISO_TO_SLOT_COUNTRY_PATTERNS[regionCode] || [];
        console.log('[DEBUG] Searching slots with patterns:', countryPatterns);
        
        const slotToReserve = await prisma.slot.findFirst({
          where: {
            status: 'libre',
            OR: [
              { assignedTo: null },
              { assignedTo: { isSet: false } as any }
            ],
            ...(countryPatterns.length > 0 ? {
              country: { in: countryPatterns }
            } : {})
          },
          orderBy: { createdAt: 'asc' }
        });

        if (!slotToReserve) {
          console.error('[DEBUG] No free slot found for region:', regionCode, 'Patterns:', countryPatterns);
          return NextResponse.json({
            error: 'No hay números disponibles en esta región.',
            code: 'NO_SLOTS_AVAILABLE'
          }, { status: 422 });
        }

        console.log('[DEBUG] Slot reserved successfully:', slotToReserve.phoneNumber, 'ID:', slotToReserve.id);

        reservationToken = crypto.randomBytes(16).toString('hex');
        const expiresAt = new Date(Date.now() + RESERVATION_TTL_MS);

        const updated = await prisma.slot.updateMany({
          where: { id: slotToReserve.id, status: 'libre' },
          data: {
            status: 'reserved',
            reservationToken: reservationToken,
            reservationExpires: expiresAt,
            reservationUserId: userId,
            planType: planName,
          }
        });

        if (updated.count === 0) {
          return NextResponse.json({ error: 'Conflicto al reservar el número.' }, { status: 409 });
        }

        targetSlotId = slotToReserve.slotId;
        targetPhoneNumber = slotToReserve.phoneNumber;
      }

      const host = req.headers.get('host');
      const origin = `${host?.includes('localhost') ? 'http' : 'https'}://${host}`;

      const sessionConfig: Stripe.Checkout.SessionCreateParams = {
        customer: customerId || undefined,
        payment_method_types: ['card'],
        line_items: [{ price: priceId, quantity: 1 }],
        mode: 'subscription',
        success_url: `${origin}/onboarding/processing?session_id={CHECKOUT_SESSION_ID}&slot_id=${targetSlotId}`,
        cancel_url: `${origin}/dashboard`,
        metadata: {
          userId,
          slot_id: targetSlotId,
          planName,
          region: regionCode,
          limit: String(monthlyLimit ?? ''),
          transactionType: isUpgrade ? 'UPGRADE' : 'NEW_SUB',
          isAnnual: isAnnual ? 'true' : 'false',
          reservationToken
        },
      };

      applyStripeCheckoutBillingCompliance(sessionConfig);

      const stripeSession = await stripe.checkout.sessions.create(sessionConfig);
      
      return NextResponse.json({ url: stripeSession.url, checkoutSessionId: stripeSession.id });
    }

    return NextResponse.json({ error: 'Action not supported' }, { status: 400 });

  } catch (error: any) {
    console.error('Checkout error:', error);
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
  }
}
