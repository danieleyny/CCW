-- The launch class is $600 all-in. Keep this separate from the original class
-- migration so an environment that already applied the seed is updated safely.
update public.training_classes
set price_cents = 60000,
    updated_at = now()
where slug = 'ccw-2026-11';
