export type Source = 'greenhouse' | 'ashby' | 'lever';

export interface PortalCompany {
  name: string;
  careers_url?: string;
  api?: string;
  enabled?: boolean;
  country?: string;
}

export interface TitleFilter {
  positive?: string[];
  negative?: string[];
}

export interface PortalsConfig {
  tracked_companies: PortalCompany[];
  title_filter?: TitleFilter;
}

export interface ScannedJob {
  title: string;
  url: string;
  company: string;
  location: string;
  source: `${Source}-api`;
  country: string | null;
}

export interface NewJob extends ScannedJob {}

interface ApiTarget {
  type: Source;
  url: string;
}

const FETCH_TIMEOUT_MS = 10_000;

export function detectApi(company: PortalCompany): ApiTarget | null {
  if (company.api && company.api.includes('greenhouse')) {
    return { type: 'greenhouse', url: company.api };
  }
  const url = company.careers_url || '';

  const ashby = url.match(/jobs\.ashbyhq\.com\/([^/?#]+)/);
  if (ashby) {
    return {
      type: 'ashby',
      url: `https://api.ashbyhq.com/posting-api/job-board/${ashby[1]}?includeCompensation=true`,
    };
  }

  const lever = url.match(/jobs\.lever\.co\/([^/?#]+)/);
  if (lever) {
    return { type: 'lever', url: `https://api.lever.co/v0/postings/${lever[1]}` };
  }

  const ghEu = url.match(/job-boards(?:\.eu)?\.greenhouse\.io\/([^/?#]+)/);
  if (ghEu && !company.api) {
    return {
      type: 'greenhouse',
      url: `https://boards-api.greenhouse.io/v1/boards/${ghEu[1]}/jobs`,
    };
  }

  return null;
}

interface RawGreenhouseJob {
  title?: string;
  absolute_url?: string;
  location?: { name?: string };
}

interface RawAshbyJob {
  title?: string;
  jobUrl?: string;
  location?: string;
}

interface RawLeverJob {
  text?: string;
  hostedUrl?: string;
  categories?: { location?: string };
}

function parseGreenhouse(json: unknown, companyName: string): ScannedJob[] {
  const jobs = (json as { jobs?: RawGreenhouseJob[] })?.jobs ?? [];
  return jobs.map((j) => ({
    title: j.title ?? '',
    url: j.absolute_url ?? '',
    company: companyName,
    location: j.location?.name ?? '',
    source: 'greenhouse-api' as const,
    country: parseCountry(j.location?.name ?? ''),
  }));
}

function parseAshby(json: unknown, companyName: string): ScannedJob[] {
  const jobs = (json as { jobs?: RawAshbyJob[] })?.jobs ?? [];
  return jobs.map((j) => ({
    title: j.title ?? '',
    url: j.jobUrl ?? '',
    company: companyName,
    location: j.location ?? '',
    source: 'ashby-api' as const,
    country: parseCountry(j.location ?? ''),
  }));
}

function parseLever(json: unknown, companyName: string): ScannedJob[] {
  if (!Array.isArray(json)) return [];
  return (json as RawLeverJob[]).map((j) => ({
    title: j.text ?? '',
    url: j.hostedUrl ?? '',
    company: companyName,
    location: j.categories?.location ?? '',
    source: 'lever-api' as const,
    country: parseCountry(j.categories?.location ?? ''),
  }));
}

const PARSERS: Record<Source, (json: unknown, name: string) => ScannedJob[]> = {
  greenhouse: parseGreenhouse,
  ashby: parseAshby,
  lever: parseLever,
};

const COUNTRY_MAP: Record<string, string> = {
  germany: 'DE', deutschland: 'DE', berlin: 'DE', münchen: 'DE', munich: 'DE', hamburg: 'DE',
  france: 'FR', paris: 'FR', lyon: 'FR',
  spain: 'ES', españa: 'ES', madrid: 'ES', barcelona: 'ES',
  'united kingdom': 'GB', uk: 'GB', london: 'GB', england: 'GB',
  ireland: 'IE', dublin: 'IE',
  netherlands: 'NL', amsterdam: 'NL',
  portugal: 'PT', lisbon: 'PT', lisboa: 'PT',
  italy: 'IT', milan: 'IT', milano: 'IT',
  switzerland: 'CH', zurich: 'CH', zürich: 'CH',
  austria: 'AT', vienna: 'AT',
  belgium: 'BE', brussels: 'BE',
  poland: 'PL', warsaw: 'PL',
  'united states': 'US', usa: 'US', 'new york': 'US', 'san francisco': 'US',
  canada: 'CA', toronto: 'CA',
  remote: 'REMOTE',
};

export function parseCountry(location: string): string | null {
  if (!location) return null;
  const lower = location.toLowerCase();
  for (const [needle, code] of Object.entries(COUNTRY_MAP)) {
    if (lower.includes(needle)) return code;
  }
  return null;
}

async function fetchJson(url: string): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

export function buildTitleFilter(filter: TitleFilter | undefined): (title: string) => boolean {
  const positive = (filter?.positive ?? []).map((k) => k.toLowerCase());
  const negative = (filter?.negative ?? []).map((k) => k.toLowerCase());
  return (title: string) => {
    const lower = title.toLowerCase();
    const hasPos = positive.length === 0 || positive.some((k) => lower.includes(k));
    const hasNeg = negative.some((k) => lower.includes(k));
    return hasPos && !hasNeg;
  };
}

export interface PortalScanResult {
  found: number;
  jobs: NewJob[];
}

export async function scanOnePortal(
  company: PortalCompany,
  titleFilter: TitleFilter | undefined,
): Promise<PortalScanResult> {
  const api = detectApi(company);
  if (!api) return { found: 0, jobs: [] };
  const matchTitle = buildTitleFilter(titleFilter);
  const json = await fetchJson(api.url);
  const all = PARSERS[api.type](json, company.name);
  const jobs = all.filter((j) => matchTitle(j.title) && j.url);
  return { found: all.length, jobs };
}

export interface ScanPortalsArgs {
  portals: PortalsConfig;
  isSeen: (url: string) => Promise<boolean>;
  writeJob: (job: NewJob) => Promise<void>;
  concurrency?: number;
}

export interface ScanResult {
  found: number;
  added: number;
  errors: { company: string; error: string }[];
}

export async function scanPortals(args: ScanPortalsArgs): Promise<ScanResult> {
  const { portals, isSeen, writeJob, concurrency = 6 } = args;
  const targets = (portals.tracked_companies ?? []).filter((c) => c.enabled !== false);

  let found = 0;
  let added = 0;
  const errors: ScanResult['errors'] = [];

  let i = 0;
  async function worker(): Promise<void> {
    while (i < targets.length) {
      const company = targets[i++];
      try {
        const r = await scanOnePortal(company, portals.title_filter);
        found += r.found;
        for (const job of r.jobs) {
          if (await isSeen(job.url)) continue;
          await writeJob(job);
          added += 1;
        }
      } catch (e) {
        errors.push({ company: company.name, error: e instanceof Error ? e.message : String(e) });
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, targets.length) }, () => worker()));
  return { found, added, errors };
}
