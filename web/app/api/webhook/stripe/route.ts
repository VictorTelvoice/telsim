import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { prisma } from '@/lib/prisma';
import { subscriptionBillingSnapshotFromStripe, monthlySmsLimitForPlan } from '@/lib/helpers/checkout';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16' as any,
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature') as string;

  let event: Stripe.Event;

  try {
    if (!webhookSecret || !signature) {
      throw new Error('Missing stripe signature or webhook secret');
    }
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error(`❌ Webhook signature verification failed: ${err.message}`);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }

  console.log(`🔔 Webhook received: ${event.type}`);

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const metadata = session.metadata;

        if (!metadata?.userId || !metadata?.slot_id) {
          console.error('❌ Missing metadata in checkout session:', metadata);
          break;
        }

        const stripeSubscriptionId = session.subscription as string;
        const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
        
        const snapshot = subscriptionBillingSnapshotFromStripe(subscription);
        const limit = monthlySmsLimitForPlan(metadata.planName, metadata.limit);

        // 1. Crear la suscripción y actualizar el Slot en una transacción
        await prisma.$transaction(async (tx) => {
          // Buscar el Slot reservado
          const slot = await tx.slot.findUnique({
            where: { slotId: metadata.slot_id }
          });

          if (!slot) throw new Error(`Slot ${metadata.slot_id} not found`);

          // Crear la suscripción
          await tx.subscription.create({
            data: {
              stripeSubscriptionId,
              userId: metadata.userId,
              slotId: slot.id,
              planName: metadata.planName || 'Starter',
              status: snapshot.status,
              monthlyLimit: limit,
              phoneNumber: slot.phoneNumber,
              billingType: metadata.isAnnual === 'true' ? 'annual' : 'monthly',
            }
          });

          // Activar el Slot y asignarlo al usuario
          await tx.slot.update({
            where: { id: slot.id },
            data: {
              status: 'ocupado',
              assignedTo: metadata.userId,
              planType: metadata.planName,
              reservationToken: null,
              reservationExpires: null,
              reservationUserId: null,
            }
          });

          // Marcar onboarding como completado para el usuario
          await tx.user.update({
            where: { id: metadata.userId },
            data: {
              onboardingCompleted: true,
              onboardingStep: 'completed',
              role: 'USER' // Aseguramos que sea USER
            }
          });
        });

        console.log(`✅ Subscription created and Slot ${metadata.slot_id} activated for user ${metadata.userId}`);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await prisma.subscription.updateMany({
          where: { stripeSubscriptionId: subscription.id },
          data: { status: 'canceled' }
        });
        // Aquí podrías liberar el slot si quisieras
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('❌ Webhook handler error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
