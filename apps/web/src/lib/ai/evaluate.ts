import { streamText, generateObject } from 'ai';
import { z } from 'zod';
import { loadMode, pickLanguage, type SupportedLang } from '@career-ops/core/prompts';
import { pickModel } from './provider';

export interface EvaluateArgs {
  jdText: string;
  jdUrl: string;
  jobTitle: string;
  company: string;
  cvMarkdown: string;
  profile: {
    fullName: string;
    countries: string[];
    languages: string[];
    archetypes: unknown;
    keywordsPos: string[];
    keywordsNeg: string[];
    compTarget: string | null;
    headline: string | null;
  };
  preferredModel?: string | null;
}

function buildUserPrompt(args: EvaluateArgs): string {
  return [
    `Evaluate the following job offer for the candidate. Produce a Block A–G report in markdown.`,
    ``,
    `## Candidate profile`,
    `Name: ${args.profile.fullName}`,
    args.profile.headline ? `Headline: ${args.profile.headline}` : '',
    `Target archetypes: ${JSON.stringify(args.profile.archetypes)}`,
    `Countries: ${args.profile.countries.join(', ') || '(any)'}`,
    `Comp target: ${args.profile.compTarget ?? '(unspecified)'}`,
    ``,
    `## Candidate CV (markdown)`,
    args.cvMarkdown,
    ``,
    `## Job offer`,
    `Company: ${args.company}`,
    `Title: ${args.jobTitle}`,
    `URL: ${args.jdUrl}`,
    ``,
    `## Job description`,
    args.jdText || '(JD body unavailable; reason about title + company only and flag the gap in Block G)',
  ]
    .filter(Boolean)
    .join('\n');
}

export function runEvaluation(args: EvaluateArgs) {
  const { model, id: modelUsed } = pickModel(args.preferredModel);
  const lang: SupportedLang = pickLanguage(args.profile.languages, args.jdText);
  const system = loadMode('oferta', lang);
  const stream = streamText({
    model,
    system,
    prompt: buildUserPrompt(args),
    temperature: 0.4,
  });
  return { stream, modelUsed, lang };
}

export const reportSummarySchema = z.object({
  score: z.number().min(0).max(5),
  archetype: z.string(),
  legitimacy: z.enum(['high', 'caution', 'suspicious']),
  blocks: z.object({
    A: z.string(),
    B: z.string(),
    C: z.string(),
    D: z.string(),
    E: z.string(),
    F: z.string(),
    G: z.string(),
  }),
});

export async function summarizeReport(markdown: string, preferredModel?: string | null) {
  const { model } = pickModel(preferredModel);
  const { object } = await generateObject({
    model,
    schema: reportSummarySchema,
    prompt: [
      `Below is a Block A–G evaluation report. Extract:`,
      `- score (0..5, the final fit score from Block C or whichever block contains the final number)`,
      `- archetype (the matched archetype from Block A)`,
      `- legitimacy (high | caution | suspicious from Block G)`,
      `- blocks: a one-paragraph summary of each block.`,
      ``,
      `Report:`,
      markdown,
    ].join('\n'),
    temperature: 0,
  });
  return object;
}
