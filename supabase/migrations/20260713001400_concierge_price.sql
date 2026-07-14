-- V5 — concierge service price reduced $1,999 → $1,000 (a real business/price
-- change, not a display change). Data edit to the live service_packages row.
--
-- Nothing hardcodes this: getActivePackages() derives priceLabel from
-- price_cents when price_label is null, and the homepage all-in total is
-- COMPUTED (package.priceCents + fees.applicationCents + fees.fingerprintCents),
-- so /pricing, /portal/enroll, the homepage, and Stripe metadata all follow.
--
-- deposit_cents stays 50000: on a $1,000 price that's a clean 50/50
-- deposit-then-balance-on-filing split (it was 25% of $1,999 before), which is
-- a sensible default — flagged for review but not changed here.
update public.service_packages
  set price_cents = 100000
  where key = 'full_concierge';
