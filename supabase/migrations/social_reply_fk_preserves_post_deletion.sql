ALTER TABLE public.post_comments DROP CONSTRAINT IF EXISTS post_comments_parent_id_fkey;
ALTER TABLE public.post_comments ADD CONSTRAINT post_comments_parent_id_fkey FOREIGN KEY(parent_id) REFERENCES public.post_comments(id) ON DELETE NO ACTION;
ALTER TABLE public.story_comments DROP CONSTRAINT IF EXISTS story_comments_parent_id_fkey;
ALTER TABLE public.story_comments ADD CONSTRAINT story_comments_parent_id_fkey FOREIGN KEY(parent_id) REFERENCES public.story_comments(id) ON DELETE NO ACTION;