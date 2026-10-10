-- Legacy policies were permissive to every visitor and override restrictive membership policies.
drop policy if exists "Allow full access on messages" on public.messages;
drop policy if exists "Allow full access to messages" on public.messages;
drop policy if exists "Allow public insert access" on public.messages;
drop policy if exists "Allow public read access" on public.messages;
-- Ensure new authenticated messages cannot sidestep the conversation model via legacy fields.
create or replace function public.enforce_private_chat_message() returns trigger language plpgsql set search_path = '' as $$
begin
 if new.conversation_id is null or new.sender_user_id is distinct from auth.uid() or not public.is_chat_member(new.conversation_id) then raise exception 'Not a chat member'; end if;
 if new.message_type='voice' and (new.audio_path is null or new.audio_path not like new.conversation_id::text || '/' || new.sender_user_id::text || '/%') then raise exception 'Invalid voice path'; end if;
 return new;
end $$;
drop trigger if exists enforce_private_chat_message on public.messages;
create trigger enforce_private_chat_message before insert on public.messages for each row execute function public.enforce_private_chat_message();
-- Prevent authenticated users from updating membership or conversation pairs; creation stays inside the trusted function.
revoke insert,update,delete on public.conversations from anon,authenticated;
revoke insert,update,delete on public.conversation_members from anon,authenticated;