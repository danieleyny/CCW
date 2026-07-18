# CARRY V5 — Free Tier, The Refile Promise, Trust Stats, Resources, Subscribe Endpoint

**Repo:** `CCW` (CARRY / gunlicensenyc — Next.js 16 App Router + Supabase + Tailwind v4)
**Companion prompt:** `Ccw-LILI/docs/CK-RECIPROCITY-QUICKLINKS-FUNNEL-PROMPT.md`. **Build Workstream A (the subscribe endpoint) first** — Concealed Knowledge's lead funnel posts to it.

---

## 0. Read before you write a single line

You must have read and be able to quote:

- **`AGENTS.md`** — the constitution. In particular the five legal guardrails. They constrain almost everything below.
- `config/brand.ts` — the standing disclaimer, and the `⚠️ PLACEHOLDER` contact block that still ships `carry.example` / `(212) 555-0142`.
- `app/(marketing)/actions.ts` — `captureLead()`. It creates a **client + case + task + activity row** and materializes a full requirements checklist. That is correct for a consultation lead and **far too heavy for an email subscription.** Do not reuse it for Workstream A.
- `lib/qa-gate.ts` — `evaluatePreFilingGate()`. This is the mechanism that backs the Refile Promise. Read every check it performs; the promise must be scoped to exactly what this gate can actually assert.
- `lib/requirements/generate.ts` — the **pure** generator. No DB. This is what makes an anonymous checklist possible.
- `lib/requirements/materialize.ts` — the DB writer. Do not call it for anonymous users.
- `components/marketing/eligibility-quiz.tsx` + `lib/intake/schema.ts` — the existing quiz, its answer shape, and its localStorage persistence.
- `lib/packages.ts`, `lib/fees.ts`, `supabase/migrations/20260713000700_revenue_lifecycle.sql` — packages, deposits, and where the "deposit to start, balance on filing" copy comes from.
- `lib/reminders/engine.ts` — the rule shape and the `reminder_log (rule_key, target, window_key)` idempotency key.
- `HOME_V5_VISUAL_PROMPT.md` — the planned homepage rebuild. **Workstream C must slot into it, not fight it.** If it has already shipped, extend it; if not, write the component so it drops into the planned structure.

### Non-negotiables — quote these into any sub-plan

From `AGENTS.md`:

> 4. Never use *guarantee, expedite, fast-track, insider, approval rate* in copy.

**This is a hard collision with the feature everyone wants to call a "guarantee."** Resolution, and it is not negotiable:

- The feature is named **"The Refile Promise."** The word *guarantee* does not appear in it, near it, or in any adjacent copy.
- The promise is about **our own labor**, never about the NYPD's decision. It says what *we* will redo. It says nothing about whether you get a license.
- The banned-word grep gate stays. **Add it as a real vitest assertion** (Workstream E) so nobody can quietly reintroduce the word later.

Also non-negotiable, from the same list: the applicant always submits their own application; candor-maximizing never disclosure-minimizing; no legal advice; every registry rule keeps its provenance and `needs_legal_review`.

### Explicitly out of scope for this build

- The NYC Firearms Attorney Network. **Skipped.**
- A public, embeddable instructor finder. **Skipped.**
- Do **not** build a reciprocity map here. Concealed Knowledge owns it. CARRY links out to it. (Workstream D.)

---

## Workstream A — `POST /api/subscribe` (build first)

The Concealed Knowledge funnel needs somewhere to send an email address. It must **not** touch `clients`, `cases`, `tasks`, or the requirements registry — a person who wanted a PDF of their range plan is not a case.

### A.1 Migration — a new, isolated table

New migration, 14-digit prefix, never edit a shipped one:

```sql
create table subscribers (
  id uuid primary key default gen_random_uuid(),
  email citext not null,
  offer text not null check (offer in ('fit-report','reciprocity-card','law-watch','checklist')),
  source text not null,              -- e.g. 'ck:report', 'ck:reciprocity', 'carry:checklist'
  payload jsonb not null default '{}'::jsonb,
  jurisdiction text,                 -- 'ny' | 'nj' | null
  confirmed_at timestamptz,
  unsubscribed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (email, offer)
);
```

