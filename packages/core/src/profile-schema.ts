import { z } from 'zod';

export const archetypeSchema = z.object({
  name: z.string().min(1),
  level: z.string().min(1),
  fit: z.enum(['primary', 'secondary', 'adjacent']),
});

export const proofPointSchema = z.object({
  name: z.string().min(1),
  url: z.string().url().optional().or(z.literal('')),
  hero_metric: z.string().optional(),
});

export const profileSchema = z.object({
  candidate: z.object({
    full_name: z.string().min(1),
    email: z.string().email(),
    phone: z.string().optional(),
    location: z.string().optional(),
    linkedin: z.string().optional(),
    portfolio_url: z.string().optional(),
    github: z.string().optional(),
    twitter: z.string().optional(),
  }),
  target_roles: z.object({
    primary: z.array(z.string()).default([]),
    archetypes: z.array(archetypeSchema).default([]),
  }),
  narrative: z.object({
    headline: z.string().optional(),
    exit_story: z.string().optional(),
    superpowers: z.array(z.string()).default([]),
    proof_points: z.array(proofPointSchema).default([]),
  }).default({ superpowers: [], proof_points: [] }),
  compensation: z.object({
    target_range: z.string().optional(),
    currency: z.string().optional(),
    minimum: z.string().optional(),
    location_flexibility: z.string().optional(),
  }).default({}),
  location: z.object({
    country: z.string().optional(),
    city: z.string().optional(),
    timezone: z.string().optional(),
    visa_status: z.string().optional(),
    onsite_availability: z.string().optional(),
  }).default({}),
});

export type Profile = z.infer<typeof profileSchema>;

export const onboardingStep1 = z.object({
  countries: z.array(z.string()).min(1, 'Pick at least one country'),
  languages: z.array(z.enum(['en', 'de', 'fr', 'ja'])).min(1),
});

export const onboardingStep2 = z.object({
  archetypes: z.array(archetypeSchema).min(1),
  keywordsPos: z.array(z.string()).min(1),
  keywordsNeg: z.array(z.string()).default([]),
  compTarget: z.string().optional(),
});

export const onboardingStep3 = z.object({
  cvMarkdown: z.string().min(50, 'CV looks too short'),
  fullName: z.string().min(1),
  headline: z.string().optional(),
});
