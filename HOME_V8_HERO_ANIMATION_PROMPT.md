# Gun License NYC — V8: animated hero + candor redesign + kill the dead video
### Detailed Claude Code prompt (all directions approved from interactive demos)

Three changes, all approved from working demos:
1. Replace the static "How it works" 3-step list in the hero with a **self-advancing 5-phase animated product card**, and switch the hero to a **left-copy / right-animation** split (like the RentGuard reference), so the right side is no longer empty.
2. Redesign the **Candor** section background as a **redaction-reveal** (concealment → disclosure).
3. **Remove the dead "Watch how it works" video button** entirely (no video is being made).

Run tasks in order; review on your phone between each.

---

## TASK 0 — Context (no edits)

```
We're upgrading the live Gun License NYC homepage. Read first:
- app/(marketing)/page.tsx
- components/marketing/showcase/how-it-works-illustration.tsx   (the CURRENT static 3-step list we're replacing in the hero)
- components/marketing/showcase/case-file-showcase.tsx
- components/marketing/product-feature.tsx
- components/marketing/video-modal.tsx                          (the "Watch how it works" modal — being removed)
- config/brand.ts, app/globals.css                             (tokens + keyframes; add new keyframes/utilities HERE, not inline)
- AGENTS.md                                                     (Next.js 16 — read node_modules/next/dist/docs/ before Next-specific code; legal guardrails)

AUDIENCE PRINCIPLE (unchanged): the homepage converts a RETAIL first-time applicant — anxious, non-expert. Keep it simple and warm; no citation codes or dense dashboards on the first screen.

RULES: mobile-first at 390px; colors ONLY from config/brand.ts tokens; legal guardrails (no guarantee/expedite/fast-track/insider/approval-rate, no implied NYPD endorsement, no "we file for you", keep brand.disclaimer, keep the candor position, invent no stats); motion is transform/opacity only, freezes under prefers-reduced-motion; pnpm build + pnpm test pass at the end.

Reply with: (a) confirm you can restate the 5 hero phases and the left/right layout change, (b) list every place "Watch how it works" / VideoModal / TOUR_VIDEO_SRC appears so we remove them all, (c) confirm the Candor section's current markup so we can re-background it.
```

---

## TASK 1 — The animated hero (5-phase product card, copy left / animation right)

```
Replace the static hero illustration with a self-advancing animated product card that tells the whole story: Eligibility → Train → Assemble → File → Licensed. This is the reference behavior (I approved it from a demo):

LAYOUT (this is a real change):
- Desktop (lg+): a two-column hero — COPY on the LEFT (left-aligned, NOT centered), the ANIMATED CARD on the RIGHT. Roughly 0.85fr / 1.15fr. This kills the empty right-side space.
- Mobile: stack — copy first, animated card below. Card never causes horizontal scroll at 390px.
- Left column keeps: eyebrow "NYC · gun license, handled", the H1 ".text-prestige" ("The whole process. Handled."), the one-sentence sub, ONE primary CTA "Check your eligibility →" (Magnetic, ≥48px), and the small trust row.

CREATE components/marketing/showcase/case-animation.tsx (client component). A card (glass, hairline, soft shadow, brass/ice glow behind) with: a top bar showing phase dots (5) + a phase label chip; a body that swaps per phase with a fade; and a persistent 5-node process TIMELINE across the bottom (Enroll · Train · Assemble · File · Licensed) whose nodes light up cumulatively as the phase advances.

PHASES (auto-advance ~4s each, then loop; each re-runs its inner animation on entry):
1) ELIGIBILITY — label "Step 01 · Eligibility". Three criteria rows check in sequence ("Lives in New York City", "21 years or older", "No disqualifying record"), then a brass result chip "You may qualify — let's begin". Timeline: Enroll lit.
2) TRAIN — label "Step 02 · Train". An illustrated range scene (see Task 2). Caption: "16 classroom hours + live fire — we track your certificate so it's still valid the day you file." Timeline: through Train.
3) ASSEMBLE — label "Step 03 · Your case". A "0 → 17 / 24 requirements" counter counts up; a progress bar fills 0→71%; four plain-English checklist items check off in sequence (Character references — notarized / Cohabitant affidavits collected / Safety course verified / Disclosures explained clearly). NO citation codes. Timeline: through Assemble.
4) FILE — label "Step 04 · Ready to file". A brass check pops; "24 / 24 complete"; "Assembled in the order they read it. You review, you submit — that's the law." Timeline: through File.
5) LICENSED — label "Step 05 · Licensed". The illustrated family payoff (see Task 3). Timeline: all five lit.

MOTION + A11Y + PERF:
- All animation is CSS transform/opacity + light JS (setInterval to advance, setTimeout to stagger). No requestAnimationFrame render loop.
- prefers-reduced-motion: DO NOT auto-advance. Render one composed static state (show the FILE/"24 of 24 complete" state, all timeline nodes lit) so it reads as a finished, calm composition — no motion.
- Pause auto-advance when the tab is hidden (visibilitychange) and when the card is offscreen (IntersectionObserver) to save battery; also pause on hover/focus so a reader can dwell.
- The card is illustrative: wrap it aria-hidden with a concise sr-only summary ("A preview of how Gun License NYC moves a case from eligibility through training, document assembly, filing, and licensure."). The real hero content (H1, sub, CTA) stays fully accessible outside it.
- Keep hero LCP healthy — no video, no heavy images here; the card is CSS/SVG only.

Swap this component into the hero in place of <HowItWorksIllustration/>. You may delete how-it-works-illustration.tsx if nothing else imports it (grep first).

Run pnpm build. Show me the hero at 390px and 1440px and confirm copy-left / animation-right on desktop.
```

