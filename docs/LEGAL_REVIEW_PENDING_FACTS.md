# Legal review — pending facts for the new content cluster

**Status:** awaiting attorney review · **Prepared:** 2026-08-02 · **Nothing here is published.**

## Why this exists

The SEO audit recommends five new content pages that would attract high-intent NYC
gun-license search traffic: **premises-vs-carry, disqualifiers, reciprocity,
retired-LEO, and a license-type comparison.** Each requires stating **new legal
claims**, and the company's non-negotiable rule is that we assert nothing new
without (a) a real primary source and (b) attorney sign-off. So the claims are
drafted here first, each with its primary source, for you to **approve, edit, or
reject** before anything is written on the site.

- The drafts live in code at `content/facts-pending.ts`, isolated so no page can
  render them (a test, `tests/facts-pending-not-live.test.ts`, fails the build if
  any page imports them).
- On your approval, each approved claim is moved into the live fact base
  (`content/facts.ts`) with a verification date, and only then is the page built.
- **Priority `HIGH`** = the drafter could not reach a single authoritative
  government primary source and needs you to pin the exact citation.

**Guardrails that stay in force on every page these support:** the applicant
always files their own application; no *guarantee / expedite / fast-track /
insider / approval-rate* language; explaining a rule is fine but any
question about a specific person's history routes to the attorney-referral seam
(Judiciary Law §§478/484); candor-maximizing, never disclosure-minimizing.

## How to respond

For each item, mark **APPROVE** (as written), **EDIT** (write the corrected
claim), or **REJECT**, and note anything the page must or must not say.

---

## A. License types → supports `/premises-vs-carry`, `/license-types`

### A1 · Premises vs. carry (priority: HIGH)
> New York issues distinct handgun license types. A **premises license** authorizes
> possessing a handgun only at a specified location — your dwelling or your place
> of business — while a **carry license** authorizes carrying a handgun concealed.
> The unrestricted carry license permits concealed carry without regard to
> employment or a particular place of possession.

