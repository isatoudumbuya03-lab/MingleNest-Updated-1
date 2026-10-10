-- Unique, case-insensitive usernames enforced in the database (created only if no duplicates exist).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE username IS NOT NULL
    GROUP BY lower(username) HAVING count(*) > 1
  ) THEN
    CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_lower_key
      ON public.profiles (lower(username)) WHERE username IS NOT NULL;
  END IF;
END $$;

-- Signup trigger: pick a free username automatically so account creation never fails on a duplicate.
CREATE OR REPLACE FUNCTION public.create_minglenest_profile()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $function$
declare v_name text; v_base text; v_user text; v_try int := 0;
begin
  v_name := coalesce(nullif(trim(new.raw_user_meta_data->>'display_name'), ''), split_part(new.email, '@', 1), 'Member');
  v_base := coalesce(nullif(lower(regexp_replace(v_name, '[^a-zA-Z0-9_]', '', 'g')), ''), 'member');
  v_user := v_base;
  while exists (select 1 from public.profiles where lower(username) = v_user) loop
    v_try := v_try + 1;
    v_user := v_base || floor(random()*9000+1000)::int::text;
    exit when v_try > 20;
  end loop;
  insert into public.profiles(id,username,full_name,handle) values(new.id::text, v_user, v_name, v_user) on conflict(id) do nothing;
  insert into public.chat_users(id,display_name) values(new.id,v_name) on conflict(id) do nothing;
  return new;
end $function$;