import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRegionalTheme } from "@/contexts/RegionalThemeContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Calendar, User, ArrowRight, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  summary: string;
  image_url: string;
  published_at: string;
  category: { name: string; slug: string };
}

export default function Blog() {
  const { region } = useRegionalTheme();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadPosts();
  }, [region]);

  const loadPosts = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("blog_posts")
        .select(`
          id, title, slug, summary, image_url, published_at,
          category:blog_categories(name, slug)
        `)
        .eq("published", true)
        .order("published_at", { ascending: false });

      if (region) {
        query = query.or(`region_id.eq.${region.id},region_id.is.null`);
      }

      const { data, error } = await query;
      if (error) throw error;
      setPosts(data as any || []);
    } catch (error) {
      console.error("Error loading blog posts:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPosts = posts.filter(post => 
    post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    post.summary.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background py-12">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight mb-4">
            Blog Bateumz
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Fique por dentro das últimas novidades sobre sorteios, tecnologia, o Mundial 2026 e muito mais.
          </p>
        </div>

        {/* Search */}
        <div className="max-w-md mx-auto mb-12 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar notícias..." 
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="text-center py-20 bg-muted/30 rounded-3xl border-2 border-dashed border-border">
            <p className="text-muted-foreground">Nenhuma notícia encontrada.</p>
          </div>
        ) : (
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {filteredPosts.map((post) => (
              <Link key={post.id} to={`/blog/${post.slug}`}>
                <Card className="h-full overflow-hidden hover:shadow-xl transition-all duration-300 border-primary/10 group">
                  <div className="aspect-video overflow-hidden">
                    <img 
                      src={post.image_url || "/placeholder.svg"} 
                      alt={post.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <CardHeader className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary" className="bg-primary/10 text-primary border-none">
                        {post.category?.name || "Geral"}
                      </Badge>
                      <div className="flex items-center text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3 mr-1" />
                        {new Date(post.published_at).toLocaleDateString("pt-BR")}
                      </div>
                    </div>
                    <CardTitle className="text-xl group-hover:text-primary transition-colors line-clamp-2">
                      {post.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground text-sm line-clamp-3 mb-4">
                      {post.summary}
                    </p>
                    <div className="flex items-center text-primary font-bold text-sm">
                      Ler mais <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
