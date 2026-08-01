-- Product tour state.
--
-- Deliberately columns on `profiles` rather than a new table: this is one row per user of
-- small, always-loaded scalar state, exactly like `onboarding_completed_at` beside it, and
-- getCurrentUserAndProfile already fetches the profile on every authenticated request. A
-- separate table would add a second round trip to answer "should the tour be showing?".
--
-- Note this is NOT the same thing as onboarding_completed_at. That gates the /onboarding
-- wizard (display name, theme, platforms, audience, currency) which runs before the CRM is
-- reachable at all. The tour runs afterwards, inside the real CRM, and is skippable.

alter table public.profiles
  add column if not exists tour_step text,
  add column if not exists tour_status text not null default 'pending'
    check (tour_status in ('pending', 'active', 'later', 'done'));

comment on column public.profiles.tour_step is
  'Step key the user is currently on, e.g. partnership | ai-parsing | scrapbook | settings. Null once the tour is done.';

comment on column public.profiles.tour_status is
  'pending = never started, active = in progress, later = paused via "Continue later" (resumable from tour_step), done = completed or skipped outright.';
