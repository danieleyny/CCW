# Handoff — portal fixes & document engine (continue from Phase 3)

**Read this, then read `PORTAL_FIXES_PROMPT.md`. Phases 1–2 are DONE and shipped; start at Phase 3.**

Everything below is verified against the code as of commit `4b32cec` on `main`
(also pushed to `ccw-v2-build`). All migrations through `20260718000800` are
applied to **local AND production**.

---

## 1. What just shipped (this session)

| Commit | What |
|---|---|
| `3ec29e3` | Opaque nav chrome (`.glass-bar`) — portal header, mobile tab bar, admin topbar |
| `1a432d6` | `html:has(.dark)` paints the document obsidian (kills overscroll paper flash) |
| `7ffdf37` | **P0.5 fixes**: REF-01 now satisfies on *notarized* (was `received`); staff rejection prose no longer leaks to instructors via `case_requirements.notes` |
| `2370aeb` | **Doc engine P1**: `lib/requirements/actions.ts` — the requirement→action taxonomy (all 34 active req_codes) |
| `ca61ef6` | **Doc engine P2–P5**: questionnaires, generation+persistence, notarization state machine, unified checklist UI, instructor firewall test |
| `0656561` | Signing audit trail (`signature_events`) + evidence-backed satisfaction (DB trigger) |
| `4b32cec` | **PORTAL_FIXES Phase 1 + 2** (see below) |

### PORTAL_FIXES Phase 1 (done)
The `type: doc.documentType ?? "id"` bug was real and was introduced in `ca61ef6`.
- Migration `20260718000700` adds real types; `20260718000800` adds `business_documentation`.
- `RenderedDocument.documentType` is now **required**; the `?? "id"` fallback is deleted.
- `scripts/repair-generated-doc-types.ts` — run it again any time:
  ```bash
  pnpm exec tsx scripts/repair-generated-doc-types.ts                       # local
  ENV_FILE=/private/tmp/ccw-prod-env pnpm exec tsx scripts/...              # prod
  DRY=1 ...                                                                 # report only
  ```
  **Result: 0 rows local, 1 row repaired in production.**
- Regression test in `tests/requirement-actions.test.ts`: no generated document may file as `'id'`.
- ⚠️ **NOT done from Phase 1**: item 4 — the portal/admin document views still key on
  "latest per type" (`app/portal/documents/page.tsx` ~line 50, `app/admin/cases/[id]/page.tsx`).
  They should key on `req_code`/`generated`. **Do this in Phase 8.**

### PORTAL_FIXES Phase 2 (done)
- DMV-01 → `driving_abstract`, PRM-01 → `business_documentation` (both were missing it), both `multiple: true`.
- `RequirementAction` is now a **discriminated union** — `obtain` requires `documentType`, `steps`, `sourceUrl`.
- Note: the existing uploader already *appends versions* per type (`recordDocument` computes `version = count+1`), so repeat uploads work for multi-file. Verify the UI actually lets the user add a second file.

---

## 2. START HERE — Phase 3 (signing). This is the most important remaining item.

**Current state:** generated documents are produced with **no signature and no signing date**.
`generateRequirementDocument` (`app/portal/requirements/actions.ts`) *does* fetch
`getSignaturePng(...)` and passes it to the renderer, and *does* write a
`signature_events` row when a signature exists — but **nothing in the UI ever asks
the applicant to sign**, so in practice `signaturePng` is always undefined for new
users. The date rendered is `new Date()` at render time, not a signing date.

The plumbing you need already exists:
- `components/sign/signature-pad.tsx` — typed + drawn capture, outputs base64 PNG
- `signatures` table + `lib/signatures.ts` (`getSignaturePng`)
- `signature_events` table (append-only: `document_sha256`, `consent_text`, `signed_at`, `ip`, `user_agent`) + `recordSignatureEvent()` in `lib/requirements/document-engine.ts`
- `SIGNING_CONSENT` constant, same file
- `lib/pdf/builder.ts` `Ctx.signatureImage(label)` — extend to also stamp "Signed: {date}"
- The OLD flow did this correctly — copy its posture: `app/portal/forms/actions.ts` `fileSignedForm` refuses without a signature

**What to build:** a SIGN step after the questionnaire in the same modal; record
`signed_at`; stamp signature + signing date into the PDF; **do not satisfy a
signable requirement until signed** (unsigned = downloadable but labelled
"DRAFT — unsigned"); regenerating after an answer edit must invalidate the
signature.

---

## 3. Remaining phases (from `PORTAL_FIXES_PROMPT.md`)

- **Phase 3** — signing (above). Do first.
- **Phase 4** — FMT-01 off the customer checklist + server-side file validation. Note `components/portal/document-uploader.tsx` validates client-side only today; `app/portal/actions.ts` `recordDocument` is where server-side enforcement belongs.
- **Phase 5** — plain-language titles + our own SVG example graphics (do NOT scrape web photos).
- **Phase 6** — questionnaire: `<Sheet side="right">` → centered `<Dialog>`. File: `components/portal/questionnaire-sheet.tsx` (rename it).
- **Phase 7** — checklist filters (All / To do / Completed / Needs notarization) in `components/portal/requirements-checklist.tsx`.
- **Phase 8** — rebuild `/portal/documents` as the full library (still-needed + completed), driven off `lib/requirements/actions.ts`. **Include Phase 1 item 4 here.**
- **Phase 9** — automatic stage advancement (`lib/cases/advance.ts` `maybeAdvanceStage`). Confirmed: `setCaseStage` exists only in `app/admin/actions.ts`; nothing advances automatically. Must NEVER auto-advance into `application_assembled`/`filed` (CP-5 gate + named staff sign-off).
- **Phase 10** — portal home "Your next step" card at the top (`app/portal/page.tsx`). `getTrainingState()` in `lib/portal.ts` is a good model.
- **Phase 11** — adversarial verify.