RLS on in the same migration (house rule). Policies: **staff/admin read** via `is_staff_or_admin()`; **no anon select**; inserts happen only through the service-role client in the route handler. Index on `(offer) where unsubscribed_at is null`.

### A.2 The route handler — `app/api/subscribe/route.ts`

- `POST` only. Zod at the boundary. Fields: `email`, `offer`, `from`, `payload?`, `company` (honeypot — non-empty ⇒ return `{ ok: true }` and write nothing, exactly as `captureLead` does).
- Reuse `rateLimit()` / `clientIpFrom()` from `lib/rate-limit`. Per-IP brake.
- Upsert on `(email, offer)` so a repeat submit is idempotent, not a duplicate.
- **CORS:** an `OPTIONS` handler plus `Access-Control-Allow-Origin` on the response, allowlisting the Concealed Knowledge origin(s) — the GitHub Pages origin today, `https://concealedknowledge.com` once the domain is pointed. Read the allowlist from an env var (`SUBSCRIBE_ALLOWED_ORIGINS`), comma-separated. Reflect only an origin on the list; never `*`.
- Fire the confirmation email through the existing `lib/email` `sendEmail()` — it already no-ops safely without `RESEND_API_KEY`, so this ships dark and lights up when the key lands.
- `logActivity()` is case-scoped; a subscriber has no case. Write a row to `subscribers` and stop. Do not force it into `activity_log`.
- Add a `GET /api/unsubscribe?token=…` (HMAC of the subscriber id with a server secret) that sets `unsubscribed_at`. One click, no login, no confirmation page beyond a plain "Done."

### A.3 The `law-watch` payoff — a reminders rule

The `law-watch` offer is a promise we must actually keep. In `lib/reminders/engine.ts`, add a rule keyed off the requirements registry's own versioning — a rule change is already a data edit (`effective_to` closed, new dated row inserted). When a `requirements` row's `effective_from` crosses into the last 24h for an active jurisdiction, notify every `law-watch` subscriber for that jurisdiction. Idempotency via the existing `reminder_log (rule_key, target, window_key)` — `window_key` = the requirement's version date, so each change notifies once.

Email body: what changed, the authority, the `source_url`, and a link to the Concealed Knowledge `/updates` page. **No sales copy in a law-change email.** That restraint is the entire reason people will trust it.

---

## Workstream B — The Free Tier (do NOT add a role)

### B.1 The insight — most of this already exists

`captureLead()` **already** creates a client, a case at stage `lead`, and materializes a full checklist from the versioned registry. The "free tier" is not a new system. It is: (1) an anonymous checklist that needs no account at all, and (2) letting a lead claim the account that already exists for their email.

**Do not create a new role.** The four roles (`client`, `staff`, `admin`, `instructor`) stay exactly as they are. A new role means new RLS policies across every table and it is how this codebase has already shipped two policy bugs. The free tier is a `client` whose case is at stage `lead` and who has not enrolled.

### B.2 The anonymous checklist — `/checklist` (marketing route, no auth, no DB)

This is the real lead magnet and the thing USCCA cannot do.

- New marketing route `app/(marketing)/checklist/page.tsx`.
- Takes the eligibility-quiz answers (from the existing localStorage key — reuse it, do not invent a second one) or lets the visitor answer inline if they arrive cold.
- Calls the **pure** generator `lib/requirements/generate.ts` with the derived track. **Zero DB writes. No client row. No case.** A stranger can see their real, personalized NYC document checklist without giving us anything.
- Renders it in the existing house components — `ReticleProgress` for the count, the same requirement-card idiom the portal uses. Extend `components/ui/*`; never fork it.
- Each item shows its `authority` and `source_url` — the provenance is the product.
- **Two calls to action at the bottom, in this order:**
  1. *"Email me this checklist"* → posts to `/api/subscribe` with `offer: 'checklist'`. One field. No name, no phone.
  2. *"Have us run it"* → the existing `LeadForm` → `captureLead()` with `source: 'checklist'`. This is the real conversion; it is second because earning it requires giving value first.
