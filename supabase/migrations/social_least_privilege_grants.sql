REVOKE ALL ON public.comment_reactions FROM anon,authenticated;
GRANT SELECT,INSERT,DELETE ON public.comment_reactions TO authenticated;
REVOKE ALL ON public.social_activity FROM anon,authenticated;
GRANT SELECT ON public.social_activity TO authenticated;