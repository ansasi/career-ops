import Stripe from 'stripe';

let cached: Stripe | null = null;

export function stripe(): Stripe {
  if (cached) return cached;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is missing');
  cached = new Stripe(key, { apiVersion: '2025-02-24.acacia' });
  return cached;
}

export const STRIPE_PRICE_ID = process.env.STRIPE_PRICE_ID ?? '';
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
