# Gun License NYC — richer instructor profiles & offer cards
### Claude Code prompt

The applicant's instructor offer card is thin ("Lior Shenberg · DCJS-credentialed · 0.0 mi · $600 · Classroom: Train Today LLC") because the instructor profile barely collects anything. Fix both sides: collect more from instructors, then surface it so a nervous first-timer can choose with confidence.

**What exists (build on it):** `instructors` table (bio, dcjs_id, verified, service_radius_mi, lat/lng, price_18h_cents, rating_avg/count, jurisdictions). `training_locations` (label, address, borough, is_range). `components/portal/instructor-card.tsx` ALREADY renders locations, bio, rating, distance, price, note, nextAvailable — it just has little data. The applicant feed is `applicant_interest_feed` enriched with `training_locations` + `availability_slots` in app/portal/marketplace/page.tsx.

**Guardrails (AGENTS.md + NY law):**
- The 18-hour course (16h classroom + 2h live fire) is **in-person by law** — an instructor may NOT advertise the required course as "virtual/online." Any "virtual" concept is limited to a clearly-labelled non-required extra (e.g. a free intro/orientation call). Don't let the UI imply a remote required course.
- **Credential integrity:** only show "DCJS-credentialed" when the instructor is admin-**verified** — not merely because a DCJS ID string was typed. (Today the badge shows on `dcjsId` presence — that's a gap.)
- **No fabricated ratings/reviews/credentials.** If `rating_count = 0`, show no rating (or "New to the platform"), never a fake score.
- Privacy firewall unchanged: showing the instructor's OWN business info to the applicant is fine; the applicant's PII still isn't exposed to the instructor pre-accept.

`pnpm build` + `pnpm test` + `verify-*` pass after each phase.

---

## PHASE 1 — Expand the instructor data model

```
New migration (14-digit prefix; never edit a shipped one; run db:types after). Add to `instructors` (nullable unless noted):
- website_url, plus optional social handles (instagram/x/facebook) — links applicants can check.
- years_experience (int), background text (e.g. "Former NYPD firearms instructor", "NRA-certified") — free text, factual.
- languages (text[]) — languages they teach in.
- class_format enum/text: private_1on1 / small_group / both; typical_class_size (int, optional).
- included jsonb or booleans: range_fee_included, ammo_included, materials_included, provides_range (do they supply the live-fire range, or does the applicant go to a separate range?).
- whats_to_bring text, scheduling_notes text (typical availability, how soon they can start), response_time_note.
- offers_intro_call boolean (a free, non-required video/phone intro) + intro_call_note. (NOT the course — the course is in-person.)
- avatar_path / facility_photo_paths (storage) — optional headshot + facility/range photos.
Ensure training_locations captures a usable ADDRESS and clearly distinguishes CLASSROOM vs RANGE (is_range already exists) and, if provides_range=false, which separate range the applicant would use.
Add sensible constraints; keep everything nullable at the row level so signup isn't blocked — the "required before going live" gate is enforced in app logic (Phase 2), not the DB.
```

---

## PHASE 2 — Instructor signup & profile: collect it, require it before going live

```
Keep INITIAL SIGNUP light (name, email, password, DCJS ID) so we don't lose signups. Then gate visibility: an instructor is
NOT shown to applicants / cannot send offers until their profile is COMPLETE and admin-VERIFIED.

1. Expand app/instructor/profile (and the profile form) to collect all Phase-1 fields, grouped clearly: About you (bio,
   experience, background, languages, website/social, headshot) · Your course (price, what's included, class format/size,
   what to bring, provides range?) · Locations (classroom + range, with addresses) · Availability (scheduling notes, intro call) .
2. "GO-LIVE CHECKLIST": show the instructor exactly what's still required before applicants can see them (e.g. at least one
   location, price, bio, languages, and whether the range is included). A clear completeness meter. Framing: "Complete these to
   start getting matched."
3. REQUIRED-BEFORE-VISIBLE set (enforced in the matching/offer logic, not the DB): ≥1 classroom location w/ address, price,
   bio, class format, languages, and range arrangement. Missing any → instructor can't appear in an applicant's feed / send offers.
4. Admin verification (app/admin/instructors) stays the gate for the DCJS credential — surface the new fields there so admin can
   sanity-check before verifying. Verifying confirms the credential; going live also requires the completeness set.
5. Fix the credential badge integrity: "DCJS-credentialed" renders ONLY when verified=true, everywhere it's shown.
```

---

## PHASE 3 — Enrich the applicant-facing offer card + full profile view

```
Give the applicant enough to feel comfortable choosing. Extend components/portal/instructor-card.tsx + the marketplace feed
query (app/portal/marketplace/page.tsx) to pass and render the new data. Two levels:

CARD (at a glance): name + verified DCJS badge (verified only) · optional headshot · distance (see fix below) · price WITH a
one-line "what's included" (e.g. "$600 · 18-hr course · range + ammo included") · class format (private/small group) · languages ·
a short bio snippet · location summary (classroom borough; "range included" or "range: <name>") · next availability · a small
"New to the platform" chip instead of a fake rating when rating_count = 0.

"VIEW FULL PROFILE" (expand/modal — this is what builds trust): full bio + background/experience, all locations with addresses
and classroom/range labels + a map or borough, exactly what's included vs. extra, what to bring, class size, languages,
scheduling/response-time notes, website/social links, facility/range photos, and the free intro-call option if offered. A clear
"Choose this instructor" CTA and, if intro call offered, a secondary "Request a quick intro call" that doesn't commit them.

Copy stays warm and retail-simple. Everything shown is the instructor's own info; no applicant PII flows the other way.

DISTANCE FIX: the card shows "0.0 mi away" — verify the distance computation (applicant location vs instructor base_geog). If the
applicant's location is unknown or the value is 0 due to missing coords, HIDE distance or show the service area ("Serves your
area") rather than a misleading "0.0 mi".
```

---

## PHASE 4 — Compliance & integrity guards

```
- The required 18-hour course is IN-PERSON. Nowhere may an instructor mark the required course as virtual/online. The only
  "virtual" surface is the clearly-labelled free intro call (non-required). Add validation preventing a "virtual course" claim.
- "DCJS-credentialed" and any credential display gated on verified=true (Phase 2 fix) — audit every render site.
- No fabricated ratings/reviews; rating UI only appears with real rating_count > 0.
- Instructor-provided free text (bio, background, what's included) is displayed as their claim — keep it factual; don't let it
  contain guarantee/expedite/endorsed language (light validation + admin review at verification).
- Photos: only the instructor's own uploads; standard file validation (size/type), stored with the same care as other uploads.
```

---

## PHASE 5 — Verify (adversarial)

```
1) DATA→UI: an instructor who fills the full profile produces a rich card + full-profile view (locations w/ addresses, included
   items, languages, experience, website, availability, intro call). Screenshot at 390px + desktop.
2) GATING: an incomplete instructor does NOT appear in an applicant feed and cannot send an offer; the go-live checklist shows
   what's missing. An unverified instructor never shows the DCJS badge.
3) COMPLIANCE: no path lets an instructor advertise a virtual/online required course; the only virtual element is the labelled
   intro call. No fabricated ratings (rating hidden at count 0).
4) DISTANCE: no misleading "0.0 mi" — distance is correct, hidden, or replaced with a service-area label when coords are missing.
5) PRIVACY: applicant PII still not exposed to instructors pre-accept (RLS harness); showing instructor info to applicants is fine.
6) pnpm build && pnpm test && verify-* pass.
Deliver: before/after of the offer card + the new full-profile view, the instructor go-live checklist, and the list of new fields.
```

---

### Notes for you (not for Claude Code)
- **The "virtual" question has a legal answer:** the required 18-hour course (16h classroom + 2h live fire) must be in-person under NY's CCIA — so we can't let instructors market a virtual *course*. What we CAN offer, and what actually reduces a first-timer's anxiety, is a free **intro call** to meet the instructor before committing. The prompt builds that instead.
- **One integrity bug I found:** today the "DCJS-credentialed" badge shows whenever a DCJS ID string is present — not when the instructor is actually verified. So anyone could type a fake ID and look credentialed. Phase 2/4 gate the badge on admin verification.
- **The trust-builders that matter most** for your customer: verified credential, exact locations with whether the range is included, what's included in the price (range fee + ammo surprise people), languages, and a way to meet the instructor first (the intro call). Those move "1 instructor wants to help" from thin to reassuring.
- **"0.0 mi away" is a bug** worth the quick fix — showing a wrong zero is worse than showing nothing.
