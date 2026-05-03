import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';
import { stripe, APP_URL } from '@/lib/billing/stripe';

export default async function BillingPortalPage() {
  const session = await auth();
  if (!session?.user?.email) redirect('/auth/sign-in');

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user?.stripeCustomerId) redirect('/billing/checkout');

  const portal = await stripe().billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${APP_URL}/settings`,
  });
  redirect(portal.url);
}
