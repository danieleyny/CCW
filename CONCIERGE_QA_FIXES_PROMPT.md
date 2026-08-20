# Concierge QA fixes — Claude Code build prompt

> Fix the defects found in the 20 Aug 2026 QA pass over the concierge pivot (Phases 0–10, `main` @ `8a541b7`). Each phase below states the **observed behaviour**, the **root cause I verified in the code**, and the **fix**. Work in phases, smallest blast radius first. Each phase ends with `pnpm build` + `pnpm test` green and mobile-first at 390px.
>
> **Guardrails (do not regress — these were adversarially tested and all held):**
> - The CP-5 gate governs `application_assembled` and every later stage. Nothing in this prompt may bypass it, and nothing may auto-satisfy a requirement that is a review decision.
> - The applicant's signature must never be applicable to REF-01/REF-02, COH-01-with-household, or the NYPD application. `isSignable` + the COH-01 generator throw are the enforcement; leave both intact.
> - The concierge journey ends at "ready for your review & filing", never "filed". No guarantee / expedite / approval-rate / we-file language anywhere.
> - `case_requirements.notes` is instructor-readable — never put reviewer prose or disclosure content there.
> - Privacy firewall: a non-agent trainer still sees no disclosures, notes, tasks, intake answers, or PII beyond the active engagement.

---

## PHASE 1 — The passport fan-out dies at approval (HIGH — silent dead-end)

**Observed:** Applicant uploads a U.S. passport into the concierge vault against "A photo of your ID". Staff approve it. `IDN-01` goes satisfied; **`IDN-02` (date of birth) and `IDN-03` (citizenship) stay unsatisfied forever.** Because `buildVaultItems` collapses IDN-02/IDN-03 out of the vault's ask list whenever IDN-01 is present, the applicant is never asked for them and is explicitly told the passport covered them. Two blocking requirements are stranded with no applicant-visible route to resolve them, so the case can never pass the CP-5 gate.

**Root cause (verified):** the upload path is correct — `recordDocument` (`app/portal/actions.ts`) resolves the smart kind and fans `document_id` across every outstanding requirement the kind covers (IDN-01/02/03), deliberately *not* satisfying them ("satisfaction is a review decision"). But `reviewDocument` (`app/admin/actions.ts`) then resolves **exactly one** `targetReqCode` — `doc.req_code`, which is `IDN-01` for a vault upload — and satisfies only that one. The sibling requirements the upload bound are never revisited.

```
1. In reviewDocument, stop resolving a single req_code. Resolve the FULL SET of
   case_requirements this document is evidence for:
     a. every case_requirement on this case whose document_id = input.documentId
        (this is exactly what the upload-time smart fan-out bound), UNION
     b. the existing targetReqCode resolution (doc.req_code, else the
        actionFor().documentType fallback) — keep it for legacy docs and for
        uploads that never went through a smart kind.
   Skip any row with status 'na'.
2. APPROVE → set every row in that set to satisfied + document_id + reviewer.
   REJECT  → set every row in that set back to pending with the same neutral,
             instructor-safe note that exists today. Do not leave a sibling
             satisfied off a rejected file.
3. Log the full set in the activity detail (e.g. satisfiedReqCodes: [IDN-01,
   IDN-02, IDN-03]) so one approval that answered three requirements is legible
   in the audit trail.
4. Do NOT widen beyond what the upload bound — never satisfy a requirement this
   document isn't already evidence for. The smart-document map
   (lib/requirements/smart-documents.ts) stays the single source of truth for
   which codes a kind may cover; it is deliberately under-claimed and correct.
5. Regression test (vitest): a passport upload + approve satisfies IDN-01/02/03;
   a driver's-license upload + approve satisfies IDN-01/02 and leaves IDN-03
   untouched; a rejection resets all bound rows; a legacy document with no
   req_code and no bound rows still resolves via the documentType fallback.
```

**Also fix the honesty gap in the meantime:** if a smart-covered sibling requirement is still unsatisfied and is *not* rendered in the vault, the applicant has no way to see it. After the fix, the vault's "N of M in" counter should reflect the fan-out. Confirm with the copy — the green reassurance line must be true.

