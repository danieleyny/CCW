-- ============================================================================
-- On-platform document engine: questionnaire answers + generated-document
-- provenance.
--
-- requirement_answers holds the short questionnaire behind each "generate"
-- requirement, keyed (case_id, req_code) so a customer can edit and regenerate.
-- It carries DISCLOSURE CONTENT (arrest statements, protection orders, domestic
-- incidents), so it is gated on case_visible() — client + staff only. Instructors
-- get NO policy here, exactly like documents/disclosures/intake_sessions.
--
-- documents gains provenance: which requirement produced it and whether we
-- generated it (vs the applicant uploading it). Until now req_code was never
-- stored and linkage was inferred through requirements.document_type.
-- ============================================================================

create table if not exists public.requirement_answers (
  id           uuid primary key default gen_random_uuid(),
  case_id      uuid not null references public.cases(id) on delete cascade,
  req_code     text not null,
  answers      jsonb not null default '{}'::jsonb,
  completed_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (case_id, req_code)
);
create index if not exists idx_requirement_answers_case
  on public.requirement_answers (case_id, req_code);

grant select, insert, update, delete on public.requirement_answers to authenticated;
alter table public.requirement_answers enable row level security;

-- Client (owner) + staff/admin only. No instructor branch — this holds
-- disclosure content and must stay behind the privacy firewall.
create policy requirement_answers_select on public.requirement_answers for select
  using (public.case_visible(case_id));
create policy requirement_answers_write on public.requirement_answers for all
  using (public.case_visible(case_id))
  with check (public.case_visible(case_id));

create trigger trg_requirement_answers_updated_at
  before update on public.requirement_answers
  for each row execute function public.set_updated_at();

-- ── Generated-document provenance ───────────────────────────────────────────
alter table public.documents
  add column if not exists req_code  text,
  add column if not exists generated boolean not null default false;

create index if not exists idx_documents_req_code on public.documents (case_id, req_code);

comment on column public.documents.req_code is
  'Requirement this document satisfies. Set directly by the document engine; uploads still bind via requirements.document_type.';
comment on column public.documents.generated is
  'True when Gun License NYC produced this document from a questionnaire (vs an applicant upload).';
