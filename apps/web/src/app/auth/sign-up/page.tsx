import Link from 'next/link';
import { redirect } from 'next/navigation';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { signIn } from '@/lib/auth/auth';

const signUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const sp = await searchParams;
  async function action(formData: FormData) {
    'use server';
    const parsed = signUpSchema.safeParse({
      email: formData.get('email'),
      password: formData.get('password'),
    });
    if (!parsed.success) redirect('/auth/sign-up?error=invalid');

    const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (existing?.passwordHash) redirect('/auth/sign-up?error=exists');

    const passwordHash = await bcrypt.hash(parsed.data.password, 10);
    if (existing) {
      await prisma.user.update({ where: { id: existing.id }, data: { passwordHash } });
    } else {
      await prisma.user.create({
        data: { email: parsed.data.email, passwordHash },
      });
    }

    await signIn('credentials', {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: '/billing/checkout',
    });
  }

  return (
    <main className="mx-auto max-w-md px-6 py-20">
      <h1 className="text-2xl font-bold">Create your account</h1>
      <p className="mt-2 text-sm text-neutral-600">
        7-day trial, then €15/month. Cancel anytime.
      </p>

      {sp.error && (
        <p className="mt-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
          {sp.error === 'exists'
            ? 'An account with that email already exists. Try signing in.'
            : 'Please check your inputs.'}
        </p>
      )}

      <form action={action} className="mt-6 space-y-3">
        <input
          name="email"
          type="email"
          placeholder="you@example.com"
          required
          className="w-full rounded-md border border-neutral-300 px-3 py-2"
        />
        <input
          name="password"
          type="password"
          placeholder="Password (min 8 chars)"
          required
          minLength={8}
          className="w-full rounded-md border border-neutral-300 px-3 py-2"
        />
        <button type="submit" className="w-full rounded-md bg-ink px-3 py-2 text-white">
          Create account
        </button>
      </form>

      <p className="mt-6 text-sm text-neutral-600">
        Already have one?{' '}
        <Link href="/auth/sign-in" className="underline">
          Sign in
        </Link>
      </p>
    </main>
  );
}
