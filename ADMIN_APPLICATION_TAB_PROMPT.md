# The admin Application tab — transcribe the NYPD portal without leaving the case

## What this is for

Staff sit with the NYPD online portal open in one window and the case open in the
other, and walk the portal's 17 steps end to end. Everything they need to type,
paste or upload must be on ONE screen, **in the portal's own order, under the
portal's own headings**, with the uploads sitting at the step that asks for them.
Anything we don't have yet is flagged so a blank never gets typed as an answer.

This is a transcription aid. It does not file, it holds no NYPD credentials, and it
is staff-only. The preparer block disclosed at step 14 is what makes the assistance
legitimate — that stays.

---

## What already exists — do NOT rebuild it

```
lib/disclosures/worksheet-portal.ts    buildPortalWorksheet() — values in portal format
components/admin/portal-worksheet.tsx  copy buttons, missing flags
app/admin/cases/[id]/worksheet/page.tsx   standalone staff page
app/admin/cases/[id]/packet/route.ts      cover + index + merged uploaded docs
app/admin/cases/[id]/filing-pack/route.ts guided filing pack PDF
lib/disclosures/readiness.ts           computePortalReadiness() + REQUIRED_UPLOADS
lib/forms/prepare.ts                   assembleApplicationValues() — the resolver
lib/packet/assemble.ts                 DOC_ORDER, mergePdfs, docOrderIndex
```

The work is to **promote the worksheet into a tab, put the documents into it, and
correct its step order** — not to write a second worksheet.

---

# THE ONE ARCHITECTURAL RULE

There are currently three independent lists of what the portal wants:

```
lib/disclosures/worksheet-portal.ts   8 ad-hoc sections
lib/disclosures/readiness.ts          REQUIRED_UPLOADS (5 codes)
lib/disclosures/portal-questions.ts   PORTAL_DISCLOSURES (16 questions)
```

**Do not add a fourth.** This codebase has already shipped one bug from a list
copied five times (the Q20a addendum drift). Create a single ordered definition and
derive everything from it.

```
config/portal-steps.ts        ← NEW, the single source of truth

export const PORTAL_STEPS = [
  { no:  1, title: "Verify Your Information",        kind: "fields" },
  { no:  2, title: "Residence History",              kind: "fields" },
  { no:  3, title: "Employment",                     kind: "fields" },
  { no:  4, title: "Employment History",             kind: "fields" },
  { no:  5, title: "Other Licenses",                 kind: "fields" },
  { no:  6, title: "Existing Guns",                  kind: "fields" },
  { no:  7, title: "Safekeeping and Safeguarding",   kind: "fields" },
  { no:  8, title: "Questions 1–6",                  kind: "questions", range: [1, 6] },
  { no:  9, title: "Questions 7–12",                 kind: "questions", range: [7, 12] },
  { no: 10, title: "Questions 13–15",                kind: "questions", range: [13, 16] },
  { no: 11, title: "Confidentiality",                kind: "fields" },
  { no: 12, title: "Letter of Necessity",            kind: "fields" },
  { no: 13, title: "Document Uploads",               kind: "uploads" },
  { no: 14, title: "Counsel and Preparer",           kind: "fields" },
  { no: 15, title: "Verify Your Information",        kind: "checkpoint" },
  { no: 16, title: "Affirmations",                   kind: "checkpoint" },
  { no: 17, title: "Payment",                        kind: "checkpoint" },
] as const
```

`buildPortalWorksheet`, `computePortalReadiness`, the applicant-facing progress and
the PDF export all read this. Adding a step becomes one edit.

---

# PART 1 — Correct the step order first

The current worksheet's sections are close but **wrong in ways that will misdirect
someone typing along with the portal**:

```
WRONG NOW                          CORRECT
"Verify Your Information" first    That is step 15. Step 1 is Identity/contact/
                                   address/citizenship/SSN-last-4. Rename it.
"Employment" (one section)         Two portal steps: 3 current, 4 history. Split.
"Other Licenses & Existing Guns"   Two portal steps: 5 and 6. Split.
"Disclosure Questions" (one)       Three portal screens: 8, 9, 10. Split on the
                                   question ranges above.
"Representation & Assistance"      This is step 14. Number it.
— missing entirely —               Step 11 Confidentiality
— missing entirely —               Step 13 Document uploads
— missing entirely —               Steps 15/16/17
```

