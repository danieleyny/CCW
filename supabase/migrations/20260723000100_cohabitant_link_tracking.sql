-- ============================================================================
-- Cohabitant link tracking — parity with reference_requests.
--
-- References track the whole invite journey (sent → opened → submitted →
-- notarized, each with a timestamp) and every surface reads it: the checklist's
-- per-person progress panel, /portal/people, the admin People tab, and the
-- 3/7-day "still pending" reminder rule. Cohabitant affidavits had none of it:
-- the token was minted with no record of when it was sent, opening the link
-- left no trace, and the enum jumps straight from not_started to received.
--
-- Rather than widening the cohabitant_status enum (a state machine other code
-- already keys on), the journey milestones are TIMESTAMPS and the display state
-- is derived — same philosophy as the requirements ladder. cohabitantState()
-- in lib/cohabitants/process.ts is the one derivation both portals read.
--
-- No backfill: legacy invited rows (token, no sent_at) still derive "invited"
-- from token presence; the reminder rule only covers invites sent after this
-- ships, which is honest — we don't know when the old ones went out.
-- ============================================================================

alter table public.cohabitants
  add column if not exists sent_at     timestamptz,
  add column if not exists opened_at   timestamptz,
  add column if not exists answered_at timestamptz;

comment on column public.cohabitants.sent_at is
  'When the affidavit link was last sent (email or copied link). Mirrors reference_requests.sent_at.';
comment on column public.cohabitants.opened_at is
  'First time the cohabitant opened their tokenized link. Mirrors reference_requests.opened_at.';
comment on column public.cohabitants.answered_at is
  'When the cohabitant submitted their affidavit answers. Mirrors reference_requests.answered_at.';
