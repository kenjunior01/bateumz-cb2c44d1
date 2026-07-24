import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRegionalTheme } from "@/contexts/RegionalThemeContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowRight, Calendar } from "lucide-react";
import { Link } from "react-router-dom";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  summary: string;
  image_url: string;
  published_at: string;
  category: { name: string };
}

export default function BlogNewsWidget() {
  const { region } = useRegionalTheme();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLatestPosts();
  }, [region]);

  const loadLatestPosts = async () => {
    // Blog posts table not yet available; render empty state.
    setPosts([]);
    setLoading(false);
  };


  if (loading) {
    return (
      <Card className="border-primary/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            📰 Últimas Notícias
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (posts.length === 0) {
    return null;
  }

  return (
    <Card className="border-primary/10 overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-primary/5 to-accent/5">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            📰 Últimas Notícias
          </CardTitle>
          <Link to="/blog">
            <Button variant="ghost" size="sm" className="text-primary hover:bg-primary/10">
              Ver Todas
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border">
          {posts.map((post, idx) => (
            <Link key={post.id} to={`/blog/${post.slug}`}>
              <div className="p-4 hover:bg-muted/50 transition-colors group cursor-pointer">
                <div className="flex gap-4">
                  {/* Image */}
                  <div className="w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-muted">
                    <img 
                      src={post.image_url || "/placeholder.svg"} 
                      alt={post.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="secondary" className="text-xs bg-primary/10 text-primary border-none">
                        {post.category?.name || "Geral"}
                      </Badge>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(post.published_at).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                    <h3 className="font-bold text-sm line-clamp-2 group-hover:text-primary transition-colors">
                      {post.title}
                    </h3>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                      {post.summary}
                    </p>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
        <div className="p-4 border-t border-border bg-muted/30">
          <Link to="/blog" className="w-full">
            <Button variant="outline" className="w-full gap-2">
              Explorar Blog <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
