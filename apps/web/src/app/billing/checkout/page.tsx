import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';
import { stripe, STRIPE_PRICE_ID, APP_URL } from '@/lib/billing/stripe';

export default async function CheckoutPage() {
  const session = await auth();
  if (!session?.user?.email) redirect('/auth/sign-in?callbackUrl=/billing/checkout');

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) redirect('/auth/sign-in');

  if (user.subscriptionStatus === 'active' || user.subscriptionStatus === 'trialing') {
    redirect('/onboarding');
  }

  const sb = stripe();
  let customerId = user.stripeCustomerId;
  if (!customerId) {
    const customer = await sb.customers.create({ email: user.email, metadata: { userId: user.id } });
    customerId = customer.id;
    await prisma.user.update({ where: { id: user.id }, data: { stripeCustomerId: customerId } });
  }

  const checkout = await sb.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: STRIPE_PRICE_ID, quantity: 1 }],
    success_url: `${APP_URL}/onboarding?checkout=success`,
    cancel_url: `${APP_URL}/?checkout=cancelled`,
    subscription_data: { trial_period_days: 7 },
    allow_promotion_codes: true,
  });

  if (!checkout.url) throw new Error('Stripe did not return a checkout URL');
  redirect(checkout.url);
}
