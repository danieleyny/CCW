# Gun License NYC — Intake & Checklist "fast path" upgrade
### One Claude Code prompt. Four parts — do them in order; each ends green.

Goal: make the applicant's first hour as fast and frictionless as possible. Four changes:

1. **Force the intake immediately** after eligibility + account creation, prefill what we already know, and hand the applicant a single, obvious next step when they finish.
2. **Height** — let people enter feet + inches (or plain inches), not inches-only.
3. **Date of birth** — stop making people scroll a native date picker through decades.
4. **Smart documents** — upload one file (e.g. a passport), tag what it is, and let it satisfy *every* requirement it legitimately covers, auto-attached — no re-uploading the same document three times.

**Global guardrails (AGENTS.md — hold the line):**
- **Compliance unchanged.** We never file, never expedite, never guarantee. The attorney-review gate (`eligibilityGate` in `lib/intake/answers.ts`) still fires on prohibitor answers — forcing intake must NOT skip it. Candor-maximizing disclosures stay.
- **QA gate + privacy firewall untouched.** The CP-5 pre-filing gate and staff sign-off remain the only path to `application_assembled`/`filed`. Smart-document auto-attach changes what's *attached/provided*, not the staff review decision that flips a requirement to `satisfied` — unless a requirement is already applicant-satisfiable by upload today (keep whatever the current behavior is; don't loosen review).
- **Canonical storage unchanged.** Height still persists as `heightInches` (integer). DOB still persists as `YYYY-MM-DD` (the `isoDay` zod type). These are UI-input changes; the stored shape and `wizardAnswersSchema` bounds stay the same.
- `pnpm build` + `pnpm test` + the `verify-*` harnesses pass after **each** part. Mobile-first at 390px on every screen you touch.

---

# PART 1 — Force intake right after eligibility + account, then hand off clearly

**Today's flow (verified):**
- `components/marketing/eligibility-quiz.tsx` collects age(21+), location→`track` (resident/business/non_resident), training status, convictions, history, storage. It stores answers in `localStorage["carry_eligibility_quiz"]` and, on a pass, renders `LeadForm` with `accountCta` and hidden `{ track, eligibility }`.
- `app/auth/actions.ts` → `signUp()` creates the account, auto-provisions the case via `ensureClientCaseForProfile` (`lib/onboarding.ts`), then `redirect("/dashboard")`.
- `app/portal/page.tsx` shows an "Application intake" link but nothing *requires* intake; the applicant can wander.

### 1A — Send them straight into intake, and keep them there until it's done
```
1. After a successful self-serve signup, land the applicant on the intake, not the generic dashboard.
   In app/auth/actions.ts signUp(): when data.session exists, redirect("/portal/intake") instead of "/dashboard".
   (Keep the confirm-email-OFF assumption; if a session isn't returned, keep the existing /auth/login path.)
2. Add a soft gate so a brand-new applicant can't skip intake and land on a half-empty portal. In the portal
   shell (app/portal/layout.tsx, or a small server guard used by app/portal/page.tsx), if the applicant's case
   has NO completed intake (intake_sessions.completed_at is null) AND they're on an early stage, redirect any
   /portal/* route (except /portal/intake itself and /auth/*) to /portal/intake.
   - Make it a GENTLE gate, not a trap: show a one-line banner on the intake ("Finish this once and your whole
     checklist builds itself") and allow /portal/intake to render normally. Do NOT gate once completed_at is set.
   - Respect the attorney-review path: if the case is flagged for attorney review, don't trap them in intake —
     let them reach the portal (they may be waiting on us).
```

### 1B — Prefill intake step 1 from the eligibility quiz (don't ask twice)
```
The eligibility quiz already asked age band, location/track, and training status — re-asking in intake step 1
is friction. Carry those answers forward:
1. In the eligibility→account path (LeadForm accountCta / the signup that follows), persist the quiz answers so
   the intake can read them. Two acceptable routes — pick the cleaner one for this codebase:
     (a) write the eligibility answers onto the lead/case at provision time (ensureClientCaseForProfile already
         runs at signup) so intake can hydrate from the case; OR
     (b) read localStorage["carry_eligibility_quiz"] on first intake load and pre-patch the wizard.
2. Map quiz → WizardAnswers (lib/intake/answers.ts / lib/intake/schema.ts):
     location "resident"/"business" → residence "nyc"; "non_resident" → residence "non_resident".
     training "done" → trainingStatus "completed"; "planning"/"not_yet" → "planned".
   Do NOT prefill DOB (the quiz only asked a 21+ yes/no, not a birthdate) — leave DOB empty for real entry.
3. Prefills are DEFAULTS the applicant can change, never locked. If quiz answers are absent, intake behaves as today.
```

