# Access codes — comp / demo / discount bypass

> Add a code-redemption path to the payment surfaces so a demo, a comped partner, or a discounted customer can unlock Self-Guided or Full Concierge without paying. **Phase 1 is the tonight build** — scoped to ~30–45 minutes. Phases 2–3 harden it.

---

## THE DESIGN (read first — this is why it's small)

`hasPaidPackage(db, caseId, key)` in `lib/packages.ts` is already **the single unlock test** for the concierge dashboard, the portal home, the choose-path resume, the work queue, and the reminders engine. It answers one question: *is there a `payments` row with `status='paid'` and this `package_key`?*

So a comp code does not need new unlock logic, a new column on `cases`, or a special case anywhere. **It writes a paid `payments` row of `amount_cents: 0`** and every one of those five surfaces unlocks by itself.

This is exactly what `recordOfflinePayment` in `app/admin/actions.ts` already does for a check or a bank transfer. An access code is the same action, client-initiated, gated by a secret instead of by `requireAdmin`. **Model the new action directly on it** — same insert shape, same `autoAssignConciergeAgent` call, same `logActivity` discipline.

**Two mechanisms, not one:**
- **Comp (100% off)** — demos, partners, the lead trainer, goodwill. Skips Stripe entirely. This is Phase 1 and it's the one you need tonight.
- **Real discount (e.g. 20% off)** — actual money still changes hands, so it must go through Stripe. **Do not build a discount engine.** Phase 3 uses Stripe's own promotion codes.

---

## PHASE 1 — Comp codes (BUILD THIS TONIGHT)

### 1.1 — Where the codes live

Server-only environment variable. **Never `NEXT_PUBLIC_*`** — that prefix ships the value into the browser bundle where anyone can read it in devtools.

```
# .env.local  /  Vercel env (Production + Preview)
ACCESS_CODES="GLNYC-DEMO-7Q4M-XKPD:*:comp:demo,GLNYC-PARTNER-3RJ8-WQ2V:*:comp:comp"
```

Format per entry: `CODE:packageKey:kind:flavor`
- `packageKey` — `self_guided` | `full_concierge` | `*` (either)
- `kind` — `comp` (Phase 1 only supports comp)
- `flavor` — `demo` (marks the case as a demo, see 1.4) | `comp` (a real comped customer, real case)

Parse it in a new `lib/access-codes.ts`. If the var is unset, the feature is simply off — the UI link doesn't render.

**Generate codes that can't be guessed.** Not `DEMO2026`. Use `GLNYC-<LABEL>-<4>-<4>` with random alphanumerics, e.g. `openssl rand -hex 4 | tr 'a-f' 'A-F'`. Label the code with its purpose so the activity log reads clearly.

### 1.2 — The server action (this is where security lives)

New server action `redeemAccessCode(prev, formData)` in `app/portal/choose-path/actions.ts`:

```
1. requireRole(["client"]) + getMyCase() ownership — same preamble as choosePath.
2. RATE LIMIT before anything else, using the EXISTING lib/rate-limit.ts:
     const ip = clientIpFrom(await headers())
     if (!rateLimit(`access-code:${ip}`, 5, 10 * 60_000)) return { error: "Too many attempts. Try again shortly." }
     if (!rateLimit(`access-code-case:${myCase.id}`, 5, 10 * 60_000)) return { ... }
   Both keys — IP alone is trivially rotated, case alone is trivially multiplied.
3. Normalise input: trim, uppercase, strip spaces. Cap length at 64 before any work.
4. TIMING-SAFE compare against each configured code (crypto.timingSafeEqual on
   equal-length buffers, or compare SHA-256 digests which are always equal-length —
   simpler and avoids the length-mismatch throw).
5. Validate the code allows the requested packageKey ('*' or exact match).
6. ONE REDEMPTION PER CASE: if hasPaidPackage(db, caseId, packageKey) is already
   true, return a friendly "You already have access" — don't write a second row.
7. On success, write the paid payments row (see 1.3) and set service_mode.
8. On failure return ONE generic message — "That code isn't valid." Never
   distinguish unknown / expired / wrong-package. Distinguishing them turns the
   field into an oracle.
9. LOG EVERY ATTEMPT via logActivity, success and failure:
     action: 'access_code.redeemed' | 'access_code.rejected'
     detail: { code_label, package, ip, flavor }   ← label, never the raw secret
```

