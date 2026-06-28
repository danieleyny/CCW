-- ============================================================================
-- CarryPath V2 · Phase 8 — Marketplace payments (Stripe Connect; ships dark)
-- Adds the columns the Connect payout + booking-deposit flow needs. All behind
-- the existing STRIPE_ENABLED flag — no behavior changes until keys are set.
-- Ref: CCW_V2_Data_Model.md §9
-- ============================================================================

alter table public.payments
  add column if not exists engagement_id        uuid references public.engagements(id) on delete set null,
  add column if not exists booking_id           uuid references public.bookings(id) on delete set null,
  add column if not exists stripe_connect_account text,
  add column if not exists application_fee_cents integer;
create index if not exists idx_payments_booking on public.payments (booking_id);

alter table public.instructors
  add column if not exists stripe_connect_account_id text,
  add column if not exists payouts_enabled boolean not null default false;
