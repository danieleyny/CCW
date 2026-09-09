# Partners: a coming-soon gate, and the visual pass to match the design

Phase 1 shipped in `ad9456f` and the structure is right — config-driven, registry
registered, redirect in place, correct JSON-LD, `/do-i-need-a-lawyer` linked. Two
things remain: the pages are invisible, and they don't yet look like the design.

```
STATE TODAY
config/partners.ts        published: false
  → /ethanbrecher         404s
  → /partners             renders the empty state ("We're finalising our partner
                          network"), which is not a coming-soon and has no bypass
public/partners/ethan-brecher.jpg   WAS the background wash, not his portrait.
                                    ALREADY FIXED — see PART B0.
```

---

# PART A — Coming soon, with a preview bypass

## A1 · Replace the boolean with three states

`published: boolean` cannot express "visible as coming soon." Replace it:

```ts
// config/partners.ts
export type PartnerVisibility = "hidden" | "coming_soon" | "public"

hidden       404 everywhere. Today's behaviour. The default for a new partner.
coming_soon  The route RENDERS a coming-soon screen. With a valid preview cookie it
             renders the real profile instead. noindex either way, out of the
             sitemap, out of nav and footer, not in llms.txt.
public       Live, indexed, in the sitemap and nav.
```

Keep the write-in-blood rule from Phase 1: nothing goes `public` until Ethan has
confirmed his credentials, rate, bio and booking URL in writing. `coming_soon` is
for showing him and the team — it is not publication.

Update `partnerBySlug`, `publishedPartners()` and every consumer. Add
`previewablePartners()` for the `coming_soon | public` set and make sure the
sitemap/nav/llms consumers use the **public-only** helper. Grep for every call site;
a partner leaking into the sitemap at this stage is the failure that matters.

Set Ethan to `coming_soon`.

## A2 · The gate

```
CODE      Read from process.env.PARTNER_PREVIEW_CODE. Add it to .env.local and to
          the Vercel project env. Fall back to no access — never to a hardcoded
          default — if the variable is unset, so a missing env var fails closed.
          The code for now is 9226.

COOKIE    Name: glnyc_preview. httpOnly, sameSite lax, secure in production,
          path "/", maxAge 7 days. Value is an opaque marker, never the code.

ENTRY 1   The form on the coming-soon screen posts to a server action that compares
          the submitted code, sets the cookie, and revalidates the path.
ENTRY 2   ?preview=<code> on either partner URL sets the cookie and then REDIRECTS
          to the clean URL. Never leave the code sitting in the address bar or in
          browser history.

EXIT      /partners?preview=off (or a small "exit preview" chip on the previewed
          page) clears the cookie, so you can check what a visitor actually sees
          without opening a private window.
```

```
NEXT 16 NOTES — this version differs from what you may have memorised.
· cookies() is ASYNC. await it.
· Reading cookies opts the route out of static rendering. That is correct here —
  but make sure a `public` partner page goes back to being statically rendered,
  or the eventual launch loses its cache. Read the cookie only when the partner's
  visibility is coming_soon.
· Middleware lives in proxy.ts, not middleware.ts. Do NOT put this gate there —
  it belongs in the page, so the rest of the site is untouched.
· Read node_modules/next/dist/docs before reaching for an API from memory.
```

## A3 · Say what it is

This is a soft preview gate, not authentication. It keeps a work-in-progress page
from being read as finished — it does not protect anything sensitive, and nothing
sensitive goes on these pages. Put that in a comment above the code so nobody later
mistakes it for an access-control boundary and hangs something real off it.

Never render the code, or any hint of it, in the HTML of the coming-soon screen.

## A4 · The coming-soon screen

Not a stock placeholder. It should look like the rest of the marketing site.

```
· Centred column, generous vertical space, the marketing frame (nav + footer stay).
· SectionEyebrow "Coming soon" in brass.
· H1 in the display face: "Our attorney partner page is almost ready."
· One line of prose: we are finalising this with the attorney before it goes live.
· The code field: a single input + button on one row, labelled "Preview code".
  On a wrong code, an inline message under the field — "That code doesn't match."
  No layout shift when it appears, and it must not clear what they typed.
· A quiet link back to /do-i-need-a-lawyer, so the page is not a dead end.
· <meta name="robots" content="noindex,nofollow"> on this screen, always.
```

When the cookie is valid, render the full profile plus a small fixed "Preview —
not live" chip in a corner with an exit link, so nobody screenshots a preview
believing it is published.

---

# PART B — The visual pass

## B0 · The portrait is already fixed — wire it up

`public/partners/ethan-brecher.jpg` was the tonal background wash, not his photo, so
both surfaces would have rendered an empty beige rectangle. Three correct assets are
now in `public/partners/`:

```
ethan-brecher.jpg           720×900, white ground — the CARD portrait
ethan-brecher-cutout.webp   760×905, transparent — the HERO figure
ethan-brecher-panel.jpg     1100×1360 tonal wash — the HERO panel background
```

Extend the config so the profile hero can use the cutout + panel while the card uses
the plain portrait: `photo` gains optional `cutout` and `panel` fields. Do not
hardcode paths in components.

## B1 · The credential band — the biggest single upgrade

The design's strongest element has no equivalent in the build: a full-bleed band
directly under the hero, six cells, hairline dividers.

