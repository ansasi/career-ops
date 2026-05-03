import { readFileSync } from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import { scanOnePortal, type PortalsConfig, type NewJob } from '@career-ops/core/scan';
import { fetchAndClassify } from '@career-ops/core/liveness';
import { prisma } from '../db';
import { inngest } from './client';

function loadPortalsYaml(): PortalsConfig {
  const candidates = [
    process.env.CAREER_OPS_PORTALS_FILE,
    path.resolve(process.cwd(), '../../portals.yml'),
    path.resolve(process.cwd(), '../../templates/portals.example.yml'),
  ].filter(Boolean) as string[];
  for (const c of candidates) {
    try {
      const raw = readFileSync(c, 'utf-8');
      return yaml.load(raw) as PortalsConfig;
    } catch {
      continue;
    }
  }
  throw new Error('No portals.yml found');
}

async function upsertJobs(jobs: NewJob[]): Promise<{ added: number }> {
  if (!jobs.length) return { added: 0 };
  const result = await prisma.job.createMany({
    data: jobs.map((j) => ({
      url: j.url,
      source: j.source,
      company: j.company,
      title: j.title,
      country: j.country,
      location: j.location || null,
      liveness: 'uncertain',
    })),
    skipDuplicates: true,
  });
  return { added: result.count };
}

export const scanRun = inngest.createFunction(
  { id: 'scan.run', concurrency: { limit: 1 }, retries: 1 },
  [{ event: 'scan/run.requested' }, { cron: '0 6 * * *' }],
  async ({ event, step }) => {
    const portals = await step.run('load-portals', async () => loadPortalsYaml());
    const enabled = (portals.tracked_companies ?? []).filter((c) => c.enabled !== false);

    const trigger = event?.data?.trigger ?? (event?.name === 'scan/run.requested' ? 'manual' : 'cron');
    const runId = await step.run('start-scan-run', async () => {
      const r = await prisma.scanRun.create({ data: { trigger } });
      return r.id;
    });

    let found = 0;
    let added = 0;
    const errors: { company: string; error: string }[] = [];

    for (const company of enabled) {
      const slug = company.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      try {
        const result = await step.run(`scan:${slug}`, async () =>
          scanOnePortal(company, portals.title_filter),
        );
        found += result.found;
        const writes = await step.run(`upsert:${slug}`, async () => upsertJobs(result.jobs));
        added += writes.added;
      } catch (e) {
        errors.push({ company: company.name, error: e instanceof Error ? e.message : String(e) });
      }
    }

    await step.run('finish-scan-run', async () => {
      await prisma.scanRun.update({
        where: { id: runId },
        data: { finishedAt: new Date(), found, added, errors: errors.length ? errors : undefined },
      });
    });

    return { runId, found, added, errors: errors.length };
  },
);

export const livenessRecheck = inngest.createFunction(
  { id: 'liveness.recheck', concurrency: { limit: 5 }, retries: 1 },
  [{ event: 'liveness/recheck.requested' }, { cron: '0 */6 * * *' }],
  async ({ event, step }) => {
    const limit = event?.data?.limit ?? 50;
    const jobs = await step.run('pick-stale', async () =>
      prisma.job.findMany({
        where: { OR: [{ livenessAt: null }, { livenessAt: { lt: new Date(Date.now() - 1000 * 60 * 60 * 24) } }] },
        orderBy: { livenessAt: 'asc' },
        take: limit,
      }),
    );

    let active = 0;
    let expired = 0;
    let uncertain = 0;
    for (const job of jobs) {
      const c = await step.run(`liveness:${job.id}`, async () => fetchAndClassify(job.url));
      await step.run(`update:${job.id}`, async () =>
        prisma.job.update({
          where: { id: job.id },
          data: { liveness: c.result, livenessAt: new Date() },
        }),
      );
      if (c.result === 'active') active++;
      else if (c.result === 'expired') expired++;
      else uncertain++;
    }
    return { checked: jobs.length, active, expired, uncertain };
  },
);

export const inngestFunctions = [scanRun, livenessRecheck];
