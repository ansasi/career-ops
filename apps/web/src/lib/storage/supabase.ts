import { createClient } from '@supabase/supabase-js';

let cached: ReturnType<typeof createClient> | null = null;

export function storage() {
  if (cached) return cached;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing');
  cached = createClient(url, key, { auth: { persistSession: false } });
  return cached;
}

export const PDF_BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? 'cv-pdfs';

export async function uploadPdf(buffer: Uint8Array, key: string): Promise<string> {
  const sb = storage();
  const { error } = await sb.storage.from(PDF_BUCKET).upload(key, buffer, {
    contentType: 'application/pdf',
    upsert: true,
  });
  if (error) throw error;
  const { data } = await sb.storage.from(PDF_BUCKET).createSignedUrl(key, 60 * 60 * 24 * 30);
  if (!data?.signedUrl) throw new Error('Failed to get signed URL');
  return data.signedUrl;
}
