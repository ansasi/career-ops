import { generateText } from 'ai';
import { loadMode, pickLanguage, type SupportedLang } from '@career-ops/core/prompts';
import { pickModel } from './provider';

export interface TailorArgs {
  cvMarkdown: string;
  jdText: string;
  jobTitle: string;
  company: string;
  profile: {
    fullName: string;
    headline: string | null;
    languages: string[];
    archetypes: unknown;
  };
  preferredModel?: string | null;
}

const SYSTEM_FALLBACK = `You are an ATS-savvy CV editor. Given the candidate's full CV (markdown) and a target job description, produce a tailored, ATS-friendly markdown CV.

RULES:
- Keep all factual claims from the original CV. Do not invent experience, dates, employers, or metrics.
- Re-order, rephrase, and prune to highlight what matches the JD. You may shorten less-relevant bullets.
- Use crisp action verbs and quantified outcomes wherever they exist in the source.
- Preserve markdown structure: # Name, line for headline, ## Section, ### Role at Company (dates), bullet lists.
- Do NOT include a cover letter. Output ONLY the tailored markdown CV.
- Output target length: ~1.5 pages of A4. Cut if needed.`;

export async function tailorCv(args: TailorArgs): Promise<{ markdown: string; modelUsed: string }> {
  const { model, id: modelUsed } = pickModel(args.preferredModel);
  const lang: SupportedLang = pickLanguage(args.profile.languages, args.jdText);
  let system: string;
  try {
    system = loadMode('pdf', lang);
  } catch {
    system = SYSTEM_FALLBACK;
  }

  const prompt = [
    `## Target job`,
    `Company: ${args.company}`,
    `Title: ${args.jobTitle}`,
    `Archetypes the candidate is targeting: ${JSON.stringify(args.profile.archetypes)}`,
    ``,
    `## Job description`,
    args.jdText.slice(0, 20_000),
    ``,
    `## Source CV (markdown)`,
    args.cvMarkdown,
  ].join('\n');

  const { text } = await generateText({
    model,
    system,
    prompt,
    temperature: 0.4,
  });

  return { markdown: text.trim(), modelUsed };
}
