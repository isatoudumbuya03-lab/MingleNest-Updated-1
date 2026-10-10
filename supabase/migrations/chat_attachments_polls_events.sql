alter table public.messages add column if not exists media_path text;
alter table public.messages add column if not exists media_name text;
alter table public.messages add column if not exists media_type text;
alter table public.messages add column if not exists payload jsonb;
alter table public.messages drop constraint if exists message_type_valid;
alter table public.messages drop constraint if exists message_payload_valid;
alter table public.messages add constraint message_type_valid check (message_type in ('text','voice','image','video','document','ai_image','location','contact','poll','event'));
alter table public.messages add constraint message_payload_valid check (
 (message_type='text' and length(content)>0 and audio_path is null)
 or (message_type='voice' and audio_path is not null and duration_ms > 0 and duration_ms <= 300000)
 or (message_type in ('image','video','document','ai_image') and media_path is not null)
 or (message_type in ('location','contact','poll','event') and payload is not null));
drop policy if exists "Members send chat messages" on public.messages;
create policy "Members send chat messages" on public.messages for insert to authenticated with check (conversation_id is not null and public.is_chat_member(conversation_id) and sender_user_id=auth.uid());
create or replace function public.enforce_private_chat_message() returns trigger language plpgsql set search_path = '' as $$
begin
 if new.conversation_id is null or new.sender_user_id is distinct from auth.uid() or not public.is_chat_member(new.conversation_id) then raise exception 'Not a chat member'; end if;
 if new.message_type='voice' and (new.audio_path is null or new.audio_path not like new.conversation_id::text || '/' || new.sender_user_id::text || '/%') then raise exception 'Invalid voice path'; end if;
 if new.message_type in ('image','video','document','ai_image') and (new.media_path is null or new.media_path not like new.conversation_id::text || '/' || new.sender_user_id::text || '/%') then raise exception 'Invalid media path'; end if;
 return new;
end $$;
insert into storage.buckets(id,name,public,file_size_limit) values ('chat-media','chat-media',false,104857600) on conflict (id) do update set public=false,file_size_limit=104857600,allowed_mime_types=null;
drop policy if exists "Members read chat media" on storage.objects;
create policy "Members read chat media" on storage.objects for select to authenticated using (bucket_id='chat-media' and public.is_chat_member((split_part(name,'/',1))::uuid));
drop policy if exists "Members upload own chat media" on storage.objects;
create policy "Members upload own chat media" on storage.objects for insert to authenticated with check (bucket_id='chat-media' and public.is_chat_member((split_part(name,'/',1))::uuid) and split_part(name,'/',2)=auth.uid()::text);
drop policy if exists "Sender removes own chat media" on storage.objects;
create policy "Sender removes own chat media" on storage.objects for delete to authenticated using (bucket_id='chat-media' and public.is_chat_member((split_part(name,'/',1))::uuid) and split_part(name,'/',2)=auth.uid()::text);
create or replace function public.message_chat_member(p_message uuid) returns boolean language sql stable security definer set search_path = '' as $$
 select exists (select 1 from public.messages m where m.id=p_message and public.is_chat_member(m.conversation_id));
$$;
revoke all on function public.message_chat_member(uuid) from public, anon;
grant execute on function public.message_chat_member(uuid) to authenticated;
create table if not exists public.message_poll_votes (
 message_id uuid not null references public.messages(id) on delete cascade,
 user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 option_index integer not null check (option_index between 0 and 9),
 created_at timestamptz not null default now(),
 primary key (message_id,user_id));
alter table public.message_poll_votes enable row level security;
drop policy if exists "Members read poll votes" on public.message_poll_votes;
create policy "Members read poll votes" on public.message_poll_votes for select to authenticated using (public.message_chat_member(message_id));
drop policy if exists "Members vote once" on public.message_poll_votes;
create policy "Members vote once" on public.message_poll_votes for insert to authenticated with check (user_id=auth.uid() and public.message_chat_member(message_id));
drop policy if exists "Members change own vote" on public.message_poll_votes;
create policy "Members change own vote" on public.message_poll_votes for delete to authenticated using (user_id=auth.uid());
revoke all on public.message_poll_votes from anon, authenticated;
grant select, insert, delete on public.message_poll_votes to authenticated;