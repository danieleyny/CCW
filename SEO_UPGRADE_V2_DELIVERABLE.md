# SEO/GEO Upgrade V2 — final deliverable

What shipped across the six phases, the adversarial-verification results, and the
honest list of what still depends on off-site work code cannot do.

Canonical origin: `https://gunlicensenyc.com`. Every page below carries a self
canonical, an OG image, breadcrumbs (except home), a single H1, and is emitted in
the sitemap from one registry (`lib/marketing-routes.ts`) or content directory.

---

## New pages (Phases 3–5)

| URL | Target query | Title (`· Gun License NYC` suffix) | Schema types | In sitemap | Locale |
|---|---|---|---|---|---|
| `/fees` | current nyc gun license fees | Current NYC Gun License Fees | FAQPage, BreadcrumbList | ✓ | en |
| `/instructors` | dcjs certified instructor nyc / 18 hour course nyc | DCJS-Approved NYC Firearms Instructors | ItemList, FAQPage, BreadcrumbList | ✓ | en |
| `/instructors/[slug]` | {name} firearms instructor nyc | {Name} — Firearms Instructor | Person, Course, BreadcrumbList | ✓ (opt-in) | en |
| `/glossary` | nyc gun license terms | NYC Gun License Glossary | DefinedTermSet, BreadcrumbList | ✓ | en |
| `/blog/nyc-gun-license-character-references` | character references nyc gun license | NYC Gun License Character References | Article, BreadcrumbList | ✓ | en |
| `/blog/cohabitant-affidavit-nyc-gun-license` | cohabitant affidavit nyc | Cohabitant Affidavit for NYC Gun License | Article, BreadcrumbList | ✓ | en |
| `/blog/sealed-dismissed-arrest-nyc-gun-license` | sealed arrest nyc firearms application | Sealed or Dismissed Arrest? Full Candor | Article, BreadcrumbList | ✓ | en |
| `/blog/premises-vs-carry-license-nyc-decision` | premises vs carry license nyc | Which NYC Gun License Should You Get? | Article, BreadcrumbList | ✓ | en |
| `/blog/nyc-license-division-interview` | nypd license division interview | The NYPD License Division Interview | Article, BreadcrumbList | ✓ | en |
| `/blog/nyc-gun-license-social-media-disclosure` | nyc gun license social media | NYC Gun License Social Media List | Article, BreadcrumbList | ✓ | en |
| `/blog/18-hour-ccia-course-nyc` | 18 hour ccia course nyc | The 18-Hour CCIA Course, Explained | Article, BreadcrumbList | ✓ | en |
| `/blog/nyc-safe-storage-rules` | nyc gun safe photos / storage rules | NYC Gun Safe Photos and Storage Rules | Article, BreadcrumbList | ✓ | en |
| `/blog/special-carry-license-non-nyc-residents` | special carry license non-resident nyc | Special Carry License: Non-NYC Residents | Article, BreadcrumbList | ✓ | en |
| `/blog/service-lawyer-diy-nyc-gun-license` | service vs lawyer nyc gun license | Service, Lawyer, or DIY: Gun License | Article, BreadcrumbList | ✓ | en |
| `/es` | licencia de armas nyc | Licencia de Armas en NYC | (inherits Org/WebSite) | ✓* | es |
| `/es/cost` | cuánto cuesta licencia de armas nyc | ¿Cuánto Cuesta la Licencia de Armas NYC? | FAQPage, BreadcrumbList | ✓* | es |
| `/es/requirements` | requisitos licencia de armas nyc | Requisitos de Licencia de Armas NYC | FAQPage, BreadcrumbList | ✓* | es |
| `/es/timeline` | cuánto tarda licencia de armas nyc | ¿Cuánto Tarda la Licencia de Armas NYC? | FAQPage, BreadcrumbList | ✓* | es |
| `/es/how-it-works` | cómo obtener licencia de armas nyc | Cómo Obtener una Licencia de Armas en NYC | FAQPage, BreadcrumbList | ✓* | es |

