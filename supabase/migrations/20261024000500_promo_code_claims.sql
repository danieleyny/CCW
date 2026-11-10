-- A discount code is awarded to one case exactly once. We store a SHA-256
-- fingerprint rather than the customer-facing code, so a database export never
-- exposes a code that could be redeemed by someone else.
create table public.promo_code_claims (
  code_fingerprint text primary key check (char_length(code_fingerprint) = 64),
  code_label text not null,
  case_id uuid not null references public.cases(id) on delete restrict,
  client_id uuid not null references public.clients(id) on delete restrict,
  claimed_at timestamptz not null default now()
);

create index promo_code_claims_case_id_idx on public.promo_code_claims(case_id);

alter table public.promo_code_claims enable row level security;

-- No authenticated policies: claims are created and read only through the
-- server-side checkout action using the service role.
