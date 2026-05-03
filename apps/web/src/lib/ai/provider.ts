import { anthropic } from '@ai-sdk/anthropic';
import { createOpenAI, openai } from '@ai-sdk/openai';
import type { LanguageModel } from 'ai';

export const DEFAULT_MODEL = 'anthropic:claude-sonnet-4-6';

export const CURATED_MODELS = [
  { id: 'anthropic:claude-sonnet-4-6', label: 'Claude Sonnet 4.6 (default, balanced)' },
  { id: 'anthropic:claude-opus-4-7', label: 'Claude Opus 4.7 (highest quality)' },
  { id: 'openai:gpt-4o', label: 'GPT-4o (OpenAI, fast)' },
  { id: 'openai:o4-mini', label: 'o4-mini (OpenAI, cheap)' },
];

export function pickModel(override?: string | null): { model: LanguageModel; id: string } {
  const id = (override && override.length ? override : process.env.AI_MODEL) ?? DEFAULT_MODEL;
  const [provider, ...rest] = id.split(':');
  const name = rest.join(':');
  if (provider === 'anthropic') return { model: anthropic(name), id };
  if (provider === 'openai') return { model: openai(name), id };
  if (provider === 'openrouter') {
    const or = createOpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: process.env.OPENROUTER_API_KEY ?? '',
    });
    return { model: or(name), id };
  }
  throw new Error(`Unknown AI provider: ${provider}`);
}