Every section header renders as `Step N — <portal's own title>`. Steps 15–17 are
`checkpoint` sections: no data to copy, just what the screen asks and what it means
(16 is where "Finalize and Pay" becomes irreversible; 17 hands off to NYC CityPay).

---

# PART 2 — The Application tab

Add `<TabsTrigger value="application">Application</TabsTrigger>` to
`app/admin/cases/[id]/page.tsx`, positioned FIRST — it is the primary staff surface
now. Label it with readiness, e.g. `Application (6 missing)`.

```
LAYOUT
· Sticky header:  readiness summary · "Jump to next missing" · the two download
  buttons (PART 4) · a link that opens licensing.nypdonline.org in a new tab.
· A step rail (1–17) down the side or across the top. Each step shows a state dot:
      complete · has missing · not yet reached · marked entered
  Clicking scrolls to the step.
· Steps render in order, expanded by default, each collapsible.
· Per-field: label, portal-formatted value, copy button. Clicking anywhere on the
  VALUE copies it too — a 24px button is a small target when you are doing 150 of
  them. Keep the explicit button for discoverability.
· Per-step: "Copy this step" → all label/value pairs as plain text.
```

```
PERFORMANCE / PRIVACY NOTE
The case page renders all tab content server-side even when the tab is not active.
Do NOT call getCaseSsn() during that render — it writes an SSN-access audit entry,
so every casual case-page view would log an SSN access.
    → Render the SSN field as a click-to-reveal that calls a server action.
      That action does the getCaseSsn() read and logs it AT THAT MOMENT, which is
      the honest record and a genuine improvement over today.
Wrap the assembly in <Suspense> so a slow resolver never blocks the rest of the page.
```

---

# PART 3 — Step 13: the documents, inline

This is the new build. Today the uploads live in a separate Documents tab in our
taxonomy; at step 13 they must appear in the **portal's** taxonomy, in its slots.

```
Show ONLY requirements with destination = 'portal_upload'. Group under the portal's
own upload labels:
    Photograph · Photo ID · DOB Proof · Residence Proof · Safeguard · Cohabitant ·
    Training Documents (not starred — may follow)

PER SLOT
  · portal label + our requirement title + whether the portal stars it as required
  · state, honestly:
        accepted        green
        uploaded, not yet reviewed    amber — say so; do not let it read as done
        rejected        red + the rejection reason
        missing         red glow (PART 6)
  · file name, size, MIME
  · [ Download ] — mints a signed URL ON CLICK via a server action (see below)
  · [ Open in new tab ] for a quick eyeball before uploading

PRE-FLIGHT — check these BEFORE staff try the portal, and show a warning inline.
The portal rejects on all of them and finding out mid-filing costs the session:
        · ≤ 5 MB
        · pdf, tif, jpg, jpeg, gif, png, bmp
        · Photograph: IMAGE ONLY — a PDF is rejected outright
        · filename contains no accents, tildes or symbols (è é ñ & * #)
  For a filename that would bounce, offer a sanitised name and download under it.

  The Photograph slot additionally: the portal AUTO-VALIDATES it and reports
  pass/fail. Surface our own pre-check (front view, no hat/glasses, not a selfie,
  taken within 30 days) as a reminder next to it.
```

```
SIGNED URLs — the current pattern will break this screen.
requirement-view.ts and the case page mint 300-second signed URLs at render.
Transcribing 17 steps takes far longer than five minutes, so every Download link
on this tab would be dead by the time staff reach step 13.
    → Mint on demand in a server action when the button is clicked. Never at render.
```

Below the slots, a short muted list: **held for the interview / our file — do NOT
upload these** (character references, Affirmation of Understanding, Safeguard
Acknowledgement, Affidavit of Familiarity, the notarised Release, SSN card, DMV
abstract). Staff uploading an interview document into a portal slot is a real and
easy mistake.

---

# PART 4 — Two downloads, and why it must be two

Daniel asked for "download the entire application as a PDF including the documents."
Build that — and build a second one, because a single merged PDF **cannot be used to
file**:

