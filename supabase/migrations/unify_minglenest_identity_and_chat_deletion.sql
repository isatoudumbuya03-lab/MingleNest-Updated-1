-- Retain all existing rows; new authenticated content uses the Auth UUID as text in legacy tables.
alter table public.profiles add column if not exists bio text;
alter table public.profiles add column if not exists handle text;
alter table public.posts add column if not exists image_url text;
alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.stories enable row level security;
alter table public.kids_stories enable row level security;
-- Replace permissive legacy writes. Read access is unchanged to preserve the public social feed.
drop policy if exists "Allow full access on profiles" on public.profiles;
drop policy if exists "Allow public insert access" on public.profiles;
drop policy if exists "Allow public update access" on public.profiles;
drop policy if exists "MingleNest profile insert" on public.profiles;
create policy "MingleNest profile insert" on public.profiles for insert to authenticated with check (id = auth.uid()::text);
drop policy if exists "MingleNest profile update" on public.profiles;
create policy "MingleNest profile update" on public.profiles for update to authenticated using (id = auth.uid()::text) with check (id = auth.uid()::text);
drop policy if exists "Allow full access on posts" on public.posts;
drop policy if exists "MingleNest posts read" on public.posts;
create policy "MingleNest posts read" on public.posts for select using (true);
drop policy if exists "MingleNest posts insert" on public.posts;
create policy "MingleNest posts insert" on public.posts for insert to authenticated with check (user_id = auth.uid()::text);
drop policy if exists "MingleNest posts delete" on public.posts;
create policy "MingleNest posts delete" on public.posts for delete to authenticated using (user_id = auth.uid()::text);
drop policy if exists "Allow full access on stories" on public.stories;
drop policy if exists "Allow public delete stories" on public.stories;
drop policy if exists "Allow public insert stories" on public.stories;
drop policy if exists "MingleNest stories insert" on public.stories;
create policy "MingleNest stories insert" on public.stories for insert to authenticated with check (user_id = auth.uid()::text);
drop policy if exists "MingleNest stories delete" on public.stories;
create policy "MingleNest stories delete" on public.stories for delete to authenticated using (user_id = auth.uid()::text);
drop policy if exists "Allow full access on kids_stories" on public.kids_stories;
drop policy if exists "MingleNest kids stories read" on public.kids_stories;
create policy "MingleNest kids stories read" on public.kids_stories for select to authenticated using (user_id = auth.uid()::text);
drop policy if exists "MingleNest kids stories insert" on public.kids_stories;
create policy "MingleNest kids stories insert" on public.kids_stories for insert to authenticated with check (user_id = auth.uid()::text);
drop policy if exists "MingleNest kids stories delete" on public.kids_stories;
create policy "MingleNest kids stories delete" on public.kids_stories for delete to authenticated using (user_id = auth.uid()::text);
-- Only a signed-in owner may upload new images under their Auth UUID prefix.
drop policy if exists "Public Insert Profile Media" on storage.objects;
drop policy if exists "Public Update Profile Media" on storage.objects;
drop policy if exists "MingleNest owner image upload" on storage.objects;
create policy "MingleNest owner image upload" on storage.objects for insert to authenticated with check (bucket_id = 'profile-media' and split_part(name, '/', 1) = auth.uid()::text);
-- The existing voice bucket remains private; a sender can remove only files under their own path.
-- Keep authenticated message deletion limited by the existing membership and sender RLS policy.
-- Include previous row values in Realtime DELETE payloads; the client also refreshes from the database.
alter table public.messages replica identity full;
do $$ begin if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='messages') then alter publication supabase_realtime add table public.messages; end if; end $$;
-- Existing Auth users are made visible in Chat; no passwords, test identities or old profile data are changed.
insert into public.chat_users(id,display_name) select id,coalesce(nullif(trim(raw_user_meta_data->>'display_name'),''),split_part(email,'@',1),'Member') from auth.users on conflict(id) do nothing;