`*` The `/es` surface is flag-gated (`NEXT_PUBLIC_I18N_ES`) and ships **dark**: off
→ those rows 404, no hreflang, no sitemap entries, toggle hidden. The five English
money pages (`/`, `/cost`, `/requirements`, `/timeline`, `/how-it-works`) emit
`hreflang` alternates (`en-US` + `es` + `x-default`→English) pointing at these
twins when the flag is on.

## Plumbing (Phases 1–2, 6)

- **Self-maintaining sitemap + registry** (`lib/marketing-routes.ts`) → sitemap,
  `llms.txt` key-pages, nav, footer all read one list; blog + opt-in instructors
  auto-appended.
- **Metadata-length lint** (`tests/seo-metadata-limits.test.ts`) — fails the
  build if any title+suffix > 60 or description > 155.
- **RSS** at `/feed.xml`; blog `dateModified` from optional `updated:` frontmatter.
- **Keyword-domain 301s** in `next.config.ts` (host-conditional → matching page).
- **Review ASK** (env `NEXT_PUBLIC_REVIEW_URL`) on the license-issued email +
  portal screen — never fabricated ratings, no AggregateRating.
- **Entity graph**: one `@id` Organization/WebSite; `sameAs` env-wired.
- **GA4 conversion events** (`lib/analytics.ts`) — production-only:
  `eligibility_start/complete`, `checklist_generated`, `contact_submitted`,
  `pricing_viewed`. See `SEO_MEASUREMENT_NOTES.md` for which to mark as key events.

## Adversarial verification results

- **Banned words** (guarantee/expedite/fast-track/insider/approval rate/we file/
  on your behalf/endorsed by): **zero** across all new content (grep + copy-guard test).
- **Robots isolation**: `/admin /portal /auth /api /dashboard /style-guide /c/ /r/`
  disallowed; every new public route allowed. No tokenized (`/c/`,`/r/`) link from
  any public page.
- **JSON-LD**: every block on `/fees`, `/glossary`, `/instructors`, and the guides
  parses valid with the expected types and no fabricated fields; all reference the
  Org/WebSite `@id`. No founder/author Person anywhere (only real opted-in
  instructors get a Person node).
- **Privacy**: `public_instructor_directory` view exposes only
  slug/name/boroughs/languages/class_format/bio for opted-in **and** verified rows;
  `tests/rls/instructor-public-directory` proves email/phone/DCJS-id/etc. can't leak.
- **Build + 359 tests green.** Portal / instructor app surfaces untouched; the only
  admin change is the intended public-listing toggle.
- **Legal**: every factual claim renders from `content/facts.ts` (agency + primary
  source + date). No new legal claim was asserted; the Spanish pages keep sourced
  facts in reviewed English. `proper cause` deliberately omitted (Bruen, 2022).

## Still depends on off-site work (owner)

Code cannot do these — see `SEO_OFFSITE_CHECKLIST.md` + `SEO_MEASUREMENT_NOTES.md`:

1. **Search Console + Bing**: verify the domain, submit `/sitemap.xml`, watch
   Pages/Performance. (Meta-tag path wired via `NEXT_PUBLIC_GOOGLE_/BING_SITE_VERIFICATION`.)
2. **Google Business Profile**: create it, then set `NEXT_PUBLIC_GBP_URL` → it flows
   into `sameAs` and unlocks the local pack.
3. **Reviews**: set `NEXT_PUBLIC_REVIEW_URL` (a GBP write-a-review short link) →
   the license-issued email + portal screen start asking. We display none until real.
4. **`sameAs` profiles**: set `NEXT_PUBLIC_{INSTAGRAM,FACEBOOK,LINKEDIN,X,YOUTUBE}_URL`
   only once each profile is live and owned.
5. **Keyword domains**: attach them to the Vercel project so the 301s in
   `next.config.ts` fire (steps in `DOMAIN_STRATEGY.md`).
6. **Spanish review**: have a native-fluent reviewer check `content/es.ts`, then set
   `NEXT_PUBLIC_I18N_ES=true` in Vercel and re-submit the sitemap.
7. **Lighthouse**: run on the production build for home + `/fees` + `/instructors` +
   one guide (dev-server numbers aren't representative); target SEO 100, perf ≥90 mobile.
8. **AI-visibility log**: the manual monthly check in `SEO_MEASUREMENT_NOTES.md` §3.
