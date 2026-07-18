-- ============================================================================
-- 1) E-SIGNATURE AUDIT TRAIL (ESIGN/UETA posture)
--
-- `signatures` stores one reusable PNG per (case, signer). That is an image, not
-- a signing record: there was no timestamp of signing, no IP/user-agent, no
-- consent language, and — most importantly — no binding between a signature and
-- the exact document bytes it was applied to. A notarized, filed document needs
-- to be able to answer "who signed WHAT, when, and what did they agree to".
--
-- signature_events is an append-only log of individual signing acts, each bound
-- to a SHA-256 of the produced document.
--
-- 2) EVIDENCE ENFORCEMENT
--
-- A staffer could mark any requirement `satisfied` with nothing bound to it.
-- `na` was already trigger-protected on blocking rows; `satisfied` was not.
-- Document-backed requirements now need evidence (or a recorded override).
-- ============================================================================

create table if not exists public.signature_events (
  id              uuid primary key default gen_random_uuid(),
  case_id         uuid not null references public.cases(id) on delete cascade,
  signer_key      text not null,
  document_id     uuid references public.documents(id) on delete set null,
  req_code        text,
  document_sha256 text not null,
  consent_text    text not null,
  signed_at       timestamptz not null default now(),
  ip              text,
  user_agent      text,
  created_at      timestamptz not null default now()
);
create index if not exists idx_signature_events_case on public.signature_events (case_id, signed_at desc);
create index if not exists idx_signature_events_doc on public.signature_events (document_id);

grant select, insert on public.signature_events to authenticated;
alter table public.signature_events enable row level security;

-- Client + staff can read their own case's signing history. No instructor
-- branch (it references documents/req_codes behind the firewall). No update or
-- delete grant: the log is append-only.
create policy signature_events_select on public.signature_events for select
  using (public.case_visible(case_id));
create policy signature_events_insert on public.signature_events for insert
  with check (public.case_visible(case_id));

-- Capture the signing context on the signature itself too.
alter table public.signatures
  add column if not exists ip           text,
  add column if not exists user_agent   text,
  add column if not exists consent_text text;

-- ── Evidence enforcement on manual "satisfied" ──────────────────────────────
-- Mirrors forbid_manual_na_on_blocking(): the app refuses first with a friendly
-- message, and this makes it true at the database.
--
-- A requirement whose REGISTRY row declares a document_type is document-backed —
-- satisfying it requires bound evidence (document/reference/cohabitant/
-- disclosure). Attestations and narrative-only items are unaffected. An explicit
-- staff override records its reason in `notes` (prefix 'OVERRIDE:'), which keeps
-- the escape hatch but leaves a trail.
create or replace function public.forbid_satisfied_without_evidence()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_doc_type document_type;
begin
  if new.status <> 'satisfied' or old.status = 'satisfied' then
    return new;
  end if;

  select r.document_type into v_doc_type
  from public.requirements r
  where r.id = new.requirement_id;

  if v_doc_type is null then
    return new;                       -- attestation / narrative — nothing to bind
  end if;

  if new.document_id is not null
     or new.reference_id is not null
     or new.cohabitant_id is not null
     or new.disclosure_id is not null
     or coalesce(new.notes, '') like 'OVERRIDE:%' then
    return new;
  end if;

  raise exception
    'Requirement % needs evidence bound before it can be satisfied (or an explicit override).',
    new.req_code;
end $$;

drop trigger if exists trg_forbid_satisfied_without_evidence on public.case_requirements;
create trigger trg_forbid_satisfied_without_evidence
  before update on public.case_requirements
  for each row execute function public.forbid_satisfied_without_evidence();
