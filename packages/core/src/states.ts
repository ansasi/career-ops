import { readFileSync } from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';

export interface AppState {
  id: string;
  label: string;
  aliases: string[];
  description: string;
  dashboard_group: string;
}

export const DEFAULT_STATES: AppState[] = [
  { id: 'evaluated', label: 'Evaluated', aliases: ['evaluada'], description: 'Offer evaluated with report, pending decision', dashboard_group: 'evaluated' },
  { id: 'applied', label: 'Applied', aliases: ['aplicado', 'enviada', 'aplicada', 'sent'], description: 'Application submitted', dashboard_group: 'applied' },
  { id: 'responded', label: 'Responded', aliases: ['respondido'], description: 'Company has responded (not yet interview)', dashboard_group: 'responded' },
  { id: 'interview', label: 'Interview', aliases: ['entrevista'], description: 'Active interview process', dashboard_group: 'interview' },
  { id: 'offer', label: 'Offer', aliases: ['oferta'], description: 'Offer received', dashboard_group: 'offer' },
  { id: 'rejected', label: 'Rejected', aliases: ['rechazado', 'rechazada'], description: 'Rejected by company', dashboard_group: 'rejected' },
  { id: 'discarded', label: 'Discarded', aliases: ['descartado', 'descartada', 'cerrada', 'cancelada'], description: 'Discarded by candidate or offer closed', dashboard_group: 'discarded' },
  { id: 'skip', label: 'SKIP', aliases: ['no_aplicar', 'no aplicar', 'monitor'], description: "Doesn't fit, don't apply", dashboard_group: 'skip' },
];

export function loadStates(): AppState[] {
  const candidate = process.env.CAREER_OPS_STATES_FILE
    ?? path.resolve(process.cwd(), 'templates/states.yml');
  try {
    const raw = readFileSync(candidate, 'utf-8');
    const data = yaml.load(raw) as { states?: AppState[] };
    if (data?.states && Array.isArray(data.states)) return data.states;
  } catch {
    // fall through
  }
  return DEFAULT_STATES;
}

export function normalizeStatus(input: string): string {
  const trimmed = (input || '').trim().toLowerCase().replace(/\*/g, '');
  for (const s of DEFAULT_STATES) {
    if (s.id === trimmed) return s.id;
    if (s.label.toLowerCase() === trimmed) return s.id;
    if (s.aliases.some((a) => a.toLowerCase() === trimmed)) return s.id;
  }
  return 'evaluated';
}
