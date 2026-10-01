# Filing-authority inventory — FOR COUNSEL (P0.3)

**Status: OPEN — do not rewrite any of this copy until a New York firearms attorney rules.**

## The question
May a non-attorney preparer (Gun License NYC) **enter and submit** an applicant's handgun-license
application through the NYPD online portal *at the applicant's direction* — or must the applicant
perform the final entry/submission themselves?

This is unsettled, not a known rule: NYPD's step 14 collects a **preparer's organisation name**, and
its published notice restricts **representation** to attorneys without addressing **data entry**. The
repo already carries `// OPEN:` uncertainty reflecting this.

## The defect this documents
The engagement is **self-contradictory**: two opposite promises, both e-signed in the same flow.

- **"We file on your behalf" position** — `config/agreements.ts`:
  - `engagement_limited_scope` (v2): *"as your preparer, at your direction — we may enter and file
    your application through the NYPD's online licensing portal on your behalf."*
  - `applicant_files_ack` (v2, title "We can file — the facts and the signature stay yours"): *"I
    authorize Gun License NYC to prepare and, at my direction, file and submit my NYPD handgun-license
    application on my behalf as my preparer."*
- **"You file your own" position** — `app/portal/concierge/actions.ts:23` (the concierge agreements
  signature block): *"I understand I file my own NYPD application and that Gun License NYC prepares and
  organizes it but **does not file for me** or represent me."*

Both are presented and e-signed together. That contradiction is a blocker **whichever way the
question resolves**.

## Every surface that states or implies GLNYC files / submits / enters (rule on this list)
Verbatim strings, "we file" position:
- `config/agreements.ts:27-28` — engagement_limited_scope body ("we may enter and file … on your behalf")
- `config/agreements.ts:60` — applicant_files_ack body ("file and submit my NYPD … on my behalf")
- `config/agreements.ts` — applicant_files_ack title/summary ("We can file …")
- `app/portal/forms/page.tsx:78` — "with Full Concierge we file it for you"
- `app/(marketing)/page.tsx:47` — "and can file it for you"
- `app/(marketing)/faq/page.tsx:23` — "with Full Concierge we file it for you"
- `app/(marketing)/about/page.tsx:71` — "we file it with the NYPD on [your behalf]"
- `app/(marketing)/requirements/page.tsx:168` — "we file it with the NYPD on your behalf"
- `app/(marketing)/non-resident-business/page.tsx:151` — "with Full Concierge we file it for you"
- `components/marketing/checklist-view.tsx:146` — "with Full Concierge, we file it for you"
- `components/portal/concierge/data-asks-section.tsx:18` — "The details we enter into the NYPD portal for you"
- `components/marketing/json-ld.tsx:139,180` — "with Full Concierge we file it on their behalf"
- `app/llms.txt/route.ts:22,28` — "Gun License NYC files it on the applicant's behalf"
- `lib/disclosures/signed-record.ts:12,49` — "authorization for us to enter them into the NYPD online portal"
- `app/admin/actions.ts:1201` / `components/portal/concierge/document-vault.tsx:98` /
  `app/portal/page.tsx:153` / `lib/reminders/engine.ts:933` — "we take it from there" (implies we act)

Contradicting "you file your own" strings (also rule on these so the set is made consistent):
- `app/portal/concierge/actions.ts:23` — "I file my own NYPD application … does not file for me"
- `app/portal/choose-path/page.tsx:62` — "you file your own NYPD application"
- `lib/pdf/fee-sheet.ts:66` — "we do not file on your behalf"
- `components/portal/concierge/review-and-file.tsx:33` — 'There is no "we file" control … by design'
- `lib/forms/application.ts:9` — "The applicant reviews and files their OWN application"

Not in dispute (leave as-is): `app/(marketing)/appeal`, `app/portal/appeal/page.tsx` — only an
**attorney** may file an **appeal** (a separate, settled rule).

## What must happen (per the work order)
1. Counsel rules on the question above.
2. Every surface in this list is made consistent with the ruling.
3. Bump the affected `config/agreements.ts` version(s) so prior signers must re-accept; preserve audit
   history.
4. Only then add a copy-guard test asserting the **approved** position (not a guessed one).

Owner: New York firearms attorney. Do not resolve in code.
