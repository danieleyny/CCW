-- ─────────────────────────────────────────────────────────────────────────────
-- CONCIERGE QA Phase 9 — opaque per-case token for the Calendly embed
--
-- The intro-call embed passed the raw internal case UUID to Calendly (a third
-- party) as utm_content. Swap it for an opaque, per-case token that means nothing
-- outside our system; the webhook resolves the token back to the case. Backfilled
-- with a random value for every existing case; no RLS change (staff/owner read
-- the case as before, and the webhook resolves it under the service role).
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.cases
  add column if not exists calendly_token uuid not null default gen_random_uuid();

create unique index if not exists idx_cases_calendly_token on public.cases (calendly_token);
