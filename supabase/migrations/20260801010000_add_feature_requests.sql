-- Feature suggestions submitted from Settings.
--
-- Follows the same shape as every other user-owned table here: user_id referencing auth.users
-- with cascade delete, RLS on with a single owner-scoped "for all" policy, and an index on
-- user_id.
--
-- The owner-only policy is what keeps one creator's suggestions private from another. Reviewing
-- submissions across all users is a service-role/Supabase-dashboard job, which bypasses RLS —
-- there is deliberately no policy granting any signed-in user a wider read.

create table if not exists public.feature_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  suggestion text not null,
  -- "Why would this be useful?" — optional, so a one-line idea is never blocked behind a rationale.
  reason text,
  category text,
  details text,
  status text not null default 'submitted'
    check (status in ('submitted', 'considering', 'planned', 'in_progress', 'completed')),
  created_at timestamptz not null default now()
);

alter table public.feature_requests enable row level security;

create policy "Feature requests are owner-accessible"
  on public.feature_requests for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists feature_requests_user_id_idx on public.feature_requests (user_id);

-- Belt and braces against a double-submit racing past the client's in-flight guard (a double
-- click, or a retried request after a flaky network). Two identical suggestions from the same
-- user inside the same minute are a duplicate, not a second idea; the same text submitted next
-- week still goes through.
create unique index if not exists feature_requests_no_rapid_duplicates_idx
  on public.feature_requests (user_id, suggestion, date_trunc('minute', created_at));
