# CARRY — Home Screen & Loader Redesign
### Copy-paste prompts for Claude Code

You already have a strong "tactical-luxury HUD" system (obsidian + brass + signal-cyan, hairlines, mono micro-labels, reticle motifs). The goal here isn't to throw that away — it's to **elevate** it into something cinematic, futuristic, and unmistakably high-end, with the **phone experience as the priority**.

**Creative direction chosen:** keep the bones, push the palette into a richer/cooler futuristic register, and make the hero a **cinematic ambient background** behind a bold headline. Plus a more memorable loader and a consistency polish pass.

---

## How to use this file

Give Claude Code the prompts **in order** (0 → 5). Each one is self-contained and references your real files. Don't paste them all at once — run one, look at the result on your phone, then run the next. Prompt 0 sets shared context and **must go first**.

> Tip: After each prompt, view the page at a 390px-wide viewport (iPhone) *first*, then desktop. Mobile is the source of truth here.

---

## PROMPT 0 — Shared context & guardrails (run first)

```
We're doing a visual elevation of the CARRY marketing site. Before any edits, read these files so you understand the existing design system and respect it:

- config/brand.ts        (single source of truth for palette + brand; injected as CSS vars)
- app/globals.css        (theme mapping, signature utilities, keyframe animations)
- app/layout.tsx         (global obsidian backdrop)
- app/(marketing)/layout.tsx   (mounts BootIntro + CursorReticle + nav/footer)
- app/(marketing)/page.tsx     (the home page / hero)
- components/marketing/hero-aura.tsx, boot-intro.tsx, ticker.tsx, spotlight-card.tsx, nav.tsx
- components/ui/hud-stat.tsx
- AGENTS.md  (this is Next.js 16 — APIs differ from your training data; read node_modules/next/dist/docs/ before writing Next-specific code)

Hard rules for everything that follows:
1. MOBILE FIRST. Our users are overwhelmingly on phones. Design and verify at 390px width before desktop. No horizontal scroll, tap targets >= 44px, headline must not clip or overflow on small screens.
2. NEVER hardcode colors in components. All colors come from config/brand.ts as CSS variables / Tailwind tokens (bg-brass, text-signal, border-hairline, bg-surface-2, etc.). If you need a new color, add it to the palette in brand.ts.
3. Respect prefers-reduced-motion: every animation must degrade to a calm static state. Honor it via CSS media queries and/or window.matchMedia.
4. Performance: prefer CSS/transform/opacity animations over JS loops; avoid layout thrash; lazy/gate anything heavy. No jank on a mid-range phone. Keep Lighthouse mobile performance healthy.
5. Accessibility: maintain AA contrast on text, keep aria-hidden on decorative layers, keep focus states.
6. Don't break the build. After changes run `pnpm build` (or the project's typecheck/lint) and fix any errors.

Don't make edits yet — just confirm you've read the files and summarize the current hero, loader, and color system back to me in 5 bullet points so I know we're aligned.
```

---

## PROMPT 1 — Palette & material foundation (do this before the hero)

A futuristic, premium feel comes from **warm/cool tension** and **better materials** (glass, depth), not from more brass. This prompt upgrades the tokens so everything downstream inherits the new look.

```
Evolve the color system in config/brand.ts toward a more futuristic, premium register while keeping the obsidian + brass identity recognizable. Make these changes ONLY in config/brand.ts (palette object) and, where needed, the @theme mapping + utilities in app/globals.css — components must stay color-agnostic.

1. Deepen the base: shift `bg` to a near-true-black with a faint cool blue-violet undertone (around #07080B), and re-derive surface-1/2/3 as subtle cool-grey steps so panels read as layered glass, not flat boxes.
2. Introduce a COOL premium accent to play against the warm brass: a restrained platinum/ice highlight (e.g. an "ice" token around #BFD8E6 and an "ice-dim" rgba). This is the futuristic counterweight to brass. Keep signal-cyan for interactive/HUD accents.
3. Keep brass as the prestige/CTA color but make its glow slightly richer for use on dark glass.
4. Add two reusable material utilities in globals.css (if not already present):
   - `.glass-premium` — frosted dark glass: layered background using color-mix on surface tokens, backdrop-blur + saturate, a 1px hairline border, and a soft inset top highlight. Should look great over the hero.
   - `.text-prestige` — a subtle metallic gradient text fill (brass -> brass-bright -> ice) for the hero headline, with a graceful solid-color fallback.
5. Add a soft "aurora" gradient-mesh keyframe set (slow, low-amplitude, GPU-friendly) we'll use in the hero next.

After editing, run the build, then show me the diff of brand.ts and globals.css and explain each new token in one line. Verify the existing pages (home, pricing, portal, admin) still render with the new tokens and nothing looks broken.
```

