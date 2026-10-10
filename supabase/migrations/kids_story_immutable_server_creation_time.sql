ALTER TABLE public.kids_stories ALTER COLUMN created_at SET DEFAULT now();
DROP TRIGGER IF EXISTS minglenest_creation_time ON public.kids_stories;
CREATE TRIGGER minglenest_creation_time BEFORE INSERT OR UPDATE ON public.kids_stories FOR EACH ROW EXECUTE FUNCTION public.minglenest_content_creation_time();