import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Calendar,
  Clock,
  Eye,
  Heart,
  Share2,
  Tag,
  ArrowLeft,
  ArrowUp,
  ChevronRight,
  Home,
  Copy,
  Check,
  Sparkles,
  TrendingUp,
  BookOpen,
  User,
} from "lucide-react";
import { toast } from "sonner";

/* ─── Tipos ─── */
interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  summary: string;
  image_url: string;
  published_at: string;
  seo_keywords: string[];
  seo_title: string | null;
  seo_description: string | null;
  view_count: number;
  like_count: number;
  share_count: number;
  reading_time_min: number | null;
  is_featured: boolean;
  is_trending: boolean;
  category: { name: string; slug: string; color: string | null; icon: string | null } | null;
  author: { email: string; full_name: string | null } | null;
}

interface RelatedPost {
  id: string;
  title: string;
  slug: string;
  summary: string;
  image_url: string;
  published_at: string;
  view_count: number;
  reading_time_min: number | null;
  category: { name: string; slug: string; color: string | null } | null;
}

interface TOCItem {
  id: string;
  text: string;
  level: number;
}

const ANON_USER_ID = "00000000-0000-0000-0000-000000000000";
const SITE_URL = "https://bateu.online";
const SITE_NAME = "Bateumz";

/* ─── Helpers ─── */
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(".0", "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(".0", "")}K`;
  return String(n);
}

function parseTOC(html: string): TOCItem[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const headings = doc.querySelectorAll("h2, h3");
  const items: TOCItem[] = [];
  headings.forEach((h, i) => {
    const id = `section-${i}`;
    h.id = id;
    items.push({ id, text: h.textContent || `Seção ${i + 1}`, level: h.tagName === "H2" ? 2 : 3 });
  });
  return items;
}

function injectAnchorIds(html: string, toc: TOCItem[]): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const headings = doc.querySelectorAll("h2, h3");
  headings.forEach((h, i) => {
    if (toc[i]) h.id = toc[i].id;
  });
  return doc.body.innerHTML;
}

/* ─── Ícones de redes sociais (SVGs customizados) ─── */
function SocialIcon({ name, className }: { name: string; className?: string }) {
  switch (name) {
    case "whatsapp":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
      );
    case "twitter":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      );
    case "facebook":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      );
    case "telegram":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
        </svg>
      );
    default:
      return <Share2 className={className} />;
  }
}

/* ══════════════════════════════════════════════════════════════════
   Componente Principal
   ══════════════════════════════════════════════════════════════════ */
