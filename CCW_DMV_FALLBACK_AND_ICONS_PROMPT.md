# Gun License NYC — DMV records fallback + checklist icon fix
### Claude Code prompt

Two changes in the applicant checklist. Read `AGENTS.md` first and honor its guardrails (Next.js 16 — `proxy.ts`, async `params`; privacy firewall; **no legal advice**; candor-maximizing; keep `config/brand.ts` disclaimer/voice; never imply we file on the applicant's behalf). Both changes are UI/logic only — no schema change required. `pnpm build`, `pnpm lint`, `pnpm test` must pass at the end.

---

## Task 1 — Give each checklist requirement its own icon

**The bug:** in `components/portal/requirements-checklist.tsx`, the tile icon is chosen by **category** (`const Icon = CATEGORY_ICON[category.key]`, ~line 248) and reused for every card in that category. So all of "Identity & residence" (IDN-01/02/03/04, RES-01, NAM-01) render the **same Fingerprint**, all of "Your record & history" render the same Scale, etc. That's why the user sees three different sections with identical icons.

**The fix:** choose the icon **per requirement (by `req_code`)**, falling back to the category icon, then `FileText`.

1. Add a `REQ_ICON: Record<string, LucideIcon>` map in `requirements-checklist.tsx` (keyed by `req_code`). Suggested mapping (confirm each name exists in the installed `lucide-react` version — AGENTS.md rule — and substitute a close equivalent if not):

   - `IDN-01` → `IdCard`, `IDN-02` → `BadgeCheck`, `IDN-03` (citizen/LPR) → `Globe`, `IDN-04` (photo) → `Camera`
   - `RES-01` (proof of NYC residence) → `House`, `NAM-01` (name change) → `PenLine`
   - `COH-01` (household affidavit) → `Users`, `REF-01`/`REF-02` (references) → `UserCheck`
   - `TRN-01` (training cert) → `GraduationCap`, `RNW-01` (renewal) → `RefreshCw`
   - `DSC-01`/`QUE-01` (disclosure Qs) → `ClipboardList`, `ARR-01` (arrests) → `Gavel`,
     `OOP-01` (order of protection) → `ShieldAlert`, `DIR-01` (domestic incident) → `FileWarning`
   - `DMV-01` (driving abstract) → `Car`, `GMC-01` (good conduct) → `BadgeCheck`, `SOC-01` (social media) → `AtSign`
   - `SAF-01` (safe storage) → `Lock`, `FEE-01` (fees) → `Receipt`, `AFF-01` (affirmation) → `FileSignature`, `FMT-01` (packet/format) → `PackageCheck`
   - `MIL-01` (veteran) → `Medal`, `LEO-01/02/03` (retired LEO) → `ShieldCheck`, `OOS-01/02` (out-of-state/special carry) → `Plane`, `PRM-01` (premises/business) → `Building2`, `SPC-01` → `Star`
   - `ELG-01/02/03` → `ShieldCheck`

2. Move icon selection **into the per-item loop**. Replace the category-level `const Icon = …` with, inside `catItems.map((item) => { … })`:
   ```ts
   const Icon = REQ_ICON[item.reqCode] ?? CATEGORY_ICON[categoryKeyFor(item.reqCode)] ?? FileText
   ```
   Keep the existing `ICON_TONE`, the priority dot, and the `.icon-tile` wrapper exactly as they are — only the glyph changes. Add the new icons to the `lucide-react` import; keep `Fingerprint`/`Scale`/etc. only if still referenced by `CATEGORY_ICON` (leave `CATEGORY_ICON` as the fallback).

3. Sanity pass: every distinct `req_code` that can appear in the customer checklist has a distinct, sensible glyph; no two adjacent cards in the same section share an icon unless they're genuinely the same kind of thing. Keep it tasteful and monochrome — this design system uses quiet, single-tone line icons (no multicolor, no emoji).

---

## Task 2 — DMV-01: a working fallback when the NY.gov ID / MyDMV site errors

**Context.** `DMV-01` (lifetime driving abstract) is an `obtain`-mode requirement in `lib/requirements/actions.ts` — its "How to get this" panel (in `components/portal/requirement-action.tsx`, the `action.mode === "obtain"` block, ~line 194) lists steps and links out to `https://dmv.ny.gov/records/get-my-own-driving-record-abstract`. Applicants report that logging into MyDMV and clicking through returns **"There was an error processing your request"** at `apps-ext.dmv.ny.gov/OIDC/_error.html` — a NY.gov ID / OIDC failure that has blocked them on multiple days.

**Important reality (build around it — don't fake it):** the NY DMV does **not** take driving-record requests by email. Records come only via the online MyDMV portal ($7), in person (MV-15C, $10), mail-in (MV-15C), or a FOIL request (online GovQA form / phone / mail). There is **no DMV inbox** that emails someone their abstract. So a mailto "to the DMV" would go nowhere. We build the fallback so it actually does something: it drafts a fully-identified request to a **configurable recipient** (defaulting to our own concierge inbox, so our team can help the applicant obtain it — on-brand), and we surface the **real official offline paths** (mail-in + phone) right in the panel.

**What to build** — add a "Trouble with the DMV site?" section to the DMV-01 `obtain` panel (only for `reqCode === "DMV-01"`; don't change other obtain requirements):

**2a. "Email my request" button (the mailto the user asked for).**
- On click, open a pre-filled `mailto:` draft (build the `mailto:` href with properly URL-encoded `subject` and `body`; use a real `<a href>` or `window.location.assign`, not a form).
- **Recipients:** `To: Fixit@its.ny.gov` (the NY State ITS enterprise help desk — the right place to report a NY.gov ID / MyDMV OIDC login failure), `Cc: gunlicensenyc@gmail.com` (our concierge inbox, so our team always has a copy and can follow up). Build both into the `mailto:` (`mailto:Fixit@its.ny.gov?cc=gunlicensenyc@gmail.com&subject=…&body=…`). Make both overridable via env — `NEXT_PUBLIC_DMV_REQUEST_TO` (default `Fixit@its.ny.gov`) and `NEXT_PUBLIC_DMV_REQUEST_CC` (default `brand.contact.email`) — and add both to `.env.example` with a one-line comment. Add a code comment noting WHY the `To` is NY ITS and not the DMV (the DMV has no records-request email; this reports the blocking login error and requests the abstract, with our team copied).
- **Subject:** `NY driving abstract request — {applicant full name}`.
- **Body:** a short, polite request that (i) states the online MyDMV / NY.gov ID portal returns "There was an error processing your request" (`apps-ext.dmv.ny.gov/OIDC`) so they can't self-serve, (ii) requests their **lifetime** NY driving abstract (and notes additional states if they've lived elsewhere in the past 5 years), and (iii) includes an **"Identifying information"** block so the request can be verified:
  - Full legal name, Date of birth, Residential address, Phone, Email — sourced from the applicant's intake/client record (reuse the SAME data the questionnaire prefill already uses: client full name + `intake` legal address + `dob`; see `lib/requirements/questionnaires.ts` `PrefillContext` and how the checklist builds prefills).
  - **Driver License / Client ID number** — intake does NOT capture this today. Add a small inline text input in this section (component state, remembered while on the page) and interpolate it into the draft; if blank, include a `[Your NY driver license / client ID number]` placeholder so the user fills it before sending.
  - **PRIVACY: do NOT include SSN** (not even last 4) in the draft. Name + DOB + address + DL/Client ID is the identifier set — nothing more. This respects the app's privacy posture (`lib/retention.ts` / privacy firewall).
- Thread the applicant identity fields into `RequirementAction` (or just the DMV-01 branch) from the checklist, which already has `clientId` and the prefill data — add a small typed prop (e.g. `dmvApplicant?: { fullName; dob; address; email; phone }`) rather than refetching.

**2b. Show the real offline paths (so the user is never stuck).** In the DMV-01 `steps` (in `lib/requirements/actions.ts`) or as static copy in this section, add the guaranteed non-online options:
- **By mail / in person:** complete form **MV-15C** and submit with the **$10** fee (mail to the NYS DMV records address — confirm the exact current address from the MV-15C form; the FOIL/records office is *6 Empire State Plaza, Albany, NY 12228*). Link the MV-15C form and `https://dmv.ny.gov/records/get-my-own-driving-record-abstract`.
- Keep the existing online step/link (it works for many; the fallback is additive).

**2c. Honest microcopy.** One line so the button isn't misleading, e.g.: *"This reports the DMV login error to NY State IT support and copies our team, so we can help you get your abstract. You can also use the official mail-in option below."* Match `config/brand.ts` voice; no *guarantee/expedite/fast-track* language.

**Optional (nice-to-have, mark clearly and skip if it balloons scope):** instead of/in addition to the mailto, generate a **pre-filled MV-15C request PDF** through the existing document engine (`lib/requirements/document-engine.ts` / `lib/pdf/builder.ts`) using the same identity fields, so the applicant just prints, signs, and mails it — the true concierge move. Only do this if it fits the existing generate/companion pattern cleanly; otherwise leave a `// TODO` note and ship 2a–2c.

---

## Task 3 — Verify

- Checklist: every requirement card shows a distinct, on-point icon; the three Identity & residence items (citizenship, photo, residence) no longer share the Fingerprint; no console errors from a missing `lucide-react` export.
- DMV-01: the "Email my request" button opens a mail draft with subject + body correctly URL-encoded, the identity block populated from intake, the DL/Client ID field working, **no SSN present**, and the draft addressed `To: Fixit@its.ny.gov` with `Cc: gunlicensenyc@gmail.com` (both env-overridable). The mail-in / MV-15C option and $10 fee are shown; the original online link still works.
- Only DMV-01 gained the fallback UI; other `obtain` requirements (RES-01, TRN-01, etc.) are unchanged.
- `pnpm build && pnpm lint && pnpm test` pass; no new required fields, no migration.

Give me a short summary: files changed, the final `req_code → icon` map, and confirmation of the DMV email recipient default + that SSN is never included.
