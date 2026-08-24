# Sponsored applicant portal — Claude Code build prompt

> Build a two-party case: an **applicant** and a **sponsoring company representative** working the same NYPD Carry Guard file from separate, unlisted portals. First live case is ISS Action sponsoring Chery Gimps. Build it as a real, track-gated feature — not hardcoded for two people — but ship it dark: no links, no nav entries, no index.
>
> **Guardrails that do not move.** The CP-5 gate still governs `application_assembled`+. The journey still ends at "ready for your review & filing", never "filed". `case_requirements.notes` stays instructor-safe. And the signature rule from NY Penal Law § 400.00(3) — *"An application shall be signed and verified by the applicant"* — means **the sponsor can never sign, attest, or submit anything on the applicant's behalf.** That is a hard constraint in code, not a UI convention.

---

## THE SHAPE OF IT

You already have this pattern. `engagements` binds a trainer to a case with a `scope_full_assist` boolean and a `client_consented_at` timestamp; `requirements.concierge_scope` is a SQL-authoritative `hidden | progress | full` enum that fails safe to `hidden`; `trainer_scope()` is the single resolver every view calls. **The sponsor portal is that same pattern aimed at a company instead of a trainer.** Copy the shape; do not invent a second access system.

What is new is that visibility now runs **both ways**:

```
                        │ Sponsor sees          │ Applicant sees
────────────────────────┼───────────────────────┼──────────────────────
Applicant's documents   │ full  (this build)    │ full
Applicant's disclosures │ full  (this build)    │ full
Sponsor's company packet│ full                  │ progress — row + status,
                        │                       │ cannot open the file
```

One resolver, two directions: `party_scope(requirement_id, viewer_party, sponsorship_scope) → hidden | progress | full`. Every read path calls it. Nothing else decides visibility.

---

## PHASE 1 — Schema

```sql
-- 1. The company, and the person who represents it.
alter type public.user_role add value if not exists 'sponsor';

create table public.sponsors (
  id uuid primary key default gen_random_uuid(),
  legal_name text not null,
  agency_license_number text,
  agency_license_expires date,
  custodian_name text,
  custodian_email text,
  custodian_phone text,
  custodian_license_number text,
  created_at timestamptz not null default now()
);

-- A rep is a profile with role='sponsor' bound to one company.
alter table public.profiles add column if not exists sponsor_id uuid references public.sponsors(id);

-- 2. The binding, modelled on `engagements`.
create type public.sponsorship_scope as enum ('packet_only','assist','full');

create table public.case_sponsorships (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  sponsor_id uuid not null references public.sponsors(id) on delete cascade,
  rep_profile_id uuid references public.profiles(id) on delete set null,
  invited_email citext not null,
  scope public.sponsorship_scope not null default 'packet_only',  -- fail safe
  status text not null default 'invited',                          -- invited|active|revoked
  applicant_consented_at timestamptz,
  applicant_consent_version text,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  unique (case_id, sponsor_id)
);
```

**`scope` defaults to `packet_only` in SQL on purpose.** Widening it is a deliberate write, exactly like `concierge_scope` defaulting to `hidden`. For this case you will set `full` — that is the decision the owner made, and it should be visible as a row someone chose, not a default nobody noticed.

```sql
-- 3. Requirement ownership + the reverse-direction scope.
create type public.req_party as enum ('applicant','sponsor');
alter table public.requirements
  add column if not exists party public.req_party not null default 'applicant',
  add column if not exists applicant_scope public.concierge_scope not null default 'full';
-- Sponsor-owned rows are 'progress' to the applicant: he sees the row and its
-- status, never the file. Set that when seeding the SPN-* codes below.

-- 4. Read audit. Writes are already logged; reads are not, and with scope='full'
--    a sponsor can open sealed arrest dispositions. That must leave a trace.
create table public.document_access_log (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references public.documents(id) on delete set null,
  case_id uuid not null references public.cases(id) on delete cascade,
  viewer_profile_id uuid references public.profiles(id) on delete set null,
  viewer_role public.user_role,
  req_code text,
  action text not null,               -- view_url_issued | download | upload
  created_at timestamptz not null default now()
);
create index on public.document_access_log (case_id, created_at desc);
```

