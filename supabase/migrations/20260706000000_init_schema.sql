-- CharmOS initial schema: user profiles + per-user CRM data (brands, deals,
-- ideas, ledger). Every table is scoped to auth.uid() via RLS — the anon key
-- is safe to expose client-side because RLS is the real access boundary.

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
-- One row per auth user, created automatically by the trigger below so the
-- app only ever needs to check "is onboarding_completed_at set", never
-- "does a profile row exist at all".

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  theme text not null default 'light' check (theme in ('light', 'dark')),
  currency text,
  country text,
  platforms text[] not null default '{}',
  audience_tier text check (audience_tier in ('nano', 'micro', 'mid', 'macro')),
  niche text,
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Profiles are self-accessible"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Profiles are self-updatable"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Inserts happen only via the handle_new_user trigger (security definer),
-- but a policy is still required for RLS to permit that insert path.
create policy "Profiles are self-insertable"
  on public.profiles for insert
  with check (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- brands
-- ---------------------------------------------------------------------------

create table public.brands (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  contact_name text,
  contact_email text,
  created_at timestamptz not null default now()
);

alter table public.brands enable row level security;

create policy "Brands are owner-accessible"
  on public.brands for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index brands_user_id_idx on public.brands (user_id);

-- ---------------------------------------------------------------------------
-- deals
-- ---------------------------------------------------------------------------
-- deliverables / shipment / content_requirements are jsonb: nothing queries
-- into them independently today, and they're always rewritten wholesale on
-- save (see charm-store.tsx's saveDeal), so a child table would add
-- complexity with no present benefit.

create table public.deals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  brand_id uuid not null references public.brands (id) on delete cascade,
  stage text not null check (stage in ('negotiating', 'confirmed', 'live', 'completed')),
  deliverables jsonb not null default '[]',
  compensation_amount numeric not null default 0,
  compensation_currency text not null default 'USD',
  usage_rights text,
  shipment jsonb,
  content_requirements jsonb,
  paid boolean not null default false,
  paid_date timestamptz,
  created_at timestamptz not null default now(),
  stage_updated_at timestamptz not null default now()
);

alter table public.deals enable row level security;

create policy "Deals are owner-accessible"
  on public.deals for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index deals_user_id_idx on public.deals (user_id);
create index deals_brand_id_idx on public.deals (brand_id);

-- ---------------------------------------------------------------------------
-- ideas
-- ---------------------------------------------------------------------------

create table public.ideas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  hook text,
  description text,
  platforms text[] not null default '{}',
  status text not null default 'idea' check (status in ('idea', 'scheduled', 'filming', 'editing', 'posted')),
  scheduled_date timestamptz,
  reference_links text[] not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.ideas enable row level security;

create policy "Ideas are owner-accessible"
  on public.ideas for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index ideas_user_id_idx on public.ideas (user_id);

-- ---------------------------------------------------------------------------
-- ledger
-- ---------------------------------------------------------------------------

create table public.ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null check (type in ('income', 'expense')),
  amount numeric not null,
  currency text not null default 'USD',
  date timestamptz not null,
  description text not null,
  deal_id uuid references public.deals (id) on delete set null,
  brand_id uuid references public.brands (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.ledger enable row level security;

create policy "Ledger entries are owner-accessible"
  on public.ledger for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index ledger_user_id_idx on public.ledger (user_id);
create index ledger_deal_id_idx on public.ledger (deal_id);

-- ---------------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------------
-- profiles is deliberately excluded: single-row, read-once-per-session, no
-- cross-device edit race worth the extra subscription in v1.

alter publication supabase_realtime add table public.brands;
alter publication supabase_realtime add table public.deals;
alter publication supabase_realtime add table public.ideas;
alter publication supabase_realtime add table public.ledger;
