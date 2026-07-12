-- Lets an idea be tagged as part of a series — a plain shared text tag
-- (not a separate table/FK) is enough to group ideas together, since
-- nothing else needs a relational join against it today.

alter table public.ideas add column if not exists series text;
