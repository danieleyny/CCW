-- V4-A4a — the client_track enum only had resident/business/non_resident, so a
-- self-serve applicant on the premises or retired-LEO path kept track='resident'
-- in the DB and every admin display even though their requirements were correct.
-- Add the two missing tracks. (Added alone; a new enum value can't be used in the
-- transaction that creates it — completeIntake writes clients.track at runtime.)
alter type client_track add value if not exists 'retired_leo';
alter type client_track add value if not exists 'premises_business';
