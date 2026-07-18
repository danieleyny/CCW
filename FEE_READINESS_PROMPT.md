# Gun License NYC — FEE-01 upgrade: a real fee-readiness hub
### Claude Code prompt

Today FEE-01 is a paragraph + a "Confirm" button. Turn it into the most useful, on-platform fee experience possible — WITHOUT collecting the government fees (we legally can't, and must not appear to). The value we add is clarity, personalization, and preparation: exactly what this person owes, to whom, when, how to pay, and a printable sheet + receipt tracking — so the fee step stops being a vague worry.

**Hard constraint / guardrail (AGENTS.md):** we never collect, process, hold, or route the NYPD or DCJS/fingerprint fees. Those are paid by the applicant directly to the NYPD License Division and to the fingerprint vendor (IDEMIA/IdentoGO). Build guidance and tracking — NOT a payment step for government money. Our own service fee (Stripe/enroll) is entirely separate and unchanged. Also: no guarantee/expedite; amounts come from the platform fee schedule, never hardcoded; the applicant files/pays on the official portals themselves.

`pnpm build` + `pnpm test` + the `verify-*` harnesses pass after each phase.

---

## NYC GROUNDING (use; cite the agency; do not fabricate — especially service codes/amounts)

```
- NYPD application fee: currently $340 (NEW and RENEWAL). Paid to the NYPD License Division ON the online portal
  (licensing.nypdonline.org) at submission. Accepted: credit card, OR two U.S. Postal / bank money orders payable to
  "New York City Police Department". NO cash, NO personal checks. Non-refundable.
- Fingerprint fee: paid to the DCJS-approved vendor IDEMIA/IdentoGO at the fingerprint appointment (NOT to NYPD).
  Accepted: credit card, check, or money order payable to IDEMIA. Amount is set by the vendor and CHANGES — show the
  current platform-schedule value and label it "confirm at the appointment". (Platform currently $88.25; public sources
  have shown ~$89.75 — this is exactly why we read the schedule and caveat it, never hardcode.)
- Scheduling fingerprints: via the IdentoGO website using the correct NY DCJS SERVICE CODE for NYPD handgun licensing,
  or by phone (877) 472-6915. DO NOT invent a service code — pull the correct one from the official NYPD handgun-license
  instructions; if it can't be verified, link the applicant to the official scheduling page rather than printing a guess.
- Retired law enforcement: NYPD APPLICATION fee is WAIVED; the fingerprint fee is STILL owed. (intake: isRetiredLeo.)
- Renewal: same $340 as a new application. (case.is_renewal.)
- Fees are non-refundable regardless of outcome.
Official refs: nyc.gov/site/nypd/services/vehicles-property/firearms-licensing.page · licensing.nypdonline.org · IdentoGO.
```

---

## PHASE 1 — Personalized fee calculation

```
lib/fees.ts today returns a FLAT schedule (applicationFee, fingerprintFee, combined) with no personalization. Add a
computeFeeSummary(context) that reads the schedule and applies the applicant's situation:
  input: { isRetiredLeo, isRenewal, track } (from intake answers + case)
  output: an ordered list of fee line items, each with:
    - label (e.g. "NYPD application fee", "Fingerprint fee (IDEMIA)")
    - amount (from the schedule; $0 with a "waived — retired law enforcement" note when applicable)
    - payTo ("NYPD License Division" / "IDEMIA (fingerprint vendor)")
    - when ("at submission on the NYPD portal" / "at your fingerprint appointment")
    - how (accepted methods per item)
    - a "confirm current amount at payment" caveat on the fingerprint line
  plus a computed total the applicant will owe, and a note that all fees are non-refundable.
Amounts ALWAYS from the fee schedule table (a fee change in admin flows through here). No hardcoded dollar values in the UI.
Add unit tests: retired LEO → application $0 + fingerprint owed; renewal → $340; standard new → $340 + fingerprint.
```

---

## PHASE 2 — Replace the FEE-01 "Confirm" with a fee-readiness hub

```
In lib/requirements/actions.ts, upgrade FEE-01 from a bare attest/Confirm into a richer on-platform experience (its own
panel, opened from the checklist like the other requirements). It shows:
1. THE PERSONALIZED BREAKDOWN from Phase 1 — a clean itemized table: fee, amount, pay to whom, when, how. Retired-LEO waiver
   and renewal reflected automatically. A clear "Total you'll pay directly — not to Gun License NYC" line, and the
   non-refundable note.
2. HOW & WHERE TO PAY EACH — plain steps with the official link:
   - NYPD $340: paid on the NYPD portal at submission; methods (credit card OR two money orders payable to NYPD; no cash/checks).
   - Fingerprint fee: paid to IDEMIA at the IdentoGO appointment; methods; the scheduling link/phone + service-code guidance.
3. A short, reassuring framing: "These go straight to the government and the fingerprint vendor — never to us. Here's exactly
   what to have ready so nothing surprises you at filing."
4. THE CONFIRM STEP becomes meaningful: the applicant acknowledges (a) they understand the amounts and who they're paid to,
   (b) they'll have an accepted payment method ready (optionally select: credit card / money orders), and (c) fees are
   non-refundable. On acknowledgement, mark FEE-01 satisfied and record what they acknowledged (for the audit trail).
Keep it retail-simple and warm; reuse the existing requirement panel/design. Mobile-first.
```

---

## PHASE 3 — Downloadable fee sheet + receipt tracking

```
1. PERSONALIZED FEE SHEET (PDF): reuse lib/pdf/builder.ts to generate a one-page "Your fees & how to pay them" sheet from
   computeFeeSummary — the itemized amounts, who/when/how, the fingerprint scheduling info, and the non-refundable note.
   The applicant can download/print it and bring it to fingerprinting. Label "prepared by Gun License NYC" (not an official form).
2. RECEIPT TRACKING (optional, on-platform): let the applicant upload their NYPD payment receipt and their fingerprint receipt,
   and self-report each fee as paid. Store as documents (proper document types via a new migration — nypd_fee_receipt,
   fingerprint_receipt — NOT the "id" fallback), surfaced to admin on the case. This also feeds the packet (fee receipts are part
   of what NYPD wants). Instructors never see these (same privacy firewall / RLS as other documents).
3. STATUS: FEE-01 satisfied = the readiness acknowledgement (Phase 2). Receipt upload / "paid" is ADDITIONAL tracking, shown to
   the applicant and admin ("NYPD fee — paid ✓ / not yet", "Fingerprint fee — paid ✓ / not yet") — do not block FEE-01 on receipts,
   since payment happens later at filing/appointment.
```

---

## PHASE 4 — Fingerprint appointment helper + reminders

```
Because the fingerprint fee is paid at the appointment, add a small "Book your fingerprinting" helper alongside FEE-01 (or tied
to the fingerprinting_booked stage):
- The IdentoGO scheduling link + phone, the correct NY DCJS service code (verified from official NYPD instructions — never guessed;
  if unverifiable, deep-link to the official scheduler and say so), and a "what to bring" list (ID, the fee, any confirmation).
REMINDERS: use the existing reminders engine (lib/reminders/engine.ts, idempotent) to nudge at the right moments — e.g. when the
case reaches filing readiness ("have your $340 NYPD payment method ready") and when fingerprinting is due ("bring your fingerprint
fee + ID to your IdentoGO appointment"). Respect the existing reminder_log idempotency; no duplicate nags.
```

---

## PHASE 5 — Verify (adversarial)

```
1) NO GOV-FEE COLLECTION: confirm there is NO payment flow that collects the NYPD or fingerprint fee; all copy states these are
   paid directly to the NYPD and IDEMIA, never to us; our Stripe/service-fee flow is untouched and clearly separate.
2) AMOUNTS: every displayed amount derives from the fee schedule (grep for hardcoded "340"/"88.25"/"89.75" in components — none);
   changing the schedule in admin moves the breakdown and the fee sheet; the fingerprint line carries the "confirm at appointment" caveat.
3) PERSONALIZATION: retired LEO shows application fee waived + fingerprint owed; renewal shows $340; standard new shows both. Unit tests pass.
4) NO FABRICATION: the fingerprint service code is verified or replaced with the official scheduler link; no invented codes/amounts;
   nothing claims to be an official NYPD form; agencies cited by name.
5) TRACKING/RLS: receipts store under real document types (not the "id" fallback), visible to admin, invisible to instructors (RLS harness).
6) LEGAL/UX: non-refundable disclosed; no guarantee/expedite; FEE-01 confirm records the acknowledgement; mobile-first at 390px; reminders idempotent.
7) pnpm build && pnpm test && verify-* pass.
Deliver: the fee-summary test results, before/after of the FEE-01 panel, the generated fee sheet, and confirmation there's no gov-fee collection path.
```

---

### Notes for you (not for Claude Code)
- **The line we can't cross:** we can show, explain, personalize, remind, and track — but we cannot take the $340 or the fingerprint fee. Collecting government fees (even to "pass through") would put us in the position NYPD reserves for the applicant and reads as us controlling the filing. The value here is making the fee *effortless to understand and prepare for*, not processing it.
- **Why amounts are never hardcoded:** the fingerprint fee especially drifts (your schedule says $88.25; NYPD's public page has shown $89.75). Reading the schedule + a "confirm at payment" caveat keeps us accurate and honest instead of confidently wrong.
- **Biggest real value-adds:** the personalized breakdown (retired-LEO waiver especially — that's a $340 swing people don't realize applies to them), the printable fee sheet for the fingerprint trip, and the reminders so the fee never ambushes them at filing.
