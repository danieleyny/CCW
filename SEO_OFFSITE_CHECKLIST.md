# Off-site checklist — the things code can't do

Everything in this file happens outside the codebase. It's the work I can't ship for you.

**A note on numbers.** An earlier draft of the build prompt said these levers are "~40%+ of AI
citations." I repeated that back once and shouldn't have — I have no source for it, and neither
does the prompt. There is no credible public breakdown of AI-citation weighting: it differs by
engine (ChatGPT and Perplexity retrieve live; Google's AI Overviews leans on Google's index; a
model's training data is a third channel entirely), by query, and month to month. So nothing below
carries a percentage. Each item says *why it plausibly matters* and stops there. The directional
claim — off-site corroboration matters a lot, and only you can action it — is worth acting on
without a fake number attached to it.

---

## 1. Google Business Profile — the single biggest one

**Why it plausibly matters.** It's the closest thing to an authoritative record of "this business
exists, here's what it does, here's where." It feeds Google's local pack directly, and it's a
strong, structured, independently-hosted corroboration of the entity our `Organization` schema
describes. You cannot self-declare your way into being recommended; GBP is the cheapest real
corroboration available.

- [ ] **Claim and verify** the profile. Nothing else on this list works until verification lands.
- [ ] **Primary category.** There's no perfect category for document-prep/licensing consulting —
      look at what actually ranks for "nyc gun license" and pick the nearest honest fit. Do **not**
      pick "Gun Shop" or a firearms-retail category; it's untrue and it drags the whole entity
      toward the wrong intent.
- [ ] **Services.** List them in the customer's words: eligibility check, training coordination,
      document preparation, notarization coordination, pre-filing review, renewal tracking.
- [ ] **Description.** Use the definition already on the site so the entity is consistent
      (it's the first line of `/about` and of `/llms.txt`):
      > Gun License NYC is a New York City gun-license (concealed-carry) document-preparation and
      > case-management service that guides applicants through the NYPD License Division process
      > end to end.
- [ ] **Service area, not a storefront.** We have no public office address. Set it as a
      service-area business covering the five boroughs. Do **not** invent an address to look
      established — a wrong address is a permanent, hard-to-undo entity error.
- [ ] **Hours** — only if they're real.
- [ ] **Photos** — real ones. No stock, no firearms imagery (it invites the wrong category and the
      wrong ad-policy attention).
- [ ] **Q&A.** Seed it with the questions you actually get. This is public, indexable text that
      answers real queries — effectively a second FAQ that Google owns.
- [ ] **Posts.** Low effort, keeps the profile alive.
- [ ] **Once live: paste the GBP URL into `sameAs`** in `components/marketing/json-ld.tsx`. It ships
      as an empty array with a TODO precisely so nothing fake is in there. This is the wire that
      connects our schema to Google's record of you.

## 2. Real reviews

**Why it plausibly matters.** Reviews are third-party text about you that you didn't write. That's
a different evidence class from anything on your own domain, and it's the kind of corroboration both
local ranking and AI answers lean on when deciding whether to *name* a business.

- [ ] **Ask every completed client.** The natural moment is when the license is issued — the one
      time the relief is real.
- [ ] **Make it one tap.** Use the GBP short link. Every extra step halves the yield.
- [ ] **Never fabricate, incentivise, or gate them.** Beyond being against Google's policy and the
      FTC's, a fake review is exactly the thing that would destroy the candor position the entire
      site is built on. It is not worth it at any volume.
- [ ] **Reply to all of them**, including bad ones. Replies are indexable and they show a human.
- [ ] **Do NOT** add `AggregateRating` to the schema until reviews are real and plentiful. Faking it
      is a manual-action risk and I've deliberately left it out.

## 3. Consistent NAP everywhere

**Why it plausibly matters.** "NAP" = name, address, phone. Every place the business is listed with
*identical* details is another vote that these all describe one entity. Inconsistency doesn't just
fail to help — it actively splits the entity into look-alikes.

The canonical strings (from `config/brand.ts` — copy/paste, don't retype):

```
Name:  Gun License NYC
Area:  New York, NY  (service area: Manhattan, Brooklyn, Queens, The Bronx, Staten Island)
Phone: (929) 352-5961
Email: gunlicensenyc@gmail.com
Site:  https://gunlicensenyc.com
```

- [ ] Byte-identical across GBP, every directory, and every social profile. `(929) 352-5961` — not
      `929-352-5961`, not `+1 929 352 5961`. Pick this format and never vary it.
- [ ] **Apple Business Connect** — feeds Apple Maps and Siri; almost nobody in this niche bothers.
- [ ] **Bing Places** — feeds Bing, and Bing feeds some AI answer engines.
- [ ] General directories: Yelp, Yellow Pages, Better Business Bureau.
- [ ] Legitimate NYC/local business directories. Skip anything that looks like a link farm — it
      does nothing for AI and risks a spam signal.
- [ ] Firearms-training / licensing directories **only where it's honest** — we're a consultancy,
      not a range or an instructor. Miscategorising for reach is the same error as the GBP category.

## 4. Social profiles — for `sameAs`, not for engagement

**Why it plausibly matters.** `sameAs` is how the schema says "these accounts are also me." It's the
main mechanism tying a brand into the knowledge graph these models were trained on and retrieve from.
Every profile is a corroborating node — but only if it's real and it's yours.

- [ ] Create the ones you'll actually maintain: LinkedIn, Instagram, Facebook, YouTube, X. A dead
      profile is fine as a `sameAs` anchor; a *fake* one is not.
- [ ] Same name, same description, same phone, link back to gunlicensenyc.com.
- [ ] **Paste every real URL into `sameAs`** in `components/marketing/json-ld.tsx` and redeploy.
      This is the one code change that's blocked on you.

## 5. Earned mentions

**Why it plausibly matters.** An independent page describing what you do, on a domain you don't own,
is the strongest corroboration there is — and it's the most likely thing to end up in a retrieval
corpus or a training set.

- [ ] Local NYC press or newsletters covering the licensing process.
- [ ] Firearms-training instructors you actually work with linking to you (and you to them).
- [ ] Reddit/forum answers **only** where you're genuinely helping and you disclose who you are.
      Astroturfing is a fabrication with extra steps.
- [ ] Never buy links.

---

## The honest ordering

1. **Google Business Profile, verified.** Everything else compounds off it.
2. **Reviews**, continuously, from real clients.
3. **`sameAs` wired up** once profiles exist — it's a one-line code change I've already prepared.
4. **NAP consistency** as you add listings.
5. **Earned mentions**, slowly, forever.

## The honest expectation

GEO compounds; it doesn't switch on. Expect weeks, not days, before models start naming you, and
longer to stabilise. The exact-match domain is a genuine advantage for the head term. The thing that
makes it *stick* is entity consistency — identical NAP, real `sameAs`, and content that says the same
thing everywhere — which is exactly why nothing in this file is worth faking to accelerate.
