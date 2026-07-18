# CARRY — Homepage V5 Visual Overhaul
### Diagnosis + copy-paste Claude Code prompt

---

## Part 1 — What's actually wrong (read this first, it's the evidence base)

I read `app/(marketing)/page.tsx`, the marketing components, `config/brand.ts` and `app/globals.css`. Your instinct is right, and here is the mechanical reason why:

**1. The whole page is one shape, repeated eight times.**
Every section is: `SectionEyebrow` → `font-display text-3xl/4xl` headline → a paragraph → a grid of `rounded-lg border border-hairline bg-surface-1` boxes. Same `max-w-6xl`, same `px-4`, same `py-20`, every single time. There are roughly **45 bordered rectangles on one page.** The eye has nowhere to rest and nothing to be surprised by. There is no scale contrast, no full-bleed moment, no image, no change of rhythm — so nothing reads as a highlight, because everything is a highlight.

**2. It's ~900 words of homework.**
The "hard truth" section is six paragraphs of dense prose. `RequirementsWall` renders **24 items with legal citations** (`38 RCNY §5-03`, `Penal Law §400.00(19)`…). On desktop that's three columns; **on a 390px phone it collapses to one column and becomes 24 identical grey cards of legalese in a row.** That's the single worst moment on the site, and it's the section you meant as the centerpiece.

**3. The emotional payload is anxiety, start to finish.**
"The delay is the danger" → "here's what it actually takes" → fees → training that expires → "what happens if you're denied." Every section is an obligation. Nothing on the page delivers *relief*, *prestige*, or *beauty* — the three things that actually make someone want to hand you money.

**4. Zero imagery, zero texture.** 100% type and borders. Two font sizes carry the entire page.

**5. You already own a gorgeous design system and the homepage doesn't use it.**
`hero-aura.tsx` (aurora mesh + starfield + light sweep + parallax), `ticker.tsx`, `journey-scroll.tsx`, `magnetic.tsx`, and the `.text-prestige`, `.brass-edge`, `animate-aurora-*`, `animate-hero-sweep`, `animate-star-drift` utilities in `globals.css` — **none of them are imported by the homepage.** Someone built the cinema and then shipped the spreadsheet.

**6. Mobile is an afterthought.** The hero's product panel sits in a `lg:` grid column, so on a phone the one visually exciting thing on the page falls below a wall of text. Grids collapse to single columns, turning the page into ~50 stacked identical cards.

**The fix isn't decoration. It's rhythm, scale, and subtraction.**

---

## Part 2 — The prompt

> Run these in order. Each phase stops for your review — look at it on your phone before running the next one. Don't paste all four at once.

---

### PHASE 0 — Context & guardrails (run first, no edits)

