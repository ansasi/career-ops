import type { NextRequest } from 'next/server';
import type Stripe from 'stripe';
import { stripe } from '@/lib/billing/stripe';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';

export async function POST(req: NextRequest): Promise<Response> {
  const sig = req.headers.get('stripe-signature');
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !secret) return new Response('webhook misconfigured', { status: 400 });

  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(body, sig, secret);
  } catch (e) {
    return new Response(`bad signature: ${e instanceof Error ? e.message : 'unknown'}`, { status: 400 });
  }

  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
      const status = sub.status;
      await prisma.user.updateMany({
        where: { stripeCustomerId: customerId },
        data: { subscriptionStatus: status },
      });
      break;
    }
    case 'checkout.session.completed': {
      const cs = event.data.object as Stripe.Checkout.Session;
      const customerId = typeof cs.customer === 'string' ? cs.customer : cs.customer?.id;
      if (customerId) {
        await prisma.user.updateMany({
          where: { stripeCustomerId: customerId },
          data: { subscriptionStatus: 'active' },
        });
      }
      break;
    }
    default:
      break;
  }

  return new Response('ok', { status: 200 });
}
