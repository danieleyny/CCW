# USCCA (usconcealedcarry.com) — Competitive Analysis

**Date:** 2026-07-13
**Analyzed against:** CARRY / `gunlicensenyc` (concierge platform, `~/Code/CCW`) and Concealed Knowledge (free knowledge site, `~/Code/Ccw-LILI`)
**Operator:** Delta Defense, LLC (West Bend, WI) — USCCA is the brand, Delta Defense is the licensed insurance agency + operating company.

---

## 1. The single most important fact

> **"USCCA Membership is not available to residents of New Jersey, New York or Washington State."**
> — footer of usconcealedcarry.com/membership

USCCA's entire revenue product — the membership — **cannot be sold to anyone in our market.** NY DFS effectively bars the self-defense liability insurance that anchors the bundle.

But they still rank for, and publish, New York permit content. So:

- They own a large share of NY top-of-funnel search intent ("how to get a concealed carry permit in New York").
- They have **no offer to convert it with**. That traffic hits a dead end, or gets pushed to a class-search widget.
- Their NY content is **stale and materially wrong for NYC** (details in §4).

**This is the strategic opening.** USCCA is not a competitor for our revenue — they are an *unmonetized funnel sitting on top of our customer*. The play is to out-rank and out-truth them on NY/NYC, and be the obvious destination for the traffic they can't serve.

---

## 2. What USCCA actually is

A **subscription membership association** — content and training are customer-acquisition assets for an insurance-backed recurring product.

### Business model
| Tier | Price | Contents |
|---|---|---|
| Gold | $39/mo · $399/yr | 150+ video episodes, 30+ guides, Qual Level 1, insurance, LifeLock Standard |
| Platinum | $49/mo · $499/yr | 290+ videos, 40+ guides, Quals 1–2, + quarterly Tactical Mastery & Attorney Insider series |
| Elite | $59/mo · $599/yr | 430+ videos, 80+ guides, Quals 1–3, priority service, full magazine archive |

All tiers include: Protector Academy (eLearning), *Concealed Carry Magazine*, **self-defense liability insurance**, **24/7 Critical Response Team**, free store shipping, partner discounts, annual anniversary gift ($10/$15/$25).

Secondary revenue: e-commerce store, USCCA Expo (3-day paid show), instructor certification program, magazine.

### Scale claims
~850,000–875,000 active members (numbers are inconsistent across pages — 600k, 705k, 805k, 850k, 875k all appear). "124,018 crimes stopped / 180,103 lives saved" — **derived from a 2020 member survey extrapolation, footnoted honestly at the bottom.** 1M+ students trained. 4.9/5 member reviews.

### Surfaces (they run ~8 separate subdomains)
`www` (WordPress marketing) · `academy.` (Protector Academy LMS) · `academy-qualifications.` (instructor cert) · `training.` (instructor search) · `class-search.` (embeddable class finder) · `portal.` (member dashboard + **free account**) · `community.` (forum) · `store.` · `action.` (national reciprocity advocacy) · `checkout.deltadefense.com`.

---

## 3. Structural comparison

| | **USCCA** | **Concealed Knowledge** (our knowledge site) | **CARRY** (our concierge) |
|---|---|---|---|
| **Core promise** | Be educated, trained, insured | Understand guns and gun law, plainly | Get your NYC license without getting denied |
| **Geography** | 50 states (shallow) | NY (deep) | NYC only (very deep) |
| **Model** | Recurring subscription | Free, non-commercial | One-time service fee ($499–$1,999) + 10% marketplace take |
| **Revenue in NY** | **$0 — legally excluded** | $0 by design (funnel) | All of it |
| **Depth on NYC** | 4-step listicle, wrong fees | Compliance guardrails, ranked | Versioned requirements registry, 24-doc packet, QA gate |
| **Free entry point** | Free account (portal) | Entire site | Eligibility quiz |
| **Two-sided** | Instructors + ranges + attorneys + affiliates | — | Instructors (marketplace, Stripe Connect) |
| **Emotional register** | Fear → preparedness ("This is it. I might not make it…") | Calm → competence (deliberately anti-tactical) | Precision → control ("The delay is the danger") |
| **Retention** | Monthly subscription, magazine, forum, insurance | None | 3-yr renewal cycle |
| **Post-incident** | 24/7 Critical Response Team + attorney network + insurance | — | Attorney referral seam only |
| **Community** | Forum, expo, member stories | — | — |
| **Commerce** | Full store, partner discounts | — | — |

