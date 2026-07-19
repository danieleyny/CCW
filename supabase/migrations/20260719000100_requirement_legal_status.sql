-- ============================================================================
-- PART A / Phase 1 — per-requirement LEGAL ENFORCEMENT STATUS.
--
-- Why: we already stopped requiring SOC-01 (the CCIA social-media clause,
-- permanently enjoined per Antonyuk v. James) in 20260713000400. But that fact
-- lives as PROSE — "OPTIONAL — requirement enjoined" typed into `title`, the
-- case name buried in `authority`. Nothing in code can read it, nothing
-- enforces it, and the next person to add a rule has no field to put it in.
-- This makes enforcement status structural.
--
-- ── The invariant, and why it's a trigger AND a check ───────────────────────
-- `blocking` stays the SINGLE gate predicate. It is read in ~8 places
-- (lib/qa-gate.ts, the admin counts, the trainer + marketing badges) plus the
-- forbid_manual_na_on_blocking trigger. Adding `legal_status` as a second
-- condition at each of those sites would mean eight places to keep in sync and
-- one silent disagreement away from a bug. So instead:
--
--   legal_status is the REASON; blocking remains the MECHANISM;
--   and the database guarantees enjoined/repealed => blocking = false.
--
-- The BEFORE trigger coerces (so no future migration or admin action has to
-- remember to write both columns — same ergonomics argument as
-- forbid_manual_na_on_blocking in 20260713001000). The CHECK then pins it, so
-- the invariant is unfalsifiable rather than merely conventional. Ordering
-- matters: the trigger normalizes existing rows on backfill, so the constraint
-- validates clean when it lands.
--
-- ── Why SOC-01 is a BACKFILL and not a new dated version ────────────────────
-- The versioning rule (close effective_to, insert a dated row) exists for RULE
-- CHANGES. No rule changed today: the injunction was already the state of the
-- world when the 2026-07-13 row was written — that row's own title says so.
-- This migration adds a COLUMN describing a fact already true of the row.
--
-- Cutting a new version here would be an active bug, not a stylistic choice. A
-- new row means a new requirements.id; case_requirements is unique on
-- (case_id, requirement_id), so materializeCaseRequirements would INSERT a
-- second SOC-01 row beside the old one and never close the first — the
-- applicant would see SOC-01 twice, one enjoined and one not — while every
-- already-materialized case kept pointing at the 'enforced' row.
--
-- So: backfill ALL SOC-01 rows, including the closed effective_to = 2026-07-12
-- v1s, so historical case_requirements resolve correctly too.
--
-- ⚠️ SPC-01 is deliberately LEFT 'enforced'. It is blocking=false because it is
-- advisory BY NATURE (a validity-dependency note about the underlying county
-- license), not because a court stopped it. Keeping those two cases distinct is
-- the entire reason this enum exists — do not sweep it in.
-- ============================================================================

create type public.legal_status as enum (
  'enforced',              -- in force; the default and the overwhelming majority
  'enjoined_not_enforced', -- a court has enjoined it; we must NOT require it
  'contested',             -- under active challenge but still enforced today
  'repealed'               -- no longer law
);

alter table public.requirements
  add column if not exists legal_status      public.legal_status not null default 'enforced',
  add column if not exists legal_status_note text,
  add column if not exists legal_citation    text;

comment on column public.requirements.legal_status is
  'Enforcement status. enjoined_not_enforced/repealed force blocking=false (trigger + check below). We track enforcement with citations; the attorney owns changes via /admin/legal.';
comment on column public.requirements.legal_citation is
  'The case or statute supporting a non-enforced status. Never invent one.';

-- ── The coercion half of the invariant ──────────────────────────────────────
create or replace function public.coerce_blocking_from_legal_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- A rule a court has stopped can never be a filing blocker, no matter what
  -- the writer passed for `blocking`.
  if new.legal_status in ('enjoined_not_enforced', 'repealed') then
    new.blocking := false;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_requirements_legal_status_blocking on public.requirements;
create trigger trg_requirements_legal_status_blocking
  before insert or update on public.requirements
  for each row execute function public.coerce_blocking_from_legal_status();

-- ── Backfill SOC-01 (every version, both jurisdictions, closed rows included) ─
-- The citation text is lifted from the existing v2 row's own authority/
-- description written in 20260713000400 — not newly invented here.
update public.requirements
set legal_status   = 'enjoined_not_enforced',
    legal_citation = 'Antonyuk v. James (2d Cir.); cert. denied Apr. 2025; permanent injunction final 2026',
    legal_status_note =
      'The CCIA social-media disclosure clause is permanently enjoined and unenforceable. '
      'NYPD''s published checklist may still list it — that PDF is stale. Providing a list '
      'is optional; some applicants include one as a candor gesture.',
    -- Structuring the status is itself a change an attorney should confirm.
    needs_legal_review = true
where req_code = 'SOC-01';

-- ── The pinning half of the invariant ───────────────────────────────────────
-- Validates clean: the trigger above already normalized every row touched, and
-- no other row has a non-enforced status yet.
alter table public.requirements
  add constraint requirements_unenforced_never_blocking
  check (not (legal_status in ('enjoined_not_enforced', 'repealed') and blocking));

create index if not exists idx_requirements_legal_status
  on public.requirements (legal_status)
  where legal_status <> 'enforced';