---

## PHASE 2 — Post-fork payment limbo (HIGH — the buyer is stranded)

**Observed:** `choosePath` writes `case.service_mode = 'concierge'` and *then* hands off to Stripe. Close the checkout tab (or fail the card) and the applicant lands on `/portal` — the self-guided home — with no mention of concierge, no "finish your payment", and the fork nudge suppressed, because `needsPathChoice = intakeDone && !serviceMode` and `service_mode` is now set. `/portal/concierge` redirects to `/portal/choose-path`, which *does* show "You picked this — finish payment to begin" — but nothing in the UI links there. Only typing the URL recovers. The Phase 7 `concierge_agreements_pending` reminder is scoped to paid cases, so no email rescues them either.

```
1. Add a PENDING-PATH state to the portal. When case.service_mode is set and the
   matching package is NOT paid, /portal must render a clear, warm card above the
   fold — "You chose Full Concierge — finish your payment to unlock it" — with a
   CTA to /portal/choose-path (which already handles the resume correctly).
   This replaces today's silent fallthrough to the self-guided next-step card.
2. Make the nudge condition path-aware:
     needsPathChoice   = intakeDone && !serviceMode && !isLicensed && !isDenied
     needsPathPayment  = intakeDone && !!serviceMode && !paidForThatMode
   Both route to /portal/choose-path.
3. Add a Phase 7 reminder rule `concierge_payment_pending` for cases with
   service_mode='concierge' and no paid full_concierge payment, bucketed 1d/3d
   like the others, idempotent via reminder_log. Copy: warm, no pressure, no
   guarantee language.
4. Decide and implement ONE of these (I'd take (a) — it's the smaller change and
   keeps the "reversible until paid" promise the choose-path footer makes):
     (a) keep writing service_mode pre-payment, and rely on steps 1–3 to make the
         unpaid state visible and recoverable everywhere; or
     (b) don't persist service_mode until payment succeeds, and carry the intent
         through checkout metadata instead.
   Whichever you pick, `/portal/choose-path` must remain reachable and must keep
   letting them switch paths before paying.
```

---

## PHASE 3 — Concierge can only be unlocked by self-serve Stripe checkout (HIGH — blocks the actual sales motion)

**Observed:** `/portal/concierge` gates on a payment row with `status='paid'` AND `package_key='full_concierge'`. `package_key` is written in exactly one place — `app/portal/enroll/actions.ts` (the self-serve checkout). The admin console's `requestPayment` inserts a payment row with **no `package_key`**, and the webhook's `invoice.paid` / `payment_intent.succeeded` handlers don't set one either. There is no admin control to record an offline payment at all.

Consequence: a client sold on a call, invoiced, or pre-staged through the Phase 5 "create a concierge client by email" flow can pay in full and still be bounced to `/portal/choose-path` and asked to pay $1,000 again. Both of my test cases sat at "Awaiting payment" in the work queue until I inserted a payment row by hand.

```
1. requestPayment: accept an optional packageKey ('self_guided' | 'full_concierge')
   and persist it on the payment row. Surface it in the admin request-payment UI
   as a package selector, defaulting to the case's service_mode when one is set.
   Amounts still come from service_packages — never hardcode.
2. Add an admin-only RECORD OFFLINE PAYMENT action: amount, package, method
   (check / transfer / cash / other), reference note. Writes a payments row with
   status='paid', paid_at, package_key, and a description that makes the manual
   provenance obvious. Log it via logActivity with the acting staff member —
   this is a money record, it must be attributable. Guard with requireAdmin (not
   requireStaff) and make it visible on /admin/payments.
3. Extract the "has this case paid for X?" test into ONE helper (e.g.
   lib/packages.hasPaidPackage(db, caseId, key)) and use it in all four places
   that currently duplicate the query: app/portal/concierge/page.tsx,
   app/portal/choose-path/page.tsx, app/portal/page.tsx, lib/concierge/queue.ts
   (and the reminders engine). Right now a change to the unlock rule has to be
   made in five files.
4. Consider (your call, product not code): should an admin setting
   service_mode='concierge' plus a recorded offline payment be the canonical
   unlock, with Stripe as one of several ways money arrives? The current design
   couples "has access" to "paid us through Stripe checkout", which is the root
   of this whole class of bug.
```

