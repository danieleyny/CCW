# Remote Online Notarization (RON) — API integration research & design
**Gun License NYC · prepared July 2026**

## TL;DR

Yes — this is very doable, and you're closer than you think. Your codebase already has a RON *seam* built for exactly this: `lib/notarization/ron.ts` defines a `RonProvider` interface (`startSession` / `fetchResult`), an evidence type, and an env-gated status machine (`disabled → pending_legal → live`) that fails closed. Nobody has to design the architecture from scratch — the job is to (1) pick a provider that has a real API, (2) write one adapter that implements the existing interface, (3) add a webhook that captures the notary's sealed evidence, and (4) get a New York attorney to sign off before flipping it live.

**Recommended provider: Proof (formerly Notarize)** — it has the most mature developer API (transactions, hosted signer links, HMAC-signed webhooks, sandbox), it's the market leader for RON, and its model maps almost one-to-one onto your existing `RonProvider` interface. **BlueNotary** is a credible lower-cost alternative with a similar v2 API if per-seal cost becomes the deciding factor.

The single biggest win: with an API integration, the sealed, notarized document comes **straight back to your platform** via webhook. That deletes the entire "download → go get it notarized → remember to re-upload it" chase that was the whole pain point on your call — the reference/cohabitant notarizes by video and the finished document lands in the case automatically.

---

## 1. Where your system already is (the good news)

`lib/notarization/ron.ts` already contains:

- **`RonProvider` interface** — `startSession({ documentRef, signerName, signerEmail }) → { redirectUrl, sessionId }` and `fetchResult(sessionId) → RonEvidence | null`. This is the exact shape a provider adapter needs.
- **`RonEvidence`** — `{ provider, sessionId, notaryName, notaryCommission, completedAt, sealedDocumentRef }`. This is what we persist as proof.
- **`ronStatus()`** — resolves to `live` only when `RON_ENABLED=true` **and** a provider + API key are configured **and** `RON_PROVIDER_NY_CONFIRMED=true` (i.e. counsel has explicitly confirmed this provider is valid in NY for these documents). A key alone can't turn real notarization on. This is the correct legal guardrail and we keep it.
- **`startRonNotarization()`** server action (`app/portal/notarization/actions.ts`) — already fails closed and returns the offline guidance until a live adapter exists.
- **`ronOptions()`** (`lib/references/notary.ts`) — today just lists BlueNotary / Proof / OneNotary as external links the signer visits on their own (no integration). This becomes the fallback once the API path is live.

So the design below is mostly "fill in the adapter and the return path," not "rebuild anything."

---

## 2. Provider landscape

| Provider | Public API? | How it works | NY RON | Indicative cost | Notes |
|---|---|---|---|---|---|
| **Proof** (formerly Notarize) | **Yes — mature.** `dev.proof.com`: Business API, EasyLink no-code, Webhooks V2 (HMAC-SHA256 signed), sandbox/test notary sessions | Create transaction with signer email + PDF + `requirement: "notarization"`; signer gets an emailed invite **or** you pull a secure access link to redirect them; webhook on completion; retrieve sealed doc + audit-trail/certificate via pre-signed links | Yes (on-demand NY e-notaries) | ~$25 first seal, ~$10–15 each additional seal/signer/witness; org- or signer-paid | Market leader, best docs, cleanest fit to your interface. Business plan / API access is a sales conversation. |
| **BlueNotary** | **Yes.** v2 REST (`app.bluenotary.us/api/integrationsv2/`), Bearer API key, Create Session, Add Document (base64), per-participant signing URLs, webhooks (set up with their team) | Similar create-session → signer URL → webhook → Get Signed Document | Yes | Generally cheaper per notarization than Proof | Good lower-cost alternative; webhook setup is more "talk to support" than self-serve. |
| **OneNotary** | Limited/partner API | On-demand RON, NY supported | Yes | Typically < $25/doc | Strong consumer pricing; API is less documented publicly — would need a partner conversation. |
| **DocuSign Notary** | Yes (enterprise) | RON on top of DocuSign eSignature; API exists | Yes | Enterprise pricing | Overkill unless you're already in the DocuSign ecosystem. |

