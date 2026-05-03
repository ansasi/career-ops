import { auth } from '@/lib/auth/auth';
import { inngest } from '@/lib/inngest/client';

export const runtime = 'nodejs';

export async function POST(): Promise<Response> {
  const session = await auth();
  if (!session?.user?.email) return new Response('Unauthorized', { status: 401 });

  await inngest.send({ name: 'scan/run.requested', data: { trigger: 'manual' } });
  return Response.json({ queued: true });
}