### 1C — A single, obvious next step when intake completes
```
When intake completes (the wizard's "Requirements generated" state in components/portal/intake/intake-wizard.tsx,
and the portal home), replace the current soft links with ONE clear, progressive hand-off:
- Compute the branch from what they just told us (reuse lib/portal/next-step.ts / computeNextStep and the intake
  trainingStatus):
    • If training is NOT completed (trainingStatus !== "completed"): lead CTA = "Get matched with an instructor"
      → /portal/marketplace, with a secondary "Or start your checklist" → /portal/checklist.
    • If training IS completed: lead CTA = "Start your checklist" → /portal/checklist, secondary "Find an
      instructor" demoted.
- Make it a real, full-width "Here's your next step" card (mirror the home "Your next step" card), not a row of
  equal ghost links. The applicant should never wonder what to click after intake.
- Keep the existing disclosure-narrative panel (written explanations) — that still has to be finishable here.
```

**PART 1 verify**
```
- New signup (confirm-email OFF) lands on /portal/intake, not /dashboard.
- With no completed intake, visiting /portal, /portal/checklist, /portal/documents redirects to /portal/intake;
  after completing intake, all portal routes load normally and the gate never fires again.
- Prohibitor answers still route to attorney review (not trapped in the intake gate).
- Intake step 1 arrives pre-filled from a quiz pass (residence + training), and every prefilled value is editable.
- Finishing intake shows ONE prominent next-step card that points to the instructor when training isn't done,
  else to the checklist.
```

---

# PART 2 — Height in feet + inches (with an inches toggle)

**Today:** `components/portal/intake/intake-wizard.tsx` → `StepIdentity` renders a single `Height (in)` number input
writing `heightInches`. Schema bound stays 24–96 (`lib/intake/schema.ts`).

```
Replace the single inches box with a small HeightField component (new: components/portal/intake/height-field.tsx):
- Default mode "ft/in": a Feet select (3–8) + an Inches select (0–11). Compute heightInches = feet*12 + inches
  and patch it. Show the computed total quietly ("= 72 in").
- A tiny unit toggle lets the applicant switch to "inches" (the current single box) — and optionally "cm"
  (convert cm→inches on write; round to nearest inch). Persist the applicant's chosen unit in component state
  (and localStorage is fine) so it sticks within the session.
- CANONICAL VALUE UNCHANGED: the wizard still stores heightInches (integer, 24–96). Units are input affordances
  only — nothing new lands in the jsonb, and wizardAnswersSchema is unchanged.
- Hydrate correctly when editing: given an existing heightInches, show it as feet+inches by default.
- Mobile-first; large tap targets; no layout shift when toggling units.
Wire it into StepIdentity in place of the current Height (in) Field.
```

**PART 2 verify:** entering 6 ft 0 in stores `heightInches: 72`; toggling to inches shows 72; cm mode converts;
editing an existing case shows the right ft/in; `wizardAnswersSchema` and the worksheet/PDF that read `heightInches`
are unaffected.

---

# PART 3 — Fast date-of-birth entry (no decade scrolling)

**Today:** `StepEligibility` uses `<Input type="date">` for `dob`. Native pickers make you scroll years back to
the 1900s — brutal for anyone not born last week.

```
Add a DateOfBirthField component (new: components/portal/intake/dob-field.tsx) and use it for the DOB field:
- Three inputs: Month (a <select> Jan–Dec), Day (numeric, inputMode="numeric", 1–31), Year (numeric,
  inputMode="numeric", 4 digits) — the YEAR IS TYPED, not scrolled. This is the whole point.
- Compose to YYYY-MM-DD and patch `dob` (unchanged isoDay shape). Validate a real calendar date (reject 02/30,
  bad years); surface the existing under-21 inline error exactly as today (ageFromDob < 21).
- Auto-advance focus month→day→year as each fills; allow paste of a full date. Keep the red-invalid marker
  (data-intake-invalid) so the wizard's scroll-to-first-error still works.
- Accessibility: labeled fields, sensible aria, keyboard-first.
- Keep the plain `type="date"` inputs for genuinely NEAR dates (trainingDate, arrest occurredOn, order/booking
  dates) — those don't have the decade problem. This component is specifically for DOB (birthdates far in the past).
```

**PART 3 verify:** a 1975 birthdate is enterable in seconds by typing "1975"; invalid dates are rejected; the
under-21 gate and scroll-to-error still work; stored `dob` is still `YYYY-MM-DD`.

---

# PART 4 — Smart documents: one upload, every requirement it covers

**The problem:** we ask for proof of photo ID (IDN-01), proof of date of birth (IDN-02), and proof of
citizenship/status (IDN-03) as three separate checklist items — but a **single passport legitimately satisfies all
three**. Today the applicant uploads the same passport three times. Verified in the code:
- `IDN-01`, `IDN-02`, `IDN-03` all declare `documentType: "id"` (see `lib/requirements/actions.ts`
  REQUIREMENT_ACTIONS, and `supabase/migrations/20260628000900_seed_requirements.sql`).
- `recordDocument` (`app/portal/actions.ts`) already has a "bind by document_type" branch, but the checklist
  passes a specific `reqCode`, so today an upload attaches to exactly ONE requirement.

