-- A $0 deal is gifted (see gifted-label.tsx / charm-store's syncDealLedgerEntry) - marking one
-- "paid" shouldn't have ever created a ledger entry, but before this fix it did whenever the
-- amount was 0. Remove any that already exist so they don't clutter Finances.
delete from public.ledger
where deal_id is not null
  and amount = 0;
