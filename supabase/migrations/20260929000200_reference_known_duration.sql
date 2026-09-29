-- Capture how long a reference has known the applicant (38 RCNY §5-03 sets NO minimum
-- acquaintance period — this is NEVER a block, only useful context that makes for a
-- stronger letter and pre-fills the reference's own invitation). Finding 9.
alter table public.character_references
  add column if not exists known_duration text;

-- One-time task: the owner asked for a five-year acquaintance BLOCK, which is not in the
-- rule. If real practical guidance exists, it becomes a registry rule with provenance —
-- not a hard-coded number in a form. Raise it for counsel/License-Division confirmation.
insert into public.tasks (case_id, title, description, priority, status)
select null,
  '⚖ Confirm reference acquaintance-length guidance',
  'The owner asked to block references who have known the applicant under five years. No such minimum exists in 38 RCNY §5-03 (four references, two non-family; no acquaintance period). We capture "how long known" and warn softly, but never block. Confirm with counsel / the License Division whether any practical guidance exists; if so, it becomes a registry rule with provenance, not a hard-coded form limit.',
  2, 'open'
where not exists (
  select 1 from public.tasks where title = '⚖ Confirm reference acquaintance-length guidance'
);
