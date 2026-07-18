# Gun License NYC — site-wide copy upgrade (retail voice)
### Claude Code prompt: educate + persuade + motivate, without losing candor

**The problem this fixes:** the site's copy is excellent at *educating* and *reassuring*, but it speaks from the institution's point of view and barely *sells* or *motivates*. It leads with difficulty ("NYC is among the most demanding jurisdictions"), stays cold where it should be warm ("Talk to a concierge"), describes the machine instead of the benefit ("One case. Every requirement, in one place."), and never speaks to *why* a New Yorker wants this license. Our primary customer is a first-time RETAIL applicant who is anxious and non-expert — the words must make them feel capable and relieved, and give them a reason to want both the license and us.

**The strategic shift (apply everywhere):** move from *"here is a hard process, explained honestly"* to *"here is how we make a hard thing easy for you — and why it's worth doing,"* while KEEPING the candor that makes us trustworthy. Order the emotion on every page: **name the pain → promise the relief → sell the outcome.**

**This is a COPY pass only.** Do NOT change layout, components, design, or structure. Same pages, same sections — only the words change.

**Legal + voice guardrails (non-negotiable, from AGENTS.md):**
- Never use: guarantee, expedite, fast-track, insider, approval rate. Never imply NYPD endorsement or that we file/represent the applicant. Keep `brand.disclaimer`. Keep the candor position (sealed/dismissed arrests ARE disclosed). **Invent NO statistics, testimonials, reviews, ratings, credentials, or outcomes.**
- Voice: warm, confident, plain-spoken, human. Short sentences. Second person ("you"). Contractions. No legalese, no internal jargon (no stage codes/citations in marketing copy). Read at roughly an 8th-grade level. Motivating, never fear-mongering — we reduce anxiety, we don't manufacture it.
- Keep the candor moments serious and still — don't make "Sealed and dismissed arrests are still disclosed" salesy.

Run in order. `pnpm build` + `pnpm test` pass at the end. This is copy — expect no functional changes.

---

## PHASE 0 — Audit & propose (no edits yet)

```
We're doing a site-wide COPY rewrite of the Gun License NYC marketing pages to make them more persuasive and motivating for a retail first-time applicant — WITHOUT touching design, layout, or components. Read:
- app/(marketing)/page.tsx and every app/(marketing)/*/page.tsx
- components/marketing/product-feature.tsx, showcase/the-count.tsx, process-stepper.tsx, cost-card.tsx, refile-promise.tsx, sticky-cta.tsx, page-hero.tsx, footer.tsx, nav.tsx
- config/brand.ts (tagline/description), AGENTS.md (legal + voice guardrails)

Then produce a TABLE of every user-facing string that is a hero title, section headline, eyebrow, subtitle, body lede, button, or form label — with three columns: [current copy] → [proposed rewrite] → [why it's more effective for a retail buyer]. Group by page. Apply the strategy: name the pain → promise the relief → sell the outcome; customer POV; keep candor; obey guardrails. DO NOT edit yet — I want to see the table first.
```

---

## PHASE 1 — Homepage copy

```
Rewrite the homepage copy (app/(marketing)/page.tsx + the section components) to the retail voice. Keep every section and its design; change only words. Guidance per section:

- HERO subhead is already updated ("Getting a gun license in New York City is slow, strict, and easy to get wrong. We make it simple…") — leave it. Make the surrounding trust chips benefit-led: e.g. "One team, start to finish" · "Every step explained" · "You stay in control" (keep the true "you file your own application" idea, warmly).
- PRODUCT FEATURE ("One case. Every requirement, in one place."): reframe from feature to relief. e.g. headline → "Stop juggling forms and deadlines." sub → "We keep the entire application organized and on schedule, so you always know what's done and what's next."
- THE COUNT (24 documents): keep the impressive number, but land it on THEM. e.g. "Twenty-four documents stand between you and your license. We handle every one." Keep it honest, no invented stats.
- PROCESS: frame the steps as "how we carry the weight," not "the machine." Warm, plain labels/one-liners.
- REALITY / "No surprises": KEEP the candor and the honest facts — just make the intro line reassuring rather than clinical. e.g. "Here's exactly what it takes — no surprises, because knowing up front is how this gets done right."
- CANDOR ("Sealed and dismissed arrests are still disclosed."): keep serious and mostly as-is; only lightly warm the supporting sentence. Do not make it salesy.
- COST ("One fee to us. Everything else, at cost."): keep the honest framing; make the intro reassure ("No games with pricing — one fee to us, everything else paid straight to the government or your instructor.").
- CLOSING CTA: make it motivating and low-pressure. e.g. "See if you qualify — it takes two minutes, and there's no commitment." Consider one tasteful outcome line here (see Phase 3).

Run pnpm build. Show me the homepage copy diff.
```

---

