import { auth } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';
import { normalizeStatus } from '@career-ops/core/states';

export const runtime = 'nodejs';

export async function POST(req: Request): Promise<Response> {
  const session = await auth();
  if (!session?.user?.email) return new Response('Unauthorized', { status: 401 });
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return new Response('Unauthorized', { status: 401 });

  const form = await req.formData();
  const jobId = String(form.get('jobId') ?? '');
  const reportId = (form.get('reportId') as string) || null;
  const status = normalizeStatus(String(form.get('status') ?? 'applied'));
  if (!jobId) return new Response('Missing jobId', { status: 400 });

  const appliedAt = status === 'applied' ? new Date() : null;

  await prisma.application.upsert({
    where: { userId_jobId: { userId: user.id, jobId } },
    create: { userId: user.id, jobId, status, reportId, appliedAt },
    update: { status, reportId: reportId ?? undefined, appliedAt: appliedAt ?? undefined },
  });

  return Response.redirect(new URL('/applications', req.url), 303);
}
