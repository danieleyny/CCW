# Carry Guard — merged remediation sequence

> This supersedes nothing and replaces nothing. It is the **running order** for three passes over the sponsored Carry Guard workflow, plus authoritative rulings where two independent reviews disagreed. Work the passes in order; do not start one before the previous is green.
>
> Two prompts already exist in the repo root and are Passes 1 and 2. Pass 3 is new and is written out in full below. It merges the genuine additions from an independent audit that did not have the live QA evidence, with every regulatory claim re-verified against the primary source.
>
> **Non-negotiables across all three passes.** NY Penal Law § 400.00(3) — only the applicant signs, swears and adopts; nobody signs for them. Notarised instruments are never digitally signed on-platform. We fill the REAL official PDF, never a facsimile. The CP-5 gate, the sponsor `party_scope` firewall and the draft/adopt split stay intact.

---

## RUNNING ORDER

```
PASS 1  FORM_ENGINE_FIXES_PROMPT.md          ← in repo. Start here. Nothing else first.
        Gate: scripts/verify-form-templates.ts green, and the M-522
              date-of-birth test passes.

PASS 2  CASE_FACTS_AND_COMPLETENESS_PROMPT.md ← in repo.
        Gate: one fact set populates every form; no `prefill:` remains in
              questionnaires.ts; the completeness gate blocks an incomplete form.

PASS 3  This document, section by section.
        Gate: the full verification block at the end.
```

**Pass 1 is not optional and cannot be reordered.** The independent audit does not contain the five defects found by actually generating and signing the forms — most importantly that the signing step writes the signing date into the applicant's **date of birth** on a document sworn under penalty of perjury. Running any other plan first leaves that shipping.

For continuity if either file drifts, Pass 1 covers: the DOB/signing-date defect; the encrypted HIPAA template that throws on load; two byte-identical template files registered as different forms; fill failures silently swallowed by bare `catch {}`; and a notarised § 5-09 form wired for digital signature. Pass 2 covers the canonical fact layer and the "nothing blank but the signature" completeness contract.

---

## RULINGS — where the two reviews conflict

Apply these. Do not average them, and do not follow the other document where it contradicts one of these.

```
R1  EMPLOYER ACCESS SCOPE — OWNER DECISION, NOT A DEFAULT
    The independent audit recommends limiting employer access to status and
    employer-supplied items, and specifically not exposing SSN, immigration
    records, arrest or sealed materials, orders of protection, domestic
    narratives, health information, references, or household identity documents.
    That is also what the QA review recommended.
    THE OWNER CHOSE FULL ACCESS. Build full access, as already specified:
    scope='full', gated on the applicant's written consent naming those exact
    categories, every document view logged, and applicant-initiated revocation.
    Do NOT silently narrow the scope to match the audit.
    DO surface it as a decision: keep the `assist` tier working so narrowing is a
    one-row UPDATE, and keep it on the operator's open-questions list.
    EXCEPTION, absolute: the SSN. See R2.

R2  NO SOCIAL SECURITY NUMBER OR CARD IN THE VAULT
    The audit asks to model a "Social Security card" document. Do not.
    38 RCNY § 5-05 does not list one; the NYPD checklist says bring the ORIGINAL
    to the appointment. Keep it `at_filing`, as config/application-coverage.ts
    already does. Never create an upload slot for it, never store the number in
    the ordinary applicant record, and never expose it to the sponsor under any
    scope or consent.

R3  GREEN MEANS A HUMAN CHECKED IT
    The audit says restore the green gradient for "completed" and never show
    green before server confirmation. Both are right, and they resolve as three
    states, not two:
      outstanding → no accent
      received    → brass/amber, "we're checking this" (server-confirmed upload)
      approved    → green gradient + check icon (staff accepted)
    Server confirmation earns the brass state. Only staff acceptance earns green.

R4  SAFE PHOTOS ARE NOT UNIVERSAL — the audit is right, act on it. See 3B.

R5  WHERE THE TWO DOCUMENTS AGREE, THEY AGREE. Two references not four; no
    16+2 concealed-carry course on this track; no three-year social-media list;
    collect once and reuse; never rewrite a signed document. Treat those as
    settled and do not re-open them.
```

---

# PASS 3

## 3A — Regulatory corrections, each verified against the primary source

