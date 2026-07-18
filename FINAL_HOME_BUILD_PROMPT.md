# Gun License NYC — Homepage V6 build prompt
### Final, copy-paste-ready for Claude Code

The approved visual spec is the file **`mockup-home-v6.html`** in the repo root. Open it, resize desktop↔mobile, click the process stepper and the cost card. That interactive mock is the source of truth for structure, rhythm, and interactions. This prompt tells Claude Code how to build it into the real Next.js 16 app, with real stock media and a new logo.

Run the phases in order. Stop and review on your phone between each.

---

## PHASE 0 — Context, guardrails, and the rebrand (run first)

```
We are rebuilding the Gun License NYC homepage to match the approved mock in mockup-home-v6.html (repo root). Open and study that file first — it is the visual/interaction spec.

Before any edits, read:
- mockup-home-v6.html          (the approved design — structure, rhythm, interactions)
- AGENTS.md                    (CRITICAL: Next.js 16 — APIs differ from your training data. Read node_modules/next/dist/docs/ before writing Next-specific code. Also the non-negotiable legal guardrails.)
- config/brand.ts              (single source of truth: brand identity, paletteDark/Light, disclaimer)
- app/globals.css              (theme mapping + signature utilities/keyframes)
- app/layout.tsx, app/(marketing)/layout.tsx, components/theme/light-backdrop.tsx
- app/(marketing)/page.tsx     (the page we're replacing)
- components/marketing/*.tsx and components/marketing/showcase/*.tsx (hero-aura, ticker, journey-scroll, magnetic are currently UNUSED — we'll use them)
- lib/fees.ts, lib/packages.ts (server data for cost + pricing)

REBRAND — do this first, repo-wide, carefully:
The company is now "Gun License NYC" (was "CARRY"). In config/brand.ts set name to "Gun License NYC". Then grep the whole repo for "CARRY" and "carry" used as the brand name and replace user-facing occurrences (marketing copy, metadata, titles, footer, disclaimer, JSON-LD, email templates). DO NOT blind-replace: leave intact the many legitimate uses of "carry" as a common word (concealed CARRY, carry license, purchase-and-carry, etc.), file/table/route names, package name "carrypath", and code identifiers. Show me the full list of replacements you plan BEFORE applying, grouped into "brand name (replace)" vs "the word carry (leave)". Update brand.disclaimer to name "Gun License NYC".

HARD RULES FOR EVERY PHASE:
1. MOBILE IS THE PRODUCT. Verify at 390px FIRST, desktop second. No horizontal scroll. Tap targets ≥44px. Headlines never clip.
2. NEVER hardcode a color. Everything from config/brand.ts via tokens (bg-brass, text-signal, border-hairline, text-prestige…). New color → add to the palette in brand.ts.
3. LEGAL (AGENTS.md): never use guarantee, expedite, fast-track, insider, approval rate. Never imply NYPD endorsement or that we represent/file for the applicant. brand.disclaimer stays visible on the homepage. Keep the candor position (sealed/dismissed arrests ARE disclosed). Invent NO statistics, testimonials, client counts, or citations.
4. Motion: transform/opacity only, CSS over JS, no rAF render loops. Everything degrades to a calm static state under prefers-reduced-motion.
5. A11y: AA contrast, decorative layers aria-hidden, visible focus, semantic headings.
6. Don't break the build: `pnpm build` + `pnpm test` pass at the end of every phase.

Don't edit yet. Reply with: (a) the rebrand replacement plan (two lists as above), (b) a 5-bullet summary of the current color system + how theme switching works (LightBackdrop vs .dark), (c) confirmation you've studied the mock and can restate its 9 sections and the two interactions (process stepper, cost expander).
```

---

## PHASE 1 — New logo + dark home shell

