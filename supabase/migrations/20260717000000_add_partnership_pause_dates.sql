-- Tracks when a partnership's "paused" status started/ended, so recurring retainer
-- revenue can be excluded for exactly that window instead of continuing to accrue
-- purely from date-range overlap regardless of status.

alter table public.partnerships add column paused_at timestamptz;
alter table public.partnerships add column unpaused_at timestamptz;