```
We are doing a full visual overhaul of the CARRY homepage. Before any edits, read:

- AGENTS.md                              (CRITICAL: this is Next.js 16 — APIs differ from your training data. Read node_modules/next/dist/docs/ before writing Next-specific code. Also contains non-negotiable legal guardrails.)
- config/brand.ts                        (single source of truth: paletteDark, paletteLight, brand.disclaimer)
- app/globals.css                        (theme mapping + the signature utilities and keyframes)
- app/layout.tsx, app/(marketing)/layout.tsx
- app/(marketing)/page.tsx               (the page we're rebuilding)
- components/theme/light-backdrop.tsx
- components/marketing/*.tsx             (note: hero-aura, ticker, journey-scroll, magnetic are ALL currently unused)
- components/marketing/showcase/*.tsx
- components/ui/hud-stat.tsx, components/ui/reticle-progress.tsx

MY DIAGNOSIS OF THE CURRENT PAGE — internalize this, it's what we're fixing:
1. Every section is the identical shape: eyebrow → 3xl headline → paragraph → grid of bordered cards. ~45 bordered rectangles on one page. No scale contrast, no full-bleed, no rhythm, no imagery.
2. ~900 words. The RequirementsWall dumps 24 legal citations, which on a 390px phone becomes 24 stacked grey cards of legalese.
3. The emotional register is pure anxiety and obligation. Nothing delivers relief, prestige, or beauty.
4. The best assets in the repo (hero-aura's aurora/starfield/sweep, ticker, journey-scroll, magnetic, .text-prestige, .brass-edge, the aurora/sweep keyframes) are unused on the homepage.

HARD RULES FOR EVERY PHASE:
1. MOBILE IS THE PRODUCT. Design and verify at 390px width FIRST, desktop second. No horizontal scroll anywhere. Tap targets >= 44px. Headlines must not clip or overflow. If a decision trades desktop polish for mobile impact, take the mobile side.
2. NEVER hardcode a color. Everything comes from config/brand.ts via CSS vars / Tailwind tokens (bg-brass, text-signal, border-hairline, bg-surface-2, text-prestige…). Need a new color? Add it to the palette in brand.ts.
3. LEGAL GUARDRAILS ARE ABSOLUTE (see AGENTS.md). Never use the words guarantee, expedite, fast-track, insider, or approval rate. Never imply NYPD endorsement or that we represent or file for the applicant. brand.disclaimer must remain visible on the homepage. The candor position (sealed/dismissed arrests ARE disclosed) must survive the rewrite. Do not invent statistics, testimonials, client counts, or citations.
4. Motion: transform/opacity only, CSS over JS, no requestAnimationFrame render loops. Every animation degrades to a calm static state under prefers-reduced-motion. No jank on a mid-range phone.
5. Accessibility: AA contrast on all text, decorative layers aria-hidden, visible focus states, semantic headings.
6. Don't break the build: `pnpm build` + `pnpm test` must pass at the end of every phase.

Don't edit anything yet. Reply with: (a) confirmation you've read the files, (b) a 5-bullet summary of the current color system, theme switching (LightBackdrop vs .dark), and what hero-aura.tsx actually renders, (c) anything in my diagnosis you think is wrong.
```

---

### PHASE 1 — Flip the register: cinematic dark + section rhythm

```
DECISION: the homepage moves from the warm-paper light theme to the CINEMATIC DARK register (obsidian + brass + ice + signal). The product IS the dark instrument; the marketing page should feel like it. Interior marketing pages (pricing, faq, how-it-works, blog) stay on paper for now — this phase must not break them.

1. Give the home route its own dark shell. Render the homepage inside the `.dark` wrapper with a DarkBackdrop (the aurora/starfield/vignette composition), not LightBackdrop. Do this WITHOUT converting the other marketing routes — scope it to the home route (e.g. the home page renders its own themed wrapper, or move the backdrop choice out of app/(marketing)/layout.tsx and into each page). Whatever pattern you pick, app/(marketing)/pricing, /faq, /how-it-works and /blog must render EXACTLY as they do today. Verify each one.

2. Make MarketingNav theme-aware: transparent over the hero, then a glass-premium bar with a hairline border once scrolled past ~80px. Dark tokens on the homepage. Mobile: logo + one brass "Check eligibility" pill + hamburger. Nothing else.

3. ESTABLISH A RHYTHM. This is the core of the fix — sections must stop being the same shape. Codify a section scale and alternate it:
   - Vertical rhythm alternates: py-16 → py-32 → py-20 → py-28. Never four py-20s in a row.
   - Background alternates: obsidian void → surface-1 panel → full-bleed edge-to-edge → void.
   - Container width alternates: max-w-6xl → full-bleed → max-w-3xl (a narrow, centered, high-contrast moment).
   - Type scale gets a real top end: the hero H1 uses clamp() up to ~72px on desktop / ~40px at 390px; section H2s land ~34–44px; introduce ONE display numeral moment at 120px+ (see Phase 2, "THE COUNT").
   Write these as documented utilities/tokens in globals.css so the rest of the site can inherit them.

4. Turn on the assets we already own. Bring back .text-prestige (hero H1), .brass-edge (featured pricing card only), the aurora/starfield/hero-sweep keyframes, and hero-aura.tsx (refine it, don't rewrite it). Add a `.section-void` / `.section-panel` pair so alternating backgrounds are one class, not ad-hoc divs.

Run pnpm build. Then show me the home page and every other marketing page at 390px and 1440px so I can confirm nothing regressed.
```

