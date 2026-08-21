-- ─────────────────────────────────────────────────────────────────────────────
-- ACCESS CODES · Phase 1 — the demo flag
--
-- A comp/access code with flavor 'demo' marks the case as a demo so it never
-- pollutes the live operation: excluded from the concierge work queue, never sent
-- a reminder, excluded from revenue/conversion stats, badged in admin, and
-- one-click deletable after a presentation. Additive; no RLS change (staff read
-- the case as before; the flag is set server-side on redemption).
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.cases
  add column if not exists is_demo boolean not null default false;

create index if not exists idx_cases_is_demo on public.cases (is_demo) where is_demo;