---

## PHASE 4 — Stop handing concierge applicants back to the self-guided checklist (MEDIUM — this is the $1,000 promise)

**Observed:** On the concierge dashboard, "The one thing we need from you" CTA links to `/portal/checklist`. So does the vault's "Add or update their details". The top nav on the concierge dashboard is still the full self-guided nav (Checklist, Documents, People, Forms, Payments, License, Appeal) with **no Concierge item**. `/portal/checklist` greets a concierge customer with "This is the journey view: what's left and what to do next" and a 14-item to-do list — the exact experience they paid to avoid, one click from "we drive it, you watch".

Worse, the asks it surfaced were *our* preparation steps: "Your written explanations for the application's history questions" and "Read and sign your affirmation of understanding."

```
1. Give the concierge path its own nav. Add a "Concierge" (home) item for
   service_mode='concierge' cases and hide or de-emphasise Checklist. Documents,
   Messages, Payments can stay. Nothing should present a to-do list to a
   concierge applicant.
2. Route computeNextStep's concierge output INSIDE the concierge surface:
   - a document ask → deep-link to that card in the vault (anchor + focus),
     not /portal/checklist;
   - a people ask (references / cohabitants) → the roster editor rendered inside
     the concierge dashboard, not the checklist page;
   - an intake ask → /portal/intake is correct, keep it.
   Add a concierge-aware variant of next-step rather than reusing the
   self-guided hrefs verbatim.
3. Reclassify preparation steps. On a concierge case, a "generate + sign" item
   (DSC-01, AFF-01, SAF-01, sole-occupancy) is OUR work to prepare and THEIR work
   only to review-and-adopt. It belongs in the Review & file section as
   "here's what we drafted for you — review and apply your signature", NOT in
   "the one thing we need from you". "The one thing we need from you" should be
   reserved for things only the applicant can supply: a document we don't have,
   their intake, names + emails for references.
4. If a concierge applicant does land on /portal/checklist by URL, render a
   concierge banner ("You're on the done-for-you path — we're handling this list.
   Here's your dashboard") instead of the self-guided journey framing.
```

---

## PHASE 5 — Admin-created clients can't get in (MEDIUM)

**Observed:** In `createClientWithCase`, ticking "Create a portal account" provisions the auth user with `password: crypto.randomUUID()` and the invite is a TODO comment: `// (An invite/password-reset email would be sent here once email is enabled.)`. Nothing is sent, even with Resend configured. So: box ticked → the account exists, nobody knows the password, no reset arrives, the client is **locked out**. Box unticked → works (the email-keyed claim on signup is solid — see below), but only if the client independently finds the signup page.

```
1. Implement the branded invite. On account provisioning, send a set-your-password
   invite via lib/email (Supabase generateLink type=invite or recovery, wrapped in
   the existing branded template). For a concierge case, the copy should say what
   they're walking into: sign your agreements, book your intro call, send us your
   documents.
2. When RESEND_API_KEY is unset, degrade like the rest of the product does:
   surface a COPY INVITE LINK button in the admin case header so staff can paste
   it into their own email or a text. Never leave a provisioned account with no
   route in.
3. Add a resend-invite action on the case file for staff, rate-limited and logged.
4. Fix the "Stage updated · client notified" toast — it currently claims a
   notification regardless of whether email is configured or the client even has
   an account. Say what actually happened.
```

---

## PHASE 6 — The work queue buries the cases the Phase 5 flow creates (MEDIUM)

**Observed:** `deriveSignal` in `lib/concierge/queue.ts` gives "Awaiting payment" **priority 90, tone `waiting`** — bottom of the queue, greyed out. That's precisely where every admin-created concierge case lands the moment it's created. The hub built to run the done-for-you operation renders its own intake pipeline as passive background noise.

