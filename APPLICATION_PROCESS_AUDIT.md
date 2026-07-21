# Gun License NYC — Application Process Audit & Improvement Map
_Prepared for review. Approve the items you want, and we'll turn them into a Claude Code build prompt._

---

## 1. Overall assessment

The system is genuinely strong for its stage. The requirements engine (34 versioned codes across resident / business / non-resident / retired-LEO / renewal / special-carry tracks), the CP-5 pre-filing QA gate, the privacy firewall, the document-generation engine, and the honest compliance posture (applicant files their own application; no expedite/guarantee language; attorney-referral seam; per-rule provenance + `needs_legal_review`) are a better foundation than most competitors have.

The biggest gains now are not more features — they're **clarity for the applicant, leverage for the trainer, a simpler filing hand-off for admin, and keeping the requirement set legally current** as NYC's rules shift under active litigation. This audit maps all four, plus out-of-the-box ideas, into a prioritized list.

A note on overlap: several items here are already captured in prompts we've drafted (portal fixes, document engine, fee readiness, instructor profiles, trainer-concierge, copy voice, SEO). Those are marked "⟳ drafted" so we don't rebuild them — this audit is the connective tissue and the net-new work.

---

## 2. Compliance review (the most important section — legal)

### What we're doing right (keep)
- Applicant always files their own application; we never submit or represent → aligns with NYPD's rule that consulting firms can't file/represent/expedite.
- No "guarantee / expedite / approval-rate / insider / endorsed" language; candor-maximizing (sealed/dismissed disclosed); attorney-referral seam for specific-record questions (avoids practice of law).
- The QA gate blocks filing until blocking requirements, disclosure narratives, training validity, references, and photo spec pass, with named staff sign-off.
- Per-rule provenance + `needs_legal_review` + `/admin/legal` attorney sign-off before client-facing use.

### Live legal-watch items (act on these)
NYC's carry rules are under active, unsettled litigation (CCIA / Antonyuk v. Chiumento; Second Circuit's *Frey v. City of New York*, 2025). Two of our requirements are directly affected:

- **SOC-01 (three-year social-media list): a federal court ruled the social-media disclosure provision unconstitutional and it is NOT being enforced.** Requiring it as blocking is both likely wrong today and a liability. → Make it non-blocking/optional, label its live legal status, and route through attorney review. (Good news: some of our UI already says "optional" — we need it consistent and status-driven.)
- **Sensitive-locations signage rules were partially invalidated** — this affects the content of AFF-01 (affirmation of prohibited/sensitive locations). → Keep the affirmation text current and attorney-reviewed.
- **Reference count (4) remains contested in litigation.** We already handle it track-aware (carry 4 / premises 2 / renewal 0) — keep it configurable and status-tracked.
- **"Good moral character" was upheld (Frey, 2025)** — no change needed.

### Recommended compliance upgrade (net-new, high value)
Add a **legal-status field per requirement** (`enforced` / `enjoined-not-enforced` / `contested` + last-reviewed date + citation), surfaced in `/admin/legal`, so the platform tracks the shifting legal landscape instead of hard-coding a snapshot. Pair it with a **quarterly legal-review cadence** (a recurring task) and a banner when a requirement's status is stale. This turns "we might be requiring something that's been struck down" into a managed, auditable process — and it's a real differentiator you can speak to honestly.

### Data-protection note
We collect highly sensitive PII (arrests, mental-health adjudications, orders of protection, SSN-adjacent identifiers). Confirm: encryption at rest for these fields/documents, a defined retention/deletion policy, and that the RLS firewall (now extended to trainers) is proven by negative tests. Recommend a short **data-retention + privacy policy** pass.

---

## 3. Completeness — is what we collect enough to file?

The registry is close to complete. Recommended action: build a **living coverage matrix** (official NYPD field → our capture point) re-verified on a cadence. Specific gaps/verifications to close:

- **The application form itself (PD 643-041, questions 1–28):** confirm the intake + application worksheet capture EVERY field the online application asks (employment history, prior addresses 5 yrs, physical description, vehicle info if asked, etc.), not just the supporting documents. This is the most likely gap — we're strong on documents, less certain we mirror every portal field.
- **Business/non-resident track:** proof of business address + the reason/necessity for a business carry endorsement — verify PRM-01 fully covers what NYPD wants.
- **Address history (5 years)** for the residence/OOS checks — ensure captured even for in-state moves, not only out-of-state (OOS-01).
- **Passport photo count/spec** (IDN-04 says two) — confirm count + current spec.
- **Spousal/partner notification** — verify whether NYC requires it beyond the cohabitant affidavit.
- **Renewal specifics** — RNW-01 (2-hr live fire within 6 months) exists; confirm the full renewal delta vs. new.

None of these are alarming — the point is to prove coverage field-by-field rather than assume it.

---

## 4. Applicant experience — easier & more valuable

- ⟳ drafted: unified checklist/documents view, plain-language copy, three-level status, stage auto-advance, document questionnaires + signing, fee-readiness hub, "next step at the top."
- **Net-new value-adds worth adding:**
  - **On-platform online notarization** (integrate a remote-notary provider) for references, cohabitant affidavits, and sole-occupancy — today these are the biggest "leave the platform" friction points. Huge simplification; keeps everything on our rails.
  - **Live timeline / status tracker** ("package tracker" for the application): where you are, what's next, realistic ETA, and what's outside anyone's control (the ~6-month NYPD review). Reduces anxiety and support load.
  - **Milestone reminders** (training cert 6-month expiry clock, references outstanding, fingerprint appointment, fee readiness) via the existing reminders engine.
  - **Interview-prep module:** what the One Police Plaza interview involves, what to bring, honest practice questions — a genuine differentiator, and compliant (prep, not coaching to mislead).
  - **Renewal lifecycle:** auto-remind before expiry and re-open a renewal case — recurring revenue + retention.

