CREATE OR REPLACE FUNCTION public.minglenest_content_creation_time() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
 IF TG_OP = 'INSERT' THEN
   NEW.created_at := clock_timestamp();
 ELSE
   NEW.created_at := OLD.created_at;
   IF TG_TABLE_NAME = 'messages' THEN
     NEW.sender_user_id := OLD.sender_user_id;
     NEW.conversation_id := OLD.conversation_id;
   ELSE
     NEW.user_id := OLD.user_id;
   END IF;
 END IF;
 RETURN NEW;
END;
$$;
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['posts','stories','post_comments','story_comments','messages'] LOOP
 EXECUTE format('ALTER TABLE public.%I ALTER COLUMN created_at SET DEFAULT now()', t);
 EXECUTE format('DROP TRIGGER IF EXISTS minglenest_creation_time ON public.%I', t);
 EXECUTE format('CREATE TRIGGER minglenest_creation_time BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.minglenest_content_creation_time()', t);
 END LOOP;
END $$;