---

## TASK 2 — The Train illustration (more literal range scene)

```
Inside the TRAIN phase, build a more detailed (not abstract) indoor-range illustration — still an SVG ILLUSTRATION, never a photo or a photoreal firearm:
- A shooter seen from behind in a proper stance, wearing ear + eye protection (small details that read "safety/training", not "action"), arms extended downrange.
- Range context: a lane divider / booth edge on one side, a downrange paper SILHOUETTE or bullseye target.
- Live-fire beat: a brief muzzle-flash pulse, then 3 shots land and GROUP tightly near center one after another; optionally a shell casing arcs out. Keep it calm and competent, not violent — this depicts a certified safety course.
- Colors from tokens (silhouettes in surface-3 / neutral, target rings in hairline, shot marks in a restrained accent, flash in brass). Reduced-motion → show the finished grouping statically, no flash.

BRAND-SAFETY NOTE (you must still honor this): keep it a tasteful stylized illustration. Do NOT render a realistic, detailed firearm or anything graphic — a minimal implied pistol silhouette is the ceiling. This keeps us defensible on Google/Meta ad policies while still showing the training step.
```

---

## TASK 3 — The Licensed illustration (family payoff)

```
Inside the LICENSED phase, build a warm family payoff illustration (SVG):
- Two adult silhouettes + one child silhouette standing together, a subtle home rooflines behind them, and a soft warm brass radial glow (hearth/sunrise feel).
- A small "licensed" check-badge (shield or seal + check) rises/pops in above them.
- The silhouettes rise/fade in gently in sequence; reduced-motion → all present, static.
- Caption (use exactly): a bold line "Licensed — and home to what matters" + sub "The whole process, handled. Now you protect the people you love."
- Warm but grounded — no guarantee of safety/outcome language beyond this; colors from tokens.
```

---

## TASK 4 — Candor section: redaction-reveal background

```
Redesign the [Candor, not concealment] section so it's no longer a flat black void. Theme: concealment giving way to disclosure.

- Background layers (all aria-hidden, behind the text): faint horizontal "document lines" (low-opacity rounded bars of varying widths) and a faint embossed circular NY "seal" motif in a corner. Subtle — texture, not clutter.
- Redaction reveal on the headline "Sealed and dismissed arrests are still disclosed.": wrap the key words ("Sealed", "dismissed", "disclosed") in spans that each carry a black redaction bar (a ::after overlay) which WIPES away (scaleX from 1 to 0, transform-origin right) to reveal the word, staggered. Run it ONCE when the section scrolls into view (IntersectionObserver, run-once), then rest — it must NOT loop (this section stays serious). The revealed key words can carry a subtle brass underline as emphasis.
- The actual text stays real, selectable, and in the DOM (bars are decorative overlays only). AA contrast maintained. prefers-reduced-motion → words render un-redacted immediately, no bars, no animation.
- Keep the existing copy and the eyebrow. Colors/keyframes via tokens + globals.css.

Show me the Candor section before/after at 390px and 1440px, and confirm the reveal fires once then rests.
```