---

## 4. Where USCCA is weak — and we should attack

### 4.1 Their New York content is wrong for our exact customer
From `/resources/how-to-get-a-concealed-carry-permit/new-york/`:

- **"~$20 for Initial License, Varies by County"** — NYC is **$340** + **$88.25** DCJS fingerprints. Off by ~20x.
- **"VISIT your local county sheriff or courthouse"** — NYC applicants go to the **NYPD License Division**. Wrong authority.
- **No mention** of: 4 character references, cohabitant affidavits, the in-person License Division interview, social-media disclosure, safe-storage requirements, the 6-month training expiry, or the ~6-month investigation timeline.
- Cites "16 hours classroom + 2 hours live range" (correct CCIA) but frames it as a generic "handgun safety course."
- Copyright block still says **©2003–2024**; footer variously claims 500,000 / 875,000 members on the *same page*.

**This is a credibility gap we can exploit head-on.** Concealed Knowledge already has the discipline (`lastVerified` dates, cited sources, an anti-fabrication test gate). A single page — *"What USCCA gets wrong about New York"* or better, *"NYC is not New York State"* — is a high-intent, high-authority SEO wedge.

### 4.2 They have no answer for may-issue / investigation-heavy jurisdictions
Their whole product assumes shall-issue: take a class → fill a form → wait. That model is useless in NYC, where the application *is an investigation*. **Nobody at national scale is serving the hard jurisdictions.** That's the entire premise of CARRY and it remains uncontested.

### 4.3 The funnel dead-ends in NY
They send NY visitors to a class-search widget and a membership page that then tells them they're ineligible. Every one of those people is our customer.

---

## 5. What USCCA does well — and what's worth taking

Ranked by value-to-us.

### Tier 1 — take these

**1. The free account as an email-capture engine.**
`portal.usconcealedcarry.com/register` — "Not ready to join yet? Activate a free account and enjoy a sample of the lifesaving videos and resources." A real logged-in tier with real (limited) value, not a newsletter box.
→ *For us:* Concealed Knowledge currently has **zero data capture by design** — a principled choice, but it means the funnel is a single outbound link. A **free CARRY account** (save your eligibility-quiz result, get your personalized NYC document checklist, get notified when rules change) is the missing middle. It's not a lead magnet, it's a genuinely useful artifact — and we already generate it.

**2. The embeddable class-search widget.**
`class-search.usconcealedcarry.com/?theme=dark&topics=concealed-carry&radius=160&state=NY` — themed, parameterized, iframed into their own pages *and syndicatable to partners*. This is how they turn an instructor directory into a distribution channel.
→ *For us:* our instructor marketplace is locked inside `/portal`. A **public, embeddable "Find a DCJS-certified NYC instructor" widget** would (a) give instructors a reason to join and promote us, (b) rank, (c) seed the marketplace supply side. Cheap — the geo-matching already exists in `lib/geo/nyc.ts`.

**3. The Attorney Network — free for attorneys to join.**
Criminal-defense lawyers apply at no cost; USCCA gets a referral graph and a huge trust signal ("Review the growing USCCA Attorney Network to arm yourself with a trustworthy legal defense").
→ *For us:* we already have `/admin/legal` (attorney verification register) and an appeal/attorney referral seam, but **no network and no public directory**. In NYC, where denials and appeals are the real fear, a *public* "NYC Firearms Attorney Network" is high-trust, free to build, and directly serves our `/portal/appeal` seam. It also solves our biggest open blocker — **every requirement in the registry still sits at `needs_legal_review = true`**. Recruit the network, get the sign-off, ship the credibility.

