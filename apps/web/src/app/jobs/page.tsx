import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';
import { AppNav } from '@/components/AppNav';

export const dynamic = 'force-dynamic';

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; country?: string }>;
}) {
  const sp = await searchParams;
  const session = await auth();
  if (!session?.user?.email) redirect('/auth/sign-in');
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { profile: true },
  });
  if (!user) redirect('/auth/sign-in');
  if (!user.profile) redirect('/onboarding');

  const profile = user.profile;
  const search = (sp.q ?? '').trim();
  const country = (sp.country ?? '').trim().toUpperCase();

  const jobs = await prisma.job.findMany({
    where: {
      AND: [
        country
          ? { country }
          : profile.countries.length
            ? { OR: profile.countries.map((c) => ({ country: c })) }
            : {},
        search
          ? { title: { contains: search, mode: 'insensitive' } }
          : profile.keywordsPos.length
            ? {
                OR: profile.keywordsPos.map((k) => ({
                  title: { contains: k, mode: 'insensitive' as const },
                })),
              }
            : {},
        profile.keywordsNeg.length
          ? {
              AND: profile.keywordsNeg.map((k) => ({
                NOT: { title: { contains: k, mode: 'insensitive' as const } },
              })),
            }
          : {},
        { evals: { none: { userId: user.id } } },
        { liveness: { not: 'expired' } },
      ],
    },
    orderBy: { firstSeenAt: 'desc' },
    take: 100,
  });

  return (
    <>
      <AppNav active="jobs" />
      <main className="mx-auto max-w-5xl px-6 py-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Jobs</h1>
          <form action="/api/scan/trigger" method="POST">
            <button type="submit" className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm">
              Run scan now
            </button>
          </form>
        </div>

        <form className="mt-6 flex gap-2" method="GET">
          <input
            name="q"
            defaultValue={search}
            placeholder="Title contains…"
            className="flex-1 rounded-md border border-neutral-300 px-3 py-2"
          />
          <input
            name="country"
            defaultValue={country}
            placeholder="Country (DE, FR, …)"
            className="w-40 rounded-md border border-neutral-300 px-3 py-2"
          />
          <button className="rounded-md border border-neutral-300 px-3 py-2">Filter</button>
        </form>

        <p className="mt-4 text-sm text-neutral-500">
          {jobs.length} job{jobs.length === 1 ? '' : 's'} matching your profile.
        </p>

        <ul className="mt-4 divide-y divide-neutral-200 rounded-xl border border-neutral-200 bg-white">
          {jobs.length === 0 && (
            <li className="p-6 text-sm text-neutral-500">
              No jobs yet. Hit &quot;Run scan now&quot; to populate the feed, or add a job manually.
            </li>
          )}
          {jobs.map((j) => (
            <li key={j.id} className="flex items-start justify-between gap-4 px-5 py-3">
              <div>
                <Link href={`/jobs/${j.id}`} className="font-medium hover:underline">
                  {j.title}
                </Link>
                <p className="text-sm text-neutral-500">
                  {j.company} · {j.location || j.country || 'Location TBC'} · {j.source}
                </p>
              </div>
              <span className="text-xs text-neutral-400">
                {j.firstSeenAt.toISOString().slice(0, 10)}
              </span>
            </li>
          ))}
        </ul>

        <ManualAdd />
      </main>
    </>
  );
}

function ManualAdd() {
  return (
    <details className="mt-8 rounded-xl border border-neutral-200 bg-white p-4">
      <summary className="cursor-pointer text-sm font-medium">Add job manually</summary>
      <form action="/api/jobs" method="POST" className="mt-4 grid gap-3 sm:grid-cols-2">
        <input name="url" required placeholder="https://…" className="input col-span-2 rounded-md border border-neutral-300 px-3 py-2" />
        <input name="title" required placeholder="Title" className="rounded-md border border-neutral-300 px-3 py-2" />
        <input name="company" required placeholder="Company" className="rounded-md border border-neutral-300 px-3 py-2" />
        <input name="location" placeholder="Location" className="rounded-md border border-neutral-300 px-3 py-2" />
        <input name="country" placeholder="Country (ISO-2)" className="rounded-md border border-neutral-300 px-3 py-2" />
        <button className="col-span-2 rounded-md bg-ink px-4 py-2 text-white">Add to feed</button>
      </form>
    </details>
  );
}