```sql
-- 5. The one resolver. Same shape as trainer_scope, fail-safe to hidden.
create or replace function public.party_scope(
  p_requirement_id uuid,
  p_viewer public.req_party,
  p_scope public.sponsorship_scope
) returns public.concierge_scope
language sql stable security definer set search_path = public as $$
  select case
    -- The applicant looking at a sponsor-owned row: whatever applicant_scope says.
    when p_viewer = 'applicant' then coalesce(
      (select case when r.party = 'sponsor' then r.applicant_scope else 'full'::public.concierge_scope end
         from public.requirements r where r.id = p_requirement_id),
      'hidden'::public.concierge_scope)
    -- The sponsor looking at anything: their own packet always; the applicant's
    -- file only as wide as the sponsorship scope allows.
    else coalesce(
      (select case
         when r.party = 'sponsor' then 'full'::public.concierge_scope
         when p_scope = 'full'    then 'full'::public.concierge_scope
         when p_scope = 'assist'  then r.concierge_scope   -- reuse the trainer firewall
         else 'hidden'::public.concierge_scope
       end from public.requirements r where r.id = p_requirement_id),
      'hidden'::public.concierge_scope)
  end
$$;
revoke all on function public.party_scope(uuid, public.req_party, public.sponsorship_scope) from public, anon;
grant execute on function public.party_scope(uuid, public.req_party, public.sponsorship_scope) to authenticated;
```

Note what `assist` buys you: it reuses `requirements.concierge_scope` — the firewall already tuned so disclosures are invisible. **If the owner later wants to narrow this sponsorship, it is one UPDATE changing `full` to `assist`.** No code change. Build it that way deliberately.

### RLS

