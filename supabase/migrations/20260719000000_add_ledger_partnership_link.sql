-- Long-term partnership retainer payments can now be manually confirmed (see the
-- "Mark cycle paid" action), generating a ledger entry the same way a paid brand
-- deal does. on delete set null (matching deal_id) so a finance entry survives as
-- historical record even if the partnership is later deleted.
alter table public.ledger add column partnership_id uuid references public.partnerships (id) on delete set null;
