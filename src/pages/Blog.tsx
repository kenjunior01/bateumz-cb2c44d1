import { useEffect, useState, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useRegionalTheme } from '@/contexts/RegionalThemeContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Flame,
  Star,
  Eye,
  Heart,
  Share2,
  Clock,
  Calendar,
  ArrowRight,
  ChevronRight,
  TrendingUp,
  BookOpen,
  Newspaper,
  AlertCircle,
  Loader2,
  Sparkles,
  Zap,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface BlogCategory {
  id: string;
  name: string;
  slug: string;
  color?: string | null;
  icon?: string | null;
}

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  summary: string;
  image_url: string;
  published_at: string;
  seo_keywords?: string[] | null;
  view_count: number;
  like_count: number;
  share_count: number;
  reading_time_min: number;
  is_featured: boolean;
  is_trending: boolean;
  trending_score: number;
  category: BlogCategory | null;
}

const PAGE_SIZE = 9;
const CANONICAL = 'https://bateu.online/blog';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

/* ------------------------------------------------------------------ */
/*  Skeleton Card                                                      */
/* ------------------------------------------------------------------ */

function PostCardSkeleton() {
  return (
    <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
      <Skeleton className="aspect-video w-full rounded-none" />
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-4 w-16" />
        </div>
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <div className="flex gap-4 pt-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-14" />
          <Skeleton className="h-4 w-12" />
        </div>
      </div>
    </div>
  );
}

function FeaturedSkeleton() {
  return (
    <div className="relative rounded-3xl overflow-hidden h-[320px] md:h-[420px] w-full">
      <Skeleton className="absolute inset-0 rounded-none" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10 space-y-3">
        <Skeleton className="h-6 w-24 rounded-full" />
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-6 w-1/2" />
        <Skeleton className="h-4 w-1/3" />
      </div>
    </div>
  );
}

function TrendingCardSkeleton() {
  return (
    <div className="flex-shrink-0 w-[280px] md:w-[320px] rounded-2xl border border-border/50 bg-card overflow-hidden">
      <Skeleton className="aspect-[16/10] w-full rounded-none" />
      <div className="p-3 space-y-2">
        <Skeleton className="h-4 w-16 rounded-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Post Card                                                          */
/* ------------------------------------------------------------------ */

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.45, ease: 'easeOut' },
  }),
};

function PostCard({ post, index }: { post: BlogPost; index: number }) {
  const catColor = post.category?.color || 'hsl(var(--primary))';

  return (
    <motion.div
      custom={index}
      variants={cardVariants as any}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.15 }}
    >
      <Link to={`/blog/${post.slug}`} className="block group">
        <Card className="h-full overflow-hidden border-border/50 bg-card hover:shadow-2xl hover:shadow-primary/5 transition-all duration-500 group-hover:-translate-y-1 rounded-2xl">
          <div className="relative aspect-video overflow-hidden">
            <img
              src={post.image_url || '/placeholder.svg'}
              alt={post.title}
              loading="lazy"
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            <div className="absolute top-3 left-3 flex gap-1.5">
              {post.is_trending && (
                <Badge className="bg-orange-500 text-white border-none gap-1 text-[10px] font-bold shadow-lg">
                  <Flame className="h-3 w-3" />
                  Em Alta
                </Badge>
              )}
              {post.is_featured && (
                <Badge className="bg-amber-400 text-black border-none gap-1 text-[10px] font-bold shadow-lg">
                  <Star className="h-3 w-3" />
                  Destaque
                </Badge>
              )}
            </div>
          </div>

          <CardContent className="p-4 flex flex-col gap-2.5">
            <div className="flex items-center justify-between gap-2">
              <Badge
                variant="secondary"
                className="text-[10px] font-semibold px-2 py-0.5 rounded-full border-none"
                style={{
                  backgroundColor: `${catColor}18`,
                  color: catColor,
                }}
              >
                {post.category?.icon && <span className="mr-1">{post.category.icon}</span>}
                {post.category?.name || 'Geral'}
              </Badge>
              <span className="text-[11px] text-muted-foreground flex items-center gap-1 whitespace-nowrap">
                <Calendar className="h-3 w-3" />
                {formatDate(post.published_at)}
              </span>
            </div>

            <h3 className="font-bold text-base leading-snug line-clamp-2 group-hover:text-primary transition-colors">
              {post.title}
            </h3>

            <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
              {post.summary}
            </p>

            <div className="flex items-center gap-3 text-[11px] text-muted-foreground pt-1 border-t border-border/30">
              <span className="flex items-center gap-1" title="Tempo de leitura">
                <Clock className="h-3 w-3" />
                {post.reading_time_min || 3} min
              </span>
              <span className="flex items-center gap-1" title="Visualizações">
                <Eye className="h-3 w-3" />
                {formatCount(post.view_count || 0)}
              </span>
              <span className="flex items-center gap-1" title="Curtidas">
                <Heart className="h-3 w-3" />
                {formatCount(post.like_count || 0)}
              </span>
              <span className="flex items-center gap-1" title="Compartilhamentos">
                <Share2 className="h-3 w-3" />
                {formatCount(post.share_count || 0)}
              </span>
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Blog Component                                                     */
/* ------------------------------------------------------------------ */

