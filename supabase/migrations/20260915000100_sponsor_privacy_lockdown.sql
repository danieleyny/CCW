-- ============================================================================
-- P0.1 — a sponsoring employer could read the applicant's SEALED criminal
-- history, mental-health adjudications, orders of protection, domestic incidents
-- and (adjacent) SSN through the sponsor portal at 'full' sponsorship scope.
--
-- Root cause: party_scope() — the ONE resolver every sponsor read funnels through
-- (sponsor_requirement_feed, sponsor_document_feed, sponsor_roster_progress, and
-- the sponsor_open_document RPC that reads the document feed) — returned 'full'
-- for EVERY applicant requirement whenever the sponsorship scope was 'full':
--
--     when r.party = 'sponsor' then 'full'
--     when p_scope = 'full'    then 'full'   -- exposed the applicant's whole file
--     when p_scope = 'assist'  then r.concierge_scope
--     else 'hidden'
--
-- An employer sponsor needs exactly three things, all party='sponsor': their own
-- company licensing data, the gun custodian pair, and the sponsored position.
-- NOTHING of the applicant's own file is required for any of them. NYPD's
-- disclosure obligation runs to the License Division, not to the employer.
--
-- Fix: default closed. A sponsor resolves 'full' ONLY on their own packet
-- (party='sponsor'); every applicant-owned row is 'hidden' at ANY scope value.
-- This is a single create-or-replace of the function — the dependent views and
-- the sponsor_open_document RPC call it at query time, so they inherit the new
-- boundary with no redefinition. No table/column change, so no new RLS is needed
-- (the sponsor already has NO direct SELECT on cases/case_requirements/documents;
-- every read is mediated by these security-barrier views and this function).
--
-- The scope enum ('packet_only' | 'assist' | 'full') is intentionally left in
-- place but no longer widens applicant visibility. Re-opening a minimised
-- applicant-assist scope, if counsel ever defines a minimum-necessary set, is a
-- deliberate future edit to this one function — not a silent default.
-- ============================================================================
create or replace function public.party_scope(
  p_requirement_id uuid,
  p_viewer public.req_party,
  p_scope public.sponsorship_scope
) returns public.concierge_scope
language sql stable security definer set search_path = public as $$
  select case
    -- Applicant looking at a sponsor-owned row → whatever applicant_scope says
    -- (progress); their own rows are always full. UNCHANGED.
    when p_viewer = 'applicant' then coalesce(
      (select case when r.party = 'sponsor' then r.applicant_scope else 'full'::public.concierge_scope end
         from public.requirements r where r.id = p_requirement_id),
      'hidden'::public.concierge_scope)
    -- Sponsor looking at anything: ONLY their own company packet, ever. The
    -- applicant's file — sensitive or not — is hidden at every scope value.
    else coalesce(
      (select case
         when r.party = 'sponsor' then 'full'::public.concierge_scope
         else 'hidden'::public.concierge_scope
       end from public.requirements r where r.id = p_requirement_id),
      'hidden'::public.concierge_scope)
  end
$$;
revoke all on function public.party_scope(uuid, public.req_party, public.sponsorship_scope) from public, anon;
grant execute on function public.party_scope(uuid, public.req_party, public.sponsorship_scope) to authenticated;
