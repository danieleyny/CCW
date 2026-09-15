# QA HARNESS — sponsored Carry Guard portals (applicant + sponsor)

**Hand this entire file to the testing agent as its brief.** It is self-contained.

---

## What the agent needs before it can start

This brief is not enough on its own. The agent needs real access. Confirm each line:

| Needs | Why | If it's missing |
|---|---|---|
| **Browser automation** on a machine signed out of any real account | It has to drive two portals and a tokened third-party page | Without this there is no test — reading code is not testing |
| **A terminal in `~/Desktop/Code/CCW`** | To run the two seed scripts and write the deliverables | The human runs §3's two commands and pastes the JSON output; the agent returns both documents as text instead |
| **`.env.prod` present in that folder** | The seed scripts need the production Supabase service-role key | It is gitignored and will NOT be in a fresh clone. Create it with `npx vercel env pull .env.prod --environment=production` |
| **The production URL** | `https://gunlicensenyc.com` | — |
| **The deployed commit** | §2 — so a missing deploy isn't reported as thirteen code bugs | The human reads it from vercel.com → project `ccw` → Deployments |

**Two things only a human can do, before the agent starts:**

1. **Merge `carry-guard-repair` into `main` and confirm production redeploys.** Otherwise the agent
   tests the code the repairs were meant to fix.
2. **Nothing else.** The agent must not create accounts, type passwords for real accounts, or enter
   card details — the harness provisions test identities server-side and hands it magic links
   precisely so none of that is needed.

---

## 0. Mission

Gun License NYC is a NYC handgun-licence concierge platform (Next.js + Supabase, Vercel).
You are testing the **sponsored Carry Guard** flow, which has **three parties**:

| Party | Surface | Owns |
|---|---|---|
| **The applicant** (an armed guard) | `/portal` | identity, histories, firearms, storage, disclosures, most uploads |
| **The sponsor** (the employing security company's rep) | `/sponsor` | company licensing data and the **gun custodian name + NYPD licence number** |
| **The safeguard person** (a private individual, no account) | `/g/<token>` | their own signed acknowledgement + a photo of their government ID |

The NYPD will not accept a Carry Guard application without the employer's gun custodian pair, so
**the sponsor is a hard dependency, not a nice-to-have.** A test that only covers the applicant has
not covered the product.

Your job: drive both portals with realistic data, find everything that is broken, misleading, or
contradictory, and produce two deliverables (§9, §10).

---

## 1. Hard rules — do not break these

1. **Never create an account through a signup form and never type a password for a human's real
   account.** The harness provisions test accounts server-side and gives you magic sign-in links.
2. **Only ever touch the seeded `se2018+…` aliases.** Anything else in the production database is a
   real person's licence file.
3. **Never run `pnpm db:reset`, `supabase db reset`, or any `repair-*` script against production.**
   The only script that may point at production is `scripts/seed-sponsor-test.ts` (idempotent, scoped
   to its own suffix) and `scripts/qa-access.ts`.
4. **Never enter card details, even test ones.** If a flow reaches Stripe checkout, stop and record it.
5. **Real email and SMS will send.** They go to the `se2018+…` inbox, which is fine. If a form asks
   for a third party's contact details, use the aliases in §4 — never invent an address that might
   belong to a stranger.
6. **Report what you observed, not what you infer.** If something fails once and then works, say
   "observed once in N attempts". Do not escalate a single timeout into a systemic outage.

---

## 2. Pre-flight — establish what is actually deployed  ⚠️ DO THIS FIRST

As of writing, `origin/main` is at **`bb16de6`** and the repair work sits **unmerged** on
`origin/carry-guard-repair` (`3236b9e` — "Carry Guard repair: unblock the sponsored flow (P0/P1/P2)").
**Production deploys from `main`, so production may not contain the fixes you are asked to verify.**

```bash
cd ~/Desktop/Code/CCW
git fetch origin
git log --oneline -3 origin/main
git log --oneline main..origin/carry-guard-repair
```

Then open **vercel.com → project `ccw` → Deployments** and note the commit on the *Production*
deployment.

**Record the deployed commit at the top of your audit.** If the repair commit is not in it, say so
plainly and expect every item in §8 to still fail — that is a deployment finding, not 13 code bugs.

---

## 3. Environment — build a fresh clone set

Everything runs on the user's Mac. Use a **new suffix** so you never disturb an existing set.

```bash
cd ~/Desktop/Code/CCW

# 1. Seed an isolated two-party sponsored Carry Guard case
QA_SUFFIX=-qa2 QA_PRECLAIM=1 ENV_FILE=.env.prod pnpm tsx scripts/seed-sponsor-test.ts

# 2. Set a known password and mint password-free sign-in links for BOTH sides
QA_SUFFIX=-qa2 ENV_FILE=.env.prod pnpm tsx scripts/qa-access.ts
```

This creates:

| Identity | Email | How you get in |
|---|---|---|
| Applicant ("Chery" stand-in — seeded as **Marcus Powell**) | `se2018+applicant-qa2@gmail.com` | `signInLink` from `qa-access.ts` |
| Sponsor rep ("Pamela" stand-in — seeded as **Test Rep**) | `se2018+sponsor-qa2@gmail.com` | `signInLink` from `qa-access.ts` |
| Safeguard person | `se2018+safeguard-qa2@gmail.com` | `uploadUrl` from the seed output (no account) |
| Company | `Test Guard Co.-qa2` | — |

Password on both accounts: **`QaTest!2026`** (override with `QA_PASSWORD=`).

**Important mechanics:**
- The sign-in links are `/auth/callback?token_hash=…&type=magiclink&next=/portal`. They must go
  through the app's own callback. A Supabase `action_link` (`/auth/v1/verify?...`) returns the
  session in a URL **fragment**, which this app does not read — the session is silently discarded.
- Both accounts share one browser profile, so **signing in as one signs the other out.** Walk the
  applicant completely, then the sponsor. Re-mint a link whenever you switch back.
- The custodian licence number is deliberately **blank** in the seed. That is the Carry Guard
  step-3 blocker you are meant to exercise.

---

## 4. Test data — use these exact values

The seed pre-fills identity, both five-year histories, and two firearms. Everything below is what
**you** must enter. Use these values verbatim so results are comparable between runs.

### Applicant — fields the seed leaves blank
| Field | Value | Why this value |
|---|---|---|
| SSN — last 4 | `6789` | the portal only ever wants four digits |
| NYS driver licence / non-driver ID | `123456789` | field added in the alignment work; confirm it persists |
| Mailing address different from home? | `Yes` → `500 Grand Concourse`, Apt `12F`, `Bronx`, `NY`, `10451` | exercises the conditional mailing block |
| Safeguard street / apt / city / state / ZIP | `44 Prospect Park West`, blank, `Brooklyn`, `NY`, `11215` | NY resident — the stricter reading of NYPD's rule |
| Is this person at least 21? | `Yes` | hard NYPD rule |
| Safekeeping location | `123 Test St`, Apt `4B`, `New York`, `NY`, `10001` | must be in New York State |
| Currently employed? | `Yes` | **check first** whether it is already "Yes" on a sponsored case |
| Represented by an attorney? | `No` | then flip to `Yes` once to confirm the 5-field block appears, then back to `No` |
| Other NY county pistol licence? | `No` | |

### A third firearm to ADD (tests the repeater, not just seeded rows)
`Make` **Smith & Wesson** · `Model` **M&P Shield** · `Caliber` **.40 S&W** · `Serial` **SW443021** ·
`Is this firearm licensed?` **Yes** → `License / permit number` **NYC-903114**

### An "other firearms licence" to ADD
Number `FL-2244819` · Issuing agency `Broward County Sheriff's Office` · State and county
`Florida, Broward` · Issued `2021-04-12` · Expires `2028-04-12`
*(out-of-state on purpose — NYPD asks about "any other licensing authority")*

### Disclosure questions — answer these exactly
Answer **No** to everything **except**:
- **Q2 (discharged / fired / terminated)** → **Yes**, explanation:
  `Laid off from Sentinel Guards Inc. in June 2022 when the client contract ended. Not for cause; eligible for rehire.`
- **Q7 (arrest / summons, any jurisdiction)** → **Yes**, explanation:
  `Disorderly conduct summons, New York County, March 2016. Dismissed and sealed. Disclosed because NYPD requires disclosure of sealed and dismissed matters.`

These two are chosen deliberately: Q2 is the most common disclosure in a guard population, and Q7 is
the highest-stakes question on the form. **Confirm a "Yes" reveals a required explanation textarea
and that the text survives a page reload.**

### The five written statements (Carry Guard)
Put one short sentence in each. **Before typing, record how many boxes the UI asks for.**
Carry Guard must ask for **five**, not two and not six.

### ⛔ Safeguard self-designation — you MUST try to break this
A recent fix stops an applicant naming **themselves** as the safeguard person. NYPD's step 7 says
"Identify an individual (**not yourself**)…", and before the fix nothing stopped it. Test all three
fields, one at a time, reverting after each:

| Enter as the safeguard person | Expect |
|---|---|
| First **Marcus**, Last **Powell** (the applicant's own name) | red field + "You can't name yourself as the safeguard person…" |
| Email **se2018+applicant-qa2@gmail.com** (their own) | red field + a message about the Division needing to reach this person independently |
| Phone **(212) 555-0148** (their own) | red field + a message about it having to be their number, not the applicant's |
| All three at once | all three flag |

Then confirm the **negatives** — these must NOT flag, or the guard is too aggressive to trust:

| Enter | Expect |
|---|---|
| First **Jordan**, Last **Powell** (same surname, different person — a sibling) | **no flag** |
| Email **se2018+safeguard-qa2@gmail.com** | **no flag** |
| Safeguard address identical to the applicant's home address | **no flag** — a spouse or parent at the same address is valid |
| **Marcus J. Powell** vs **marcus powell** | **flags** — middle initial and case must not defeat it |

Also verify, with a conflicting value in place:
- the safeguard group does **not** count as "captured" in the concierge data-ask
- **"Send them the link" refuses** — we must never email a "safeguard this person's firearm" invite
  to the applicant's own address
- a page **reload** does not persist a conflicting value (the server should have rejected the write,
  not just the UI)

And read the explanation copy on all four surfaces — intake wizard, `/portal/details`, the SFG-01
invite card, and `/g/<token>` — confirming each says **why** it can't be them (custody of the firearm
if the applicant dies or is incapacitated), not merely that it can't.

### Safeguard person's page (`/g/<token>`, open in a private window — no login)
Download the pre-filled acknowledgement, then upload **any** small PDF/JPG to both slots to confirm
the upload path works. Record the exact button labels and any instruction that contradicts another
surface.

---

## 5. Part A — the applicant portal

Sign in with the applicant `signInLink`. Walk in this order, recording the result of each step.

1. **`/portal`** — read every card aloud in your notes. Record the page subtitle verbatim, whether
   any price or payment prompt appears, and where each card links.
2. Follow **every** link on that page. Note any that bounce somewhere else without explaining why.
3. **`/portal/details`** — verify the seeded data rendered (firearms with the licensed flag, the
   Toronto residence with its country, employment addresses, the employment-gap warning). Then enter
   everything in §4. Reload and confirm each value persisted.
4. **`/portal/concierge`** — if an engagement gate appears, agree to each clause and adopt a typed
   signature (this is a seeded test account; it is expected). Record the count shown for **"Your
   written statements — N of M"**.
5. **The document vault** — open several requirement cards. Upload a junk file (a `.txt` renamed to
   `.pdf`, and a file with an accented filename like `réf.pdf`) and record whether validation catches
   it. NYPD silently rejects bad filenames, so our side must not.
6. **`/portal/forms`** — compare every notarisation instruction against what the safeguard page and
   the vault say about the same document.
7. **The disclosure questionnaire** — enter the §4 answers. Confirm the question count and numbering
   match the live NYPD portal (**16 questions, numbered 1–16**).
8. **The sponsor consent card** — open it, read exactly what the sponsor would be able to see, and
   grant consent. **This is the single most important step in the whole test**: if consent cannot be
   granted, the sponsor portal stays empty and the application can never be completed.

## 6. Part B — the sponsor portal

Re-mint a sponsor link, sign in, then:

1. **`/sponsor`** — is the consented case visible? Record every navigation option available.
2. Open the case. Record what the sponsor can and cannot see of the applicant's file — especially
   whether any disclosure answers, health information or criminal-history text is visible. **A sponsor
   seeing an applicant's Q7 answer would be a serious privacy defect; check explicitly.**
3. **Enter the gun custodian licence number**: `NYPD-GC-44217`. Also complete agency licence
   `NYS-WGP-118842`, expiry `2028-11-30`, business phone `(718) 555-0142`.
4. Return to the applicant side and confirm the custodian block is no longer blocking.
5. Try **"Add another applicant"** and record exactly what happens.

## 7. Part C — third parties

1. Open the safeguard `uploadUrl` in a **private window**. Complete every step.
2. From the applicant portal, send the character-reference invites to
   `se2018+ref1-qa2@gmail.com` and `se2018+ref2-qa2@gmail.com`. Confirm the emails arrive and the
   links open.
3. Record any place where a third party is given an instruction that contradicts what the applicant
   was told.

---

## 8. Regression matrix — confirm these specific fixes

Each was found in the previous QA round. Mark every one **FIXED / STILL BROKEN / NOT REACHED**.

| # | What to confirm |
|---|---|
| P0-1 | "Review & decide" opens the consent screen; consent can actually be granted |
| P0-2 | **No price and no payment card anywhere** in a sponsored applicant's portal |
| P1-1 | The Safeguard-Person Designation says **witness, not notary**, on every surface |
| P1-2 | A `carry_guard` case is never described as "concealed carry" |
| P1-3 | Disclosure copy says **16 questions, 1–16** — not "questions 10–28" or "seventeen" |
| P1-4 | On a sponsored case the Employer block renders with the sponsoring company's details |
| P1-5 | `/portal/checklist` either works or explains why it is gated |
| P2-1 | No missing spaces — previously `"Powelldesignated"`, `"Peoplepage"`, `"citizenship— upload"` |
| P2-2 | Safeguard upload buttons no longer say "Choose the notarized file" |
| P2-3 | Citizenship shows a real option, not the raw token `citizen` |
| P2-4 | One consistent "details captured" denominator across `/portal/details` and the concierge |
| P2-5 | `/g/<token>/document` returns a PDF reliably; failure copy is not "invalid or has expired" |
| — | **LON count is 5** for Carry Guard |
| SFG-1 | Naming yourself as the safeguard person flags red on name, email AND phone — on the individual flow AND the sponsored flow |
| SFG-2 | A same-surname sibling, a different email, and a shared home address do **not** flag |
| SFG-3 | A conflicting safeguard blocks the invite and is not counted as captured |
| SFG-4 | All four surfaces explain **why** it cannot be the applicant |

### Already investigated and cleared — do NOT re-report
- Supabase `/auth/v1/verify` Gateway Timeout: transient, auth is fine.
- "The concierge page is inert / hydration is broken": false — clicks were landing on stale
  coordinates. Use element-targeted clicks, not fixed screen coordinates; the page scrolls between
  screenshot and click.

---

## 9. Deliverable 1 — the audit

Write `CARRY_GUARD_QA_ROUND2.md` in the repo root.

- **Header**: date, environment (production), the **deployed commit**, which accounts were used.
- **Verdict**: one paragraph. Is the sponsored flow shippable to a live client, yes or no, and why.
- **Regression matrix** from §8, fully filled in.
- **New findings**, severity-ordered:
  - 🔴 **Blocker** — a real application cannot be completed, or the client is shown something
    financially or legally wrong
  - 🟠 **High** — wrong or contradictory information reaches a client
  - 🟡 **Medium** — visible defect, no wrong information
  - ⚪ **Cleared** — investigated and not a bug (say so, so nobody re-chases it)
- For each finding: **exact URL**, **verbatim on-screen text**, what you expected, what happened,
  how many times out of how many attempts, and the file you believe is responsible.
- **Console and network**: note errors from the app only. Browser-extension noise (MetaMask and
  similar) is not a finding.

**Quote the product's own words.** "The page says *'finish your payment to unlock it'* while
`/portal/concierge` says *'You're on the done-for-you path'*" is actionable; "the payment state seems
inconsistent" is not.

## 10. Deliverable 2 — the code update prompt

Write `CARRY_GUARD_REPAIR_ROUND2.md`, addressed to a coding agent working in this repo.

Required structure:
1. **Verdict** — what works, what blocks a live client.
2. **P0 / P1 / P2 / P3** sections, in priority order. For each item: symptom with verbatim text,
   why it matters to a real applicant or sponsor, the file(s) to look at, and a concrete
   **acceptance criterion** a test could assert.
3. **Open questions** — anything needing a human (NYPD License Division, DCJS, legal). Instruct the
   agent to leave an `// OPEN:` marker rather than guess.
4. **Do not do** — explicitly include: don't touch `redesign/v2`; don't chase the cleared items in
   §8; don't gate filing on the training certificate (NYPD doesn't); don't add applicant-facing
   fields that a derivation or a third-party invite could supply.
5. **Verification** — the tests to add and the end-to-end walk to re-run.

### The product principle every fix is judged against
The applicant came to this site because getting an NYPD licence is confusing and slow. The goal is
**the simplest possible path to a licence**, not the most complete form. So:

1. Ask the applicant only what **only they** can answer.
2. Derive anything derivable (a precinct comes from a ZIP).
3. Route third-party data to the third party (custodian → sponsor; ID photo → the safeguard person).
4. Defer what NYPD lets us defer (the training certificate is not required to file).
5. Never render a field on a surface where it cannot be answered.

If a proposed fix lengthens the applicant's path without one of those five justifying it, say so
instead of recommending it.

---

## 11. Cleanup — leave the database as you found it

List every seeded identity and the case ID in your audit, and note that they must be purged before a
real client is onboarded. Do not delete anything yourself.