---

## 4. Architecture you need to know

**The requirement→action map is the spine.** `lib/requirements/actions.ts` maps all
34 active `req_code`s to `generate` / `obtain` / `attest` plus `documentType`,
`notarize`, `sensitive`. The checklist UI, questionnaire engine, and generators
all read it. `tests/requirement-actions.test.ts` fails if a registry requirement
has no action — keep it that way.

**Requirements registry is versioned.** Rows are dated; a rule change is a data
edit (close `effective_to`, insert a new dated row). Active = `effective_to is null`.
Only **SOC-01** (enjoined, Antonyuk) and **SPC-01** are non-blocking.

**Satisfaction paths** (there are five — know them before touching status):
1. staff document review (`app/admin/actions.ts` ~line 266)
2. bulk approve-with-evidence (~477)
3. manual staff override (~456) — now requires evidence or a recorded `OVERRIDE:` reason
4. REF-01/REF-02 recompute (`lib/references/process.ts`) — notarized count
5. COH-01 recompute (`lib/cohabitants/process.ts`) — notarized ≥ total
Plus the engine's own generate path. A **DB trigger** (`forbid_satisfied_without_evidence`)
now blocks satisfying a document-backed requirement with nothing bound.

**PRIVACY FIREWALL — the highest-risk area.** `case_visible()` is false for
instructors; only `cases_select_instructor` and `case_requirements_select_instructor`
use `instructor_engaged()`. An engaged instructor CAN see: the `cases` row, their
`case_requirements` rows (including **`notes`** — keep it aggregate, never prose),
the public registry, their own engagements/bookings/messages. They CANNOT see:
`clients` (name/email/phone), `documents` (table *or* storage bytes),
`disclosures`, `intake_sessions`, `case_notes`, `requirement_answers`,
`signature_events`. Two tests lock this: the engagement-chat isolation test and
the document-engine test in `tests/rls/matrix.test.ts`.

---

## 5. Verification playbook (this is how you actually prove things)

**RPCs are `auth.uid()`-scoped — service-role CANNOT exercise them.** Use real JWTs:
```ts
const r = await fetch(`${URL}/auth/v1/token?grant_type=password`, {
  method:"POST", headers:{apikey:ANON,"Content-Type":"application/json"},
  body: JSON.stringify({ email:"client1@carrypath.test", password:"Passw0rd!" })})
const c = createClient(URL, ANON, { global:{ headers:{ Authorization:`Bearer ${(await r.json()).access_token}` } } })
```
Local seed logins are all `Passw0rd!`: admin@ / staff@ / client1@ / client2@ / instructor@carrypath.test.

**Browsing the app as a logged-in user** (the preview browser doesn't persist the
server-action session cookie): mint a session with `@supabase/ssr`'s
`createBrowserClient` capturing `setAll`, then inject the resulting
`sb-127-auth-token=...` via `document.cookie` and navigate. Cookie name for local
is `sb-127-auth-token`.

**Prod env:** `vercel env pull /private/tmp/ccw-prod-env --environment=production --yes`.
Prod Supabase ref `nabohrqydjzborehqslc`. **Always check `supabase migration list --linked`
for drift before `supabase db push`.**

Gate before every ship: `pnpm exec tsc --noEmit && pnpm lint && pnpm test && pnpm build`.
Current baseline: **56 tests, 8 files, green.** One pre-existing lint warning
(`app/portal/page.tsx:39` unused `here`) — not yours.

---

## 6. Gotchas that cost time (don't rediscover these)

- **Radix portals mount outside `.dark`.** Any Dialog/Sheet in the app needs
  `className="dark ..."` or it renders in the light marketing palette. Bit us once already.
- **View columns are nullable in generated types.** `applicant_interest_feed` etc. — expect `string | null`.
- **`ALTER TYPE ... ADD VALUE`** works in these migrations, but you can't *use* the
  new value in the same transaction. Add the enum in one migration, use it after.
- **Never edit a shipped migration.** 14-digit prefix, new file, `pnpm db:types` after.
- **`case_requirements.notes` is instructor-readable.** Never write reviewer prose there.
- **`?? "id"` was the whole Phase 1 bug** — never default an enum to make a NOT NULL
  column happy. Fail loudly instead.
- The preview browser is janky on scroll+screenshot; prefer `javascript_tool` DOM
  assertions, and re-`screenshot` before `computer{action:"scroll"}`.

---

## 7. Known-open / honest list

- Phase 1 item 4 (documents views keyed on type, not `req_code`) — fold into Phase 8.
- Phases 3–11 untouched apart from the above.
- **Doc-engine leftovers from `DOCUMENT_ENGINE_PROMPT.md`**: the `references` and
  `cohabitant-affidavit` questionnaires collect answers but are **not yet wired into
  the existing token-outreach flows** (`lib/references/process.ts`,
  `lib/cohabitants/process.ts`) — they're the notarized ones, so this matters.
  The application worksheet has a generator but no questionnaire. `court-request-letters`
  has no schema of its own.
- `lib/pdf/acroform.ts` is **deliberately dormant** — no official fillable template
  is bundled. If you add one to `/public/forms`, wire it there; until then every
  document is a labelled "prepared" document, never passed off as an NYPD form.
- The full `scripts/verify-*.ts` harness suite has not been re-run this session.
