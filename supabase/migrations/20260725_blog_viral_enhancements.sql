-- Blog Viral Enhancements
-- Add view_count, trending support, and more categories

-- 1. Add view_count column if not exists
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'blog_posts' AND column_name = 'view_count') THEN
    ALTER TABLE public.blog_posts ADD COLUMN view_count integer NOT NULL DEFAULT 0;
  END IF;
END $$;

-- 2. Add author_name column (denormalized for display without join)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'blog_posts' AND column_name = 'author_name') THEN
    ALTER TABLE public.blog_posts ADD COLUMN author_name text DEFAULT 'Equipe Bateumz';
  END IF;
END $$;

-- 3. Function to safely increment blog post views
CREATE OR REPLACE FUNCTION public.increment_blog_view(post_slug text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.blog_posts SET view_count = view_count + 1 WHERE slug = post_slug;
$$;

GRANT EXECUTE ON FUNCTION public.increment_blog_view(text) TO anon, authenticated;

-- 4. Function to get trending posts (most viewed in last 7 days)
CREATE OR REPLACE FUNCTION public.get_trending_posts(limit_count integer DEFAULT 5)
RETURNS SETOF public.blog_posts
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.blog_posts
  WHERE published = true AND published_at > now() - interval '30 days'
  ORDER BY view_count DESC, published_at DESC
  LIMIT limit_count;
$$;

GRANT EXECUTE ON FUNCTION public.get_trending_posts(integer) TO anon, authenticated;

-- 5. Add more viral categories
INSERT INTO public.blog_categories (name, slug, description) VALUES
  ('Viral & Trending', 'viral-trending', 'Conteúdo viral e tendências da internet'),
  ('Gaming & E-Sports', 'gaming-esports', 'Mundo dos jogos e competições'),
  ('Sorteios ao Vivo', 'sorteios-ao-vivo', 'Acompanhe os sorteios em tempo real'),
  ('Dicas de Ganhar', 'dicas-de-ganhar', 'Estratégias e dicas para aumentar suas chances'),
  ('Entretenimento', 'entretenimento', 'Diversão, memes e cultura pop'),
  ('Notícias & Atualidades', 'noticias-atualidades', 'As últimas notícias do mundo dos sorteios e prêmios')
ON CONFLICT (slug) DO NOTHING;

-- 6. Index for trending queries
CREATE INDEX IF NOT EXISTS idx_blog_posts_view_count ON public.blog_posts(view_count DESC);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published_at ON public.blog_posts(published_at DESC);

-- 7. Update RLS to allow anon to call increment_blog_view (already handled by SECURITY DEFINER + GRANT above)
-- Ensure published posts are visible to everyone
DROP POLICY IF EXISTS "Anyone can view published blog posts" ON public.blog_posts;
CREATE POLICY "Anyone can view published blog posts" ON public.blog_posts FOR SELECT 
  USING (published = true);
CREATE POLICY "Admins view all blog posts" ON public.blog_posts FOR SELECT 
  TO authenticated USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'superadmin')));
CREATE POLICY "Admins manage blog posts" ON public.blog_posts FOR ALL TO authenticated 
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'superadmin')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'superadmin')));

-- 8. Update category policies to not depend on is_superadmin for anon
DROP POLICY IF EXISTS "Anyone can view blog categories" ON public.blog_categories;
DROP POLICY IF EXISTS "Admins manage categories" ON public.blog_categories;
CREATE POLICY "Anyone can view blog categories" ON public.blog_categories FOR SELECT USING (true);
CREATE POLICY "Admins manage categories" ON public.blog_categories FOR ALL TO authenticated 
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'superadmin')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'superadmin')));
