# Questions to unblock P0.2 and P0.3

Two Carry Guard / sponsored-flow items are built up to the point of a decision we can't make
in code. This is the draft question sheet. Sections are self-contained so you can forward
**§A** to a NY firearms attorney and **§B** to the NYPD License Division; **§C** is an
internal product decision. Everything stated as "our understanding" is what we believe today —
please correct anything wrong rather than assume we've got it right.

Companion: `docs/FILING_AUTHORITY_INVENTORY.md` (the full list of affected copy for §A).

---

## §A — For a New York firearms attorney (blocks P0.3)

**The core question:** May Gun License NYC — a non-attorney licensing consultant acting as the
applicant's *preparer, at the applicant's direction* — **enter and submit** the applicant's NYPD
handgun-license application through the NYPD online licensing portal? Or must the applicant
perform the final data entry and/or submission themselves?

**Why we're asking:** our own engagement agreement currently contradicts itself — one clause says
we may "enter and file … on your behalf," another (the concierge signature block) says "I file my
own … [GLNYC] does not file for me." Both are e-signed together. We will not rewrite either until
you rule.

**Our current understanding (please confirm or correct):**
- NYPD's published position: consulting firms cannot **represent** applicants, cannot **expedite**,
  and are **not endorsed**; only a NY-licensed attorney may represent an applicant before the
  License Division.
- The NYPD online portal appears to collect a **preparer's organization name** (we believe at the
  step numbered 14 in the current portal), which suggests preparers are contemplated.
- We **never** touch NYPD portal credentials or sign the applicant's certification. The applicant
  alone attests the facts are true, and attends fingerprinting and any interview.
- Relevant statutes we're weighing: Judiciary Law §§478/484 (unauthorized practice of law); Penal
  Law §§175.30/175.35 (offering a false instrument for filing).

**Specific questions:**
1. **Data entry** — may we type the applicant's own, applicant-approved answers into the portal
   on their behalf, or does that itself cross into representation/UPL?
2. **Submission** — may we click "submit," or must the applicant perform the submission?
3. **Credentials** — does the answer change depending on whose portal login is used? (Today we
   never use the applicant's credentials; if entry/submission required them, would that change your
   view?)
4. **Preparer status** — is identifying GLNYC as "preparer" in the portal a sufficient basis, or
   does entry/submission still risk UPL regardless of that designation?
5. **Wording** — given your answers, what client-facing description of the concierge scope is
   defensible? We will conform every surface to it (list attached) and re-version the e-signed
   agreement so all prior signers re-accept.

**What we need back:** a yes/no on **entry** and on **submission**, and approved language for the
scope. Nothing else is blocked on you.

---

## §B — For the NYPD License Division (blocks P0.2)

Context: a **company-sponsored armed guard** ("Carry Guard") applicant, where a Watch/Guard/Patrol
agency sponsors the licence and supplies the company-side paperwork.

**Our current understanding of the Letter of Necessity statements (please confirm):**
The portal's step 12 shows **five** free-text statements for a Carry Guard applicant:
1. the handgun is carried only in the course of / in connection with the job;
2. how the handgun will be secured;
3. has been / will be trained;
4. the **employer** is aware of its duty to dispose of the handgun and return the licence on
   termination;
5. familiarity with Penal Law Articles 35, 265 and 400.

**Question 1 — where does the sixth statement go?** There is a required statement — *"the employment,
and why it requires carrying a concealed handgun"* (the business-need narrative, which we associate
with 38 RCNY **§5-04**) — that is **not** one of the five step-12 boxes. Where does the License
Division expect it: (a) a **separate Letter of Necessity document** uploaded with the packet,
(b) somewhere else in the portal, or (c) it is in fact one of the step-12 boxes and we've
miscounted? This determines how we collect it.

**Question 2 — who attests which statement?** For a company-sponsored guard, which of the above are
the **employer's** to attest (we believe the business-need narrative and the employer-awareness
statement) versus the **applicant's**?

**Question 3 (secondary) — safeguard-person residency.** The portal's data-entry step says the
safeguard person should "ideally" be a New York State resident; its review step says they "must be"
a NYS resident. Which governs — is NYS residency **required** or **preferred**?

**Question 4 (secondary) — training.** For an armed guard, what is the relationship between the
**18-hour DCJS** course (PL 400.00(19)) and the **47-hour** armed-guard course? Does an armed-guard
applicant need **both**, and is either a prerequisite for the NYPD carry licence itself?

---

## §C — Internal product decision (unblocks P0.2 once §B is answered)

The P0.1 privacy lockdown means a sponsor can no longer see or edit any part of the applicant's
file — including the applicant's Letter of Necessity. But two LON statements are inherently the
**employer's** (business need; employer-awareness of the disposal duty). So they need a new home
that routes the company's input **without** exposing the applicant's file.

**Proposed design (decide before building):** collect the employer-side LON statements as part of
the **company packet** (`party='sponsor'`) — e.g., a §5-04 sponsor Letter of Necessity the sponsor
completes and uploads, which the applicant's application references. This keeps the firewall intact
and gives every required statement exactly one reachable owner.

Once §B settles where `lop1` lives and who owns each statement, and §C is chosen, the build is:
pass the track through, give each statement one owner, one merged answer record, correct the
"N of 5" count, and add a browser-level per-role test. Tracked as `// OPEN:` in
`lib/requirements/lon.ts`.
