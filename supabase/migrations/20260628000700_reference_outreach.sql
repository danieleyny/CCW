-- ============================================================================
-- CarryPath V2 · Phase 6 — Reference outreach (tokenized self-serve)
-- One reference_requests row per character reference, carrying an opaque urlsafe
-- token. The reference confirms/attests on a public, no-login page (app/r/[token])
-- whose writes go through a service-role server action scoped strictly by token.
-- Ref: CCW_V2_Data_Model.md §7
-- ============================================================================

create table public.reference_requests (
  id            uuid primary key default gen_random_uuid(),
  reference_id  uuid not null references public.character_references(id) on delete cascade,
  case_id       uuid not null references public.cases(id) on delete cascade,
  token         text not null unique,
  status        reference_req_status not null default 'pending',
  sent_at       timestamptz,
  opened_at     timestamptz,
  submitted_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index idx_ref_requests_token on public.reference_requests (token);
create index idx_ref_requests_case on public.reference_requests (case_id, status);

create trigger trg_reference_requests_updated_at
  before update on public.reference_requests for each row execute function public.set_updated_at();

grant select, insert, update, delete on public.reference_requests to authenticated;

-- RLS: client owns their case's requests; staff/admin all. The public submission
-- path uses the service-role client (token is the capability), bypassing RLS.
alter table public.reference_requests enable row level security;
create policy reference_requests_select on public.reference_requests for select
  using (public.case_visible(case_id));
create policy reference_requests_write on public.reference_requests for all
  using (public.case_visible(case_id))
  with check (public.case_visible(case_id));
