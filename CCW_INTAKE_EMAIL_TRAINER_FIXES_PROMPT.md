# Gun License NYC — trainer rename, intake cleanup & email preview fixes
### Claude Code prompt

You're working in the CARRY / Gun License NYC repo (Next.js 16 + Supabase, live at gunlicensenyc.com). Read `AGENTS.md` first and honor every legal guardrail in it (applicant files their own application; candor-maximizing; no *guarantee/expedite/fast-track/approval-rate* language; keep `brand.disclaimer` in email footers). This is **Next.js 16** — `proxy.ts` not `middleware.ts`, and `params`/`searchParams`/`cookies` are async; check `node_modules/next/dist/docs/` before touching framework APIs.

Work through the five tasks below. **Take your time and verify each against the existing code before editing** — the notes under each task tell you exactly which files and patterns are already in play so you don't break the Section-A worksheet, the requirements engine, or email deliverability. Nothing here should change *when* emails are sent or *what* requirements are generated — only what's asked, how it looks, and one live name.

Guardrail for the whole job: `pnpm build`, `pnpm lint`, and `pnpm test` must pass at the end, and every existing `scripts/verify-*.ts` harness that was green must stay green.

---

## Task 1 — Rename the trainer "Lior" → last name "Carlo" (LIVE DATA, not seed)

This is a **hosted-database edit**, not a code change. The seed only has Frank DiMeo / Lena Ortiz; "Lior" is a real instructor record created through onboarding, living in the hosted Supabase project (ref `nabohrqydjzborehqslc`). The `instructors` table stores the display name in a single `name text` column and links to a profile via `profile_id → profiles(id)`.

Do it safely and reversibly:

1. Write a one-off script `scripts/rename-trainer-lior.ts` that uses `createAdminClient()` (service role, from `lib/supabase/admin.ts`) — the same runner pattern as the other `scripts/*.ts`.
2. **First, read-only:** `select id, name, profile_id from instructors where name ilike 'Lior%'`. Print every match with its current `name`.
   - If there is **not exactly one** match, print them and STOP — do not guess. Report back so a human can disambiguate.
3. If exactly one match, print the old value, then update `instructors.name` to `"Lior Carlo"` (preserve the existing first name exactly; only set/replace the surname).
4. Keep the linked identity consistent: if that instructor's `profiles.full_name` (and/or the auth user's `user_metadata.full_name`) also carries the old surname, update it to match "Lior Carlo" so the instructor portal, the marketplace instructor card, and the request feed all render the same name. Grep for where the instructor's name is rendered (`components/portal/instructor-card.tsx`, `lib/instructors/*`, `instructor_offer_feed` view usages) to confirm they read `instructors.name` (so the one update covers them) and note anything that reads `full_name` instead.
5. Log old → new for each row touched. This edit is data-only — no deploy needed once run against the hosted DB.

Report the before/after so I can confirm the right record changed.

---

## Task 2 — Intake: stop asking document-descriptor questions, add dropdowns, mark required fields in red

Files: `components/portal/intake/intake-wizard.tsx` (the 6-step wizard), `lib/intake/schema.ts` (zod boundary + `completionIssues`), `lib/intake/answers.ts` (`WizardAnswers` + `INTAKE_STEPS`).

Context you need before editing:
- Almost every wizard field is **already optional** in `wizardAnswersSchema`, and `completionIssues()` only hard-gates DOB (step 1), complete arrest rows (step 4), and the track-aware reference rule (step 5). So today nothing wrongly *blocks* — the problem is (a) we ask low-value questions and (b) the UI gives no visual signal of what's actually required.
- The `Field` helper (around line 351) renders `<Label>{label}</Label>` with **no required marker**. Steps validate through `issuesForStep()` → `eligibilityStepIssues` / `disclosureStepIssues` / `historyStepIssues`.

Do this:

**2a. Prune the pure document-descriptor questions.** In `StepIdentity`, the free-text **"Photo ID type"** (`photoIdType`) and **"Proof of residence method"** (`residenceProof`) only describe a document the applicant uploads later in the requirements/document flow — they add friction with no application value. Before removing anything, **grep the whole repo for `photoIdType` and `residenceProof`** (expect `lib/requirements/worksheet.ts`, `lib/pdf/*`, `lib/requirements/questionnaires.ts`, any Section-A coverage map, `supabase/types` is fine to ignore).
- If neither field feeds a generated worksheet/PDF/requirement: remove both inputs from the intake UI. Keep the keys in `WizardAnswers` and the zod schema as optional (back-compat for in-progress sessions) but stop collecting them in the wizard.
- If a field *does* feed a downstream document: do **not** silently drop it — instead move its collection to the point where that document is actually handled (the requirements/questionnaire drawer for that doc), or keep it but convert it to a dropdown per 2b. Explain in your summary which path you took and why.
- Then re-read the rest of the intake and flag any other question whose only purpose is to describe a to-be-uploaded document; apply the same rule. Keep genuine application data (identity, legal address, physical description, business fields, disclosures, references, histories) — those land on the real NYPD form.

**2b. Dropdowns instead of free-text where the answer set is fixed.** For any collected field with a small closed option set, use a select (match the existing raw `<select className={SELECT_CLASS}>` pattern already in `StepIdentity`, or `components/ui/select.tsx`). At minimum convert **Sex** (`sex`) to a select; if you keep `photoIdType`/`residenceProof` anywhere, make them selects (ID type: Driver license / State ID / U.S. Passport / Passport card / Military ID / Other; residence proof: Utility bill / Lease / Bank statement / Government-issued mail / Other). Don't turn genuinely open fields (names, addresses, narratives) into dropdowns.

**2c. Required-field affordance + send the user back.** Extend the `Field` helper with an optional `required?: boolean` that renders a red asterisk after the label (e.g. `<span className="text-danger">*</span>` — reuse the existing `text-danger` token already used elsewhere in this file). Mark only the **truly** required fields (the ones `completionIssues`/step validators actually enforce: DOB; each arrest row's date/court/disposition/narrative; each reference's name + valid email). When a user tries to advance and `issuesForStep()` is non-empty, in addition to the existing error list, visually flag the offending field(s) red (border/`aria-invalid`) and scroll to / focus the first one so they're physically sent back to it. Don't invent new required fields — required-in-red must exactly match what the validators block on, or you'll frustrate users with red on optional fields.

Keep the eligibility hard-gate and attorney-review routing untouched.

---

## Task 3 — Don't re-ask the same thing: auto-fill / suggested inputs for repeated fields (esp. address)

The applicant's own legal address is captured in `StepIdentity` as `legalStreet` / `legalApt` / `legalCity` / `legalState` (`WizardAnswers`). It should flow, as a **suggestion the user can accept**, into every later field that asks for an address — and this pattern should extend across the system, but only between fields of the *same kind* (address → address; never cross-fill a name into an address).

Do this:

**3a.** Add a pure helper `formatLegalAddress(a: WizardAnswers): string` in `lib/intake/answers.ts` that composes "123 Main St Apt 2, Brooklyn, NY" from the legal-address fields (skip blanks; return "" if nothing known).

**3b. In the intake wizard**, offer the known address as a one-click suggestion (not a forced overwrite) on the address fields that currently start blank:
- `StepHousehold` → the safeguard **Address** (`safeguardAddress`).
- `StepHistory` → each residence-history row's `address` (at least prefill/suggest the most-recent row).
- Mechanism: a small "Use my home address" chip/button next to the field that fills it when clicked (only when the target is empty), **and/or** a native suggestion via `<input list=…>` + a shared `<datalist>` of known addresses. Prefer the datalist for the "suggested input pop-up" behavior the way the request describes it, plus the explicit chip for the primary safeguard case. Never auto-clobber a value the user already typed.

**3c. Across the rest of the system**, wire the same known-address suggestion into the questionnaire drawers that ask for an address but don't yet prefill it. `lib/requirements/questionnaires.ts` already has a `prefill(ctx: PrefillContext)` mechanism and `ctx.intake` is the full `WizardAnswers`:
- Add `prefill` for the **`affirmation`** questionnaire's `address` and the **`safe-storage`** questionnaire's `address` using `formatLegalAddress(ctx.intake)` (keep the existing `fullName`/other prefills).
- In the questionnaire renderer (`components/portal/questionnaire-dialog.tsx`), for address-type text fields, expose the same known-address `<datalist>` suggestion so the pop-up behavior is consistent with the wizard.
- Confirm the cohabitant affidavit already inherits the applicant's address (household members share it) — check `lib/cohabitants/document.ts`; if that document asks for an address independently, default it to the applicant's known address too.