```
1. [ Download application record (PDF) ]
   The reading and record copy. Cover, then all 17 steps with every value in portal
   format, then the merged supporting documents. Extends the existing
   assembleFilingPack() — it already does cover + worksheet + upload guide + merged
   docs. Update it to the 17-step order and mark it INTERNAL WORK PRODUCT on every
   page (the existing pack is written for the applicant; this variant is for us).
   Use for: review before filing, the interview, the file.

2. [ Download upload set (ZIP) ]
   The set staff actually upload. One file per portal slot, NOT merged, named for
   the slot and sanitised to the portal's filename rules:
        01-photograph.jpg
        02-photo-id.pdf
        03-dob-proof.pdf
        04-residence-proof.pdf
        05-safeguard-id.pdf
        06-cohabitant-affidavit.pdf
   The portal takes each document into its own field. A merged PDF is unusable there
   and uploading it would put the whole packet into the "Photograph" slot.
   Include a README.txt mapping file → portal slot. Omit anything rejected or
   missing, and list what was omitted in the README.
```

Both buttons live in the tab's sticky header and stay in the case-page header where
they are today.

---

# PART 5 — Remember where staff stopped

17 steps in one sitting, with interruptions. Track it.

```
migration  supabase/migrations/<14-digit>_portal_entry_progress.sql
    portal_entry_progress (
      case_id uuid references cases(id) on delete cascade,
      step_no smallint not null check (step_no between 1 and 17),
      entered_at timestamptz not null default now(),
      entered_by uuid not null references auth.users(id),
      primary key (case_id, step_no)
    )
RLS in the SAME migration: staff/admin only, is_staff_or_admin(). Never client-readable.
```

Each step gets a `Mark entered` toggle. Marked steps collapse and dim. The header
reads `Step 9 of 17 entered`. Server action → `logActivity()` → `revalidatePath()`,
per the codebase convention.

This is a work-tracking record, not a claim about the NYPD's state. Never render it
to the applicant and never let it imply the application was submitted.

---

# PART 6 — Field states and the red glow

`WorksheetField` currently has `missing` and `atFiling`. It needs a third state —
the disclosure builder is faking N/A by writing the string "N/A" into `value`, which
makes it count as present.

```
type FieldState = "ready" | "missing" | "at-filing" | "not-applicable"

ready           value present            normal
missing         we should have it        RED GLOW — ring-2 ring-danger/50 plus a soft
                                         outer shadow in danger. Static, no pulse.
                                         Respect prefers-reduced-motion (border-only
                                         fallback). The value area reads "missing",
                                         never an empty line.
at-filing        SSN, handgun list       neutral "— enter at filing —", no glow
not-applicable   conditional not hit     muted "N/A", no glow, EXCLUDED from the count
```

The header count must only count `missing`. A count inflated by N/A rows trains
staff to ignore it.

---

# VERIFY

```
 1. The Application tab is the first tab and shows Steps 1–17 with the portal's own
    headings and numbers.
 2. Open the real portal side by side and walk it: every screen's fields appear
    under the matching step, in the same order, in the portal's format
    (8/23/2002 · 5'05" · 130.00 · split building number / street name).
 3. Step 13 lists the portal upload slots with live state and a working Download
    that still works 30 MINUTES after the page loaded.
 4. A too-large / wrong-type / accented-filename document is flagged BEFORE filing,
    with a sanitised name offered.
 5. A PDF in the Photograph slot is flagged as rejected-by-format.
 6. A missing field shows a red glow ring; an N/A field does not, and is not counted.
 7. The SSN is hidden until revealed, and revealing writes exactly one audit entry.
    Loading the case page writes none.
 8. The ZIP contains one correctly named file per slot plus a README, and the PDF
    contains the 17 steps plus merged documents.
 9. "Mark entered" survives a refresh and appears in the activity log.
10. config/portal-steps.ts is the ONLY place the step list is defined — grep for a
    second one and delete it.
11. Nothing on this tab is reachable by a client role. requireStaff on the page and
    on every server action.
```

# DO NOT

- Do not build a second step list. Derive from `config/portal-steps.ts`.
- Do not mint signed URLs at render for this tab — they expire mid-session.
- Do not read the SSN during the case page render.
- Do not offer a merged PDF as the thing to upload to the portal.
- Do not show "uploaded, pending review" as complete — it is not accepted yet.
- Do not put interview-only documents in the step 13 upload slots.
- Do not add any control that submits to, or stores credentials for, the NYPD portal.
- Do not expose this tab, or the entered-step progress, to the applicant.
