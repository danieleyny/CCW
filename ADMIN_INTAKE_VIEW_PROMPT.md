# Gun License NYC — Admin "Intake responses" view
### Claude Code prompt

The admin case page shows an applicant's derived Requirements, Disclosures, Documents, Notes, and Tasks — but it never surfaces the **raw intake answers** the applicant typed into the wizard (stored in `intake_sessions.answers`). Add an admin-only "Intake responses" view that plays those answers back in a clean, readable form, with an honest empty-state so staff can tell "saved but hidden" from "never saved."

**Guardrails:** admin/staff only (the admin case page is already role-gated) — do NOT expose intake answers to instructors; the instructor privacy firewall stays intact (don't reuse this component on any instructor route, don't loosen any RLS). Read-only. No secrets/PII leak beyond the admin surface that already shows disclosures. `pnpm build` + `pnpm test` + `verify-*` pass.

Files: `app/admin/cases/[id]/page.tsx`, `lib/intake/schema.ts` + `lib/intake/answers.ts` (field shapes/labels), the existing wizard `components/portal/intake/intake-wizard.tsx` (for field labels/order to mirror), a new `components/admin/intake-review.tsx`.

---

## Build it
```
1. LOAD the intake data on the admin case page (app/admin/cases/[id]/page.tsx): query
   intake_sessions.select("answers, current_step, completed_at, updated_at").eq("case_id", id).maybeSingle()
   (add it to the existing Promise.all batch). This is admin-scoped — the page already requires staff/admin.

2. ADD an "Intake responses" tab to the existing <Tabs> on the case page (next to Requirements / Disclosures /
   Documents / Notes / Tasks), rendering a new <IntakeReview> component.

3. <IntakeReview> renders the WizardAnswers in a CLEAN, HUMAN-READABLE layout — NOT raw JSON. Mirror the wizard's own
   structure and labels (from lib/intake/schema.ts, lib/intake/answers.ts, and the wizard component), grouped by the
   intake steps:
     • Eligibility — DOB, residence status, license type, borough, the prohibitor questions (felony / mental-health /
       active OOP / unlawful drug).
     • Identity & residence — photo ID type, citizenship (+ LPR <7yr), proof-of-residence method, full Section-A
       identity fields (name/middle/alias, legal address, place of birth, physical description), business fields (for
       business track), out-of-city license (special carry).
     • Household & safeguard — cohabitants (a small table: name / relationship / DOB), safeguard person + method/address.
     • Disclosures — arrests, orders of protection, domestic incidents, the Q10–28 questionnaire answers (each with its
       narrative). (These overlap the Disclosures tab — that's fine; show them here in intake context too.)
     • Carry & history — training status/instructor/date, references (table), social accounts/handles, veteran /
       retired-LEO / name-change / other-license flags, and the 5-year residence + employment history tables.
   Use clean label→value rows and sub-tables for the array sections. Show "—" for empty fields. Format dates and enums
   into plain language (e.g. residence "nyc" → "NYC resident"; licenseType "carry" → "Carry").

4. STATUS HEADER at the top of the tab so staff can judge completeness at a glance:
     • whether an intake_sessions row exists at all,
     • completed_at (or "not completed"),
     • current_step / how far they got (e.g. "Reached step 4 of 6"),
     • last updated timestamp.

5. EMPTY / PARTIAL STATES (important — this is how staff diagnose the "did it save?" question):
     • No intake_sessions row for the case → a clear message: "No intake responses have been saved for this applicant
       yet. If they say they completed intake, their submission may not have saved — check the intake-save issue."
     • Row exists but answers are sparse/incomplete → still render whatever IS there (per-step saves may be partial),
       with the status header showing how far they got. Never blank out just because completed_at is null.

6. Optional: a collapsed "Raw data (developer)" <details> with the JSON, for debugging — admin-only.

7. Do NOT change how intake is captured or saved here — this is a read-only viewer. (The separate intake-save bug —
   migrations behind the deployed DB causing "Couldn't save progress / Generation failed" — is fixed elsewhere; note in
   a code comment that this viewer will display data only for intakes that actually saved.)
```

## Verify
```
- On a case WITH saved intake (e.g. a seeded client), the tab shows all sections grouped + labeled, arrays as tables,
  and a status header with completed_at / step. Screenshot it.
- On a case with NO intake row, the tab shows the clear "not saved" empty state (not a crash, not blank).
- The component is used ONLY on the admin case page; grep confirms it's not imported into any instructor route; no RLS
  changes; instructors still cannot read intake answers (re-run the RLS harness).
- pnpm build && pnpm test && verify-* pass.
Deliver: screenshots of the populated tab and the empty state.
```

---

### Notes for you (not for Claude Code)
- **Will you see Otniel's answers after this ships?** Only if his intake actually saved. This viewer reads `intake_sessions.answers` — if the data is there, you'll see all of it; if his session hit the save bug and never wrote, the tab will show the "not saved" empty state (with how far he got). So run this **together with the intake-save fix** (the migrations-behind-code issue) — one lets you *see* saved intakes, the other makes sure intakes *save* going forward.
- **Quickest diagnosis without waiting for the build:** open Otniel's case now — if Requirements/Disclosures are populated, his intake saved and this viewer will surface everything. If they're empty, it didn't save, and he'll need to redo intake after the save fix is deployed.
- If you want, I can merge this and the intake-save fix into a single prompt so they ship in one pass.
