import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';
import { AppNav } from '@/components/AppNav';
import { DEFAULT_STATES } from '@career-ops/core/states';

export default async function ApplicationDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.email) redirect('/auth/sign-in');
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) redirect('/auth/sign-in');

  const app = await prisma.application.findUnique({
    where: { id },
    include: { job: true, followUps: { orderBy: { dueAt: 'asc' } } },
  });
  if (!app || app.userId !== user.id) notFound();

  async function setStatus(formData: FormData) {
    'use server';
    const id = String(formData.get('id'));
    const status = String(formData.get('status'));
    await prisma.application.update({ where: { id }, data: { status } });
    revalidatePath(`/applications/${id}`);
  }

  async function addFollowUp(formData: FormData) {
    'use server';
    const dueIso = String(formData.get('dueAt'));
    const channel = String(formData.get('channel') ?? 'email');
    const notes = String(formData.get('notes') ?? '');
    await prisma.followUp.create({
      data: { applicationId: app!.id, dueAt: new Date(dueIso), channel, notes },
    });
    revalidatePath(`/applications/${app!.id}`);
  }

  async function completeFollowUp(formData: FormData) {
    'use server';
    const id = String(formData.get('id'));
    await prisma.followUp.update({ where: { id }, data: { doneAt: new Date() } });
    revalidatePath(`/applications/${app!.id}`);
  }

  return (
    <>
      <AppNav active="applications" />
      <main className="mx-auto max-w-3xl px-6 py-10">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">{app.job.title}</h1>
            <p className="mt-1 text-neutral-600">{app.job.company}</p>
            <a href={app.job.url} target="_blank" rel="noopener noreferrer" className="text-sm underline">
              {app.job.url}
            </a>
          </div>
          {app.reportId && (
            <Link href={`/reports/${app.reportId}`} className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm">
              Report
            </Link>
          )}
        </div>

        <section className="mt-8">
          <h2 className="text-lg font-semibold">Status</h2>
          <form action={setStatus} className="mt-2 flex items-center gap-2">
            <input type="hidden" name="id" value={app.id} />
            <select name="status" defaultValue={app.status} className="rounded-md border border-neutral-300 px-3 py-2">
              {DEFAULT_STATES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
            <button className="rounded-md bg-ink px-3 py-2 text-sm text-white">Update</button>
          </form>
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-semibold">Follow-ups</h2>
          <ul className="mt-2 space-y-2">
            {app.followUps.length === 0 && (
              <li className="text-sm text-neutral-500">No follow-ups scheduled.</li>
            )}
            {app.followUps.map((f) => (
              <li
                key={f.id}
                className={`flex items-center justify-between rounded-md border border-neutral-200 bg-white px-4 py-2 text-sm ${
                  f.doneAt ? 'text-neutral-400 line-through' : ''
                }`}
              >
                <div>
                  <span className="font-medium">{f.dueAt.toISOString().slice(0, 10)}</span>
                  <span className="ml-2 text-neutral-500">{f.channel}</span>
                  {f.notes && <span className="ml-2">— {f.notes}</span>}
                </div>
                {!f.doneAt && (
                  <form action={completeFollowUp}>
                    <input type="hidden" name="id" value={f.id} />
                    <button className="text-xs underline">Mark done</button>
                  </form>
                )}
              </li>
            ))}
          </ul>

          <form action={addFollowUp} className="mt-4 grid grid-cols-3 gap-2">
            <input
              name="dueAt"
              type="date"
              required
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
            />
            <select name="channel" className="rounded-md border border-neutral-300 px-3 py-2 text-sm">
              <option value="email">Email</option>
              <option value="linkedin">LinkedIn</option>
              <option value="other">Other</option>
            </select>
            <input
              name="notes"
              placeholder="Notes…"
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
            />
            <button className="col-span-3 rounded-md bg-ink px-3 py-2 text-sm text-white">
              Add follow-up
            </button>
          </form>
        </section>

        {app.pdfUrl && (
          <section className="mt-8">
            <h2 className="text-lg font-semibold">CV PDF</h2>
            <a href={app.pdfUrl} className="mt-1 inline-block underline" target="_blank" rel="noopener noreferrer">
              Download tailored CV
            </a>
          </section>
        )}
      </main>
    </>
  );
}
