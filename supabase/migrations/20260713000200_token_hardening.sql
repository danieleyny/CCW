-- V3-P0.4 — Public token lifecycle: expiry + revocation.
--
-- reference_requests.token and cohabitants.token are opaque UUIDs behind which
-- sit names, addresses, and notarized affidavits — previously valid forever
-- with no kill switch. Add a 30-day expiry (rotated on each resend) and a
-- revocation timestamp. Enforcement happens in the token lookups (app/r, app/c)
-- since those run through the service-role client.

alter table public.reference_requests
  add column if not exists expires_at timestamptz not null default (now() + interval '30 days'),
  add column if not exists revoked_at timestamptz;

-- cohabitants carries other lifecycle timestamps, so prefix these with token_.
alter table public.cohabitants
  add column if not exists token_expires_at timestamptz,
  add column if not exists token_revoked_at timestamptz;

-- Backfill: existing cohabitant tokens get the standard 30-day window from now.
update public.cohabitants
  set token_expires_at = now() + interval '30 days'
  where token is not null and token_expires_at is null;
