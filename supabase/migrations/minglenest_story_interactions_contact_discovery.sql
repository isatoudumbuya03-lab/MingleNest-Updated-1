create table if not exists public.story_reactions (story_id uuid not null references public.stories(id) on delete cascade, user_id uuid not null references auth.users(id) on delete cascade, created_at timestamptz not null default now(), primary key(story_id,user_id));
create table if not exists public.story_comments (id uuid primary key default gen_random_uuid(), story_id uuid not null references public.stories(id) on delete cascade, user_id uuid not null references auth.users(id) on delete cascade, content text not null check(length(trim(content)) between 1 and 2000), created_at timestamptz not null default now());
create index if not exists story_comments_story_idx on public.story_comments(story_id,created_at);
alter table public.story_reactions enable row level security;
alter table public.story_comments enable row level security;
drop policy if exists story_reactions_read on public.story_reactions;
create policy story_reactions_read on public.story_reactions for select to authenticated using(true);
drop policy if exists story_reactions_insert on public.story_reactions;
create policy story_reactions_insert on public.story_reactions for insert to authenticated with check(user_id=auth.uid());
drop policy if exists story_reactions_delete on public.story_reactions;
create policy story_reactions_delete on public.story_reactions for delete to authenticated using(user_id=auth.uid());
drop policy if exists story_comments_read on public.story_comments;
create policy story_comments_read on public.story_comments for select to authenticated using(true);
drop policy if exists story_comments_insert on public.story_comments;
create policy story_comments_insert on public.story_comments for insert to authenticated with check(user_id=auth.uid());
drop policy if exists story_comments_delete on public.story_comments;
create policy story_comments_delete on public.story_comments for delete to authenticated using(user_id=auth.uid());
grant select,insert,delete on public.story_reactions,public.story_comments to authenticated;
-- Matching is explicit and authenticated. Never return email/phone data or retain uploaded contacts.
create or replace function public.discover_minglenest_contacts(p_hashes text[]) returns table(id uuid,display_name text,username text,avatar_url text,matched_hash text) language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 if coalesce(array_length(p_hashes,1),0)>1000 then raise exception 'Too many contacts'; end if;
 return query select u.id,coalesce(p.full_name,c.display_name,'Member'),coalesce(p.username,p.handle,''),p.avatar_url,h.value
 from auth.users u join public.chat_users c on c.id=u.id left join public.profiles p on p.id=u.id::text
 cross join lateral (values
 (case when u.email_confirmed_at is not null then encode(extensions.digest(lower(trim(u.email)),'sha256'),'hex') end),
 (case when u.phone_confirmed_at is not null and u.phone is not null then encode(extensions.digest(regexp_replace(u.phone,'[^0-9]','','g'),'sha256'),'hex') end)) h(value)
 where u.id<>auth.uid() and h.value=any(p_hashes);
end $$;
revoke all on function public.discover_minglenest_contacts(text[]) from public,anon;
grant execute on function public.discover_minglenest_contacts(text[]) to authenticated;