---

### PHASE 2 — Rebuild the page: subtract, then dramatize

```
Rebuild app/(marketing)/page.tsx. Target: ~250 words of body copy on the entire page (down from ~900). Every cut section's content moves to /how-it-works or /faq — nothing is lost, it's relocated. Add internal links so the detail is one tap away.

The new page, in order. NOTE THE SHAPE OF EACH SECTION — no two consecutive sections may share a shape:

1) HERO — full-bleed obsidian, ~88svh on mobile (never 100vh — mobile browser chrome), centered.
   - HeroAura behind it (aurora mesh + starfield + one slow light sweep + vignette). Recessive. It must never fight the headline.
   - Eyebrow (mono, engraved): "NYC · concealed carry"
   - H1 with .text-prestige, clamp()'d, text-balance, tight leading:
       "The whole process. Handled."
   - Sub — ONE sentence, max 25 words:
       "A NYC carry license is 24 documents, about six months, and one missing page from starting over. CARRY runs it as a single tracked case."
   - ONE primary CTA ("Check your eligibility →", wrapped in Magnetic, min-h 48px, full-width on mobile) + one quiet text link ("See how it works"). Two buttons of equal weight is a decision the user has to make; don't make them.
   - Below the fold line: CaseFileShowcase, scaled and CROPPED by the viewport edge so it peeks and invites the scroll. On mobile it sits under the CTA, scaled to fit 390px with no horizontal scroll, with a gradient fade at its bottom edge. Optionally scroll-linked: it rises and settles into full opacity as you scroll (transform/opacity only, reduced-motion → static).
   - DELETE the three <Fact> boxes from the hero.

2) PROOF STRIP — a 1-line-tall marquee. Different shape from everything else on the page.
   - Use the existing components/marketing/ticker.tsx (currently unused). Hairline top/bottom, mono micro-caps, slow drift, pauses under reduced-motion. Verifiable claims only — the ones already in that file.

3) THE COUNT — this REPLACES components/marketing/showcase/requirements-wall.tsx on the homepage. This is the page's centerpiece and its one true "wow."
   - Full-bleed. A single enormous display numeral — "24" — at 120px+ (clamp up to ~200px on desktop), in metallic prestige fill.
   - Behind/around it: the 24 documents rendered as a FAN or STACK of paper cards that assemble on scroll-into-view (staggered, transform+opacity, settles in <900ms; reduced-motion → renders assembled). Abstract — they don't need legible text at rest.
   - Beside it: 5 (five, not 24) sample requirement chips with their citations, and a link: "See all 24 requirements →" pointing to /how-it-works.
   - Headline: "Twenty-four documents. Tracked to the citation."  Body: ONE sentence.
   - Move the full 24-item citation list to /how-it-works (keep RequirementsWall as a component, just render it THERE, not here). The citation wall is real proof of rigor — it's just not a first-date conversation.

4) THE MACHINE — horizontal, not a grid. Kills the card-stack monotony.
   - Reuse/adapt components/marketing/journey-scroll.tsx: 5 phases, huge ghosted numerals (01…05), a connecting brass hairline rail.
   - Desktop: horizontal timeline. Mobile: a snap-scroll carousel (scroll-snap-type: x mandatory) with a progress rail — NOT a vertical stack of 5 cards. One line of copy per phase, max 12 words.

5) THE REALITY — replaces the six <Truth> paragraph cards. Same candor, one tenth the words, zero cards.
   - A max-w-3xl centered list with hairline dividers (no borders, no boxes, no shadows). Each row: a brass fact on the left, a 6-word clarifier on the right.
       "~6 months"        — start to decision letter. No one can expedite it, including us.
       "$XXX + $XX"       — government fees, paid directly to them. (Pull the real values from getFees(); never hardcode.)
       "18 hours"         — training, and it expires 6 months after it's dated.
       "4 references"     — notarized. We send them a link.
       "1 affidavit"      — per adult in your home. We chase them, not you.
       "1 interview"      — yours. You submit your own application. That's the law.
   - Headline: "No surprises. Here's the real shape of it."

6) CANDOR — the narrow, high-contrast, centered moment. max-w-3xl, generous whitespace, larger body type (text-xl), no card, no image.
   - "Sealed and dismissed arrests are still disclosed."
   - Two short sentences: New York requires it; hiding one is how good applications die. We help you explain it, never omit it. When it's a lawyer's question, we point you to a lawyer.
   - Keep ConsultantShowcase but as a small inline quote-panel, not a co-equal grid column.

7) PRICING — ONE all-in total that expands into a full cost breakdown. This is the section that earns trust; make it the most honest thing on the page.

   COLLAPSED (default state):
   - Eyebrow: "What it costs". Headline: "One number. Nothing hidden behind it."
   - A single brass-edged glass-premium card showing the featured package's ALL-IN TOTAL as one large prestige-gradient numeral (~40px mobile, ~56px desktop, tabular-nums):
       CARRY concierge service ($1,000) + NYPD application fee + DCJS fingerprint fee = the total.
     With the seeded fees ($340 + $88.25) that renders as $1,428.25 — but NEVER hardcode any of these. The service price comes from getActivePackages() (set the concierge package's price_cents to 100000 via a migration/seed edit, not in the component) and the government fees come from getFees(). The total is computed: package.priceCents + fees.applicationCents + fees.fingerprintCents. If a fee changes in the admin table, this number changes with it.
   - One line under it: "$1,000 to CARRY. $428.25 in government fees, paid directly to them." (values interpolated, not hardcoded).
   - A disclosure row: "See the breakdown" + chevron. Full-width, min-h 44px.

   EXPANDED (on click/tap):
   - Animates open (grid-template-rows 0fr → 1fr, or max-height with a measured height — no layout jank, no scroll jump). Chevron rotates. Reduced-motion → instant, no transition.
   - Two labeled groups, hairline-divided rows, amounts right-aligned and tabular:
       PAID TO CARRY
         Concierge service — "Every document, deadline and filing packet" — $1,000
       PAID TO THE GOVERNMENT
         NYPD application fee — "Direct to NYPD · never collected by us" — {fees.applicationFee}
         DCJS fingerprint fee — "Direct to DCJS" — {fees.fingerprintFee}
       TOTAL — the all-in figure, in brass.
   - A quiet signal-tinted note at the bottom: "Your 18-hour training course is billed by your instructor and isn't included above." (Do NOT invent a training price — we don't set it.)
   - The government-fee rows must be visually subordinate (muted text) so it's unmistakable that CARRY's fee is $1,000 and the rest is not ours.

   ACCESSIBILITY + STATE:
   - Real <button aria-expanded> controlling the panel (or <details>/<summary> styled) — not a div with onClick. Keyboard operable, focus-visible ring, panel content not hidden from AT when open.
   - This is a client component; keep the data fetching in the server page and pass the package + fees down as props.

   THE OTHER PACKAGES: do not render 4 co-equal cards. Below the total card, a single quiet line: "Other packages →" linking to /pricing. One decision on the homepage, not four.

   LEGAL: the phrase "paid directly to them, never collected by us" (or equivalent) must appear. Showing an all-in total is fine and good; implying CARRY collects or controls the government fees is not.

8) TRUST BAND — the current two big glass boxes ("what we are / if you're denied") become ONE slim, quiet band: a hairline-bordered strip with the ✓/✕ list compressed to single lines, plus brand.disclaimer in small text. Legally complete, visually subordinate. It is furniture, not a feature.

9) CLOSING — full-bleed aurora reprise, near-black, centered, generous.
   - "Find out if you qualify. Two minutes."  + one brass CTA. Nothing else.

10) MOBILE STICKY CTA — a bottom bar that fades in once the hero scrolls out: "Check eligibility →", brass, safe-area-inset aware, hidden on desktop, hidden when the closing CTA is in view. This is the single highest-leverage mobile conversion element on the page.

DELETE from the homepage: the <Fact>, <Truth>, and <WeAre> helper components (or reduce them to the new shapes), the 6-card truth grid, the 24-card citation wall, and the two large trust glass boxes.

Run pnpm build && pnpm test. Then show me screenshots at 390px (full-page) and 1440px.
```

