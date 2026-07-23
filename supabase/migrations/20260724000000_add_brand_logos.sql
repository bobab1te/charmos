-- Lets a user upload a logo/icon for a brand, shown wherever the brand name appears alone
-- (deal cards, partnership cards, the Brands tab). Uploaded from the deal/partnership form and
-- the Brands tab itself - see uploadBrandLogo in charm-store.tsx.

alter table public.brands add column if not exists logo_url text;

-- Public bucket: logos aren't sensitive, and rendering them via plain <img src> across the app
-- without per-request signed URLs keeps the client simple. Writes are still locked down below.
insert into storage.buckets (id, name, public)
values ('brand-logos', 'brand-logos', true)
on conflict (id) do nothing;

drop policy if exists "Brand logos are publicly readable" on storage.objects;
create policy "Brand logos are publicly readable"
  on storage.objects for select
  using (bucket_id = 'brand-logos');

-- Uploads are stored at {user_id}/{brand_id}.{ext} - this policy checks the first path segment
-- (the folder) matches the uploader's own id, so one user can never overwrite another's logo.
drop policy if exists "Users can upload their own brand logos" on storage.objects;
create policy "Users can upload their own brand logos"
  on storage.objects for insert
  with check (bucket_id = 'brand-logos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can update their own brand logos" on storage.objects;
create policy "Users can update their own brand logos"
  on storage.objects for update
  using (bucket_id = 'brand-logos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can delete their own brand logos" on storage.objects;
create policy "Users can delete their own brand logos"
  on storage.objects for delete
  using (bucket_id = 'brand-logos' and (storage.foldername(name))[1] = auth.uid()::text);