- **Authority:** NY Penal Law §400.00(2) — [source](https://www.nysenate.gov/legislation/laws/PEN/400.00)
- **Verify:** §400.00(2) is the *state* backbone (dwelling §(2)(a), business §(2)(b),
  unrestricted concealed carry §(2)(f)). **Confirm the NYPD's own NYC type names**
  under 38 RCNY Ch. 5 (commonly: Premises Residence, Premises Business, Carry
  Business, Limited Carry Business, Special Carry Business, Carry Guard) — the NYC
  rules site blocks automated retrieval, so this could not be machine-checked.
- **Decision:** ☐ Approve ☐ Edit ☐ Reject — notes: ____________________

### A2 · Premises transport scope (priority: HIGH)
> A premises license does not authorize carrying the handgun around in public. It
> covers possession at the licensed location, with limited lawful transport (for
> example, directly to and from an authorized range) under New York law.

- **Authority:** NY Penal Law §400.00; §265.20 — [source](https://www.nysenate.gov/legislation/laws/PEN/400.00)
- **Verify:** exact transport allowances + citations (§400.00(6) and the §265.20
  exemptions). Easy to overstate — confirm before publishing.
- **Decision:** ☐ Approve ☐ Edit ☐ Reject — notes: ____________________

## B. Eligibility / disqualifiers → supports `/disqualifiers`, `/eligibility`

> **Page framing (fixed):** these are *general statutory criteria*, not advice. The
> page will state the standard and route any "does my specific record disqualify
> me?" question to the attorney-referral seam. No page will enumerate a
> case-by-case list of disqualifying crimes.

### B1 · Good moral character (standard)
> New York requires a handgun-license applicant to be of **good moral character** —
> defined as having the essential character, temperament, and judgment necessary to
> be entrusted with a firearm.
- **Authority:** NY Penal Law §400.00(1)(b) — [source](https://www.nysenate.gov/legislation/laws/PEN/400.00)
- **Decision:** ☐ Approve ☐ Edit ☐ Reject — notes: ____________________

### B2 · Felony / "serious offense" (priority: HIGH)
> An applicant must not have been convicted anywhere of a **felony or a "serious
> offense"** as defined by New York law, and must not be the subject of an
> outstanding arrest warrant.
- **Authority:** NY Penal Law §400.00(1)(c); "serious offense" defined at §265.00(17) — [source](https://www.nysenate.gov/legislation/laws/PEN/265.00)
- **Verify:** confirm the §265.00(17) list is current. **Do not enumerate crimes
  on-page** — state the standard, route specifics to the attorney.
- **Decision:** ☐ Approve ☐ Edit ☐ Reject — notes: ____________________

### B3 · Controlled-substance use (standard)
> An applicant must not be an unlawful user of, or addicted to, any controlled substance.
- **Authority:** NY Penal Law §400.00(1)(e) — [source](https://www.nysenate.gov/legislation/laws/PEN/400.00) · optional federal parallel 18 U.S.C. §922(g)(3)
- **Decision:** ☐ Approve ☐ Edit ☐ Reject — notes: ____________________

### B4 · Mental-health criteria (standard)
> An applicant must not have been involuntarily committed to a mental-health
> facility, and must disclose any history of mental illness on the application.
- **Authority:** NY Penal Law §400.00(1)(i)–(j) — [source](https://www.nysenate.gov/legislation/laws/PEN/400.00)
- **Verify:** wording + any SAFE Act interplay; keep non-stigmatizing.
- **Decision:** ☐ Approve ☐ Edit ☐ Reject — notes: ____________________

### B5 · Five-year bar for unrestricted carry (priority: HIGH)
> For an unrestricted carry license, an applicant must not have been convicted
> within the preceding five years of certain offenses, including specified assault,
> misdemeanor DWI, or menacing offenses.
- **Authority:** NY Penal Law §400.00(1)(n) — [source](https://www.nysenate.gov/legislation/laws/PEN/400.00)
- **Verify:** the **exact enumerated offenses and the five-year window** — the item
  most likely to be misstated.
- **Decision:** ☐ Approve ☐ Edit ☐ Reject — notes: ____________________

## C. Reciprocity → supports `/reciprocity`

### C1 · No New York reciprocity (priority: HIGH)
> New York does not participate in concealed-carry reciprocity. It does not
> recognize handgun-carry permits issued by other states, and a person generally
> must hold a valid New York license to carry a handgun in New York.
- **Authority:** NY Penal Law §265.01; §265.20; §400.00 — [source](https://www.nysenate.gov/legislation/laws/PEN/265.20)
- **Verify:** could **not** be confirmed from a single NY government primary source
  (only secondary legal-info sites). The basis is the *absence* of an
  out-of-state-permit exemption in §265.20 — pin the precise citation and confirm
  it is current. **Do not publish a state-by-state "who honors NY" matrix**; frame
  outbound reciprocity as "decided by the destination state's law — check that state."
- **Decision:** ☐ Approve ☐ Edit ☐ Reject — notes: ____________________

## D. Retired law enforcement → supports `/retired-leo`

### D1 · LEOSA for qualified retired officers (standard)
> Under the federal **Law Enforcement Officers Safety Act (LEOSA)**, a "qualified
> retired law enforcement officer" who meets the statute's conditions — including
> an aggregate of 10+ years of service (or separation due to a service-connected
> disability), separation in good standing, current annual firearms qualification,
> and the required photo ID — may carry a concealed firearm, subject to the
> statute's limits and to state laws that prohibit carry in specified places.
- **Authority:** 18 U.S.C. §926C (LEOSA) — [source](https://www.law.cornell.edu/uscode/text/18/926C)
- **Verify:** §926C conditions current; clarify how the NYPD License Division
  treats retired-LEO applicants and how LEOSA interacts with New York's
  sensitive-location rules. Informational, not advice.
- **Decision:** ☐ Approve ☐ Edit ☐ Reject — notes: ____________________

---

## Sign-off

Reviewed by: ________________________  ·  NY bar #: __________  ·  Date: __________

Once signed, hand back to engineering: approved items move to `content/facts.ts`
with a verification date, then the corresponding pages are built and shipped.