## PHASE 2 — Page heroes & CTAs (how-it-works, pricing, eligibility, faq, contact, checklist, resources)

```
Rewrite each page's PageHero (eyebrow/title/subtitle) and its primary CTAs to the retail voice. Keep designs and page metadata titles (those are SEO-tuned) unless the on-page hero title is clearly too cold. Direction per page:

- HOW IT WORKS: stop leading with difficulty. Current "Thirteen stages, executed end to end" / "NYC is among the most demanding jurisdictions…" → reframe difficulty as the reason to hire us. e.g. title "How we get you licensed, step by step" · subtitle "New York's process is tough — which is exactly why having it handled matters. Here's the whole path, and what we do at each point so you don't have to."
- PRICING: "Choose your level of service" is generic. → "Pick how much you want us to handle" · subtitle framing tiers by how much weight lifts off THEM ("From guided support to fully done-for-you — every tier keeps your application complete and on schedule.").
- ELIGIBILITY: "Do you qualify?" is fine but make the sub inviting and reassuring — a 2-minute, no-commitment, no-payment check that tells them where they stand.
- FAQ: warm the sub ("Straight answers to what people ask us most — no jargon.").
- CONTACT: de-transactionalize. "Talk to a concierge" → "Not sure where to start?" · subtitle "Tell us your situation and we'll show you the path — no pressure, no commitment. We reply within one business day."
- CHECKLIST: sell the free value + capture intent ("The exact document list, free — see everything a NYC gun license takes, then let us handle it.").
- RESOURCES: keep the credibility angle (all government-sourced) but warm it slightly.

Buttons everywhere: verb-first, benefit-led, low-pressure ("Check if you qualify", "See pricing", "Get the free checklist", "Talk to us"). Run pnpm build; show the diffs.
```

---

## PHASE 3 — Add the motivation thread (why the license matters)

```
The site never speaks to WHY someone wants this license — the emotional fuel. Add ONE or TWO tasteful, guardrail-safe lines that name the outcome (protection, peace of mind, the right to protect your family) — placed where they fit naturally, NOT plastered everywhere:
- One near the closing CTA on the homepage, and/or one on an /about page if it exists.
- Example register (adapt, don't copy verbatim): "For a lot of New Yorkers, this license is about protecting the people who matter most. We make getting it the easy part."
- Keep it warm and grounded. NO fear-mongering, NO promises of safety/outcome, NO "guarantee". It motivates the goal; it does not overclaim.
This is the one place we're allowed to be a little emotional — use it sparingly so it lands.
```

---

## PHASE 4 — Microcopy & consistency sweep

```
- Sweep all remaining microcopy: sticky mobile CTA, nav CTA, form field labels/placeholders/help text, success/error toasts, footer tagline — bring them into the same warm, plain, benefit-led voice.
- Ensure ONE consistent name for the primary action across the whole site (e.g. always "Check your eligibility" / "Check if you qualify" — pick one and use it everywhere). Inconsistent CTAs confuse buyers.
- Update config/brand.ts `tagline`/`description` if they still read cold, so metadata and JSON-LD inherit the warmer voice (but keep them keyword-sound for SEO).
- Reading-level check: anything that reads above ~8th grade or uses insider jargon on a marketing page gets simplified.
```

---

## PHASE 5 — Verify (adversarial)

```
As a hostile reviewer:
1) VOICE: pick any 5 pages — does each open by naming the pain, then promising relief, then (where appropriate) the outcome? Is it in second person, warm, plain, jargon-free? Name any page still written from the institution's POV or still leading with difficulty as a warning.
2) PERSUASION: does every page give a retail buyer a reason to WANT us (relief/benefit), not just facts? Flag any page that only educates.
3) CANDOR + LEGAL: candor position and brand.disclaimer intact; grep for guarantee/expedite/fast-track/insider/approval-rate/"we file"/"endorsed"; confirm ZERO invented stats/reviews/credentials/outcomes. Report hits verbatim.
4) DESIGN UNCHANGED: confirm only copy changed — no layout/component/structure edits; screenshots of 3 pages match the prior layout.
5) CTA CONSISTENCY: one primary action name used sitewide.
6) BUILD: pnpm build && pnpm test pass.
Deliver: the full [page → old copy → new copy] table, and an honest list of any section where warmth may have gone too far and undercut the candor (that balance is the whole game).
```

---

### Notes for you (not for Claude Code)
- **The tightrope:** your candor is a genuine competitive moat — don't let the warm-up turn it into hype. Phase 5's last check exists to protect that balance. If a rewrite ever trades honesty for sizzle, keep the honest version.
- **Do Phase 0 first and actually read the table** before approving — copy is subjective, and it's cheaper to redirect the direction there than after 8 pages are rewritten.
- **The motivation line (Phase 3) is the highest-leverage add** — naming *why* someone wants the license is the emotional beat the entire site is currently missing. Keep it sparing so it stays powerful.
