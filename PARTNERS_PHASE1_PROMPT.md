# Partners: the directory page and Ethan Brecher's profile

Phase 1 of the attorney referral partnership. Two public marketing pages, one data
file, and the wiring that keeps them from being orphaned. **No portal or admin work
in this phase** — that is Phase 2, scoped at the bottom so you build Phase 1 in a way
that does not have to be undone.

Visual reference: `partnership/brecher-partnership.html` (mockup 01 is the partner
card; the profile page is new and specified here).

---

## What already exists — use it, do not reinvent

```
lib/marketing-routes.ts            THE route registry — sitemap, nav, footer and
                                   llms.txt all read from it. A page not registered
                                   here is orphaned by construction.
lib/seo.ts                         buildMetadata()
components/marketing/page-hero     PageHero
components/marketing/breadcrumbs   Breadcrumbs
components/marketing/page-blocks   DirectAnswer, FaqBlock, RelatedLinks
components/marketing/json-ld       JsonLd + schema builders (instructorProfileSchema
                                   is the pattern to copy)
app/(marketing)/instructors/[slug] THE precedent for a person profile page — same
                                   shape: generateStaticParams, generateMetadata,
                                   breadcrumbs, JSON-LD, RelatedLinks
app/(marketing)/do-i-need-a-lawyer Already promises "We can refer you to a New York-
                                   licensed attorney." That promise currently goes
                                   nowhere. This work is what fulfils it.
config/brand.ts                    Brand tokens + the standing legal disclaimer
```

---

# PART 0 — The data layer (do this first)

One partner today, but never write a one-off page. Everything both pages render
comes from a typed config.

```
config/partners.ts        ← NEW, the single source of truth

export interface PartnerCredential { label: string; detail?: string }
export interface PartnerService    { title: string; detail: string }
export interface PartnerFaq        { q: string; a: string }

export interface Partner {
  slug: string                 // "ethanbrecher" — also the public URL segment
  published: boolean           // false → page 404s and is excluded from sitemap/nav
  name: string
  credentials_suffix: string   // "Esq."
  firm: string
  role: string                 // "Founder"
  headline: string             // one line, what he does for our applicants
  bio: string[]                // paragraphs
  photo: { src: string; alt: string }
  address: { street: string; city: string; state: string; zip: string }
  phone: string
  email: string
  website: string
  admissions: string[]
  education: PartnerCredential[]
  honors: PartnerCredential[]
  serves: string[]             // states
  yearsInPractice: number
  services: PartnerService[]   // what he handles for OUR applicants
  qualifyingQuestions: string[]// the "questions he can answer that we can't" list
  faqs: PartnerFaq[]
  rate: { amount: number; unit: string }   // { amount: 300, unit: "hour" }
  bookingUrl: string           // HIS scheduler — never ours
}

export const PARTNERS: Partner[] = [ /* Ethan */ ]
export const partnerBySlug = (slug: string) => PARTNERS.find(p => p.slug === slug && p.published) ?? null
export const publishedPartners = () => PARTNERS.filter(p => p.published)
```

```
CONTENT GATE — build this into the type, not into a checklist.
Ship with `published: false`. Every credential, the rate, the bio and the booking
URL must be confirmed by him IN WRITING before it flips to true. A profile page
making claims about a real attorney that he has not approved is the one failure
mode here that actually costs something.
While published is false: the route returns notFound(), the sitemap omits it, and
nav/footer links do not render. Verify that, don't assume it.
```

Seed content is in the mockup. Do not invent credentials — if a field has no
confirmed value, leave it out of the config rather than filling it with plausible text.

---

# PART 1 — `/partners` — the directory

`app/(marketing)/partners/page.tsx`

```
· PageHero — eyebrow "Our Partners", title, subtitle.
· A short honest framing paragraph (DirectAnswer block):
    we prepare applications; we are not a law firm; we do not represent anyone
    before the NYPD License Division; when a case needs a lawyer we would rather
    hand you to someone we would use ourselves than leave you searching.
· One PartnerCard per published partner (see below), mapped from publishedPartners().
· RelatedLinks → /do-i-need-a-lawyer, /denied-appeal, /disqualifiers, /contact.
· Empty state: if publishedPartners() is empty the page must still render sensibly
  (a short "we're finalising our partner network" note) rather than an empty grid.
```

`components/marketing/partner-card.tsx` — reusable, used on the directory and
anywhere else a partner is surfaced later:

```
LAYOUT   two columns at ≥768px, stacked below.
LEFT     portrait (next/image, fixed aspect, rounded to the brand radius),
         then a compact credential list: Admitted / J.D. / B.A. / Serves.
RIGHT    name + suffix · firm · address line
         credential badges (years in practice, Super Lawyers, Avvo, AV, ALI, 2d Cir.)
         short bio paragraph
         "What he handles for our applicants" — two-column list of services
         footer row: rate on the left, [Read his background] [Schedule a call] right
DISCLAIMER strip beneath the card, muted, always rendered:
         independent attorney · not our employee or agent · retaining him creates an
         attorney–client relationship with his firm alone · we receive no share of
         his fees · nothing here is legal advice.
```

The disclaimer is part of the card component, not the page — so it cannot be
forgotten anywhere the card is reused.

---

# PART 2 — `/ethanbrecher` — the profile page

The user asked for a top-level vanity URL. Honour it, with one structural caution.

```
ROUTE   app/(marketing)/[partnerSlug]/page.tsx is TOO GREEDY — a catch-all at the
        marketing root will swallow every future one-word marketing page.
        Instead: app/(marketing)/ethanbrecher/page.tsx as a real route that reads
        partnerBySlug("ethanbrecher"), plus app/(marketing)/partners/[slug]/page.tsx
        for the general case. Add a permanent redirect /partners/ethanbrecher →
        /ethanbrecher in next.config so there is exactly ONE canonical URL and
        both spellings resolve. Set the canonical tag to /ethanbrecher.
        If a second partner is added later they get the same treatment: an explicit
        top-level route file, not a root catch-all.
```

Sections, top to bottom:

```
1  BREADCRUMBS      Home › Partners › Ethan A. Brecher
2  PROFILE HERO     Two columns ≥1024px, stacked below.
                    LEFT  eyebrow "Independent legal counsel", name in the display
                          face, firm, role, one-line headline, then the credential
                          badge row, then [Schedule a call · $300/hour] and a
                          secondary [Visit his firm's site].
                    RIGHT portrait. Give it a real treatment — the marketing theme
                          is warm paper, so a soft tonal panel behind the portrait
                          rather than a bare image on the page background.
3  BACKGROUND       The bio paragraphs, set at a comfortable measure (~65ch).
4  CREDENTIALS      A definition-style grid: Admissions · Education · Honors ·
                    Serves · Years in practice. Not cards — this is reference data
                    and reads better as a list with hairline rules.
5  WHAT HE HANDLES  The services list, each with its one-line detail. This is the
                    section our applicants actually came for, so give it weight.
6  WHEN TO CALL HIM The qualifyingQuestions list — the questions he can answer and
                    we cannot. Render as a plain list, not an accordion; on a
                    dedicated page there is no reason to hide them.
7  HOW IT WORKS     Three steps: book on his calendar → he runs his own intake and
                    conflicts check → he bills you directly. Make it unmistakable
                    that we are not in the middle.
8  FAQ              FaqBlock, from partner.faqs. Must include "Are you affiliated
                    with Gun License NYC?" answered honestly.
9  CTA BAND         Rate, [Schedule a call], phone and email as plain text links.
10 DISCLAIMER       The full independence disclaimer, plus the standing
                    brand.disclaimer from config/brand.ts.
11 RELATED LINKS    /do-i-need-a-lawyer, /denied-appeal, /partners, /contact.
```

---

# PART 3 — Wiring (the part that is easy to skip and expensive to miss)

```
1. lib/marketing-routes.ts — register BOTH pages.
     /partners       label "Our Partners", footerGroup "Service", nav: true?
                     (decide with the existing nav density; footer at minimum)
     /ethanbrecher   label "Ethan A. Brecher, Esq.", footerGroup "Service"
   Both get an honest `lastReviewed` and an `llmsDescription`.
   If a partner is unpublished its route must not appear — filter at the point the
   registry is consumed, or keep partner routes out of the static list and append
   them dynamically from publishedPartners(). Pick one and make it consistent
   across sitemap, footer and llms.txt.

2. app/sitemap.ts — partner profiles appended the same way instructor profiles are.

3. Nav / footer — they read the registry, so this should follow automatically.
   Verify it actually does rather than assuming.

4. JSON-LD — add `attorneyProfileSchema(partner)` to components/marketing/json-ld,
   modelled on instructorProfileSchema.
     · schema.org Person with jobTitle "Attorney", worksFor → his OWN LegalService
       node (name, address, telephone, url), alumniOf for the schools.
     · Do NOT nest him under our organizationSchema and do NOT list him as an
       employee, member or department of ours. He is a separate entity that we
       link to. Getting this wrong is a structured-data claim that we have an
       attorney on staff.
     · breadcrumbSchema for the trail.

5. /do-i-need-a-lawyer — the page already says we can refer you to a New York-
   licensed attorney. Add a link to /partners in that answer and in its
   RelatedLinks. This is the highest-intent internal link on the site for this page;
   do not leave it unbuilt.

6. OG image — the existing /og route should produce a card for both pages with the
   partner's name. Check whether it needs a case for these routes.
```