**4. Risk reversal, stated loudly.**
"30-day, 100% Money-Back **Bulletproof Guarantee®**" — named, trademarked, repeated on every page, with a phone number.
→ *For us:* we're legally barred from promising outcomes (correctly — `guarantee/expedite/fast-track` are banned words in `AGENTS.md`). But we *can* guarantee **process**: e.g. *"If we file a packet that gets returned as incomplete, we do the refile free."* That's a promise about our own work, not NYPD's decision — it's compliant, it's differentiating, and CP-5 already makes it nearly free to offer. This is the single best conversion lever available to us.

**5. Quantified trust, honestly footnoted.**
"705,012 active members · 124,018 crimes stopped · 180,103 lives saved" — with a full methodology footnote (survey n=36,085, ±1% at 99%, "USCCA did not independently verify"). The numbers do the persuading; the footnote does the ethics.
→ *For us:* we have the raw material and the discipline. **"0 filed incomplete"** is already our claim — make it a live, dated, methodology-footnoted counter on the homepage (cases filed, packets assembled, documents verified, average days from intake to filing). Never an approval rate.

### Tier 2 — adapt, don't copy

**6. Member stories.** "True Stories of Self Defense" — Wayne's Story, Scott's Story, William's Story. Named, photographed, narrative. Devastatingly effective social proof.
→ *For us:* not self-defense stories — **application stories**. "The sealed arrest he almost didn't disclose." "The reference letter that came back three weeks late." Anonymized, consented, and they double as candor-doctrine teaching. This is our *most* on-brand borrowable asset.

**7. Free attorney-led seminars ("plus, get a free book!").** Pure lead-gen dressed as public education, run at scale.
→ *For us:* a **free monthly "NYC CCW: what actually gets people denied" webinar**, co-hosted with an attorney from the network. Feeds `/book`. Low cost, high intent.

**8. The reciprocity map.** The highest-traffic asset in this entire category, bar none.
→ *For us:* don't fight them on 50-state reciprocity. But **NY reciprocity is uniquely brutal** (a NY license is honored almost nowhere; NY honors almost nothing) and it's the #1 question a newly licensed NYC holder asks. A **"Where can my NYC license actually take me?"** tool on Concealed Knowledge is a defensible, narrow, winnable version of their biggest asset.

**9. Instructor certification as a product.** `academy-qualifications` sells the cert *and* the lead flow ("access to our online tools that help more people find their classes"). Instructors pay to join and then market USCCA for free.
→ *For us:* we take 10% of instructor bookings. USCCA's insight is that **the lead flow is the product instructors actually pay for**. Lean into that in instructor recruiting copy — it's the marketplace flywheel.

**10. The mobile app.** They have one; it's in the resources nav.
→ *For us:* low priority. A PWA of `/portal` (checklist + document upload from your phone camera) would matter far more than a native app — and HEIC upload is already a known bug worth fixing regardless (`CCW_V3_PUNCHLIST.md`).

### Tier 3 — do NOT copy

- **Self-defense liability insurance.** This is *why they can't sell in NY*. Do not go near it.
- **The fear-based register.** "Have you ever genuinely feared for your life?" works for a national mass-market membership. It would actively damage both of our brands — Concealed Knowledge's whole thesis is the *opposite* (calm, porcelain/cobalt, anti-tactical), and CARRY sells precision to people who are already committed. Our fear is bureaucratic, not violent: *the delay is the danger.*
- **The store / gear commerce.** Concealed Knowledge's credibility rests on "nothing for sale, no affiliate links." That constraint is an asset. Don't trade it.
- **Sloppy numbers.** Their member count contradicts itself across a single page. Our whole differentiator is that our numbers are dated and sourced.

---

## 6. Gaps in *our* stack that USCCA makes obvious