**Recommendation:** build the adapter against **Proof** first (it's the reference implementation everyone else looks like), and because your `RonProvider` interface is provider-agnostic, keeping a second adapter (BlueNotary) as a cost/redundancy option later is cheap. Get **written per-seal pricing** from both before committing — the public numbers above are indicative, and volume/partner rates aren't published.

---

## 3. The New York legal reality (this is the gate, and it's counsel's call — not code's)

RON is **permanently legal in New York.** Executive Law **§135-c** became permanently effective **January 31, 2023**. The practical rules that matter for us:

- The notary must be a **New York–registered Electronic Notary**, **physically located in New York** during the act (the signer can be anywhere).
- The notary must do **identity proofing** (ID credential analysis, and typically knowledge-based authentication) and capture a **complete, uninterrupted audio-video recording** of the whole act.
- That **AV recording and journal must be retained for at least 10 years.**
- **Affidavits and sworn statements "travel well"** under RON — which is exactly what your two notarized documents are (the **cohabitant affidavit** and the **character-reference letter**). These aren't the risky category (wills/POAs/estate docs get extra scrutiny).

What this means for us: the legal substance is favorable — these are ordinary affidavits, and a compliant RON platform's on-demand NY e-notary satisfies §135-c. **But** the determination that a *specific provider's flow* is valid for *these specific NYPD-application documents* is a legal judgment your existing code deliberately refuses to make on its own (`RON_PROVIDER_NY_CONFIRMED`). So the plan keeps a hard "attorney confirms provider X in writing" step before go-live, routed through your existing `/admin/legal` sign-off culture.

Two things counsel should confirm, concretely: (a) the chosen provider uses **NY-commissioned electronic notaries** for these sessions and is NY DOS-compliant (10-yr AV retention, credential analysis), and (b) nothing about facilitating RON crosses NYPD's line against a consulting firm "representing" or "expediting" — it doesn't, because the applicant/reference/cohabitant still personally appears before a live notary; we're just replacing the physical notary with a video one. (Keep the standing disclaimer from `config/brand.ts` on any RON-related copy.)

---

## 4. How the integration works end-to-end

Here's the flow with Proof as the provider, mapped to your actual files. The reference and cohabitant paths are identical in shape.

**Setup (one-time):** counsel confirms Proof → set `RON_ENABLED=true`, `RON_PROVIDER=proof`, `RON_PROVIDER_API_KEY=…`, `RON_PROVIDER_NY_CONFIRMED=true`, plus the webhook signing key and API base URL. `ronStatus()` now returns `live`.

1. **Document is already prepared.** Your system already generates the ready-to-notarize PDF (the cohabitant affidavit via `lib/cohabitants/document.ts`, the reference letter via the references flow) and can serve it at a URL (`/c/[token]/document`, `/r/[token]/document`). That URL is the `documentRef`.

2. **Signer clicks "Notarize online now."** In `components/public/reference-flow.tsx` / `cohabitant-flow.tsx`, the "notarize" phase currently shows external `ronOptions()` links + a manual upload box. When `isRonLive()`, we add a primary button that calls `startRonNotarization(documentRef)`.

3. **Adapter starts the session.** A new `lib/notarization/providers/proof.ts` implements `RonProvider.startSession()`: `POST /transactions/` with the signer's name/email, the PDF, and `requirement: "notarization"`, then returns `{ redirectUrl, sessionId }` (Proof gives you a secure signer access link to redirect to). The signer is handed off to Proof, verifies ID, and meets the NY e-notary by video — the personal-appearance requirement is satisfied by the video meeting, not by us.

4. **We remember which document this session is for.** Because the webhook later only gives us a `transaction_id`, we persist the mapping at start time in a new small table **`ron_sessions`** (`session_id`, `reference_id` **or** `cohabitant_id`, `document_id`, `case_id`, `status`, timestamps). This is the one genuinely new piece of data model.

5. **Notary completes it; Proof fires a webhook.** A new route **`app/api/notary/webhook/route.ts`** (mirroring your existing `app/api/stripe/webhook/route.ts`) receives `transaction.released`, **verifies the `X-Notarize-Signature` HMAC-SHA256** against the signing key (fails closed on bad signature, exactly like the Stripe webhook and the reminders cron's `CRON_SECRET`).

6. **We fetch and store the sealed evidence.** The webhook handler calls the adapter's `fetchResult(sessionId)` → Proof returns pre-signed links to the **sealed notarized PDF** and the **audit trail / notarial certificate**. We download the sealed PDF into your Supabase `documents` storage, build a `RonEvidence` record, and — critically — this is the **only** path that sets `notarized = true`:
   - look up the `ron_sessions` row by `transaction_id`,
   - attach the sealed document to the `character_references` (or `cohabitants`) row and set `notarized = true` / `affidavit_status = 'notarized'`,
   - call your existing **`recomputeReferenceRequirement()`** / **`recomputeCohabitantRequirement()`**, which already flip REF-01/COH-01 to satisfied on the notarized count and bind the evidence document. Your CP-5 QA gate (`lib/qa-gate.ts`) already counts *notarized* references, so this "just works" downstream.

7. **Everyone sees it update automatically.** The applicant's People/checklist view and the admin People tab already read the same derived states (`invited → opened → submitted → notarized`). No chasing, no re-upload. The offline download-notarize-upload path stays as the guaranteed fallback (and for anyone who prefers in-person).

This preserves your non-negotiable guardrail verbatim: *"We NEVER mark a document notarized unless a valid NY notarization actually occurred and we hold the provider's sealed evidence."* The adapter can only ever **attach real evidence**; it can't assert notarization.

---

## 5. What changes in the product (UX)

Nothing about the current experience is removed — RON becomes the fast default with the manual path as fallback:

- **Reference / cohabitant** on their private link: instead of "Download PDF → go find a notary → upload the stamped copy," they see **"Notarize online now (a few minutes, by video)."** They click, verify ID, meet the notary, done — and the finished document is already in your system.
- **Applicant (Daniel in your example):** the reference/safeguard section flips to "notarized" on its own the moment the video session completes. This directly answers the enforcement worry from the call — you're no longer dependent on the other person remembering to send anything back.
- **The "CC our email / forward it back" idea becomes unnecessary** for the RON path — the sealed doc is delivered to the platform by the provider, not emailed around. (Keep the email/upload flexibility for people who still notarize in person.)

---

## 6. Who pays, and the business model

Two supported models (Proof and BlueNotary both allow either):

- **Org-paid (recommended for your concierge positioning):** you front the ~$25/seal via API and fold it into your service fee (or mark it up as a line item). You control the experience, you always receive the evidence, and it feels "handled" — which is the whole brand. This is the cleanest fit with your Stripe/`service_packages` billing.
- **Signer-paid:** the reference/cohabitant pays at the end; you still retrieve the sealed doc via the webhook/API. Lower cost to you, but a small amount of friction lands on the person doing the favor.

Either way, the **API + partnership is the upsell** you described on the call — "notarize online, right here" as a premium, in-platform convenience rather than sending people off to a third-party site. Get written per-seal and volume pricing from Proof and BlueNotary to model margin.

---

## 7. Build plan (phased, fits your existing patterns)

1. **Commercials + legal (blocking, parallel):** get written NY per-seal pricing and API access from **Proof** (and BlueNotary as comparison); have counsel confirm the provider is NY-DOS-compliant for affidavits/reference letters and record it in `/admin/legal`. Nothing ships live until this returns `RON_PROVIDER_NY_CONFIRMED=true`.
2. **`ron_sessions` migration:** new table + RLS (session ↔ reference/cohabitant/document/case), following your migration conventions (14-digit prefix, RLS in the same migration).
3. **Proof adapter:** `lib/notarization/providers/proof.ts` implementing `RonProvider`; wire `getRonProvider()` to return it when `RON_PROVIDER=proof`. Unit-test against Proof's **sandbox** (they provide test notary sessions and a test document).
4. **Webhook route:** `app/api/notary/webhook/route.ts` with HMAC-SHA256 verification (fail closed), `transaction.released` → `fetchResult` → store sealed PDF → set notarized → `recompute*Requirement()`. Idempotent (dedupe on `transaction_id`, like `reminder_log`).
5. **Public flow UI:** add the "Notarize online now" primary action in `reference-flow.tsx` / `cohabitant-flow.tsx` behind `isRonLive()`, keeping download+upload as fallback.
6. **Verify:** end-to-end in sandbox (start → complete test session → webhook → requirement goes green → sealed doc downloadable in the case); confirm it still fails closed with the flag off and on bad webhook signatures; `pnpm build && pnpm test`.

---

## 8. Open questions to resolve before building

- **Provider choice:** Proof (maturity) vs BlueNotary (cost) — decide after you have written pricing from both.
- **Who pays:** org-paid vs signer-paid (recommend org-paid for the concierge feel).
- **Notary commission:** confirm in writing the provider supplies **NY-commissioned** e-notaries for these sessions.
- **Evidence retention:** the provider holds the 10-yr AV recording; decide what *we* retain (the sealed PDF + certificate at minimum) and reflect it in your retention policy (`lib/retention.ts`).
- **Scope:** turn RON on for both the cohabitant affidavit and the character-reference letter at once (same mechanism), or pilot one first.

---

### Sources
- Proof developer docs — [overview](https://dev.proof.com/docs/overview), [Business API quickstart](https://dev.proof.com/docs/business-quick-start), [Webhooks V2](https://dev.proof.com/docs/webhooks-v2)
- Proof notarization pricing — [Proof Help Center](https://support.proof.com/hc/en-us/articles/22372310048919-How-Much-Does-Notarization-Cost-on-the-Proof-Platform), [Proof pricing](https://www.proof.com/pricing)
- BlueNotary API — [getting started / API reference](https://bluenotary.readme.io/reference/getting-started-with-your-api), [RON API](https://bluenotary.us/connect-with-remote-online-notary-api/)
- NY RON law — [NY Executive Law §135-c (Justia)](https://law.justia.com/codes/new-york/exc/article-6/135-c/), [NY DOS Notary FAQ](https://dos.ny.gov/notary-public-frequently-asked-questions), [Remote Notary New York 2026 guide (Mayo Law)](https://mayo.law/remote-notary-new-york/), [NYSBA: NY Approves RON](https://nysba.org/the-future-is-here-new-york-approves-remote-online-notarization/)
