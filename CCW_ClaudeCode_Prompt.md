# Claude Code Build Prompt — CarryPath (NYC CCW License Service Platform)

> **How to use this:** Open Claude Code in an empty project folder and paste everything below the line. It's written as a single comprehensive brief. Claude Code will scaffold and build iteratively; work through it phase by phase and review each phase before moving on. Replace `CarryPath` with your real brand name once you have it.

---

You are building a production web application for a NYC concealed-carry-weapon (CCW) license assistance service. The business guides clients through New York City's demanding ~6-month CCW application process — training, document collection, and filing on the NYPD portal — and charges for the service. Build a single cohesive Next.js app with three surfaces: a public marketing/SEO site, a client portal, and an admin case-management dashboard.

## Brand
Use a placeholder brand **"CarryPath"**. Centralize ALL brand values (company name, logo slot, color tokens, fonts) in one config/theme file so they can be swapped later without touching components. Aesthetic: clean, professional, high-trust (modern law/fintech feel — NOT tactical/camo). Deep navy/charcoal base, one strong accent color, generous whitespace, crisp typography.

## Tech stack (use exactly this)
- **Next.js (latest, App Router, TypeScript)** with server-side rendering for SEO.
- **Tailwind CSS + shadcn/ui** for the component/design system.
- **Supabase** for Postgres, Auth, Storage, Row-Level Security, and Realtime.
- **Stripe** for payments — scaffold it fully but gate it behind env vars / a feature flag so the app runs without keys and turns on when keys are added (the owner hasn't set up Stripe yet).
- **Resend** (or Postmark) for transactional email; structure SMS (Twilio) as an optional adapter.
- Target **Vercel** for deployment. Use environment variables for all secrets; include a `.env.example`.

## Core principle: mobile-first
Most clients use phones. Design and build every client-facing screen mobile-first (thumb-reachable CTAs, large tap targets, camera-based document uploads, minimal typing), then scale up to desktop. The admin dashboard should be responsive but is desktop-primary.

## Domain model — the NYC CCW process the app must mirror
A client moves through these 13 stages; model them as an ordered enum driving the pipeline and each client's progress timeline:
1. Lead/Inquiry → 2. Eligibility screened → 3. Signed up & paid → 4. Training scheduled → 5. Training complete (16hr classroom + 2hr live-fire + written test ≥80%) → 6. Document collection → 7. Notarization → 8. Application assembled & QA'd → 9. Filed on NYPD portal → 10. Fingerprinting/interview booked → 11. Under NYPD investigation → 12. Decision → 13. Licensed / renewal-due (3-year term).

Required items the app must collect and track per client:
- Eligibility: 21+, NYC borough resident OR NYC business (non-residents = separate "Special Carry" track), no disqualifying convictions/history.
- 4 notarized **character references** (2 may be family; 2 unrelated, non-law-enforcement; all lawful US residents).
- **Cohabitant affidavit** (notarized) for every household member over 18.
- **Social media accounts list** for the past 3 years.
- Proof of **16+2 training** completion.
- **Safe storage photos**: two color photos of the actual gun safe (one door open, one closed, whole safe visible — no stock images).
- Government photo ID; proof of residence/business.
- NYPD application reference #; track ~$340 license fee + fingerprinting fee; ~6-month timeline; 3-year renewal.

## Database schema (Supabase Postgres + Row-Level Security)
Create these tables with appropriate relations, timestamps, and RLS policies:
- `profiles` (extends auth.users; `role` enum: client|staff|admin; name, phone, contact prefs)
- `clients` (eligibility answers, borough, track: resident|business|non_resident, assigned_staff, current_stage, license_type)
- `cases` (one per application; supports renewals as new cases; stage, status, opened/closed/target_file dates, nypd_app_ref)
- `case_stages` / `checklist_items` (templated per stage; title, required, status enum: not_started|in_progress|submitted|approved|rejected, owner, due_date, notes)
- `documents` (type enum: id|reference_letter|cohabitant_affidavit|social_media_list|safe_photo_open|safe_photo_closed|training_cert|proof_residence; status, reviewer, review_notes, notarized bool, version)
- `references` (name, relationship, is_family, contact, notarized, received)
- `cohabitants` (name, relationship, affidavit_status)
- `training_sessions` (class_date, range_date, instructor_id, location, attended, test_score, passed)
- `instructors` (name, contact, availability)
- `payments` (stripe_payment_intent, amount, type: deposit|full|installment, status, invoice_url)
- `appointments` (type: consult|training|fingerprinting|nypd_interview; datetime, location, notes)
- `messages` (case_id, sender, body, read) — threaded per case
- `tasks` (internal action items; assignee, due_date, status, linked case)
- `activity_log` (immutable audit trail: actor, action, entity, timestamp)

**RLS rules:** clients see only their own client/case/documents/messages; staff see assigned cases; admin sees everything. All Storage buckets for documents are policy-gated so a client can only access their own files. This app holds sensitive PII — enforce least privilege everywhere and write to `activity_log` on every state change.

## Surface 1 — Public marketing site (SSR, SEO-optimized)
Pages: Home (hero + value prop + primary CTA), How It Works (visual 13-step journey), Pricing/Packages, **interactive Eligibility Quiz** (6–8 questions → "you likely qualify" result + lead capture that creates a `clients` lead row), Education/Blog hub (long-form SEO guides — scaffold with 3–4 starter MDX articles targeting "NYC concealed carry permit," "NYC CCW requirements 2026," "documents needed," "how long it takes"), FAQ, Book a Consultation (creates a lead + appointment), Contact, Privacy Policy + disclaimer.
SEO requirements: server-side rendered, per-page `<title>`/meta/OpenGraph, JSON-LD structured data (LocalBusiness, Service, FAQ), auto-generated `sitemap.xml` and `robots.txt`, fast Core Web Vitals, semantic HTML, mobile-first. Add an analytics hook (e.g., Vercel Analytics / GA placeholder).
Copy must state clearly that the company **assists with/guides** the application and does not issue licenses or guarantee approval (NYPD has investigative discretion).

## Surface 2 — Client portal (mobile-first)
- **Progress dashboard:** large visual timeline of the 13 stages showing current stage + "what's next."
- **Smart checklist:** shows only the client's currently-required actions; mobile camera upload for documents (esp. the two safe photos).
- **Document center:** upload, see review status (pending/approved/needs-fix + staff note), re-upload with versioning.
- **References collector** and **cohabitant collector:** guided forms; optional email-a-link flow so references can submit their own info.
- **Training scheduler:** view/confirm class + range dates from instructor availability.
- **Payments:** pay deposit/balance via Stripe (when enabled), view receipts.
- **Secure messaging** with staff; **notifications** via email/SMS on status changes and required actions.

## Surface 3 — Admin dashboard (owner's cockpit)
- **Pipeline (kanban)** across the 13 stages — drag a client card to advance them; plus a filterable/searchable **list view** (filter by stage, borough, assigned staff, blocked, overdue, payment status).
- **Today / Task queue:** all action items needing the owner, urgency-sorted — answers "what do I do next" on login.
- **Per-client case file:** profile, stage, checklist, all documents with one-click approve/reject + note (auto-notifies client), references, cohabitants, training, payments, full message thread, audit log.
- **Calendar:** consults, training, fingerprinting, NYPD interviews + reminders.
- **Payments overview:** paid/owed, revenue by month.
- **Templates & bulk actions:** message templates, checklist templates, bulk reminders.
- **Reporting:** funnel (lead→paid→filed→licensed), conversion rate, avg time-in-stage (bottleneck spotting), revenue.
- **Renewal engine:** auto-flag cases nearing the 3-year expiry and open renewal cases.
- **Staff & instructor management:** assign cases, manage instructor availability.

## Stripe (scaffold, keys later)
Build checkout for service packages (Self-Guided, Full Concierge, Non-Resident/Special Carry, Renewal), deposit + balance flow, webhook handler to update `payments`, and invoices/receipts. Gate all of it behind `STRIPE_ENABLED` + env keys so the app runs and demos without Stripe configured.

## Build order (do these as discrete, reviewable phases — pause after each)
1. **Foundation:** Next.js + TS + Tailwind + shadcn/ui, Supabase client/server setup, auth with roles, full schema + RLS migrations, brand/theme config, `.env.example`, deploy config. Seed a few demo clients/cases.
2. **Admin dashboard core:** pipeline + list, case file, checklist engine, document review, task queue, manual client creation, activity log.
3. **Client portal:** auth, progress dashboard, checklist, document/photo uploads, references + cohabitant collectors, messaging, notifications.
4. **Public site + SEO:** all marketing pages, eligibility quiz → lead capture, pricing, blog hub with structured data, sitemap/robots.
5. **Payments + automation:** Stripe wiring (flagged), invoices, email/SMS reminders, renewal engine, reporting.
6. **Polish:** cross-device QA, accessibility (WCAG AA), seed blog content, final review.

## Engineering standards
- TypeScript throughout; clear folder structure (`/app`, `/components`, `/lib`, `/supabase/migrations`, `/config`).
- Reusable, accessible components; no hardcoded brand values outside the theme config.
- Server components for data-heavy/SEO pages; client components only where interactivity requires.
- Write SQL migrations for the schema and RLS; include a seed script.
- A clear `README.md`: setup, env vars, Supabase migration steps, how to enable Stripe, deploy to Vercel.
- Validate all forms (zod), handle loading/error/empty states, and protect routes by role.

Start with Phase 1 (Foundation). Confirm the scaffold and schema with me before building Phase 2.
