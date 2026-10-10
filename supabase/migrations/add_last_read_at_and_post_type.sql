ALTER TABLE public.conversation_members ADD COLUMN IF NOT EXISTS last_read_at timestamptz;
UPDATE public.conversation_members SET last_read_at = now() WHERE last_read_at IS NULL;
ALTER TABLE public.conversation_members ALTER COLUMN last_read_at SET DEFAULT now();
REVOKE UPDATE ON public.conversation_members FROM anon, authenticated;
GRANT UPDATE (last_read_at) ON public.conversation_members TO authenticated;
DROP POLICY IF EXISTS "Members update own read state" ON public.conversation_members;
CREATE POLICY "Members update own read state" ON public.conversation_members FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS post_type text;
UPDATE public.posts SET post_type = CASE
  WHEN coalesce(video_url,'')<>'' OR coalesce(video_path,'')<>'' THEN 'video'
  WHEN coalesce(image_url,'')<>'' OR coalesce(media_url,'')<>'' THEN 'photo'
  ELSE 'text' END WHERE post_type IS NULL;
ALTER TABLE public.posts ALTER COLUMN post_type SET DEFAULT 'text';
ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS posts_post_type_check;
ALTER TABLE public.posts ADD CONSTRAINT posts_post_type_check CHECK (post_type IN ('text','photo','video'));