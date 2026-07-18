# Gun License NYC — V7: retail-first hero + real media
### Detailed Claude Code prompt

The V6 build is live and structurally strong. This pass does three things: (1) replace the **complex hero product visual** with a **simple animated "how it works" illustration** aimed at our primary customer — the first-time retail applicant; (2) add **real royalty-free NYC video** where it complements the page; (3) strip vendor-grade jargon out of the homepage visuals so nothing on the first screen intimidates a nervous applicant.

**Audience principle (repeat back before starting):** the homepage's job is to convert a *retail* customer — an individual New Yorker who wants to start their gun-license application and is probably anxious and non-expert. Vendors/instructors are a *secondary, backend* audience. So the homepage visuals must be simple, warm, and jargon-light. Dense, citation-heavy "instrument" views belong deeper in the funnel (/how-it-works, the portal), not on the first screen.

Run the tasks in order; review on your phone between each.

---

## TASK 0 — Context (no edits yet)

```
We're refining the live Gun License NYC homepage. Read first:
- app/(marketing)/page.tsx
- components/marketing/showcase/case-file-showcase.tsx   (the current, too-complex hero visual)
- components/marketing/product-feature.tsx
- components/marketing/media-frame.tsx                   (MediaFrame + code-generated SkylineArt)
- components/marketing/video-modal.tsx                   (TOUR_VIDEO_SRC swap point, currently null)
- components/marketing/process-stepper.tsx, components/marketing/showcase/the-count.tsx
- config/brand.ts, app/globals.css                       (tokens + keyframes; add new ones here, not inline)
- AGENTS.md                                              (Next.js 16 — read node_modules/next/dist/docs/ before Next-specific code; legal guardrails)

AUDIENCE PRINCIPLE: the homepage converts a RETAIL first-time applicant (anxious, non-expert). Instructors/vendors are a secondary backend audience. Homepage visuals must be simple, warm, and jargon-light. Citation codes (e.g. "38 RCNY §5-03(a)(1)"), internal codes (REF-01 / AFF-01 / TRN-01), and dense dashboards belong deeper (/how-it-works, portal) — not on the first screen.

RULES (unchanged from prior phases): mobile-first at 390px; colors ONLY from config/brand.ts tokens; legal guardrails (no guarantee/expedite/fast-track/insider/approval-rate, no implied NYPD endorsement, no "we file for you", keep brand.disclaimer, keep the candor position, invent no stats); motion is transform/opacity only and must freeze under prefers-reduced-motion; pnpm build + pnpm test pass at the end.

Reply with: (a) confirm the audience principle in your own words, (b) list every place on the current homepage that shows citation codes / internal codes / dense dashboard detail, (c) confirm the three swap points you'll use for media (MediaFrame children, SkylineArt, TOUR_VIDEO_SRC).
```

---

## TASK 1 — Replace the hero visual with a simple animated illustration

```
The hero currently mounts <CaseFileShowcase tilt/> — a dense case dashboard (progress meter, 3 "vitals", 3 requirement rows with codes REF-01/AFF-01/TRN-01 and legal citations, a warning note). For a first-time applicant this is intimidating. Replace it in the HERO with a simple, friendly, animated "how it works in 3 steps" illustration.

CREATE components/marketing/showcase/how-it-works-illustration.tsx:
- Three steps on a single connecting spine (vertical on mobile, can stay vertical or go horizontal on desktop — pick whatever reads cleanest at 390px first):
    1. "Tell us about you"        — sub: "A 2-minute eligibility check"
    2. "We build your case"       — sub: "Every document, gathered & checked"
    3. "You file — you're licensed" — sub: "You submit; we make sure it's right"
- Each step: a numbered brass token (1, 2, →✓ on the last) + a short label + a one-line sub. Plain English only — NO citations, NO internal codes, NO percentages.
- ANIMATION (subtle, premium, looping ~6–8s, NOT frantic): on scroll-into-view the connecting line "draws" downward, each step fades/rises in sequence (stagger ~180ms), and the final step's token flips from a number to a checkmark with a soft brass glow pulse. Loop gently or play once then rest — your call, but it must feel calm, not busy.
- Build it CSS/SVG only (stroke-dashoffset for the line draw, transform/opacity for steps). No rAF loop. Under prefers-reduced-motion: render the completed state statically (line drawn, all steps visible, final check shown). aria-hidden on decorative motion; the text content stays in the DOM and readable by AT.
- Colors from tokens (brass, brass-bright, ice, text-mid, hairline). It sits inside the hero's `.dark` scope.

WIRE IT UP in app/(marketing)/page.tsx:
- Swap <CaseFileShowcase tilt/> in the hero for <HowItWorksIllustration/>. Keep the existing hero mask/reveal treatment so it still "peeks" and invites the scroll, but this visual is light enough it can also just sit cleanly centered — choose the better look on mobile.

DON'T DELETE the real instrument — relocate it. Move the detailed <CaseFileShowcase/> into the ProductFeature section (see Task 3) as the "for the curious, here's the actual tool" view, lower on the page where detail is welcome. When it renders there, SIMPLIFY it for the marketing context: drop the internal codes (REF-01/AFF-01/TRN-01) and soften/relabel the raw citations into plain language (e.g. "Character references — notarized" instead of "38 RCNY §5-03(a)(1)"). Keep ONE citation at most as a trust signal, not three. The full citation-grade view already lives on /how-it-works.

Run pnpm build. Show me the hero at 390px and 1440px, and confirm the first screen no longer shows any citation/code.
```

