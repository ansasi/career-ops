import { Inngest } from 'inngest';

export const inngest = new Inngest({
  id: 'career-ops-web',
  eventKey: process.env.INNGEST_EVENT_KEY,
});

export type Events = {
  'scan/run.requested': { data: { trigger?: 'manual' | 'cron' } };
  'liveness/recheck.requested': { data: { limit?: number } };
};
