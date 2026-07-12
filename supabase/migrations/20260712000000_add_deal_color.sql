-- Lets a user override a deal card's auto-assigned kanban color. Null means
-- "use the deterministic default color computed from the deal's id" — see
-- src/lib/deal-card-colors.ts. Already covered by the existing owner-only RLS
-- policy on public.deals (no new policy needed).

alter table public.deals add column if not exists color text;
