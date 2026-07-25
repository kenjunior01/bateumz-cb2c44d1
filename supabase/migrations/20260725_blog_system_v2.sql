-- Blog System V2 - Complete overhaul with SEO, views, social sharing, viral content
-- Safe migration: uses DO blocks to avoid errors if tables/functions already exist

DO $$ BEGIN
  -- 1. Blog Categories
  CREATE TABLE IF NOT EXISTS public.blog_categories (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    slug text NOT NULL UNIQUE,
    description text,
    color text DEFAULT '#6366f1',
    icon text DEFAULT 'newspaper',
    post_count int DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now()
  );
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

-- Add columns if they don't exist (safe for existing tables)
DO $$ BEGIN
  ALTER TABLE public.blog_categories ADD COLUMN IF NOT EXISTS color text DEFAULT '#6366f1';
  ALTER TABLE public.blog_categories ADD COLUMN IF NOT EXISTS icon text DEFAULT 'newspaper';
  ALTER TABLE public.blog_categories ADD COLUMN IF NOT EXISTS post_count int DEFAULT 0;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  -- 2. Blog Posts (enhanced)
  CREATE TABLE IF NOT EXISTS public.blog_posts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    slug text NOT NULL UNIQUE,
    content text NOT NULL DEFAULT '',
    summary text,
    image_url text,
    author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    category_id uuid REFERENCES public.blog_categories(id) ON DELETE SET NULL,
    region_id uuid,
    published boolean DEFAULT false,
    published_at timestamptz,
    source_url text,
    seo_title text,
    seo_description text,
    seo_keywords text[],
    view_count int DEFAULT 0,
    like_count int DEFAULT 0,
    share_count int DEFAULT 0,
    reading_time_min int DEFAULT 3,
    is_featured boolean DEFAULT false,
    is_trending boolean DEFAULT false,
    trending_score float DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  );
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

-- Add new columns to existing table if needed
DO $$ BEGIN
  ALTER TABLE public.blog_posts ADD COLUMN IF NOT EXISTS view_count int DEFAULT 0;
  ALTER TABLE public.blog_posts ADD COLUMN IF NOT EXISTS like_count int DEFAULT 0;
  ALTER TABLE public.blog_posts ADD COLUMN IF NOT EXISTS share_count int DEFAULT 0;
  ALTER TABLE public.blog_posts ADD COLUMN IF NOT EXISTS reading_time_min int DEFAULT 3;
  ALTER TABLE public.blog_posts ADD COLUMN IF NOT EXISTS is_featured boolean DEFAULT false;
  ALTER TABLE public.blog_posts ADD COLUMN IF NOT EXISTS is_trending boolean DEFAULT false;
  ALTER TABLE public.blog_posts ADD COLUMN IF NOT EXISTS trending_score float DEFAULT 0;
  ALTER TABLE public.blog_posts ADD COLUMN IF NOT EXISTS seo_title text;
  ALTER TABLE public.blog_posts ADD COLUMN IF NOT EXISTS seo_description text;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- RLS
ALTER TABLE public.blog_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies safely then recreate
DO $$ BEGIN
  DROP POLICY IF EXISTS "Anyone can view blog categories" ON public.blog_categories;
  DROP POLICY IF EXISTS "Anyone can view published blog posts" ON public.blog_posts;
  DROP POLICY IF EXISTS "Admins manage categories" ON public.blog_categories;
  DROP POLICY IF EXISTS "Admins manage blog posts" ON public.blog_posts;
END $$;

-- Blog Categories: anyone can read
CREATE POLICY "blog_categories_select" ON public.blog_categories
  FOR SELECT USING (true);

-- Blog Posts: anyone can read published posts
CREATE POLICY "blog_posts_select" ON public.blog_posts
  FOR SELECT USING (published = true);

