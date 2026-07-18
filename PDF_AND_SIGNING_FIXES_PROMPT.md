# Gun License NYC — signing bug + PDF design pass
### Claude Code prompt (root causes already traced — go straight to them)

Three things: (1) a blocking runtime error that is a **database-deployment problem, not a code bug**; (2) the signature doesn't sit on the signature line and the execution date isn't printed; (3) the generated PDFs look generic and need a real design pass.

**Guardrails (AGENTS.md):** instructor privacy firewall intact (generated docs stay invisible to instructors); candor-maximizing; no legal advice; **we never file for the applicant**; nothing we generate may be presented as an official NYPD form; the CP-5 QA gate keeps blocking `application_assembled`/`filed`. `pnpm build` + `pnpm test` + the `verify-*` harnesses pass after each phase.

---

## PHASE 1 — FIX FIRST: the "signed_at column not found" error (unapplied migrations)

```
SYMPTOM: clicking Generate on the affirmation, the written-explanations addendum, or the social-media list throws:
    Could not find the 'signed_at' column of 'documents' in the schema cache

ROOT CAUSE (confirmed — this is NOT because a document was created before signing existed):
The code and the migration are correct and present. supabase/migrations/20260718000900_document_signing.sql adds
`documents.signed_at`, and lib/supabase/types.ts already types it. The error text is PostgREST's standard message for
"this column does not exist in the database I'm connected to" — i.e. the migration has NOT been applied to the database
being tested against (and/or PostgREST's schema cache is stale). There are several recent unapplied migrations in the
same batch: 20260718000200 → 20260718000900 (client_location, interest_choose, engagement_messaging, document_engine,
signing_audit_and_evidence, generated_document_types, business_doc_type, document_signing).

DO THIS:
1. Determine which migrations are actually applied on the target database vs. what's in supabase/migrations. Report the gap
   as a list before changing anything.
2. Apply the missing migrations to the hosted project (`supabase db push --include-all` per AGENTS.md). Never edit a shipped
   migration; if one fails, fix forward with a NEW dated migration.
3. Force PostgREST to reload its schema cache after the push (e.g. `notify pgrst, 'reload schema'`), then regenerate types
   with `pnpm db:types` and confirm `documents.signed_at` is present in lib/supabase/types.ts.
4. Re-test all three generators end to end (affirmation, disclosure addendum, social-media list) and confirm the error is gone.
5. GUARD AGAINST SILENT RECURRENCE: add a small startup/health check (or a `scripts/verify-schema.ts`) that asserts the columns
   the app depends on actually exist, and surface a clear operator-facing message ("database is behind the deployed code — run
   supabase db push") instead of leaking a raw PostgREST error to a customer.
6. DATA REPAIR (important): earlier behaviour marked a requirement SATISFIED on generation, before signing existed. Find any
   signable requirement currently satisfied by a generated document whose signed_at IS NULL, and revert it to pending (or flag
   for review) so an unsigned draft cannot ride through the CP-5 gate. Report how many rows were affected — do not delete anything.
```

---

## PHASE 2 — Signature block: align the signature to the line, print the execution date

```
PROBLEM (confirmed) — lib/pdf/builder.ts `signatureImage()`:
    page.drawImage(sigImg, { x: M, y: y - h, width: w, height: h })
    y -= h + 2
    page.drawLine({ start: { x: M, y }, end: { x: M + 240, y }, ... })
    drawText(`${label}     Signed: ${signed}`, ...)
The image is drawn as a block and the rule is then placed ~2pt below it, so the signature floats above the line (worse when the
captured PNG carries transparent padding). The line (240pt) and the image (≤200pt) don't relate. And the label renders as
"Applicant: Daniel Eyny     Signed: ____" — awkward, and blank whenever signedAt is missing.

REBUILD the signature block:
1. TRIM the captured signature PNG's transparent padding (crop to ink bounds) before embedding, so the visible strokes — not the
   empty canvas — determine placement. Do this once in a helper so every generator benefits.
2. Sit the signature ON the line: the ink baseline should rest on (or very slightly overlap) the rule, the way a real signature does.
   Scale to a sensible cap height, preserve aspect ratio, and don't let a wide signature overflow its column.
3. Lay out a proper TWO-COLUMN execution block:
       ______________________________        ______________________
       Daniel Eyny                           July 18, 2026
       Applicant signature                   Date signed
   Left column = signature image over its rule, applicant's printed name beneath. Right column = the execution date over its own
   rule, labelled "Date signed".
4. The date is the EXECUTION date — always `documents.signed_at`, auto-filled, never the render date, never editable, and never
   printed as a blank on a signed document. Keep the existing rule that regenerating clears signed_at (a signature must never sit
   on stale bytes). If unsigned, render empty ruled lines plus the existing DRAFT banner — never a fake date.
5. Keep `signatureLine()` (the print-and-sign-by-hand variant) visually consistent with the new block, and apply the same treatment
   to the notary block.
```

