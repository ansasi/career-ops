import { auth } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.email) return new Response('Unauthorized', { status: 401 });
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return new Response('Unauthorized', { status: 401 });

  const app = await prisma.application.findUnique({ where: { id } });
  if (!app || app.userId !== user.id) return new Response('Not found', { status: 404 });

  const body = await req.json().catch(() => ({}));
  const { dueAt, channel = 'email', notes = '' } = body as { dueAt?: string; channel?: string; notes?: string };
  if (!dueAt) return new Response('dueAt required', { status: 400 });

  const created = await prisma.followUp.create({
    data: { applicationId: app.id, dueAt: new Date(dueAt), channel, notes },
  });
  return Response.json(created);
}