-- Increment view count function (anonymously accessible)
CREATE OR REPLACE FUNCTION public.increment_blog_view(post_slug text)
RETURNS void AS $$
BEGIN
  UPDATE public.blog_posts
  SET view_count = COALESCE(view_count, 0) + 1,
      trending_score = (COALESCE(view_count, 0) + 1) * 0.3 + COALESCE(like_count, 0) * 0.5 + COALESCE(share_count, 0) * 0.8
  WHERE slug = post_slug AND published = true;
END;
$$ LANGUAGE sql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.increment_blog_view(text) TO anon, authenticated;

-- Increment like count function
CREATE OR REPLACE FUNCTION public.toggle_blog_like(post_slug text, user_id uuid)
RETURNS boolean AS $$
DECLARE
  already_liked boolean;
BEGIN
  SELECT EXISTS(SELECT 1 FROM public.blog_likes WHERE post_slug = post_slug AND user_id = user_id) INTO already_liked;
  
  IF already_liked THEN
    DELETE FROM public.blog_likes WHERE post_slug = post_slug AND user_id = user_id;
    UPDATE public.blog_posts SET like_count = GREATEST(COALESCE(like_count, 0) - 1, 0) WHERE slug = post_slug;
    RETURN false;
  ELSE
    INSERT INTO public.blog_likes (post_slug, user_id) VALUES (post_slug, user_id);
    UPDATE public.blog_posts SET like_count = COALESCE(like_count, 0) + 1 WHERE slug = post_slug;
    RETURN true;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.toggle_blog_like(text, uuid) TO anon, authenticated;

-- Blog Likes table
CREATE TABLE IF NOT EXISTS public.blog_likes (
  post_slug text NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_slug, user_id)
);

ALTER TABLE public.blog_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "blog_likes_select" ON public.blog_likes FOR SELECT USING (true);
CREATE POLICY "blog_likes_insert" ON public.blog_likes FOR INSERT WITH CHECK (true);
CREATE POLICY "blog_likes_delete" ON public.blog_likes FOR DELETE USING (true);

-- Update trending score trigger
CREATE OR REPLACE FUNCTION public.update_blog_trending()
RETURNS trigger AS $$
BEGIN
  NEW.trending_score = (COALESCE(NEW.view_count, 0) * 0.3) + 
                        (COALESCE(NEW.like_count, 0) * 0.5) + 
                        (COALESCE(NEW.share_count, 0) * 0.8);
  -- Posts from last 7 days get a boost
  IF NEW.published_at > now() - interval '7 days' THEN
    NEW.trending_score := NEW.trending_score * 2.0;
    NEW.is_trending := NEW.trending_score > 5;
  ELSE
    NEW.is_trending := false;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS blog_trending_trigger ON public.blog_posts;
CREATE TRIGGER blog_trending_trigger
  BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_blog_trending();

