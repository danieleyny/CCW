# Gun License NYC — batch changes
### Claude Code prompt (copy edits, theme, auth, one compliance guard)

Guardrails (unchanged): the applicant files their own application — **we never offer to submit/file for them**; no guarantee/expedite; keep `brand.disclaimer`; candor position preserved (in the disclosure flow / how-it-works even where homepage copy is broadened). `pnpm build` + `pnpm test` pass at the end. Mobile-first.

---

## ⚠ COMPLIANCE GUARD — read first
```
The requested Phase-04 wording "you choose... or have us submit it for you" MUST NOT ship. NYPD's published
position prohibits consulting firms from filing/representing applicants (AGENTS.md: this can kill the company).
Implement the COMPLIANT Phase-04 copy in this prompt (we prepare; the applicant submits). Do not add any
"we submit/file for you" language anywhere. Flag this back to the owner rather than implementing the literal request.
```

---

# PART 0 — FIX THE ERRORS FIRST (do these before any visual change)

## 0.1 — "Couldn't save progress" (intake save) + "Generation failed" (generate requirements)
```
Both errors surface as generic toasts that HIDE the real cause. First make them debuggable, then fix the root cause.

STEP 1 — surface the real error:
- app/portal/intake/actions.ts saveIntakeStep + completeIntake throw generic messages; the wizard shows "Couldn't save
  progress" / "Generation failed. Try again." Log the ACTUAL error server-side (console + activity log) and return a
  specific, user-useful message (e.g. "Check the date format in your residence history (YYYY-MM)") instead of the generic toast.

STEP 2 — MOST LIKELY ROOT CAUSE (check this first): the target database is BEHIND the code — recent migrations (the Phase-2
  field-coverage additions: residence/employment history, business fields, and any new document/requirement rows) may not be
  applied, so a save/generate that touches a new column/table/enum fails. This is the SAME class of failure as the earlier
  `signed_at` error.
  → List applied vs. pending migrations; apply the missing ones (supabase db push --include-all); reload PostgREST schema cache
    (notify pgrst, 'reload schema'); regenerate types (pnpm db:types). Re-test save + generate. Add/confirm a schema health
    check that fails loudly ("database is behind the deployed code") rather than a generic toast.

STEP 3 — VALIDATION RESILIENCE (the other likely cause): lib/intake/schema.ts requires dates match ^\d{4}-\d{2}$, and number
  fields (heightInches/weightLbs) reject empty strings. A partial/empty value from the wizard makes parseAnswers fail → "Couldn't
  save". Fix by: forcing the date format at the input (see 0.2 — use type="month" so only valid YYYY-MM is emitted), coercing
  empty numeric inputs to undefined (not ""), and having parseAnswers report WHICH field/row failed.

STEP 4 — GENERATION PATH: trace completeIntake → lib/intake/process.ts → requirements materialize with the new history/business
  fields present; fix anything that throws on the new fields (e.g. an unhandled shape, a missing column write, a new requirement
  row that isn't seeded). Confirm "Generate my requirements" succeeds end-to-end and the checklist builds.

DONE WHEN: a full intake (including residence + employment history) SAVES on every step and GENERATES requirements with no error;
any genuine validation problem shows a specific message naming the field, not a generic toast.
```

---

# PART 0B — Trainer profile form fixes

## 0B.1 — Website / social URL should accept "daniel.com" (no forced https://)
```
The Website field rejects "www.eye-uni.com" with "Please enter a URL" because it uses native type="url" (or a strict URL zod
check) that demands a scheme. Users won't type https://.
- Change the website + any social-URL inputs from type="url" to type="text", and NORMALIZE on blur/submit: if the value has no
  scheme, prepend "https://" (e.g. "daniel.com" → "https://daniel.com", "www.eye-uni.com" → "https://www.eye-uni.com").
- Validate leniently AFTER normalization (accept a bare domain; reject only clearly invalid input). Store the normalized URL.
- Instagram etc. accept a plain handle ("jerrysando") — keep that; don't force a URL there.
```

## 0B.2 — "Complete your profile" prompt on the trainer home until the profile is done
```
On the trainer dashboard (app/instructor/page.tsx), show a persistent, prominent "Complete your profile to start getting
matched" card/banner whenever the profile is incomplete (missing any go-live-required field: ≥1 location, price, bio, class
format, languages, range arrangement — reuse the completeness check from the instructor-profile work). It links to the profile
and shows what's still missing; it disappears once the profile is complete. Until complete, the trainer isn't shown to applicants.
```

