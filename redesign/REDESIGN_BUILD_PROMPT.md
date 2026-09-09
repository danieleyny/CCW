# Marketing redesign — build from the visual spec

## Source of truth

`redesign/homepage-visual-spec.html` is the design. It is a self-contained
HTML/CSS reference with a full spec block in a comment at the top of the file:
palette tokens, type scale, spacing and radius scales, a complete motion
inventory, and illustration dependencies. **Read that comment block first and
treat it as the contract.** Where this prompt and the spec disagree, the spec
wins on anything visual; this prompt wins on anything about our codebase.

It contains the homepage plus the shared system: interior article template with
sticky table of contents, the eligibility flow, the open mobile menu, button /
link / row state specimens, and the full footer.

Branch: `redesign/v2`. Do not merge to main.

---

## Codebase constraints — none of these are visible from the design

```
1. BRAND TOKENS ARE GLOBAL.
   BrandStyle is mounted in the root app/layout.tsx, so config/brand.ts is read
   by the marketing site, the client portal, the admin console and the
   instructor portal alike. DO NOT EDIT config/brand.ts.
   Put the new palette in config/brand-v2.ts and inject it scoped to the
   marketing tree only. The app keeps obsidian/brass until we migrate it
   separately as its own project.

2. ROUTES ARE REGISTERED, NOT DISCOVERED.
   lib/marketing-routes.ts is the single source of truth for the sitemap, nav,
   footer and llms.txt. Every page must be registered there or it is orphaned.

3. COMPLIANCE COPY IS LOAD-BEARING.
   Keep verbatim: brand.disclaimer, the refile promise, and the "we are not
   attorneys and do not represent you before the NYPD License Division"
   language. Never introduce expedite / guarantee / fast-track / insider /
   approval rate. The spec has designed homes for all of this — use them.

4. NEXT 16, NOT THE ONE YOU REMEMBER.
   proxy.ts not middleware.ts; params, searchParams and cookies() are async.
   Read AGENTS.md and node_modules/next/dist/docs before writing code.

5. SCOPE.
   app/(marketing) only. Do not touch app/portal, app/admin, app/instructor,
   or any lib/ outside the marketing surface.
```

---

## Motion — port it exactly as specified

The current live site is broken because text sits at `opacity: 0` waiting for
JavaScript that arrives too late. The spec avoids this correctly and **that
correctness must survive the port**:

```
· Scroll-driven animation is wrapped in @supports (animation-timeline: view()).
  Keep that guard. Firefox and older Safari do not support it.

· NO ELEMENT HAS A BASE OPACITY BELOW 1 anywhere in the spec. Verify this stays
  true. If an unsupported browser reads a base rule of opacity:.78, every user
  on that browser gets a permanently dimmed page — which is the same class of
  bug we are fixing.

· Entrances start at opacity 0.82–0.90, never 0, so content is legible before
  and without animation. Do not "improve" this to 0.

· transform and opacity ONLY. Never animate blur, filter, box-shadow, width,
  height or background-position.

· Nothing infinite. No ambient motion. Every animation runs once and settles.

· prefers-reduced-motion disables all of it.
```

---

## Content

Keep every existing route, all existing copy, all metadata and JSON-LD. This is
a visual rebuild, not a content rewrite. Where the spec shows a headline we do
not have, use the spec's — it is better — but do not invent facts.

The interior article template applies to the whole content estate: guides,
borough pages, cost, timeline, requirements, FAQ and the rest. Build it as a
reusable layout, not per-page markup.

---

## Order

```
1. Homepage.
2. The shared chrome — nav, mobile menu, footer.
3. The interior article template, then migrate content routes onto it.
4. The eligibility flow.
```

Commit at each step so any one of them can be reviewed or reverted alone.

---

## VERIFY

```
 1. No horizontal scroll at 390 / 768 / 1024 / 1440.
 2. JavaScript disabled: every word above the fold is legible, the mobile menu
    still opens (it is a native <details>), and no section is blank.
 3. In a browser WITHOUT animation-timeline support, the page renders at full
    opacity and simply does not animate. Test this — it is the failure mode
    that broke the current site.
 4. prefers-reduced-motion: no transforms, no transitions, nothing moves.
 5. The five-phase sticky sequence holds 60fps on a real mid-range Android. If
    it does not, drop the sticky behaviour and keep the section static — say so
    rather than shipping jank.
 6. Lighthouse on the homepage: LCP under 2.5s and TBT under 200ms on a mobile
    profile. The current site is 2.9s LCP on a warm DESKTOP cache.
 7. config/brand.ts is untouched. Open the portal and admin — they look exactly
    as they did before.
 8. Every page appears in the built sitemap.xml and in the footer.
 9. grep the diff for expedite, guarantee, fast-track, approval rate — zero hits.
10. The full disclaimer and the refile promise are present and unedited.
```

## DO NOT

- Do not edit config/brand.ts.
- Do not remove the @supports guard or introduce a base opacity below 1.
- Do not add a JavaScript scroll listener, IntersectionObserver, or an animation
  library. The spec needs none of them.
- Do not touch the portal, admin or instructor surfaces.
- Do not rewrite compliance copy.
- Do not merge to main.