---

# PART 4 — Compliance guardrails (non-negotiable)

```
· No "expedite", "fast-track", "guarantee", "approval rate", "insider" ANYWHERE on
  these pages — including in quoted copy from his own site, which does use
  "expedite" about writing to the License Division once the statutory deadline has
  passed. That is proper for an attorney and improper for us. Do not quote it.
· Never describe him as "our attorney", "our legal team", "in-house counsel", or
  say we work "with counsel" in a way that implies he acts for us. He is an
  independent attorney we refer to.
· No fee splitting, no commission, no "we receive a referral fee" — and say so
  affirmatively on both pages.
· The booking button links to HIS scheduler in a new tab (rel="noreferrer"). We
  never take a retainer, hold his calendar, collect his intake, or accept payment
  on his behalf. No form on our side that collects case facts for him.
· The rate is displayed as HIS rate, sourced from config, with "billed by his
  office" adjacent to it.
· config/brand.ts `disclaimer` renders on both pages.
· Nothing on these pages may state or imply that hiring him improves the odds of
  approval.
```

---

# PART 5 — Design and responsiveness

```
· Marketing surfaces use the warm-paper light theme. Colors ONLY from brand tokens
  (bg-card, text-text-mid, border-hairline, text-brass …). No hardcoded hex.
· Typography: the display face for name and section headings, body face for prose,
  mono for eyebrows and credential labels — matching the rest of the marketing site.
· Breakpoints: single column < 768px; card goes two-column ≥ 768px; profile hero
  goes two-column ≥ 1024px. Test at 375, 768, 1024 and 1440.
· Portrait: next/image with explicit width/height, `sizes`, and priority on the
  profile hero only. Never a raw <img>.
· Credential badges must wrap gracefully — six of them at 375px cannot overflow.
· Any reveal or motion respects prefers-reduced-motion, per the existing convention.
· Focus states visible on every link and button.
· No horizontal body scroll at any width.
```

---

# VERIFY

```
 1. /partners and /ethanbrecher both render, and /partners/ethanbrecher redirects
    to /ethanbrecher with a 308.
 2. Flip published to false → both routes 404, the pages leave the sitemap, and no
    nav or footer link renders. Flip back → everything returns.
 3. The page renders entirely from config/partners.ts. Grep the two page files for
    "Brecher" — his name should appear in neither.
 4. 375 / 768 / 1024 / 1440: no overflow, badges wrap, hero stacks, portrait scales.
 5. The independence disclaimer appears on the card AND on the profile page.
 6. Structured data validates, and he is NOT nested inside our organization node.
 7. /do-i-need-a-lawyer links to /partners.
 8. No banned word appears on either page — grep for expedite, guarantee,
    fast-track, approval rate.
 9. Lighthouse: no CLS from the portrait; the profile page's LCP is the portrait
    or the H1, not a late-loading font.
10. The booking link opens his scheduler in a new tab and no form on our side
    collects case details for him.
```

# DO NOT

- Do not hardcode his details into JSX. One partner today; the second one must cost
  a config object, not a new page.
- Do not publish unconfirmed credentials. `published: false` until he signs off.
- Do not add a root catch-all route under (marketing).
- Do not nest him inside our organization's structured data.
- Do not take a retainer, hold his calendar, collect his intake, or split a fee.
- Do not imply he is our employee, our counsel, or that he improves anyone's odds.
- Do not touch the portal or admin in this phase.

---

# PHASE 2 — scoped now so Phase 1 does not box us in (DO NOT BUILD YET)

```
A. The in-portal card — "Have a legal question?" at the foot of the checklist on
   both Full Concierge and Self-Guided. Reads the SAME config/partners.ts; the
   qualifyingQuestions list becomes a collapsed disclosure there. This is why the
   partner data lives in config and not in the page.
B. Admin visibility — whether a case has been referred, so staff never re-answer a
   question that is already with counsel. Read-only; we never see his file.
C. The attorney-review track — connect the existing intake.attorney_review_required
   seam to the partner record so a flagged case surfaces the referral automatically.
D. His own website rebuild — a separate engagement, not in this repo.
```
