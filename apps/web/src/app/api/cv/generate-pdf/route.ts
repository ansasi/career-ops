import { z } from 'zod';
import { auth } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';
import { tailorCv } from '@/lib/ai/cv';
import { renderCvPdf } from '@/lib/pdf/render';
import { uploadPdf } from '@/lib/storage/supabase';

export const runtime = 'nodejs';
export const maxDuration = 120;

const schema = z.object({
  jobId: z.string().min(1),
  cvId: z.string().min(1).optional(),
});

export async function POST(req: Request): Promise<Response> {
  const session = await auth();
  if (!session?.user?.email) return new Response('Unauthorized', { status: 401 });
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { profile: true, cvs: true },
  });
  if (!user || !user.profile) return new Response('Profile required', { status: 412 });

  const paid = user.subscriptionStatus === 'active' || user.subscriptionStatus === 'trialing';
  if (!paid) return new Response('Payment required', { status: 402 });

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return new Response('Bad input', { status: 400 });

  const job = await prisma.job.findUnique({ where: { id: parsed.data.jobId } });
  if (!job) return new Response('Job not found', { status: 404 });

  const cv =
    (parsed.data.cvId ? user.cvs.find((c) => c.id === parsed.data.cvId) : null) ??
    user.cvs.find((c) => c.isDefault) ??
    user.cvs[0];
  if (!cv) return new Response('No CV on file', { status: 412 });

  const tailored = await tailorCv({
    cvMarkdown: cv.markdown,
    jdText: job.jdText ?? '',
    jobTitle: job.title,
    company: job.company,
    profile: {
      fullName: user.profile.fullName,
      headline: user.profile.headline,
      languages: user.profile.languages,
      archetypes: user.profile.archetypes,
    },
    preferredModel: user.profile.preferredModel,
  });

  const meta = [user.email, user.profile.headline].filter(Boolean).join(' · ');
  const pdf = await renderCvPdf({
    name: user.profile.fullName,
    headline: user.profile.headline,
    meta,
    bodyMarkdown: tailored.markdown,
  });

  const slug = `${user.id}/${job.id}-${Date.now()}.pdf`;
  const url = await uploadPdf(pdf, slug);

  await prisma.application.upsert({
    where: { userId_jobId: { userId: user.id, jobId: job.id } },
    create: { userId: user.id, jobId: job.id, status: 'evaluated', pdfUrl: url },
    update: { pdfUrl: url },
  });

  return Response.json({ url, modelUsed: tailored.modelUsed });
}
