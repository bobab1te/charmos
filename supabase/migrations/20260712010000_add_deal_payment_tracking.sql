-- Tracks how a deal is compensated (cash payment vs. gifted product vs.
-- commission), plus an optional expected-payout date for cash deals not yet
-- paid in full. `paid`/`paid_date` already existed but had no UI writing to
-- them until now.

alter table public.deals
  add column if not exists compensation_type text not null default 'paid'
    check (compensation_type in ('paid', 'gifted', 'commission')),
  add column if not exists expected_payout_date text;