---

## PROMPT 2 — Cinematic ambient hero (the centerpiece)

This replaces the current `hero-aura.tsx` ambiance with a layered, cinematic background and restructures the hero content for mobile impact.

```
Redesign the home hero into a cinematic, high-end ambient experience. Work in components/marketing/hero-aura.tsx (the background) and app/(marketing)/page.tsx (the hero section markup). Keep using the existing Reveal, Magnetic, HudStat, and brand tokens.

BACKGROUND (rebuild hero-aura.tsx as a layered, CSS-only composition; aria-hidden, pointer-events-none):
- A slow-drifting AURORA/GRADIENT MESH of brass + ice + signal pools over the deepened obsidian — more depth and movement than today, but still calm and recessive (it must never fight the headline).
- A fine PARTICLE/STARFIELD or floating-dust layer for depth. Implement as lightweight CSS (box-shadow dots or a tiled radial-gradient with a slow drift) — NOT a requestAnimationFrame loop. Density low; respects reduced-motion (freezes).
- A subtle DEPTH/PARALLAX feel: a couple of layers that shift a few pixels with scroll or pointer move, throttled, transform-only, disabled under reduced-motion and on touch where it'd be janky.
- Keep the signature touches but refine them: the hairline horizon, film grain (.noise), and a vignette that fades the hero into the page.
- Optional tasteful futurism: a faint animated scanline or a single slow "sweep" of light across the hero every ~12s. Keep it whisper-quiet.

CONTENT (page.tsx hero section), mobile-first:
- Apply `.text-prestige` to the H1 (brand.tagline). Tighten leading; make sure it scales cleanly from 390px up to desktop with text-balance and no clipping.
- Keep the "NYC Concealed Carry Concierge" pill but make it feel more like an instrument readout (mono micro-label, hairline, faint glass).
- Primary CTA "Check your eligibility" stays brass; secondary stays outline. On mobile they should stack full-width with comfortable spacing and large tap targets.
- Keep the 3 HudStats but ensure they sit on glass and remain legible over the busier background (add a subtle backdrop/scrim behind them if needed for contrast).

Constraints: 60fps target on a mid-range phone; everything transform/opacity based; reduced-motion gives a beautiful STILL composition (no movement) that still looks premium. Run the build. Then describe how it behaves at 390px vs desktop and confirm no horizontal overflow.
```

---

## PROMPT 3 — A cooler, more memorable loader

Your current `boot-intro.tsx` is a sweep + bar + wordmark. Make it a short cinematic "calibration → lock → reveal" sequence — still fast, skippable, once-per-session, reduced-motion-safe.

```
Redesign the boot/loading intro in components/marketing/boot-intro.tsx into something more cinematic and on-brand, without making it slower or annoying.

Behavior to KEEP: once-per-session (sessionStorage guard), click/tap to skip, fully skipped under prefers-reduced-motion, total runtime ~1.6-2.0s, then a smooth reveal of the page. It's mounted in app/(marketing)/layout.tsx.

New sequence (CSS-driven, GPU-friendly), themed to the precision/instrument identity:
1. Open on deep obsidian. A reticle/crosshair (use the brand mark ◎ idea) ASSEMBLES from a couple of concentric rings that rotate and converge to a clean "lock."
2. The CARRY wordmark resolves in with the `.text-prestige` metallic treatment.
3. A thin mono status line types/cycles 2-3 short readouts (e.g. "CALIBRATING OPTICS", "SECURING SESSION", "SYSTEM ONLINE") — keep it brief so it fits the ~2s budget. Mono, uppercase, wide tracking, text-mid.
4. A precise calibration bar (brass) completes, then the overlay does an elegant exit — an iris/wipe or a clean fade-and-scale reveal into the page rather than a plain opacity fade.

Make it crisp and expensive-feeling, not busy. Must look great on a phone (center everything, scale the reticle to viewport). Verify: first visit shows it, second visit in the same session doesn't, reduced-motion shows nothing, tap skips instantly. Run the build.
```

---

## PROMPT 4 — Consistency polish pass (so the new look carries through)

