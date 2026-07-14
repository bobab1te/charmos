-- Long-term/retainer partnerships (e.g. Canvas UGC) are a distinct concept from
-- one-off deals: recurring payment schedules, a deliverable cadence/quota, and
-- renewal tracking. Kept as separate tables entirely rather than bolted onto
-- `deals`, since the two have genuinely different lifecycles.

create table public.partnerships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  brand_id uuid not null references public.brands (id) on delete cascade,
  start_date timestamptz not null default now(),
  end_date timestamptz,
  payment_type text not null check (payment_type in ('retainer', 'per_deliverable')),
  retainer_amount numeric,
  retainer_cadence text check (retainer_cadence in ('weekly', 'monthly')),
  per_deliverable_rate numeric,
  currency text not null default 'USD',
  deliverable_count integer not null default 1,
  deliverable_unit text not null default 'pieces of content',
  deliverable_cadence text not null default 'month' check (deliverable_cadence in ('day', 'week', 'month')),
  content_formats text[] not null default '{}',
  notes text,
  status text not null default 'active' check (status in ('active', 'paused', 'ended')),
  created_at timestamptz not null default now()
);

alter table public.partnerships enable row level security;

create policy "Partnerships are owner-accessible"
  on public.partnerships for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index partnerships_user_id_idx on public.partnerships (user_id);
create index partnerships_brand_id_idx on public.partnerships (brand_id);

-- ---------------------------------------------------------------------------
-- partnership_deliverables
-- ---------------------------------------------------------------------------
-- One row per completed deliverable. A log (rather than a single mutable
-- counter) so "N of M this period" and per-deliverable monthly earnings can
-- both be derived by filtering on completed_at, regardless of the
-- partnership's deliverable cadence (day/week/month) — no fragile "reset the
-- counter" bookkeeping needed.

create table public.partnership_deliverables (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  partnership_id uuid not null references public.partnerships (id) on delete cascade,
  completed_at timestamptz not null default now()
);

alter table public.partnership_deliverables enable row level security;

create policy "Partnership deliverables are owner-accessible"
  on public.partnership_deliverables for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index partnership_deliverables_user_id_idx on public.partnership_deliverables (user_id);
create index partnership_deliverables_partnership_id_idx on public.partnership_deliverables (partnership_id);

alter publication supabase_realtime add table public.partnerships;
alter publication supabase_realtime add table public.partnership_deliverables;
