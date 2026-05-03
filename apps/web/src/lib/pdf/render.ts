import path from 'node:path';
import { readFileSync } from 'node:fs';
import puppeteer, { type Browser } from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import { normalizeTextForATS } from '@career-ops/core/pdf-normalize';

interface RenderArgs {
  name: string;
  headline: string | null;
  meta: string;
  bodyMarkdown: string;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string,
  );
}

export function markdownToHtml(md: string): string {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const out: string[] = [];
  let inList = false;
  const closeList = (): void => {
    if (inList) {
      out.push('</ul>');
      inList = false;
    }
  };
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) { closeList(); continue; }
    const h2 = line.match(/^##\s+(.*)$/);
    const h3 = line.match(/^###\s+(.*)$/);
    const h1 = line.match(/^#\s+(.*)$/);
    const bullet = line.match(/^[-*]\s+(.*)$/);
    if (h1) { closeList(); out.push(`<h1>${escapeHtml(h1[1])}</h1>`); continue; }
    if (h2) { closeList(); out.push(`<h2>${escapeHtml(h2[1])}</h2>`); continue; }
    if (h3) { closeList(); out.push(`<h3>${escapeHtml(h3[1])}</h3>`); continue; }
    if (bullet) {
      if (!inList) { out.push('<ul>'); inList = true; }
      out.push(`<li>${inlineFormat(bullet[1])}</li>`);
      continue;
    }
    closeList();
    out.push(`<p>${inlineFormat(line)}</p>`);
  }
  closeList();
  return out.join('\n');
}

function inlineFormat(s: string): string {
  let v = escapeHtml(s);
  v = v.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  v = v.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  v = v.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  return v;
}

function templatePath(): string {
  return path.join(process.cwd(), 'public', 'templates', 'cv-simple.html');
}

async function launch(): Promise<Browser> {
  const isProd = process.env.VERCEL === '1' || process.env.AWS_REGION;
  if (isProd) {
    return await puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
      defaultViewport: chromium.defaultViewport,
    });
  }
  const localPath = process.env.PUPPETEER_EXECUTABLE_PATH ?? '/usr/bin/google-chrome';
  return await puppeteer.launch({ executablePath: localPath, headless: true });
}

export async function renderCvPdf(args: RenderArgs): Promise<Uint8Array> {
  const tpl = readFileSync(templatePath(), 'utf-8');
  const bodyHtml = markdownToHtml(stripFrontMatter(args.bodyMarkdown));
  const headlineBlock = args.headline ? `<p class="headline">${escapeHtml(args.headline)}</p>` : '';
  const html = tpl
    .replace('{{NAME}}', escapeHtml(args.name))
    .replace('{{HEADLINE_BLOCK}}', headlineBlock)
    .replace('{{META}}', escapeHtml(args.meta))
    .replace('{{BODY}}', bodyHtml);
  const { html: ats } = normalizeTextForATS(html);

  const browser = await launch();
  try {
    const page = await browser.newPage();
    await page.setContent(ats, { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({ format: 'A4', printBackground: true });
    return pdf;
  } finally {
    await browser.close();
  }
}

function stripFrontMatter(md: string): string {
  const m = md.match(/^#\s+[^\n]+\n+/);
  return m ? md.slice(m[0].length) : md;
}
