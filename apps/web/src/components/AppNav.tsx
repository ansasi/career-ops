import Link from 'next/link';
import { signOut } from '@/lib/auth/auth';

export function AppNav({ active }: { active: 'jobs' | 'applications' | 'cv' | 'settings' }) {
  async function logout() {
    'use server';
    await signOut({ redirectTo: '/' });
  }

  const linkCls = (k: string) =>
    `px-3 py-1.5 rounded-md ${active === k ? 'bg-ink text-white' : 'hover:bg-neutral-100'}`;

  return (
    <header className="border-b border-neutral-200 bg-white">
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3 text-sm">
        <Link href="/jobs" className="font-semibold">
          career-ops
        </Link>
        <div className="flex items-center gap-1">
          <Link className={linkCls('jobs')} href="/jobs">Jobs</Link>
          <Link className={linkCls('applications')} href="/applications">Applications</Link>
          <Link className={linkCls('cv')} href="/cv">CV</Link>
          <Link className={linkCls('settings')} href="/settings">Settings</Link>
          <form action={logout} className="ml-2">
            <button type="submit" className="text-neutral-500 hover:underline">Sign out</button>
          </form>
        </div>
      </nav>
    </header>
  );
}