---

### PHASE 3 — Motion, polish, and the mobile pass

```
Now make it feel expensive. Restraint is the whole game: cinematic means SLOW and FEW, not busy.

1. MOTION SYSTEM. Codify it in globals.css instead of ad-hoc per-component values:
   - One easing curve for entrances (cubic-bezier(0.22, 1, 0.36, 1)), one duration scale (fast 180ms / base 320ms / slow 640ms / ambient 12s+).
   - Reveal: raise the stagger to feel intentional (60–90ms), never more than ~5 items in one stagger chain.
   - Ambient layers (aurora 38–44s, starfield 60s, sweep every ~12s) — these should be almost subliminal.
   - Magnetic on the primary CTA only. Pointer-fine devices only.
   - EVERY one of these must freeze/no-op under prefers-reduced-motion. Verify by toggling the OS setting and re-screenshotting.

2. THE MOBILE PASS (do this as a dedicated sweep at 390px, not as an afterthought):
   - Full-page screenshot at 390×844. Check: no horizontal scroll, H1 doesn't clip, every tap target ≥44px, the sticky CTA doesn't cover content, the case-file panel doesn't overflow, carousels snap cleanly, safe-area insets respected.
   - Line length: body copy 45–75 chars. Headline max ~5 lines on mobile.
   - Fix any layout shift (CLS) from the ambient layers or the fonts.

3. CONSISTENCY SWEEP: grep the homepage for hardcoded colors (`#`, `rgba(`, arbitrary `[...]` color values) — there should be zero. Radii, hairlines, and shadow depths must all come from tokens. Any new token goes in brand.ts with a one-line comment explaining it.