---

## TASK 5 — Remove the dead "Watch how it works" video

```
No product-tour video exists or is planned. Remove the dead affordance everywhere on the homepage:
- Delete the "Watch how it works" secondary button from the hero — leave ONLY the primary "Check your eligibility" CTA.
- In product-feature.tsx, remove the VideoModal "watch how it works" button. Keep the MediaFrame as a quiet ambient visual (its existing code-generated skyline is fine; if the NYC ambient background videos from the separate media prompt are present, use one here — but with NO play/watch button and NO implication of a tour). If removing the button leaves the frame purposeless, replace the frame's foreground with the relocated, simplified CaseFileShowcase (plain labels, at most one citation) so the section shows the real tool instead.
- Retire VideoModal from the homepage path: remove imports/usages; delete components/marketing/video-modal.tsx and its TOUR_VIDEO_SRC/TourPlaceholder if nothing else imports it (grep first). Remove any now-unused .tour-sweep CSS.
- Grep the homepage + components for "Watch how it works", "how it works" video language, VideoModal, TOUR_VIDEO_SRC — confirm zero remain.
```

---

## TASK 6 — Verify (adversarial)

```
As a hostile reviewer:
1) HERO: desktop shows copy LEFT + animated card RIGHT (no empty right side); mobile stacks with no horizontal scroll at 390px. The card cycles all 5 phases incl. Train + Licensed; timeline lights cumulatively; counters/checks fire. Under prefers-reduced-motion it's a calm STATIC composed state (no auto-advance) — screenshot to prove it. Card is aria-hidden with an sr-only summary; H1/CTA remain accessible. Auto-advance pauses when offscreen/hidden/hovered.
2) TRAIN: it's a stylized SVG illustration, NOT photoreal; no detailed/graphic firearm; reduced-motion shows a static grouping.
3) LICENSED: family scene + exact caption; reduced-motion static.
4) CANDOR: redaction bars wipe once on scroll-in then rest (never loops); text is real/selectable/AA; reduced-motion shows words un-redacted with no bars.
5) DEAD VIDEO: zero "Watch how it works" / VideoModal / TOUR_VIDEO_SRC references remain; hero has only the primary CTA; build has no unused-import/dead-file errors.
6) LEGAL: candor sentence + brand.disclaimer present; no guarantee/expedite/fast-track/insider/approval-rate/"we file"/"endorsed"; no invented stats. Report grep hits verbatim.
7) REGRESSION + PERF: /pricing, /faq, /how-it-works, /blog, /eligibility, portal, admin unchanged and on their intended theme; pnpm build && pnpm test pass; Lighthouse mobile LCP/CLS not regressed by the hero animation.
Give me: files changed, before/after screenshots at 390px + 1440px (including a reduced-motion shot), and an honest list of anything still worth improving.
```

---

### Notes for you (not for Claude Code)
- **Train = your call, informed:** you chose the more literal range scene. It stays a stylized SVG illustration (no photoreal gun), which keeps you defensible on Google Business / Meta ad policies. If you ever run paid ads and a reviewer flags even the stylized version, the "less weapon-focused" variant (target + shots + certificate, no figure) is a one-line fallback.
- **Ambient NYC videos:** this prompt is about the animated hero, candor, and killing the dead button. The two real NYC background clips live in the separate `HOME_V7_RETAIL_MEDIA_PROMPT.md` — still worth running for ambiance; Task 5 here is written to cooperate with it (ambient background, no watch button).
- **Reduced motion:** the animated card intentionally becomes a still "finished case" state for users who disable motion — it won't feel broken.
