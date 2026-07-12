-- Archiving a deal removes it from the active kanban board and dashboard
-- metrics without deleting it — it stays viewable in a separate Archived
-- view. Distinct from `stage` so a deal's stage-at-archive-time is preserved.

alter table public.deals add column if not exists archived boolean not null default false;