```
1) NEW LOGO. Replace the "◎" reticle glyph with a proper mark. Design an SVG logo, not an emoji.
   Direction: premium, NYC, trustworthy — "official licensing seal meets modern instrument." NOT tactical, NO firearm/bullet imagery. Recommended concept: a fine-line circular emblem (a licensing "seal") enclosing an abstract Manhattan-skyline notch or a precise aperture/crosshair reduced to hairlines, with an optional "GL" ligature. Brass on obsidian; must also work as a single-color mark on the light interior pages and as a favicon at 32px.
   Deliverables:
   - components/brand/logo.tsx exporting <LogoMark/> (the emblem alone, square, currentColor-friendly) and <LogoLockup/> (mark + "Gun License NYC" wordmark in the display font).
   - Colors via tokens only (brass/ice/foreground), no hardcoded hex.
   - Update the nav, footer, and app/icon (favicon) to the new mark. Regenerate favicon.ico from the SVG.
   - Show me 2–3 quick SVG variants to choose from before wiring it in everywhere.

2) DARK HOME SHELL (home route only). The homepage moves to the cinematic dark register (obsidian + brass + ice). Interior marketing pages (/pricing, /faq, /how-it-works, /blog, /eligibility, /contact) STAY on the warm-paper light theme and must render byte-identical to today.
   - Do NOT convert app/(marketing)/layout.tsx wholesale. Move the backdrop choice to the page level: the home page renders its own `.dark` wrapper + a DarkBackdrop (aurora mesh + starfield + vignette, adapted from the unused hero-aura.tsx and the animate-aurora-*/star-drift/hero-sweep keyframes already in globals.css). Every other page keeps LightBackdrop.
   - Make MarketingNav theme-aware: transparent over the hero, then glass-premium with a hairline border once scrolled >~40px (see mock). Dark tokens on home, light tokens elsewhere.
   - Verify each interior page before/after — screenshot and confirm no visual diff.

Run pnpm build. Show me the new logo variants and the home + one interior page at 390px and 1440px.
```

---

## PHASE 2 — Stock media pipeline (images + video), palette-matched

```
Add real, premium, royalty-free media — downloaded LOCALLY into /public/media, never hotlinked.

SOURCING RULES:
- Only commercial-use, no-attribution-required sources: Unsplash (unsplash.com), Pexels (pexels.com / videos.pexels.com), Coverr (coverr.co), Mixkit. Confirm each asset's license before use and record the source URL + license in /public/media/CREDITS.md.
- ART DIRECTION — brand-safe and on-register: editorial New York City (skyline, brownstones, streets, aerials at dusk/night), documents & desks (paper, notary stamp, signing, an organized case file), and calm professional portraits of diverse New Yorkers. Premium, cinematic, real. ABSOLUTELY NO firearms, ammunition, holsters, ranges, or anything weapon-adjacent (brand safety + ad-platform compliance). If in doubt, leave it out.
- UNIFY THEM TO THE PALETTE: every photo gets a treatment so it reads as part of the obsidian/brass world — a dark gradient scrim (obsidian → transparent) plus a subtle brass/ice duotone or multiply overlay via CSS. No raw full-color stock sitting on the dark page. Build a reusable <MediaFrame> that applies the scrim + rounded corners + hairline + soft shadow (the "floating panel" look from the mock).
- OPTIMIZE: download at ~2400px max, convert to webp/avif, serve via next/image with correct sizes, width/height set (no CLS), priority only on the hero, lazy everywhere else. Keep each image under ~250KB after optimization.

VIDEO:
- One short, muted, looping ambient clip for a hero/section accent — e.g. a slow NYC aerial or abstract light motion from Coverr/Pexels. <3MB, webm+mp4, `muted playsinline loop autoplay`, a poster image (first frame) so it never shows a blank box, and it must FREEZE to the poster under prefers-reduced-motion and not autoplay on save-data/slow connections.
- The "Watch how it works" button: you have no real product-tour video yet. Wire it to open an accessible modal that plays the ambient clip as a placeholder, and leave a clearly-commented TODO + a single swap point (one constant for the video src) so a real 60-sec tour can drop in later. Do not fabricate a product demo.

FALLBACK: if any download fails or a source is unreachable, fall back to the code-generated gradient/SVG from the mock so the build NEVER breaks. Report anything that failed.

Deliverables: /public/media/ with optimized assets + CREDITS.md, a <MediaFrame> component, and the media wired into the sections named in Phase 3. Run pnpm build; show me the hero and the product-feature section with real media at 390px and 1440px.
```

---

## PHASE 3 — Rebuild the page to match the mock

