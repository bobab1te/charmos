-- Extends the deal card's existing custom-color override to ideas and partnerships, so all
-- three widget types share one color system (see src/lib/widget-colors.ts).

alter table public.ideas add column if not exists color text;
alter table public.partnerships add column if not exists color text;
