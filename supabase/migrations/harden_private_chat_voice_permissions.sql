-- Preserve all existing content; restrict private chat writes to the signed-in sender.
revoke update, truncate, references, trigger on public.messages from anon, authenticated;
-- Realtime changes are delivered only to members with SELECT access.
do $$ begin if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='messages') then alter publication supabase_realtime add table public.messages; end if; end $$;
-- Populate authenticated chat identities without changing legacy device-based profiles.
create or replace function public.register_chat_user() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.chat_users(id,display_name) values(new.id,coalesce(nullif(trim(new.raw_user_meta_data->>'display_name'),''),split_part(new.email,'@',1),'Member')) on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists register_chat_user on auth.users;
create trigger register_chat_user after insert on auth.users for each row execute function public.register_chat_user();
insert into public.chat_users(id,display_name)
select id,coalesce(nullif(trim(raw_user_meta_data->>'display_name'),''),split_part(email,'@',1),'Member') from auth.users on conflict(id) do nothing;
-- Require a nonempty chat identity before creating a pair.
create or replace function public.get_or_create_private_chat(p_other uuid) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_me uuid := auth.uid(); v_id uuid; v_low uuid; v_high uuid;
begin
  if v_me is null or p_other is null or p_other = v_me then raise exception 'Invalid chat participant'; end if;
  if not exists(select 1 from public.chat_users where id = p_other) or not exists(select 1 from public.chat_users where id = v_me) then raise exception 'Chat participant not found'; end if;
  v_low := least(v_me,p_other); v_high := greatest(v_me,p_other);
  insert into public.conversations(user_low,user_high) values(v_low,v_high) on conflict (user_low,user_high) do nothing;
  select id into v_id from public.conversations where user_low=v_low and user_high=v_high;
  insert into public.conversation_members(conversation_id,user_id) values (v_id,v_me),(v_id,p_other) on conflict do nothing;
  return v_id;
end $$;
revoke all on function public.get_or_create_private_chat(uuid) from public;
grant execute on function public.get_or_create_private_chat(uuid) to authenticated;