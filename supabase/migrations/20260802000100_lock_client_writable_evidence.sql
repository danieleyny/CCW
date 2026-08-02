-- ============================================================================
-- Security Wave 1 — lock the verification state on client-writable leaf tables,
-- bind the audit trail to its real actor, and give the CP-5 pre-filing gate a
-- database-level backstop.
--
-- The problem (audit findings SEC-02/03/04/08/13/20): several leaf-evidence
-- tables were writable by the applicant with a blanket `case_visible()` policy
-- covering ALL columns. RLS filters rows, not columns, so the same policy that
-- (correctly) lets an applicant add a reference's name also let them flip that
-- reference's `notarized` flag, mark their own document `approved`, set a
-- cohabitant affidavit to `notarized`, or upsert a forged signature for one of
-- their references. None of these are exploitable through the UI, but the anon
-- key + a raw PostgREST call bypasses the UI entirely — so the guard has to live
-- in the database, next to the data.
--
-- Approach: keep the existing row-scoping policies (applicants still own their
-- rows) and add BEFORE triggers that neutralise the privileged columns for a
-- plain applicant session, while leaving every legitimate writer untouched:
--   • staff/admin sessions            — is_staff_or_admin() = true
--   • the service-role key            — current_user = 'service_role'
--   • SECURITY DEFINER RPCs (postgres)— current_user = 'postgres'
--     (e.g. trainer_review_requirement, which legitimately sets documents.status)
-- Only a bare `authenticated` applicant session is constrained.
--
-- These triggers COERCE rather than reject wherever a safe default exists (so a
-- normal upload/insert is never broken), and RAISE only where a column cannot be
-- meaningfully coerced (a forged signature signer_key).
-- ============================================================================

-- ── Who is allowed to write verification state? ─────────────────────────────
-- NOT security definer: we need current_user to reflect the REAL effective role
-- of the writer. is_staff_or_admin() stays definer internally (it reads
-- profiles), but the current_user test must run in the caller's own context so
-- that a SECURITY DEFINER RPC (owner = postgres) and the service_role key are
-- both recognised as privileged.
create or replace function public.is_privileged_writer()
returns boolean
language sql
stable
set search_path = public
as $$
  select public.is_staff_or_admin()
      or current_user in ('service_role', 'postgres', 'supabase_admin')
$$;

-- ── SEC-03 · documents review state is staff/service-only ───────────────────
create or replace function public.guard_document_review_columns()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if public.is_privileged_writer() then
    return new;
  end if;
  -- Applicant write: the review verdict is never theirs to set. On insert force
  -- the safe defaults (a fresh upload is always 'pending', unreviewed); on
  -- update freeze whatever staff last decided.
  if tg_op = 'INSERT' then
    new.status       := 'pending';
    new.reviewer     := null;
    new.review_notes := null;
    new.notarized    := false;
  else
    new.status       := old.status;
    new.reviewer     := old.reviewer;
    new.review_notes := old.review_notes;
    new.notarized    := old.notarized;
  end if;
  return new;
end;
$$;

create trigger trg_documents_guard_review
  before insert or update on public.documents
  for each row execute function public.guard_document_review_columns();

-- ── SEC-02 · character_references notarized/received are collector-only ──────
create or replace function public.guard_reference_verification()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if public.is_privileged_writer() then
    return new;
  end if;
  -- Applicant may write name/relationship/contact/is_family, never the proof
  -- flags. `received`/`notarized` are set only by the tokenised reference flow
  -- and the applicant-fallback upload — both service-role paths.
  if tg_op = 'INSERT' then
    new.notarized := false;
    new.received  := false;
  else
    new.notarized := old.notarized;
    new.received  := old.received;
  end if;
  return new;
end;
$$;

create trigger trg_references_guard_verification
  before insert or update on public.character_references
  for each row execute function public.guard_reference_verification();

-- ── SEC-13 · cohabitants affidavit_status is set by the notary flow only ─────
create or replace function public.guard_cohabitant_status()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if public.is_privileged_writer() then
    return new;
  end if;
  -- Applicant adds/edits the household member; the affidavit lifecycle
  -- (received → notarized) is advanced only by the service-role cohabitant flow.
  if tg_op = 'INSERT' then
    new.affidavit_status := 'not_started';
  else
    new.affidavit_status := old.affidavit_status;
  end if;
  return new;
end;
$$;

create trigger trg_cohabitants_guard_status
  before insert or update on public.cohabitants
  for each row execute function public.guard_cohabitant_status();

-- ── SEC-20 · a client may only ever write their OWN ('applicant') signature ──
-- reference:<id> / cohabitant:<id> signatures are captured through the public
-- token flows under the service role. A signer_key cannot be safely coerced, so
-- reject the write outright.
create or replace function public.guard_signature_signer()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if public.is_privileged_writer() then
    return new;
  end if;
  if new.signer_key is distinct from 'applicant' then
    raise exception 'Applicants may only submit their own signature (signer_key=applicant).'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger trg_signatures_guard_signer
  before insert or update on public.signatures
  for each row execute function public.guard_signature_signer();

-- ── SEC-04 · bind every activity_log row to its real actor ──────────────────
-- Old policy: `case_id is null or case_visible(case_id)` — an authenticated user
-- could insert a row attributing an action to SOMEONE ELSE (actor = any uuid),
-- forging the audit trail. Bind actor to the session. Service-role/system logs
-- (advance.ts writes actor=null) bypass RLS entirely and are unaffected.
drop policy if exists activity_insert on public.activity_log;
create policy activity_insert on public.activity_log for insert
  with check (
    actor = auth.uid()
    and (case_id is null or public.case_visible(case_id))
  );

-- ── SEC-08 · database backstop for the CP-5 pre-filing gate ─────────────────
-- The app enforces the gate in setCaseStage, but recordLicenseIssued writes
-- stage='licensed' directly (a staff session, bypassing evaluatePreFilingGate),
-- and any future raw update could too. Enforce the core invariant in the DB: a
-- real user session cannot move a case to application_assembled or any later
-- filing stage without a recorded QA sign-off. System/service-role automation
-- (seed, migrations, maybeAdvanceStage — which never crosses this line anyway)
-- is exempt so backfills and setup writes are not broken.
create or replace function public.enforce_prefiling_signoff()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.stage >= 'application_assembled'::public.case_stage
     and new.stage is distinct from old.stage
     and new.qa_signed_off_by is null
     and current_user not in ('service_role', 'postgres', 'supabase_admin')
  then
    raise exception 'Case % cannot advance to % before pre-filing QA sign-off (CP-5).',
      new.id, new.stage
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger trg_cases_prefiling_signoff
  before update on public.cases
  for each row execute function public.enforce_prefiling_signoff();
