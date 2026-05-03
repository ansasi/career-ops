import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';
import { AppNav } from '@/components/AppNav';
import { EvaluatePanel } from './evaluate-panel';

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.email) redirect('/auth/sign-in');
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) redirect('/auth/sign-in');

  const job = await prisma.job.findUnique({
    where: { id },
    include: { evals: { where: { userId: user.id }, take: 1 } },
  });
  if (!job) {
    return (
      <>
        <AppNav active="jobs" />
        <main className="mx-auto max-w-3xl px-6 py-10">
          <p>Job not found.</p>
          <Link href="/jobs" className="underline">Back to feed</Link>
        </main>
      </>
    );
  }

  const existing = job.evals[0];

  return (
    <>
      <AppNav active="jobs" />
      <main className="mx-auto max-w-3xl px-6 py-10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{job.title}</h1>
            <p className="mt-1 text-neutral-600">
              {job.company} · {job.location || job.country || 'Location TBC'}
            </p>
            <a href={job.url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-sm underline">
              {job.url}
            </a>
          </div>
          {existing?.reportId && (
            <Link
              href={`/reports/${existing.reportId}`}
              className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
            >
              View report
            </Link>
          )}
        </div>

        <section className="mt-8">
          <h2 className="text-lg font-semibold">Evaluation</h2>
          <p className="text-sm text-neutral-500">
            Block A–G report streamed from your selected AI model. Saved automatically when finished.
          </p>
          <EvaluatePanel jobId={job.id} alreadyDone={existing?.status === 'done'} reportId={existing?.reportId ?? null} />
        </section>
      </main>
    </>
  );
}