## 0B.3 — Force the date format in residence & employment history (and add the "To" format)
```
In the intake wizard's "Places of residence" and "Places of employment — past 5 years" sections:
- The "From (YYYY-MM)" placeholder is truncated and unenforced; the "To / present" has no format at all.
- Replace the From and To text inputs with a visible LABEL ("From" / "To") + input type="month" so the browser enforces YYYY-MM
  (which matches the schema regex) and shows a picker — no more truncated placeholder, no free-text format errors.
- Handle "present": a "Present / current" checkbox that disables/clears the To field (empty To = present). Apply to BOTH the
  residence and employment sections, From and To.
```

## 0B.4 — Split "Business name & address" into two separate fields
```
In "Places of employment", the single "Business name & address" input conflates two fields. Split into TWO inputs: "Business
name" and "Business address". This needs a schema change: employmentHistorySchema currently has `employer` (combined) — replace
with `employerName` + `employerAddress` (keep `occupation`). Update lib/intake/answers.ts types, the wizard inputs, and every
downstream reader (application worksheet / process / materialize) that used `employer`. Migrate/normalize any existing combined
values if present.
```

---

# PART 1 — Visual & content changes (do AFTER Part 0)

## 1 — Remove email verification at signup (go straight to sign-in)
```
Goal: creating an account should NOT require a Supabase confirmation email. After creating username + password, the
user lands on the sign-in page and can sign in immediately.
- In Supabase Auth settings, turn OFF "Confirm email" for the project (document this; it's a project-config change,
  not just code). With it off, signUp no longer gates on an email link.
- Update app/auth/actions.ts signUp: on success, redirect to /auth/login (optionally pre-fill the email) — or
  auto-sign-in and go to /dashboard. Remove the reliance on emailRedirectTo/the confirmation round-trip for the
  happy path. Keep the /auth/callback route intact for any future re-enable.
- Handle the edge case cleanly (duplicate email, weak password) with clear messages.
NOTE for owner: without email verification, typo'd emails can't be recovered by email and there's a small abuse-surface
increase — acceptable "for now" per request; easy to re-enable later.
```

## 2 — Make the ENTIRE site dark (fix pages flipping to light)
```
Today the home page is dark but other marketing pages (/pricing, /faq, /how-it-works, /blog, /eligibility, /contact)
render in the warm-paper LIGHT theme, so navigating flips the theme. Make the whole site dark and consistent.
- app/(marketing)/layout.tsx: render the marketing surface inside the `.dark` wrapper with <DarkBackdrop/>; remove
  <LightBackdrop/> from the marketing flow (retire it if nothing else uses it).
- Ensure every marketing page + shared component reads the dark palette (no leftover light-only classes/backgrounds).
- After flipping, VISUALLY CHECK each marketing page for contrast/legibility at 390px + desktop and fix any washed-out
  text or invisible borders. Portal/admin/instructor were already dark — leave them.
```

## 3 — Hero subheading (exact copy)
```
Set the hero sub to exactly:
"Getting a gun license in New York City is slow, and strict. We make it simple — one team tracking every document,
deadline, and requirement from your first question to the day you're licensed."
```

## 4 — "THE INSTRUMENT": remove the stats
```
In components/marketing/product-feature.tsx, remove the three-stat block (24 documents tracked / 13 guided stages /
0 filed incomplete) — delete the NUMERALS <dl>. Keep the section heading + copy + the media panel; rebalance spacing.
```

## 5 — "EVERYTHING YOU'LL NEED" / the 24-documents section: reframe from fear to service
```
In the count section (components/marketing/showcase/the-count.tsx):
- Keep the headline about 24 documents but make the body about US holding/organizing them, not the applicant's risk.
- REMOVE any "miss one and the application bounces" style line.
- New body copy (adjust lightly to fit): "Twenty-four documents stand between you and your license — and we hold,
  track, and organize every one for you, so you never have to keep it all in your head."
```

## 6 — Requirement ordering + training-cert upload
```
a) ORDER: wherever the homepage lists sample requirements/documents (the count-section chips and the reality list),
   put the 18-hour safety course FIRST, then the four notarized references.
b) UPLOAD: the applicant must be able to UPLOAD their 18-hour safety-course certificate. Ensure the training
   requirement (TRN-01) exposes an uploader with document type training_cert (same pattern as other "obtain+upload"
   items — if it's missing a documentType, that's why no upload button shows; add it).
```

