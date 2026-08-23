-- Propagation (CASE_FACTS_AND_COMPLETENESS Part C.1): when a fact changes we
-- NEVER rewrite a signed instrument — we mark it stale and require regeneration +
-- re-adoption. Unsigned generated documents just regenerate from the new facts.
alter table public.documents add column if not exists stale boolean not null default false;
