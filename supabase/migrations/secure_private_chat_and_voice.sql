create extension if not exists pgcrypto;
create table if not exists public.chat_users (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now()
);
alter table public.chat_users enable row level security;
drop policy if exists "Authenticated users can discover chat users" on public.chat_users;
create policy "Authenticated users can discover chat users" on public.chat_users for select to authenticated using (true);
drop policy if exists "Users can register their own chat identity" on public.chat_users;
create policy "Users can register their own chat identity" on public.chat_users for insert to authenticated with check (id = auth.uid());
drop policy if exists "Users can update their own chat identity" on public.chat_users;
create policy "Users can update their own chat identity" on public.chat_users for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_low uuid not null references auth.users(id),
  user_high uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  constraint conversation_pair_order check (user_low < user_high),
  constraint conversation_unique_pair unique (user_low,user_high)
);
create table if not exists public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  joined_at timestamptz not null default now(),
  primary key(conversation_id,user_id)
);
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
create or replace function public.is_chat_member(p_conversation uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.conversation_members where conversation_id = p_conversation and user_id = (select auth.uid()));
$$;
revoke all on function public.is_chat_member(uuid) from public;
grant execute on function public.is_chat_member(uuid) to authenticated;
drop policy if exists "Members see conversations" on public.conversations;
create policy "Members see conversations" on public.conversations for select to authenticated using (public.is_chat_member(id));
drop policy if exists "Members see participants" on public.conversation_members;
create policy "Members see participants" on public.conversation_members for select to authenticated using (public.is_chat_member(conversation_id));
create or replace function public.get_or_create_private_chat(p_other uuid) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_me uuid := auth.uid(); v_id uuid; v_low uuid; v_high uuid;
begin
  if v_me is null or p_other is null or p_other = v_me then raise exception 'Invalid chat participant'; end if;
  if not exists(select 1 from public.chat_users where id = p_other) then raise exception 'Chat participant not found'; end if;
  v_low := least(v_me,p_other); v_high := greatest(v_me,p_other);
  insert into public.conversations(user_low,user_high) values(v_low,v_high)
    on conflict (user_low,user_high) do nothing;
  select id into v_id from public.conversations where user_low=v_low and user_high=v_high;
  insert into public.conversation_members(conversation_id,user_id) values (v_id,v_me),(v_id,p_other) on conflict do nothing;
  return v_id;
end $$;
revoke all on function public.get_or_create_private_chat(uuid) from public;
grant execute on function public.get_or_create_private_chat(uuid) to authenticated;
-- Reuse the existing, empty messages table; retain all original columns for compatibility.
alter table public.messages add column if not exists conversation_id uuid references public.conversations(id) on delete cascade;
alter table public.messages add column if not exists sender_user_id uuid references auth.users(id);
alter table public.messages add column if not exists message_type text not null default 'text';
alter table public.messages add column if not exists audio_path text;
alter table public.messages add column if not exists duration_ms integer;
alter table public.messages add constraint message_type_valid check (message_type in ('text','voice'));
alter table public.messages add constraint message_payload_valid check ((message_type = 'text' and length(content)>0 and audio_path is null) or (message_type='voice' and audio_path is not null and duration_ms > 0 and duration_ms <= 300000));
create index if not exists messages_conversation_created_idx on public.messages(conversation_id,created_at);
alter table public.messages enable row level security;
drop policy if exists "Members read chat messages" on public.messages;
create policy "Members read chat messages" on public.messages for select to authenticated using (conversation_id is not null and public.is_chat_member(conversation_id));
drop policy if exists "Members send chat messages" on public.messages;
create policy "Members send chat messages" on public.messages for insert to authenticated with check (conversation_id is not null and public.is_chat_member(conversation_id) and sender_user_id=auth.uid() and (message_type='text' or audio_path like conversation_id::text || '/' || auth.uid()::text || '/%'));
drop policy if exists "Sender deletes own chat messages" on public.messages;
create policy "Sender deletes own chat messages" on public.messages for delete to authenticated using (conversation_id is not null and public.is_chat_member(conversation_id) and sender_user_id=auth.uid());
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values ('voice-messages','voice-messages',false,10485760,array['audio/mp4','audio/webm','audio/ogg','audio/aac','audio/mpeg']) on conflict (id) do update set public=false,file_size_limit=10485760,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists "Members read private voice" on storage.objects;
create policy "Members read private voice" on storage.objects for select to authenticated using (bucket_id='voice-messages' and public.is_chat_member((split_part(name,'/',1))::uuid));
drop policy if exists "Members upload own voice" on storage.objects;
create policy "Members upload own voice" on storage.objects for insert to authenticated with check (bucket_id='voice-messages' and public.is_chat_member((split_part(name,'/',1))::uuid) and split_part(name,'/',2)=auth.uid()::text);
drop policy if exists "Sender removes own voice" on storage.objects;
create policy "Sender removes own voice" on storage.objects for delete to authenticated using (bucket_id='voice-messages' and public.is_chat_member((split_part(name,'/',1))::uuid) and split_part(name,'/',2)=auth.uid()::text);
-- Realtime filters each change through message SELECT RLS.
do $$ begin if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='messages') then alter publication supabase_realtime add table public.messages; end if; end $$;