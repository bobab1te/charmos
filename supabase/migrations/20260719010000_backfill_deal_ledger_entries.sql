-- Deals marked paid before this feature existed never got a ledger entry (the
-- charm-store sync only runs going forward, on save). Backfill one entry per
-- already-paid deal so existing revenue shows up in Finances too. Guarded with
-- "not exists" so re-running this migration is a no-op.
insert into public.ledger (user_id, type, amount, currency, date, description, deal_id, brand_id)
select
  d.user_id,
  'income',
  d.compensation_amount,
  d.compensation_currency,
  d.paid_date,
  coalesce(b.name, 'Unknown brand') || ' — brand deal payment',
  d.id,
  d.brand_id
from public.deals d
left join public.brands b on b.id = d.brand_id
where d.paid = true
  and d.paid_date is not null
  and not exists (select 1 from public.ledger l where l.deal_id = d.id);
