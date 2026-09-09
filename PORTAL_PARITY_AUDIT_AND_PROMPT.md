# Portal parity audit — what NYPD asks vs what we collect, and the build to close it

Audited against the live walkthrough capture (PORTAL_ALIGNMENT_REBUILD_PROMPT.md
Parts 2–9) and the repo at `8743a4d`.

---

# PART 0 — THE AUDIT (read this first)

## 0.1 The portal's upload slots, as observed

The document-upload screen (step 13) showed **seven labels**:

```
Photograph · Photo ID · DOB Proof · Residence Proof · Safeguard · Cohabitant ·
Training Documents          (+ an unlabelled "Additional Documents" area)

STARRED REQUIRED (*)          Photograph, Photo ID, DOB Proof, Residence Proof,
                              Safeguard's ID, Affidavit of Co-habitant (NOTARIZED)
NOT STARRED                   Training Certificate/Documentation, Additional Documents
```

**There is no citizenship slot.** Citizenship is asked as a *field* at step 1
("Are you a U.S. Citizen?"); the proof is an interview document.

## 0.2 Four defects found

### ① `config/portal-steps.ts` invents a slot the portal does not have

```
{ portalLabel: "Citizenship / Lawful Status", reqCode: "IDN-03", starred: true, … }
```

IDN-03 is *Proof of citizenship or lawful status*. It is not a portal upload — our
own Part 6 capture puts it in the interview pile, and Part 11 correction #6 says
place-of-birth and alien-registration have **no portal home**. Marked `starred: true`
it becomes a required upload, so the readiness gate can demand a document with
nowhere to put it, and the ZIP export writes `04-citizenship.pdf` for a slot that
does not exist. **Remove the slot; retag IDN-03 as `interview`.**

### ② Cohabitant is starred on the portal, unstarred in our code

```
config/portal-steps.ts   { portalLabel: "Cohabitant", reqCode: "COH-01", starred: false }
```

The portal stars it. With `starred: false` it is excluded from
`REQUIRED_UPLOAD_CODES`, so both readiness gates report ready while a required
notarised affidavit is missing — and the portal blocks at submission, after the
irreversible step 16 warning has already been passed. **Set `starred: true`.**

### ③ The single-source-of-truth rule was only half applied

`config/portal-steps.ts` exports `REQUIRED_UPLOAD_CODES`. **Nothing imports it.**
`lib/disclosures/readiness.ts` still carries its own hardcoded map:

```
readiness.ts REQUIRED_UPLOADS   PHO-01 IDN-01 IDN-02 RES-01 SGI-01
portal-steps REQUIRED_UPLOAD_CODES   PHO-01 IDN-01 IDN-02 IDN-03 RES-01 SGI-01
```

Two lists, already disagreeing on two codes. The Application tab and the readiness
gate will give different answers to "are we ready to file." This is the exact drift
the config file was created to prevent.

### ④ Interview documents are names only — you cannot see or open them

`lib/portal/application-tab.ts:132` builds `heldForInterview` as
`{ reqCode, title }`. No file, no state, no download. So on the Application tab you
can see *that* a notarised release is expected, but not whether it is in hand, and
you cannot open it. The same is true of the character references, the Affidavit of
Familiarity and the Safeguard Acknowledgement.

**Answering your question directly: no — not every document is accessible from the
concierge review.** The portal-upload ones are; the interview ones are not.

## 0.3 Requirements tagged `portal_upload` with no slot

Migration `20260828000400` tags these `portal_upload`. Only the first eight have a
slot in `config/portal-steps.ts`:

```
HAS A SLOT      PHO-01 IDN-01 IDN-02 RES-01 SGI-01 COH-01 TRN-01   ✓
NO SLOT         IDN-03   → retag 'interview' (defect ①)
                IDN-04   → RETIRED by 20260829000400 (dedupe into PHO-01); the row
                           still says portal_upload. Stale — set 'internal'.
                PBR-01   → actions.ts says RETIRED (step 11 is filled inline).
                           Still tagged portal_upload. Stale — set 'internal'.
                COH-02   → sole-occupancy attestation. Decide: it belongs in the
                           Cohabitant slot as the alternative to COH-01.
                RNW-01   → renewal live-fire certificate → Training Documents slot.
                GRD-01..04 → armed-guard track (ISS Action). Not a CCW portal upload.
                           → 'Additional Documents', or retag 'interview'.
```

