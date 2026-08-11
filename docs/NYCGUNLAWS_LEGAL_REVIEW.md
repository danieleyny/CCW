# nycgunlaws.com — Legal review before public launch

**Prepared:** 2026-08-10 · **Content module:** `content/nyc-gun-laws.ts` · **Site:** `app/nycgunlaws/`

nycgunlaws.com is a legal-information publication. Every sentence of substance on it is a claim
about what New York law says, and the pages are written to be quoted verbatim by AI answer
engines — which is the highest-amplification way to publish a wrong legal claim. This document is
the gate between "built" and "public."

**Do not attach the domain in Vercel until section 1 is signed off.**

---

## How the content is structured

All claims live in one module, `content/nyc-gun-laws.ts`. Pages render from it; none of them
contains freehand legal prose. Each claim carries:

| Field | Meaning |
|---|---|
| `text` | The claim in plain English. Assume it will be quoted out of context. |
| `citation` | The statute, rule, or case. |
| `href` | Primary source. |
| `status` | `verified` — read directly against the primary text. `review` — see below. |
| `note` | Litigation status, scope limit, or confidence caveat. **Renderers display this.** |

Correcting a claim here corrects it on every page that renders it, in the sitemap-listed entry,
in `/sources`, and in `llms.txt`. There is no second copy anywhere.

---

## 1. Items requiring attorney sign-off before launch

These are the `status: "review"` claims. Each renders on-site with a visible caution, and each is
listed publicly at `/sources`. They are publishable with the caveat in the sense that the caveat is
honest — but a New York attorney should confirm the characterization before the domain goes live.

### 1.1 §265.01-d — scope of the Christian v. James injunction
**Page:** `/laws/private-property`
The claim characterizes an appellate holding rather than statutory text: that the criminal
prohibition no longer reaches ordinary retail and hospitality premises while private homes and
closed workplaces are unaffected. The Second Circuit did not exhaustively define "open to the
public."
**Ask counsel:** is this characterization defensible as written, and where should the line be drawn
for the reader?

### 1.2 §400.00(1)(o)(iv) — scope of the social-media consent injunction
**Page:** `/laws/eligibility`
Sources conflict. Some report the March 17, 2026 consent injunction runs only to the named
plaintiffs with no precedential effect; others describe it as ending the requirement generally.
Jointly confirmed: the State agreed to strip the item from the application form.
**Action:** obtain the signed order from the N.D.N.Y. docket. The page currently states the narrow,
jointly-confirmed version plus a note. Do not broaden it without the order.

### 1.3 §400.00(10)(d) — the three-year recertification text
**Page:** `/laws/renewal`
The substance is corroborated by two official New York State sources, but subdivision (d) was read
through a secondary republication rather than lifted from the legislature's site.
**Action:** pull the verbatim (d) text from nysenate.gov and flip to `verified`. Low risk, easy close.

### 1.4 18 U.S.C. §926A — "affirmative defense, not a bar to arrest"
**Page:** `/laws/transport`
This is the most consequential practical claim on the site — readers may plan interstate travel
around it. It reflects prevailing practice rather than a controlling Second Circuit holding
verified for this page.
**Ask counsel:** confirm the characterization and supply a citation, or soften the wording.

### 1.5 CPLR §§6342, 6343, 6346 — ERPO standards and duration
**Page:** `/laws/red-flag-orders`
Probable cause for a temporary order, clear and convincing evidence for a final order, up to one
year and renewable — commonly reported, not extracted verbatim here.
**Action:** verify the three sections directly, then flip to `verified`.

### 1.6 Penal Law §§70.04, 70.06, 70.08 — predicate/persistent offender enhancements
**Page:** `/laws/penalties`
Stated generally ("can raise the sentencing floor substantially") without section-by-section
verification. The general statement is safe; do not let anyone add specifics without checking.

### 1.7 §400.00(3)(a) vs. non-resident practice
**Page:** `/laws/out-of-state-permits`
Genuine tension between statutory text (residence/employment/business nexus) and current
administrative practice (State guidance and 38 RCNY §5-03 both accept non-residents). Stated as
tension, with a note. **Ask counsel** to confirm the framing.

