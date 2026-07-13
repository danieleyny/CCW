# CARRY

A production platform for a NYC concealed-carry license-assistance service: it turns the NYPD's deliberately demanding, ~6-month application process into a guided, evidence-assembling workflow — for the applicant *and* for the consultant running dozens of cases at once.

**The controlling insight:** NYC carry is not a form you submit — it's an investigation you assemble evidence for. The two levers the product is built around: **long-lead parallelism** (training expires 6 months after completion — start it on day one) and **disclosure discipline** (false statements and lack of candor are the dominant denial grounds, not the underlying conduct).

**The legal frame:** consulting firms cannot represent applicants before the License Division, cannot expedite, and are not endorsed by NYPD. The product is therefore built so the **applicant always reviews and submits their own application**, disclosures are candor-maximizing by design, anything advisory routes to a NY-licensed attorney, and every registry rule carries provenance awaiting attorney sign-off (`/admin/legal`).

## Surfaces

| Surface | Path | What it does |
|---|---|---|
| Marketing | `app/(marketing)` | Landing, eligibility quiz (feeds intake), DB-driven pricing, guides, standing disclaimer |
| Client portal | `app/portal` | Intake interview → personalized checklist from the versioned requirements engine; documents (HEIC-safe uploads, NYPD photo-spec validation); e-signatures; self-serve enrollment; instructor marketplace + booking; references & household outreach; assembled filing packet; post-issuance license hub (30-day/90-day/72-hour clocks, §5-24 reporting); appeal seam |
| Consultant admin | `app/admin` | Pipeline with stall signals, case files (requirements, disclosures review, documents, people w/ token status, training & scheduling, internal notes, tasks, messages w/ templates, activity), unified inbox, **CP-5 pre-filing QA gate** (a case physically cannot be filed incomplete), legal-verification register, reports |
| Instructor | `app/instructor` | Self-registration → admin verification → redacted offer feed (privacy firewall: never sees disclosures or pre-accept PII) → availability, bookings, ICS invites, Connect payouts (flag-gated) |
| Public token flows | `app/r/[token]`, `app/c/[token]` | No-login reference letters and cohabitant affidavits: questionnaire → generated PDF → e-sign → notarize (in person or RON) → upload. Tokens expire in 30 days and are revocable |

## Stack

Next.js 16 (App Router, `proxy.ts`) · React 19 · Supabase (Postgres + RLS + Auth + Storage + PostGIS) · Tailwind v4 · bespoke shadcn-derived UI (`config/brand.ts` tokens) · Stripe (flag-gated) · Resend (flag-gated) · pdf-lib · pnpm · Vercel (+ daily cron).

## Running it

```bash
pnpm install
supabase start          # local stack
pnpm db:reset && pnpm seed && pnpm db:types
pnpm dev
```

Demo logins (local seed, password `Passw0rd!`): `admin@carrypath.test`, `staff@carrypath.test`, `client1@carrypath.test`, `client2@carrypath.test`, `instructor@carrypath.test`.

Checks: `pnpm test` (vitest units: rule engine, validators, license math, intake schema) · `pnpm tsx scripts/verify-v3p0.ts` … `verify-v3p3.ts` + `verify-p9.ts` (live harnesses incl. the RLS matrix, run after a reset+seed) · `pnpm lint` · `pnpm build`.

## Going fully live — the switches

- `STRIPE_ENABLED=true` + Stripe keys → real card checkout (until then, "Request invoice" records intent + tasks staff).
- `RESEND_API_KEY` → outbound email (until then, emails log; applicants share links via Copy-link buttons).
- Attorney sign-off of the requirements registry in `/admin/legal` (nothing is presumed verified).
- Real business contact details in `config/brand.ts`.

Deep agent/contributor context: **AGENTS.md**. V3 evidence base: `CCW_V3_AUDIT.md` + `CCW_V3_BUILD_PROMPT.md`. Historical plans: `docs/archive/`.