```
1. DOS ARMED-STATUS UPGRADE — the form is DOS-1619-f (Rev. 01/26), not "DOS-1619".
   Verified at dos.ny.gov. Submitting an armed upgrade requires ALL of:
     · the completed DOS-1619-f
     · the 47-hour firearms course certificate
     · RETURN OF THE CURRENT SECURITY GUARD ID CARD    ← we did not have this
     · a $25 fee
   The card return is a real applicant action with a real consequence — he
   surrenders his working credential. Model it as a step with its own status, not
   a line in help text. The Rev. 01/26 date also means this form changed in
   January; put it under the template drift check with the others.

2. § 5-06 IS THE CARRY GUARD RULE — "Gun Custodian, Carry Guard and Special
   Licenses; Establishing Company Need for Handgun Licensing." Verified. It
   states that individual security personnel may apply once their EMPLOYER has
   obtained a gun custodian licence. That is not a checklist convention, it is the
   rule. Cite it wherever the custodian dependency is explained, and treat a case
   with no confirmed custodian as blocked at the case level.

3. § 5-04 IS THE LICENCE-TYPE RULE — "Carry Guard License / Gun Custodian License
   and Special Carry Guard License / Gun Custodian License." Verified. It sets the
   evidentiary standard: demonstrate the employer's business need through contract
   or letter, prove current employment requiring a handgun licence, and supply the
   relevant NYS professional licensing. That maps exactly onto SPN-02 (letter of
   necessity), SPN-06 (position confirmation) and SPN-04 (agency licence) — add
   the citation to each so the requirement can be defended.

4. § 5-05 IS THE GENERAL APPLICATION RULE. Verified list: colour photograph within
   30 days · birth certificate or proof of birth date · proof of citizenship or
   alien registration · military discharge if applicable · proof of residence ·
   arrest information and certificates of disposition · proof of business
   ownership if applicable · character references, minimum two non-family ·
   contact information for household members · currently held firearm licences ·
   a functional email address · lifetime DMV abstract for every state of residency
   in the preceding five years (subsection (b)(12), already cited correctly in the
   registry) · fees · fingerprinting appointment.
   NOTE WHAT IS ABSENT: no safe photographs, and no Social Security card.
```

## 3B — De-scope what this track does not need

```
Audit every requirement that fires for a carry_guard case and remove or
reclassify these. Each removal shortens the applicant's list, which is the
product.

  SAF-01 SAFE PHOTOGRAPHS — currently required ("plus photos of your safe").
    § 5-05 does not require them; they belong to Premise Business. KEEP the
    safeguarding EXPLANATION and the designated-safeguard acknowledgement, which
    § 5-05 does require via household contact information and the NYPD checklist.
    DROP the photographs from this track. If you believe they are required,
    produce the citation before restoring them.

  HIPAA / MEDICAL RELEASE — not an intake document. Investigator-requested and
    case-specific only. (Pass 1 also fixes it throwing on load.)

  EMPLOYMENT RECORD RELEASE — investigator-phase, and after Pass 1's duplicate-
    file fix there is only one such form. Not an intake item.

  CREDIT CARD AUTHORIZATION · PURCHASE AUTHORIZATION · REQUEST TO SELL ·
  CHANGE OF ADDRESS/EMPLOYMENT — payment and post-issuance workflows. Hold the
    templates; they must not appear in the applicant's checklist or be reachable
    from any "Complete this form" control.

  SOCIAL-MEDIA LIST (SOC-01) — already excluded on this track via `unless_armed`.
    Confirm it does not surface, and leave it excluded.

  Never store payment-card numbers or security codes anywhere, for any reason.
```

## 3C — The DOS upgrade is a separate filing, modelled separately

```
The NYPD licence and the DOS armed-status change are two filings with two
authorities on two timelines. Today the DOS step is described but not modelled.

  1. Give it its own stage after the NYPD licence is issued, with its own
     requirement set: DOS-1619-f · 47-hour certificate · guard card return · fee.
  2. It must NOT appear as part of the NYPD packet, and the CP-5 gate must not
     treat it as a filing blocker.
  3. Model the recurring obligation that follows: an 8-hour annual in-service AND
     an 8-hour annual firearms course, every calendar year he holds armed status.
     Registrations run two years, so a full cycle is two of each. This is a
     renewal relationship, not a one-off — build it as tracked recurring items
     with reminders, which is also the recurring-revenue line.
  4. Copy must never imply the NYPD licence makes him armed-qualified. Both
     approvals must be active AND the employer must clear the assignment.
```

## 3D — What the § 5-09 instructor statement must actually contain

