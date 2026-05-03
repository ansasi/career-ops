const HARD_EXPIRED_PATTERNS = [
  /job (is )?no longer available/i,
  /job.*no longer open/i,
  /position has been filled/i,
  /this job has expired/i,
  /job posting has expired/i,
  /no longer accepting applications/i,
  /this (position|role|job) (is )?no longer/i,
  /this job (listing )?is closed/i,
  /job (listing )?not found/i,
  /the page you are looking for doesn.t exist/i,
  /diese stelle (ist )?(nicht mehr|bereits) besetzt/i,
  /offre (expirée|n'est plus disponible)/i,
];

const LISTING_PAGE_PATTERNS = [
  /\d+\s+jobs?\s+found/i,
  /search for jobs page is loaded/i,
];

const EXPIRED_URL_PATTERNS = [/[?&]error=true/i];

const APPLY_PATTERNS = [
  /\bapply\b/i,
  /\bsolicitar\b/i,
  /\bbewerben\b/i,
  /\bpostuler\b/i,
  /submit application/i,
  /easy apply/i,
  /start application/i,
  /ich bewerbe mich/i,
];

const MIN_CONTENT_CHARS = 300;

export type LivenessResult = 'active' | 'expired' | 'uncertain';

export interface ClassifyArgs {
  status?: number;
  finalUrl?: string;
  bodyText?: string;
  applyControls?: string[];
}

function firstMatch(patterns: RegExp[], text = ''): RegExp | undefined {
  return patterns.find((p) => p.test(text));
}

export function classifyLiveness(args: ClassifyArgs): { result: LivenessResult; reason: string } {
  const { status = 0, finalUrl = '', bodyText = '', applyControls = [] } = args;

  if (status === 404 || status === 410) {
    return { result: 'expired', reason: `HTTP ${status}` };
  }
  if (firstMatch(EXPIRED_URL_PATTERNS, finalUrl)) {
    return { result: 'expired', reason: `redirect to ${finalUrl}` };
  }
  const expiredBody = firstMatch(HARD_EXPIRED_PATTERNS, bodyText);
  if (expiredBody) {
    return { result: 'expired', reason: `pattern matched: ${expiredBody.source}` };
  }
  if (applyControls.some((c) => APPLY_PATTERNS.some((p) => p.test(c)))) {
    return { result: 'active', reason: 'visible apply control detected' };
  }
  const listingPage = firstMatch(LISTING_PAGE_PATTERNS, bodyText);
  if (listingPage) {
    return { result: 'expired', reason: `pattern matched: ${listingPage.source}` };
  }
  if (bodyText.trim().length < MIN_CONTENT_CHARS) {
    return { result: 'expired', reason: 'insufficient content — likely nav/footer only' };
  }
  return { result: 'uncertain', reason: 'content present but no visible apply control found' };
}

export async function fetchAndClassify(url: string, timeoutMs = 12_000): Promise<{ result: LivenessResult; reason: string; status: number }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: { 'User-Agent': 'career-ops-liveness/1.0' },
    });
    const body = await res.text();
    const applyControls = Array.from(body.matchAll(/<(?:button|a)[^>]*>([^<]+)<\/(?:button|a)>/gi))
      .map((m) => m[1])
      .slice(0, 200);
    const c = classifyLiveness({
      status: res.status,
      finalUrl: res.url,
      bodyText: body.replace(/<[^>]+>/g, ' '),
      applyControls,
    });
    return { ...c, status: res.status };
  } catch (e) {
    return {
      result: 'uncertain',
      reason: e instanceof Error ? e.message : String(e),
      status: 0,
    };
  } finally {
    clearTimeout(timer);
  }
}
