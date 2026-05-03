# career-ops web

Multi-tenant SaaS layer over the career-ops CLI: AI-curated job feed, A–G evaluation reports, tailored CV PDFs.

## Stack

- Next.js 15 (App Router, RSC + server actions)
- Postgres via Prisma (Supabase Postgres recommended)
- Auth.js v5 (Credentials + Google) with Prisma adapter
- Stripe (subscription, 7-day trial)
- Vercel AI SDK (Anthropic / OpenAI / OpenRouter)
- Inngest (durable scan + liveness step functions)
- Supabase Storage (CV PDFs)
- Puppeteer + @sparticuz/chromium (PDF rendering on Vercel)

## Getting started

```bash
pnpm install
cp apps/web/.env.example apps/web/.env
# fill: DATABASE_URL, AUTH_SECRET, AUTH_GOOGLE_ID/SECRET, STRIPE_*, ANTHROPIC_API_KEY, ...

# generate Prisma client + run first migration
pnpm --filter @career-ops/web db:migrate

# start the web server
pnpm --filter @career-ops/web dev

# in another terminal, start Inngest dev server (so scan jobs run locally)
pnpm --filter @career-ops/web inngest:dev
```

Open http://localhost:3000.

## End-to-end smoke test

1. Sign up at `/auth/sign-up` → land on Stripe checkout (test card `4242 4242 4242 4242`).
2. Webhook flips `subscriptionStatus=active` → `/onboarding` opens.
3. Complete the 3-step wizard.
4. From the Inngest dev UI (`http://localhost:8288`), send `scan/run.requested` to populate `/jobs`.
5. Click a job → "Generate report" streams Block A–G → "Generate PDF" produces a tailored CV.
6. "Mark applied" creates an application; manage status + follow-ups at `/applications/[id]`.

## Deploy

### Vercel

```bash
vercel link
vercel env add DATABASE_URL production
vercel env add AUTH_SECRET production
# … etc.
vercel deploy
```

Configure these external integrations:

- **Stripe webhook** → `https://<your-domain>/api/stripe/webhook`, listen to `customer.subscription.*` and `checkout.session.completed`.
- **Inngest** → connect the Vercel project; Inngest will discover `/api/inngest`. The `scan.run` cron `0 6 * * *` and `liveness.recheck` cron `0 */6 * * *` are defined in code.
- **Supabase Storage** → create bucket `cv-pdfs` (private). Service role key authorizes uploads from the API route.

### Move off Vercel later

This stack is deliberately portable:

- DB is plain Postgres → Neon / RDS / self-host.
- Auth.js Prisma adapter is framework-agnostic.
- AI SDK is provider-agnostic — set `AI_MODEL` or per-user `Profile.preferredModel`.
- Inngest functions are plain TS; if you drop Inngest, run `scanOnePortal` / `scanPortals` from a Railway worker.
- Storage is abstracted in `lib/storage/` — swap Supabase Storage for S3/R2 in one file.

## Repo layout

```
/career-ops
  /packages/core/                  # shared scanner + prompt loader + ATS normalizer
  /apps/web/
    /src/app/                      # routes
    /src/lib/auth/                 # Auth.js v5
    /src/lib/ai/                   # provider + evaluate + cv tailoring
    /src/lib/billing/              # stripe
    /src/lib/inngest/              # scan + liveness step functions
    /src/lib/pdf/                  # puppeteer + chromium
    /src/lib/storage/              # supabase storage
    /prisma/schema.prisma
```
