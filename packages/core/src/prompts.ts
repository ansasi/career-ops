import { readFileSync } from 'node:fs';
import path from 'node:path';

export type SupportedLang = 'en' | 'de' | 'fr' | 'ja';

const LANG_DIR: Record<SupportedLang, string> = {
  en: '',
  de: 'de',
  fr: 'fr',
  ja: 'ja',
};

const ENGLISH_FALLBACKS: Record<string, string> = {
  oferta: 'oferta',
  offre: 'oferta',
  angebot: 'oferta',
  kyujin: 'oferta',
  pdf: 'pdf',
};

function modesRoot(): string {
  if (process.env.CAREER_OPS_MODES_DIR) return process.env.CAREER_OPS_MODES_DIR;
  return path.resolve(process.cwd(), 'modes');
}

function tryRead(file: string): string | null {
  try {
    return readFileSync(file, 'utf-8');
  } catch {
    return null;
  }
}

export function loadMode(name: string, lang: SupportedLang = 'en'): string {
  const root = modesRoot();
  const subdir = LANG_DIR[lang] ?? '';
  const dir = subdir ? path.join(root, subdir) : root;

  const shared = tryRead(path.join(dir, '_shared.md')) ?? tryRead(path.join(root, '_shared.md')) ?? '';
  const profile = tryRead(path.join(root, '_profile.md')) ?? tryRead(path.join(root, '_profile.template.md')) ?? '';
  const modeFile =
    tryRead(path.join(dir, `${name}.md`)) ??
    tryRead(path.join(root, `${name}.md`)) ??
    tryRead(path.join(root, `${ENGLISH_FALLBACKS[name] ?? name}.md`));

  if (!modeFile) {
    throw new Error(`Mode file not found: ${name} (lang=${lang})`);
  }

  return [shared, profile, modeFile].filter(Boolean).join('\n\n---\n\n');
}

export function pickLanguage(profileLanguages: string[] | undefined, jdText?: string): SupportedLang {
  const langs = (profileLanguages ?? []).map((l) => l.toLowerCase());
  if (langs.includes('de') && jdText && /\b(stellenbeschreibung|aufgaben|profil|wir bieten)\b/i.test(jdText)) return 'de';
  if (langs.includes('fr') && jdText && /\b(missions|profil recherché|nous offrons)\b/i.test(jdText)) return 'fr';
  if (langs.includes('ja') && jdText && /(募集|応募|職務|歓迎要件)/.test(jdText)) return 'ja';
  return 'en';
}
