import Link from 'next/link';

export default function LandingPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-20">
      <h1 className="text-4xl font-bold tracking-tight">career-ops</h1>
      <p className="mt-3 text-lg text-neutral-600">
        AI-curated job feed, A&ndash;G evaluation reports, and tailored CVs &mdash; without
        the search-and-spam grind.
      </p>

      <section className="mt-12 grid gap-4 sm:grid-cols-3">
        <Card title="Curated feed">
          A daily scan of 45+ portals, filtered to your countries, archetypes, and target keywords.
        </Card>
        <Card title="Block A&ndash;G reports">
          Per-job analysis: archetype, fit score, comp signal, legitimacy, and a recommended response.
        </Card>
        <Card title="Tailored CV PDF">
          ATS-optimized PDF generated from your markdown CV against the JD &mdash; one click.
        </Card>
      </section>

      <section className="mt-16 rounded-2xl border border-neutral-200 bg-white p-8">
        <h2 className="text-xl font-semibold">€15 / month</h2>
        <p className="mt-1 text-neutral-600">
          7-day trial, cancel anytime. Covers AI cost &mdash; we don&apos;t make money on free tiers.
        </p>
        <Link
          href="/billing/checkout"
          className="mt-6 inline-block rounded-lg bg-ink px-5 py-2.5 text-white"
        >
          Start trial
        </Link>
        <Link href="/auth/sign-in" className="ml-3 text-neutral-600 underline">
          Sign in
        </Link>
      </section>

      <footer className="mt-20 text-sm text-neutral-500">
        <p>
          Open source CLI:{' '}
          <a href="https://github.com/santifer/career-ops" className="underline">
            github.com/santifer/career-ops
          </a>
        </p>
      </footer>
    </main>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5">
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-neutral-600">{children}</p>
    </div>
  );
}