-- Updated_at trigger
DO $$ BEGIN
  CREATE OR REPLACE FUNCTION public.update_updated_at_column()
  RETURNS trigger AS $$
  BEGIN
    NEW.updated_at = now();
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DROP TRIGGER IF EXISTS update_blog_posts_updated_at ON public.blog_posts;
CREATE TRIGGER update_blog_posts_updated_at
  BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_blog_posts_published ON public.blog_posts(published, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON public.blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_trending ON public.blog_posts(trending_score DESC) WHERE published = true;
CREATE INDEX IF NOT EXISTS idx_blog_posts_featured ON public.blog_posts(is_featured) WHERE published = true;
CREATE INDEX IF NOT EXISTS idx_blog_posts_category ON public.blog_posts(category_id);

-- Seed categories with viral-focused topics
INSERT INTO public.blog_categories (name, slug, description, color, icon) VALUES
  ('Sorteios & Prêmios', 'sorteios-premios', 'Os maiores sorteios e prêmios do mundo, dicas para participar e histórias de ganhadores', '#6366f1', 'trophy'),
  ('Tecnologia & IA', 'tecnologia-ia', 'Inteligência artificial, inovações tech e o futuro da tecnologia', '#06b6d4', 'cpu'),
  ('Dicas & Estratégias', 'dicas-estrategias', 'Como aumentar suas chances, estratégias comprovadas e guias completos', '#10b981', 'lightbulb'),
  ('Viral & Entretenimento', 'viral-entretenimento', 'Tendências virais, desafios, memes e o que está bombando na internet', '#f59e0b', 'flame'),
  ('Jogos & Competições', 'jogos-competicoes', 'Novidades sobre jogos, campeonatos, e-sports e dicas de gaming', '#ef4444', 'gamepad-2'),
  ('Futebol & Esportes', 'futebol-esportes', 'Mundial 2026, futebol, resultados e análises esportivas', '#22c55e', 'goal'),
  ('Finanças & Dinheiro', 'financas-dinheiro', 'Economia, investimentos, criptomoedas e educação financeira', '#8b5cf6', 'dollar-sign'),
  ('Curiosidades', 'curiosidades', 'Fatos incríveis, listas, rankings e coisas que você não sabia', '#ec4899', 'sparkles')
ON CONFLICT (slug) DO NOTHING;

-- Seed some viral initial blog posts
INSERT INTO public.blog_posts (title, slug, content, summary, image_url, category_id, published, published_at, seo_title, seo_description, seo_keywords, is_featured, reading_time_min) VALUES
  (
    '10 Maiores Sorteios da História: Os Ganhadores que Mudaram de Vida',
    '10-maiores-sorteios-historia',
    '<h2>Os sorteios mais incríveis já realizados no mundo</h2><p>Desde os primeiros sorteios até os dias de hoje, milhares de pessoas tiveram suas vidas transformadas por um simples bilhete premiado. Conheça as histórias mais impressionantes.</p><h3>1. Mega Millions - $1.537 Bilhão (2018)</h3><p>O maior prêmio individual da história dos Estados Unidos foi ganho por um único bilhete comprado na Carolina do Sul. O ganhador escolheu permanecer anônimo e recebeu o pagamento em uma única parcela de aproximadamente $877 milhões.</p><h3>2. EuroMillions - €190 Milhões (2020)</h3><p>Um ganhador francês levou o recorde europeu com um bilhete que mudou completamente sua vida. O prêmio foi acumulado durante várias semanas sem vencedor.</p><h3>3. Powerball - $768 Milhões (2019)</h3><p>O terceiro maior prêmio da história dos EUA foi para um homem de Wisconsin que disse que quase não comprou o bilhete naquele dia.</p><h3>4. Sorteio da Lotofácil - R$ 304 Milhões (2025)</h3><p>O maior prêmio da história da Lotofácil brasileira foi ganho por um apostador de Belo Horizonte que fez um simples jogo de 15 números.</p><h3>5. EuroJackpot - €120 Milhões (2023)</h3><p>Um jogador da Finlândia conquistou o segundo maior prêmio do EuroJackpot, demonstrando que a sorte não tem fronteiras.</p><p>Continue participando de sorteios na <strong>Bateumz</strong> - sua vez pode ser a próxima!</p>',
    'Conheça as histórias dos maiores ganhadores de sorteios da história, desde o Mega Millions até a Lotofácil brasileira. São bilhões distribuídos que mudaram vidas completamente.',
    'https://images.unsplash.com/photo-1553729459-uj6fw5j4987?w=1200&h=630&fit=crop',
    (SELECT id FROM public.blog_categories WHERE slug = ''sorteios-premios'' LIMIT 1),
    true, now() - interval ''2 days'',
    '10 Maiores Sorteios da História | Bateumz Blog',
    'Descubra os 10 maiores sorteios da história do mundo. Bilhões em prêmios, histórias emocionantes de ganhadores e fatos que você não conhecia.',
    ARRAY['maiores sorteios', 'ganhadores de sorteio', 'mega millions', 'lotofácil', 'prêmios', 'sorteios history'],
    true, 5
  ),
  (
    'Como a Inteligência Artificial Está Revolucionando os Jogos Online em 2026',
    'ia-revolucionando-jogos-2026',
    '<h2>A IA está mudando a forma como jogamos</h2><p>O ano de 2026 marcou um ponto de virada na indústria de jogos online. A inteligência artificial não é mais apenas um recurso técnico - ela se tornou a espinha dorsal da experiência de jogo moderna.</p><h3>Adversários Inteligentes</h3><p>Os bots de IA evoluíram tremendousamente. Hoje, jogadores podem enfrentar oponentes virtuais que aprendem seus padrões de jogo e se adaptam em tempo real. Plataformas como a Bateumz já oferecem jogos onde você pode desafiar adversários de IA com diferentes níveis de dificuldade.</p><h3>Matchmaking Inteligente</h3><p>Algoritmos de IA conseguem parear jogadores de nível semelhante em milissegundos, garantindo partidas equilibradas e emocionantes para todos os participantes.</p><h3>Deteção de Trapaças</h3><p>Sistemas baseados em machine learning conseguem detectar comportamentos suspeitos com 99,7% de precisão, tornando os jogos online mais justos do que nunca.</p><h3>O Futuro</h3><p>Esperamos que até 2027, a maioria dos jogos online incorpore IA generativa para criar experiências únicas e personalizadas para cada jogador. A revolução apenas começou.</p>',
    'Descubra como a inteligência artificial está transformando os jogos online em 2026: adversários inteligentes, matchmaking perfeito e detecção de trapaças.',
    'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1200&h=630&fit=crop',
    (SELECT id FROM public.blog_categories WHERE slug = ''tecnologia-ia'' LIMIT 1),
    true, now() - interval ''1 day'',
    'IA nos Jogos Online 2026: Revolução Completa | Bateumz',
    'Como a inteligência artificial está revolucionando os jogos online em 2026. Adversários inteligentes, matchmaking e o futuro do gaming.',
    ARRAY['inteligência artificial', 'jogos online', 'IA gaming', 'bots inteligentes', 'tecnologia 2026'],
    true, 4
  ),
  (
    '5 Estratégias Comprovadas Para Aumentar Suas Chances em Sorteios',
    '5-estrategias-sortear',
    '<h2>Aumente suas chances de ganhar</h2><p>Todo mundo sonha em ganhar um sorteio, mas poucos sabem que existem estratégias reais que podem aumentar suas probabilidades. Não estamos falando de magia - são matemática e estatística aplicadas.</p><h3>1. Participe de Sorteios com Menos Concorrentes</h3><p>Sorteios menores têm menos participantes, o que significa chances matemáticas maiores. Um sorteio com 100 participantes dá 1% de chance, enquanto um com 10.000 dá apenas 0,01%.</p><h3>2. Comprate Bilhetes em Horários de Menos Tráfego</h3><p>Comprar bilhetes durante madrugadas ou dias de semana pode dar vantagem se o sorteio tiver limite de participantes.</p><h3>3. Diversifique Seus Sorteios</h3><p>Participar de 10 sorteios pequenos geralmente dá mais chance de ganhar pelo menos um do que colocar tudo em um único sorteio gigante.</p><h3>4. Fique Atento aos Prazos</h3><p>Muitas pessoas perdem oportunidades porque esquecem de participar antes do encerramento. Configure lembretes!</p><h3>5. Junte-se a Comunidades</h3><p>Grupos e comunidades frequentemente compartilham informações sobre sorteios com boas odds que a maioria das pessoas não conhece.</p>',
    'Aprenda 5 estratégias matemáticas e práticas para aumentar suas chances de ganhar sorteios online. Dicas comprovadas por especialistas.',
    'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=1200&h=630&fit=crop',
    (SELECT id FROM public.blog_categories WHERE slug = ''dicas-estrategias'' LIMIT 1),
    true, now() - interval ''3 days'',
    '5 Estratégias Para Ganhar Sorteios | Bateumz Blog',
    '5 estratégias comprovadas para aumentar suas chances em sorteios. Matemática, estatística e dicas práticas para ganhar mais.',
    ARRAY['estratégias sorteio', 'como ganhar sorteio', 'dicas sorteios online', 'aumentar chances'],
    true, 4
  ),
  (
    'Desafios Virais de 2026: Os Que Bombararam na Internet',
    'desafios-virais-2026',
    '<h2>Os desafios que dominaram as redes sociais em 2026</h2><p>Todo ano traz seus próprios fenômenos virais, e 2026 não foi diferente. Dos desafios mais engraçados aos mais absurdos, confira os que realmente bombararam.</p><h3>Challenge do Silêncio</h3><p>O desafio mais simples e viral do ano: ficar em silêncio absoluto por 24 horas enquanto câmeras gravam cada reação. Milhões de tentativas, quase ninguém conseguiu.</p><h3>Dance Battle AI vs Humano</h3><p>Pessoas desafiaram IAs generativas a duelos de dança, e os resultados foram hilários e impressionantes ao mesmo tempo.</p><h3>Sorteio ao Vivo</h3><p>O fenômeno de fazer sorteios ao vivo nas redes se tornou tão grande que plataformas como a Bateumz criaram sistemas completos para isso, com animações e interação em tempo real.</p><h3>O Que Vem por Aí?</h3><p>Experts apontam que os próximos desafios virais envolverão realidade aumentada e interação com IA, criando experiências nunca antes vistas.</p>',
    'Os desafios virais que dominaram a internet em 2026. Do Challenge do Silêncio ao Dance Battle IA, veja o que bombou este ano.',
    'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=1200&h=630&fit=crop',
    (SELECT id FROM public.blog_categories WHERE slug = ''viral-entretenimento'' LIMIT 1),
    true, now(),
    'Desafios Virais 2026: Os Que Bombaram | Bateumz Blog',
    'Descubra os desafios virais que bombaram na internet em 2026. Challenge do Silêncio, Dance Battle IA e muito mais.',
    ARRAY['desafios virais', 'trend 2026', 'viral internet', 'desafios redes sociais'],
    true, 3
  ),
  (
    'Jogos Contra IA: Como os Bots Estão Ficando Imparáveis',
    'jogos-contra-ia-bots-imparaveis',
    '<h2>A era dos jogos contra inteligência artificial</h2><p>Jogar contra outros humanos sempre foi a emoção principal dos games online. Mas em 2026, algo interessante aconteceu: os bots de IA se tornaram tão bons que muitos jogadores preferem enfrentá-los a jogar contra pessoas reais.</p><h3>Por Que os Bots Ficaram Tão Bons?</h3><p>Com o avanço dos modelos de linguagem e reinforcement learning, os bots de hoje não apenas seguem scripts pré-programados. Eles aprendem, adaptam e surpreendem. Um bot de Xadrez ou Jogo da Velha pode ter níveis de dificuldade que vão do iniciante ao grandmaster.</p><h3>Jogos Populares com Modo IA</h3><p>Plataformas como a Bateumz oferecem dezenas de jogos com modo contra IA: Pedra Papel Tesoura, Jogo da Velha, Liga 4, Cobrinha, e muitos mais. Cada jogo tem um bot que aprende seus padrões e oferece um desafio proporcional ao seu nível.</p><h3>O Futuro dos Jogos VS IA</h3><p>A tendência é que cada vez mais jogos ofereçam modos contra IA com personalidade - bots com estilo de jogo único, que conversam e reagem como verdadeiros oponentes.</p>',
    'Descubra como os bots de IA nos jogos online ficaram imparáveis em 2026 e por que jogar contra IA é a nova tendência do gaming.',
    'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200&h=630&fit=crop',
    (SELECT id FROM public.blog_categories WHERE slug = ''jogos-competicoes'' LIMIT 1),
    true, now() - interval ''12 hours'',
    'Jogos Contra IA: Bots Imparáveis | Bateumz Blog',
    'Como os bots de IA se tornaram imparáveis nos jogos online. Pedra Papel Tesoura, Jogo da Velha e o futuro do gaming contra IA.',
    ARRAY['jogos contra IA', 'bots inteligentes', 'gaming IA', 'jogos online bot', 'AI games 2026'],
    true, 4
  )
ON CONFLICT (slug) DO NOTHING;
