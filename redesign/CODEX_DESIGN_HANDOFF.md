# Design handoff brief — Gun License NYC marketing site

## Context

Gun License NYC (gunlicensenyc.com) is a private concierge that runs the NYC
concealed-carry pistol licence process end to end for its clients. The site is one
surface of a much larger Next.js 16 + Supabase application that also contains a
client portal, a staff admin console, an instructor portal, and several tokenised
public flows.

You reviewed the current marketing site and produced a visual direction. We prefer
it to the alternatives and want to build it. This brief explains how we're splitting
the work and exactly what we need from you.

---

## The decision: you design it, Claude Code implements it

This is a division of labour based on where the risk sits, not on capability.

**The risk in this build is codebase context, not design or code quality.** The
repository carries a set of constraints that are invisible from the outside and
expensive to discover, and every one of them is a way this build can go wrong
without anyone noticing until it's live:

- **The brand tokens are global.** `BrandStyle` is mounted in the root
  `app/layout.tsx`, so the CSS variables in `config/brand.ts` are read by the
  marketing site, the client portal, the admin console and the instructor portal
  alike. Changing the palette in place silently restyles three internal
  applications. The new palette has to live in a separate file, scoped to the
  marketing tree only.

- **Routes are registered, not discovered.** `lib/marketing-routes.ts` is the single
  source of truth that the sitemap, the top nav, the footer and `llms.txt` all read
  from. A page that isn't registered there exists but is orphaned — unlinked and
  invisible to search.

- **Some copy is load-bearing and legally required.** The standing disclaimer in
  `config/brand.ts`, the refile promise, and the "we are not attorneys and do not
  represent you before the NYPD License Division" language are compliance
  requirements, not marketing copy. The words *expedite*, *guarantee*,
  *fast-track*, *insider* and *approval rate* are banned sitewide because the NYPD's
  published position is that consulting firms cannot represent applicants or
  expedite anything.

- **This is not the Next.js most models have memorised.** The repo pins Next 16:
  middleware lives in `proxy.ts` rather than `middleware.ts`, and `params`,
  `searchParams` and `cookies()` are async. The repo's own `AGENTS.md` opens by
  telling agents to read `node_modules/next/dist/docs/` before writing code.

- **There is a live performance incident to avoid repeating.** The current homepage
  runs roughly twenty infinite CSS animations plus large blurred compositing layers
  above the fold, with a 2,449-node DOM and ~208 KB of animation CSS. On mobile this
  saturates the main thread: LCP is 2.9 s on a *warm desktop* cache, the nav is
  unresponsive until hydration finishes, and several sections never render at all
  because their text is gated behind JavaScript with no CSS fallback. The redesign
  must not reintroduce any of that.

Claude Code has been working in this repository continuously and holds this context.
Handing it a design file is a well-specified porting task. Handing a second agent
the same task means rediscovering all of the above, and the failure mode is silent —
a broken sitemap or a restyled admin console doesn't announce itself.

**So: we want the design from you, not an implementation, and not a prompt.**

A prompt describing a design is a lossy copy of the design. The exact hex values,
the type scale, the spacing rhythm, the specific way a section breaks at 390px —
all of that survives in a file and evaporates in prose. Please give us the file.

---

## What we need from you

**One self-contained HTML file.** Nothing else.

```
FORMAT
· A single .html file. All CSS in one <style> block in the head.
· No build step, no framework, no React, no Tailwind CDN, no JS bundles.
  Plain HTML and CSS. It is a reference artefact, not a codebase.
· The only permitted external dependency is Google Fonts via <link>.
  Everything else — images, icons, gradients — inline as SVG or data URI.
· It must open correctly by double-clicking it, offline apart from fonts.
```

