# Handoff — portal fixes & document engine (ALL PHASES 1–11 COMPLETE)

**`PORTAL_FIXES_PROMPT.md` is fully implemented.** This doc records what shipped,
what was verified and how, and the honest list of what's still open.

Verified against the code at the head of `main`. All migrations through
`20260718000900` are applied **locally**; see "Before you deploy" for prod.

---

## 1. What shipped

| Phase | Commit | What |
|---|---|---|
| 1–2 | `4b32cec` | Real document types (no `?? "id"`), DMV-01/PRM-01 uploaders |
| 3 | `565d35b` | Signing: draft → sign → satisfied, signing dates, audit trail |
| 4 | `771a87f`, `68edfae` | System-verified controls + server-side upload enforcement |
| 5 | `d976455` | Plain-language titles + our own example illustrations |
| 6 | `5fa4e7d` | Questionnaire opens centered; 44px touch targets |
| 7 | `3a7b5ef` | Checklist filters (All / To do / Completed / Needs notarization) |
| 8 | `86548ec` | Documents rebuilt as the real library, keyed on `req_code` |
| 9–10 | `3f07206` | Automatic stage advancement + portal "Your next step" card |

### The load-bearing ideas (read these before changing anything)

- **`documents.signed_at` is the signing state.** NULL on a generated document
  means DRAFT: downloadable, banner-stamped "DRAFT — UNSIGNED · not for filing",
  and it does **not** satisfy a signable requirement. `lib/pdf/builder.ts` prints
  the **signing** date, never `new Date()` at render time — that was the bug.
- **Generation never applies the signature on file.** Signing is an act on
  specific bytes, not a stamp we reuse. That's also why regenerating after an
  answer edit invalidates the signature by construction: a regenerate produces
  fresh unsigned bytes and pushes the requirement back to `pending`.
- **`isSignable()` defaults to true** for generate-mode actions; opt out
  explicitly. COH-01/REF-01/REF-02 opt out (signed by the reference/cohabitant
  through the token flow, not the applicant).
- **`systemVerified` on the action map** marks a control WE verify (FMT-01,
  ELG-01/02/03, OOS-02). Hidden from the customer checklist, satisfied by the
  code that verifies it, with a note recording HOW. Intake predicates only
  satisfy what the applicant's own answers support — a reported disqualifier, an
  unanswered prohibitor, an under-21 DOB or a non-resident answer all stay
  pending. **Never loosen this**; it's the difference between a system control
  and laundering a case clean.
- **`lib/portal/requirement-view.ts` is the single loader** behind the checklist,
  the documents library, and the portal home's next-step card. They cannot
  disagree by construction. Don't add a fourth list.
- **`lib/cases/advance.ts` refuses anything at or past `application_assembled`**
  — it throws rather than quietly gating. The CP-5 gate + named staff sign-off in
  `setCaseStage` own everything from there. Asking automation to reach `filed` is
  a bug, not a config choice.
- **Uploads carry their `req_code`.** IDN-01/02/03 all declare document type
  `id`; binding by type alone attached proof of citizenship to the photo-ID row
  and called it evidence.

---

## 2. Phase 11 — adversarial verification results

**Test suite: 80 passing, 12 files. `tsc`, `lint` (now zero warnings) and
`pnpm build` all clean.**

Checked as a hostile reviewer, against the live local DB:

| # | Claim | Result |
|---|---|---|
| 1 | No generated document stored as type `id` | ✅ 16 documents, 0 offenders. `?? "id"` is gone; `repair-generated-doc-types.ts` reports **0 local / 1 repaired in prod earlier** |
| 2 | Every `obtain` action renders an uploader | ✅ 0 without `documentType`; the discriminated union makes it a compile error |
| 3 | No signable requirement satisfied by an unsigned draft | ✅ 0 offenders in DB; stamped date == signing timestamp (verified: `Signed: July 18, 2026` in stored bytes, SHA-256 matching the `signature_events` row); regenerate returns the row to `pending` |
| 4 | FMT-01 off the customer list, enforced server-side | ✅ absent from the checklist; 4 tests drive `enforceUploadedFile` against **real storage** — oversized rejected + deleted, `.exe` rejected + deleted, missing object rejected, dirty name normalized (`Résumé & scan #1.PDF` → `Resume-scan-1.pdf`) |
| 5 | Stages advance automatically, never backwards, never past the gate | ✅ 6 tests: forward-only, idempotent, refuses `application_assembled`/`filed`/`licensed`, leaves a case alone once staff take it past the ceiling |
| 6 | Privacy firewall intact | ✅ `tests/rls/matrix.test.ts` 10/10; `verify-esign.ts` PASSES incl. "instructors cannot read signatures" |
| 7 | UX at 390px and desktop | ✅ checklist "To do 11" == documents "Still needed (11)"; questionnaire centered (672px desktop, no h-scroll at 390px, all controls 44px); next-step card above the fold |
| 8 | Legal/candor | ✅ no banned words (`copy-guard` passes), no omission-friendly copy, attorney seam intact, every generated document still says "not an official NYPD form", nothing files on the applicant's behalf |

