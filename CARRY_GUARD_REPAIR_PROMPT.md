# CARRY GUARD REPAIR — post-QA fix pass

Companion to `CARRY_GUARD_QA_FINDINGS.md` (full evidence). This is the work order.

Everything below was observed on **production**, signed in as the seeded sponsored Carry Guard
case (`QA_SUFFIX=-qa1`): applicant `se2018+applicant-qa1@`, sponsor `se2018+sponsor-qa1@`,
company `Test Guard Co.-qa1`. Reproduce with:

```bash
QA_SUFFIX=-qa1 QA_PRECLAIM=1 ENV_FILE=.env.prod pnpm tsx scripts/seed-sponsor-test.ts
QA_SUFFIX=-qa1 ENV_FILE=.env.prod pnpm tsx scripts/qa-access.ts   # prints password + sign-in links
```

---

## Verdict

**The Carry Guard alignment work landed and is verified.** Firearm licence flag, structured
employment addresses, residence country, NYS ID, history-gap guidance and — the one we set out to
fix — **"Your written statements — 0 of 5 captured"** all behave correctly for `carry_guard`.

**The sponsored flow is not shippable to a live client.** One blocker chain means a sponsored
application literally cannot be completed, and a second means the applicant is billed for a service
their sponsor is paying for. Fix P0 before anyone is onboarded.

---

## P0 — Blocks a real filing. Do these first.

### P0-1 · The applicant cannot grant sponsor consent
**Symptom:** `/portal` renders the consent card ("… wants to help with your file → **Review &
decide**"). Clicking it, or navigating to `/portal/sponsor` directly, silently lands back on
`/portal`. No error, no message.

**Why it is fatal:** no consent → the sponsor portal stays permanently empty → the gun custodian
licence number can never be entered → the Carry Guard step-3 block never clears → the application
cannot be filed. There is no other route through.

**Where:** `app/portal/sponsor/page.tsx` has two redirect branches — `!myCase` and
`rows.length === 0`. The second is the suspect, because `components/portal/sponsor/sponsor-banner.tsx`
runs the same RLS-scoped query against the same table on the same page load and **does** return the
row (it renders the company and rep name). Bisect the differences:
- the page also selects `id, scope`
- it embeds `sponsor:sponsors(legal_name)`
- it adds `.order("created_at", { ascending: true })`

A failed embed or ordering makes PostgREST return `data: null`; the code reads that as "no
sponsorship". RLS itself looks correct (`case_sponsorships_select` uses `case_visible(case_id)`;
`sponsors_select` admits the case owner via the sponsorship).

**Also fix the class of bug, not just this instance:** log the reason and never redirect silently
from a route the UI just linked to. A silent bounce is why this survived to production.

**Acceptance:** as the seeded applicant, "Review & decide" opens the consent screen; granting
consent makes the case appear in the sponsor portal; a regression test covers applicant-consent →
sponsor-visibility.

### P0-2 · A sponsored applicant is shown a $1,000 paywall
**Symptom:** `/portal` shows *"You chose Full Concierge — finish your payment to unlock it"* with
**Finish enrolling → `/portal/choose-path`**, quoting **$1,000 / $500 to start**. At the same moment
`/portal/concierge` renders *"[FULL CONCIERGE] Welcome, Marcus. You're on the done-for-you path."*
The card persists even after the concierge engagement is signed.

**Why it is wrong:** per `scripts/seed-sponsor-test.ts`'s own comment, a sponsored case is
*"a concierge experience unlocked by the sponsorship itself, not a Stripe purchase."*

**Where:** `app/portal/page.tsx` — the `needsConciergePayment` branch. It reads payment state; for a
sponsored case it must read `service_mode` plus an active sponsorship.

**Acceptance:** a sponsored concierge case never shows a payment card or a price anywhere in the
applicant portal; the two surfaces agree on one state. Add a test asserting
`needsConciergePayment === false` for a sponsored case.

---

## P1 — Wrong or contradictory information reaching a client.

### P1-1 · Applicant and safeguard person are told opposite things about the same document
`/portal/forms` tags **Safeguard-Person Designation** `NOTARIZE` — *"signs it in front of a notary
— don't sign it yourself."* The safeguard person's own page (`/g/<token>`) says twice: *"Sign in
front of a witness — **not a notary**"* and *"No notary is required for this form."* `SFG-01` in the
concierge vault agrees with the safeguard page.

Two of three surfaces say witness. Make `/portal/forms` match, and grep for any other place the
designation is described.

### P1-2 · A Carry Guard case is described as "concealed carry"
`/portal` subtitle: *"Tracking your NYC **concealed carry** application, end to end."* Case track is
`carry_guard`. Derive the wording from `license_track` (it comes from `getMessages()` / `t.portal.tagline`
— it must be track-aware, not a constant).

