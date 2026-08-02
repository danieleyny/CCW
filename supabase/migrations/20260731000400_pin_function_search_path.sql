-- ============================================================================
-- Supabase Security Advisor: "Function Search Path Mutable".
--
-- Two app-owned functions were created without a fixed search_path (every other
-- function in this codebase already sets `search_path = public`). A mutable
-- search_path lets a caller who can create objects in a schema earlier on the
-- path shadow the objects the function resolves — so pin it. ALTER FUNCTION ...
-- SET pins the path WITHOUT rewriting the body or dropping the function, so the
-- `updated_at` trigger and the storage.objects RLS policies that reference these
-- are unaffected; behaviour is identical (they already resolved in public).
--
-- Deliberately NOT touched (accepted / by design, acknowledged in the Advisor):
--   • The 7 "Security Definer View" findings — the instructor privacy firewall
--     (see 20260718001600_trainer_firewall.sql). Adding security_invoker=true
--     would make them return zero rows and reopen the breach they exist to close.
--   • RLS on public.spatial_ref_sys + postgis/citext "extension in public" —
--     PostGIS is not relocatable and spatial_ref_sys is reference data owned by
--     the extension.
-- ============================================================================

alter function public.set_updated_at() set search_path = public;
alter function public.storage_doc_client_id(text) set search_path = public;
