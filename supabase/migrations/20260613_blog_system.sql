-- Blog System Tables
-- This migration adds support for a full blog system with categories and automated posts

-- 1. Blog Categories
CREATE TABLE IF NOT EXISTS public.blog_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.blog_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view blog categories" ON public.blog_categories FOR SELECT USING (true);
CREATE POLICY "Admins manage categories" ON public.blog_categories FOR ALL TO authenticated 
  USING (public.is_superadmin(auth.uid())) WITH CHECK (public.is_superadmin(auth.uid()));

-- 2. Blog Posts
CREATE TABLE IF NOT EXISTS public.blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  content text NOT NULL,
  summary text,
  image_url text,
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  category_id uuid REFERENCES public.blog_categories(id) ON DELETE SET NULL,
  region_id uuid REFERENCES public.regions(id) ON DELETE CASCADE,
  published boolean DEFAULT false,
  published_at timestamptz,
  source_url text, -- To track original news source
  seo_keywords text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view published blog posts" ON public.blog_posts FOR SELECT 
  USING (published = true OR public.is_superadmin(auth.uid()));
CREATE POLICY "Admins manage blog posts" ON public.blog_posts FOR ALL TO authenticated 
  USING (public.is_superadmin(auth.uid())) WITH CHECK (public.is_superadmin(auth.uid()));

CREATE INDEX idx_blog_posts_published ON public.blog_posts(published, published_at DESC);
CREATE INDEX idx_blog_posts_slug ON public.blog_posts(slug);
CREATE INDEX idx_blog_posts_region ON public.blog_posts(region_id);

-- 3. Trigger for updated_at
CREATE TRIGGER update_blog_posts_updated_at BEFORE UPDATE ON public.blog_posts 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed some initial categories
INSERT INTO public.blog_categories (name, slug, description) VALUES
('Sorteios & Prêmios', 'sorteios-premios', 'Notícias sobre os maiores sorteios e prêmios do mundo'),
('Tecnologia & Inovação', 'tecnologia-inovacao', 'As últimas novidades do mundo tech'),
('Dicas & Estratégias', 'dicas-estrategias', 'Como aumentar suas chances de ganhar')
ON CONFLICT (slug) DO NOTHING;
