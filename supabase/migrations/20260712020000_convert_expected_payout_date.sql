-- expected_payout_date is now a real calendar date (was free text) so it can
-- be compared against "today" to decide when to show the unpaid warning.
-- The regex guard drops any non-date value (e.g. an old "N/A" or "net 30")
-- to null instead of erroring the migration.

alter table public.deals
  alter column expected_payout_date type timestamptz
  using (case when expected_payout_date ~ '^\d{4}-\d{2}-\d{2}' then expected_payout_date::timestamptz else null end);
