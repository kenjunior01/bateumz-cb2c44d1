import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Search,
  Eye,
  Clock,
  ArrowRight,
  MessageCircle,
  Twitter,
  Facebook,
  TrendingUp,
  Sparkles,
  BookOpen,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

interface BlogCategory {
  id: string;
  name: string;
  slug: string;
}

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  summary: string;
  image_url: string;
  published_at: string;
  view_count: number;
  category: BlogCategory;
}

const POSTS_PER_PAGE = 9;

function getReadingTime(content: string): number {
  if (!content) return 1;
  return Math.max(1, Math.ceil(content.length / 1000));
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getShareUrls(title: string, slug: string) {
  const url = encodeURIComponent(`${window.location.origin}/blog/${slug}`);
  const text = encodeURIComponent(title);
  return {
    whatsapp: `https://api.whatsapp.com/send?text=${text}+${url}`,
    twitter: `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
  };
}

function PostCardSkeleton() {
  return (
    <Card className="overflow-hidden border-border/50">
      <Skeleton className="aspect-video w-full" />
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-3/4" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
        <div className="flex items-center justify-between pt-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>
    </Card>
  );
}

function FeaturedCardSkeleton() {
  return (
    <Card className="overflow-hidden border-border/50">
      <div className="md:flex">
        <Skeleton className="md:w-1/2 aspect-video md:aspect-auto md:h-full min-h-[280px]" />
        <div className="md:w-1/2 p-6 md:p-8 space-y-4">
          <Skeleton className="h-6 w-28 rounded-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-3/4" />
          <div className="space-y-2 pt-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
          <div className="flex items-center gap-4 pt-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
          </div>
        </div>
      </div>
    </Card>
  );
}

function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-20 px-4"
    >
      <div className="relative mb-8">
        <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
          <BookOpen className="w-14 h-14 text-primary/50" />
        </div>
        <motion.div
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-2 -right-2"
        >
          <Sparkles className="w-6 h-6 text-yellow-500" />
        </motion.div>
      </div>
      <h3 className="text-xl font-bold text-foreground mb-2">Nenhum post encontrado</h3>
      <p className="text-muted-foreground text-center max-w-md mb-6">
        Ainda n\u00e3o h\u00e1 conte\u00fados publicados nesta categoria. Fique ligado, estamos preparando
        artigos incr\u00edveis para voc\u00ea!
      </p>
      <Link to="/">
        <Button variant="outline" className="gap-2">
          Voltar ao in\u00edcio
          <ArrowRight className="w-4 h-4" />
        </Button>
      </Link>
    </motion.div>
  );
}

function ShareButtons({ title, slug }: { title: string; slug: string }) {
  const urls = getShareUrls(title, slug);

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => window.open(urls.whatsapp, "_blank", "width=600,height=400")}
        className="p-1.5 rounded-full hover:bg-green-500/10 text-green-600 dark:text-green-400 transition-colors"
        aria-label="Compartilhar no WhatsApp"
      >
        <MessageCircle className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={() => window.open(urls.twitter, "_blank", "width=600,height=400")}
        className="p-1.5 rounded-full hover:bg-sky-500/10 text-sky-600 dark:text-sky-400 transition-colors"
        aria-label="Compartilhar no Twitter"
      >
        <Twitter className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={() => window.open(urls.facebook, "_blank", "width=600,height=400")}
        className="p-1.5 rounded-full hover:bg-blue-500/10 text-blue-600 dark:text-blue-400 transition-colors"
        aria-label="Compartilhar no Facebook"
      >
        <Facebook className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export default function Blog() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [visibleCount, setVisibleCount] = useState(POSTS_PER_PAGE);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // SEO
  useEffect(() => {
    document.title = "Blog - Bateumz | Conte\u00fado Viral, Sorteios e Novidades";
    setMetaDesc(
      "Descubra os melhores artigos sobre sorteios, pr\u00eamios, dicas e novidades. Conte\u00fado viral atualizado para voc\u00ea ficar por dentro de tudo!"
    );
  }, []);

  function setMetaDesc(desc: string) {
    let meta = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "description";
      document.head.appendChild(meta);
    }
    meta.content = desc;
  }

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any)
        .from("blog_categories")
        .select("id, name, slug")
        .order("name");
      if (data) setCategories(data);
    };
    fetchCategories();
  }, []);

  // Debounce search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchTerm]);

  // Fetch posts
  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true);
      setVisibleCount(POSTS_PER_PAGE);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (supabase as any)
        .from("blog_posts")
        .select(
          `id, title, slug, content, summary, image_url, published_at, view_count,
           category:blog_categories(id, name, slug)`
        )
        .eq("published", true)
        .order("published_at", { ascending: false });

      if (selectedCategory) {
        query = query.eq("category_id", selectedCategory);
      }

      const { data, error } = await query;
      if (!error && data) {
        setPosts(data as BlogPost[]);
      }
      setLoading(false);
    };
    fetchPosts();
  }, [selectedCategory]);

  // Filter by search
  const filteredPosts = debouncedSearch
    ? posts.filter(
        (p) =>
          p.title.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
          p.summary?.toLowerCase().includes(debouncedSearch.toLowerCase())
      )
    : posts;

  // Featured post (highest view_count > 0)
  const featuredPost =
    !debouncedSearch && !selectedCategory
      ? filteredPosts.reduce<BlogPost | null>((max, p) => {
          if (p.view_count > 0 && (!max || p.view_count > max.view_count)) return p;
          return max;
        }, null)
      : null;

  // Posts excluding featured
  const gridPosts = featuredPost
    ? filteredPosts.filter((p) => p.id !== featuredPost.id)
    : filteredPosts;

  // Pagination
  const displayedPosts = gridPosts.slice(0, visibleCount);
  const canLoadMore = visibleCount < gridPosts.length;

  const loadMore = async () => {
    setLoadingMore(true);
    await new Promise((r) => setTimeout(r, 400));
    setVisibleCount((prev) => prev + POSTS_PER_PAGE);
    setLoadingMore(false);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent" />
        <motion.div
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 0.15, scale: 1 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-gradient-to-br from-primary/30 to-purple-500/20 blur-3xl"
        />
        <motion.div
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 0.1, scale: 1 }}
          transition={{ duration: 1.5, ease: "easeOut", delay: 0.3 }}
          className="absolute -bottom-40 -left-40 w-[400px] h-[400px] rounded-full bg-gradient-to-tr from-orange-500/20 to-primary/10 blur-3xl"
        />
        <div className="relative container mx-auto px-4 pt-16 pb-12 md:pt-24 md:pb-16">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-3xl mx-auto"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-6"
            >
              <Sparkles className="w-4 h-4" />
              Conte\u00fado que viraliza
            </motion.div>
            <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tight mb-4 bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text">
              Blog
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              Descubra artigos imperd\u00edveis sobre sorteios, novidades, dicas exclusivas e
              conte\u00fados que todo mundo est\u00e1 compartilhando.
            </p>
          </motion.div>
        </div>
      </section>

      <main className="container mx-auto px-4 pb-20">
        {/* Search + Categories */}
        <div className="max-w-2xl mx-auto mb-10 space-y-6">
          {/* Search */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="relative"
          >
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar artigos..."
              className="pl-10 pr-10 h-11 bg-card border-border/50 focus-visible:ring-primary/30"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </motion.div>

          {/* Category Pills */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <ScrollArea className="w-full">
              <div className="flex items-center gap-2 pb-2">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200 ${
                    !selectedCategory
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                      : "bg-secondary/80 text-secondary-foreground hover:bg-secondary"
                  }`}
                >
                  Todos
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200 ${
                      selectedCategory === cat.id
                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                        : "bg-secondary/80 text-secondary-foreground hover:bg-secondary"
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </ScrollArea>
          </motion.div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="space-y-8">
            <FeaturedCardSkeleton />
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <PostCardSkeleton key={i} />
              ))}
            </div>
          </div>
        ) : filteredPosts.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-10">
            {/* Featured / Trending Post */}
            {featuredPost && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <Link to={`/blog/${featuredPost.slug}`} className="block group">
                  <Card className="overflow-hidden border-border/50 hover:border-primary/30 hover:shadow-2xl hover:shadow-primary/5 transition-all duration-500">
                    <div className="md:flex">
                      <div className="md:w-1/2 relative overflow-hidden">
                        <img
                          src={featuredPost.image_url || "/placeholder.svg"}
                          alt={featuredPost.title}
                          className="w-full h-full object-cover aspect-video md:aspect-auto md:min-h-[320px] group-hover:scale-105 transition-transform duration-700"
                        />
                        <div className="absolute top-4 left-4">
                          <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white border-none shadow-lg gap-1">
                            <TrendingUp className="w-3 h-3" />
                            Em Alta
                          </Badge>
                        </div>
                      </div>
                      <div className="md:w-1/2 p-6 md:p-8 flex flex-col justify-center">
                        <Badge
                          variant="secondary"
                          className="w-fit bg-primary/10 text-primary border-none mb-4"
                        >
                          {featuredPost.category?.name || "Geral"}
                        </Badge>
                        <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight mb-3 group-hover:text-primary transition-colors line-clamp-2">
                          {featuredPost.title}
                        </h2>
                        <p className="text-muted-foreground text-sm md:text-base line-clamp-3 mb-6">
                          {featuredPost.summary}
                        </p>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1.5">
                            <Clock className="w-4 h-4" />
                            {getReadingTime(featuredPost.content)} min de leitura
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Eye className="w-4 h-4" />
                            {featuredPost.view_count.toLocaleString("pt-BR")} visualiza\u00e7\u00f5es
                          </span>
                          <span>{formatDate(featuredPost.published_at)}</span>
                        </div>
                        <div className="mt-6 flex items-center justify-between">
                          <span className="inline-flex items-center gap-1 text-primary font-bold text-sm group-hover:gap-2 transition-all">
                            Ler mais
                            <ArrowRight className="w-4 h-4" />
                          </span>
                          <ShareButtons title={featuredPost.title} slug={featuredPost.slug} />
                        </div>
                      </div>
                    </div>
                  </Card>
                </Link>
              </motion.div>
            )}

            {/* Post Grid */}
            <AnimatePresence mode="popLayout">
              <motion.div layout className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {displayedPosts.map((post, index) => (
                  <motion.div
                    key={post.id}
                    layout
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{
                      duration: 0.4,
                      delay: Math.min(index * 0.06, 0.3),
                      layout: { duration: 0.3 },
                    }}
                  >
                    <Link to={`/blog/${post.slug}`} className="block group h-full">
                      <Card className="h-full overflow-hidden border-border/50 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 transition-all duration-500">
                        <div className="relative overflow-hidden">
                          <img
                            src={post.image_url || "/placeholder.svg"}
                            alt={post.title}
                            className="w-full aspect-video object-cover group-hover:scale-105 transition-transform duration-700"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        </div>
                        <div className="p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <Badge
                              variant="secondary"
                              className="bg-primary/10 text-primary border-none text-xs"
                            >
                              {post.category?.name || "Geral"}
                            </Badge>
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="w-3 h-3" />
                              {getReadingTime(post.content)} min
                            </span>
                          </div>
                          <h3 className="font-bold text-lg leading-snug group-hover:text-primary transition-colors line-clamp-2">
                            {post.title}
                          </h3>
                          <p className="text-sm text-muted-foreground line-clamp-3">
                            {post.summary}
                          </p>
                          <div className="flex items-center justify-between pt-2 border-t border-border/50">
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Eye className="w-3 h-3" />
                                {post.view_count.toLocaleString("pt-BR")}
                              </span>
                              <span>{formatDate(post.published_at)}</span>
                            </div>
                            <ShareButtons title={post.title} slug={post.slug} />
                          </div>
                          <div className="flex items-center gap-1 text-primary font-semibold text-sm">
                            Ler mais
                            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                          </div>
                        </div>
                      </Card>
                    </Link>
                  </motion.div>
                ))}
              </motion.div>
            </AnimatePresence>

            {/* Load More */}
            {canLoadMore && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex justify-center pt-6"
              >
                <Button
                  onClick={loadMore}
                  disabled={loadingMore}
                  size="lg"
                  variant="outline"
                  className="gap-2 px-8 font-semibold"
                >
                  {loadingMore ? (
                    <>
                      <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                      Carregando...
                    </>
                  ) : (
                    <>
                      Carregar mais
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </motion.div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