```
Rebuild app/(marketing)/page.tsx to the mock, section for section. Target ~250 words of body copy total. Relocate (don't delete) the detailed content — the full 24-citation wall and the six "hard truth" paragraphs move to /how-it-works and /faq, linked from the homepage. No two ADJACENT sections may share a shape.

Sections (see mockup-home-v6.html for exact layout/spacing/rhythm):
1) HERO — full-bleed, ~88svh. DarkBackdrop aurora behind. Eyebrow "NYC · gun license, handled". H1 with .text-prestige, clamp() to ~68px desktop / ~40px mobile, text-balance: "The whole process. Handled." One sentence sub (≤25 words). ONE brass CTA "Check your eligibility →" (Magnetic, ≥48px) + one ghost "Watch how it works" (opens the video modal). A trust row (3 verifiable items). Beside it on desktop / below on mobile: the floating live-case product panel (adapt CaseFileShowcase — progress meter, 3 real requirement rows with citations, one "needs a fix"), tilted with soft shadow, cropped by the viewport edge to invite the scroll.
2) MARQUEE — the existing ticker.tsx, hairline top/bottom, verifiable claims only, pauses under reduced-motion.
3) PRODUCT FEATURE (Stripe-style split) — left: "One case. Every requirement, in one place." + 3 stat numerals (24 / 13 / 0). Right: a <MediaFrame> video/image card (the product tour placeholder over the NYC-skyline treatment).
4) THE 24 — full-bleed band. Enormous "24" numeral (clamp to ~240px desktop) in prestige fill, an assembling fan/stack of document cards on scroll-into-view (transform+opacity, settles <900ms, reduced-motion → assembled). Beside it: headline + 5 sample requirement chips + "See all 24 requirements →" to /how-it-works. (Render the full RequirementsWall on /how-it-works, NOT here.)
5) PROCESS — the fixed stepper from the mock. THIS REPLACES the scroll-hijack behavior entirely.
   - Desktop: 5 clickable tabs (01–05) + prev/next arrows + dot indicators; one panel shows at a time (title, body ≤35 words, huge ghost numeral). Arrow-key support, roving tabindex, aria-selected, focus rings. NO wheel/scroll interception anywhere.
   - Mobile: a native horizontal scroll-snap carousel (scroll-snap-type:x mandatory) of 5 cards with dot indicators. Swipe, not hijack.
   - Content = the 5 phases in the mock's script (Qualify & enroll / Train / Assemble / Review & file / Interview).
6) REALITY — max-w-3xl centered, hairline-divided rows, NO cards: ~6 months / 18 hours / 4 references / 1 affidavit / 1 interview, each with a ≤8-word clarifier (mock copy). Candor intact ("No one can expedite it — including us").
7) CANDOR — narrow centered, larger body type, no card: "Sealed and dismissed arrests are still disclosed." + two short sentences.
8) COST — see Phase 4 (build it there).
9) CLOSING — full-bleed aurora reprise, centered: "Find out if you qualify. Two minutes." + one brass CTA.
10) STICKY MOBILE CTA — bottom bar fading in after the hero scrolls out, safe-area aware, hidden on desktop and when the closing CTA is in view.
Delete the old <Fact>/<Truth>/<WeAre> grids and the two big trust glass boxes; fold the "what we are / if denied" content into the slim footer disclaimer area.

Run pnpm build && pnpm test. Screenshots at 390px (full page) and 1440px.
```

---

## PHASE 4 — The honest cost section (data-driven)

```
Build the COST section exactly like the mock's cost card: our fee up top, an expandable full breakdown, an honest all-in range. Nothing hardcoded that lives in the DB.

DATA:
- Our service fee = $1,000. Set the concierge package's price_cents to 100000 as a DATA edit (a new migration or seed change per AGENTS.md migration rules) — NOT a hardcoded component value. Sanity-check that row's deposit_cents still makes sense at $1,000 and flag if not. (This IS a real price change from $1,999 — confirmed intended.)
- Government fees come from getFees() (application + fingerprint), already in the fees table.
- Training (~$350–425) and notarization (~$25–100) are NOT collected by us and NOT in the DB — they're external estimates. Put them in config/brand.ts as a documented `externalCostEstimates` object (labeled ranges + source note), so they're editable in one place and clearly not revenue we take. Do not invent a single fixed price for training; show the range.

RENDER (client component; fetch in the server page, pass package + fees + estimates as props):
- COLLAPSED: eyebrow "What it costs"; our concierge fee as one large prestige numeral ($1,000); a line: "That's what you pay us. Below is every other cost — paid directly to the government and your instructor, never to us."; a disclosure row "See the full cost of a NYC license" + chevron (real <button aria-expanded>, ≥44px).
- EXPANDED (animate max-height/grid-rows, chevron rotates, reduced-motion → instant): two groups —
    PAID TO US: Concierge service — $1,000
    PAID DIRECTLY TO OTHERS (muted, visually subordinate): 18-hour firearms course ~$350–425 (to your instructor) · NYPD application fee {fees.applicationFee} · DCJS fingerprinting {fees.fingerprintFee} · Notarization ~$25–100
    ESTIMATED ALL-IN: a computed RANGE = 1000 + trainingLow + appFee + printFee + notaryLow  →  1000 + trainingHigh + appFee + printFee + notaryHigh (render like "~$1,800–1,950"; round sensibly).
  + a signal-tinted note: "Training and notary costs vary by provider, so we show ranges. Only the $1,000 is paid to us — the rest you pay directly, and we never mark it up."
- Below the card: a single quiet "Compare all packages →" link to /pricing. Do NOT render 4 co-equal package cards on the homepage.

LEGAL: the phrase "paid directly to… never collected by us" (or equivalent) must appear; government-fee rows must be visually subordinate so it's unmistakable our fee is $1,000. Showing an all-in estimate is fine; implying we collect or control the government/training fees is not.

Run pnpm build && pnpm test. Show me the cost card collapsed and expanded at 390px and 1440px. Change a fee in the fees table and confirm the all-in range moves.
```

