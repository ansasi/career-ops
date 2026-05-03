'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { saveOnboarding } from './actions';

interface InitialState {
  fullName: string;
  countries: string[];
  languages: string[];
  archetypes: unknown[];
  keywordsPos: string[];
  keywordsNeg: string[];
  compTarget: string;
  headline: string;
  cvMarkdown: string;
}

export function OnboardingWizard({ initial }: { initial: InitialState }) {
  const [step, setStep] = useState(1);
  const [state, setState] = useState({
    fullName: initial.fullName,
    countries: initial.countries.join(', ') || 'DE, FR, ES, REMOTE',
    languages: initial.languages.join(', ') || 'en',
    archetypes: JSON.stringify(initial.archetypes.length ? initial.archetypes : sampleArchetypes(), null, 2),
    keywordsPos: initial.keywordsPos.join(', ') || 'AI, ML, LLM, Agent, Platform Engineer',
    keywordsNeg: initial.keywordsNeg.join(', ') || 'Junior, Intern, .NET, iOS',
    compTarget: initial.compTarget || '€80K-120K',
    headline: initial.headline,
    cvMarkdown: initial.cvMarkdown,
    error: '' as string,
  });
  const [pending, start] = useTransition();
  const router = useRouter();

  const update = (k: keyof typeof state) => (e: { target: { value: string } }) =>
    setState((s) => ({ ...s, [k]: e.target.value, error: '' }));

  const submit = (): void => {
    start(async () => {
      const r = await saveOnboarding({
        fullName: state.fullName,
        countries: split(state.countries).map((c) => c.toUpperCase()),
        languages: split(state.languages),
        archetypes: tryParse(state.archetypes),
        keywordsPos: split(state.keywordsPos),
        keywordsNeg: split(state.keywordsNeg),
        compTarget: state.compTarget || null,
        headline: state.headline || null,
        cvMarkdown: state.cvMarkdown,
      });
      if (r.ok) router.push('/jobs');
      else setState((s) => ({ ...s, error: r.error }));
    });
  };

  return (
    <div className="mt-8">
      <Stepper step={step} />

      {step === 1 && (
        <div className="space-y-4">
          <Field label="Your name">
            <input className="input" value={state.fullName} onChange={update('fullName')} />
          </Field>
          <Field label="Countries you'd accept work in (ISO-2 codes, comma-separated)">
            <input className="input" value={state.countries} onChange={update('countries')} />
            <p className="hint">e.g., DE, FR, ES, REMOTE</p>
          </Field>
          <Field label="Languages you read JDs in">
            <input className="input" value={state.languages} onChange={update('languages')} />
            <p className="hint">en, de, fr, ja</p>
          </Field>
          <NavRow onNext={() => setStep(2)} />
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <Field label="Target archetypes (JSON)">
            <textarea
              className="input font-mono text-xs"
              rows={10}
              value={state.archetypes}
              onChange={update('archetypes')}
            />
            <p className="hint">name, level, fit (primary | secondary | adjacent)</p>
          </Field>
          <Field label="Title keywords (positive, comma-separated)">
            <input className="input" value={state.keywordsPos} onChange={update('keywordsPos')} />
          </Field>
          <Field label="Title keywords (negative, comma-separated)">
            <input className="input" value={state.keywordsNeg} onChange={update('keywordsNeg')} />
          </Field>
          <Field label="Target compensation">
            <input className="input" value={state.compTarget} onChange={update('compTarget')} />
          </Field>
          <NavRow onBack={() => setStep(1)} onNext={() => setStep(3)} />
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <Field label="One-line headline (optional)">
            <input className="input" value={state.headline} onChange={update('headline')} />
          </Field>
          <Field label="Your CV (Markdown)">
            <textarea
              className="input font-mono text-xs"
              rows={18}
              value={state.cvMarkdown}
              onChange={update('cvMarkdown')}
              placeholder="# Jane Smith&#10;## Summary&#10;..."
            />
            <p className="hint">Paste your CV in markdown. Standard sections: Summary, Experience, Projects, Skills.</p>
          </Field>

          {state.error && <p className="text-sm text-red-700">{state.error}</p>}

          <NavRow
            onBack={() => setStep(2)}
            onNext={submit}
            nextLabel={pending ? 'Saving…' : 'Finish'}
            nextDisabled={pending}
          />
        </div>
      )}

      <style jsx>{`
        .input { @apply w-full rounded-md border border-neutral-300 px-3 py-2; }
        .hint { @apply mt-1 text-xs text-neutral-500; }
      `}</style>
    </div>
  );
}

function Stepper({ step }: { step: number }) {
  return (
    <div className="mb-6 flex items-center gap-2 text-sm text-neutral-500">
      {[1, 2, 3].map((n) => (
        <span
          key={n}
          className={n === step ? 'font-semibold text-ink' : n < step ? 'text-ink' : ''}
        >
          {n === 1 ? 'Where & language' : n === 2 ? 'Roles & filters' : 'CV'}
          {n < 3 && <span className="mx-2">·</span>}
        </span>
      ))}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function NavRow({
  onBack,
  onNext,
  nextLabel = 'Next',
  nextDisabled = false,
}: {
  onBack?: () => void;
  onNext: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
}) {
  return (
    <div className="flex justify-between pt-4">
      {onBack ? (
        <button type="button" onClick={onBack} className="rounded-md border border-neutral-300 px-4 py-2">
          Back
        </button>
      ) : (
        <span />
      )}
      <button
        type="button"
        onClick={onNext}
        disabled={nextDisabled}
        className="rounded-md bg-ink px-4 py-2 text-white disabled:opacity-50"
      >
        {nextLabel}
      </button>
    </div>
  );
}

function split(s: string): string[] {
  return s.split(',').map((x) => x.trim()).filter(Boolean);
}

function tryParse(s: string): unknown[] {
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function sampleArchetypes(): unknown[] {
  return [
    { name: 'AI/ML Engineer', level: 'Senior/Staff', fit: 'primary' },
    { name: 'Platform Engineer', level: 'Senior', fit: 'secondary' },
    { name: 'Solutions Architect', level: 'Senior', fit: 'adjacent' },
  ];
}