**The check must run in the server action.** Do not put the code in a client component, do not compare it in `onSubmit`, do not pass the valid codes to the client to check against. If the comparison happens in the browser, the code is in your JS bundle and the bypass is public.

### 1.3 — What redemption writes

Mirror `recordOfflinePayment`'s insert:

```
payments row:
  case_id, client_id
  amount_cents: 0
  type: 'full'
  status: 'paid'
  paid_at: now()
  package_key: <requested>
  description: `Access code redeemed (${codeLabel}) — comped, no payment collected`

then:
  cases.service_mode = 'concierge' | 'self_guided'
  if full_concierge → autoAssignConciergeAgent(supabase, caseId)   ← reuse, don't reimplement
```

The `$0` amount and the explicit description mean a comp can never be mistaken for revenue in `/admin/payments`. **Add a "Comped" chip** to the payments table for any `amount_cents === 0` row so it's visually unmistakable in a list of real sales.

### 1.4 — The demo flag (do not skip this)

```
migration: alter table public.cases add column is_demo boolean not null default false;
```

A code with flavor `demo` sets `is_demo = true` on the case. Then:

```
1. lib/concierge/queue.ts       → exclude is_demo cases from the work queue
2. lib/reminders/engine.ts      → never send a reminder to a demo case
3. lib/analytics.ts / stats.ts  → exclude from any revenue or conversion count
4. Admin UI                     → a clear amber "DEMO" badge on the case header
                                  and in the pipeline, so nobody works one by mistake
5. Admin action                 → "Delete demo cases" (requireAdmin, confirm dialog,
                                  logged) that hard-deletes is_demo cases and their
                                  children, so cleanup after a presentation is one click
```

Without this, every demo you run seeds a live case that emails you at 1 day and 3 days, sits in the queue as an attention item, and pollutes your numbers.

### 1.5 — The UI

On **both** payment surfaces — `components/portal/choose-path-cards.tsx` and the enroll page:

```
- A quiet text link under the primary CTA: "Have an access code?"
  NOT a large button. Reasons: a prominent BYPASS control invites probing from
  anyone browsing, and a modest promo-code field reads as completely normal retail
  if a prospect happens to see you use it. You know where it is; that's enough.
- Clicking expands a single input + Apply, inline, no modal, no page change.
- Never use the words "bypass", "demo", "skip payment", "free", or "test" in
  customer-visible copy. It's an access code.
- On success: brief confirmation, then straight to the destination the purchase
  would have reached — /portal/concierge (concierge) or /portal/intake (self-guided).
  The demo must land exactly where a paying customer lands.
- On failure: the generic message, inline, field stays focused. Disable the button
  while submitting so a double-click can't burn two rate-limit slots.
- Mobile-first at 390px — you may well demo from a phone.
```

### 1.6 — Tonight's checklist

```
[ ] ACCESS_CODES set in .env.local (and Vercel, if demoing the deployed site)
[ ] Code generated randomly, written down, NOT committed to the repo
[ ] .env.local is in .gitignore (verify — a committed code is a public code)
[ ] Full dry run 20 minutes before: fresh signup → intake → choose Full Concierge
    → "Have an access code?" → redeem → agreements gate → concierge dashboard
[ ] Confirm the demo case shows the DEMO badge and does NOT appear in the work queue
[ ] Have a fallback: if anything misfires, recordOfflinePayment from the admin
    console still unlocks the case in ~15 seconds
```

---

## PHASE 2 — Move codes into the database (after tonight)

The env var doesn't scale past a handful of codes and can't expire, limit, or report.

```
create table public.access_codes (
  id uuid primary key default gen_random_uuid(),
  label text not null,                 -- "Aug 19 partner demo" — human meaning
  code_hash text not null unique,      -- SHA-256 of the normalised code. NEVER the plaintext.
  package_key text,                    -- null = any
  kind text not null default 'comp',   -- 'comp' for now; 'percent'/'fixed' land in Phase 3
  value_pct integer,                   -- Phase 3
  is_demo boolean not null default false,
  max_redemptions integer,             -- null = unlimited (avoid)
  redemption_count integer not null default 0,
  expires_at timestamptz,
  active boolean not null default true,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.access_code_redemptions (
  id uuid primary key default gen_random_uuid(),
  code_id uuid not null references public.access_codes(id) on delete cascade,
  case_id uuid not null references public.cases(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  payment_id uuid references public.payments(id) on delete set null,
  redeemed_at timestamptz not null default now(),
  unique (code_id, case_id)            -- one redemption per case, enforced in the DB
);
```

