# Public information accuracy release

**Prepared:** November 22, 2026  
**Production domain:** `https://gunlicensenyc.com`  
**Production project:** `laundry-days-projects/ccw`  
**Production commit reproduced:** `14543d3f31967bf25c51f374596a538cf363fcad`  
**Review branch:** `codex/seo-public-accuracy`  
**Deployment:** intentionally not performed by this handoff

This report records direct HTTP and rendered-browser checks. It does not claim that a
search engine indexed a URL, that an external cache was cleared, or that an AI system
consumed `llms.txt`.

## Baseline reproduced before editing

| Surface | Production observation |
| --- | --- |
| Home, Pricing, About, Contact | `200`, canonical URLs present, one H1 element each |
| Home semantic H1 | Raw H1 text repeated the animated phrase twice |
| Shared V2 footer | Phone and email were absent from Home and Pricing body text |
| Contact page | Phone and email were plain text rather than working links |
| Attorney vanity route | `200`, placeholder body, `noindex`, absent from sitemap |
| Instructor directory | One retired opt-in row was still published and present in the sitemap |
| Sitemap | `44` URLs at the time of the check |
| Unknown synthetic route | Genuine `404` |
| Synthetic token routes | Private/no-store responses; `/g/` was missing from robots exclusions |

## Change group 1 — public cleanup

### Before

The retired database row could flow through the shared public instructor query into
the index page, detail route, static parameters, JSON-LD, and sitemap.

### After

- One exact stable slug is excluded at the shared public-data boundary; no broad name
  matching is used.
- The former route returns a genuine `404`, has `noindex`, and contains no listing name
  or profile payload.
- The release sitemap contains no retired listing URL.
- `scripts/unpublish-retired-public-instructor.ts` provides a narrowly scoped,
  idempotent database operation:
  - default: dry-run with matched and would-change counts;
  - `--apply`: change only the exact row from public to private;
  - `--rollback`: restore that row's prior public flag.
- The operation was prepared but not applied to production.

### Rollback

Revert the public filter change. If the database operation was applied, run the same
script with `--rollback` using the production Supabase environment, then revalidate the
public-instructors cache.

## Change group 2 — confirmed business facts and partnership

### Before

The attorney route showed a coming-soon page, requested no indexing, and was omitted
from public navigation, the sitemap, and `llms.txt`.

### After

- The approved partner registry entry is public and has an honest content-edit date.
- The profile, About page, legal-help article, directory, sitemap, navigation, and
  `llms.txt` use one owner-approved relationship sentence.
- Gun License NYC's administrative role remains separate from the attorney's independent
  legal role; the JSON-LD graph uses distinct `Person`, `LegalService`, and Gun License
  NYC organization IDs.
- Ambiguous claims that the service files for an applicant were removed from pricing,
  requirements metadata, the ticker, trainer onboarding, and four published guides.
- The applicant-controlled submission wording now matches the engagement agreements and
  portal behavior.
- Unconfirmed `legalName` was removed from organization JSON-LD. The stable organization
  ID remains `https://gunlicensenyc.com/#organization`.

### Rollback

Revert the partner and copy commit. If the relationship must be unpublished without
removing its reviewed content, change the registry visibility from `public` back to
`coming_soon`; its preview route will remain noindex and it will leave discovery files.

## Change group 3 — templates, indexing, and contact

### Before

The animated home phrase existed twice in DOM text, the closing CTA duplicated its
desktop/mobile sentence, footer contact links were missing, and `/g/` was absent from
robots exclusions. Sitemap lastmod used the factual-review date for every registered
route.

### After

- The home phrase renders once as semantic text; its blur layer uses CSS-generated,
  `aria-hidden` decoration.
- The closing CTA has one sentence in both raw and hydrated output.
- The V2 footer and Contact page render brand-config phone/email as working `tel:` and
  `mailto:` links.
- `/g/` is excluded alongside other scoped token routes.
- The explicit allow policy includes the current user-directed and search roles
  documented by OpenAI and Anthropic (`OAI-SearchBot`, `Claude-User`, and
  `Claude-SearchBot`) while preserving the owner's existing policy.
- Sitemap content-edit dates and human-review dates are separate. `lastmod` is omitted
  unless a trustworthy meaningful edit date exists.
- Blog article `dateModified` now reads the same `updated` value used by the sitemap.

### Rollback

Revert the template/indexing commit. No database or customer-state rollback is needed.

## Production-candidate verification

| Check | Result |
| --- | --- |
| ESLint | pass |
| Unit tests | `622 passed`, `1 skipped` |
| Focused public-accuracy tests | included in unit result; all pass |
| Next.js production build | pass; `146/146` static pages generated |
| Raw representative routes | `200`, correct canonicals, one H1 each |
| Attorney route | `200`, indexable metadata, confirmed relationship in primary HTML |
| Former instructor route | genuine `404`, no profile payload |
| Unknown route | genuine `404` |
| Sitemap | `45` intentional URLs; partner added, retired listing absent |
| JSON-LD | stable company ID; attorney `Person` works for distinct firm node |
| Home H1 | one phrase in raw HTML and one accessible heading after hydration |
| Responsive checks | no horizontal overflow at 390 px or 1440 px on Home, Pricing, Contact, or attorney page |
| Footer contacts | visible, clickable, and inside viewport at both tested widths |
| Contact form | six controls, zero unlabeled controls |
| Private route discovery | `/g/` present in robots exclusions; no token routes in sitemap |

The complete database/RLS test project could not run because the local Supabase/Docker
stack was unavailable. It must be run against a reset-and-seeded local database, never
against production:

```sh
pnpm db:reset
pnpm seed
pnpm db:types
pnpm test
```

## Owner-only release actions

1. Review the three commits and this report.
2. Run the instructor cleanup script in dry-run mode against production; confirm exactly
   one matched row and the expected would-change count.
3. Apply the operation only after that review, then merge and deploy through the normal
   production pipeline.
4. Re-run direct URL, sitemap, robots, raw HTML, and rendered-browser checks immediately
   after deployment.
5. Inspect added and removed URLs in verified Search Console/Bing properties. External
   indexing and cached results are measurements, not engineering pass/fail claims.
6. Confirm the registered business name before reintroducing any JSON-LD `legalName`.