Mirror the instructor policies exactly. A sponsor rep may read a `case_requirements` / `documents` row only when **all** of these hold: an active `case_sponsorships` row links their `sponsor_id` to that `case_id`; `applicant_consented_at` is not null; `revoked_at` is null; and `party_scope(...)` returns `'full'` for a document read (`'progress'` permits the row's status but **must not** yield a storage path). Write RLS negative tests before the UI exists.

---

## PHASE 2 — Track resolution, then the requirements

### 2A. The system decides the track. Nobody types it in.

We do not know where this applicant lives, and we should never have to. The track
is **derived** from intake answers and recomputed whenever they change — the same
way `ELG-02` is already system-verified from the intake address rather than
asserted by a human.

```
cases.license_track enum:
  'concealed_carry'      (default — every existing case is unchanged)
  'carry_guard'
  'special_carry_guard'
  'sponsored_unresolved' (armed-guard case whose category is not yet determinable)

resolveArmedTrack({ residenceState, residenceCity, hasCountyPistolLicense,
                    principalEmploymentInNYC }) →
  { track, blockers[], mustConfirmWithLicenseDivision }
```

**The branch logic, from NY Penal Law § 400.00(3):** an application is filed with
the licensing officer where the applicant *"resides, is principally employed or has
his or her principal place of business."* Employment in NYC is a real jurisdictional
hook, which is what makes branches B and C possible at all.

```
BRANCH A — lives in one of the five boroughs
  track = 'carry_guard'
  No extra requirements beyond the Carry Guard set. This is the clean path.

BRANCH B — lives in New York State, outside the five boroughs
  track = 'special_carry_guard'
  ASK: do you currently hold an active pistol licence from your home county?
    YES → add SCG-01 (county licence, front and back, must be active).
          Otherwise identical to Branch A.
    NO  → BLOCKED, and say so plainly. Special Carry Guard is built on top of an
          existing county licence. He must first apply to his OWN county's
          licensing officer — a different authority, a different process, its own
          timeline, and not something we file with the NYPD.
          Set track='sponsored_unresolved', raise a blocker, and surface a card
          explaining the prerequisite and what we can and cannot do about it.
          Do NOT seed the NYPD requirement set and let him work a file that
          cannot be submitted.

BRANCH C — lives outside New York State
  track = 'sponsored_unresolved', mustConfirmWithLicenseDivision = true
  The § 400.00(3) principal-employment hook plausibly gives the NYPD jurisdiction
  because the ISS post is in NYC, but the correct CATEGORY for a non-resident
  armed guard is not something to infer from published pages. Surface a staff task
  to confirm with the License Division before any filing fee is paid, and show the
  applicant an honest "we're confirming your category" state rather than a
  checklist we are not sure about.
```

**Rules for the resolver:**

```
1. It is a pure function with unit tests, not logic sprinkled through components.
   Test all four outcomes plus the recompute-on-change case.
2. It runs on intake completion AND on any later edit to address or county-licence
   answers. If the answer changes, the track changes and the requirement set is
   re-seeded — satisfied requirements that survive the change keep their status
   and their documents. Never orphan an approved document because a track flipped.
3. 'sponsored_unresolved' is a first-class state, not an error. The portal works,
   the sponsor packet proceeds (ISS's documents are the same in every branch), and
   only the applicant's NYPD-specific requirements wait.
4. Never let a case reach the CP-5 gate on 'sponsored_unresolved'. Add it to the
   gate's blocker list with a clear reason.
5. Staff can override the resolved track from admin — with a required note and a
   logActivity entry. The License Division's answer beats our inference, and when
   staff override, the note records what they were told and by whom.
```

### 2B. The intake questions that feed it

```
Address already exists in intake — derive residenceState and residenceCity from it
and do NOT ask again. Add only what is genuinely new, and only for armed-guard cases:

  Q1 (conditional — only when the address is in NY State outside the five boroughs)
     "Do you currently hold a pistol licence issued by your home county?"
     Yes / No / I'm not sure
     "Not sure" behaves as No for gating but raises a staff task rather than
     showing him the hard blocker — plenty of people don't know what they hold.

  Q2 (all armed-guard cases)
     "Will your ISS Action assignment be located in New York City?"
     This establishes the principal-employment hook and matters most in Branch C.

  Q3 (all armed-guard cases)
     "Do you already hold any other pistol licence or permit, in any state?"
     Drives the PLE-01 pre-licence exemption branch — a person who already holds a
     licence does not need the 38 RCNY § 5-09 exemption to enrol in the 47-hour
     course, which is the difference between Workflow A and Workflow B.
```

### 2C. The requirement set

```
1. Requirement seeding keys off the resolved track.

2. SPONSOR-OWNED codes (party='sponsor', applicant_scope='progress'):
   SPN-01  Carry Guard company form — notarised where required
   SPN-02  Letter of necessity — armed duties, business need, anticipated start,
           work locations/assignment type, and at least 20 hours per week
   SPN-03  20-hour worksheet — must be consistent with SPN-02
   SPN-04  Watch, Guard or Patrol Agency licence — copy, number, expiry date
   SPN-05  Gun custodian record — name, contact, NYPD licence number
           (structured fields on `sponsors`, not a file upload)
   SPN-06  Sponsored position confirmation — job title, assignment site, hours/week
   SPN-07  Firearm details — conditional; company-issued or personal, make, model,
           calibre, serial, approved storage

3. APPLICANT-OWNED additions for this track:
   GRD-01  NYS security guard registration card, front and back
   GRD-02  8-hour pre-assignment certificate
   GRD-03  16-hour on-the-job training certificate
   GRD-04  Current annual 8-hour in-service proof
   PLE-01  Pre-licence exemption under 38 RCNY § 5-09 — conditional, only when the
           applicant does not already hold a pistol licence. Filed WITH the
           application; needs an authorised instructor's signed statement.
   FRM-01  47-hour firearms course certificate
   CSC-01  Child support certification form
   SCG-01  Home-county pistol licence, front and back — BRANCH B ONLY, and only
           when the applicant answered Yes to holding one

4. REMOVE for this track — these are Concealed/Special Carry requirements and do
   NOT belong on a Carry Guard file:
   • the 16-hour DCJS course + 2-hour live fire
   • the two ADDITIONAL character references (Carry Guard needs the base two only)
   • the three-year social media account list
   Get this right — it is the difference between a correct file and two
   unnecessary notarised letters plus a wasted course fee.

5. PLE-01 ties to your instructor partner: the exemption request needs a certified
   instructor's statement. Model it as a generated document the instructor signs,
   not something the applicant or sponsor produces.
```

---

## PHASE 3 — Consent, which gates everything

The sponsor sees **nothing** until the applicant has consented. Not a checkbox at the bottom of a terms page.

```
1. A dedicated consent screen for the applicant, in the concierge visual system,
   shown before the sponsorship activates. It must name in plain words exactly
   what the representative will be able to open — spell out arrest and summons
   statements, orders of protection, domestic incident records, mental-health
   adjudications, and Social Security number. Generic wording is not informed
   consent for this scope.
2. Name the human and the company: "Pamela Newman of ISS Action". Not "your
   sponsor".
3. Reuse the existing capture-once signature + per-document affirmation machinery.
   Store applicant_consented_at AND applicant_consent_version, so re-consent is
   required if the scope is ever widened.
4. A standing "Who can see my file" panel on the applicant's dashboard: who has
   access, what scope, when they consented, and a REVOKE control that sets
   revoked_at and immediately cuts access. Revocation must not require contacting
   staff.
5. Show the applicant a read trail — "Pamela viewed your driving abstract on
   Tuesday" — sourced from document_access_log. If an employer is reading an
   employee's sealed records, the employee gets to see that happening.
6. Staff can revoke from admin. Every consent, revocation and scope change is
   logged via logActivity with the acting party.
```

---

## PHASE 4 — Access, routing, and staying unlisted

```
1. ENTRY: /invite/[token] — a long random token on case_sponsorships (and on the
   client record for the applicant). The page is a sign-in / set-password screen
   carrying the case context. This is convenience, not security.
2. SECURITY IS AUTH + RLS, NOT THE URL. Say so in the code comments. An unlisted
   link is a product decision about discoverability; it protects nothing. Every
   query goes through RLS regardless of how the visitor arrived.
3. EMAIL PRE-BINDING: seed case_sponsorships.invited_email and the client email.
   Your signup claim-by-email flow already works (case-insensitive, no duplicates)
   — extend it: on first login, match email → bind rep_profile_id → route.
4. ROUTING after auth, by role and binding:
     role='client'  with a concierge case   → /portal/concierge   (unchanged)
     role='sponsor' with an active binding  → /sponsor/[caseId]
     sponsor with NO active binding         → a neutral "no active file" page.
       It must not confirm or deny that a case exists for any email.
5. UNLISTED, properly:
     • noindex, nofollow on every /sponsor route and /invite/[token]
     • excluded from sitemap.ts and robots
     • absent from every nav array — PORTAL_NAV, CONCIERGE_NAV, admin nav
     • no marketing page, no footer link, no reference anywhere on the public site
   Verify by building and grepping the output for the route.
```

---

## PHASE 5 — The sponsor surface

Same visual system as the concierge dashboard. Reuse `SectionEyebrow`, the card
styling, the control tower, the vault card treatment. It should feel like one product.

```
/sponsor/[caseId] top to bottom:

1. HEADER — "ISS Action" eyebrow, "Chery Gimps — NYPD Carry Guard" as the title,
   and the assigned concierge's name. Never let the rep forget whose file this is.

2. YOUR COMPANY PACKET — first, because it is the only work that is theirs alone.
   The seven SPN-* items as uploader cards, reusing DocumentUploader with the same
   received/approved states and the "How to get this" collapsible from the
   registry. SPN-05 is a structured form, not an upload.

3. THE APPLICANT'S FILE — every requirement row, rendered through party_scope.
   At scope='full' the rep can open and upload. Sensitive rows carry a visible
   marker — a small lock-and-eye chip reading "Sensitive · your access is logged"
   — so the rep knows the read is recorded before they click. This is not
   decoration; it is what makes the access defensible.

4. CONTROL TOWER — the same real-signal milestones the applicant sees.

5. MESSAGES — to your concierge team, not to the applicant. Do not build a
   direct sponsor↔applicant channel; those conversations belong off-platform or
   through you.

HARD LIMITS on the sponsor surface — enforce in the server actions, not the UI:
  • No signature control of any kind. isSignable must reject any sponsor-initiated
    signature attempt, and there must be a test proving it.
  • No authoring of the applicant's disclosure ANSWERS. The rep may upload a
    document; sworn answers are the applicant's words. Read-only on those forms.
  • No final submit. No "mark ready to file".
  • No access to another ISS employee's case — scope is one case_id at a time.
```

## PHASE 6 — The applicant's side

Nearly unchanged, which is the point.

```
1. The SPN-* rows appear in his checklist at applicant_scope='progress': title,
   plain-English status, who owes it, and WHY it is outstanding — "waiting on ISS
   Action" — with no view or download control and no storage path in the payload.
2. A short explainer card: "ISS Action is sponsoring your licence. Pamela Newman
   is handling their paperwork. Here is what they've sent and what's still open."
3. The "Who can see my file" panel and read trail from Phase 3.
4. Everything else — the vault, disclosures, review & file — is untouched.
```

---

## PHASE 7 — Seed the live case

```
Sponsor:    ISS Action, Inc. — 158-12 Rockaway Blvd, Suite 200, Queens, NY 11434
Rep:        Pamela Newman <pnewman@issaction.com>   role='sponsor'
Applicant:  Chery Gimps <gimpschery@gmail.com>      role='client'
Case:       license_track = 'sponsored_unresolved'
Scope:      case_sponsorships.scope = 'full', status='invited' until he consents

DO NOT seed a track. We do not know where Chery lives, and guessing produces a
checklist that is confidently wrong. Seed him unresolved, let intake ask, and let
resolveArmedTrack() decide. Pamela's packet is identical in every branch, so ISS
can start immediately while his category settles — which is exactly the behaviour
the unresolved state exists to give us.

Leave agency_license_number, expiry and all custodian fields NULL. They get
populated from what Pamela supplies through SPN-04 and SPN-05 — never from a
public directory, and never guessed. A wrong custodian number on a notarised
company form is a rejected filing.

Send both invite links yourself. Do not let the system email them until you have
walked each person through what they are about to see.
```

---

## VERIFY

```
1. RLS NEGATIVE TESTS FIRST, before any UI:
   • sponsor with no binding reads nothing on that case
   • sponsor with a binding but applicant_consented_at NULL reads nothing
   • revoked sponsorship reads nothing, immediately
   • sponsor bound to case A reads nothing of case B
   • at scope='assist', disclosures return no storage path
   • an unauthenticated request to /sponsor/[caseId] returns nothing
2. REVERSE DIRECTION: the applicant's payload for an SPN-* row contains title and
   status and NO storage path, NO signed URL, NO filename. Check the actual JSON,
   not the rendered page.
3. SIGNATURE LAW: a sponsor-initiated sign attempt fails server-side with a test
   proving it. REF/COH/SAF exclusions still hold for everyone.
4. TRACK CORRECTNESS: a carry_guard case seeds the SPN-*, GRD-*, FRM-01, CSC-01
   rows, requires exactly TWO character references, and does NOT require the
   16-hour course or the social media list. A concealed_carry case is byte-for-byte
   unchanged from today.
5. TRACK RESOLUTION — unit-test resolveArmedTrack() on all four outcomes:
   • Brooklyn address                        → carry_guard, no blockers
   • Westchester + holds county licence      → special_carry_guard, SCG-01 seeded
   • Westchester + no county licence         → sponsored_unresolved, blocker names
                                               the county prerequisite
   • New Jersey address, NYC assignment      → sponsored_unresolved,
                                               mustConfirmWithLicenseDivision
   Then test the RECOMPUTE path: flip the county-licence answer and confirm the
   requirement set re-seeds while already-approved documents keep their status and
   stay attached. An approved driving abstract must survive a track change.
6. UNRESOLVED IS NOT A DEAD END: on a sponsored_unresolved case the sponsor portal
   works fully and Pamela's packet can be completed, while the applicant sees an
   honest "we're confirming your category" state. The CP-5 gate refuses to advance
   such a case and names the reason.
7. EXISTING PRODUCT UNTOUCHED: every current concierge and self-guided case
   behaves identically. Instructor visibility is unchanged — party_scope must not
   have altered trainer_scope's answers anywhere.
8. AUDIT: opening a sensitive document writes a document_access_log row, and that
   row surfaces on the applicant's read trail.
9. UNLISTED: build, then grep the output and sitemap for /sponsor and /invite —
   no nav entry, no sitemap row, noindex present on every route.
10. CONSENT COPY: the consent screen names the actual categories. Read it aloud and
   ask whether Chery would feel informed or ambushed.
11. pnpm build && pnpm test green; 390px on both new surfaces.
```

## DO NOT

- Do not let an unlisted URL stand in for authorisation.
- Do not give the sponsor any signing, attesting, or submitting capability.
- Do not let the sponsor author the applicant's sworn answers.
- Do not send a storage path or signed URL for a `progress`-scoped row.
- Do not activate a sponsorship before the applicant has consented.
- Do not build a direct sponsor↔applicant message channel.
- Do not hardcode Chery or Pamela anywhere in application logic — they are seed data.