```
1. Store the HASH only. If your database is ever exposed, the codes aren't.
   Show the plaintext exactly once, at creation, with a copy button — like an API key.
2. RLS: staff/admin read; NOBODY reads via the client. All validation server-side.
3. Increment redemption_count atomically (a DB function or an update with a
   `where redemption_count < max_redemptions` guard) so two simultaneous
   redemptions can't both slip past the cap.
4. Admin UI at /admin/access-codes: create, deactivate, see redemption count and
   who redeemed. Deactivate must take effect immediately.
5. Notify on redemption — email or a dashboard alert to admins. A comped concierge
   case consumes real staff hours; you want to know the moment one is created.
6. Keep the env-var path as a fallback so a DB hiccup can't strand a live demo.
```

**Rotate after every public demo.** If you type a code in front of an audience, assume it's compromised — deactivate it and issue a new one. Give each presentation its own single-use code with `max_redemptions: 1` and a same-day `expires_at`.

---

## PHASE 3 — Real discounts (use Stripe, don't build this)

For a genuine discount, money still moves, so it must reconcile in Stripe. Building your own percentage math means your `payments.amount_cents` and Stripe's `amount_total` can silently disagree — an accounting problem you don't want.

```
1. Create coupons + promotion codes IN STRIPE (dashboard or API).
2. Set `allow_promotion_codes: true` on the Checkout session in
   app/portal/enroll/actions.ts. One line. The customer enters the code on
   Stripe's page and Stripe applies it.
3. CAVEAT — you insert the pending payments row BEFORE checkout with the full
   amount. When a promo code reduces the total, that row is now wrong. In the
   webhook, update the payment's amount_cents from the session's actual
   `amount_total` on completion. Add a test for the discounted case.
4. Keep the on-page "Have an access code?" field for COMPS only. Two doors:
   comps never touch Stripe, discounts always do.
```

---

## VERIFY

```
1. NOT IN THE BUNDLE: `pnpm build`, then grep the client chunks in .next/static
   for a live code string — zero hits. Also grep the whole repo: no code in any
   committed file.
2. UNLOCK PARITY: a comped concierge case reaches /portal/concierge, passes the
   agreements gate, and behaves identically to a paid one. A comped self-guided
   case reaches intake and the checklist.
3. RATE LIMIT: 6 wrong codes in a row → blocked with the generic message. Confirm
   the block is keyed on BOTH ip and case.
4. NO ORACLE: a valid code for the wrong package, an unknown code, and (Phase 2)
   an expired code all return the identical string.
5. IDEMPOTENT: redeeming twice on one case creates exactly one payments row.
   In Phase 2, the unique (code_id, case_id) constraint is what proves it.
6. DEMO ISOLATION: an is_demo case is absent from the work queue, receives no
   reminder email at any bucket, is excluded from revenue/conversion stats, and
   is visibly badged in admin.
7. MONEY HYGIENE: the comped row shows $0 with the "Comped" chip in /admin/payments
   and adds nothing to revenue totals.
8. AUDIT: a successful and a failed redemption both appear in the activity log
   with the code LABEL and never the secret itself.
9. GUARDRAILS INTACT: comping payment changes nothing downstream — the CP-5 gate
   still blocks application_assembled on open requirements, signature exclusions
   still hold, and the privacy firewall is untouched. A comped case is a normal
   case that didn't pay; it is not a privileged one.
10. pnpm build && pnpm test green; 390px on both payment surfaces.
```

---

## DO NOT

- Do not compare the code in a client component or ship the valid codes to the browser.
- Do not use a `NEXT_PUBLIC_` env var for any part of this.
- Do not commit a code to the repo, put one in seed data, or paste one into a fixture.
- Do not use a guessable code (`DEMO`, `TEST`, `FREE2026`, the company name alone).
- Do not let a code skip the agreements gate, the QA gate, or any requirement — it
  substitutes for *payment* and nothing else.
- Do not reveal why a code failed.
- Do not build percentage discount math outside Stripe.
- Do not let a demo case send email to anyone.
