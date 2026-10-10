create table if not exists public.message_listens (
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id uuid not null default auth.uid(),
  played_at timestamptz not null default now(),
  primary key (message_id, user_id)
);
alter table public.message_listens enable row level security;
drop policy if exists "listens_select_own" on public.message_listens;
create policy "listens_select_own" on public.message_listens for select to authenticated using (user_id = auth.uid());
drop policy if exists "listens_insert_own" on public.message_listens;
create policy "listens_insert_own" on public.message_listens for insert to authenticated with check (
  user_id = auth.uid()
  and exists (select 1 from public.messages m where m.id = message_id and m.message_type = 'voice' and m.sender_user_id is distinct from auth.uid())
);