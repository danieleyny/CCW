# QA findings — sponsored Carry Guard walk (production, 14 Sep 2026)

Walked as the seeded applicant (`se2018+applicant-qa1@`, case `carry_guard`, sponsored by
`Test Guard Co.-qa1`) against **production**. Sponsor side and safeguard upload loop not yet
walked. Console is clean throughout — the only errors are the tester's MetaMask extension.

---

## ✅ Verified working — the Carry Guard alignment work landed

| What | Evidence |
|---|---|
| Firearm licensed flag + conditional licence number (task 3) | Glock 19 / `AB12345` → licensed **Yes** renders `NYC-778211`; Remington → **No** correctly hides the field |
| Employment history structured address (task 4) | `Acme Security LLC / 100 Market St / Bronx / NY / 10451` round-trips |
| Residence country, non-US only (task 5) | `88 King St W / Toronto / Canada` with the "outside the United States" toggle |
| NYS ID + alien-registration surfacing (task 6) | "NYS driver licence / non-driver ID number" present in Contact |
| History continuity guidance (task 9) | *"There's a gap between Jun 2022 and Jun 2023 — add where you worked in between…"* |
| **LON count derived from the track** | Concierge data-ask reads **"Your written statements — 0 of 5 captured"**. This was the specific regression we set out to fix; it is fixed. |
| Custodian fields exist applicant-side | "The Company" group shows Gun custodian = Dana Ruiz, Custodian licence # blank |
| Carry-Guard requirement set | GRD-01…04 guard credentials, FRM-01 47-hour firearms course, PLE-01 §5-09 pre-licence exemption, SGI-01 safeguard ID, SPN-01…07 sponsor items, FEE-01 with $340 + $88.25 |

---

## 🔴 Blockers

### B1 — A sponsored applicant is shown a $1,000 paywall
`/portal` renders *"You chose Full Concierge — **finish your payment to unlock it**"* with
**Finish enrolling → `/portal/choose-path`**, which quotes **$1,000 / $500 to start** and
*"You picked this — finish payment to begin."*

Meanwhile `/portal/concierge` — at the same moment, same session — renders
*"[FULL CONCIERGE] Welcome, Marcus. You're on the done-for-you path."*

Two surfaces, opposite states. And per `scripts/seed-sponsor-test.ts`'s own comment, a sponsored
case is *"a concierge experience unlocked by the sponsorship itself, not a Stripe purchase."*

**Impact:** Chery opens his portal and is asked for $1,000 he does not owe.
**Fix:** the home card must read `service_mode` + an active sponsorship, not payment state.

### B2 — Applicant and safeguard person are told opposite things about the same document
- `/portal/forms` tags **Safeguard-Person Designation** `NOTARIZE`: *"The person you named signs it in front of a notary — don't sign it yourself."*
- `/g/<token>` says, twice: *"Sign in front of a witness — **not a notary**"* and *"No notary is required for this form."*
- `SFG-01` in the concierge vault agrees with the safeguard page: *"signs this before a witness"*.

Two of three surfaces say witness; `/portal/forms` is the outlier and is almost certainly the
stale one. **Impact:** the applicant sends their sibling to find a notary; the sibling lands on a
page telling them not to. Confidence in the service drops at the exact moment we're asking a
stranger for a favour.

---

## 🟠 High

### H1 — A Carry Guard case is described as "concealed carry"
`/portal` subtitle: *"Tracking your NYC **concealed carry** application, end to end."* The case
track is `carry_guard`. The licence type is the single most important fact on the file.

### H2 — Disclosure copy uses the dead paper-form numbering
The concierge disclosure section says the portal *"asks about your history (**questions 10–28**)"*
and *"asks **seventeen** questions"*. The live NYPD portal asks **16** questions numbered **1–16**,
which is what `lib/disclosures/portal-questions.ts` already implements. This is PD 643-041
Section-B numbering leaking into applicant-facing copy.

### H3 — `/portal/checklist` silently redirects
The home page offers *"Intake complete — view your personalized checklist"*; the link bounces to
the engagement gate with no explanation. Either gate it visibly or don't advertise it.

### H4 — Citizenship renders a raw legacy token
"Are you a U.S. citizen?" displays **`citizen`**, which is not one of the select's options
("U.S. citizen" / "Lawful permanent resident (green card)" / "Neither"). The fill layer maps the
legacy token; the details UI does not. Affects any migrated case.

### H5 — Sponsored case leaves "Currently employed?" unset, collapsing the employer block
Every `employer.*` fact is `showWhen employer.employed = Yes`, and nothing backfills it. On a
sponsored case the employer IS the sponsoring company and the facts already resolve sponsor-first
— but none of them render. For a sponsored guard the sponsorship is the proof of employment;
default it to Yes.

---

## 🟡 Medium

### M1 — Missing spaces from unspaced JSX expressions (three found, likely more)
- `/g/<token>`: **"Marcus Powelldesignated you to safeguard…"** — first line a third party reads
- `/portal/forms`: **"handled on the Peoplepage"**
- concierge vault: **"covers your photo ID, date of birth, and citizenship— upload it once"**

