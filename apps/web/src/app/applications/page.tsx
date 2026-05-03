import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';
import { AppNav } from '@/components/AppNav';
import { DEFAULT_STATES } from '@career-ops/core/states';

export const dynamic = 'force-dynamic';

export default async function ApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const sp = await searchParams;
  const session = await auth();
  if (!session?.user?.email) redirect('/auth/sign-in');
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) redirect('/auth/sign-in');

  const filter = (sp.status ?? '').trim();
  const apps = await prisma.application.findMany({
    where: { userId: user.id, ...(filter ? { status: filter } : {}) },
    include: { job: true, followUps: { where: { doneAt: null }, take: 1 } },
    orderBy: { appliedAt: 'desc' },
  });

  return (
    <>
      <AppNav active="applications" />
      <main className="mx-auto max-w-5xl px-6 py-8">
        <h1 className="text-2xl font-bold">Applications</h1>

        <div className="mt-4 flex flex-wrap gap-1 text-sm">
          <FilterLink label="All" active={!filter} href="/applications" />
          {DEFAULT_STATES.map((s) => (
            <FilterLink
              key={s.id}
              label={s.label}
              active={filter === s.id}
              href={`/applications?status=${s.id}`}
            />
          ))}
        </div>

        <ul className="mt-6 divide-y divide-neutral-200 rounded-xl border border-neutral-200 bg-white">
          {apps.length === 0 && <li className="p-6 text-sm text-neutral-500">No applications yet.</li>}
          {apps.map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-4 px-5 py-3">
              <div>
                <Link href={`/applications/${a.id}`} className="font-medium hover:underline">
                  {a.job.title}
                </Link>
                <p className="text-sm text-neutral-500">
                  {a.job.company} · {a.job.location || a.job.country || '—'}
                </p>
              </div>
              <div className="text-right text-xs">
                <span className="rounded-full border border-neutral-200 bg-white px-2 py-0.5">
                  {a.status}
                </span>
                {a.appliedAt && (
                  <p className="mt-1 text-neutral-400">{a.appliedAt.toISOString().slice(0, 10)}</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      </main>
    </>
  );
}

function FilterLink({ label, active, href }: { label: string; active: boolean; href: string }) {
  return (
    <Link
      href={href}
      className={`rounded-md px-3 py-1 ${active ? 'bg-ink text-white' : 'border border-neutral-200 bg-white'}`}
    >
      {label}
    </Link>
  );
}
