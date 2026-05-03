import type { NextRequest } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';
import { runEvaluation, summarizeReport } from '@/lib/ai/evaluate';

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.email) return new Response('Unauthorized', { status: 401 });

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { profile: true, cvs: { where: { isDefault: true }, take: 1 } },
  });
  if (!user || !user.profile || !user.cvs[0]) return new Response('Onboarding required', { status: 412 });

  const paid = user.subscriptionStatus === 'active' || user.subscriptionStatus === 'trialing';
  if (!paid) return new Response('Payment required', { status: 402 });

  const job = await prisma.job.findUnique({ where: { id } });
  if (!job) return new Response('Not found', { status: 404 });

  // Ensure JD text is fetched before we hand to the model.
  let jdText = job.jdText;
  if (!jdText) {
    try {
      const r = await fetch(job.url, { redirect: 'follow', headers: { 'User-Agent': 'career-ops/1.0' } });
      jdText = (await r.text()).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 30_000);
      await prisma.job.update({ where: { id: job.id }, data: { jdText } });
    } catch {
      jdText = '';
    }
  }

  const evaluation = await prisma.jobEvaluation.upsert({
    where: { userId_jobId: { userId: user.id, jobId: job.id } },
    create: { userId: user.id, jobId: job.id, status: 'running' },
    update: { status: 'running' },
  });

  const { stream, modelUsed } = runEvaluation({
    jdText: jdText ?? '',
    jdUrl: job.url,
    jobTitle: job.title,
    company: job.company,
    cvMarkdown: user.cvs[0].markdown,
    profile: {
      fullName: user.profile.fullName,
      countries: user.profile.countries,
      languages: user.profile.languages,
      archetypes: user.profile.archetypes,
      keywordsPos: user.profile.keywordsPos,
      keywordsNeg: user.profile.keywordsNeg,
      compTarget: user.profile.compTarget,
      headline: user.profile.headline,
    },
    preferredModel: user.profile.preferredModel,
  });

  // Persist when the stream finishes, in the background.
  void (async () => {
    try {
      const markdown = await stream.text;
      const summary = await summarizeReport(markdown, user.profile?.preferredModel);
      const report = await prisma.report.create({
        data: {
          userId: user.id,
          jobId: job.id,
          markdown,
          blocks: summary.blocks,
          modelUsed,
        },
      });
      await prisma.jobEvaluation.update({
        where: { id: evaluation.id },
        data: {
          status: 'done',
          score: summary.score,
          archetype: summary.archetype,
          legitimacy: summary.legitimacy,
          reportId: report.id,
        },
      });
    } catch (e) {
      await prisma.jobEvaluation.update({
        where: { id: evaluation.id },
        data: { status: 'error' },
      });
      console.error('evaluate failed', e);
    }
  })();

  return stream.toTextStreamResponse();
}
