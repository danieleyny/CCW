-- Applicant photos are converted server-side toward the portal's format/dimensions
-- (finding 8). Keep the ORIGINAL the applicant uploaded alongside the converted file, and
-- record what changed, so staff know exactly what they're sending to NYPD — and know that
-- conversion fixed format/size only, not a hat/glasses/tilt/selfie/stale photo.
alter table public.documents
  add column if not exists original_file_path text,
  add column if not exists conversion_note   text;
