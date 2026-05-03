import Link from 'next/link';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';
import { AppNav } from '@/components/AppNav';
import { CURATED_MODELS, DEFAULT_MODEL } from '@/lib/ai/provider';

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.email) redirect('/auth/sign-in');
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { profile: true },
  });
  if (!user) redirect('/auth/sign-in');
  if (!user.profile) redirect('/onboarding');

  async function updateProfile(formData: FormData) {
    'use server';
    const sess = await auth();
    if (!sess?.user?.email) return;
    const u = await prisma.user.findUnique({ where: { email: sess.user.email } });
    if (!u) return;

    const fullName = String(formData.get('fullName') ?? '').trim();
    const headline = String(formData.get('headline') ?? '').trim();
    const compTarget = String(formData.get('compTarget') ?? '').trim();
    const preferredModel = String(formData.get('preferredModel') ?? '').trim();
    const countries = String(formData.get('countries') ?? '')
      .split(',').map((s) => s.trim().toUpperCase()).filter(Boolean);
    const keywordsPos = String(formData.get('keywordsPos') ?? '')
      .split(',').map((s) => s.trim()).filter(Boolean);
    const keywordsNeg = String(formData.get('keywordsNeg') ?? '')
      .split(',').map((s) => s.trim()).filter(Boolean);

    await prisma.profile.update({
      where: { userId: u.id },
      data: {
        fullName,
        headline: headline || null,
        compTarget: compTarget || null,
        preferredModel: preferredModel || null,
        countries,
        keywordsPos,
        keywordsNeg,
      },
    });
    if (fullName) {
      await prisma.user.update({ where: { id: u.id }, data: { name: fullName } });
    }
    revalidatePath('/settings');
  }

  const profile = user.profile;

  return (
    <>
      <AppNav active="settings" />
      <main className="mx-auto max-w-3xl px-6 py-8">
        <h1 className="text-2xl font-bold">Settings</h1>

        <section className="mt-8 rounded-xl border border-neutral-200 bg-white p-6">
          <h2 className="text-lg font-semibold">Profile</h2>
          <form action={updateProfile} className="mt-4 grid gap-4">
            <Field label="Full name" name="fullName" defaultValue={profile.fullName} />
            <Field label="Headline" name="headline" defaultValue={profile.headline ?? ''} />
            <Field
              label="Countries (comma-separated ISO-2)"
              name="countries"
              defaultValue={profile.countries.join(', ')}
            />
            <Field
              label="Title keywords (positive)"
              name="keywordsPos"
              defaultValue={profile.keywordsPos.join(', ')}
            />
            <Field
              label="Title keywords (negative)"
              name="keywordsNeg"
              defaultValue={profile.keywordsNeg.join(', ')}
            />
            <Field label="Comp target" name="compTarget" defaultValue={profile.compTarget ?? ''} />

            <label className="block">
              <span className="block text-sm font-medium">AI model</span>
              <select
                name="preferredModel"
                defaultValue={profile.preferredModel ?? ''}
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2"
              >
                <option value="">Default ({process.env.AI_MODEL ?? DEFAULT_MODEL})</option>
                {CURATED_MODELS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </label>

            <button className="mt-2 self-start rounded-md bg-ink px-4 py-2 text-white">Save</button>
          </form>
        </section>

        <section className="mt-6 rounded-xl border border-neutral-200 bg-white p-6">
          <h2 className="text-lg font-semibold">Billing</h2>
          <p className="mt-1 text-sm text-neutral-500">
            Status: <strong>{user.subscriptionStatus}</strong>
          </p>
          <Link
            href="/billing/portal"
            className="mt-3 inline-block rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
          >
            Manage subscription
          </Link>
        </section>
      </main>
    </>
  );
}

function Field({
  label,
  name,
  defaultValue,
}: {
  label: string;
  name: string;
  defaultValue: string;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-medium">{label}</span>
      <input
        name={name}
        defaultValue={defaultValue}
        className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2"
      />
    </label>
  );
}