- Add `/checklist` to `app/sitemap.ts`. It is a high-intent SEO page — give it real metadata and a `Service`/`HowTo`-appropriate JSON-LD node via the existing `components/marketing/json-ld.tsx` (extend it; do not add a second JSON-LD system).

### B.3 Claiming the account

At `/auth/sign-up`, when a new profile is created, look for an unclaimed `clients` row (`profile_id is null`) with a matching email — `captureLead()` already leaves exactly that. If found, set `profile_id` and let them into `/portal` with their existing lead case and its already-materialized checklist. That is the entire free tier: **the checklist you already saw, now saved, now trackable.**

Gate the paid surfaces cleanly by case stage, **not** by a new role: a case at `lead` sees the checklist (read-only) and `/portal/enroll`. Document upload, the instructor marketplace, forms, packet assembly, and messaging unlock at enrollment. Show them as visibly locked with a one-line reason — an honest locked door converts better than a hidden one.

### B.4 Mobile

The checklist is the most-used screen on a phone.

- Single column, sticky section headers by requirement group, `≥48px` rows.
- Sticky bottom action bar (thumb zone) holding the primary CTA. Marketing pages currently have no sticky mobile CTA — add one as a reusable `components/marketing/sticky-cta.tsx`, `md:hidden`, `frost`/hairline treatment, and give every page that uses it `pb-24 md:pb-0`.
- Collapse long requirement detail behind a disclosure; the default state is scannable, not a wall.
- Test at 390px before you test anywhere else.

---

## Workstream C — The Refile Promise + Trust Stats

### C.1 The Refile Promise

**Policy, stated exactly once, in `config/policy.ts` (new file), imported everywhere it renders:**

> **The Refile Promise.** If we assemble your filing packet and the License Division returns it as incomplete, we reassemble it and you refile at no additional charge from us. Government fees are set by the City and the State; we do not control them and cannot refund them. This is a promise about our work — not about the outcome of your application. The NYPD retains full investigative discretion.

Why we can afford it: `lib/qa-gate.ts` already forbids a case from reaching `application_assembled` or `filed` until blocking requirements are satisfied, disclosures are narrated, training is within 6 months, track-aware notarized references are met, the photo passes spec, and a **named staff member has signed off**. The promise is simply that gate, said out loud.

**Rules:**
- The word *guarantee* appears **nowhere** in this feature. Neither do *expedite, fast-track, insider,* or *approval rate*.
- The promise never mentions approval, denial, odds, or timelines.
- Renders on `/pricing` (as a band under the package cards), `/how-it-works` (at the QA-gate step), and the homepage trust band. Always adjacent to `brand.disclaimer` — never in place of it.
- **Where it lives structurally:** `config/policy.ts` for the copy; a `refile_promise` boolean on `service_packages` so a package can opt out (the `non_resident` custom track probably should, until scoped). Do not hardcode the eligibility.

### C.2 Trust stats — real, dated, footnoted, or absent

USCCA's numbers persuade because they are big and contradict each other on the same page. Ours will persuade because they are small and true.

New `lib/stats.ts` — a cached (`unstable_cache`, 1h) server function returning:

- `packetsAssembled` — count of cases that have reached `application_assembled`.
- `documentsVerified` — count of `documents` at status `accepted`.
- `filedIncomplete` — the count of packets returned as incomplete. **Publish this number even when it is zero, and especially when it is not.** This is the honest version of an approval rate: it measures *us*, not the NYPD.
- `medianDaysIntakeToFiling` — median, not mean, over cases that reached `filed`.

Rules:
- **Never** publish an approval rate, an approval count, or anything that implies outcome influence. Add it to the banned-copy grep.
- **Suppress below a threshold.** If `n < 25` for a stat, do not render it. A trust stat computed from four cases is a lie with a decimal point. Render the band only when at least two stats clear the bar.
- Every figure carries a footnote: what it counts, over what window, as of what date, computed from our own case records. Model the footnote discipline on USCCA's — big number, honest asterisk — and do it better.
- Render with the existing `HudStat` component. Do not build a second one.

