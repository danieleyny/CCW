# Concierge UX upgrade — Claude Code build prompt

> Nine changes to the concierge experience, from the 21 Aug walkthrough. Phases 1–2 are what a demo audience sees; Phase 4 carries a legal finding that **overrides one of the requested features**. Each phase ends `pnpm build` + `pnpm test` green, mobile-first at 390px.
>
> **Guardrails (unchanged, do not regress):** the CP-5 gate governs `application_assembled`+; the journey ends at "ready for your review & filing", never "filed"; `case_requirements.notes` stays instructor-safe; the signature-exclusion rules in `lib/concierge/review.ts` hold; no guarantee / expedite / we-file language.

---

## PHASE 1 — Viewport and layout (what the demo shows)

### 1.1 The Calendly embed is cut off

`components/portal/concierge/book-call.tsx` renders the scheduler in a **fixed `h-[640px]` iframe**. Calendly's inline booking view needs roughly 1,000–1,100px, so the applicant scrolls *inside* a box that's already inside the page — two nested scrollbars, calendar half-visible.

```
1. HIDE THE DUPLICATE HEADER. Add `hide_event_type_details=1` to the embed URL.
   Calendly's header currently repeats the logo, "Gun License NYC", the event
   name and the duration — all of which the card directly above it already says.
   Removing it reclaims ~250px AND kills the double-branding.
2. THEME IT. The white Calendly panel inside a dark card is the most jarring thing
   on the page. Pass Calendly's appearance params from the brand tokens:
     background_color=07080B   text_color=<text-mid hex>   primary_color=C9A24B
   (hex without the leading #). Verify against the real rendered result — if the
   dark theme reads poorly, keep it light but wrap it in a white rounded panel with
   generous padding so it looks deliberate rather than pasted in.
3. AUTOSIZE. Replace the raw <iframe> with Calendly's official inline widget
   (widget.js + a `calendly-inline-widget` div): it posts height changes to the
   parent and resizes itself, so the embed can never be clipped again by a event
   that adds a field. Keep the utm_content token — it must survive the swap or the
   webhook can't match the booking to a case.
4. FALLBACK HEIGHT for the moment before the script loads and for script-blocked
   browsers: min-h-[1080px] on desktop, min-h-[1180px] at <640px. Never a fixed
   height. The container must never scroll internally.
5. Keep `hide_gdpr_banner=1`.
```

**Separately — fix the duration contradiction.** The Calendly event is set to **30 min**; the card above it says "Fifteen minutes — no prep needed", and so does the welcome message. Pick one. If the call is really 30 minutes, update `book-call.tsx` and the Calendly description; if it's 15, change the event. Right now the page contradicts itself in the same screenshot.

### 1.2 Views arrive pre-scrolled

Choosing a path lands on the concierge dashboard **at the scroll position of the previous page**, so the applicant's first impression is the middle of the page. This is client-side navigation preserving scroll.

```
1. Add a small client component <ScrollToTop /> (useEffect → window.scrollTo({top:0}))
   and mount it on /portal/concierge, /portal, and /portal/choose-path.
2. It must NOT fight the #vault deep link — skip the reset when
   window.location.hash is present, so "the one thing we need from you" still
   jumps to the vault correctly.
3. Check the post-Stripe return too (success_url → /portal?enrolled=1) and the
   access-code redemption path — every entry into a dashboard starts at the top.
```

### 1.3 Reorder the concierge dashboard

Current order: ControlTower → BookCall → DocumentVault → ReviewAndFile → Messages. The applicant reads "the one thing we need from you is your driving abstract", scrolls into a calendar, scrolls again into uploads. Three different asks in three directions.