Worth a codebase-wide grep for `}` immediately followed by a word character in JSX rather than
fixing only these three.

### M2 — Safeguard page upload buttons contradict the page
Both upload controls read **"Choose the notarized file"** on a page that twice says no notary is
required — and step 3 is a photo of a driver's licence, not a form. Shared-component default
label leaking. Suggest "Choose a photo of your ID" / "Choose the signed form".

### M3 — Two different denominators for "your details"
`/portal/details` says **"24 of 33 details captured"**; the concierge data-ask says
**"Your details — 15 of 16 captured"**. Both are on screen within one click of each other.

### M4 — One-off 404 on the safeguard document, with alarming copy
First-ever request to `/g/<token>/document` returned **404**; the next seven returned a clean
109 KB PDF. Not reproducible, but it happened minutes after the invite row was written, on a cold
serverless route — exactly the real-world shape (invite created → email sent → clicked seconds
later). The user-facing string is *"This link is invalid or has expired"*, which nobody retries.
Suggest a retry-on-miss and softer copy.

---

## ⚪ Investigated and cleared — do NOT chase these

- **Supabase `/auth/v1/verify` Gateway Timeout.** Seen twice, then a fresh link worked. Transient;
  auth is fine and `/auth/callback` correctly handles the `token_hash` recovery flow.
- **"The concierge page is inert / hydration is broken."** Wrong. Clicks were landing on stale
  coordinates because the page scrolls between screenshot and click. Element-targeted clicks work
  every time. The page is fine.

**One thing still worth a five-minute check:** in Supabase → Authentication → URL Configuration,
confirm the email templates point at `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=…`
and not the default `{{ .ConfirmationURL }}`. `action_link` returns the session in a URL **fragment**,
and nothing in this app reads fragments — a valid session is silently discarded and the user lands
on the sign-in form with no error. The callback route is correct; this is only about whether the
emails route through it.

---

# Sponsor side — walked 14 Sep 2026

Signed in as `se2018+sponsor-qa1@` (Test Rep, `Test Guard Co.-qa1`).

## 🔴 B3 — The applicant cannot grant sponsor consent. This kills the whole sponsored flow.

`/portal` shows the consent card — *"Test Rep of Test Guard Co.-qa1 wants to help with your file
… **Review & decide**"* — linking to `/portal/sponsor`. **Clicking it lands back on `/portal`.**
Direct navigation to `/portal/sponsor` does the same. There is no error, no message, nothing.

### Why this is the worst bug in the file
It is the first link in a chain that has no other route through it:

1. Chery can't consent →
2. Pamela's sponsor portal stays empty forever (*"You don't have any active files right now. A file
   appears here once the applicant has consented to your access."*) — `/sponsor/company` likewise
   returns *"This file isn't available to you"* →
3. Pamela can never enter the **gun custodian licence number** →
4. The Carry Guard **step-3 block never clears** →
5. The application cannot be filed.

Every other fix in this file is cosmetic next to this one.

### Where to look
`app/portal/sponsor/page.tsx` has exactly two redirect branches — `!myCase` and
`rows.length === 0`. The second is the suspect, because **`components/portal/sponsor/sponsor-banner.tsx`
runs the same RLS-scoped query against the same table on the same page load and DOES find the row**
(it renders the company and rep name correctly). The differences worth bisecting:

- the page also selects `id, scope` and embeds `sponsor:sponsors(legal_name)`
- the page adds `.order("created_at", { ascending: true })`
- the page then reads `document_access_log` (after the redirect, so not the cause)

A failed embedded join or an ordering error makes PostgREST return `data: null`, which this code
treats as "no sponsorship" and silently redirects. **Whatever the cause, the redirect should not be
silent** — a route that bounces with no explanation is how this stayed invisible.

Note RLS itself looks correct: `case_sponsorships_select` uses `case_visible(case_id)`, and
`sponsors_select` explicitly allows the case owner through the sponsorship.

## 🟠 S1 — The sponsor portal has no navigation, and growth runs through a mailto:
The entire sponsor UI is a logo, "Switch account", "Sign out", and **"Add another applicant"** —
which is a `mailto:gunlicensenyc@gmail.com` link that opens a pre-filled email.

For the armed-guard B2B channel this is the scaling bottleneck. The whole point of onboarding a
company like ISS is that the second, fifth and twentieth guard cost us almost nothing. Right now
every additional guard is Pamela composing an email to your team and someone provisioning by hand.

## 🟠 S2 — A sponsor can supply nothing before consent, including their own company data
The company's legal name, agency licence, business address and custodian pair are **the company's
own data** — none of it belongs to the applicant — yet none of it can be entered until the
applicant consents. That inverts the natural order: in the real engagement Pamela has the custodian
number ready before Chery has finished signing up.

Let a sponsor complete their company profile at any time, and bind it to cases as consent arrives.
That also removes the single longest pole in the Carry Guard timeline.

## Sequencing note for live onboarding (until B3 is fixed)
The order is forced: **applicant signs up → applicant consents → sponsor sees the file → sponsor
enters the custodian licence number.** Pamela cannot act first, however ready she is. Worth saying
plainly in the onboarding email so she isn't waiting on a portal that shows her nothing.
