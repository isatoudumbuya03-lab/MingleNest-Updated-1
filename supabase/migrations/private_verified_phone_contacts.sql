create table if not exists public.profile_private_phones (user_id uuid primary key references auth.users(id) on delete cascade, phone_e164 text not null check(phone_e164 ~ '^\+[1-9][0-9]{6,14}$'), verified_at timestamptz not null);
alter table public.profile_private_phones enable row level security;
drop policy if exists own_verified_phone on public.profile_private_phones;
create policy own_verified_phone on public.profile_private_phones for select to authenticated using(user_id=auth.uid());
revoke all on public.profile_private_phones from anon,authenticated;
grant select on public.profile_private_phones to authenticated;
create index if not exists private_phone_lookup on public.profile_private_phones(phone_e164);
create or replace function public.sync_verified_profile_phone() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.phone_confirmed_at is not null and coalesce(new.phone,'') ~ '^\+?[1-9][0-9]{6,14}$' then
 insert into public.profile_private_phones(user_id,phone_e164,verified_at) values(new.id,'+'||regexp_replace(new.phone,'[^0-9]','','g'),new.phone_confirmed_at) on conflict(user_id) do update set phone_e164=excluded.phone_e164,verified_at=excluded.verified_at;
 else
 delete from public.profile_private_phones where user_id=new.id;
 end if;
 return new;
end $$;
revoke all on function public.sync_verified_profile_phone() from public,anon,authenticated;
drop trigger if exists sync_verified_profile_phone on auth.users;
create trigger sync_verified_profile_phone after insert or update of phone,phone_confirmed_at on auth.users for each row execute function public.sync_verified_profile_phone();
insert into public.profile_private_phones(user_id,phone_e164,verified_at) select id,'+'||regexp_replace(phone,'[^0-9]','','g'),phone_confirmed_at from auth.users where phone_confirmed_at is not null and coalesce(phone,'') ~ '^\+?[1-9][0-9]{6,14}$' on conflict(user_id) do nothing;
create table if not exists public.contact_discovery_limits (user_id uuid primary key references auth.users(id) on delete cascade, window_start timestamptz not null default now(), hash_count integer not null default 0);
alter table public.contact_discovery_limits enable row level security;
revoke all on public.contact_discovery_limits from anon,authenticated;
create or replace function public.discover_minglenest_contacts(p_hashes text[]) returns table(id uuid,display_name text,username text,avatar_url text,matched_hash text) language plpgsql security definer set search_path='' as $$
declare n integer; used integer;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 n:=coalesce(cardinality(p_hashes),0);
 if n>500 or exists(select 1 from unnest(p_hashes) h where h !~ '^[a-f0-9]{64}$' or h is null) then raise exception 'Invalid contact request'; end if;
 insert into public.contact_discovery_limits(user_id,hash_count) values(auth.uid(),n) on conflict(user_id) do update set hash_count=case when contact_discovery_limits.window_start < now()-interval '1 hour' then n else contact_discovery_limits.hash_count+n end,window_start=case when contact_discovery_limits.window_start < now()-interval '1 hour' then now() else contact_discovery_limits.window_start end returning hash_count into used;
 if used>10000 then raise exception 'Contact lookup limit reached. Try again later.'; end if;
 return query select v.user_id,coalesce(nullif(p.full_name,''),nullif(p.username,''),'Member'),coalesce(p.username,p.handle,''),p.avatar_url,encode(extensions.digest(regexp_replace(v.phone_e164,'[^0-9]','','g'),'sha256'),'hex') from public.profile_private_phones v join public.profiles p on p.id=v.user_id::text where v.user_id<>auth.uid() and encode(extensions.digest(regexp_replace(v.phone_e164,'[^0-9]','','g'),'sha256'),'hex')=any(p_hashes);
end $$;
revoke all on function public.discover_minglenest_contacts(text[]) from public,anon;
grant execute on function public.discover_minglenest_contacts(text[]) to authenticated;