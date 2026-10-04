-- ============================================================================
-- GO-LIVE REPAIR: an approved document must have retrievable bytes.
--
-- Several demo/legacy rows were marked approved with a null file_path. That made
-- the checklist green and exposed a View action even though no file existed.
-- Downgrade and detach those placeholders, then make the invariant structural.
-- ============================================================================

create temporary table _approved_documents_without_files on commit drop as
select id
from public.documents
where status = 'approved'
  and nullif(btrim(coalesce(file_path, '')), '') is null;

update public.case_requirements cr
set
  status = 'pending',
  document_id = null,
  notes = case
    when coalesce(cr.notes, '') = '' then 'Approved-document repair: upload evidence is missing; a real file is required.'
    else cr.notes || E'\nApproved-document repair: upload evidence is missing; a real file is required.'
  end
from _approved_documents_without_files invalid
where cr.document_id = invalid.id
  and cr.status <> 'na';

update public.documents d
set
  status = 'pending',
  reviewer = null,
  review_notes = case
    when coalesce(d.review_notes, '') = '' then 'File missing — upload the actual document before approval.'
    else d.review_notes || E'\nFile missing — upload the actual document before approval.'
  end
from _approved_documents_without_files invalid
where d.id = invalid.id;

alter table public.documents
  add constraint documents_approved_requires_file
  check (
    status <> 'approved'
    or nullif(btrim(coalesce(file_path, '')), '') is not null
  );

comment on constraint documents_approved_requires_file on public.documents is
  'Prevents approved/checklist-complete evidence records when no retrievable storage object is bound.';