---

## PHASE 5 — Motion, mobile pass, and adversarial verification

```
POLISH:
- Codify one entrance easing (cubic-bezier(0.22,1,0.36,1)) and a duration scale in globals.css. Reveal stagger 60–90ms, ≤5 items per chain. Ambient layers near-subliminal (aurora 38–44s, starfield ~60s, sweep ~12s). Magnetic on the primary CTA only, pointer-fine only. Every one freezes under prefers-reduced-motion — verify by toggling the OS setting and re-screenshotting.
- MOBILE SWEEP at 390×844: no horizontal scroll; H1 doesn't clip; every tap target ≥44px; sticky CTA never covers content; product panel and media don't overflow; process carousel snaps; cost card expands without layout jump; safe-area insets respected; body copy 45–75 chars.
- PERFORMANCE: Lighthouse mobile. Media lazy/gated, video poster prevents CLS, images sized. Report before/after scores.

ADVERSARIAL VERIFICATION (act as a hostile reviewer; do not defend the work):
1. REBRAND: grep for stray "CARRY" brand-name leftovers in user-facing copy/metadata; confirm none, and that legitimate "carry" words + code identifiers were untouched.
2. LEGAL: grep the homepage + new components for "guarantee", "expedite", "fast-track", "insider", "approval rate", "endorsed", "we file", "on your behalf". Confirm brand.disclaimer renders and names Gun License NYC. Confirm the candor position survived. Confirm no invented stats/testimonials/citations. Report hits verbatim.
3. COST MATH: the all-in range = 1000 + estimates + fees, computed at render. Grep for hardcoded "1,000"/"1000"/"1,428"/"1,999"/"340"/"88.25"/"1,800"/"1,950" in components; report every hit. Confirm changing a fee moves the total.
4. MEDIA: every asset in /public/media is logged in CREDITS.md with a commercial-use license; no firearm imagery anywhere; every photo has the palette scrim; video is muted+poster+reduced-motion-safe; no CLS.
5. REGRESSION: /pricing, /faq, /how-it-works, /blog, /eligibility, /contact, portal, admin all render correctly on their intended theme. pnpm build && pnpm test pass.
6. A11y: axe/Lighthouse a11y pass. AA contrast on brass-on-obsidian text. Full keyboard nav incl. the process stepper and cost expander; visible focus everywhere. Decorative layers aria-hidden. Semantic heading order.
7. REDUCED MOTION: screenshot with it on — must look like a deliberate calm static composition.
8. THE HONEST TEST: at 390px, is any section still "eyebrow → headline → paragraph → grid of bordered cards"? Name it if so.

Give me: files changed, before/after screenshots at 390px + 1440px, Lighthouse deltas, and an honest list of what you'd still improve.
```

---

### Notes for you (not for Claude Code)
- **Logo:** you'll get 2–3 SVG concepts in Phase 1 — pick one before it wires in. If none land, tell it the direction to push (more seal-like, more skyline, more minimal monogram).
- **Video:** the "Watch how it works" opens a placeholder ambient clip. When you have a real 60-second product tour, there's one `src` constant to swap — no rebuild of the section.
- **Price:** Phase 4 drops your headline service price from $1,999 → $1,000. That's a revenue decision, already confirmed; it also touches `/portal/enroll` and any Stripe metadata, which Phase 5 regression covers.