### 1.8 Semiautomatic rifle grandfathering
**Page:** `/laws/long-guns`
The claim that pre-effective-date owners do not need the licence comes from State guidance, not
statutory text read verbatim.

### 1.9 Gen. Bus. Law §396-ee / 9 NYCRR §471.1 — locking device duties
**Page:** `/laws/safe-storage`
Cited from a secondary index rather than read in full.

### 1.10 Executive Law §228 — point-of-contact status
**Page:** `/laws/buying-a-handgun`
Read through a secondary republication; effective date unverified.

---

## 2. Deliberate omissions — keep them omitted

- **Fee amounts for background checks.** Secondary reporting places the ammunition check at $2.50
  and the firearm check at $9.00. Neither was confirmed against a primary source, so neither
  appears on the site.
- **NYPD fingerprint fee.** Three NYC.gov pages give three different numbers ($89.75, $91.50,
  $99.00 — the last from a pre-CCIA PDF that still lists an abolished licence category). The site
  renders fees from the `fees` database table instead of hardcoding any of them, exactly as the
  main site does. **Confirm the table's current value with NYPD before launch.**
- **Anything about self-defence law, hunting regulation, federal prosecution, or dealer licensing.**
  Out of scope and stated as such on `/laws`.

---

## 3. Citation errors found in published guidance

Documented in `KNOWN_ERRORS` in the content module and published at `/sources`. Verify each before
they go public with our name on them:

1. **Giffords** cites Penal Law §265.50 as a safe-storage provision. §265.50 is undetectable
   firearms (class D felony). The safe-storage offence is §265.45.
2. **§400.00(16-a)** is widely miscited as the semiautomatic rifle licence. It is SAFE Act
   assault-weapon registration; the licence is in the unlettered paragraph of §400.00(2).
3. **§400.00(2)(f)** is widely called a "special carry" licence. It is the ordinary unrestricted
   carry licence; Special Carry is a NYC category under 38 RCNY §5-23.
4. **§265.01-d** is widely reported as struck down entirely. It is enjoined only as applied to
   property open to the public.

Publishing corrections is an asset — it is exactly the kind of thing that earns citations — but
only if each one is right. Please confirm all four.

---

## 4. Standing maintenance

This area of law moves faster than any other on the platform. Four Second Circuit decisions
changed it materially between October 2024 and May 2026, and the parks provision has an open
as-applied question.

**Recommended cadence:** a quarterly re-verification pass against the primary sources, updating
`LAWS_VERIFIED` in the content module. That date renders publicly on the home page, on every entry,
in `/sources` and in `llms.txt` — so letting it go stale is visible to readers and to crawlers.

**Trigger an immediate pass** on: any Second Circuit or Supreme Court decision touching Penal Law
§§265.01-d, 265.01-e or 400.00; any CCIA amendment; any NYPD rule revision to 38 RCNY chapters 3
or 5.

---

## 5. Launch checklist

- [ ] Sections 1.1–1.10 reviewed by a New York–licensed attorney; `status` flipped to `verified`
      or the wording amended.
- [ ] `fees` table confirmed current with NYPD (application fee, fingerprint fee).
- [ ] Section 3 corrections independently confirmed.
- [ ] Domain attached in Vercel (apex **and** `www.`) — see `DOMAIN_STRATEGY.md` deployment steps.
- [ ] Confirm `nycgunlaws.com` is **not** present in `BRAND_ALIAS_HOSTS` or `KEYWORD_REDIRECTS`
      in `next.config.ts`. If it is, the 301 fires before Proxy and the site will not render.
- [ ] `curl -sI https://nycgunlaws.com/` returns `200`, not `301`.
- [ ] `curl -s https://nycgunlaws.com/robots.txt` shows the satellite's own sitemap and
      `Disallow: /nycgunlaws`.
- [ ] `curl -s https://nycgunlaws.com/sitemap.xml` lists nycgunlaws.com URLs only.
- [ ] Google Search Console: separate Domain property for nycgunlaws.com; sitemap submitted.
- [ ] Spot-check that no entry duplicates a gunlicensenyc.com pillar page closely enough to
      read as a doorway. The content spines are different by design — keep them that way.
