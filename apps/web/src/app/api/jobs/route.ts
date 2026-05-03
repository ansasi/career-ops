import { z } from 'zod';
import { auth } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';

const schema = z.object({
  url: z.string().url(),
  title: z.string().min(1),
  company: z.string().min(1),
  location: z.string().optional().or(z.literal('')),
  country: z.string().optional().or(z.literal('')),
});

export async function POST(req: Request): Promise<Response> {
  const session = await auth();
  if (!session?.user?.email) return new Response('Unauthorized', { status: 401 });

  const form = await req.formData();
  const parsed = schema.safeParse({
    url: form.get('url'),
    title: form.get('title'),
    company: form.get('company'),
    location: form.get('location'),
    country: form.get('country'),
  });
  if (!parsed.success) return new Response('Bad input', { status: 400 });

  const existing = await prisma.job.findUnique({ where: { url: parsed.data.url } });
  if (!existing) {
    await prisma.job.create({
      data: {
        url: parsed.data.url,
        title: parsed.data.title,
        company: parsed.data.company,
        location: parsed.data.location || null,
        country: (parsed.data.country || null)?.toUpperCase() ?? null,
        source: 'manual',
      },
    });
  }

  return Response.redirect(new URL('/jobs', req.url), 303);
}