---

## Workstream D — Resources + reciprocity link-out

### D.1 `/resources` (marketing)

A NYC-first quick-links page: NYPD License Division, the carry and premises applications, the fee schedule (**$340 application + $88.25 DCJS fingerprints** — cite both), the CCIA 16+2 training requirement, DCJS, the NYS recertification portal, safe-storage rules.

- Official sources only. Every link carries a `lastVerified` date. Every link must actually resolve — click all of them.
- Content lives in `content/resources.ts` (or MDX under `content/`, matching `lib/blog.ts`'s existing frontmatter convention — pick one and follow it, do not invent a third content system).
- Add to `app/sitemap.ts` and the marketing nav.
- Mobile: accordion groups, `≥48px` rows, external-link affordance on every row.

### D.2 Reciprocity — link out, do not rebuild

Concealed Knowledge owns the map. From CARRY:

- A card on `/portal/license` (the post-issuance hub): *"Where your license is honored"* → deep-link to `concealedknowledge.com/reciprocity?home=ny`.
- A row in `/resources`.
- Nothing more. Duplicating a legal dataset across two repos is how the two of them start disagreeing with each other in public.

---

## Workstream E — Guardrails and verification

### E.1 The copy guard — make it a test, not a habit

New vitest test. Walk every `.tsx`/`.ts`/`.mdx` under `app/`, `components/`, `content/`, `config/`. Fail on a case-insensitive match of:

`guarantee` · `expedite` · `fast-track` · `fast track` · `insider` · `approval rate` · `we file` · `on your behalf` · `endorsed by`

**Allowlist exactly one file:** `config/brand.ts`, whose disclaimer legitimately uses the words to *negate* them (*"We cannot expedite or guarantee any outcome"*). Any new hit is a build failure with a message pointing at `AGENTS.md` rule 4.

### E.2 Fix the placeholders — do this in the same PR

`config/brand.ts` still ships `carry.example`, `concierge@carry.example`, and `(212) 555-0142`. We are about to point paid traffic and a subscription funnel at this site. **A fake phone number on a page that carries a $1,999 offer and now a written promise is not a cosmetic bug.** Replace with real details or the launch is blocked.

### E.3 Verify

1. `pnpm test` — including the new copy guard.
2. `pnpm db:reset && pnpm seed && pnpm db:types`, then run the `scripts/verify-*.ts` harnesses. **Add `scripts/verify-subscribe.ts`**: anon can POST `/api/subscribe`; anon **cannot** select from `subscribers`; a `client` cannot select another subscriber; staff can. Assert positively *and* negatively — that is the house standard.
3. CORS: a preflight from the CK origin succeeds; a preflight from an unlisted origin is refused.
4. Honeypot: a POST with `company` filled returns `{ ok: true }` and writes **zero** rows.
5. Rate limit: the 6th POST from one IP inside the window is refused.
6. `/checklist` while fully logged out writes **nothing** — verify by diffing row counts across `clients`, `cases`, `tasks`, `case_requirements` before and after.
7. Trust-stat suppression: with a seeded DB below threshold, the band does not render at all.
8. 390px pass on `/checklist`, `/pricing`, `/resources`, and the homepage trust band. Sticky CTA clears the last row. Every tap target ≥48px.
9. `prefers-reduced-motion` — every new animation freezes.
10. Grep the built output for the banned words. Zero hits outside the allowlisted disclaimer.

---

## Sequence

**A** (subscribe endpoint + CORS + law-watch rule) → **E.2** (fix the placeholder contact details — it is three lines and it is blocking) → **B** (anonymous checklist, then account claiming) → **C** (Refile Promise copy, then trust stats once there is enough data to clear the threshold) → **D** (resources, link-out) → **E.1/E.3** (guards and verification, run continuously).

One phase per commit. Update `AGENTS.md` "Current state / open items" when the placeholder contact block is finally gone.