---

## TASK 2 — Add real NYC video (TWO separate clips, downloaded + optimized)

```
Add TWO distinct, real, royalty-free NYC clips — a different one for each spot, so they don't feel repetitive. Download and self-host both — never hotlink. Confirm each license before use (all below are commercial-use, no-attribution). Download HD (1080p), not 4K (weight).

CLIP A — placemaking band (wide, establishing, emotional). Pick a SLOW twilight/dusk WIDE aerial of the Manhattan skyline — it says "all five boroughs" and its warm dusk tones sit naturally in our obsidian/brass palette:
    · Pexels "Twilight Aerial View of New York City Skyline" — https://www.pexels.com/video/twilight-aerial-view-of-new-york-city-skyline-36934433/   (first choice)
    · fallback: Pexels "Stunning Aerial View of New York City Skyline" — https://www.pexels.com/video/stunning-aerial-view-of-new-york-city-skyline-35419124/

CLIP B — ProductFeature backdrop (tighter, calmer, more ABSTRACT so it sits quietly behind UI and text). Pick a slow, darker, closer night clip — defocused city lights or a tight skyscraper glow, NOT another wide aerial (it must contrast Clip A):
    · Pexels "City At Night" — https://www.pexels.com/video/city-at-night-853835/   (first choice)
    · fallback: Pexels "Nighttime Aerial View of NYC Skyscrapers" — https://www.pexels.com/video/nighttime-aerial-view-of-nyc-skyscrapers-37898716/
    · fallback: Coverr NYC collection — https://coverr.co/stock-video-footage/nyc

If a specific clip is unavailable, use its listed fallback. If BOTH options for a spot fail, keep the code-generated SkylineArt there so the build never breaks — and tell me which failed.

OPTIMIZE each clip (use ffmpeg):
- Trim to a clean ~10–14s segment that loops without a jarring cut.
- Encode TWO formats per clip into public/media/: .webm (VP9) + .mp4 (H.264), target < 2.5 MB each, ~1600px wide max, no audio (-an).
- Name them clearly: nyc-skyline-wide.{webm,mp4} (Clip A) and nyc-night-abstract.{webm,mp4} (Clip B), each with a matching poster: *-poster.webp (~120 KB, first frame).
- Write public/media/CREDITS.md: filename, source page URL, license name, download date — for every file.

USE THEM:
1) ProductFeature MediaFrame — replace the static <SkylineArt/> with CLIP B as the ambient backdrop behind the "Watch how it works" button. The relocated, simplified CaseFileShowcase from Task 1 can sit in front of / beside it — pick the cleaner composition; keep the obsidian scrim so text/UI stays legible.
2) A NEW cinematic "placemaking" band (full-bleed, ~40svh) between THE COUNT and THE PROCESS (or between CANDOR and COST — pick the spot that best breaks the rhythm). Full-bleed CLIP A, heavy obsidian scrim + brass vignette, one short retail-warm line centered: "Built for New Yorkers. In all five boroughs." (no stats, no jargon). An emotional/trust beat, not an information beat.

VIDEO ELEMENT REQUIREMENTS (make a reusable components/marketing/ambient-video.tsx):
- <video muted loop playsInline autoPlay poster=…> with <source> webm then mp4; width/height or aspect set so there's ZERO layout shift; poster shows instantly.
- Respect prefers-reduced-motion AND Save-Data: if either is set, DON'T autoplay — show the poster image only. Use matchMedia + the `connection.saveData` check; degrade gracefully where unsupported.
- Lazy: only load/play when the band scrolls near the viewport (IntersectionObserver); pause when offscreen to save battery.
- Never let the video hurt hero LCP — the hero has NO video (keep the aurora there); video lives below the fold only.

Both clips use the SAME reusable components/marketing/ambient-video.tsx (source webm→mp4, poster, no CLS, reduced-motion + Save-Data → poster only, IntersectionObserver lazy-load + offscreen pause). Only the src/poster props differ per spot.

Run pnpm build. Show me the ProductFeature section (Clip B) and the new placemaking band (Clip A) at 390px and 1440px, and report the final byte size of each of the 4 media files + the mobile LCP before/after.
```

---

## TASK 3 — Retail-first jargon sweep (homepage only)

```
Make the whole homepage read for a non-expert, without weakening candor or legal accuracy.
- Scan the homepage and its components for anything that reads as insider/vendor language: raw legal citations (38 RCNY…, Penal Law §400.00(19), CPL Article 160), internal codes (REF-01, CP-5, stage keys), and acronyms used without a plain-English gloss.
- On the homepage, replace or gloss them in plain terms ("the 18-hour safety course", "a notarized letter from four references", "sealed or dismissed arrests"). Keep AT MOST one or two citations anywhere on the page, and only as a small trust signal — not as the primary label.
- Do NOT touch /how-it-works, the portal, or admin — the citation-grade detail is correct and valued there. This sweep is homepage-only.
- Keep every legal guardrail intact: the candor sentence ("Sealed and dismissed arrests are still disclosed"), brand.disclaimer, and the "you file your own application" truth all stay.

Show me a diff of every copy change and confirm no legal/candor content was lost — only simplified.
```

