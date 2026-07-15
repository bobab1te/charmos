-- General freeform notes about a deal (e.g. "brand is slow to respond", reminders to
-- self), shown as a quick preview on the kanban card. Distinct from
-- content_requirements.notes, which is the brand's creative-brief notes for the
-- content itself ("Content Requirements" tab) — keeping these separate rather than
-- overloading one field for two different purposes.
alter table public.deals add column notes text;