## 7 — Process stepper copy (components/marketing/process-stepper.tsx)
```
PHASE 01 — Qualify & enroll:
"A two-minute eligibility check tells you exactly where you stand — no guesswork, no payment to start. Pick your
package and we open your application."

PHASE 03 — Assemble:
"References, statements, disclosures, and photos — we gather all the documents necessary and make sure the job gets
done properly and simply."

PHASE 04 — Review & file  (COMPLIANT version — do NOT offer to submit for them):
"We check that every requirement is complete and correct. You review the finished packet, then submit your own
application — with everything prepared so it's quick and right, and we're with you the whole way."

PHASE 05 — Interview (make it GENERAL about the final phase, not specifically about sitting in the interview):
"The final stretch — fingerprinting, your interview, and the NYPD's review. We make sure everything you filed lines
up and that you know exactly what to expect, so nothing sends you back to the start of the line."
```

## 8 — Reality list rows (app/(marketing)/page.tsx REALITY)
```
Change the clarifier text:
- "4 references" row: "Notarized. We send them the link."  →  "We send your references a link to get their
  reference completed."
- "1 affidavit" row: "Per adult in your home. We chase them, not you."  →  "Completed for each individual over 18
  living in your household."
- "1 interview" row: "Yours. You submit your own application — that's the law."  →  "We make sure you have a full
  package ready for your interview and know what to expect beforehand."
(The applicant-files-their-own-application fact still lives in the trust chip "You file it — we make sure it's right"
and brand.disclaimer — keep those.)
```

## 9 — Broaden the CANDOR section (less niche to people with arrests)
```
The [CANDOR, NOT CONCEALMENT] "Sealed and dismissed arrests are still disclosed" section on the HOMEPAGE speaks only
to applicants with arrests. Replace it with a broader trust/service message that speaks to everyone, keeping the
redaction-reveal treatment if it still fits (or a calm static version).
Suggested (adjust to taste):
  eyebrow: "NOTHING SLIPS THROUGH"
  headline: "Every detail, handled — so nothing surprises you later."
  body: "From the first form to the final review, we track every requirement, deadline, and document, and tell you
  exactly what's needed and when. No missed steps, no scramble — just a complete, correct application you can stand
  behind."
KEEP the actual candor/disclosure guidance (disclose sealed/dismissed) in the disclosure flow + /how-it-works — we're
broadening the homepage message, not dropping the honesty requirement from the product.
```

## 10 — Placemaking band: make the city more vibrant/clear
```
components/marketing/placemaking-band.tsx ("Built for New Yorkers. In all five boroughs."): let the NYC background
read more vividly — reduce the obsidian scrim opacity and/or increase saturation/brightness so the city looks vibrant
and clear, WITHOUT hurting the headline's legibility. Keep a localized gradient/scrim directly behind the text only,
so the words stay high-contrast while the rest of the image shows through more.
```

## 11 — Training price range $500–$650
```
config/brand.ts externalCostEstimates.training: change lowCents 35000 → 50000 and highCents 42500 → 65000 (so it
renders "$500 – $650"). The cost card + fee sheet read from here, so no hardcoded amounts to touch elsewhere — verify
they update.
```

## 12 — Verify
```
- ERRORS (Part 0): a full intake including residence + employment history saves on every step and generates requirements with
  NO error; genuine validation issues name the specific field; migrations are applied + schema cache reloaded; the schema health
  check fails loudly if the DB is behind.
- TRAINER FORM: website accepts "daniel.com"/"www.x.com" (auto-normalized to https://); Instagram accepts a plain handle; the
  "complete your profile" prompt shows until the profile is complete; From/To use type="month" with a Present option in both
  residence and employment; Business name and Business address are separate fields end-to-end (schema → UI → worksheet).
- pnpm build && pnpm test pass.
- No "we submit/file for you" language anywhere; applicant-files fact still present; brand.disclaimer intact.
- Signup → sign-in works with no confirmation email; edge cases messaged.
- Every marketing page renders dark and legible at 390px + desktop (no light-theme flashes on navigation).
- Hero sub, phase copy, reality rows, candor section, and count-section copy match this prompt.
- Training range shows $500–$650; 18-hour cert has a working uploader; 18-hour course lists before references.
- Placemaking city reads more vibrant with the headline still high-contrast.
Deliver before/after screenshots of the home page + one interior page (dark) at 390px and desktop.
```

---

### Notes for you (not for Claude Code)
- **The one I changed on purpose:** "have us submit it for you." I built the compliant version. If your attorney has a specific, lawful arrangement in mind (e.g., you're routing through a licensed attorney for filing), tell me and we can word it accurately — but a document-prep service offering to file is the exact thing NYPD's position forbids.
- **Email verification:** turning it off is a Supabase project setting plus the code change. Fine "for now," but it means a mistyped email can't be recovered by email and slightly widens abuse surface — trivial to re-enable later.
- **Dark everywhere:** the interior marketing pages were built for the warm-paper theme, so after flipping them dark, a couple may need small contrast fixes — the verify step catches those.