```
NEW ORDER, conditional on whether the intro call is booked:

  NOT BOOKED  →  1. Welcome header
                 2. BookCall (full scheduler, top of page — this is THE next action)
                 3. ControlTower
                 4. DocumentVault
                 5. ReviewAndFile
                 6. Messages

  BOOKED      →  1. Welcome header
                 2. ControlTower — with the confirmed call shown as a compact strip
                    inside or directly beneath it ("Your intro call: Thu 4:00 PM · Join")
                 3. DocumentVault
                 4. ReviewAndFile
                 5. Messages

Rationale: an unbooked call is the single most valuable action and deserves the
fold. A booked call is a fact, not a task, and must not push the real work down.
BookCall already branches on introCall?.scheduledAt — reuse that branch.
```

---

## PHASE 2 — The document vault

### 2.1 The registry already has the how-to; the vault throws it away

`lib/requirements/actions.ts` carries `steps[]`, `sourceUrl`, `sourceLabel` and `example` for every obtain-mode requirement. **`buildVaultItems` maps only `title` and `help` and drops the rest** — which is exactly why the driving abstract card tells the applicant what to fetch and nothing about how.

```
1. Extend VaultItem with steps, sourceUrl, sourceLabel, example, multiple.
2. Render a collapsible "How to get this" inside each vault card — closed by
   default so the vault stays short, numbered steps, the source link as a button
   at the end, the example illustration where one exists.
3. Do this generically, from the registry. Every obtain requirement gets a guide
   for free, now and in future — do NOT special-case individual documents in the
   component.
```

### 2.2 The lifetime driving abstract guide (verified against DMV + NYPD, 21 Aug 2026)

`DMV-01` already has decent steps. Replace them with this — the ordering-flow detail is what people actually get stuck on:

```
Title:  Your lifetime driving record (one for every state you've lived in)
Steps:
 1. Go to the NYS DMV driving-records page and scroll to "Order Your Driver Abstract".
 2. Sign in with a NY.gov ID — or create one. You'll need your Client ID number OR
    the document number from the back of your licence, your date of birth, the state
    and ZIP on file with the DMV, and the last four digits of your Social Security
    number.
 3. New account: set up two-factor authentication and three security questions.
 4. Choose LIFETIME — not Standard. Standard covers three years and the NYPD will
    reject it. This is the single most common mistake.
 5. Pay the fee (about $7).
 6. Download the PDF immediately. DMV only keeps it available in MyDMV for five days
    after purchase.
 7. Lived in another state in the past five years? Order that state's lifetime
    abstract too — the NYPD requires one per state (38 RCNY §5-05(b)(12)).
 8. Upload each abstract here.

Keep the existing offline fallback (mail form MV-15C, $10, or in person) as a
collapsed "The online login isn't working" note — components/portal/dmv-fallback
already exists; surface it inside the same collapsible rather than as a sibling.
```

Steps 4 and 6 are the two that cost people a re-order. Give them visual weight — bold, or a small warn-toned callout.

### 2.3 Proof of residence — accepted documents list

`RES-01` currently says "utility bill, lease, bank statement, or government correspondence". **The NYPD's own required-documents checklist does not list bank statements or general government mail.** It lists:

```
ACCEPTED (per NYPD License Division required-documents checklist):
  • A current utility bill — electric, gas, cable/internet, or LANDLINE telephone
  • OR a current residential lease, or co-op/condo ownership documentation,
    TOGETHER WITH a signed, filed New York State income tax return showing the
    same address

NOT ACCEPTED:
  • Cell phone bills (the registry already warns about this — keep it prominent)

Every document must show your full name and your NYC address, and be current.

ACTION: render this as a collapsible "What counts as proof" list on the RES-01
vault card. AND — before shipping — re-verify the accepted list against the live
NYPD checklist and correct the registry help text. Telling an applicant a bank
statement works when the NYPD won't take it produces exactly the rejection this
product exists to prevent. If you confirm bank statements ARE accepted, keep them
and cite where. If not, remove them from the help text.
```

### 2.4 Make a completed upload obvious, and get it out of the way