export default function Blog() {
  const { region } = useRegionalTheme();

  /* ---------- state ---------- */
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [trendingPosts, setTrendingPosts] = useState<BlogPost[]>([]);
  const [featuredPost, setFeaturedPost] = useState<BlogPost | null>(null);

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [hasMore, setHasMore] = useState(false);

  /* ---------- data fetching ---------- */
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Categorias
      const { data: catData } = await (supabase as any)
        .from('blog_categories')
        .select('*')
        .order('name');
      setCategories((catData as BlogCategory[]) || []);

      // Posts principais
      let postQuery = (supabase as any)
        .from('blog_posts')
        .select(
          `id, title, slug, summary, image_url, published_at, seo_keywords, view_count, like_count, share_count, reading_time_min, is_featured, is_trending, trending_score, category:blog_categories(name, slug, color, icon)`
        )
        .eq('published', true);

      if (region) {
        postQuery = postQuery.or(
          `region_id.eq.${region.id},region_id.is.null`
        );
      }

      const { data: postData, error: postErr } = await postQuery.order(
        'published_at',
        { ascending: false }
      );
      if (postErr) throw postErr;
      setPosts((postData as BlogPost[]) || []);

      // Posts em alta
      let trendQuery = (supabase as any)
        .from('blog_posts')
        .select(
          `id, title, slug, summary, image_url, published_at, seo_keywords, view_count, like_count, share_count, reading_time_min, is_featured, is_trending, trending_score, category:blog_categories(name, slug, color, icon)`
        )
        .eq('published', true)
        .eq('is_trending', true);

      if (region) {
        trendQuery = trendQuery.or(
          `region_id.eq.${region.id},region_id.is.null`
        );
      }

      const { data: trendData } = await trendQuery
        .order('trending_score', { ascending: false })
        .limit(5);
      setTrendingPosts((trendData as BlogPost[]) || []);

      // Post destaque
      let featQuery = (supabase as any)
        .from('blog_posts')
        .select(
          `id, title, slug, summary, image_url, published_at, seo_keywords, view_count, like_count, share_count, reading_time_min, is_featured, is_trending, trending_score, category:blog_categories(name, slug, color, icon)`
        )
        .eq('published', true)
        .eq('is_featured', true);

      if (region) {
        featQuery = featQuery.or(
          `region_id.eq.${region.id},region_id.is.null`
        );
      }

      const { data: featData } = await featQuery
        .order('published_at', { ascending: false })
        .limit(1)
        .single();
      setFeaturedPost((featData as BlogPost) || null);
    } catch (err: any) {
      console.error('Erro ao carregar blog:', err);
      setError('Não foi possível carregar os posts. Tente novamente mais tarde.');
    } finally {
      setLoading(false);
    }
  }, [region]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ---------- filtering ---------- */
  const filteredPosts = useMemo(() => {
    let result = posts;

    // Remover o post destaque da listagem principal para evitar duplicidade
    if (featuredPost) {
      result = result.filter((p) => p.id !== featuredPost.id);
    }

    // Filtro por categoria
    if (activeCategory) {
      result = result.filter((p) => p.category?.slug === activeCategory);
    }

    // Filtro por busca
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(term) ||
          p.summary.toLowerCase().includes(term) ||
          p.seo_keywords?.some((k: string) => k.toLowerCase().includes(term))
      );
    }

    return result;
  }, [posts, activeCategory, searchTerm, featuredPost]);

  const visiblePosts = useMemo(
    () => filteredPosts.slice(0, visibleCount),
    [filteredPosts, visibleCount]
  );

  useEffect(() => {
    setHasMore(visibleCount < filteredPosts.length);
  }, [visibleCount, filteredPosts.length]);

  // Resetar contagem ao mudar filtros
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [activeCategory, searchTerm]);

  const handleLoadMore = () => {
    setLoadingMore(true);
    setTimeout(() => {
      setVisibleCount((prev) => prev + PAGE_SIZE);
      setLoadingMore(false);
    }, 400);
  };

  /* ---------- render ---------- */
  return (
    <>
      <Helmet>
        <title>Blog – Bateu Online | Notícias, Dicas e Sorteios</title>
        <meta
          name="description"
          content="Fique por dentro das últimas novidades sobre sorteios online, dicas de participação, resultados e muito mais no blog do Bateu Online."
        />
        <link rel="canonical" href={CANONICAL} />
        <meta property="og:title" content="Blog – Bateu Online | Notícias e Sorteios" />
        <meta
          property="og:description"
          content="Descubra dicas, resultados e novidades sobre sorteios online no maior blog de sorteios do Brasil."
        />
        <meta property="og:url" content={CANONICAL} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Bateu Online" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta
          name="twitter:title"
          content="Blog – Bateu Online | Notícias e Sorteios"
        />
        <meta
          name="twitter:description"
          content="Descubra dicas, resultados e novidades sobre sorteios online."
        />
      </Helmet>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: "Blog Bateu - Dicas, Novidades e Conteudo Viral",
            description: "Descubra dicas, resultados e novidades sobre sorteios online, jogos e muito mais.",
            url: `${window.location.origin}/blog`,
            publisher: {
              "@type": "Organization",
              name: "Bateu",
              url: window.location.origin,
            },
          }),
        }}
      />

      <div className="min-h-screen bg-background">
        <section className="relative overflow-hidden">
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(280 80% 60%) 25%, hsl(340 85% 55%) 50%, hsl(45 95% 55%) 75%, hsl(var(--primary)) 100%)',
              backgroundSize: '400% 400%',
              animation: 'gradientShift 12s ease infinite',
            }}
          />
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 bg-white/20 rounded-full"
                style={{
                  left: `${15 + i * 14}%`,
                  top: `${20 + (i % 3) * 25}%`,
                }}
                animate={{
                  y: [0, -20, 0],
                  opacity: [0.2, 0.6, 0.2],
                  scale: [1, 1.3, 1],
                }}
                transition={{
                  duration: 3 + i * 0.5,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: i * 0.4,
                }}
              />
            ))}
          </div>

          <div className="relative z-10 container mx-auto px-4 pt-28 pb-16 md:pt-36 md:pb-24 text-center">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <Badge
                variant="outline"
                className="border-white/30 text-white/90 mb-4 text-xs font-semibold px-3 py-1 backdrop-blur-sm bg-white/10"
              >
                <Newspaper className="h-3 w-3 mr-1.5" />
                Blog Bateu Online
              </Badge>
            </motion.div>

            <motion.h1
              className="text-4xl md:text-5xl lg:text-6xl font-black text-white mb-4 tracking-tight"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15 }}
            >
              Novidades, Dicas e{' '}
              <span className="bg-gradient-to-r from-yellow-300 via-orange-300 to-pink-400 bg-clip-text text-transparent">
                Sorteios
              </span>
            </motion.h1>

            <motion.p
              className="text-white/70 text-base md:text-lg max-w-xl mx-auto mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              Fique por dentro das últimas novidades sobre sorteios, tecnologia, dicas de
              participação e muito mais.
            </motion.p>

            <motion.div
              className="max-w-lg mx-auto relative"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.45 }}
            >
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar no blog..."
                className="pl-11 h-12 rounded-full bg-white/95 backdrop-blur-sm border-0 shadow-2xl shadow-black/20 text-foreground placeholder:text-muted-foreground/60 focus-visible:ring-2 focus-visible:ring-primary/50"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </motion.div>
          </div>

          <div className="absolute bottom-0 left-0 right-0">
            <svg
              viewBox="0 0 1440 60"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-full"
            >
              <path
                d="M0 60L1440 60L1440 0C1440 0 1080 50 720 50C360 50 0 0 0 0L0 60Z"
                fill="hsl(var(--background))"
              />
            </svg>
          </div>
        </section>

        <div className="container mx-auto px-4 pb-20">
          {!loading && categories.length > 0 && (
            <motion.section
              className="mb-10 -mt-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none -mx-4 px-4 md:mx-0 md:px-0">
                <button
                  onClick={() => setActiveCategory(null)}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                    !activeCategory
                      ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25'
                      : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <BookOpen className="h-3.5 w-3.5" />
                  Todas
                </button>
                {categories.map((cat) => {
                  const isActive = activeCategory === cat.slug;
                  const dotColor = cat.color || 'hsl(var(--primary))';
                  return (
                    <button
                      key={cat.id}
                      onClick={() =>
                        setActiveCategory(isActive ? null : cat.slug)
                      }
                      className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 border ${
                        isActive
                          ? 'border-transparent shadow-lg'
                          : 'bg-card border-border/50 text-muted-foreground hover:border-border hover:text-foreground'
                      }`}
                      style={
                        isActive
                          ? {
                              backgroundColor: dotColor,
                              color: '#fff',
                              boxShadow: `0 4px 14px ${dotColor}40`,
                            }
                          : undefined
                      }
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: dotColor }}
                      />
                      {cat.icon && <span>{cat.icon}</span>}
                      {cat.name}
                    </button>
                  );
                })}
              </div>
            </motion.section>
          )}

          {error && !loading && (
            <motion.div
              className="text-center py-20"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-destructive/10 mb-6">
                <AlertCircle className="h-10 w-10 text-destructive" />
              </div>
              <h3 className="text-xl font-bold mb-2">Ops! Algo deu errado</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">{error}</p>
              <Button onClick={fetchData} variant="outline" size="lg">
                <Loader2 className="h-4 w-4 mr-2" />
                Tentar novamente
              </Button>
            </motion.div>
          )}

          {loading && !error && (
            <div className="space-y-12">
              <FeaturedSkeleton />
              <div>
                <Skeleton className="h-7 w-36 mb-5 rounded-full" />
                <div className="flex gap-4 overflow-hidden">
                  {[...Array(3)].map((_, i) => (
                    <TrendingCardSkeleton key={i} />
                  ))}
                </div>
              </div>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {[...Array(6)].map((_, i) => (
                  <PostCardSkeleton key={i} />
                ))}
              </div>
            </div>
          )}

          {!loading && !error && (
            <div className="space-y-14">
              <AnimatePresence>
                {featuredPost && (
                  <motion.section
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                  >
                    <div className="flex items-center gap-2 mb-4">
                      <Sparkles className="h-5 w-5 text-amber-400" />
                      <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                        Post em Destaque
                      </h2>
                    </div>
                    <Link to={`/blog/${featuredPost.slug}`} className="block group">
                      <div className="relative rounded-3xl overflow-hidden h-[320px] md:h-[440px] w-full">
                        <img
                          src={featuredPost.image_url || '/placeholder.svg'}
                          alt={featuredPost.title}
                          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/10" />
                        <div className="absolute top-4 left-4 flex gap-2">
                          <Badge className="bg-amber-400 text-black border-none gap-1 font-bold shadow-lg">
                            <Star className="h-3 w-3" />
                            Destaque
                          </Badge>
                          {featuredPost.is_trending && (
                            <Badge className="bg-orange-500 text-white border-none gap-1 font-bold shadow-lg">
                              <Flame className="h-3 w-3" />
                              Em Alta
                            </Badge>
                          )}
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10">
                          <Badge
                            variant="secondary"
                            className="mb-3 text-xs font-semibold border-none"
                            style={{
                              backgroundColor: `${featuredPost.category?.color || 'hsl(var(--primary))'}30`,
                              color: featuredPost.category?.color || 'hsl(var(--primary))',
                            }}
                          >
                            {featuredPost.category?.icon && (
                              <span className="mr-1">{featuredPost.category.icon}</span>
                            )}
                            {featuredPost.category?.name || 'Geral'}
                          </Badge>
                          <h2 className="text-2xl md:text-4xl font-black text-white mb-3 leading-tight max-w-2xl group-hover:text-yellow-200 transition-colors">
                            {featuredPost.title}
                          </h2>
                          <p className="text-white/70 text-sm md:text-base line-clamp-2 max-w-xl mb-4">
                            {featuredPost.summary}
                          </p>
                          <div className="flex items-center gap-4 text-white/60 text-xs">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(featuredPost.published_at)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {featuredPost.reading_time_min || 3} min de leitura
                            </span>
                            <span className="flex items-center gap-1">
                              <Eye className="h-3 w-3" />
                              {formatCount(featuredPost.view_count || 0)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Heart className="h-3 w-3" />
                              {formatCount(featuredPost.like_count || 0)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </motion.section>
                )}
              </AnimatePresence>

              {trendingPosts.length > 0 && (
                <motion.section
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5 }}
                >
                  <div className="flex items-center gap-2 mb-5">
                    <Flame className="h-5 w-5 text-orange-500" />
                    <h2 className="text-lg font-bold">Em Alta</h2>
                    <Badge variant="outline" className="text-orange-500 border-orange-300 text-[10px]">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      Trending
                    </Badge>
                  </div>

                  <div className="flex gap-4 overflow-x-auto pb-3 scrollbar-none -mx-4 px-4 md:mx-0 md:px-0 snap-x snap-mandatory">
                    {trendingPosts.map((post, i) => {
                      const catColor = post.category?.color || 'hsl(var(--primary))';
                      return (
                        <motion.div
                          key={post.id}
                          className="flex-shrink-0 w-[280px] md:w-[320px] snap-start"
                          initial={{ opacity: 0, x: 40 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          viewport={{ once: true }}
                          transition={{ delay: i * 0.1, duration: 0.45 }}
                        >
                          <Link to={`/blog/${post.slug}`} className="block group">
                            <Card className="overflow-hidden border-border/50 hover:shadow-xl hover:shadow-orange-500/5 transition-all duration-300 group-hover:-translate-y-1 rounded-2xl h-full">
                              <div className="relative aspect-[16/10] overflow-hidden">
                                <img
                                  src={post.image_url || '/placeholder.svg'}
                                  alt={post.title}
                                  loading="lazy"
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                />
                                <div className="absolute top-2 left-2">
                                  <Badge className="bg-orange-500 text-white border-none gap-1 text-[10px] font-bold shadow-lg">
                                    🔥 Em Alta
                                  </Badge>
                                </div>
                              </div>
                              <CardContent className="p-3.5">
                                <div className="flex items-center gap-2 mb-1.5">
                                  <span
                                    className="w-2 h-2 rounded-full"
                                    style={{ backgroundColor: catColor }}
                                  />
                                  <span className="text-[11px] font-semibold" style={{ color: catColor }}>
                                    {post.category?.name || 'Geral'}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground ml-auto flex items-center gap-0.5">
                                    <Eye className="h-2.5 w-2.5" />
                                    {formatCount(post.view_count || 0)}
                                  </span>
                                </div>
                                <h4 className="font-bold text-sm line-clamp-2 leading-snug group-hover:text-primary transition-colors">
                                  {post.title}
                                </h4>
                                <div className="flex items-center gap-2 mt-2 text-[10px] text-muted-foreground">
                                  <span className="flex items-center gap-0.5">
                                    <Clock className="h-2.5 w-2.5" />
                                    {post.reading_time_min || 3} min
                                  </span>
                                  <span>•</span>
                                  <span>{formatDate(post.published_at)}</span>
                                </div>
                              </CardContent>
                            </Card>
                          </Link>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.section>
              )}

              <section>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-bold flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-primary" />
                    {activeCategory
                      ? categories.find((c) => c.slug === activeCategory)?.name || 'Todos os Posts'
                      : 'Todos os Posts'}
                  </h2>
                  <span className="text-sm text-muted-foreground">
                    {filteredPosts.length}{' '}
                    {filteredPosts.length === 1 ? 'artigo' : 'artigos'}
                  </span>
                </div>

                {filteredPosts.length === 0 ? (
                  /* ---- Empty state ---- */
                  <motion.div
                    className="text-center py-20"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                  >
                    <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-muted/50 mb-6">
                      <Newspaper className="h-12 w-12 text-muted-foreground/40" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">Nenhum artigo encontrado</h3>
                    <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                      {searchTerm
                        ? `Não encontramos resultados para "${searchTerm}". Tente buscar por outros termos.`
                        : 'Ainda não há posts nesta categoria. Volte em breve para conferir novidades!'}
                    </p>
                    {(searchTerm || activeCategory) && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSearchTerm('');
                          setActiveCategory(null);
                        }}
                      >
                        <BookOpen className="h-4 w-4 mr-2" />
                        Ver todos os posts
                      </Button>
                    )}
                  </motion.div>
                ) : (
                  <>
                    <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 space-y-6">
                      {visiblePosts.map((post, i) => (
                        <div key={post.id} className="break-inside-avoid">
                          <PostCard post={post} index={i} />
                        </div>
                      ))}
                    </div>

                    {hasMore && (
                      <div className="flex justify-center mt-12">
                        <Button
                          variant="outline"
                          size="lg"
                          onClick={handleLoadMore}
                          disabled={loadingMore}
                          className="rounded-full px-8 font-semibold hover:bg-primary hover:text-primary-foreground transition-all duration-300"
                        >
                          {loadingMore ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Carregando...
                            </>
                          ) : (
                            <>
                              Carregar mais artigos
                              <ChevronRight className="h-4 w-4 ml-1" />
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </section>

              <motion.section
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.6 }}
              >
                <Link to="/marketplace" className="block group">
                  <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/90 via-primary to-primary/70 p-8 md:p-12">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

                    <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                      <div className="text-center md:text-left">
                        <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-full px-4 py-1.5 mb-4">
                          <Zap className="h-4 w-4 text-yellow-300" />
                          <span className="text-sm font-semibold text-white/90">
                            Não perca nenhuma chance!
                          </span>
                        </div>
                        <h3 className="text-2xl md:text-3xl font-black text-white mb-2">
                          Participe dos Sorteios
                        </h3>
                        <p className="text-white/70 max-w-md">
                          Milhares de prêmios estão esperando por você. Acesse nosso marketplace e
                          concorra agora mesmo!
                        </p>
                      </div>
                      <Button
                        size="lg"
                        className="rounded-full bg-white text-primary font-bold hover:bg-white/90 shadow-2xl shadow-black/20 px-8 py-6 text-base group-hover:scale-105 transition-transform duration-300"
                      >
                        Ver Sorteios
                        <ArrowRight className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </div>
                  </div>
                </Link>
              </motion.section>
            </div>
          )}
        </div>

        <style>{`
          @keyframes gradientShift {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
          .scrollbar-none {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
          .scrollbar-none::-webkit-scrollbar {
            display: none;
          }
        `}</style>
      </div>
    </>
  );
}
