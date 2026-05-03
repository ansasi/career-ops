import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';
import { OnboardingWizard } from './wizard';

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user?.email) redirect('/auth/sign-in?callbackUrl=/onboarding');

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { profile: true, cvs: { take: 1 } },
  });
  if (!user) redirect('/auth/sign-in');

  const paid = user.subscriptionStatus === 'active' || user.subscriptionStatus === 'trialing';
  if (!paid) redirect('/billing/checkout');

  if (user.profile && user.cvs.length > 0) redirect('/jobs');

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-2xl font-bold">Set up your profile</h1>
      <p className="mt-2 text-neutral-600">
        Three quick steps. You can change everything later in /settings.
      </p>
      <OnboardingWizard
        initial={{
          fullName: user.name ?? '',
          countries: user.profile?.countries ?? [],
          languages: user.profile?.languages ?? ['en'],
          archetypes: (user.profile?.archetypes as unknown[] | undefined) ?? [],
          keywordsPos: user.profile?.keywordsPos ?? [],
          keywordsNeg: user.profile?.keywordsNeg ?? [],
          compTarget: user.profile?.compTarget ?? '',
          headline: user.profile?.headline ?? '',
          cvMarkdown: user.cvs[0]?.markdown ?? '',
        }}
      />
    </main>
  );
}