---

## TASK 4 — Animation beats (do #1; #2–#4 only if they add clarity, not noise)

```
RESTRAINT NOTE: the page will already have the hero illustration + two videos moving. #1 below is the one real add — it EXPLAINS rather than decorates, so build it. Treat #2–#4 as optional polish and skip any that make the page feel busier rather than clearer. Do NOT animate the candor section or the disclaimer — those stay perfectly still.

1) COST PROPORTION BAR (build this) — inside the CostCard, when the breakdown expands, animate a single horizontal stacked bar that shows where the money goes:
   - Segments, proportional to the computed amounts: "Our service $1,000" in BRASS (the hero segment), then muted segments for "Training", "NYPD fee", "Fingerprints", "Notary" in graduated neutral/ice tones. Use the SAME numbers the breakdown already computes — no hardcoded widths; derive each segment's % from the amounts (use the low end of the training/notary ranges, or the midpoint — pick one and label it "estimated").
   - On expand (and on scroll-into-view), the segments grow from 0 to their width, staggered left-to-right, ~600ms total, easing cubic-bezier(0.22,1,0.36,1). A tiny legend under it maps color → label. reduced-motion → render final widths instantly.
   - This visually proves the "only $1,000 is ours; the rest we never mark up" message — it's the point of the section, so make it clean and legible at 390px (stack the legend if needed; keep segment labels out of tiny segments — use the legend instead).
   - Colors from tokens only; ensure AA contrast on any text sitting on a segment.

2) THE COUNT (the "24" section): a light document-assembly animation — a few simple document shapes drift into an organized stack with checkmarks appearing, on scroll-into-view. CSS/SVG, transform/opacity, settles < 1s, reduced-motion → assembled/static. Reinforces "we organize the chaos for you." No citations.

3) REALITY numbers count-up: when the list scrolls into view, the figures (~6 months, 18 hours, 4 references, 1 affidavit, 1 interview) tick up to their value once (~500ms). Subtle only; integers count cleanly; reduced-motion → show final value immediately. Skip if it feels gimmicky.

4) PROCESS STEPPER: give each of the 5 steps a small, consistent line-icon (person / calendar / folder-check / clipboard / handshake) so the phases read at a glance. Icons from the existing lucide-react set, brass on active.

Your judgment on #2–#4; err toward calm. #1 is required.
```

---

## TASK 5 — Verify (adversarial)

```
As a hostile reviewer:
1) RETAIL TEST: screenshot the homepage first screen at 390px. Is there ANY citation, internal code, percentage-dense dashboard, or acronym-without-gloss visible before the first scroll? If yes, name it — Task 1/3 failed.
2) MEDIA: every file in public/media is logged in CREDITS.md with a commercial-use license; video is muted + poster + reduced-motion/Save-Data safe + lazy + offscreen-paused; no firearm imagery anywhere; ZERO CLS from video/poster; hero has no video (LCP protected).
3) MOTION: the hero illustration and all new animations freeze to a sensible static state under prefers-reduced-motion (toggle OS setting, screenshot).
4) LEGAL: candor sentence + brand.disclaimer present; no guarantee/expedite/fast-track/insider/approval-rate/"we file"/"endorsed"; no invented stats. Report grep hits verbatim.
4b) COST BAR: segment widths are derived from the same computed amounts as the breakdown (grep for hardcoded widths/percentages — there should be none); the $1,000 segment is visually the hero; changing a fee moves the segment proportions; reduced-motion renders final widths instantly; legible + AA at 390px.
5) PERF: Lighthouse mobile before/after; report LCP, CLS, total transferred bytes. Video must not regress LCP.
6) REGRESSION: /pricing, /faq, /how-it-works (still shows full citation detail), /blog, /eligibility, portal, admin unchanged and on their intended theme. pnpm build && pnpm test pass.
Give me: files changed, before/after screenshots at 390px + 1440px, media byte sizes, Lighthouse deltas, and an honest list of anything still worth improving.
```

---

### Notes for you (not for Claude Code)
- **The two picks:** Clip A (placemaking band) = a wide **twilight** Manhattan aerial — establishing and emotional, warm dusk tones that sit in the obsidian/brass palette. Clip B (product backdrop) = a tighter, darker, more **abstract** night clip (defocused city lights) so it stays quiet behind the UI and contrasts Clip A. If you dislike either pick, name the Pexels/Coverr URL you'd rather use and it's a one-line swap.
- **Weight:** two clips means ~4 optimized files (webm+mp4 each), all kept under 2.5 MB and lazy-loaded below the fold, so the hero LCP is still protected.
- **The real product tour** still has no footage — the "Watch how it works" modal keeps its polished placeholder, with `TOUR_VIDEO_SRC` as the single swap point for whenever you record one.