### 4A — A document-kind → requirements map (the brain)
```
Create lib/requirements/smart-documents.ts: an explicit, auditable map of "what the applicant uploaded" →
the set of requirement codes it satisfies, plus the stored DocumentType. Base it on what each document actually
proves — do NOT over-claim. Starting map (confirm each against the current registry before shipping):

  Passport (US)            → IDN-01 (photo ID), IDN-02 (date of birth), IDN-03 (citizenship)   [type: id]
  Driver's license / State ID → IDN-01 (photo ID), IDN-02 (date of birth)                      [type: id]
  US birth certificate     → IDN-02 (date of birth), IDN-03 (citizenship)                       [type: id]
  Naturalization certificate → IDN-03 (citizenship) (+ IDN-02 if it states DOB)                 [type: id]
  Permanent Resident Card  → IDN-01 (photo ID), IDN-02 (date of birth), IDN-03 (lawful status)  [type: id]
  Utility bill / lease / bank statement → RES-01 (proof of residence)                           [type: proof_residence]

Rules:
- Only include a (kind → reqCode) edge that is TRUE for that document. A driver's license is not proof of
  citizenship; a birth certificate is not a photo ID. When unsure, DON'T map it — under-claiming is safe,
  over-claiming attaches wrong evidence.
- Only map to requirement codes that (a) exist on THIS case and (b) share the compatible DocumentType.
- Keep this map the single source of truth; expose a helper reqCodesForDocumentKind(kind, caseReqCodes).
```

### 4B — "What did you upload?" and multi-attach
```
1. UI (components/portal/document-uploader.tsx + components/portal/requirement-action.tsx): when the applicant
   uploads for an identity/residence item, offer a short "What is this document?" picker of the kinds above
   (default it to the requirement they clicked from — e.g. from IDN-03 default "Passport"/"Birth certificate").
   Show, before they confirm, exactly what it will complete: "A passport also covers your photo ID and date of
   birth — we'll check those off too."
2. Server (app/portal/actions.ts recordDocument): accept an optional `documentKind`. When present, resolve
   reqCodesForDocumentKind(kind, <this case's pending req codes>) and bind the SAME uploaded document row
   (document_id) to EVERY matching case_requirement — not just the one the UI started from. Insert ONE documents
   row; set its req_code to the primary requirement; attach its document_id across the correlated rows.
3. Respect the existing review model: attaching sets document_id and moves each correlated requirement to the
   SAME state a single upload produces today (provided / awaiting staff review). Do NOT invent a new auto-approve
   path or bypass QA. The win is: upload once, and all correlated items show "Provided ✓ — from your passport
   (in review)" instead of demanding the file two more times.
4. Idempotent + safe: never attach to an already-satisfied requirement; if the applicant later replaces the
   document, re-bind consistently; keep the activity log entry describing the multi-attach.
```

### 4C — Reflect it in the checklist
```
On the checklist (components/portal/requirements-checklist.tsx) and each requirement card
(components/portal/requirement-action.tsx): when a requirement was satisfied/provided via a shared document,
show a small "Provided from your passport" chip and link to the same file, instead of a fresh empty uploader.
Grouping stays as-is; this just prevents the "upload the same thing three times" confusion.
```

**PART 4 verify (adversarial)**
```
- Uploading ONE passport tagged "Passport" attaches to IDN-01, IDN-02 and IDN-03 on a case that has all three;
  the applicant is not asked to upload it again for the other two.
- A driver's license tagged as such attaches to IDN-01 + IDN-02 but NOT IDN-03 (citizenship) — no over-claim.
- A utility bill attaches to RES-01 only.
- Staff review still governs the flip to `satisfied`; the QA gate and privacy scoping are unchanged; instructors
  still can't see identity documents (RLS negative test).
- Replacing the shared document re-binds cleanly; no orphaned document_id; activity log records the multi-attach.
- pnpm build && pnpm test && verify-* pass; mobile-first at 390px.
```

---

## Notes for you (not for Claude Code)
- **Order matters.** Part 1 (forced intake + prefill + hand-off) is the biggest felt improvement; Part 4 (smart
  documents) is the biggest time-saver later. Parts 2–3 are quick wins.
- **One deliberate model choice (Part 4):** uploading a passport *attaches* it to all three ID requirements and
  shows them as provided, but a staff member still approves them — same as any upload today. If you'd rather a
  clean identity document auto-satisfy on upload (no staff step), say so and we'll widen 4B — but that changes the
  review posture, so it's opt-in, not the default.
- **DOB/height are input-only changes** — the stored `dob` (YYYY-MM-DD) and `heightInches` (int) are unchanged, so
  the worksheet, PDFs and QA gate keep working without a data migration.
- **Prefill is a convenience, never a lock** — every carried-over answer stays editable, and intake works fine if
  someone reaches it without taking the quiz.
```
