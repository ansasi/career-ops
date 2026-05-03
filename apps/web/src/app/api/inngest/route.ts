import { serve } from 'inngest/next';
import { inngest } from '@/lib/inngest/client';
import { inngestFunctions } from '@/lib/inngest/scan';

export const runtime = 'nodejs';
export const maxDuration = 300;

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: inngestFunctions,
});
