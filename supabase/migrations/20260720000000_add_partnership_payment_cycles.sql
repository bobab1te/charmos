-- Retainer revenue used to be a pure schedule calculation (partnershipEarningsInMonth),
-- recomputed from the partnership's *current* amount/cadence for any month, past or
-- future. That meant editing the cadence or amount silently rewrote what every past
-- month "would have" earned, and the existing "Mark cycle paid" button had zero effect
-- on the dashboard total (the schedule already counted the money automatically).
--
-- This table makes each payment cycle a real row: generated lazily for whatever the
-- *current* cadence/amount is, editable in place while unconfirmed, and permanently
-- frozen the moment it's confirmed. Confirming a cycle is what creates its ledger
-- entry (and is the only thing that makes a retainer payment count toward revenue).

-- Looked up by column rather than a guessed/hardcoded constraint name, since Postgres's
-- default naming for an inline column check isn't guaranteed across every setup.
do $$
declare
  existing_check text;
begin
  select con.conname into existing_check
  from pg_constraint con
  join pg_attribute att on att.attrelid = con.conrelid and att.attnum = any (con.conkey)
  where con.conrelid = 'public.partnerships'::regclass
    and con.contype = 'c'
    and att.attname = 'retainer_cadence';

  if existing_check is not null then
    execute format('alter table public.partnerships drop constraint %I', existing_check);
  end if;

  alter table public.partnerships add constraint partnerships_retainer_cadence_check
    check (retainer_cadence in ('weekly', 'biweekly', 'monthly'));
end $$;

create table public.partnership_payment_cycles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  partnership_id uuid not null references public.partnerships (id) on delete cascade,
  period_start timestamptz not null,
  period_end timestamptz not null,
  expected_amount numeric not null,
  currency text not null,
  status text not null default 'unconfirmed' check (status in ('unconfirmed', 'confirmed')),
  confirmed_at timestamptz,
  -- on delete set null (not cascade): if the ledger entry it produced is ever removed
  -- independently, the cycle itself should stay put as a confirmed record.
  ledger_entry_id uuid references public.ledger (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.partnership_payment_cycles enable row level security;

create policy "Partnership payment cycles are owner-accessible"
  on public.partnership_payment_cycles for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index partnership_payment_cycles_user_id_idx on public.partnership_payment_cycles (user_id);
create index partnership_payment_cycles_partnership_id_idx on public.partnership_payment_cycles (partnership_id);

alter publication supabase_realtime add table public.partnership_payment_cycles;