```
COVERAGE
· Every section of the homepage, in order, at desktop width.
· The mobile layout for every section. Either author it responsively so we can
  resize the window to 390px and see the real thing, or lay out a second column
  of 390px-wide sections beside the desktop ones. Responsive is preferred.
· Nav and footer in both states, including the open mobile menu.
· Every interactive element in its resting state AND its hover/active state,
  even if you have to show them as two static examples side by side.
```

```
SPEC BLOCK — put this in an HTML comment at the very top of the file
· Palette: every colour as a named token with its hex. Say which is the ground,
  which is the single accent, and which are semantic (success / warning / error).
  Include the values for both light and dark if the design supports both.
· Type: font families with weights actually used, the full size scale with
  line-heights and letter-spacing, and which face is display vs body vs mono.
· Spacing scale and radius scale as explicit values.
· Motion inventory: every animation or transition, what triggers it, and its
  duration. If there is none, say so — that is a valid and welcome answer.
· Any illustration or image the design depends on: describe it precisely enough
  to be rebuilt, and if you generated it, include it as a data URI in the file.
```

```
CONTENT
· Use real copy, not lorem and not placeholders. If you need a line we do not
  have, write the line you think it should be — we will edit it.
· Reuse the site's existing facts where the design calls for them: about six
  months start to decision, $1,000 is the only fee we collect, roughly
  $1,950–2,200 all-in, five phases, thirteen stages, five boroughs.
```

---

## Constraints the design itself must satisfy

These are not implementation notes. They change what you should design.

```
1. STATIC BY DEFAULT. No ambient animation anywhere, and nothing infinite. No
   large blurred layers being composited every frame. Motion is permitted on
   scroll entry and on hover, and it must degrade to nothing under
   prefers-reduced-motion. This is the single constraint we care most about,
   because ignoring it is what broke the current site.

2. NOTHING ABOVE THE FOLD MAY DEPEND ON JAVASCRIPT. Every word in the first
   viewport must be legible with JS disabled. No text that starts at opacity 0
   waiting for a script.

3. MOBILE IS THE PRIMARY CANVAS. The current site was composed for desktop and
   collapses into an undifferentiated text scroll on a phone. Design each
   section so its mobile form is a deliberate composition, not a stacked
   fallback. Assume most visitors arrive on a phone.

4. THE FIRST SCREEN CARRIES ONE IDEA AND ONE PRIMARY ACTION. The current hero
   stacks an eyebrow, a headline, a forty-word paragraph, two CTAs, a micro
   line, six rotating captions and a proof strip. That density is a large part
   of why the site reads as cluttered.

5. THE PRODUCT IS THE BEST IMAGE WE HAVE. The client's case file — showing the
   one action that is theirs this week and everything already handled — is the
   most compelling visual asset in the business and it is currently buried
   several screens down. Design a place for it in the first viewport.

6. ROOM FOR THE LEGAL COPY. There must be a considered home for a long,
   unglamorous compliance disclaimer and for the refile promise. They cannot be
   cut, so design them in rather than leaving them to be bolted on.

7. THE REGISTER IS HIGH-END CONCIERGE, NOT CONSUMER APP. The audience is
   New Yorkers paying roughly $2,000 all-in for a demanding six-month
   regulatory process. It should feel calm, precise and expensive.
```

---

## What we do NOT need

- Any React, Next.js, Tailwind config, or component code.
- Any edits to our repository.
- A written specification, a prompt, or a description of the design in prose.
  The file is the specification.
- A rationale document. A short comment block explaining a non-obvious choice is
  welcome; an essay is not.

---

## What happens next

Claude Code takes the file and ports it onto branch `redesign/v2`, keeping the
existing routes, content, metadata and compliance copy, and putting the new palette
in a scoped token file so the portal and admin are untouched. Vercel builds that
branch to its own preview URL, so nothing reaches the live site until we merge. If
something is wrong after merge, Vercel's instant rollback reverts it.

If any of the constraints above conflict with the design you built, say so in your
reply rather than silently working around them — we would rather change the
constraint deliberately than discover the conflict in production.
