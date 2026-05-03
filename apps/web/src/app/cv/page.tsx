import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';
import { AppNav } from '@/components/AppNav';
import { CvEditor } from './editor';

export default async function CvPage() {
  const session = await auth();
  if (!session?.user?.email) redirect('/auth/sign-in');
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { cvs: { orderBy: { updatedAt: 'desc' } } },
  });
  if (!user) redirect('/auth/sign-in');

  const cv = user.cvs.find((c) => c.isDefault) ?? user.cvs[0];

  async function save(formData: FormData) {
    'use server';
    const sess = await auth();
    if (!sess?.user?.email) return;
    const u = await prisma.user.findUnique({ where: { email: sess.user.email } });
    if (!u) return;
    const markdown = String(formData.get('markdown') ?? '');
    const existing = await prisma.cV.findFirst({ where: { userId: u.id, isDefault: true } });
    if (existing) {
      await prisma.cV.update({ where: { id: existing.id }, data: { markdown } });
    } else {
      await prisma.cV.create({ data: { userId: u.id, label: 'default', markdown, isDefault: true } });
    }
    revalidatePath('/cv');
  }

  return (
    <>
      <AppNav active="cv" />
      <main className="mx-auto max-w-5xl px-6 py-8">
        <h1 className="text-2xl font-bold">Your CV</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Source markdown. Used as the basis for tailored PDFs against each job.
        </p>
        <CvEditor save={save} initial={cv?.markdown ?? '# Your Name\n## Summary\n\n…'} />
      </main>
    </>
  );
}
