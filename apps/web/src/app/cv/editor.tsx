'use client';

import { useState, useTransition } from 'react';
import { markdownPreview } from './preview';

export function CvEditor({
  save,
  initial,
}: {
  save: (formData: FormData) => Promise<void>;
  initial: string;
}) {
  const [md, setMd] = useState(initial);
  const [pending, start] = useTransition();
  const [savedAt, setSavedAt] = useState<string | null>(null);

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-2">
      <form
        action={(fd) => {
          fd.set('markdown', md);
          start(async () => {
            await save(fd);
            setSavedAt(new Date().toISOString().slice(11, 19));
          });
        }}
      >
        <textarea
          name="markdown"
          value={md}
          onChange={(e) => setMd(e.target.value)}
          rows={28}
          className="w-full rounded-lg border border-neutral-300 bg-white p-4 font-mono text-xs"
        />
        <div className="mt-3 flex items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-ink px-4 py-2 text-white disabled:opacity-50"
          >
            {pending ? 'Saving…' : 'Save'}
          </button>
          {savedAt && <span className="text-sm text-neutral-500">Saved at {savedAt}</span>}
        </div>
      </form>

      <article
        className="prose-block rounded-lg border border-neutral-200 bg-white p-6"
        dangerouslySetInnerHTML={{ __html: markdownPreview(md) }}
      />
    </div>
  );
}
