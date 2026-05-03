import Link from 'next/link';
import { signIn } from '@/lib/auth/auth';

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const callbackUrl = sp.callbackUrl ?? '/onboarding';

  async function credentialsAction(formData: FormData) {
    'use server';
    await signIn('credentials', {
      email: formData.get('email'),
      password: formData.get('password'),
      redirectTo: callbackUrl,
    });
  }

  async function googleAction() {
    'use server';
    await signIn('google', { redirectTo: callbackUrl });
  }

  return (
    <main className="mx-auto max-w-md px-6 py-20">
      <h1 className="text-2xl font-bold">Sign in</h1>

      {sp.error && (
        <p className="mt-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
          {sp.error === 'CredentialsSignin' ? 'Wrong email or password.' : sp.error}
        </p>
      )}

      <form action={credentialsAction} className="mt-6 space-y-3">
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
          placeholder="Password"
          required
          minLength={8}
          className="w-full rounded-md border border-neutral-300 px-3 py-2"
        />
        <button type="submit" className="w-full rounded-md bg-ink px-3 py-2 text-white">
          Sign in
        </button>
      </form>

      <div className="my-6 text-center text-sm text-neutral-500">or</div>

      <form action={googleAction}>
        <button type="submit" className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2">
          Continue with Google
        </button>
      </form>

      <p className="mt-6 text-sm text-neutral-600">
        New here?{' '}
        <Link href="/auth/sign-up" className="underline">
          Create an account
        </Link>
      </p>
    </main>
  );
}
