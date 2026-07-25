import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import {
  ArrowLeft,
  Calendar,
  Eye,
  Clock,
  Tag,
  MessageCircle,
  Twitter,
  Facebook,
  Linkedin,
  Copy,
  Check,
  Mail,
  TrendingUp,
  Sparkles,
  Gift,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

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
  seo_keywords: string[];
  category: BlogCategory;
}

function getReadingTime(content: string): number {
  if (!content) return 1;
  return Math.max(1, Math.ceil(content.length / 1000));
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function setMetaTag(attr: string, key: string, content: string) {
  let el = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function removeMetaTag(attr: string, key: string) {
  const el = document.querySelector(`meta[${attr}="${key}"]`);
  if (el) el.remove();
}

export default function BlogPostDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [relatedPosts, setRelatedPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [copied, setCopied] = useState(false);
  const [email, setEmail] = useState("");

  const postUrl = typeof window !== "undefined" ? window.location.href : "";

  // Load post
  useEffect(() => {
    const loadPost = async () => {
      setLoading(true);
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase as any)
          .from("blog_posts")
          .select(
            `id, title, slug, content, summary, image_url, published_at, view_count, seo_keywords,
             category:blog_categories(id, name, slug)`
          )
          .eq("slug", slug)
          .eq("published", true)
          .single();

        if (error) throw error;
        setPost(data as BlogPost);

        // Increment view count
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any).rpc("increment_blog_view", { post_id: slug });

        // Update view count locally
        setPost((prev) => (prev ? { ...prev, view_count: (prev.view_count || 0) + 1 } : prev));

        // Fetch related posts
        if (data.category_id) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: related } = await (supabase as any)
            .from("blog_posts")
            .select(
              `id, title, slug, summary, image_url, published_at, view_count,
               category:blog_categories(id, name, slug)`
            )
            .eq("published", true)
            .eq("category_id", data.category_id)
            .neq("id", data.id)
            .order("view_count", { ascending: false })
            .limit(3);
          if (related) setRelatedPosts(related as BlogPost[]);
        }
      } catch (error) {
        console.error("Error loading post:", error);
        toast.error("Post n\u00e3o encontrado.");
        navigate("/blog");
      } finally {
        setLoading(false);
      }
    };
    loadPost();
  }, [slug, navigate]);

  // SEO meta tags
  useEffect(() => {
    if (!post) return;

    document.title = `${post.title} - Blog Bateumz`;

    setMetaTag("name", "description", post.summary || post.title);
    setMetaTag("property", "og:title", post.title);
    setMetaTag("property", "og:description", post.summary || post.title);
    setMetaTag("property", "og:image", post.image_url || "");
    setMetaTag("property", "og:type", "article");
    setMetaTag("property", "og:url", postUrl);
    setMetaTag("name", "twitter:card", "summary_large_image");
    setMetaTag("name", "twitter:title", post.title);
    setMetaTag("name", "twitter:description", post.summary || post.title);
    if (post.image_url) {
      setMetaTag("name", "twitter:image", post.image_url);
    }

    // JSON-LD structured data
    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: post.title,
      description: post.summary || post.title,
      image: post.image_url || "",
      url: postUrl,
      datePublished: post.published_at,
      author: {
        "@type": "Organization",
        name: "Bateumz",
      },
      publisher: {
        "@type": "Organization",
        name: "Bateumz",
      },
    };

    let scriptEl = document.getElementById("json-ld-article") as HTMLScriptElement | null;
    if (!scriptEl) {
      scriptEl = document.createElement("script");
      scriptEl.id = "json-ld-article";
      scriptEl.type = "application/ld+json";
      document.head.appendChild(scriptEl);
    }
    scriptEl.textContent = JSON.stringify(jsonLd);

    return () => {
      removeMetaTag("property", "og:title");
      removeMetaTag("property", "og:description");
      removeMetaTag("property", "og:image");
      removeMetaTag("property", "og:type");
      removeMetaTag("property", "og:url");
      removeMetaTag("name", "twitter:card");
      removeMetaTag("name", "twitter:title");
      removeMetaTag("name", "twitter:description");
      removeMetaTag("name", "twitter:image");
      const ldEl = document.getElementById("json-ld-article");
      if (ldEl) ldEl.remove();
    };
  }, [post, postUrl]);

  // Scroll progress
  useEffect(() => {
    const handleScroll = () => {
      const winScroll = document.documentElement.scrollTop;
      const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const scrolled = height > 0 ? (winScroll / height) * 100 : 0;
      setScrollProgress(scrolled);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const shareUrls = post
    ? {
        whatsapp: `https://api.whatsapp.com/send?text=${encodeURIComponent(post.title)}+${encodeURIComponent(postUrl)}`,
        twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(post.title)}&url=${encodeURIComponent(postUrl)}`,
        facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(postUrl)}`,
        linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(postUrl)}`,
      }
    : { whatsapp: "", twitter: "", facebook: "", linkedin: "" };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(postUrl);
      setCopied(true);
      toast.success("Link copiado!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Erro ao copiar link.");
    }
  };

  const handleNewsletter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    toast.success("Inscri\u00e7\u00e3o realizada com sucesso!");
    setEmail("");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="relative h-[40vh] md:h-[60vh]">
          <Skeleton className="w-full h-full" />
        </div>
        <div className="container mx-auto px-4 mt-12">
          <div className="max-w-3xl mx-auto space-y-4">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-3/4" />
            <div className="flex gap-4">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-24" />
            </div>
            <div className="space-y-3 pt-8">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-4 w-full" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!post) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Scroll Progress Bar */}
      <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-muted">
        <motion.div
          className="h-full bg-gradient-to-r from-primary via-orange-500 to-primary"
          style={{ width: `${scrollProgress}%` }}
          transition={{ duration: 0.1 }}
        />
      </div>

      {/* Breadcrumb */}
      <div className="container mx-auto px-4 pt-4 md:pt-6">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/">In\u00edcio</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/blog">Blog</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            {post.category && (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link to={`/blog?cat=${post.category.slug}`}>{post.category.name}</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
              </>
            )}
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="line-clamp-1 max-w-[200px]">{post.title}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="relative h-[40vh] md:h-[60vh] w-full mt-4"
      >
        <img
          src={post.image_url || "/placeholder.svg"}
          alt={post.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 container mx-auto px-4 pb-8 md:pb-12">
          <div className="max-w-4xl space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <Badge className="bg-primary text-primary-foreground border-none">
                {post.category?.name || "Geral"}
              </Badge>
              <span className="flex items-center gap-1 text-sm text-white/80">
                <Clock className="w-4 h-4" />
                {getReadingTime(post.content)} min de leitura
              </span>
              <span className="flex items-center gap-1 text-sm text-white/80">
                <Eye className="w-4 h-4" />
                {(post.view_count || 0).toLocaleString("pt-BR")} visualiza\u00e7\u00f5es
              </span>
            </div>
            <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight text-white leading-tight">
              {post.title}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-white/80 text-sm">
              <span className="flex items-center">
                <Calendar className="h-4 w-4 mr-2" />
                {formatDate(post.published_at)}
              </span>
              <span className="flex items-center">
                <Sparkles className="h-4 w-4 mr-2" />
                Equipe Bateumz
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Main Content Area */}
      <div className="container mx-auto px-4 mt-12 pb-20">
        <div className="flex gap-12 max-w-7xl mx-auto">
          {/* Content + Sidebar wrapper */}
          <div className="flex-1 min-w-0">
            <div className="grid lg:grid-cols-3 gap-12">
              {/* Article Content */}
              <article className="lg:col-span-2 max-w-none">
                <div className="prose prose-lg dark:prose-invert max-w-none prose-headings:font-black prose-headings:uppercase prose-p:text-muted-foreground prose-a:text-primary prose-img:rounded-xl">
                  <div dangerouslySetInnerHTML={{ __html: post.content }} />
                </div>

                {/* Keywords */}
                {post.seo_keywords && post.seo_keywords.length > 0 && (
                  <div className="mt-12 pt-8 border-t border-border">
                    <div className="flex flex-wrap items-center gap-2">
                      <Tag className="h-4 w-4 text-muted-foreground mr-1" />
                      {post.seo_keywords.map((keyword, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {keyword}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Back to blog link */}
                <div className="mt-12 pt-8 border-t border-border">
                  <Link
                    to="/blog"
                    className="inline-flex items-center gap-2 text-primary font-semibold hover:gap-3 transition-all"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Voltar ao Blog
                  </Link>
                </div>

                {/* Related Posts */}
                {relatedPosts.length > 0 && (
                  <section className="mt-16">
                    <div className="flex items-center gap-3 mb-8">
                      <TrendingUp className="w-6 h-6 text-primary" />
                      <h2 className="text-2xl font-black uppercase tracking-tight">
                        Posts Relacionados
                      </h2>
                    </div>
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                      {relatedPosts.map((relPost) => (
                        <Link key={relPost.id} to={`/blog/${relPost.slug}`} className="block group">
                          <Card className="h-full overflow-hidden border-border/50 hover:border-primary/30 hover:shadow-xl transition-all duration-500">
                            <div className="overflow-hidden">
                              <img
                                src={relPost.image_url || "/placeholder.svg"}
                                alt={relPost.title}
                                className="w-full aspect-video object-cover group-hover:scale-105 transition-transform duration-700"
                              />
                            </div>
                            <div className="p-4 space-y-2">
                              <Badge
                                variant="secondary"
                                className="bg-primary/10 text-primary border-none text-xs"
                              >
                                {relPost.category?.name || "Geral"}
                              </Badge>
                              <h3 className="font-bold text-sm leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                                {relPost.title}
                              </h3>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Eye className="w-3 h-3" />
                                  {(relPost.view_count || 0).toLocaleString("pt-BR")}
                                </span>
                                <span>{formatDate(relPost.published_at)}</span>
                              </div>
                            </div>
                          </Card>
                        </Link>
                      ))}
                    </div>
                  </section>
                )}
              </article>

              {/* Sidebar */}
              <aside className="space-y-8">
                {/* Sorteios CTA */}
                <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/20 overflow-hidden">
                  <CardContent className="p-6 text-center space-y-4">
                    <motion.div
                      animate={{ rotate: [0, 5, -5, 0] }}
                      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                      className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10"
                    >
                      <Gift className="w-8 h-8 text-primary" />
                    </motion.div>
                    <h3 className="font-black uppercase text-xl text-primary">
                      Participe dos Sorteios
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Concorra a pr\u00eamios incr\u00edveis! Participe dos nossos sorteios ativos e
                      tenha a chance de ganhar.
                    </p>
                    <Link to="/marketplace">
                      <Button className="w-full bg-primary text-primary-foreground font-black uppercase">
                        Ver Sorteios
                      </Button>
                    </Link>
                  </CardContent>
                </Card>

                {/* Newsletter CTA */}
                <Card className="border-primary/10">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Mail className="w-5 h-5 text-primary" />
                      Newsletter
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Receba os melhores conte\u00fados e novidades diretamente no seu e-mail.
                    </p>
                    <form onSubmit={handleNewsletter} className="space-y-3">
                      <Input
                        type="email"
                        placeholder="Seu melhor e-mail"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="h-10"
                      />
                      <Button type="submit" className="w-full gap-2 font-semibold">
                        <Send className="w-4 h-4" />
                        Inscrever-se
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </aside>
            </div>
          </div>

          {/* Desktop Sticky Share Sidebar */}
          <div className="hidden xl:flex flex-col items-center gap-3 sticky top-24 self-start">
            <span className="text-xs font-medium text-muted-foreground mb-1">Compartilhar</span>
            <button
              onClick={() => window.open(shareUrls.whatsapp, "_blank", "width=600,height=400")}
              className="w-11 h-11 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 hover:bg-green-500/20 flex items-center justify-center transition-colors"
              aria-label="WhatsApp"
            >
              <MessageCircle className="w-5 h-5" />
            </button>
            <button
              onClick={() => window.open(shareUrls.twitter, "_blank", "width=600,height=400")}
              className="w-11 h-11 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 hover:bg-sky-500/20 flex items-center justify-center transition-colors"
              aria-label="Twitter/X"
            >
              <Twitter className="w-5 h-5" />
            </button>
            <button
              onClick={() => window.open(shareUrls.facebook, "_blank", "width=600,height=400")}
              className="w-11 h-11 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 flex items-center justify-center transition-colors"
              aria-label="Facebook"
            >
              <Facebook className="w-5 h-5" />
            </button>
            <button
              onClick={() => window.open(shareUrls.linkedin, "_blank", "width=600,height=400")}
              className="w-11 h-11 rounded-full bg-blue-700/10 text-blue-700 dark:text-blue-400 hover:bg-blue-700/20 flex items-center justify-center transition-colors"
              aria-label="LinkedIn"
            >
              <Linkedin className="w-5 h-5" />
            </button>
            <button
              onClick={handleCopyLink}
              className="w-11 h-11 rounded-full bg-secondary text-foreground hover:bg-secondary/80 flex items-center justify-center transition-colors"
              aria-label="Copiar link"
            >
              {copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Share Bar */}
      <div className="xl:hidden fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-md border-t border-border safe-area-pb">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-muted-foreground hidden sm:block">Compartilhar:</span>
            <div className="flex items-center gap-2 flex-1 justify-around">
              <button
                onClick={() => window.open(shareUrls.whatsapp, "_blank", "width=600,height=400")}
                className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 hover:bg-green-500/20 text-sm font-medium transition-colors"
                aria-label="WhatsApp"
              >
                <MessageCircle className="w-4 h-4" />
                <span className="hidden sm:inline">WhatsApp</span>
              </button>
              <button
                onClick={() => window.open(shareUrls.twitter, "_blank", "width=600,height=400")}
                className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 hover:bg-sky-500/20 text-sm font-medium transition-colors"
                aria-label="Twitter/X"
              >
                <Twitter className="w-4 h-4" />
                <span className="hidden sm:inline">Twitter</span>
              </button>
              <button
                onClick={() => window.open(shareUrls.facebook, "_blank", "width=600,height=400")}
                className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 text-sm font-medium transition-colors"
                aria-label="Facebook"
              >
                <Facebook className="w-4 h-4" />
                <span className="hidden sm:inline">Facebook</span>
              </button>
              <button
                onClick={() => window.open(shareUrls.linkedin, "_blank", "width=600,height=400")}
                className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-blue-700/10 text-blue-700 dark:text-blue-400 hover:bg-blue-700/20 text-sm font-medium transition-colors"
                aria-label="LinkedIn"
              >
                <Linkedin className="w-4 h-4" />
                <span className="hidden sm:inline">LinkedIn</span>
              </button>
              <button
                onClick={handleCopyLink}
                className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-secondary text-foreground hover:bg-secondary/80 text-sm font-medium transition-colors"
                aria-label="Copiar link"
              >
                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                <span className="hidden sm:inline">Copiar</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