```
1. Split the unpaid signal by who created the case / whether the applicant has an
   account yet:
     - staff-created, no account claimed  → "Invite them" · attention · ~12
     - staff-created, account claimed, unpaid → "Awaiting payment — chase" · attention · ~18
     - self-serve chooser, unpaid         → "Chose concierge, hasn't paid" · attention · ~19
   Keep a genuine low-priority 'waiting' only for cases where the ball is
   provably not in your court.
2. Show the queue count of attention items on the /admin/concierge nav item so an
   operator sees it without opening the page.
```

---

## PHASE 7 — One definition of "agreements signed" (MEDIUM — latent, bites on the first version bump)

**Observed:** three implementations:
- `lib/concierge/onboarding.ts` (the gate) checks **kind @ current version** — correct; a version bump reopens the gate by design.
- `lib/concierge/queue.ts` counts **raw `case_agreements` rows ≥ REQUIRED_AGREEMENT_KINDS.length**.
- `lib/reminders/engine.ts` does the same row count.

The moment you bump any agreement version — which `config/agreements.ts` is explicitly built for, and which the attorney review will almost certainly cause — the work queue and the reminder engine will report a case as signed while the applicant's dashboard is locked, and the "sign your agreements" nudge will never fire for the person who needs it.

```
1. Export ONE predicate from lib/concierge/onboarding.ts, e.g.
   agreementsCurrentFor(rows: {kind, version}[]): { complete: boolean; missing: string[] }
   operating on kind@currentVersion.
2. Use it in the gate, the queue, and the reminders engine. Both batch callers
   already select case_agreements — have them select `kind, version` and pass the
   rows through the shared predicate instead of counting.
3. Unit test the version-bump case explicitly: 5 signed rows at v1, bump
   esign_consent to v2 → gate locked, queue says "needs to sign", reminder fires.
```

---

## PHASE 8 — Concierge agents can't include the lead trainer (MEDIUM)

**Observed:** `/admin/concierge` builds the roster from `profiles where role in ('staff','admin')`. The `is_concierge_agent` flag can therefore never be applied to an instructor — i.e. to the lead trainer / operational partner, who the concept doc explicitly names as a concierge agent.

```
1. Include role='instructor' profiles in the concierge-team roster, clearly
   sectioned ("Staff" / "Trainers").
2. IMPORTANT — this is where the flag stops being cosmetic. Today the copy says
   "It's a label for assignment and the work-queue — not a permission change;
   every staff member can already work any case." That is true for staff and
   MUST NOT become true for instructors. Marking a trainer as a concierge agent
   must grant a scoped, logged elevation ONLY on their assigned concierge cases,
   and must not widen the privacy firewall by default.
3. Prove it with RLS negative tests before shipping:
     - a trainer who is NOT a concierge agent still cannot read disclosures,
       notes, tasks, intake answers, or pre-accept PII — unchanged;
     - a concierge-agent trainer's widened access is scoped to concierge cases
       they are assigned to, and to nothing else;
     - no self-guided case and no unassigned case is affected.
   If you cannot land the scoping cleanly in this phase, ship step 1 as
   roster-visibility only and leave the elevation to a follow-up — do not ship a
   flag that quietly widens instructor access.
```

---

## PHASE 9 — Copy, feedback, and small correctness (LOW)

