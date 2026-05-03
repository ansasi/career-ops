'use server';

import { auth } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const archetypeSchema = z.object({
  name: z.string().min(1),
  level: z.string().min(1),
  fit: z.enum(['primary', 'secondary', 'adjacent']),
});

const inputSchema = z.object({
  fullName: z.string().min(1),
  countries: z.array(z.string().min(2)).min(1),
  languages: z.array(z.enum(['en', 'de', 'fr', 'ja'])).min(1),
  archetypes: z.array(archetypeSchema).min(1),
  keywordsPos: z.array(z.string()).min(1),
  keywordsNeg: z.array(z.string()).default([]),
  compTarget: z.string().nullable(),
  headline: z.string().nullable(),
  cvMarkdown: z.string().min(50),
});

export async function saveOnboarding(input: unknown): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth();
  if (!session?.user?.email) return { ok: false, error: 'Not signed in' };

  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.errors[0];
    return { ok: false, error: `${first.path.join('.')}: ${first.message}` };
  }

  const data = parsed.data;
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return { ok: false, error: 'User not found' };

  await prisma.user.update({ where: { id: user.id }, data: { name: data.fullName } });

  await prisma.profile.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      fullName: data.fullName,
      headline: data.headline,
      countries: data.countries,
      languages: data.languages,
      archetypes: data.archetypes,
      keywordsPos: data.keywordsPos,
      keywordsNeg: data.keywordsNeg,
      compTarget: data.compTarget,
      rawYaml: { source: 'onboarding-v1' },
    },
    update: {
      fullName: data.fullName,
      headline: data.headline,
      countries: data.countries,
      languages: data.languages,
      archetypes: data.archetypes,
      keywordsPos: data.keywordsPos,
      keywordsNeg: data.keywordsNeg,
      compTarget: data.compTarget,
    },
  });

  const existingCv = await prisma.cV.findFirst({ where: { userId: user.id, isDefault: true } });
  if (existingCv) {
    await prisma.cV.update({ where: { id: existingCv.id }, data: { markdown: data.cvMarkdown } });
  } else {
    await prisma.cV.create({
      data: { userId: user.id, label: 'default', markdown: data.cvMarkdown, isDefault: true },
    });
  }

  return { ok: true };
}