## 0.4 Data parity — steps 1–14

Every portal field has a home in our collection. Checked against
`buildPortalWorksheet` + the fact registry:

```
Step 1  identity, contact, address, citizenship, SSN-4       ✓
Step 2  residence history 5y                                  ✓
Step 3  employment current                                    ✓
Step 4  employment history 5y                                 ✓
Step 5  other licenses                                        ✓
Step 6  existing guns                                         ✓
Step 7  safekeeping + safeguard person                        ✓
Step 8-10  questions 1–16 + explanations                      ✓
Step 11 confidentiality (inline, CON-01)                      ✓
Step 12 letter of necessity                                   ✓
Step 14 counsel + preparer                                    ✓
```

No missing data collection. **The defects are all in the tagging and the plumbing,
not in what we ask the applicant.**

---

# PART 1 — Fix the tags and the slot list

```
config/portal-steps.ts
  · DELETE the "Citizenship / Lawful Status" (IDN-03) slot.
  · Cohabitant (COH-01): starred → true.
  · ADD a slot: { portalLabel: "Additional Documents", reqCode: null, starred: false }
    as an explicit catch-all, so a document with no starred home is visibly parked
    rather than silently dropped from the ZIP.
  · Renumber zipBase after removing IDN-03 (01…07, no gap).

migration  supabase/migrations/<14-digit>_destination_corrections.sql
  IDN-03  → 'interview'
  IDN-04  → 'internal'   (retired 20260829000400)
  PBR-01  → 'internal'   (retired — step 11 fills inline)
  COH-02  → keep 'portal_upload'; map it to the Cohabitant slot as the alternative
            to COH-01 (one or the other satisfies that slot, never both)
  RNW-01  → keep 'portal_upload'; map to the Training Documents slot
  GRD-01..GRD-04 → 'interview'
```

**Do not edit a shipped migration.** New dated migration, per AGENTS.md.

---

# PART 2 — Actually enforce the single source of truth

```
lib/disclosures/readiness.ts
  · DELETE the local REQUIRED_UPLOADS map.
  · Import REQUIRED_UPLOAD_CODES from config/portal-steps and derive labels from
    PORTAL_UPLOAD_SLOTS[].portalLabel.
  · A test that fails if any module other than config/portal-steps.ts declares a
    list of required upload codes.
```

Grep for a third copy before you finish. There were three lists last time.

---

# PART 3 — Make every document reachable from the Application tab

`heldForInterview` becomes a full view, the same shape as a portal slot:

```
interface HeldItem {
  reqCode, title
  destination: "interview" | "internal"
  state: "accepted" | "submitted" | "rejected" | "missing"
  fileName: string | null
  documentId: string | null
  rejectionNote: string | null
  notarizedRequired: boolean      // REL-01, COH-01, FAM-01 …
  notarized: boolean
}
```

Render it under step 13 in its existing "Held for the interview — do NOT upload
these to the portal" block, with the same state colours and the same **open-on-click
signed URL** the portal slots use (minted in the server action, never at render).

The applicant must bring originals of everything to the fingerprint appointment —
this block is the list staff read off. It has to show what is actually in hand.

---

# PART 4 — Three metrics

One helper, three numbers, computed from one pass so they can never disagree.

```
lib/portal/completion.ts        ← NEW

export interface CompletionMetrics {
  portal:    { done: number; total: number; outstanding: OutstandingItem[] }
  interview: { done: number; total: number; outstanding: OutstandingItem[] }
  overall:   { done: number; total: number; pct: number }
}

PORTAL      everything needed to complete and submit the NYPD ONLINE application:
            the step 1–14 data fields (missing ones from the worksheet) +
            every starred upload slot accepted + the signed answers record.
            This is the "can we start / can we finalize" number.

INTERVIEW   what the client still owes for the IN-PERSON visit: every requirement
            with destination = 'interview' not yet accepted — character references,
            the notarised release, the Affidavit of Familiarity, the Safeguard
            Acknowledgement, Certificate of Relief where triggered, and the
            originals of everything uploaded.

OVERALL     the union, deduplicated. NOT the sum — a requirement counted in both
            piles would inflate it. Assert done ≤ total in a test.
```