---

## 5. Trainer / concierge experience — leverage & scale

- ⟳ drafted (big): the trainer-as-concierge upgrade — scoped review/approve, item-anchored revision notes, book-of-business dashboard, next-step engine, admin backstop, disclosures scoped out.
- **Net-new additions on top:**
  - **Templated messaging + saved replies** so a trainer running 20 cases isn't retyping.
  - **Bulk actions** in the "needs your review" queue.
  - **Trainer performance view** (cases active, avg time-to-approve, completion rate) — helps them run a business, no fabricated outcome claims.
  - **Onboarding/quality guardrails** for third-party trainers (a short certification/checklist before they go live) so brand quality scales with the network.

---

## 6. Admin filing workflow — simplify the hand-off

Today: QA gate + packet assembler + manual stage control. Improvements:

- **One-click "filing pack":** the assembled, NYPD-ordered PDF **plus** a **portal-entry worksheet** that mirrors the online application question order, **plus** per-document "upload this here" instructions — so the final submission (by the applicant) is copy-and-go rather than a scavenger hunt. This is the single biggest filing-simplification win, and it stays compliant because the applicant still submits.
- **QA-gate cockpit:** one screen showing exactly what's blocking each near-ready case across the pipeline, so admin works a queue instead of opening cases one by one.
- ⟳ drafted: automatic early-stage advancement (so admin isn't hand-moving every case).
- **Admin batch/queue views** (ready-for-QA, awaiting-applicant, filed-awaiting-decision) for volume.
- **Guided final-QA checklist** tied to the coverage matrix (§3), so sign-off is a confident, itemized step.

---

## 7. Out-of-the-box ideas

- **Online notarization integration** (repeated because it's the highest-leverage one) — turns 3 notarized items from off-platform errands into on-platform steps.
- **AI narrative assistant for disclosures** — drafts a *factual* written explanation from the applicant's OWN stated facts (candor-maximizing, never omission-suggesting), with hard routing to the attorney seam for interpretation. Big time-saver IF built inside the no-legal-advice guardrail; treat as compliance-sensitive.
- **Multilingual support** — NYC is enormously multilingual; pair with instructor `languages` for matching. Real accessibility + market expansion.
- **Fingerprinting explainer** (in-person at the NYPD License Division) + reminders (⟳ partly in the fee prompt). **[CORRECTION 2026-07-21]** This bullet originally read "Fingerprint (IdentoGO) scheduling helper with the correct DCJS service code" — that was WRONG for an NYPD handgun license. Per NYPD's New Application Instructions (steps 3 & 9), NYPD fingerprints in person at the License Division and schedules the applicant itself; there is no IdentoGO/IDEMIA and no DCJS service code for this license type. The app copy was corrected accordingly — see the `ccw-fingerprint-process` note.
- **Referral / partner program** for instructors and satisfied applicants (compliant, no outcome claims).
- **Denial/appeal support track** — RNW/appeal flows exist; make the "if denied, here's the administrative-review path + attorney hand-off" a polished, reassuring module (candor-safe).
- **Trust dashboard / transparency page** — honest, non-outcome metrics (e.g., "cases prepared", "documents tracked") without any approval-rate claims.

---

## 8. Mapped, prioritized improvement list (approve what you want)

**P0 — Compliance-critical (do first)**
1. Requirement legal-status field + `/admin/legal` surfacing + quarterly review cadence; immediately set SOC-01 to non-blocking/"not currently enforced". _(compliance)_
2. Field-by-field coverage matrix vs the official application (esp. PD 643-041 Q1–28 + business track). _(compliance / completeness)_
3. Data retention + encryption/privacy confirmation for sensitive PII. _(compliance)_

**P1 — Highest leverage**
4. One-click filing pack: assembled PDF + portal-entry worksheet + upload instructions. _(admin/filing)_
5. On-platform online notarization integration. _(applicant + trainer, big friction cut)_
6. QA-gate cockpit + admin queue views. _(admin)_
7. Live timeline/status tracker + milestone reminders. _(applicant)_
8. Trainer templated messaging + bulk review + performance view. _(trainer)_ ⟳ extends the concierge build

**P2 — Strong value**
9. Interview-prep module. _(applicant)_
10. Renewal lifecycle automation. _(retention/revenue)_
11. Multilingual support. _(accessibility/market)_
12. AI factual-narrative assistant for disclosures (guardrailed). _(applicant/trainer — compliance-sensitive)_
13. Trainer onboarding/quality certification. _(network quality)_
14. Denial/appeal support module polish. _(applicant trust)_

**Already drafted (don't rebuild — just sequence)**
Portal fixes (doc-type bug, filters, stage advance, next-step-at-top), document engine, PDF/signing polish, fee-readiness hub, instructor profiles, trainer-concierge, copy voice, SEO/GEO.

---

### How I'd sequence it
Do **P0 (1–3)** first — they're legal exposure, and #1 (SOC-01) is arguably urgent. Then **#4 (filing pack)** and **#5 (notarization)** because they remove the two biggest remaining "leave the platform" moments and directly simplify filing for admin, trainer, and applicant at once. Everything else layers cleanly on top.

Tell me which of the numbered items you want, and I'll turn them into a detailed, guardrail-safe Claude Code build prompt.
