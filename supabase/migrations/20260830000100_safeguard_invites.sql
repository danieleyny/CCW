-- ============================================================================
-- Safeguard-person self-service invites
--
-- The person the applicant designates to safeguard/surrender their firearm(s) can
-- now complete NYPD's "Acknowledgement of Person Agreeing to Safeguard Firearm(s)"
-- themselves, through a tokenized link — exactly like the character-reference and
-- cohabitant flows. They open the link, download the acknowledgement pre-filled from
-- what the applicant entered, sign it (before a WITNESS — this form is never
-- notarized), and upload it. That satisfies SFG-01.
--
-- One designated person per case in practice; the table keeps history rather than
-- forcing a single row. The public token route reads/writes via the service role, so
-- the RLS here only governs staff/applicant visibility (case_visible), mirroring the
-- cohabitants table.
-- ============================================================================

create table if not exists public.safeguard_invites (
  id                uuid primary key default gen_random_uuid(),
  case_id           uuid not null references public.cases (id) on delete cascade,
  email             text not null,
  token             text unique,
  token_expires_at  timestamptz,
  token_revoked_at  timestamptz,
  -- invited → the link exists; signed → the witnessed acknowledgement is uploaded.
  status            text not null default 'invited',
  document_id       uuid references public.documents (id) on delete set null,
  sent_at           timestamptz,   -- last (re)send of the link (email or copy)
  opened_at         timestamptz,   -- first time the person opened their link
  completed_at      timestamptz,   -- when the signed acknowledgement was uploaded
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists idx_safeguard_invites_case on public.safeguard_invites (case_id);
create index if not exists idx_safeguard_invites_token on public.safeguard_invites (token);

create trigger trg_safeguard_invites_updated_at
  before update on public.safeguard_invites
  for each row execute function public.set_updated_at();

alter table public.safeguard_invites enable row level security;

create policy safeguard_invites_select on public.safeguard_invites for select
  using (public.case_visible(case_id));
create policy safeguard_invites_write on public.safeguard_invites for all
  using (public.case_visible(case_id))
  with check (public.case_visible(case_id));