```
COUNTING RULES — get these right or the numbers lie
· "submitted, awaiting our review" is NOT done. Show it as a third state on the
  bar, not as progress.
· A requirement with status 'na' (not triggered for this case) is excluded from
  BOTH numerator and denominator.
· A rejected document counts as outstanding and carries its reason.
· A data field that is legitimately blank (optional, or N/A by conditional) is
  excluded from the denominator — the same rule as the red-glow states.
```

Render as three bars in the case header and on the concierge cockpit row, each
expanding to its outstanding list with a deep link to the item. Same component both
places — one implementation.

---

# PART 5 — Email staff when a case is ready to enter

The precedent already exists: `lib/reminders/engine.ts` fires `qa_ready` to
`clients.assigned_staff`. It sends an **in-app notification only** — it passes
`recipient` with no `email`, so nothing lands in an inbox.

```
NEW RULE   ruleKey: "portal_entry_ready"
  target:     the assigned staff profile
  windowKey:  the case id  → fires ONCE per case, via the existing
              (rule_key, target, window_key) idempotency. Do not invent new
              de-duplication.
  fires when: computePortalReadiness().readyToEnter === true
              AND the case has not already been marked entered
  recipient:  staff profile id      (in-app)
  email:      the staff member's email   ← the part qa_ready is missing
  cta:        { label: "Open the Application tab",
                url: <site>/admin/cases/<id>?tab=application }
  body:       name the client and the three metrics, e.g.
              "Everything needed to begin the online application is in.
               Portal 34/34 · Interview 6/9 · Overall 40/43."
```

```
· The Application tab must accept ?tab=application so the CTA lands on the tab,
  not the default Requirements tab.
· Demo/access-code cases are already excluded centrally by fireOnce — keep it.
· Add the staff email lookup alongside the existing client/instructor lookups.
· If readiness later regresses (a document is rejected), fire a distinct
  "portal_entry_blocked" rule rather than re-firing this one.
```

---

# VERIFY

```
 1. config/portal-steps.ts has SEVEN real slots + Additional Documents. No
    citizenship slot. Cohabitant is starred.
 2. Open the live portal's upload screen beside step 13 — the slot list matches
    label for label.
 3. grep the repo: exactly one declaration of the required-upload codes.
 4. readiness.ts and the Application tab report the SAME required uploads.
 5. A case missing the cohabitant affidavit is NOT reported ready to finalize.
 6. IDN-03 appears in the interview block, not in an upload slot.
 7. Every interview document shows state and opens from the tab; the signed URL
    still works 30 minutes after page load.
 8. The three metrics: overall.total ≤ portal.total + interview.total (dedup), and
    done ≤ total in every one. Test it with a case that has an item in both piles.
 9. A satisfied-then-rejected document moves the count backwards, correctly.
10. Completing the last data field fires exactly ONE portal_entry_ready email to
    the assigned staff member, with a working deep link to the Application tab.
11. Re-running the reminder engine does not fire it a second time.
12. A demo case fires nothing.
```

# DO NOT

- Do not add a slot the portal does not show; a slot with no home produces a file
  staff cannot upload and a gate they cannot clear.
- Do not leave `REQUIRED_UPLOAD_CODES` exported-but-unused. Either it is the source
  of truth or it should not exist.
- Do not count "submitted, awaiting review" as done in any of the three metrics.
- Do not sum portal + interview into overall — deduplicate.
- Do not mint signed URLs at render for interview documents.
- Do not email the applicant on portal_entry_ready. This rule is staff-only.
- Do not edit shipped migrations; add a new dated one.
- Do not let any of this imply we file, submit or represent. The tab is a
  transcription aid; the applicant files.
