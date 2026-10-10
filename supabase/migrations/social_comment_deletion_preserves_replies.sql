ALTER TABLE public.post_comments ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.story_comments ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.post_comments DROP CONSTRAINT IF EXISTS post_comments_parent_id_fkey;
ALTER TABLE public.post_comments ADD CONSTRAINT post_comments_parent_id_fkey FOREIGN KEY(parent_id) REFERENCES public.post_comments(id) ON DELETE RESTRICT;
ALTER TABLE public.story_comments DROP CONSTRAINT IF EXISTS story_comments_parent_id_fkey;
ALTER TABLE public.story_comments ADD CONSTRAINT story_comments_parent_id_fkey FOREIGN KEY(parent_id) REFERENCES public.story_comments(id) ON DELETE RESTRICT;
CREATE OR REPLACE FUNCTION public.remove_social_comment(p_kind text,p_id uuid) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE changed integer; BEGIN IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF; IF p_kind='post' THEN UPDATE public.post_comments SET content='[Comment deleted]',deleted_at=now() WHERE id=p_id AND user_id=auth.uid() AND deleted_at IS NULL; ELSIF p_kind='story' THEN UPDATE public.story_comments SET content='[Comment deleted]',deleted_at=now() WHERE id=p_id AND user_id=auth.uid() AND deleted_at IS NULL; ELSE RAISE EXCEPTION 'Invalid comment kind'; END IF; GET DIAGNOSTICS changed=ROW_COUNT; RETURN changed=1; END $$;
REVOKE ALL ON FUNCTION public.remove_social_comment(text,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.remove_social_comment(text,uuid) TO authenticated;