Today an uploaded document shows a small chip in the card's top-right and the card stays exactly where it was. The applicant can't tell at a glance what's left.

```
1. THREE STATES, three visual treatments:
     OUTSTANDING  — current card styling, no accent
     RECEIVED     — brass/amber ring + soft gradient wash + "Received — we're
                    checking this", uploader replaced by a "Replace file" link
     APPROVED     — green ring + green gradient wash + check icon + "Approved"
2. SORT: outstanding first (in the existing ORDER), then received, then approved.
   The next thing to do is always at the top of the vault.
3. Animate the transition — a brief highlight as a card moves down — so the
   applicant sees that their upload caused it rather than the list just jumping.
4. HONESTY: do NOT paint a received-but-unreviewed document green. Green means a
   human checked it. A distinct, obviously-positive brass state for "received"
   gives the feedback you want without claiming approval we haven't given — and
   it makes the later green transition meaningful rather than redundant.
5. Update the "N of M in" counter to read as two numbers when they differ, e.g.
   "6 received · 4 approved", so the header tells the same story as the cards.
```

---

## PHASE 3 — Convert the Documents tab into an application review surface

For a concierge applicant, `/portal/documents` currently renders `DocumentLibrary` — the same upload-slot library the self-guided path uses. It presents work to someone who paid $1,000 not to do work, and it's the largest remaining place the concierge experience breaks character.

```
1. Branch /portal/documents on service_mode. Concierge → a new, READ-ONLY
   <ApplicationReview> surface. Self-guided → today's DocumentLibrary, unchanged.
2. The review surface shows the WHOLE application, grouped, with no upload
   controls and nothing for them to action:
     • Identity & residence      • Training
     • Your history & disclosures • The people we contact
     • Documents we prepare       • Filing
   Each row: the document, its plain-English status, and — the important column —
   WHO HAS IT: "You" / "Your concierge" / "Ellen (reference)" / "NYPD".
3. Add a last-activity timestamp per row ("we checked this Tuesday") so the page
   proves motion between logins. This is the emotional core of the concierge
   product: they are paying to watch it happen.
4. Anything genuinely theirs to do links back INTO the vault or the disclosures
   section. It is never actionable in place.
5. Rename the nav item for concierge: "Documents" → "Your application".
6. DO NOT reuse `conciergeScope` for this. That field mirrors
   `requirements.concierge_scope` in SQL and governs what an engaged TRAINER may
   see — it is a privacy control with RLS tests behind it. Introduce a separate,
   clearly named concept (e.g. `applicantSurface: 'vault' | 'review' | 'hidden'`)
   for what the APPLICANT sees. Conflating the two would silently widen instructor
   visibility.
```

---

## PHASE 4 — Disclosures: the legal answer is NO, and it changes the design

**You asked whether to add an agreement letting us sign the disclosures on the applicant's behalf. Do not build that. It isn't permitted, and the fallback you described is the correct design.**

New York Penal Law § 400.00(3) states plainly: **"An application shall be signed and verified by the applicant."** "Verified" is a term of art — a statement sworn to be true. § 400.00(1) allows a licence only after the officer finds "all statements in a proper application… are true", and requires revocation where "an applicant knowingly made a material false statement on the application." The NYPD's own checklist requires the applicant's signature on the Affirmation of Understanding, and requires the cohabitant affidavits and character-reference letters to be **notarized** — a notary attests that the named person personally appeared and signed.

A power of attorney does not cure this. A verification is a sworn statement of personal knowledge; an agent cannot swear to another person's facts. And signing the applicant's name to a document filed with a government agency risks NY Penal Law § 175.35 (offering a false instrument for filing, a class E felony) and Article 170 forgery — for the business, alongside revocation for the client.

38 RCNY § 5-03 is silent on signature-by-agent, which does not create permission: the Penal Law controls.

**So: the applicant signs, always. Build the flow that makes that feel effortless — which is already 80% built.**

