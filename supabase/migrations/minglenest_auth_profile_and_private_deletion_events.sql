-- One Auth UUID maps to a profile and the existing chat directory. Never replace legacy profiles.
create or replace function public.create_minglenest_profile() returns trigger language plpgsql security definer set search_path = '' as $$
declare v_name text;
begin
  v_name := coalesce(nullif(trim(new.raw_user_meta_data->>'display_name'), ''), split_part(new.email, '@', 1), 'Member');
  insert into public.profiles(id,username,full_name,handle) values(new.id::text, lower(regexp_replace(v_name, '\s+', '', 'g')), v_name, lower(regexp_replace(v_name, '\s+', '', 'g'))) on conflict(id) do nothing;
  insert into public.chat_users(id,display_name) values(new.id,v_name) on conflict(id) do nothing;
  return new;
end $$;
drop trigger if exists create_minglenest_profile on auth.users;
create trigger create_minglenest_profile after insert on auth.users for each row execute function public.create_minglenest_profile();
insert into public.profiles(id,username,full_name,handle) select id::text, lower(regexp_replace(coalesce(nullif(trim(raw_user_meta_data->>'display_name'), ''), split_part(email, '@', 1), 'Member'), '\s+', '', 'g')), coalesce(nullif(trim(raw_user_meta_data->>'display_name'), ''), split_part(email, '@', 1), 'Member'), lower(regexp_replace(coalesce(nullif(trim(raw_user_meta_data->>'display_name'), ''), split_part(email, '@', 1), 'Member'), '\s+', '', 'g')) from auth.users on conflict(id) do nothing;
-- Supabase Postgres Changes does not reliably route DELETE by row filter; send only an ID on a private per-conversation channel.
create or replace function public.broadcast_minglenest_message_delete() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform realtime.send(jsonb_build_object('id', old.id), 'message-deleted', 'chat:' || old.conversation_id::text, true);
  return old;
end $$;
drop trigger if exists broadcast_minglenest_message_delete on public.messages;
create trigger broadcast_minglenest_message_delete after delete on public.messages for each row when (old.conversation_id is not null) execute function public.broadcast_minglenest_message_delete();
-- Only conversation members may join private chat event channels.
drop policy if exists "MingleNest members receive deletion events" on realtime.messages;
create policy "MingleNest members receive deletion events" on realtime.messages for select to authenticated using (topic ~ '^chat:[0-9a-f-]{36}$' and public.is_chat_member(substring(topic from 6)::uuid));