export default function BlogPostDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [post, setPost] = useState<BlogPost | null>(null);
  const [relatedPosts, setRelatedPosts] = useState<RelatedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [viewCount, setViewCount] = useState(0);
  const [copiedLink, setCopiedLink] = useState(false);
  const [activeSection, setActiveSection] = useState("");
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [toc, setToc] = useState<TOCItem[]>([]);
  const contentRef = useRef<HTMLDivElement>(null);

  /* ─── Carregar post ─── */
  useEffect(() => {
    if (!slug) return;
    let cancelled = false;

    const loadPost = async () => {
      setLoading(true);
      setError(false);
      try {
        const { data, error: fetchError } = await (supabase as any)
          .from("blog_posts")
          .select(
            `id, title, slug, content, summary, image_url, published_at, seo_keywords, seo_title, seo_description, view_count, like_count, share_count, reading_time_min, is_featured, is_trending, category:blog_categories(name, slug, color, icon), author:author_id(email, user_metadata->full_name)`
          )
          .eq("slug", slug)
          .eq("published", true)
          .single();

        if (fetchError) throw fetchError;
        if (!data || cancelled) return;

        const postData = data as BlogPost;
        setPost(postData);
        setLikeCount(postData.like_count || 0);
        setViewCount((postData.view_count || 0) + 1);

        /* Incrementar visualizações */
        supabase.rpc("increment_blog_view", { post_slug: slug }).catch(() => {});

        /* Gerar sumário */
        if (postData.content) {
          const parsed = parseTOC(postData.content);
          setToc(parsed);
        }
      } catch {
        if (!cancelled) {
          setError(true);
          toast.error("Artigo não encontrado ou indisponível.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadPost();
    return () => { cancelled = true; };
  }, [slug]);

  /* ─── Carregar posts relacionados ─── */
  useEffect(() => {
    if (!slug) return;
    (supabase as any)
      .from("blog_posts")
      .select(
        `id, title, slug, summary, image_url, published_at, view_count, reading_time_min, category:blog_categories(name, slug, color)`
      )
      .eq("published", true)
      .neq("slug", slug)
      .order("published_at", { ascending: false })
      .limit(4)
      .then(({ data }) => {
        if (data) setRelatedPosts(data as RelatedPost[]);
      })
      .catch(() => {});
  }, [slug]);

  /* ─── Scroll → seção ativa do sumário + back-to-top ─── */
  useEffect(() => {
    if (toc.length === 0) return;
    const handleScroll = () => {
      const scrollY = window.scrollY;
      setShowBackToTop(scrollY > 600);
      if (!contentRef.current) return;
      for (let i = toc.length - 1; i >= 0; i--) {
        const el = document.getElementById(toc[i].id);
        if (el && el.offsetTop - 140 <= scrollY) {
          setActiveSection(toc[i].id);
          return;
        }
      }
      setActiveSection(toc[0]?.id || "");
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [toc]);

  /* ─── SEO helpers ─── */
  const pageTitle = post?.seo_title || post?.title || "Blog";
  const pageDesc = post?.seo_description || post?.summary || "";
  const pageUrl = `${SITE_URL}/blog/${slug}`;
  const postImage = post?.image_url || "";

  /* ─── Conteúdo com anchors injetados ─── */
  const enrichedContent = useMemo(() => {
    if (!post?.content || toc.length === 0) return post?.content || "";
    return injectAnchorIds(post.content, toc);
  }, [post?.content, toc]);

  /* ─── Ações ─── */
  const handleLike = useCallback(async () => {
    if (!slug) return;
    const userId = user?.id || ANON_USER_ID;
    const willLike = !liked;
    setLiked(willLike);
    setLikeCount((c) => (willLike ? c + 1 : Math.max(0, c - 1)));
    try {
      await supabase.rpc("toggle_blog_like", { post_slug: slug, user_id: userId });
    } catch {
      setLiked(!willLike);
      setLikeCount((c) => (willLike ? c - 1 : c + 1));
    }
  }, [slug, user?.id, liked]);

  const shareText = encodeURIComponent(`${post?.title} – ${SITE_NAME}`);
  const shareUrl = encodeURIComponent(pageUrl);

  const shareLinks = useMemo(
    () => [
      {
        name: "WhatsApp",
        icon: "whatsapp",
        href: `https://wa.me/?text=${shareText}%20${shareUrl}`,
        color: "bg-green-600 hover:bg-green-700",
      },
      {
        name: "Twitter",
        icon: "twitter",
        href: `https://twitter.com/intent/tweet?text=${shareText}&url=${shareUrl}`,
        color: "bg-black hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-200 dark:text-black",
      },
      {
        name: "Facebook",
        icon: "facebook",
        href: `https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`,
        color: "bg-blue-600 hover:bg-blue-700",
      },
      {
        name: "Telegram",
        icon: "telegram",
        href: `https://t.me/share/url?url=${shareUrl}&text=${shareText}`,
        color: "bg-sky-500 hover:bg-sky-600",
      },
    ],
    [shareText, shareUrl]
  );

  const handleNativeShare = useCallback(() => {
    if (navigator.share) {
      navigator.share({ title: post?.title, url: pageUrl });
    } else {
      navigator.clipboard.writeText(pageUrl).then(() => {
        setCopiedLink(true);
        toast.success("Link copiado!");
        setTimeout(() => setCopiedLink(false), 2500);
      });
    }
  }, [post?.title, pageUrl]);

  const handleCopyLink = useCallback(() => {
    navigator.clipboard.writeText(pageUrl).then(() => {
      setCopiedLink(true);
      toast.success("Link copiado para a área de transferência!");
      setTimeout(() => setCopiedLink(false), 2500);
    });
  }, [pageUrl]);

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  /* ══════════════════════════════════════════════════════════════
     Loading skeleton
     ══════════════════════════════════════════════════════════════ */
  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-6">
          <Skeleton className="h-5 w-64 mb-8" />
        </div>
        <div className="relative h-[40vh] md:h-[55vh] w-full">
          <Skeleton className="w-full h-full" />
        </div>
        <div className="container mx-auto px-4 mt-10">
          <div className="max-w-4xl mx-auto space-y-6">
            <Skeleton className="h-10 w-3/4" />
            <div className="flex gap-4">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-5 w-28" />
            </div>
            <Skeleton className="h-px w-full" />
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton
                key={i}
                className="h-5 w-full"
                style={{ width: `${85 + Math.random() * 15}%` }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* ══════════════════════════════════════════════════════════════
     Error state
     ══════════════════════════════════════════════════════════════ */
  if (error || !post) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-6 p-8 text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200 }}
        >
          <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        </motion.div>
        <h1 className="text-2xl font-bold">Artigo não encontrado</h1>
        <p className="text-muted-foreground max-w-md">
          O artigo que você procura pode ter sido removido ou o link está incorreto.
        </p>
        <Button onClick={() => navigate("/blog")} variant="outline" className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Voltar ao Blog
        </Button>
      </div>
    );
  }

  const categoryColor = post.category?.color || "bg-primary";

  return (
    <motion.div
      className="min-h-screen bg-background"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      {/* ══════ SEO ══════ */}
      <Helmet>
        <title>{pageTitle} | {SITE_NAME}</title>
        <meta name="description" content={pageDesc} />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href={pageUrl} />
        {/* Open Graph */}
        <meta property="og:type" content="article" />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDesc} />
        <meta property="og:url" content={pageUrl} />
        <meta property="og:image" content={postImage} />
        <meta property="og:site_name" content={SITE_NAME} />
        <meta property="og:locale" content="pt_BR" />
        {post.published_at && (
          <meta property="article:published_time" content={post.published_at} />
        )}
        {post.seo_keywords?.map((kw) => (
          <meta property="article:tag" content={kw} key={kw} />
        ))}
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={pageDesc} />
        <meta name="twitter:image" content={postImage} />
      </Helmet>

      {/* ══════ JSON-LD Structured Data ══════ */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: pageTitle,
            description: pageDesc,
            image: postImage || undefined,
            url: pageUrl,
            datePublished: post.published_at || undefined,
            dateModified: post.updated_at || post.published_at || undefined,
            author: {
              "@type": "Organization",
              name: "Equipe Bateu",
              url: window.location.origin,
            },
            publisher: {
              "@type": "Organization",
              name: "Bateu",
              url: window.location.origin,
              logo: {
                "@type": "ImageObject",
                url: `${window.location.origin}/favicon.ico`,
              },
            },
            mainEntityOfPage: {
              "@type": "WebPage",
              "@id": pageUrl,
            },
            keywords: post.seo_keywords?.join(", ") || undefined,
            wordCount: post.content?.replace(/<[^>]*>/g, "").split(/\s+/).length || undefined,
            articleSection: post.category?.name || undefined,
          }),
        }}
      />

      {/* ══════ Breadcrumbs ══════ */}
      <div className="container mx-auto px-4 pt-4 pb-2">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/">
                  <Home className="h-3.5 w-3.5" />
                </Link>
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
                    <Link to={`/blog?categoria=${post.category.slug}`}>
                      {post.category.name}
                    </Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
              </>
            )}
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="line-clamp-1 max-w-[200px] md:max-w-[300px]">
                {post.title}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* ══════ Hero ══════ */}
      <div className="relative h-[40vh] md:h-[55vh] w-full overflow-hidden">
        <img
          src={post.image_url || "/placeholder.svg"}
          alt={post.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />

        {/* Badges flutuantes */}
        <div className="absolute top-4 right-4 z-10 flex gap-2">
          {post.is_featured && (
            <Badge className="gap-1 bg-yellow-500 text-black border-none font-bold shadow-lg">
              <Sparkles className="h-3 w-3" /> Destaque
            </Badge>
          )}
          {post.is_trending && (
            <Badge className="gap-1 bg-orange-500 text-white border-none font-bold shadow-lg">
              <TrendingUp className="h-3 w-3" /> Em alta
            </Badge>
          )}
        </div>

        <div className="absolute bottom-0 left-0 right-0 container mx-auto px-4 pb-8">
          <div className="space-y-4">
            <Link to="/blog">
              <Button
                variant="ghost"
                size="sm"
                className="mb-4 text-white hover:bg-white/20 -ml-2"
              >
                <ArrowLeft className="h-4 w-4 mr-2" /> Voltar ao Blog
              </Button>
            </Link>

            <Badge className={`${categoryColor} text-white border-none shadow-lg`}>
              {post.category?.icon && <span className="mr-1">{post.category.icon}</span>}
              {post.category?.name || "Geral"}
            </Badge>

            <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight text-white leading-tight">
              {post.title}
            </h1>

            <p className="text-white/80 text-base md:text-lg max-w-2xl line-clamp-2">
              {post.summary}
            </p>

            <div className="flex flex-wrap items-center gap-4 md:gap-6 text-white/80 text-sm">
              <div className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                {formatDate(post.published_at)}
              </div>
              {post.reading_time_min && (
                <div className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  {post.reading_time_min} min de leitura
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <Eye className="h-4 w-4" />
                {formatNumber(viewCount)} visualizações
              </div>
              <div className="flex items-center gap-1.5">
                <User className="h-4 w-4" />
                {post.author?.full_name || "Equipe Bateumz"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ══════ Conteúdo principal + sidebars ══════ */}
      <div className="container mx-auto px-4 mt-10 pb-20">
        <div className="flex gap-12 relative">

          {/* ── Sticky share bar (desktop xl+) ── */}
          <div className="hidden xl:flex flex-col items-center gap-2 sticky top-24 self-start z-10">
            {shareLinks.map((s) => (
              <a
                key={s.name}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                className={`${s.color} text-white w-10 h-10 rounded-full flex items-center justify-center transition-transform hover:scale-110 shadow-md`}
                title={s.name}
              >
                <SocialIcon name={s.icon} className="h-4 w-4" />
              </a>
            ))}
            <button
              onClick={handleCopyLink}
              className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-foreground w-10 h-10 rounded-full flex items-center justify-center transition-transform hover:scale-110 shadow-md"
              title="Copiar link"
            >
              {copiedLink ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </button>
            <Separator className="my-2 w-6" />
            <button
              onClick={handleLike}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110 shadow-md ${
                liked
                  ? "bg-red-500 text-white"
                  : "bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-foreground"
              }`}
              title="Curtir"
            >
              <Heart className={`h-4 w-4 ${liked ? "fill-current" : ""}`} />
            </button>
          </div>

          {/* ── TOC Sidebar (desktop lg+) ── */}
          {toc.length > 1 && (
            <aside className="hidden lg:block w-56 shrink-0 sticky top-24 self-start max-h-[calc(100vh-8rem)] overflow-y-auto">
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                Sumário
              </div>
              <nav className="flex flex-col gap-1 border-l border-border pl-3">
                {toc.map((item) => (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      document
                        .getElementById(item.id)
                        ?.scrollIntoView({ behavior: "smooth", block: "start" });
                    }}
                    className={`text-xs leading-relaxed transition-colors py-0.5 hover:text-primary ${
                      item.level === 3 ? "pl-3" : ""
                    } ${
                      activeSection === item.id
                        ? "text-primary font-semibold border-l-2 border-primary -ml-px pl-2"
                        : "text-muted-foreground"
                    }`}
                  >
                    {item.text}
                  </a>
                ))}
              </nav>
            </aside>
          )}

          {/* ── Main content ── */}
          <article className="flex-1 min-w-0 max-w-3xl">
            <div
              ref={contentRef}
              className="prose prose-lg dark:prose-invert max-w-none
                prose-headings:font-black prose-headings:uppercase prose-headings:tracking-tight
                prose-h2:text-2xl prose-h2:mt-12 prose-h2:mb-4
                prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3
                prose-p:text-muted-foreground prose-p:leading-relaxed
                prose-a:text-primary prose-a:underline-offset-4 hover:prose-a:text-primary/80
                prose-img:rounded-xl prose-img:shadow-lg
                prose-blockquote:border-l-4 prose-blockquote:border-primary
                prose-blockquote:bg-primary/5 prose-blockquote:rounded-r-lg prose-blockquote:py-2 prose-blockquote:px-4
                prose-li:text-muted-foreground
                prose-strong:text-foreground
                prose-table:border prose-th:border prose-th:bg-muted prose-td:border
                prose-code:text-primary prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm
                prose-pre:bg-muted prose-pre:rounded-xl prose-pre:shadow-md
                [&_iframe]:rounded-xl [&_iframe]:shadow-lg
                scroll-mt-28"
              dangerouslySetInnerHTML={{ __html: enrichedContent }}
            />

            {/* ── Barra de ações mobile ── */}
            <div className="xl:hidden mt-10 pt-6 border-t border-border">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <Button
                    variant={liked ? "default" : "outline"}
                    size="sm"
                    onClick={handleLike}
                    className={
                      liked
                        ? "bg-red-500 hover:bg-red-600 text-white border-none gap-1.5"
                        : "gap-1.5"
                    }
                  >
                    <Heart className={`h-4 w-4 ${liked ? "fill-current" : ""}`} />
                    Curtir
                    {likeCount > 0 && (
                      <span className="text-xs opacity-70">({formatNumber(likeCount)})</span>
                    )}
                  </Button>
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Eye className="h-4 w-4" /> {formatNumber(viewCount)}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {shareLinks.map((s) => (
                    <a
                      key={s.name}
                      href={s.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`${s.color} text-white w-9 h-9 rounded-full flex items-center justify-center transition-transform hover:scale-110`}
                      title={s.name}
                    >
                      <SocialIcon name={s.icon} className="h-3.5 w-3.5" />
                    </a>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNativeShare}
                    className="gap-1.5"
                  >
                    {copiedLink ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                    Compartilhar
                  </Button>
                </div>
              </div>
            </div>

            {/* ── Tags ── */}
            {post.seo_keywords && post.seo_keywords.length > 0 && (
              <div className="mt-8 pt-6 border-t border-border">
                <div className="flex items-center gap-2 mb-3">
                  <Tag className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">Tags</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {post.seo_keywords.map((keyword, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {keyword}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* ── Caixa do autor ── */}
            <Card className="mt-10 border-primary/10">
              <CardContent className="p-6 flex items-start gap-4">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-2xl font-black text-primary">B</span>
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-base">
                    {post.author?.full_name || "Equipe Bateumz"}
                  </h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Conteúdo produzido pela equipe Bateumz — especialistas em sorteios,
                    loterias e prêmios. Acompanhe as últimas novidades do mundo dos jogos
                    e não perca nenhuma oportunidade.
                  </p>
                  {post.author?.email && (
                    <p className="text-xs text-muted-foreground/70">{post.author.email}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* ── Posts relacionados (inline, visível em todas as telas) ── */}
            {relatedPosts.length > 0 && (
              <section className="mt-14">
                <div className="flex items-center gap-2 mb-6">
                  <BookOpen className="h-5 w-5 text-primary" />
                  <h2 className="text-xl font-black uppercase tracking-tight">
                    Artigos Relacionados
                  </h2>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {relatedPosts.slice(0, 3).map((rp) => (
                    <Link key={rp.id} to={`/blog/${rp.slug}`} className="group">
                      <Card className="overflow-hidden h-full transition-all hover:shadow-lg hover:border-primary/30">
                        <div className="relative h-36 overflow-hidden">
                          <img
                            src={rp.image_url || "/placeholder.svg"}
                            alt={rp.title}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                          {rp.category && (
                            <Badge
                              className="absolute bottom-2 left-2 text-white border-none text-[10px]"
                              style={{
                                backgroundColor: rp.category.color || undefined,
                              }}
                            >
                              {rp.category.name}
                            </Badge>
                          )}
                        </div>
                        <CardContent className="p-4 space-y-2">
                          <h3 className="font-bold text-sm line-clamp-2 group-hover:text-primary transition-colors">
                            {rp.title}
                          </h3>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {rp.summary}
                          </p>
                          <div className="flex items-center gap-3 text-[11px] text-muted-foreground/70">
                            <span>{formatDate(rp.published_at)}</span>
                            {rp.reading_time_min && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" /> {rp.reading_time_min} min
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Eye className="h-3 w-3" />{" "}
                              {formatNumber(rp.view_count || 0)}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* ── Footer CTA ── */}
            <Card className="mt-14 bg-gradient-to-r from-primary to-primary/80 border-none overflow-hidden">
              <CardContent className="p-8 md:p-10 flex flex-col md:flex-row items-center gap-6">
                <div className="flex-1 text-center md:text-left space-y-2">
                  <h3 className="text-2xl font-black uppercase text-white">
                    Quer participar de sorteios reais?
                  </h3>
                  <p className="text-white/80 text-sm md:text-base">
                    Acesse nosso marketplace e concorra a prêmios incríveis. Novos sorteios
                    toda semana!
                  </p>
                </div>
                <Link to="/marketplace">
                  <Button
                    size="lg"
                    className="bg-white text-primary hover:bg-white/90 font-black uppercase shadow-xl gap-2 text-base"
                  >
                    <Sparkles className="h-5 w-5" />
                    Ver Sorteios
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </article>

          {/* ── Sidebar direita (desktop lg+) ── */}
          <aside className="hidden lg:block w-72 shrink-0 space-y-6 sticky top-24 self-start max-h-[calc(100vh-8rem)] overflow-y-auto">
            {/* Compartilhar */}
            <Card className="border-primary/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Share2 className="h-4 w-4 text-primary" /> Compartilhar
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Gostou do artigo? Compartilhe com seus amigos!
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {shareLinks.map((s) => (
                    <a
                      key={s.name}
                      href={s.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`${s.color} text-white text-xs font-medium rounded-lg py-2 px-3 flex items-center gap-2 transition-transform hover:scale-[1.02]`}
                    >
                      <SocialIcon name={s.icon} className="h-3.5 w-3.5" />
                      {s.name}
                    </a>
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyLink}
                  className="w-full gap-1.5 text-xs"
                >
                  {copiedLink ? (
                    <Check className="h-3.5 w-3.5 text-green-500" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  {copiedLink ? "Copiado!" : "Copiar link"}
                </Button>
              </CardContent>
            </Card>

            {/* Curtir */}
            <Card className="border-primary/10">
              <CardContent className="p-4 flex items-center gap-4">
                <Button
                  variant={liked ? "default" : "outline"}
                  size="lg"
                  onClick={handleLike}
                  className={`rounded-full h-12 w-12 p-0 shrink-0 ${
                    liked
                      ? "bg-red-500 hover:bg-red-600 text-white border-none"
                      : ""
                  }`}
                >
                  <Heart className={`h-5 w-5 ${liked ? "fill-current" : ""}`} />
                </Button>
                <div>
                  <div className="font-bold text-lg">{formatNumber(likeCount)}</div>
                  <div className="text-xs text-muted-foreground">curtidas</div>
                </div>
              </CardContent>
            </Card>

            {/* Posts relacionados sidebar */}
            {relatedPosts.length > 0 && (
              <Card className="border-primary/10">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-primary" /> Relacionados
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {relatedPosts.slice(0, 3).map((rp) => (
                    <Link
                      key={rp.id}
                      to={`/blog/${rp.slug}`}
                      className="group flex gap-3 items-start"
                    >
                      <div className="w-16 h-12 rounded-md overflow-hidden shrink-0 bg-muted">
                        <img
                          src={rp.image_url || "/placeholder.svg"}
                          alt={rp.title}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                        />
                      </div>
                      <div className="min-w-0 space-y-0.5">
                        <h4 className="text-xs font-semibold line-clamp-2 group-hover:text-primary transition-colors">
                          {rp.title}
                        </h4>
                        <span className="text-[10px] text-muted-foreground/70">
                          {formatDate(rp.published_at)}
                        </span>
                      </div>
                    </Link>
                  ))}
                </CardContent>
              </Card>
            )}
          </aside>
        </div>
      </div>

      {/* ══════ Botão voltar ao topo ══════ */}
      <motion.div
        className="fixed bottom-6 right-6 z-50"
        initial={{ opacity: 0, y: 20 }}
        animate={{
          opacity: showBackToTop ? 1 : 0,
          y: showBackToTop ? 0 : 20,
          pointerEvents: showBackToTop ? "auto" : "none",
        }}
        transition={{ duration: 0.2 }}
      >
        <Button
          onClick={scrollToTop}
          size="icon"
          className="rounded-full h-12 w-12 shadow-2xl bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          <ArrowUp className="h-5 w-5" />
        </Button>
      </motion.div>
    </motion.div>
  );
}
