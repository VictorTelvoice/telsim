'use server';

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { redirect } from "next/navigation";

export async function getBillingData() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const userId = session.user.id;

  const [subscriptions, invoices] = await Promise.all([
    prisma.subscription.findMany({
      where: { userId },
      include: {
        slot: true
      },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.invoice.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20
    })
  ]);

  return { subscriptions, invoices };
}

export async function createStripePortalLink() {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { stripeCustomerId: true }
  });

  if (!user?.stripeCustomerId) {
    throw new Error("No stripe customer found for this user");
  }

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${process.env.NEXTAUTH_URL}/app/billing`,
  });

  return portalSession.url;
}

export async function syncInvoicesWithStripe() {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { stripeCustomerId: true }
  });

  if (!user?.stripeCustomerId) return;

  const stripeInvoices = await stripe.invoices.list({
    customer: user.stripeCustomerId,
    limit: 10
  });

  // Upsert invoices into MongoDB
  for (const inv of stripeInvoices.data) {
    await prisma.invoice.upsert({
      where: { stripeInvoiceId: inv.id },
      update: {
        status: inv.status || 'unknown',
        hostedInvoiceUrl: inv.hosted_invoice_url,
        invoicePdf: inv.invoice_pdf,
        amount: inv.total,
        number: inv.number
      },
      create: {
        stripeInvoiceId: inv.id,
        userId: session.user.id,
        status: inv.status || 'unknown',
        hostedInvoiceUrl: inv.hosted_invoice_url,
        invoicePdf: inv.invoice_pdf,
        amount: inv.total,
        number: inv.number,
        currency: inv.currency
      }
    });
  }

  return { success: true };
}