```
1. "You picked this — finish payment to begin" is shown to applicants whose path
   was set by STAFF. Vary the copy on provenance: if service_mode was set by an
   admin (check the activity log or add a column), say "Your concierge case is
   set up — here's what it includes" instead of attributing the choice to them.
2. Debounce the sign-up submit. Double-clicking "Create account" produced a
   Postgres 23505 unique-violation and a full "Something went wrong" error screen
   on /portal/intake. It self-heals on refresh and leaves no duplicate rows, but
   it's the applicant's first impression. Disable the button on submit and make
   the provisioning path idempotent against a concurrent second call.
3. Agreements gate: only agreement #1 is expanded, and you can sign all five
   without opening 2–5 — while the recorded consent asserts "I have read the
   engagement agreements above." Require each to be expanded (or add a per-
   agreement acknowledgement) before the signature pad unlocks, and record WHICH
   were opened in the audit detail. This is cheap now and expensive to retrofit
   after real signatures exist.
4. Blank canvas + "Use this signature" silently does nothing. Show "Draw or type
   your signature first."
5. Vault feedback: an uploaded document shows a raw `PENDING` chip in an
   otherwise retail-voiced surface, and the "N of M in" counter doesn't move until
   staff approve. Use concierge voice ("Got it — we're checking this") and count
   received documents separately from approved ones, so sending a file visibly
   does something.
6. Assign someone. Marco's paid concierge case had Consultant "Unassigned" while
   his dashboard invited him to "Message your concierge." Auto-assign a concierge
   agent (round-robin over is_concierge_agent, or a configured default) when a
   concierge case is paid, and surface the assignee's name on the dashboard.
7. Calendly embed passes the raw case UUID to a third party as utm_content in the
   URL. Pass an opaque per-case token instead and resolve it in the webhook.
8. Calendly webhook takes case_id straight from the payload with no shape or
   existence check; a malformed id throws an unhandled DB error → 500 → Calendly
   retries indefinitely. Validate it's a UUID, confirm the case exists, and return
   200 with a skipped reason otherwise. Check the upsert's error and log it.
9. Check whether the DSC-01 modal re-asking arrest / order-of-protection / DIR /
   commitment questions that intake already collected is intentional. If it is,
   prefill from intake and frame it as confirmation, not a second interrogation.
```

---

## VERIFY (adversarial — run before calling this done)

```
1. PASSPORT FAN-OUT: passport → approve → IDN-01/02/03 all satisfied and all bound
   to the same document; license → approve → IDN-01/02 only, IDN-03 untouched;
   reject → every bound row back to pending. The vault counter reflects it.
2. NO GATE BYPASS: nothing added here satisfies a requirement without a staff
   review decision; setCaseStage still refuses application_assembled and every
   later stage with the full blocker list; the named QA sign-off is still required.
3. PAYMENT LIMBO: choose concierge → abandon checkout → /portal shows a recoverable
   "finish your payment" state and links to choose-path; the reminder fires; the
   applicant can still switch paths before paying.
4. OFF-PLATFORM UNLOCK: admin creates a concierge client by email → records an
   offline payment → client signs up with that email → lands on the agreements
   gate, NOT on choose-path. Also: staff-issued Stripe invoice with packageKey →
   invoice.paid → unlocks.
5. NO CHECKLIST LEAK: from the concierge dashboard, no CTA reaches
   /portal/checklist; nav has no self-guided to-do list; a direct URL visit shows
   the concierge banner.
6. SIGNATURE EXCLUSIONS STILL HOLD: REF-01/REF-02 unsignable by the applicant;
   COH-01 with a household member still throws at generation; the NYPD application
   is never signed on-platform.
7. PRIVACY: RLS negative tests pass — a non-agent trainer's view is byte-for-byte
   unchanged; concierge-agent access (if shipped) is scoped to assigned concierge
   cases only.
8. VERSION BUMP: bump one agreement version → gate, queue, and reminders agree.
9. INVITE: provisioned account receives a working set-password link (or a
   copyable one when email is off); no account can exist with no route in.
10. pnpm build && pnpm test && the verify-* harnesses green after a fresh
    reset + seed. Mobile at 390px on every screen touched.
```

---

## Do NOT change (verified working — I tried to break each of these)

- The CP-5 gate and its blocker reporting — it refused a jump to `application_assembled` with 14 requirements open and named every category (requirements, training, 0/4 references, missing sign-off).
- The signature-exclusion enforcement (`isSignable` + the COH-01 generator throw).
- On-behalf activity attribution.
- The email-keyed claim on signup — case-insensitive, no duplicates, no orphans.
- Control-tower honesty — milestones derive from real state and never advanced cosmetically.
- Capture-once / adopt-per-document signing, with per-document affirmation, document fingerprint, and a 5-minute private-storage signed URL for reading the draft first.
- The agreements gate genuinely blocking the dashboard.
- Client → /admin route protection.
- The absence of guarantee / expedite / we-file language across the product.