```
Pass 1 sets PLE-01 to notarize:true / signable:false. Pass 3 fills in its
substance. Per 38 RCNY § 5-09, the instructor's verified statement must cover:

  · that the instructor has MET the applicant
  · a danger assessment — that the applicant poses no danger to self or others
  · the instructor's certification / authority to give the instruction
  · the instructor's name, address and telephone number
  · the EXACT location where the training will take place, with contact details

The stored PDF's own fields are `Name oflnstructor`, `Name of Range Address
Telephone Number` and four `lnstmctors Verified Statement` lines (OCR-mangled in
the source — use the strings verbatim). Today all of them are unmapped.

  1. Collect the statement in-platform from the instructor, who is already a
     first-class user, and map it to those fields.
  2. Do not rely on the archived PDF alone as the statement of requirements —
     confirm the current content expectations against the rule and, if the
     wording is ambiguous, the License Division.
  3. The request is filed WITH the handgun application, and the form itself says
     it must be TYPED AND NOTARIZED. Both constraints must hold in the flow.
```

## 3E — Two reported UI defects, plus the completed-state treatment

I have not reproduced these two myself; they were reported from testing. Diagnose the root cause before patching — do not add a handler and declare it fixed.

```
NAVIGATION — the menu opens but at least one item does not navigate.
  Check, in this order: route validity and stale hrefs · handler attachment ·
  event propagation stopped by a parent · an overlay or z-index capturing the
  click · the menu closing before the router runs · nested interactive elements ·
  router misuse (anchor vs router push) · disabled state · focus trap · role-based
  filtering hiding or neutering an item · desktop/mobile divergence.
  Required behaviour: every visible item acts, internal links use the router,
  external links open safely, the menu closes, focus moves sensibly, auth
  survives, no double navigation, and the active destination is indicated.
  Test across applicant, sponsor and admin, on touch and keyboard.
  REPORT THE ROOT CAUSE.

UPLOAD STATUS STUCK ON "NEEDS UPLOAD" — after a successful upload the requirement
  still reads as outstanding, in the applicant's and/or the sponsor's view.
  Trace the whole path: upload response → documents row → requirement association
  (req_code, case_id, owner, supplier) → status derivation → query invalidation
  and cache → optimistic update → dashboard aggregation → role filter.
  Beware the multi-file cases — front AND back of the guard card (GRD-01), one
  affidavit per adult cohabitant, multi-state driving abstracts (DMV-01 is
  `multiple: true`). A requirement with parts is complete only when every part is
  in.
  Status vocabulary must be distinct and accurate: needs upload · received ·
  under review · accepted · changes requested · not applicable · blocked ·
  optional. A rejected item shows a replacement state with a non-sensitive
  reason — never a bare "needs upload", which erases the fact that they tried.
  Test BOTH directions: the applicant's upload updates Pamela's permitted view,
  and hers updates his — while private documents stay private even when the
  completion status is shared.
  REPORT THE ROOT CAUSE.

COMPLETED-STATE TREATMENT — implement R3's three states with existing design
  tokens: a green gradient plus a check icon and a text label for approved, brass
  for received, nothing for outstanding. Colour is never the only signal. Respect
  reduced-motion. Never render green from an optimistic update or a stale cache —
  only from confirmed server state, and it must survive refresh and re-login.
```

## 3F — Establish the applicant's legal name before anything is generated

```
Our records say "Chery Gimps"; the independent audit flags "Cheryl". A generated
NYPD form carrying the wrong legal first name is a rejection, and the wrong
spelling has already propagated into a partner-facing PDF.

  1. Do not guess and do not normalise. Resolve it from his identity document
     (IDN-01) or directly from him.
  2. Until resolved, treat it as an OPERATOR BLOCKER on the case — no form
     generation, no invitation.
  3. Once the fact layer from Pass 2 exists, the legal name lives in exactly one
     place, so the correction is made once. Add a rule that the legal name is
     never inferred from a display name or an email address.
  4. Add a general check: names, dates of birth and addresses must match across
     every generated document in a packet. A mismatch between documents is one of
     the easiest ways to have a packet bounced.
```

## 3G — Form version control and filing-time verification

```
Pass 1 gives templates a sha256 and a weekly drift check. Extend it:

  1. Each template records: form number, revision (e.g. "DOS-1619-f Rev. 01/26",
     "M-522 Rev 05/10", cohabitant affidavit "Rev 11/16/2023"), source URL, and
     last-verified date.
  2. A stale template raises a visible staff warning, never an automatic swap.
  3. Replacing a template must never alter or invalidate documents already
     finalised from the previous version — the generated document already records
     the template sha256 it came from; keep that immutable.
  4. Treat PD 643-041 as an intake reference, not proof of the live portal's
     fields. The portal can differ from the paper form. Keep the `verify` capture
     kind in config/application-coverage.ts honest, and re-check the live portal
     before the first real filing.
```

