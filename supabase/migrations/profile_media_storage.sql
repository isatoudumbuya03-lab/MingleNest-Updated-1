insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profile-media', 'profile-media', true, 5242880, array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update set public = true, file_size_limit = 5242880;

create table if not exists public.profiles (
  device_id text primary key,
  name text,
  handle text,
  bio text,
  avatar_url text,
  cover_url text,
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

drop policy if exists "profiles read" on public.profiles;
create policy "profiles read" on public.profiles for select using (true);
drop policy if exists "profiles insert" on public.profiles;
create policy "profiles insert" on public.profiles for insert with check (true);
drop policy if exists "profiles update" on public.profiles;
create policy "profiles update" on public.profiles for update using (true) with check (true);

drop policy if exists "profile media read" on storage.objects;
create policy "profile media read" on storage.objects for select using (bucket_id = 'profile-media');
drop policy if exists "profile media upload" on storage.objects;
create policy "profile media upload" on storage.objects for insert with check (bucket_id = 'profile-media');
drop policy if exists "profile media update" on storage.objects;
create policy "profile media update" on storage.objects for update using (bucket_id = 'profile-media');