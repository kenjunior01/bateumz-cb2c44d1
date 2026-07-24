import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Calendar, User, ArrowLeft, Share2, Tag } from "lucide-react";
import { toast } from "sonner";

interface BlogPost {
  id: string;
  title: string;
  content: string;
  summary: string;
  image_url: string;
  published_at: string;
  category: { name: string; slug: string };
  seo_keywords: string[];
}

export default function BlogPostDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPost();
  }, [slug]);

  const loadPost = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("blog_posts")
        .select(`
          id, title, content, summary, image_url, published_at, seo_keywords,
          category:blog_categories(name, slug)
        `)
        .eq("slug", slug)
        .eq("published", true)
        .single();

      if (error) throw error;
      setPost(data as any);
    } catch (error) {
      console.error("Error loading post:", error);
      toast.error("Notícia não encontrada.");
      navigate("/blog");
    } finally {
      setLoading(false);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: post?.title,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Link copiado para a área de transferência!");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!post) return null;

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Hero Section */}
      <div className="relative h-[40vh] md:h-[60vh] w-full">
        <img 
          src={post.image_url || "/placeholder.svg"} 
          alt={post.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 container mx-auto px-4 pb-8">
          <Link to="/blog">
            <Button variant="ghost" size="sm" className="mb-6 text-white hover:bg-white/20">
              <ArrowLeft className="h-4 w-4 mr-2" /> Voltar ao Blog
            </Button>
          </Link>
          <div className="space-y-4">
            <Badge className="bg-primary text-primary-foreground border-none">
              {post.category?.name || "Geral"}
            </Badge>
            <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight text-white leading-tight">
              {post.title}
            </h1>
            <div className="flex flex-wrap items-center gap-6 text-white/80 text-sm">
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-2" />
                {new Date(post.published_at).toLocaleDateString("pt-BR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric"
                })}
              </div>
              <div className="flex items-center">
                <User className="h-4 w-4 mr-2" />
                Equipe Bateumz
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="container mx-auto px-4 mt-12">
        <div className="grid lg:grid-cols-3 gap-12">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <div className="prose prose-lg dark:prose-invert max-w-none prose-headings:font-black prose-headings:uppercase prose-p:text-muted-foreground prose-a:text-primary">
              {/* Using dangerouslySetInnerHTML as the content might be HTML from IA editor */}
              <div dangerouslySetInnerHTML={{ __html: post.content }} />
            </div>

            {/* Keywords */}
            {post.seo_keywords && post.seo_keywords.length > 0 && (
              <div className="mt-12 pt-8 border-t border-border">
                <div className="flex flex-wrap gap-2">
                  <Tag className="h-4 w-4 text-muted-foreground mr-2" />
                  {post.seo_keywords.map((keyword, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {keyword}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            <Card className="border-primary/10">
              <CardHeader>
                <CardTitle className="text-lg">Gostou da notícia?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Compartilhe com seus amigos e ajude a crescer nossa comunidade!
                </p>
                <Button onClick={handleShare} className="w-full gap-2">
                  <Share2 className="h-4 w-4" /> Compartilhar
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-primary/5 border-none overflow-hidden">
              <CardContent className="p-6 text-center space-y-4">
                <h3 className="font-black uppercase text-xl text-primary">Ganhe Prêmios!</h3>
                <p className="text-sm text-muted-foreground">
                  Participe dos nossos sorteios ativos e concorra a prêmios incríveis agora mesmo.
                </p>
                <Link to="/marketplace">
                  <Button className="w-full bg-primary text-primary-foreground font-black uppercase">
                    Ver Sorteios
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
