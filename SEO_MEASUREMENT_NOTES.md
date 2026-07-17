# Measurement — how to tell if any of this worked

## 1. Google Search Console (do this first)

- [ ] Add the property at [search.google.com/search-console](https://search.google.com/search-console).
      Use the **Domain** property (DNS TXT on Porkbun) so it covers `www`, apex, and https in one.
- [ ] **Submit the sitemap:** `https://gunlicensenyc.com/sitemap.xml`
- [ ] **URL-inspect the money pages** and request indexing: `/`, `/cost`, `/timeline`,
      `/requirements`, `/checklist`, `/pricing`.
- [ ] Check **Pages → Not indexed** after a week. Expect `/admin`, `/portal`, `/auth`, `/c/`, `/r/`
      to be excluded by robots — that's correct, not a bug. `/c/` and `/r/` are the tokenized
      applicant flows and must never be indexed.
- [ ] Watch **Enhancements** for the structured data: FAQ, Breadcrumb, Article.

Also worth doing once: [Bing Webmaster Tools](https://www.bing.com/webmasters) — it takes a GSC
import, and Bing feeds some AI answer engines.

## 2. Keywords to watch

Head terms (the exact-match domain should win these; if it doesn't in ~8 weeks, something is wrong):

```
gun license nyc · nyc gun license · nyc concealed carry · nyc pistol permit
how to get a gun license in nyc
```

High-intent (these convert, and they're what AI gets asked):

```
how much does a nyc gun license cost      -> /cost
how long does a nyc gun license take      -> /timeline
nyc gun license requirements              -> /requirements
nyc gun license documents / checklist     -> /checklist
do i need a lawyer for a nyc gun license  -> /do-i-need-a-lawyer
nyc gun license denied                    -> /denied-appeal
nyc gun license renewal                   -> /renewal
gun license manhattan | brooklyn | queens | bronx | staten island
```

In GSC, the useful view is **Performance → Queries**, filtered to a page. What matters early isn't
position — it's whether you're getting *impressions at all* for the term. Impressions mean you're in
the index and eligible. No impressions means a content or indexing problem, not a ranking one.

## 3. Tracking AI visibility

There is no console for this. Nobody has solved it, and every vendor claiming otherwise is selling
something. The honest method is manual and it's fine:

**Once a month**, in a fresh/logged-out session, ask each of ChatGPT, Perplexity, Google AI Overviews,
Gemini, and Claude:

```
Who helps with a NYC gun license application?
What does it cost to get a gun license in NYC?
Should I use a service or a lawyer for a NYC gun license?
Best NYC gun license service
How long does a NYC concealed carry license take?
```

Log, in a spreadsheet: date · engine · prompt · were we named (y/n) · were we linked (y/n) · who else
was named. That last column is the valuable one — it tells you who the models currently think the
answer is.

Use a fresh session each time. Personalisation and memory will otherwise show you a flattering
answer that no stranger sees.

**Expect nothing for weeks.** GEO compounds. A month of "not named" is data, not failure. If you're
still unnamed after ~8 weeks *and* the off-site checklist is done, the problem is corroboration
(reviews, GBP, mentions), not the site.

## 4. GA4

Already installed (`G-VXS177VWT2`), firing only in production. Worth adding when you have the
appetite: mark **eligibility quiz started** and **contact submitted** as conversions, then segment by
landing page to see which of the new pages actually produce applicants rather than just traffic.

Caveat worth knowing: **AI referrals are largely invisible.** Assistants often summarise without a
click, and when they do link, referrer data is inconsistent. So GA4 will *understate* AI impact.
Treat the manual log in §3 as the real instrument, and GA4 as the floor.

## 5. What to actually check monthly

1. GSC impressions on the head terms — trending up?
2. GSC → Pages: is every new page indexed?
3. The AI log — named anywhere yet? Who else is?
4. GBP: new reviews? questions to answer?
5. Are the fees on the site still correct? They're DB-driven now, so a change in admin updates
   `/cost`, `/faq`, and `/resources` together — but *someone still has to notice the fee changed.*

## 6. Things that would mean something is broken

- **Preview deploys appearing in Google.** They emit `noindex`, so this shouldn't happen. If it
  does, `isIndexableEnv()` in `lib/seo.ts` is wrong.
- **`ccw-eight.vercel.app` URLs in search results.** Canonicals all point at `gunlicensenyc.com`.
  If the old host shows up, something bypassed `CANONICAL_ORIGIN`.
- **`/c/` or `/r/` URLs indexed.** These contain applicant names. This is the one to treat as urgent.
- **A fee on the site that disagrees with the NYPD's.** Everything reads the `fees` table now, so
  this means the table is stale — fix it in admin, not in the code.
