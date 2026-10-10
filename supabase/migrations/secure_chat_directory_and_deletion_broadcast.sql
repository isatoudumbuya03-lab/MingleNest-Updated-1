-- Only signed-in users may discover real MingleNest chat identities.
drop policy if exists "Authenticated users can discover chat users" on public.chat_users;
create policy "Authenticated users can discover chat users" on public.chat_users for select to authenticated using (auth.uid() is not null);
-- Private chat deletion notices only travel among existing conversation members.
drop policy if exists "Members announce private chat changes" on realtime.messages;
create policy "Members announce private chat changes" on realtime.messages for insert to authenticated with check (
  topic ~ '^chat:[0-9a-f-]{36}$' and public.is_chat_member(substring(topic from 6)::uuid)
);