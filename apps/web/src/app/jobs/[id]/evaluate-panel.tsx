'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';

export function EvaluatePanel({
  jobId,
  alreadyDone,
  reportId,
}: {
  jobId: string;
  alreadyDone: boolean;
  reportId: string | null;
}) {
  const [streaming, setStreaming] = useState(false);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const aborter = useRef<AbortController | null>(null);

  const generatePdf = async () => {
    setPdfLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/cv/generate-pdf', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ jobId }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as { url: string };
      setPdfUrl(data.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setPdfLoading(false);
    }
  };

  const start = async () => {
    setError(null);
    setText('');
    setStreaming(true);
    aborter.current = new AbortController();
    try {
      const res = await fetch(`/api/jobs/${jobId}/evaluate`, {
        method: 'POST',
        signal: aborter.current.signal,
      });
      if (!res.ok || !res.body) {
        const t = await res.text().catch(() => '');
        throw new Error(t || `HTTP ${res.status}`);
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let acc = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        acc += dec.decode(value, { stream: true });
        setText(acc);
      }
    } catch (e) {
      if ((e as { name?: string }).name !== 'AbortError') {
        setError(e instanceof Error ? e.message : String(e));
      }
    } finally {
      setStreaming(false);
    }
  };

  const stop = () => {
    aborter.current?.abort();
  };

  if (alreadyDone && reportId && !text) {
    return (
      <div className="mt-4 rounded-xl border border-neutral-200 bg-white p-5">
        <p className="text-sm text-neutral-600">You&apos;ve already evaluated this job.</p>
        <Link href={`/reports/${reportId}`} className="mt-2 inline-block underline">
          Open report
        </Link>
        <button onClick={start} className="ml-3 text-sm text-neutral-500 hover:underline">
          Re-evaluate
        </button>
      </div>
    );
  }

  return (
    <div className="mt-4">
      {!streaming && !text && (
        <button onClick={start} className="rounded-md bg-ink px-4 py-2 text-white">
          Generate report
        </button>
      )}
      {streaming && (
        <button onClick={stop} className="rounded-md border border-neutral-300 px-4 py-2 text-sm">
          Stop
        </button>
      )}
      {error && <p className="mt-3 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {text && (
        <article className="prose-block mt-4 rounded-xl border border-neutral-200 bg-white p-6">
          <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{text}</pre>
        </article>
      )}

      <div className="mt-6 rounded-xl border border-neutral-200 bg-white p-5">
        <h3 className="font-semibold">Tailored CV PDF</h3>
        <p className="mt-1 text-sm text-neutral-500">
          Re-write your CV against this JD and generate an ATS-friendly PDF.
        </p>
        <div className="mt-3 flex items-center gap-3">
          <button
            onClick={generatePdf}
            disabled={pdfLoading}
            className="rounded-md bg-ink px-4 py-2 text-white disabled:opacity-50"
          >
            {pdfLoading ? 'Generating…' : 'Generate PDF'}
          </button>
          {pdfUrl && (
            <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="underline">
              Open PDF
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
