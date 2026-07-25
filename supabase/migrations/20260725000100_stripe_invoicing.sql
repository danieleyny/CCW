-- ============================================================================
-- Stripe Invoicing — persist the pieces a hosted invoice needs.
--
-- The admin "Request payment" flow now issues a REAL Stripe hosted invoice
-- (collection_method: send_invoice) that emails the client a branded pay link,
-- instead of only recording a pending row. To reconcile the webhook and reuse a
-- customer across invoices/receipts, three ids need a home:
--
--   clients.stripe_customer_id   — the Stripe Customer, reused for every
--                                  invoice + Checkout receipt for this client.
--   payments.stripe_invoice_id   — the `in_…` id, the webhook's reconciliation
--                                  key (fallback to metadata.payment_id).
--   payments.hosted_invoice_url  — the Stripe-hosted invoice page (pay + PDF),
--                                  surfaced to the client and as the receipt.
--
-- No RLS change: payments writes are already gated by payments_write
-- (is_staff_or_admin), reads by payments_select (client_visible); clients writes
-- by clients_update (is_staff_or_admin). New columns inherit those policies.
-- The existing payments.stripe_session_id / stripe_payment_intent / invoice_url
-- columns stay as they are (Checkout paths).
-- ============================================================================

alter table public.clients
  add column if not exists stripe_customer_id text;

alter table public.payments
  add column if not exists stripe_invoice_id  text,
  add column if not exists hosted_invoice_url text;

-- The webhook falls back to matching on the invoice id when metadata is absent.
create index if not exists idx_payments_stripe_invoice on public.payments (stripe_invoice_id);

comment on column public.clients.stripe_customer_id is
  'Stripe Customer id, reused across invoices and Checkout receipts. Self-heals if stale (e.g. a test-mode id under live keys) — see lib/stripe/invoicing.ts.';
comment on column public.payments.stripe_invoice_id is
  'Stripe hosted-invoice id (in_…). The webhook reconciles invoice.* events by this or metadata.payment_id.';
comment on column public.payments.hosted_invoice_url is
  'Stripe-hosted invoice page (pay + PDF). Shown to the client as View/pay invoice, and as the receipt once paid.';
