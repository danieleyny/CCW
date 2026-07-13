# NYC CCW License Service — System Plan & Build Blueprint

*Prepared June 2026. Placeholder brand: **CarryPath** (swap freely). Stack: Next.js + Supabase + Stripe.*

---

## 1. The Opportunity

You and your instructor partners already do the work — training people, helping them gather documents, filing the NYPD application. The problem is the *operation*, not the service: it's run out of texts, spreadsheets, paper, and memory. That's slow, error-prone, hard to scale past a handful of clients, and it gives clients a low-trust experience for a high-stakes, ~$340-in-fees, six-month-long process.

The fix is a single system that does three jobs at once:

1. **A beautiful, SEO-optimized public site** that educates prospects, ranks for "NYC concealed carry" searches, builds trust, and converts visitors into paying clients.
2. **A client portal** (mobile-first — most clients are on phones) that walks each applicant through every step, collects their documents, shows them exactly where they stand, and reduces the back-and-forth that eats your time.
3. **An admin case-management dashboard** for you — your operational cockpit. Every client, every stage, every blocked task, every payment, in one place, so nothing falls through the cracks and you can run dozens of cases at once.

Because the entire NYC application is already filed online through the [NYPD Permitting & Licensing portal](https://licensing.nypdonline.org), your value is *navigation and execution*: getting people through a deliberately demanding, ~6-month, document-heavy process without mistakes. A system that de-risks that process is the product.

---

## 2. The NYC CCW Process (What the System Must Model)

This is the real-world workflow your software has to mirror. NYC is among the most demanding jurisdictions in the country, and the NYPD retains significant investigative discretion.

### Eligibility (gate before you take their money)
- 21 or older.
- Resident of one of the five boroughs, **or** principal place of business in NYC (non-residents elsewhere in the US generally need a **Special Carry** license — a separate track).
- Legally allowed to possess a firearm (no felony or other disqualifying convictions, no disqualifying mental-health/restraining-order history).
- NYC does **not** recognize carry licenses issued by other NY counties.

### Required training — NYS Concealed Carry Improvement Act (CCIA)
- **18 hours total**: 16 hours in-person classroom + 2 hours live-fire range, taught by a NY State / DCJS-approved "duly authorized instructor."
- Written test, pass at **≥ 80%**.
- This is where your instructor partners plug directly into the system.

### Required documents (the part that goes wrong most often)
- Valid state/federal photo ID (driver license, non-driver ID, or passport).
- **Four notarized character references** — references must be lawful US residents; two may be family, two must be unrelated and not in law enforcement.
- **Notarized affidavit of cohabitant** for *every* person over 18 living in the home (spouse/domestic partner, roommates, adult children).
- **List of all current and former social media accounts for the past 3 years** (CCIA requirement).
- Proof of completion of the 16+2 training course.
- **Safe storage proof**: two color photos of the actual gun safe — one door open, one door closed, showing the entire safe (no stock images).
- Proof of residence / business.

### Filing, fees, investigation
- Application filed online at the NYPD portal; correct license type = **Concealed Carry**.
- Fees: ~**$340** handgun license fee **plus** separate fingerprinting fee (paid to NYPD by card or money order).
- **In-person interview** at the NYPD License Division (One Police Plaza, Room 110A), fingerprinting, FBI background check, and "good moral character" investigation.
- **Timeline: roughly 6 months** from a complete submission to the decision letter.
- License term: **3 years**, then renewal — a recurring revenue hook.

### The stages your software turns this into
1. **Lead / Inquiry** → 2. **Eligibility screen** → 3. **Signed up & paid** → 4. **Training scheduled** → 5. **Training complete (16+2 + test)** → 6. **Document collection** (references, cohabitant affidavits, social media list, safe photos, ID, proof of residence) → 7. **Notarization** → 8. **Application assembled & QA'd** → 9. **Filed on NYPD portal** → 10. **Fingerprinting/interview booked** → 11. **Under NYPD investigation** → 12. **Decision** → 13. **Licensed / renewal reminder (3 yr)**.

Each stage becomes a status with its own checklist, owner, and "what's next" prompt — for both the client and you.

---

## 3. System Architecture

```
                         ┌─────────────────────────────────────┐
                         │         PUBLIC MARKETING SITE        │
                         │  (SSR/SSG for SEO, mobile-first)     │
                         │  Home · How it works · Pricing ·     │
                         │  Eligibility quiz · Blog/Guides ·    │
                         │  FAQ · Book a consult · Contact      │
                         └───────────────┬─────────────────────┘
                                         │  lead capture / signup
                         ┌───────────────▼─────────────────────┐
                         │            CLIENT PORTAL             │
                         │  Mobile-first progress tracker       │
                         │  Step-by-step checklist · Document   │
                         │  uploads · Training schedule · Pay   │
                         │  · Messages · Status timeline        │
                         └───────────────┬─────────────────────┘
                                         │
                  ┌──────────────────────▼──────────────────────┐
                  │                 SUPABASE                      │
                  │  Postgres (data) · Auth (clients+staff) ·     │
                  │  Storage (encrypted docs) · Row-Level         │
                  │  Security · Realtime · Edge Functions         │
                  └──────────────────────┬──────────────────────┘
                                         │
                         ┌───────────────▼─────────────────────┐
                         │         ADMIN DASHBOARD              │
                         │  Case pipeline (kanban + list) ·     │
                         │  Per-client file · Task queue ·      │
                         │  Document review/approve · Payments  │
                         │  · Calendar · Notes · Reporting      │
                         └─────────────────────────────────────┘

  Integrations: Stripe (payments) · Resend/Postmark (email) ·
  Twilio (SMS reminders, optional) · Google/Outlook Calendar (optional)
```

### Why this stack
- **Next.js (App Router)** — server-side rendering gives you real SEO (critical for ranking on "NYC CCW" terms), one codebase for marketing + portal + dashboard, and excellent mobile responsiveness with Tailwind.
- **Supabase** — Postgres + auth + file storage + row-level security in one service. Role-based access (client vs. staff vs. admin) is built in. Document storage with per-user access policies matters a lot here because you're handling sensitive PII.
- **Stripe** — service-fee checkout, deposits, payment tracking. *(You haven't set it up yet — the system is built so payments are scaffolded behind feature flags/env keys and turn on the moment you add your keys, no rebuild.)*
- **Vercel** — push-to-deploy hosting that pairs natively with Next.js.

---

## 4. Data Model (core tables)

- **profiles** — extends Supabase auth; `role` = `client | staff | admin`, name, phone, contact prefs.
- **clients** — applicant record: eligibility answers, borough, resident vs. business vs. non-resident track, assigned staff, current stage, license type.
- **cases** — one active application per client (supports renewals as new cases): `stage`, `status`, opened/closed dates, target file date, NYPD application reference #.
- **case_stages / checklist_items** — templated per stage; each item: title, required?, status (`not_started | in_progress | submitted | approved | rejected`), owner, due date, notes.
- **documents** — uploaded files: type (`id | reference_letter | cohabitant_affidavit | social_media_list | safe_photo_open | safe_photo_closed | training_cert | proof_residence`), status, reviewer, review notes, version history, notarized flag.
- **references** — the 4 character references: name, relationship, family/unrelated flag, contact, notarized flag, received flag.
- **cohabitants** — each adult in the home: name, relationship, affidavit status.
- **training_sessions** — class + range dates, instructor, location, attendance, test score, pass/fail.
- **instructors** — partner instructors, their schedule/availability.
- **payments** — Stripe payment intents, amount, type (deposit/full/installment), status, invoice link.
- **appointments** — consults, training, fingerprinting, NYPD interview; calendar-backed.
- **messages** — threaded client↔staff communication per case.
- **activity_log** — immutable audit trail (who did what, when) — important for a compliance-sensitive business.
- **tasks** — your internal action items, assignable, due-dated, surfaced in the admin task queue.

**Security note baked into the model:** Supabase Row-Level Security so a client can only ever see their own case and documents; staff see assigned cases; admin sees all. All document storage access is policy-gated.

---

## 5. Feature Breakdown

### A. Public marketing site (SEO + conversion)
- **Hero** with clear value prop ("Get your NYC concealed carry license — we handle training, paperwork, and filing") and a primary CTA.
- **Interactive eligibility quiz** — 6–8 questions (age, borough, convictions, residency) that returns "you likely qualify" + captures the lead. This is both a conversion tool and a lead magnet.
- **How it works** — visual step-by-step of the 13-stage journey so prospects understand the value of being guided.
- **Pricing / packages** — tiered service offerings (see §8).
- **Trust builders** — testimonials, # of clients helped, instructor credentials, transparent timeline ("~6 months, here's why").
- **Education hub / blog** — SEO engine. Long-form guides targeting real search intent: "How to get a concealed carry permit in NYC," "NYC CCW requirements 2026," "What documents do I need," "How long does it take," "Cohabitant affidavit explained," "Special Carry for non-residents." This is how you capture organic traffic.
- **FAQ** with schema markup.
- **Book a consultation** + contact form → creates a lead in the dashboard.
- **Technical SEO**: server-side rendering, per-page metadata, OpenGraph, JSON-LD structured data (FAQ, LocalBusiness, Service), XML sitemap, fast Core Web Vitals, mobile-first.

### B. Client portal (mobile-first)
- **Progress dashboard** — big visual timeline showing exactly which of the 13 stages they're in and what's next. This single screen kills most "where am I?" texts.
- **Smart checklist** — only shows what *they* need to do right now; document upload directly from phone camera (e.g., snap the two safe photos).
- **Document center** — upload, see review status (pending/approved/needs fix with your note), re-upload.
- **Reference & cohabitant collectors** — guided forms; optionally email reference links to their references to fill in details.
- **Training scheduling** — pick/confirm class + range dates from instructor availability.
- **Payments** — pay deposit/balance via Stripe, see receipts.
- **Secure messaging** with your team.
- **Notifications** — email/SMS nudges ("Your safe photos were approved," "Action needed: notarize your references").

### C. Admin case-management dashboard (your cockpit)
- **Pipeline view** — kanban board across the 13 stages; drag a client to advance them. Instantly see where everyone is.
- **List/table view** with filters (stage, borough, assigned staff, blocked, overdue, payment status) and search.
- **Today / task queue** — every action item across all cases that needs *you*, sorted by urgency. "What do I do next" answered the moment you log in.
- **Per-client case file** — everything in one place: profile, stage, checklist, all documents (with one-click approve/reject + note), references, cohabitants, training, payments, full message thread, audit log.
- **Document review workflow** — approve/reject with reasons; client is auto-notified.
- **Calendar** — consults, training, fingerprinting, NYPD interviews; reminders.
- **Payments overview** — who's paid, who owes, revenue by month.
- **Bulk actions & templates** — message templates, checklist templates, bulk reminders.
- **Reporting** — funnel (lead → paid → filed → licensed), conversion rate, avg. time-in-stage (spot bottlenecks), revenue.
- **Renewal engine** — auto-flag cases approaching the 3-year expiry and reopen them as renewal cases. Recurring revenue on autopilot.
- **Staff/instructor management** — assign cases, manage instructor availability.

---

## 6. UI/UX & Design Direction

- **Mobile-first, always.** Design every screen for a phone first, then scale up. Thumb-reachable CTAs, large tap targets, camera-based uploads, minimal typing.
- **Trust & authority aesthetic.** This is a legal/firearms service — the look should be clean, confident, and professional (think a modern law/fintech feel), not tactical-camo clutter. Deep navy / charcoal + a single strong accent, generous whitespace, crisp typography. Conveys "we are competent and you can trust us with your sensitive info."
- **Clarity over cleverness.** The whole product promise is *making a confusing process feel simple.* Every screen answers "where am I, what's next, what do you need from me."
- **Progress psychology.** Visible progress bars and completed-step checkmarks reduce anxiety and drop-off in a 6-month process.
- **Accessibility** — WCAG AA contrast, keyboard nav, semantic HTML.
- **Component system** — shadcn/ui + Tailwind for a consistent, fast-to-build, easily-rebrandable design system. Brand tokens (color, logo, name) centralized so swapping in your real brand later is trivial.

---

## 7. Build Roadmap (phased, but one cohesive app)

You chose to build all three together. Suggested sequencing so you get value fast without rework:

**Phase 0 — Foundation (week 1)**
Scaffold Next.js + Tailwind + shadcn/ui, Supabase project, auth with roles, the full data model + RLS, design tokens/brand placeholders, deploy pipeline to Vercel.

**Phase 1 — Admin dashboard core (weeks 1–2)**
Pipeline/kanban + list, per-client case file, checklist engine, document review, task queue, manual client creation, activity log. *You can run real cases now even before clients self-serve.*

**Phase 2 — Client portal (weeks 2–3)**
Client auth, progress dashboard, checklist, document/photo uploads, references + cohabitant collectors, messaging, notifications.

**Phase 3 — Public site + SEO (weeks 3–4)**
Marketing pages, eligibility quiz → lead capture, pricing, blog/education hub with structured data, sitemap, analytics.

**Phase 4 — Payments + automation (week 4+)**
Wire Stripe (drop in keys when ready), invoices/receipts, automated email/SMS reminders, renewal engine, reporting.

**Phase 5 — Polish & launch**
QA across devices, accessibility pass, seed content for blog, load real cases, go live.

---

## 8. Suggested Service Packages (for the pricing page & Stripe later)

These are starting-point ideas — tune to your market:
- **Self-Guided** — portal access + document checklist + filing help. Lower price.
- **Full Concierge** — everything: training coordination, document prep, notarization help, application assembly + filing, interview prep. Premium price.
- **Non-Resident / Special Carry** — separate track for out-of-area applicants.
- **Renewal** — discounted recurring service every 3 years.
Deposit-to-start + balance-on-filing is a clean payment structure the system already supports.

---

## 9. Compliance, Privacy & Risk Notes

- You're storing sensitive PII (IDs, addresses, social media history, references, cohabitant info). Treat security as a feature: RLS on every table, encrypted storage, least-privilege access, audit logging, and a clear privacy policy + data-retention plan.
- Be precise in marketing copy: you **assist with and guide** the application; you don't issue licenses and can't guarantee approval (NYPD has investigative discretion). The build includes disclaimer placeholders.
- Consider consulting a NY firearms attorney on your terms of service and on where assistance ends and legal advice begins.
- This plan is operational/technical guidance, not legal advice.

---

## 10. What You're Getting Next

Alongside this plan, there's a ready-to-paste **Claude Code build prompt** (`CCW_ClaudeCode_Prompt.md`) that hands the build agent the full spec: stack, data model, RLS, all three surfaces, mobile-first + SEO requirements, Stripe scaffolding, and a phase-by-phase build order. Paste it into Claude Code in a fresh project folder to start building.

---

### Sources
- [NYPD Permits & Licenses](https://www.nyc.gov/site/nypd/services/law-enforcement/permits-licenses-firearms.page)
- [NYPD New Application Instructions](https://licensing.nypdonline.org/new-app-instruction/)
- [NYPD Handgun License Required Documents Checklist](https://licensing.nypdonline.org/app-instruction/requireddocs)
- [NY State Gun Safety — Concealed Carry FAQ](https://gunsafety.ny.gov/frequently-asked-questions-new-concealed-carry-law)
- [How to Apply for a NYC CCW (2026 Guide)](https://nysafeinc.com/2025/04/24/how-to-apply-for-a-concealed-carry-permit-in-new-york-city-2025-edition-nyc-ccw/)
- [Concealed Carry in NYC 2025 — Rules, Training & Non-Residents](https://nyguards.com/blog/concealed-carry-in-new-york/)
- [NYS 18-Hour Concealed Carry Training overview](https://psanded.com/courses/firearms/nyccw/)