Now that the hero and loader are elevated, bring the rest of the home page up to the same material quality so it feels cohesive — not a beautiful top with a plain body.

```
Do a focused polish pass so the rest of the home page matches the new hero's material quality. Touch only what's needed; keep copy and structure. Files: app/(marketing)/page.tsx, components/marketing/spotlight-card.tsx, components/marketing/ticker.tsx, components/ui/hud-stat.tsx, components/marketing/nav.tsx, and app/layout.tsx (global backdrop).

1. Cards (value props + pricing): move the feature/pricing cards onto `.glass-premium`. Refine the SpotlightCard hover so the spotlight uses the new brass/ice palette; the featured pricing card should glow a touch more (brass-edge). Ensure hover/spotlight effects gracefully no-op on touch devices.
2. Global backdrop (app/layout.tsx): harmonize the fixed tech-grid + rim glows with the deepened palette and the new ice accent so the whole site shares the hero's atmosphere. Keep it subtle and masked.
3. Ticker: make the trust marquee read more like an instrument strip — hairline top/bottom, mono labels, slightly higher contrast, smooth infinite loop, paused under reduced-motion.
4. HudStat: ensure the count-up respects reduced-motion (snap to final value), tabular-nums, and the numbers use the prestige/metallic treatment so the stats feel premium.
5. Nav: give the sticky header a more refined glass treatment consistent with `.glass-premium`; verify the mobile sheet menu looks polished and the logo mark matches the loader's reticle styling.
6. CTA section: upgrade the closing CTA's glow to the new palette so it echoes the hero.

Keep everything mobile-first and reduced-motion-safe. Run the build and confirm no regressions on home, pricing, and the nav on mobile.
```

---

## PROMPT 5 — Mobile QA, performance & accessibility verification (run last)

```
Final verification pass on the redesigned marketing home. Do NOT add new features — only verify and fix regressions.

1. Mobile layout: check the home page at 360px, 390px, and 414px widths. Confirm: no horizontal scroll, headline never clips, CTAs are full-width with >=44px tap targets, hero stats are legible over the background, nothing overlaps. Fix anything that fails.
2. Motion: verify prefers-reduced-motion gives a calm static experience everywhere (hero aurora frozen, loader skipped, ticker paused, count-ups snapped). 
3. Performance: confirm no requestAnimationFrame loops were left running unthrottled; animations are transform/opacity only; the hero doesn't pin the main thread. If you can, run a Lighthouse mobile pass (or reason through it) and report performance + accessibility scores; flag anything heavy.
4. Accessibility: AA contrast on hero text and stats over the new background; decorative layers are aria-hidden; focus states intact; the loader is not a focus trap.
5. Build & types: run `pnpm build` (and lint/typecheck). Everything must pass.

Report a short checklist of what passed and what you changed. Then take/describe a 390px screenshot of the hero and the loader so I can confirm.
```

---

## Optional add-ons (only if you want more)

These are extra ideas from reviewing the whole site — hand any to Claude Code as a standalone prompt if they appeal.

- **Device-tilt parallax on mobile**: "On the home hero, add a subtle gyroscope/`deviceorientation` parallax to the aurora layers for phones (a few degrees of shift max), gated behind a permission-safe check and disabled under reduced-motion. Make it feel alive but never nauseating."
- **Section transitions**: "Add a consistent, quiet reveal-on-scroll rhythm between home sections using the existing Reveal component so the page feels choreographed rather than static."
- **Eligibility quiz as a hero option**: "Prototype a variant where the hero's secondary action opens the first eligibility question inline (progressive disclosure), so the hero feels functional, not just decorative." (Keep as a variant; don't replace the current CTA without review.)
- **Loader → hero handoff**: "Make the loader's reticle lock animation visually 'hand off' into the hero (e.g. the mark settles into the nav logo position), so the boot sequence and the page feel like one continuous motion."

---

## Why these choices (quick rationale)

- **Warm brass + cool ice** is the cheapest way to read as "futuristic luxury" — temperature contrast is what makes premium product pages feel expensive.
- **Glass + depth + slow ambient motion** signals high-end far more than bright colors or heavy animation, and it's phone-friendly when done with CSS transforms.
- **Keeping your tokens-in-`brand.ts` discipline** means this stays a one-file rebrand and won't rot.
- **Reduced-motion + mobile-first as hard rules** protect the experience for your actual user base instead of optimizing for a desktop demo.
```