4. PERFORMANCE: Lighthouse mobile. Ambient layers must not tank it. Anything heavy is lazy/gated. Report the before/after scores.

Then give me: a summary of every file changed, before/after screenshots at 390px and 1440px, and an honest list of anything you'd still improve.
```

---

### PHASE 4 — Verification (run as a separate, adversarial pass)

```
Act as a hostile reviewer of the work you just did. Do not defend it.

1. LEGAL: grep the homepage and every new component for "guarantee", "expedite", "fast-track", "insider", "approval rate", "endorsed", "we file", "on your behalf". Confirm brand.disclaimer renders. Confirm the candor position (sealed/dismissed arrests ARE disclosed) survived the copy cuts. Confirm no invented statistics, testimonials, or citations were introduced. Report any hit verbatim.
2. REGRESSION: /pricing, /faq, /how-it-works, /blog, /eligibility, /contact, the portal and the admin all still render correctly and on their intended theme. pnpm build && pnpm test pass.
2b. PRICING MATH: the all-in total on the homepage must equal package.priceCents + fees.applicationCents + fees.fingerprintCents, computed at render — grep for any hardcoded "1,428", "1000", "340" or "88.25" in components and report every hit. Change a fee in the `fees` table and confirm the homepage total moves with it.
3. A11Y: run an axe/Lighthouse a11y check. AA contrast on every text/background pair on the new dark homepage (brass on obsidian is the risky one — check it). Keyboard-navigate the whole page; every interactive element has a visible focus ring. Decorative layers are aria-hidden. Heading order is semantic.
4. REDUCED MOTION: with prefers-reduced-motion on, screenshot the page. It must look like a deliberate, calm, static composition — not a broken one.
5. THE HONEST TEST: at 390px, is there still any section that is "eyebrow → headline → paragraph → grid of bordered cards"? If yes, name it — we didn't fix the actual problem.
```

---

## Part 3 — What you should expect to see

Homepage drops from ~45 bordered boxes to roughly **8**, and from ~900 words to ~250. One giant numeral, one aurora, one marquee, one horizontal timeline, one narrow centered candor moment, one card grid (pricing, where cards belong), one sticky mobile CTA. The 24-citation wall isn't deleted — it moves to `/how-it-works`, where a motivated reader will find it and be impressed instead of exhausted.