```
34        10.0        4.9★           2009–26         ALI              AV
YEARS IN  AVVO        53 CLIENT      SUPER LAWYERS   ELECTED          PREEMINENT
PRACTICE  RATING      REVIEWS                        MEMBER, 2013     PEER RATING
```

Display face for the figure, `font-variant-numeric: tabular-nums`, mono uppercase
label beneath. Six columns ≥1024px, three ≥640px, two below. Drive it from a new
`highlights: { figure: string; label: string }[]` on the Partner type — not from
`honors`, which is a different thing and reads differently.

## B2 · Hero portrait treatment

Currently a `rounded-2xl` box with a `from-surface-2 to-surface-1` gradient — it
reads as a UI card, not a portrait.

```
· A panel with the tonal wash as its background, a hairline border and a thin brass
  keyline, with the CUTOUT figure bottom-aligned inside it so he is seated in the
  panel rather than floating in a rounded box.
· Square-ish corners (the brand's small radius), not 2xl.
· The name/credential caption card overlapping the panel's inner edge, as in the
  design — it is what makes the composition read as built rather than placed.
· Keep `priority` on this image only, and give it explicit dimensions so it can't
  shift layout.
```

## B3 · Badge hierarchy

Every badge is currently the same quiet pill, so nothing leads.

```
· Two tiers: the top two credentials (years in practice, Super Lawyers) get a
  brass-tinted variant — brass border at ~40%, brass text, faint brass fill. The
  rest stay outline-only.
· Small radius, not fully rounded. A pill reads SaaS; a slight square reads counsel.
· Add a `tier?: "primary"` flag on the honor entries so the hierarchy is data, not
  a magic index into the array.
· Verify six badges wrap cleanly at 375px with no overflow.
```

## B4 · Fix the credential string surgery

`partner-card.tsx` does `e.label.split(",")[0]` and
`e.label.split(",").slice(1).join(",")` to tease a term out of a label. That breaks
the moment a school has a comma in its name.

```
Change PartnerCredential to { term: string; value: string; detail?: string }:
    { term: "J.D.", value: "New York University School of Law", detail: "1991" }
Render term as the mono label and value/detail as the content. No splitting.
```

## B5 · Rhythm and measure

The profile hero is `max-w-6xl` and everything after it is `max-w-3xl`, so the page
visibly narrows at the second section.

```
· One content measure for prose (~65ch is right for Background).
· Full-bleed bands — credential band, the how-it-works strip, the CTA band — should
  span the wider container with hairline rules top and bottom, so the width change
  reads as a deliberate rhythm instead of a jump.
· Sections currently all use `border-t border-hairline py-10`, which gives every
  section identical weight. Give the two that matter — What he handles, When to
  call him — a raised surface or more air, and let the rest stay quiet.
```

## B6 · Lists

```
· Services: replace the "·" bullet with a small brass square marker, and SHOW
  `s.detail` on the profile page (the card can stay title-only). Two columns ≥640px.
· "When to call him": these are the highest-converting lines on the page. Give them
  ruled rows rather than bullets — a hairline between each, a little vertical
  padding, so each reads as a discrete question.
```

## B7 · The directory page

```
· One card alone on a wide page reads unfinished. Constrain the card's column so it
  sits at a deliberate measure, and let the framing paragraph and the card share the
  same left edge.
· Give the card a subtle raised surface against the page ground so it reads as an
  object, and keep the disclaimer strip visually attached to it.
· Keep the empty state — it will be what shows if a partner is ever unpublished.
```

## B8 · The CTA when there is no booking URL

`partnerSchedule()` falls back to `tel:` with the label "Call his office to
schedule." That is honest and fine — but on the coming-soon build it should be
obvious it is provisional. Add a one-line note under the CTA while the partner is
`coming_soon`: scheduling link to be confirmed with his office.

---

# VERIFY

```
 1. /ethanbrecher and /partners render the coming-soon screen for a fresh visitor.
 2. Entering 9226 reveals the full profile; a wrong code shows an inline error,
    keeps what was typed, and shifts nothing.
 3. ?preview=9226 works and the URL is clean afterwards — the code is not in the
    address bar or in history.
 4. The exit control clears the cookie and the coming-soon screen returns.
 5. With PARTNER_PREVIEW_CODE unset, the gate fails CLOSED — no bypass.
 6. Both pages carry noindex while coming_soon, appear in NO sitemap entry, and are
    absent from nav, footer and llms.txt. Check the built sitemap.xml, not the source.
 7. Setting visibility to "hidden" 404s both routes again.
 8. His actual face renders on both surfaces — open the pages and LOOK, don't trust
    that the file path resolves.
 9. The credential band renders 6 / 3 / 2 across breakpoints with aligned numerals.
10. 375 / 768 / 1024 / 1440: no horizontal scroll, badges wrap, hero stacks with the
    portrait after the CTAs rather than between the headline and them.
11. Both light and dark themes: no hardcoded colours, every surface from tokens.
12. The page still renders correctly with JavaScript disabled up to the gate form.
```

# DO NOT

- Do not put the gate in `proxy.ts`. It belongs in the two pages.
- Do not hardcode the preview code, and do not fall back to a default when the env
  var is missing — fail closed.
- Do not let a `coming_soon` partner reach the sitemap, nav, footer or llms.txt.
- Do not flip anyone to `public` in this pass. That waits on his written sign-off.
- Do not describe the gate as security anywhere in code comments or copy.
- Do not hardcode image paths in components — they belong in the partner config.
- Do not lose the independence disclaimer from the card component while restyling it.
