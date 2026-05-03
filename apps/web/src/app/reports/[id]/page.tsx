import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';
import { AppNav } from '@/components/AppNav';

export const dynamic = 'force-dynamic';

export default async function ReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.email) redirect('/auth/sign-in');
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) redirect('/auth/sign-in');

  const report = await prisma.report.findUnique({
    where: { id },
    include: { evaluation: { include: { job: true } } },
  });
  if (!report || report.userId !== user.id) notFound();

  const ev = report.evaluation;

  return (
    <>
      <AppNav active="jobs" />
      <main className="mx-auto max-w-3xl px-6 py-10">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">{ev?.job.title ?? 'Report'}</h1>
            <p className="mt-1 text-neutral-600">{ev?.job.company}</p>
          </div>
          <div className="text-right text-sm">
            <Badge label={`Score ${ev?.score?.toFixed(1) ?? '—'}/5`} />
            <Badge label={`Legitimacy: ${ev?.legitimacy ?? '—'}`} />
            <p className="mt-1 text-xs text-neutral-400">model: {report.modelUsed}</p>
          </div>
        </div>

        <article className="prose-block mt-6 rounded-xl border border-neutral-200 bg-white p-6">
          <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{report.markdown}</pre>
        </article>

        <div className="mt-6 flex gap-3">
          <MarkApplied jobId={report.jobId} reportId={report.id} />
          <Link href={`/jobs/${report.jobId}`} className="rounded-md border border-neutral-300 px-4 py-2">
            Back to job
          </Link>
        </div>
      </main>
    </>
  );
}

function Badge({ label }: { label: string }) {
  return (
    <span className="ml-2 inline-block rounded-full border border-neutral-200 bg-white px-2 py-0.5 text-xs">
      {label}
    </span>
  );
}

function MarkApplied({ jobId, reportId }: { jobId: string; reportId: string }) {
  return (
    <form action="/api/applications" method="POST">
      <input type="hidden" name="jobId" value={jobId} />
      <input type="hidden" name="reportId" value={reportId} />
      <input type="hidden" name="status" value="applied" />
      <button type="submit" className="rounded-md bg-ink px-4 py-2 text-white">
        Mark applied
      </button>
    </form>
  );
}
