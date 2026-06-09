# CarryPath

A production web app for a NYC concealed-carry-weapon (CCW) license-assistance service. One Next.js app, three surfaces:

- **Public marketing site** (SSR/SEO) — landing, the 13-step journey, packages, disclaimer.
- **Client portal** (mobile-first) — progress timeline + checklist (full uploads/messaging/payments in a later phase).
- **Admin dashboard** — pipeline (kanban), case files, checklist engine, document review, task queue, manual client creation, audit log.

> **Brand is a placeholder.** All brand values (name, logo slot, colors, fonts, contact, disclaimer) live in `config/brand.ts`. Swap them there — no component changes needed.

## Stack

- **Next.js 16** (App Router, TypeScript, RSC) — note: middleware is now `proxy.ts`.
- **Tailwind v4 + shadcn/ui** (the brand palette is injected from `config/brand.ts`).
- **Supabase** — Postgres, Auth (roles), Storage, Row-Level Security.
- **Stripe / Resend / Twilio** — scaffolded behind env flags; the app runs without keys.

## Prerequisites

- Node 20+ and `pnpm`
- [Supabase CLI](https://supabase.com/docs/guides/cli) and Docker (for local dev)

## Local setup

```bash
pnpm install

# 1. Start the local Supabase stack (Postgres + Auth + Storage in Docker).
#    Applies all migrations in supabase/migrations automatically.
supabase start

# 2. Point the app at the local stack. The defaults in .env.local already match
#    `supabase start`; if your keys differ, read them with:
supabase status -o env

# 3. Seed demo data (users, clients, cases across all stages).
pnpm seed

# 4. Run the app.
pnpm dev   # http://localhost:3000
```

### Demo logins (password: `Passw0rd!`)

| Email | Role | Notes |
|---|---|---|
| `admin@carrypath.test` | admin | sees everything |
| `staff@carrypath.test` | staff | sees assigned cases |
| `client1@carrypath.test` | client | Jordan Rivera (document collection) |
| `client2@carrypath.test` | client | Sam Chen (under investigation) |

After login you're routed by role: admin/staff → `/admin`, client → `/portal`.

## Database

- Schema, RLS, and Storage policies live in `supabase/migrations`.
- RLS model: **clients** see only their own case/docs/messages; **staff** see assigned cases; **admin** sees all. The `service_role` key (seed, Stripe webhook) bypasses RLS.
- Regenerate TypeScript types after a schema change: `pnpm db:types`.
- Reset + replay migrations: `pnpm db:reset` (then `pnpm seed`).

## Enabling Stripe (later)

Payments are gated by a flag so the app runs without Stripe. To turn on:

1. Set `STRIPE_ENABLED=true` and add `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` in `.env.local`.
2. Point a Stripe webhook at `POST /api/stripe/webhook`.

See `lib/stripe`. Email (Resend) is similar: add `RESEND_API_KEY` and transactional email turns on; until then it logs to the console.

## Deploy (Vercel + hosted Supabase)

1. **Create a new Supabase organization + project** in the dashboard (the CLI can't create orgs). Keep it separate from any other projects on your account.
2. Link and push the schema:
   ```bash
   supabase link --project-ref <ref>
   supabase db push
   ```
3. In Vercel, import the repo and set env vars from `.env.example` using the **hosted** project's URL + keys.
4. Set `NEXT_PUBLIC_SITE_URL` to your production URL. Deploy.

## Project structure

```
app/            marketing (/), portal (/portal), admin (/admin), auth, api
components/     ui (shadcn), admin (pipeline, case file, …), shared
config/         brand.ts, stages.ts, checklist-templates.ts
lib/            supabase clients, auth, activity log, email/stripe adapters
supabase/       migrations + config
scripts/        seed.ts
proxy.ts        session refresh + optimistic route guards (Next 16 "middleware")
```

## Compliance note

CarryPath **assists with and guides** the application; it does not issue licenses and cannot guarantee approval (the NYPD retains investigative discretion). This app stores sensitive PII — RLS, least-privilege access, and an immutable `activity_log` are enforced throughout.
