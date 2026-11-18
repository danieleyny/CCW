-- ============================================================================
-- GO-LIVE REPAIR: one requirement card per stable req_code, per case.
--
-- Registry rows are dated versions. Their UUID changes when a rule is revised,
-- but req_code is the durable identity users and workflow code see. The original
-- uniqueness key (case_id, requirement_id) allowed materialization against a new
-- registry version to insert a second card beside the historical one.
--
-- Preserve the strongest/evidenced row, re-home its review history, then enforce
-- the invariant in PostgreSQL so a race or future caller cannot reintroduce it.
-- Historical cases keep the requirement_id of the survivor; the application
-- materializer separately keys by req_code and evaluates that row's own trigger.
-- ============================================================================

create temporary table _case_requirement_dedupe on commit drop as
with ranked as (
  select
    cr.id,
    first_value(cr.id) over (
      partition by cr.case_id, cr.req_code
      order by
        case cr.status
          when 'satisfied' then 4
          when 'rejected'  then 3
          when 'pending'   then 2
          when 'na'        then 1
          else 0
        end desc,
        case when cr.document_id is not null
               or cr.reference_id is not null
               or cr.cohabitant_id is not null
               or cr.disclosure_id is not null then 1 else 0 end desc,
        cr.created_at asc,
        cr.id asc
    ) as keeper_id
  from public.case_requirements cr
)
select id as loser_id, keeper_id
from ranked
where id <> keeper_id;

-- Keep every evidence binding and the most useful review metadata. In the rare
-- case duplicates hold different evidence kinds, coalescing them is safer than
-- silently discarding a filed artifact.
update public.case_requirements keeper
set
  document_id = coalesce(keeper.document_id, (
    select loser.document_id
    from _case_requirement_dedupe map
    join public.case_requirements loser on loser.id = map.loser_id
    where map.keeper_id = keeper.id and loser.document_id is not null
    order by loser.updated_at desc limit 1
  )),
  reference_id = coalesce(keeper.reference_id, (
    select loser.reference_id
    from _case_requirement_dedupe map
    join public.case_requirements loser on loser.id = map.loser_id
    where map.keeper_id = keeper.id and loser.reference_id is not null
    order by loser.updated_at desc limit 1
  )),
  cohabitant_id = coalesce(keeper.cohabitant_id, (
    select loser.cohabitant_id
    from _case_requirement_dedupe map
    join public.case_requirements loser on loser.id = map.loser_id
    where map.keeper_id = keeper.id and loser.cohabitant_id is not null
    order by loser.updated_at desc limit 1
  )),
  disclosure_id = coalesce(keeper.disclosure_id, (
    select loser.disclosure_id
    from _case_requirement_dedupe map
    join public.case_requirements loser on loser.id = map.loser_id
    where map.keeper_id = keeper.id and loser.disclosure_id is not null
    order by loser.updated_at desc limit 1
  )),
  notes = coalesce(keeper.notes, (
    select loser.notes
    from _case_requirement_dedupe map
    join public.case_requirements loser on loser.id = map.loser_id
    where map.keeper_id = keeper.id and loser.notes is not null
    order by loser.updated_at desc limit 1
  )),
  reviewer = coalesce(keeper.reviewer, (
    select loser.reviewer
    from _case_requirement_dedupe map
    join public.case_requirements loser on loser.id = map.loser_id
    where map.keeper_id = keeper.id and loser.reviewer is not null
    order by loser.updated_at desc limit 1
  ))
where exists (
  select 1 from _case_requirement_dedupe map where map.keeper_id = keeper.id
);

-- Reviews are append-only audit evidence. Move them before deleting duplicate
-- cards so ON DELETE CASCADE never erases the history.
update public.requirement_reviews review
set case_requirement_id = map.keeper_id
from _case_requirement_dedupe map
where review.case_requirement_id = map.loser_id;

delete from public.case_requirements loser
using _case_requirement_dedupe map
where loser.id = map.loser_id;

alter table public.case_requirements
  add constraint case_requirements_case_req_code_key unique (case_id, req_code);

comment on constraint case_requirements_case_req_code_key on public.case_requirements is
  'One workflow card per stable requirement code per case; registry UUIDs are dated versions, not per-case identities.';