---

## PHASE 3 — Make the generated PDFs actually look designed

```
The documents are functional but generic: base Helvetica, a bare brass wordmark, no footer, no page numbers, loose hierarchy.
Give lib/pdf/builder.ts a real design pass — every generator inherits it, so change the builder, not the individual documents.

1. TYPEFACE (biggest single win): embed a real open-licensed font instead of pdf-lib's StandardFonts.Helvetica — register
   @pdf-lib/fontkit and bundle a proper family (regular/medium/bold) that matches the brand (an open font such as Inter or Source
   Sans; confirm the license, commit the TTFs under the repo, and log the license). Keep a graceful fallback to Helvetica if the
   font fails to load so a document never fails to render.
2. LETTERHEAD: a proper header on page 1 — the brand mark + "Gun License NYC" wordmark, a thin brass rule, and a right-aligned
   meta block (document title, case reference, date prepared). Subsequent pages get a slim running header instead of the full block.
3. TYPOGRAPHY & LAYOUT: a real type scale (title / section / body / caption) with consistent leading; generous margins; a
   comfortable measure (~75–85 characters); tighter, more deliberate spacing between blocks; better bullet indentation and hanging
   indents; section headers with subtle brass accents. It should read like a law office prepared it.
4. FOOTER ON EVERY PAGE: "Prepared by Gun License NYC — not an official NYPD form" + "Page X of Y". Page numbers must be stamped
   after pagination is known (second pass), so totals are correct.
5. Keep and restyle the DRAFT — UNSIGNED banner so it stays unmistakable but no longer looks bolted on.
6. Make sure long content (many arrests, many cohabitants, long explanations) paginates cleanly — no orphaned headings, no block
   split awkwardly across a page break, signature block never stranded alone on a final page.
7. Accessibility/metadata: set PDF title/author/subject metadata per document, so a downloaded file is identifiable.

Show me the before/after of the affirmation, the disclosure addendum, and one notarized document (cohabitant affidavit).
```

---

## PHASE 4 — Verify

```
1) SCHEMA: list which migrations were applied; confirm documents.signed_at exists in the DB and in regenerated types; all three
   generators run without the schema-cache error; the new schema health check fails loudly (and clearly) if the DB is behind.
2) DATA REPAIR: report how many requirements were reverted from satisfied → pending because their generated document was unsigned;
   confirm the CP-5 gate now blocks filing for those cases.
3) SIGNING: on a signed document the signature sits ON the line and the printed date equals documents.signed_at to the day;
   on an unsigned document there is no date, ruled lines are blank, and the DRAFT banner shows on every page; editing answers and
   regenerating clears the signature and returns the requirement to unsatisfied.
4) DESIGN: render the affirmation, addendum, social-media list, cohabitant affidavit, and application worksheet — check letterhead,
   footer with correct "Page X of Y", pagination with long content, and that the embedded font renders (and falls back safely).
5) LEGAL: every generated document still carries the "prepared by us, not an official NYPD form" line; no guarantee/expedite
   language; candor copy intact; instructors still cannot read any generated document (re-run the RLS harness).
6) pnpm build && pnpm test && verify-* pass.
Deliver: the applied-migration list, the repair counts, before/after PDF screenshots, and anything still rough.
```

---

### Notes for you (not for Claude Code)
- **Your hunch was close but not the cause.** It isn't that you generated a document before signing existed — it's that the database you're testing against is *behind the code*. Several migrations from the 20260718 batch (including the one that adds `signed_at`) haven't been pushed. Phase 1 pushes them and adds a health check so you get a clear "run db push" message instead of a raw error hitting a customer.
- **One thing worth knowing:** before signing existed, generating a document marked its requirement satisfied. So there may be cases sitting "complete" on unsigned drafts, which would let an unsigned document through the pre-filing gate. Phase 1 step 6 finds and reverts those — worth reading the count it reports.
- **The font is why it looks plain.** pdf-lib's built-in Helvetica is the default "generic PDF" look; embedding a real family is the single biggest visual upgrade, and everything else (letterhead, footer, spacing) compounds on top of it.
