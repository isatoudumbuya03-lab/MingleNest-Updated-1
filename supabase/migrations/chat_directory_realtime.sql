-- Directory changes become visible to signed-in members without refreshing.
-- Existing chat and voice policies, users and records are retained.
do $$ begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'chat_users'
  ) then
    alter publication supabase_realtime add table public.chat_users;
  end if;
end $$;