Keep prefills **suggestive and correctable** — the customer must always be able to edit. This mirrors the existing "never retype your own name/address" promise in the questionnaires header comment.

---

## Task 4 — Emails to references & cohabitants: fix the inbox preview and name the applicant

Every transactional email already renders through the one shared template `renderEmail()` in `lib/email/template.ts`. The two invite emails are built in `lib/outreach.ts` — `inviteReference()` and `inviteCohabitant()`. The lock-screen/inbox preview currently reads cluttered because after the hidden preheader the visible header (the ◎ wordmark + "Action needed" eyebrow + heading) bleeds into the preview text.

**4a. Kill the preview bleed (template).** In `lib/email/template.ts`, the preheader is followed by `"&nbsp;&zwnj;".repeat(30)`. Increase that padding run substantially (e.g. ~100) so the preheader is followed by enough whitespace that the wordmark/eyebrow no longer leak into the client preview. Keep the preheader `<div>` hidden exactly as-is (display:none / max-height:0 / mso-hide). Don't otherwise restructure the template — it's deliberately table-based, all-inline, light-body for cross-client safety (see the file's header comment and `EMAIL_REDESIGN_PROMPT.md`). Keep the plain-text return and `brand.disclaimer`.

**4b. Name the applicant in the reference & cohabitant emails (outreach).** Both send sites already have the `case_id` on the fetched row. Resolve the applicant's name with the **same join the token pages already use** — `app/r/[token]/page.tsx` and `app/c/[token]/page.tsx` do:
```ts
const { data: kase } = await admin.from("cases").select("clients(full_name)").eq("id", caseId).single()
const applicant = (kase?.clients as unknown as { full_name: string } | null)?.full_name ?? "the applicant"
```
Use that in `inviteReference()` and `inviteCohabitant()`, then rewrite the `renderEmail` opts so the recipient instantly knows who added them:
- **preheader** → a single, clean, compelling line that leads with the applicant's name, e.g. `"${applicant} asked you to be a character reference — confirm in about a minute."` (cohabitant: `"${applicant} listed you as a household member — complete a short affidavit."`). Keep it to one sentence so the preview stays tidy.
- **heading** and the greeting/body **paragraphs** → mention `${applicant}` explicitly (e.g. "An applicant listed you…" → "**${applicant}** listed you as a character reference for their NYC concealed-carry license.").
- Keep `eyebrow`, `cta`, `footnote` (30-day expiry), `recipientReason`, subjects, and recipients unchanged. If the applicant name can't be resolved, fall back to the current wording ("An applicant…") — never send a broken "undefined".

Don't change reminder emails' timing or `lib/notify.ts` behavior; the ask is specifically these two invite emails' preview + applicant attribution.

---

## Task 5 — Verify

- `pnpm build`, `pnpm lint`, `pnpm test` all pass.
- Render the emails with `scripts/preview-emails.ts` (however package.json wires it) and open the reference + cohabitant previews: applicant name present in preheader/heading/body, CTA + fallback link + footer disclaimer intact, and the preheader no longer bleeds the wordmark into the preview. Confirm the plain-text version still carries the name and disclaimer.
- Intake: walk the wizard — the pruned questions are gone (or moved), the converted fields are dropdowns, required fields show a red asterisk, and trying to advance with a missing required field scrolls/focuses you to it in red. Confirm no field that the validators DON'T block on is marked required. Confirm `photoIdType`/`residenceProof` removal didn't break the Section-A worksheet/PDF (build any doc that referenced them, or confirm they were unreferenced).
- Address suggestions appear on the safeguard address, residence-history rows, and the affirmation / safe-storage drawers, and never overwrite a value the user already typed.
- Trainer: paste the script's before/after output; confirm exactly one "Lior" row changed to "Lior Carlo" and every surface that shows the trainer now reads it consistently.
- Re-run the relevant `scripts/verify-*.ts` harnesses (at least the reference/outreach and intake-adjacent ones) and confirm still green.

Then give me a short summary: which files changed, the decision you made on `photoIdType`/`residenceProof` (removed vs moved vs dropdown) and why, and the trainer before→after.
