-- The original price-only migration shared a version number with an earlier
-- shipped migration and could not be recorded by Supabase. Apply the intended
-- launch-class correction under a unique migration version.
update public.training_classes
set price_cents = 60000,
    updated_at = now()
where slug = 'ccw-2026-11';