### P1-3 · Disclosure copy uses the dead paper-form numbering
The concierge disclosure section says the portal *"asks about your history (**questions 10–28**)"*
and *"asks **seventeen** questions"*. The live NYPD portal asks **16** questions numbered **1–16** —
which is exactly what `lib/disclosures/portal-questions.ts` already implements. Derive the count and
range from `PORTAL_DISCLOSURES`; never hardcode either again.

### P1-4 · Sponsored case leaves "Currently employed?" unset, hiding the employer block
Every `employer.*` fact is `showWhen employer.employed = "Yes"` and nothing backfills it. On a
sponsored case the employer IS the sponsoring company and the facts already resolve sponsor-first —
but none render, so the applicant sees an empty Employer section. Give `employer.employed` a `from`
that returns "Yes" when a sponsorship exists.

### P1-5 · `/portal/checklist` silently redirects
The home page advertises *"Intake complete — view your personalized checklist"*; the link bounces to
the engagement gate with no explanation. Either explain the gate on arrival or don't show the link
until it's reachable. Same anti-pattern as P0-1.

---

## P2 — Polish. Real, cheap, visible.

- **P2-1 · Missing spaces from unspaced JSX expressions.** Confirmed three:
  `"Marcus Powelldesignated you…"` (`/g/<token>`, the first line a third party reads),
  `"handled on the Peoplepage"` (`/portal/forms`),
  `"…and citizenship— upload it once"` (concierge vault).
  Grep the codebase for `}` immediately followed by a word character in JSX rather than fixing only these.
- **P2-2 · Safeguard upload buttons contradict their own page.** Both read *"Choose the notarized
  file"* on a page that twice says no notary is required — and one of them is a photo of a driver's
  licence. Suggest "Choose a photo of your ID" and "Choose the signed form".
- **P2-3 · Citizenship renders a raw legacy token.** "Are you a U.S. citizen?" shows **`citizen`**,
  which matches none of the select's options. The fill layer maps the legacy token; the details UI
  does not. Normalise on read so migrated cases display a valid option.
- **P2-4 · Two denominators for the same thing.** `/portal/details` says *"24 of 33 details
  captured"*; the concierge data-ask says *"Your details — 15 of 16"*. Both are one click apart.
- **P2-5 · Retry the safeguard document on a cold miss.** The first-ever request to
  `/g/<token>/document` returned **404**; the next seven returned a clean 109 KB PDF. Not
  reproducible, but it happened minutes after the invite row was written on a cold serverless route
  — exactly the real shape (invite created → email sent → clicked seconds later). The user-facing
  string is *"This link is invalid or has expired"*, which nobody retries. Add a short retry and
  soften the copy.

---

## P3 — Structural, for the B2B channel. Design before building.

- **P3-1 · The sponsor portal has no navigation, and growth runs through a `mailto:`.** The whole UI
  is a logo, Switch account, Sign out, and "Add another applicant" — a pre-filled email to
  `gunlicensenyc@gmail.com`. The argument for onboarding a company like ISS is that the fifth and
  twentieth guard cost almost nothing; today each one is a hand-provisioned email.
- **P3-2 · A sponsor can supply nothing before consent — including their own company data.** Legal
  name, agency licence, business address and the custodian pair are the company's own data, yet none
  can be entered until the applicant consents. That inverts the real engagement, where the employer
  is ready first. Let a sponsor complete a company profile at any time and bind it to cases as
  consent arrives. This also removes the longest pole in the Carry Guard timeline.

---

## Still unanswered — do not guess in code

Carried over from `CARRY_GUARD_ALIGNMENT_PROMPT.md`; the `// OPEN:` markers stay until a human
confirms:

1. **Safeguard NY residency** — the NYPD portal says "ideally from New York State" on its data-entry
   step and "must be … a resident of New York State" on its review step. We advise on the stricter
   reading; confirm with the License Division.
2. **Training** — `FRM-01` models the **47-hour** armed-guard course; the NYPD upload slot cites the
   **18-hour DCJS** course under PL 400.00(19). An armed-guard applicant likely needs both tracks.
   Confirm with DCJS before any client-facing copy states it.
3. **Letter of Necessity surface** — whether `lop1` belongs to the LON document or somewhere in the
   portal. Decides `REQUIRED_LON_STATEMENTS`.

---

## Do not do

- Do **not** touch `redesign/v2`.
- Do **not** "fix" the Supabase magic-link Gateway Timeout — investigated, transient, auth is fine.
- Do **not** chase a hydration bug on `/portal/concierge` — investigated, the page is fine.
- Do **not** gate filing on the training certificate; NYPD does not.
- Do **not** add applicant-facing fields that a derivation or a third-party invite could supply.

## Verification

- `pnpm test` green, plus new regression tests for P0-1, P0-2, P1-3 and P1-4.
- Re-seed a clean clone set (`QA_SUFFIX=-qa2`) and walk: applicant consent → sponsor sees the file →
  sponsor enters the custodian licence number → the applicant's step-3 block clears.
- Confirm no price or payment card appears anywhere in a sponsored applicant's portal.
