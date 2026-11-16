-- Public enrollment is full-payment only. Historic payment rows and the
-- payment_type enum remain unchanged; this closes the advertised deposit path
-- without rewriting any past transaction.
update public.service_packages
set deposit_cents = 0
where key in ('self_guided', 'full_concierge');