**Live end-to-end run** (fresh `db reset` + `seed`, real browser, real server
actions): generate → row stays PENDING with the draft banner → sign → SATISFIED
and the item leaves "To do"; upload with a dirty filename → stored as
`Resume-cert-1.png`, bound to **TRN-01** (not "first requirement of type id"),
FMT-01 satisfied with provenance.

### Honest caveats on the verification

- The **stage auto-advance on upload** was a no-op in that run because the seeded
  case already sat at `document_collection`. The helper itself is covered by 6
  tests including a live insert/advance/log round-trip; the milestone call sites
  are one-liners covered by typecheck, not driven live.
- The **payment and booking milestones** were not exercised live (Stripe is off
  in this environment).
- Example illustrations were verified by DOM assertion, not by eye at every
  breakpoint.

---

## 3. Pre-existing failures — NOT caused by this work

Four `scripts/verify-*.ts` harnesses fail. **Confirmed identical at `9a12a0c`**
(the pre-session commit) by running them in a git worktree, so these are stale
expectations, not regressions:

- `verify-v3p2.ts` — 3 failures (QA-gate sign-off + qa-ready reminder).
- `verify-p9.ts` / `verify-ref.ts` — 4 failures, all asserting REF-01 satisfies
  on **received**. Commit `7ffdf37` deliberately changed that to **notarized**.
  The harnesses need updating to the current, stricter rule.

Passing: `verify-esign`, `verify-v3p0`, `verify-v3p1`, `verify-v3p3`,
`verify-packet`.

---

## 4. Still open

- **Deploy**: migration `20260718000900_document_signing.sql` is local-only.
  `supabase migration list --linked` for drift, then `supabase db push`, then
  re-run `repair-generated-doc-types.ts` against prod.
- **Doc-engine leftovers** (unchanged from before): the `references` and
  `cohabitant-affidavit` questionnaires collect answers but aren't wired into the
  token-outreach flows, so COH-01/REF-01/REF-02 have **no generator** —
  `renderRequirementDocument` throws for them. The checklist offers
  "Complete & generate" on those rows and it will fail. **This is the biggest
  remaining hole.**
- The application worksheet has a generator but no questionnaire;
  `court-request-letters` has no schema of its own.
- `lib/pdf/acroform.ts` stays dormant — no official fillable template is bundled.
- The four stale harnesses above should be updated to the notarized-not-received
  rule rather than left failing.
- Old `/portal/forms` still exists alongside the new flow; it duplicates AFF-01 /
  SOC-01 signing and is now the weaker path. Worth retiring.

---

## 5. Verification playbook (unchanged, still true)

RPCs are `auth.uid()`-scoped — service-role can't exercise them; mint real JWTs
against `/auth/v1/token?grant_type=password`. Local logins are all `Passw0rd!`
(admin@ / staff@ / client1@ / client2@ / instructor@carrypath.test).

Browser: the preview can't keep a server-action session, so sign in by filling
the form via `javascript_tool` with a native value setter + `input` event.

**Gotchas that cost time:** Radix portals mount outside `.dark` (every
Dialog/Sheet needs `className="dark"`); the React Compiler rejects `useMemo` over
values it can't prove stable — prefer plain computation; `min-h-11` renders 44px
but the preview's mobile emulation *measures* ~42 (scaled viewport) — assert on
computed styles, not rects; pdf-lib Flate-compresses content streams and writes
text as hex, so `tests/helpers/pdf.ts` walks the object graph to read a PDF.

Gate before every ship: `pnpm exec tsc --noEmit && pnpm lint && pnpm test && pnpm build`.
