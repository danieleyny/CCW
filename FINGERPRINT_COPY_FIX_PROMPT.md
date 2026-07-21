# Gun License NYC — fix the fingerprinting process copy (it's wrong)
### Claude Code prompt

Our app tells applicants to get a "NY DCJS service code" and go to "IdentoGO" for fingerprinting. **That is the wrong process for an NYPD handgun license.** Per the official NYPD License Division instructions (licensing.nypdonline.org/new-app-instruction, step 9), fingerprinting is done **IN PERSON at the NYPD License Division** — NYPD contacts the applicant to schedule it after their documents are reviewed. There is **no IdentoGO step and no DCJS service code** for this license type. Fix all of this copy to the verified process.

**Guardrails (unchanged):** government fees are never collected by us; amounts come from the fee schedule (never hardcoded); we don't file/represent; no guarantee/expedite; cite NYPD by name; don't fabricate. `pnpm build` + `pnpm test` pass.

---

## THE VERIFIED PROCESS (source of truth — write the copy to THIS)
```
Official: NYPD License Division "New Application Instructions" (licensing.nypdonline.org/new-app-instruction), steps 3 & 9.

Fingerprinting & fees — standard NYC handgun-license applicant:
1. Complete and submit the online application at licensing.nypdonline.org; upload the required documents; "Finalize and Submit."
2. NYPD reviews the application. Once documents are in, the NYPD License Division CONTACTS YOU to schedule a date and time to
   come IN PERSON to the License Division (One Police Plaza) to pay applicable fees and be fingerprinted.
3. At that appointment: bring ORIGINALS of all uploaded documents and government photo ID. Pay the fingerprint fee (currently
   $88.25) — by MONEY ORDER payable to "New York City Police Department" or by CREDIT/DEBIT CARD. NO personal checks, NO cash.
4. The $340 application fee is paid to NYPD per the portal's instructions (money order to NYPD or card; non-refundable).
   Retired NY law-enforcement officers: application fee waived; everyone still pays the fingerprint fee.
5. After documents are reviewed you're scheduled for an in-person interview; a decision comes ~6 months later.

There is NO IdentoGO, NO IDEMIA, and NO DCJS service code in this process. Remove all of it. The fingerprint fee is collected by
the NYPD License Division at the in-person fingerprinting appointment — NOT by a third-party vendor.
```

---

## Phase 1 — Rewrite the fingerprint/fee copy everywhere
```
Grep the repo for: "IdentoGO", "IDEMIA", "service code", "vendor", "877-472-6915", and fingerprint-appointment language, and
correct EACH to the verified process above. Known locations:
- lib/requirements/actions.ts — FEE-01 help/customerTitle, and the fingerprint "appointment helper" steps (the service-code line
  the user saw). Replace the whole helper with: "After you submit and pay, NYPD will contact you to schedule your in-person
  fingerprinting at the License Division. Bring originals of your uploaded documents and photo ID; the $88.25 fingerprint fee is
  paid there by money order (to NYPD) or card — no cash or personal checks." Delete any 'find/enter a service code' step.
- lib/pdf/fee-sheet.ts — the downloadable fee sheet: fix the "paid to whom / when / how" for the fingerprint fee to "NYPD License
  Division, at your in-person fingerprinting appointment, by money order (to NYPD) or credit/debit card." Remove IdentoGO/service-code.
- config/message-templates.ts — the "Fingerprints reminder" and fee-reminder templates: reflect the in-person-at-License-Division
  process (no "confirmation" from a vendor; instead "NYPD will schedule your fingerprinting — bring your originals + ID").
- lib/reminders/engine.ts — any fingerprint reminder text.
- lib/fees.ts — fix the comments that describe the fingerprint fee as paid to "IDEMIA/IdentoGO"; it's paid to the NYPD License
  Division at the fingerprinting appointment. (Keep the internal fee KEY name 'dcjs_fingerprint' to avoid a data migration — it's
  just an identifier — but the customer-facing label/description must say it's collected by NYPD at fingerprinting.)
- app/llms.txt/route.ts and app/portal/privacy/page.tsx — correct any fingerprint description.
Keep: amounts from getFees()/the schedule; the "we never collect government fees" framing; retired-LEO waiver; non-refundable note;
accepted payment methods (money order to NYPD or credit/debit card; no cash/personal checks).
```

## Phase 2 — Correct the FEE_READINESS build prompt doc
```
Update the repo doc FEE_READINESS_PROMPT.md so it no longer specifies the wrong process for any future execution:
- Replace its "NYC GROUNDING" section and Phase 4 (the IdentoGO/service-code fingerprint-appointment helper) with the VERIFIED
  PROCESS above (in-person at the NYPD License Division; NYPD schedules it; fee paid there; no IdentoGO/service code).
- Keep everything else in that prompt (personalized breakdown, retired-LEO waiver, fee sheet, receipt tracking) — only the
  fingerprint mechanics change.
```

## Phase 3 — Verify
```
- grep the whole repo: zero occurrences of "IdentoGO", "IDEMIA", or "service code" remain in customer-facing copy (comments too).
- The FEE-01 panel, fee sheet, reminders, and templates describe: submit + pay on the NYPD portal → NYPD contacts you → in-person
  fingerprinting at the License Division (bring originals + ID) → pay the $88.25 fingerprint fee there (money order to NYPD or card,
  no cash/checks). Retired-LEO waiver + non-refundable intact; amounts still from the schedule.
- No claim that we collect any government fee; no guarantee/expedite; NYPD cited accurately.
- FEE_READINESS_PROMPT.md updated to the verified process.
- pnpm build && pnpm test pass.
Deliver: the grep results (clean), and before/after of the FEE-01 panel + the fee sheet.
```

---

### Notes for you (not for Claude Code)
- **What was wrong and why it mattered:** the app borrowed the generic New York fingerprinting flow (IdentoGO + a DCJS service code), which is right for many NY licenses but NOT the NYPD handgun license — where NYPD does the prints in-house at the License Division and schedules you itself. Our copy sent users hunting for a code that doesn't exist for them, which is the exact "wrong code → reprint → pay again" trap it warned about.
- **The correct user takeaway** (now baked into the copy): don't look for a service code or an IdentoGO location — submit and pay on the NYPD portal, then wait for NYPD to contact you to come in and be fingerprinted, and bring the originals of everything you uploaded.
- Source: NYPD License Division New Application Instructions, licensing.nypdonline.org/new-app-instruction (steps 3 and 9).
