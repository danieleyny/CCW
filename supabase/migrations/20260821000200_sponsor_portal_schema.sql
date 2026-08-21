-- ============================================================================
-- SPONSORED-APPLICANT PORTAL · Phase 1 — schema + the one resolver
--
-- A second party works the SAME case: a sponsoring company's representative,
-- from a separate, unlisted portal. This mirrors the trainer firewall shape
-- (20260718001600) aimed at a company instead of an instructor:
--   • security-barrier VIEWS are the read boundary (RLS filters rows, never
--     columns, and client/staff/instructor/sponsor share one `authenticated`
--     role — so a view's WHERE clause IS its policy);
--   • SECURITY DEFINER RPCs are the only write path (no UPDATE grant to sponsors);
--   • file bytes only through a predicate + an admin-minted signed URL, logged.
--
-- Visibility runs BOTH ways, decided in ONE place — party_scope():
--   sponsor → applicant's file : as wide as the sponsorship scope allows
--   applicant → sponsor's packet: 'progress' (row + status, never the file)
--
-- HARD LAW (§400.00(3)): the sponsor may NEVER sign/attest/submit. That is not
-- enforced here by omission — it is enforced by guard_signature_signer()
-- (20260802000100), which rejects any non-privileged writer whose signer_key is
-- not 'applicant'. A sponsor is a non-privileged authenticated user; they get no
-- write path to `signatures` at all. This migration must never open one.
-- ============================================================================

-- ── 1. The sponsor role. Minted ONLY by a service-role flow + explicit UPDATE
--    (20260731000500 pattern); handle_new_user() always creates 'client'. Not
--    referenced as a literal anywhere in THIS migration — ALTER TYPE ADD VALUE
--    cannot be used in the same transaction that reads the new value.
alter type public.user_role add value if not exists 'sponsor';

-- ── 2. The company, and the rep who represents it ───────────────────────────
create table if not exists public.sponsors (
  id                        uuid primary key default gen_random_uuid(),
  legal_name                text not null,
  agency_license_number     text,          -- Watch/Guard/Patrol agency licence (SPN-04)
  agency_license_expires    date,
  custodian_name            text,          -- gun custodian (SPN-05) — structured, not a file
  custodian_email           text,
  custodian_phone           text,
  custodian_license_number  text,
  created_at                timestamptz not null default now()
);

-- A rep is a profile with role='sponsor' bound to one company.
alter table public.profiles
  add column if not exists sponsor_id uuid references public.sponsors (id);

-- ── 3. Scope + the case↔sponsor binding (modelled on `engagements`) ──────────
create type public.sponsorship_scope as enum ('packet_only', 'assist', 'full');

create table if not exists public.case_sponsorships (
  id                      uuid primary key default gen_random_uuid(),
  case_id                 uuid not null references public.cases (id) on delete cascade,
  sponsor_id              uuid not null references public.sponsors (id) on delete cascade,
  rep_profile_id          uuid references public.profiles (id) on delete set null,
  invited_email           citext not null,
  invited_name            text,             -- the rep's name, for the applicant's consent screen (profiles RLS hides it)
  invite_token            text unique,      -- opaque capability token for /invite/[token]
  scope                   public.sponsorship_scope not null default 'packet_only', -- fail-safe; widening is a deliberate write
  status                  text not null default 'invited',  -- invited | active | revoked
  applicant_consented_at  timestamptz,
  applicant_consent_version text,
  revoked_at              timestamptz,
  created_at              timestamptz not null default now(),
  unique (case_id, sponsor_id)
);
create index if not exists idx_case_sponsorships_case    on public.case_sponsorships (case_id);
create index if not exists idx_case_sponsorships_sponsor on public.case_sponsorships (sponsor_id, status);
create index if not exists idx_case_sponsorships_token   on public.case_sponsorships (invite_token);

-- ── 4. Requirement ownership + the reverse-direction scope ──────────────────
-- 'sponsor'-party rows are the company packet: the applicant sees them at
-- 'progress' (row + status, never the file). Reuses the existing concierge_scope
-- enum for applicant_scope.
create type public.req_party as enum ('applicant', 'sponsor');
alter table public.requirements
  add column if not exists party public.req_party not null default 'applicant',
  add column if not exists applicant_scope public.concierge_scope not null default 'full';
comment on column public.requirements.party is
  'Who owns this requirement. applicant = the licence applicant (default); sponsor = the sponsoring company packet.';
comment on column public.requirements.applicant_scope is
  'What the APPLICANT may see of a sponsor-owned row. progress = row + status, never the file. Reverse of concierge_scope.';

-- ── 5. Read audit. Writes are already logged; a full-scope sponsor read of a
--    sealed disposition must ALSO leave a trace (and surface to the applicant).
create table if not exists public.document_access_log (
  id                 uuid primary key default gen_random_uuid(),
  document_id        uuid references public.documents (id) on delete set null,
  case_id            uuid not null references public.cases (id) on delete cascade,
  viewer_profile_id  uuid references public.profiles (id) on delete set null,
  viewer_role        public.user_role,
  req_code           text,
  action             text not null,   -- view_url_issued | download | upload
  created_at         timestamptz not null default now()
);
create index if not exists idx_document_access_log_case on public.document_access_log (case_id, created_at desc);

-- ── 5b. The derived licence track (Phase 2 uses it; the view below needs it) ─
-- Nobody types this in — resolveArmedTrack() derives it from intake and stores
-- it here. Every existing case defaults to concealed_carry and is unchanged.
-- 'sponsored_unresolved' is a first-class state, not an error: the sponsor packet
-- proceeds while the applicant's category settles.
create type public.license_track as enum
  ('concealed_carry', 'carry_guard', 'special_carry_guard', 'sponsored_unresolved');
alter table public.cases
  add column if not exists license_track public.license_track not null default 'concealed_carry';
comment on column public.cases.license_track is
  'Derived armed-guard track (resolveArmedTrack). concealed_carry = the ordinary path (default, unchanged).';

-- ── 6. The one resolver. Same shape as trainer_scope; fail-safe to 'hidden'. ─
create or replace function public.party_scope(
  p_requirement_id uuid,
  p_viewer public.req_party,
  p_scope public.sponsorship_scope
) returns public.concierge_scope
language sql stable security definer set search_path = public as $$
  select case
    -- Applicant looking at a sponsor-owned row → whatever applicant_scope says
    -- (progress); their own rows are always full.
    when p_viewer = 'applicant' then coalesce(
      (select case when r.party = 'sponsor' then r.applicant_scope else 'full'::public.concierge_scope end
         from public.requirements r where r.id = p_requirement_id),
      'hidden'::public.concierge_scope)
    -- Sponsor looking at anything: their own packet always; the applicant's file
    -- only as wide as the sponsorship scope allows. 'assist' reuses the tuned
    -- trainer firewall (concierge_scope), so disclosures stay invisible.
    else coalesce(
      (select case
         when r.party = 'sponsor' then 'full'::public.concierge_scope
         when p_scope = 'full'    then 'full'::public.concierge_scope
         when p_scope = 'assist'  then r.concierge_scope
         else 'hidden'::public.concierge_scope
       end from public.requirements r where r.id = p_requirement_id),
      'hidden'::public.concierge_scope)
  end
$$;
revoke all on function public.party_scope(uuid, public.req_party, public.sponsorship_scope) from public, anon;
grant execute on function public.party_scope(uuid, public.req_party, public.sponsorship_scope) to authenticated;

-- ── 7. The rep's resolved scope on a case (fail-safe null) ──────────────────
-- One helper the views + RPCs share: returns the active, consented, non-revoked
-- scope for the CURRENT auth.uid() rep on this case, or NULL if not bound.
create or replace function public.sponsor_active_scope(p_case_id uuid)
returns public.sponsorship_scope
language sql stable security definer set search_path = public as $$
  select s.scope
    from public.case_sponsorships s
    join public.profiles p on p.id = auth.uid() and p.sponsor_id = s.sponsor_id
   where s.case_id = p_case_id
     and s.status = 'active'
     and s.applicant_consented_at is not null
     and s.revoked_at is null
   limit 1
$$;
revoke all on function public.sponsor_active_scope(uuid) from public, anon;
grant execute on function public.sponsor_active_scope(uuid) to authenticated;

-- ── 8. Sponsor security-barrier views (the read boundary) ───────────────────
-- Each WHERE clause IS the policy: an active, consented, non-revoked binding for
-- the current rep. NEVER add security_invoker=true (would honour sponsor RLS =
-- nothing). NEVER add file_path to the document feed.
create or replace view public.sponsor_case_scope with (security_barrier = true) as
  select
    c.id                       as case_id,
    s.id                       as sponsorship_id,
    s.sponsor_id,
    s.scope,
    c.stage,
    c.license_track,
    cl.full_name               as applicant_name
  from public.case_sponsorships s
  join public.profiles p on p.id = auth.uid() and p.sponsor_id = s.sponsor_id
  join public.cases c    on c.id = s.case_id
  join public.clients cl on cl.id = c.client_id
  where s.status = 'active'
    and s.applicant_consented_at is not null
    and s.revoked_at is null;

-- Requirements the sponsor may see — both their own packet (party='sponsor') and
-- the applicant's file as wide as scope allows. Hidden rows are ABSENT. `notes`,
-- disclosure_id, reference_id, cohabitant_id are omitted — that absence is the point.
create or replace view public.sponsor_requirement_feed with (security_barrier = true) as
  select
    cr.id          as case_requirement_id,
    cr.case_id,
    s.id           as sponsorship_id,
    cr.req_code,
    cr.status,
    cr.document_id,
    r.party,
    r.title,
    r.description,
    r.authority,
    r.severity,
    r.blocking,
    r.document_type,
    public.party_scope(cr.requirement_id, 'sponsor', s.scope) as scope
  from public.case_requirements cr
  join public.requirements r       on r.id = cr.requirement_id
  join public.case_sponsorships s  on s.case_id = cr.case_id
  join public.profiles p           on p.id = auth.uid() and p.sponsor_id = s.sponsor_id
  where s.status = 'active'
    and s.applicant_consented_at is not null
    and s.revoked_at is null
    and public.party_scope(cr.requirement_id, 'sponsor', s.scope) <> 'hidden';

-- Progress on third-party documents: counts only, per-code branches (never a
-- rollup — an aggregate over the hidden set is itself a disclosure).
create or replace view public.sponsor_roster_progress with (security_barrier = true) as
  select
    cr.case_id,
    s.id as sponsorship_id,
    cr.req_code,
    case cr.req_code when 'REF-01' then 4 when 'REF-02' then 2 else null end as required_count,
    (select count(*) from public.character_references x where x.case_id = cr.case_id and x.notarized) as done_count,
    (select count(*) from public.character_references x where x.case_id = cr.case_id) as invited_count
  from public.case_requirements cr
  join public.case_sponsorships s on s.case_id = cr.case_id
  join public.profiles p          on p.id = auth.uid() and p.sponsor_id = s.sponsor_id
  where s.status = 'active' and s.applicant_consented_at is not null and s.revoked_at is null
    and cr.req_code in ('REF-01', 'REF-02')
    and public.party_scope(cr.requirement_id, 'sponsor', s.scope) <> 'hidden';

-- Documents the sponsor may review — full-scope only, joined THROUGH
-- case_requirements.document_id, and deliberately NO file_path (bytes come from
-- the mediated RPC below).
create or replace view public.sponsor_document_feed with (security_barrier = true) as
  select
    d.id           as document_id,
    d.case_id,
    s.id           as sponsorship_id,
    cr.id          as case_requirement_id,
    cr.req_code,
    r.party,
    d.type,
    d.file_name,
    d.status,
    d.generated,
    d.signed_at,
    d.notarized,
    d.version,
    d.created_at
  from public.documents d
  join public.case_requirements cr on cr.case_id = d.case_id and cr.document_id = d.id
  join public.requirements r       on r.id = cr.requirement_id
  join public.case_sponsorships s  on s.case_id = d.case_id
  join public.profiles p           on p.id = auth.uid() and p.sponsor_id = s.sponsor_id
  where s.status = 'active' and s.applicant_consented_at is not null and s.revoked_at is null
    and public.party_scope(cr.requirement_id, 'sponsor', s.scope) = 'full';

revoke all on public.sponsor_case_scope        from anon;
revoke all on public.sponsor_requirement_feed  from anon;
revoke all on public.sponsor_roster_progress   from anon;
revoke all on public.sponsor_document_feed     from anon;
grant select on public.sponsor_case_scope       to authenticated;
grant select on public.sponsor_requirement_feed to authenticated;
grant select on public.sponsor_roster_progress  to authenticated;
grant select on public.sponsor_document_feed    to authenticated;

-- ── 9. The file-access predicate + audit (VOLATILE — it logs) ───────────────
-- Returns true only for a full-scope document the current rep may read, and
-- writes a view_url_issued audit row as a side effect. The server action calls
-- this, then mints a 300s signed URL with the admin client only when true.
create or replace function public.sponsor_open_document(p_document_id uuid)
returns boolean
language plpgsql volatile security definer set search_path = public as $$
declare v_case uuid; v_req text;
begin
  select f.case_id, f.req_code into v_case, v_req
    from public.sponsor_document_feed f
   where f.document_id = p_document_id;
  if v_case is null then
    return false;   -- not a full-scope document this rep may read
  end if;
  insert into public.document_access_log (document_id, case_id, viewer_profile_id, viewer_role, req_code, action)
  values (p_document_id, v_case, auth.uid(), 'sponsor', v_req, 'view_url_issued');
  return true;
end $$;
revoke all on function public.sponsor_open_document(uuid) from public, anon;
grant execute on function public.sponsor_open_document(uuid) to authenticated;

-- ── 10. Binding / consent / revocation RPCs (the only mutation path) ────────
-- Bind the invited rep to their sponsorship on first login (claim by token).
create or replace function public.sponsor_accept_invite(p_token text)
returns uuid
language plpgsql volatile security definer set search_path = public as $$
declare v_id uuid; v_sponsor uuid;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  select id, sponsor_id into v_id, v_sponsor from public.case_sponsorships
   where invite_token = p_token and revoked_at is null;
  if v_id is null then raise exception 'Invalid or revoked invitation'; end if;
  -- Bind this profile to the company + the sponsorship. status becomes 'active'
  -- only once the applicant has consented (sponsor_record_consent handles that);
  -- accepting the invite alone never widens visibility.
  update public.profiles set sponsor_id = v_sponsor where id = auth.uid() and sponsor_id is null;
  update public.case_sponsorships set rep_profile_id = auth.uid()
   where id = v_id and (rep_profile_id is null or rep_profile_id = auth.uid());
  return v_id;
end $$;
revoke all on function public.sponsor_accept_invite(text) from public, anon;
grant execute on function public.sponsor_accept_invite(text) to authenticated;

-- The APPLICANT records consent → activates the sponsorship. Callable only by
-- the case owner (case_visible checks owner OR staff; a sponsor is neither).
create or replace function public.sponsor_record_consent(p_sponsorship_id uuid, p_version text)
returns void
language plpgsql volatile security definer set search_path = public as $$
declare v_case uuid;
begin
  select case_id into v_case from public.case_sponsorships where id = p_sponsorship_id;
  if v_case is null then raise exception 'No such sponsorship'; end if;
  if not public.case_visible(v_case) then raise exception 'Not authorized'; end if;
  update public.case_sponsorships
     set applicant_consented_at = now(),
         applicant_consent_version = p_version,
         status = 'active',
         revoked_at = null
   where id = p_sponsorship_id;
end $$;
revoke all on function public.sponsor_record_consent(uuid, text) from public, anon;
grant execute on function public.sponsor_record_consent(uuid, text) to authenticated;

-- Revoke — the applicant (or staff) cuts access immediately. No staff contact needed.
create or replace function public.sponsor_revoke(p_sponsorship_id uuid)
returns void
language plpgsql volatile security definer set search_path = public as $$
declare v_case uuid;
begin
  select case_id into v_case from public.case_sponsorships where id = p_sponsorship_id;
  if v_case is null then raise exception 'No such sponsorship'; end if;
  if not public.case_visible(v_case) then raise exception 'Not authorized'; end if;
  update public.case_sponsorships
     set revoked_at = now(), status = 'revoked'
   where id = p_sponsorship_id;
end $$;
revoke all on function public.sponsor_revoke(uuid) from public, anon;
grant execute on function public.sponsor_revoke(uuid) to authenticated;

-- ── 11. RLS ─────────────────────────────────────────────────────────────────
-- Sponsors get NO direct SELECT/UPDATE on cases/case_requirements/documents —
-- all reads go through the views above, all writes through the RPCs. The two new
-- tables carry their own policies. Predicates reference OTHER tables only
-- (case_visible → cases/clients; profiles), never the guarded table itself
-- (the self-referential-SELECT pitfall, 20260608204200).
grant select, insert, update, delete on public.sponsors           to authenticated;
grant select, insert, update, delete on public.case_sponsorships  to authenticated;
grant select, insert, update, delete on public.document_access_log to authenticated;

alter table public.sponsors            enable row level security;
alter table public.case_sponsorships   enable row level security;
alter table public.document_access_log enable row level security;

-- sponsors: staff/admin manage; a rep reads their own company; the case owner
-- reads the company sponsoring their case (for the "who can see my file" panel).
create policy sponsors_select on public.sponsors for select
  using (
    public.is_staff_or_admin()
    or id = (select sponsor_id from public.profiles where id = auth.uid())
    or exists (
      select 1 from public.case_sponsorships s
      where s.sponsor_id = sponsors.id and public.case_visible(s.case_id)
    )
  );
create policy sponsors_write on public.sponsors for all
  using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());

-- case_sponsorships: the case owner + staff (case_visible) and the bound rep may
-- SELECT. Direct writes are staff/admin only; clients mutate via the RPCs above.
create policy case_sponsorships_select on public.case_sponsorships for select
  using (public.case_visible(case_id) or rep_profile_id = auth.uid());
create policy case_sponsorships_write on public.case_sponsorships for all
  using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());

-- document_access_log: the case owner + staff read the trail (RPC inserts run
-- under SECURITY DEFINER and bypass this). No client write path.
create policy document_access_log_select on public.document_access_log for select
  using (public.case_visible(case_id));
create policy document_access_log_write on public.document_access_log for all
  using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());