```
1. ADD A FIRST-CLASS "Your disclosures" SECTION to the concierge dashboard,
   between the vault and Review & file.
   Today DSC-01/QUE-01/ARR-01/OOP-01/DIR-01 are conciergeScope:'hidden' and the
   concierge dashboard filters generate-mode items out of "the one thing we need
   from you" — so a concierge applicant is never actually walked to them. Close
   that gap.
2. THE FLOW:
     a. A short, plain-English explainer: the NYPD application asks about your
        history (questions 10–28); every "yes" needs a written explanation; we
        draft them with you.
     b. The questionnaire, one question at a time, warm and non-interrogative.
        PREFILL from intake — they answered the arrest / order-of-protection /
        mental-health questions there already, and asking twice reads as distrust.
        Frame it as "confirm what you told us."
     c. We generate the addendum (PD 643-041A) from their answers.
     d. They VIEW the prepared document.
     e. ONE TAP adopts the signature captured at the agreements gate.
   Steps (d) and (e) already exist in ReviewAndFile via signRequirementDocument —
   reuse that action, do not build a second signing path.
3. HARD CONSTRAINTS on the signing UX:
     • Per-document affirmation stays. NO "sign everything" button. Each document
       must be individually presented and individually adopted — that per-document
       affirmative act is what makes the signature the applicant's own.
     • The draft must be viewable BEFORE the sign control is usable.
     • Keep the existing document-fingerprint record so a signature is provably
       bound to the exact version shown.
     • The exclusions stand and must be re-tested: character references (the
       reference signs + notarizes), cohabitant affidavits (the household member
       signs + notarizes), the safeguard acknowledgment (the designated safeguard
       signs), and the NYPD application itself (filed and signed by the applicant
       on the NYPD portal).
4. COPY: never imply we sign, submit, or file. "We prepare it — you sign it" is
   the promise, and it is also the law. Say the quiet part warmly: "This one has
   to be your signature. We've done everything up to it."
5. Have your attorney confirm before launch. This is a solid reading of the
   statute and the NYPD's published requirements, not legal advice, and the
   consequence of being wrong lands on your client's application and your business.
```

---

## VERIFY

```
1. Calendly renders fully at 1440px, 1024px and 390px with NO internal scrollbar
   and no clipping; the utm_content token still reaches the webhook and a test
   booking still fills the confirmed-call card.
2. The stated duration matches the Calendly event everywhere it appears.
3. Every dashboard entry starts at the top; the #vault deep link still jumps.
4. Unbooked → scheduler above the fold. Booked → compact strip, vault visible
   without scrolling past a calendar.
5. Every obtain requirement shows a working "How to get this" from the registry —
   spot-check three, including one with no `example`.
6. The abstract guide names LIFETIME and the five-day download window.
7. The proof-of-residence list matches the live NYPD checklist; the registry help
   text no longer claims anything the NYPD doesn't accept.
8. Upload → card visibly changes state and re-sorts below outstanding items;
   approve → green. A received document is never shown as approved.
9. Concierge /portal/documents has zero upload controls and zero actionable
   controls; self-guided is byte-for-byte unchanged.
10. RLS negative tests still pass — the new applicant-surface concept did not
    touch `concierge_scope`, and trainer visibility is unchanged.
11. Disclosures: the section appears, prefills from intake, generates the addendum,
    and one tap adopts the signature. No sign-all control exists. REF/COH/SAF and
    the NYPD application remain unsignable by the applicant in-app.
12. pnpm build && pnpm test green; 390px on every screen touched.
```

## DO NOT

- Do not add an agreement authorising us to sign the applicant's disclosures.
- Do not build a "sign all documents" control.
- Do not show green/approved styling for a document staff haven't reviewed.
- Do not reuse `conciergeScope` for applicant-facing visibility.
- Do not give the concierge applicant an upload control on the review surface.
- Do not let the Calendly embed keep a fixed pixel height.
