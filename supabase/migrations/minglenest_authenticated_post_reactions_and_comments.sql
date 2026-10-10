-- Add ownership to interactions while leaving existing posts and stories untouched.
create table if not exists public.post_reactions (post_id uuid not null references public.posts(id) on delete cascade, user_id uuid not null references auth.users(id) on delete cascade, created_at timestamptz not null default now(), primary key (post_id,user_id));
create table if not exists public.post_comments (id uuid primary key default gen_random_uuid(), post_id uuid not null references public.posts(id) on delete cascade, user_id uuid not null references auth.users(id) on delete cascade, content text not null check (char_length(content) between 1 and 2000), created_at timestamptz not null default now());
create index if not exists post_comments_post_idx on public.post_comments(post_id,created_at);
alter table public.post_reactions enable row level security;
alter table public.post_comments enable row level security;
drop policy if exists "MingleNest reactions read" on public.post_reactions;
create policy "MingleNest reactions read" on public.post_reactions for select using (true);
drop policy if exists "MingleNest reactions insert" on public.post_reactions;
create policy "MingleNest reactions insert" on public.post_reactions for insert to authenticated with check (user_id=auth.uid());
drop policy if exists "MingleNest reactions delete" on public.post_reactions;
create policy "MingleNest reactions delete" on public.post_reactions for delete to authenticated using (user_id=auth.uid());
drop policy if exists "MingleNest comments read" on public.post_comments;
create policy "MingleNest comments read" on public.post_comments for select using (true);
drop policy if exists "MingleNest comments insert" on public.post_comments;
create policy "MingleNest comments insert" on public.post_comments for insert to authenticated with check (user_id=auth.uid());
drop policy if exists "MingleNest comments delete" on public.post_comments;
create policy "MingleNest comments delete" on public.post_comments for delete to authenticated using (user_id=auth.uid());