## 3H — Operator blockers, represented as ours and not the applicant's

```
Surface these on the case as OUR outstanding items. They must never render as
applicant failures or sit silently in a checklist.

  1. ISS Action's current NYS Watch, Guard or Patrol Agency licence — number and
     expiry, from an authorised representative, not a directory.
  2. Their designated NYPD-licensed gun custodian and the custodian's licence
     number. Per § 5-06 this gates the entire case.
  3. The current official 20-hour worksheet — we have not seen the form.
  4. The current NYPD letter-of-necessity format — page 3 of the application, or
     company letterhead.
  5. Current authorised company signatories — whether Pamela or the custodian
     personally signs the company form.
  6. The § 5-09 submission and approval process in practice.
  7. The chosen firearms school's enrolment policy on a pending exemption.
  8. The applicant's residence — Carry Guard vs Special Carry Guard.
  9. The applicant's exact legal first name (3F).

Each becomes a staff task with an owner. A case may not send live invitations
while items 2 or 9 are open.
```

---

## VERIFICATION — all three passes

```
1. PASS 1 GATE: template validator green; the M-522 carries the applicant's real
   date of birth and the signing date only in the signature Date field.
2. PASS 2 GATE: one fact set fills every form; no `prefill:` remains; an
   incomplete form shows no Sign control.
3. NO OVER-COLLECTION: a carry_guard case does not ask for safe photographs, a
   social-media list, a Social Security card, the 16+2 course, or four references.
   It asks for exactly two references.
4. DOS UPGRADE: modelled as its own post-issuance stage with DOS-1619-f, the
   47-hour certificate, guard-card return and fee — absent from the NYPD packet
   and not a CP-5 blocker. Annual in-service and firearms courses tracked as
   recurring.
5. § 5-09: PLE-01 is notarize:true / signable:false, its instructor fields are
   mapped, and the statement covers meeting the applicant, the danger assessment,
   the instructor's credentials and contact, and the exact training location.
6. NAVIGATION: an automated test opens the menu, activates every visible item in
   all three roles, and asserts destination and closure. Root cause documented.
7. UPLOAD STATUS: upload → status changes → survives refresh and re-login →
   the other party's permitted view updates. Multi-file requirements complete only
   when every part is present. Root cause documented.
8. COMPLETED STATE: approved is green with a check and a label; received is brass;
   green never appears from an optimistic update or a stale cache.
9. PRIVACY: the SSN is unreachable by the sponsor under every scope and consent,
   absent from exports and logs. Server-side document authorization is enforced —
   verified by requesting a document directly, not by checking the UI.
10. IDENTITY: the legal name is resolved from an identity document; name, DOB and
    address match across every document in a generated packet.
11. NOTHING SILENTLY BROKEN: existing concealed-carry and self-guided cases are
    byte-for-byte unchanged; instructor visibility is unchanged; migrations are
    backward compatible with a backfill and a documented rollback.
12. pnpm build && pnpm test green ON macOS. 390px on every surface touched.
```

## COMPLETION REPORT

```
Report, and do not declare done on the strength of the UI alone:
  · what was already correct and left alone
  · what was defective and how it was repaired, with the root cause for the
    navigation and upload-status defects stated explicitly
  · schema changes, migrations, backfills and rollback notes
  · tests added and their results
  · before/after renders of every generated form, in both roles
  · which operator blockers remain open
  · anything you believe needs counsel rather than code
Verify persisted database state, survival across refresh and re-login, cross-role
synchronisation, generated-document population, stale-document safeguards, and
server-side privacy enforcement.
```

## DO NOT

- Do not start Pass 3 before Passes 1 and 2 are green.
- Do not narrow the sponsor's scope to match the audit — that is the owner's call (R1).
- Do not create an upload slot for a Social Security card, ever (R2).
- Do not show green before staff acceptance (R3).
- Do not restore safe photographs without a citation.
- Do not guess the applicant's legal name.
- Do not present the DOS upgrade as part of the NYPD filing.
- Do not patch the navigation or upload bug without stating the root cause.
- Do not rebuild what already works — audit first, classify, then change.