Cross-referencing their surfaces against `CCW_V3_PUNCHLIST.md` / `CCW_V4_BUILD_PROMPT.md`:

| Gap | Evidence | Why USCCA makes it urgent |
|---|---|---|
| **No analytics anywhere** | No PostHog/Plausible/GA in either repo | We cannot see the funnel we're trying to beat them on. Fix first — cookieless, privacy-respecting (CK already has a disabled `track()` hook). |
| **Placeholder contact info in prod** | `config/brand.ts`: `carry.example`, `(212) 555-0142` | USCCA puts a real phone number in every footer and answers 24/7. A fake number is a trust-killer on a page selling $1,999 of trust. **Fix today.** |
| **No attorney sign-off** | All registry rules `needs_legal_review = true`; CK legal copy "PENDING EXPERT REVIEW" | Their Attorney Network is the fix *and* the growth channel. |
| **Stripe & Resend both flag-gated off** | `STRIPE_ENABLED=false`, no `RESEND_API_KEY` | They have a 3-click checkout. We have "request an invoice." |
| **No free/logged-out value tier** | Portal is auth-only | Their free account is the top of a funnel we don't have. |
| **No public instructor directory** | Marketplace is inside `/portal` | Their class-search is public, embeddable, and SEO-indexed. |
| **No community / no retention loop** | — | Their forum + magazine + subscription = LTV. We have a 3-year renewal reminder and nothing in between. |
| **Domain not connected** | CK still on `/Ccw` GitHub Pages basename; `concealedknowledge.com` bought but unpointed | Every day on a project-page basename is SEO left on the table against a WordPress site with 20 years of domain authority. **Ship `CK-CONNECT-DOMAIN`.** |

---

## 7. Recommended plays, in order

1. **Fix the trust basics.** Real phone/email in `config/brand.ts`. Turn on analytics. Point `concealedknowledge.com`. *(days)*
2. **Build the NYC-vs-USCCA content wedge.** A sourced, dated page on Concealed Knowledge showing exactly what national guides (unnamed or named — your call) get wrong about NYC fees, authority, references, and timeline. Link into CARRY. *(1 week)*
3. **Ship a free CARRY account.** Eligibility quiz → saved personalized document checklist → email on rule change. Requires Resend on. *(2 weeks)*
4. **Launch the NYC Firearms Attorney Network.** Free to join, public directory, and it clears the `needs_legal_review` blocker across the whole registry. *(4 weeks, mostly outbound)*
5. **Public, embeddable instructor finder.** Unlock the marketplace supply side and give instructors a reason to link to us. *(3 weeks)*
6. **Name and publish a process guarantee** (refile-free-if-returned-incomplete), backed by the CP-5 gate. *(days — it's a copy + policy change)*
7. **"Where can my NYC license take me?"** reciprocity tool on CK. *(3 weeks)*
8. **Application stories.** 5 anonymized, consented case narratives. *(ongoing)*

---

## 8. The one-line read

USCCA is a **national, insurance-backed subscription** that is *legally forbidden from selling to New Yorkers* — yet still owns the New York search results with content that is wrong about our city. They have the funnel and no offer. We have the offer and no funnel. **Everything above is about closing that gap before someone else notices it.**

---

## Sources

- [usconcealedcarry.com](https://www.usconcealedcarry.com/) — homepage, stats, membership funnel
- [Membership & pricing](https://www.usconcealedcarry.com/membership/) — tiers, insurance, **NY/NJ/WA exclusion**
- [How to get a CCW permit](https://www.usconcealedcarry.com/resources/how-to-get-a-concealed-carry-permit/) — 50-state hub
- [New York permit page](https://www.usconcealedcarry.com/resources/how-to-get-a-concealed-carry-permit/new-york/) — the stale/incorrect NY content
- [Resources hub](https://www.usconcealedcarry.com/resources/) — content inventory
- [Partner program](https://www.usconcealedcarry.com/partner/) — instructors, ranges, Attorney Network, affiliates
