import React, { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Calendar, Users, Newspaper, Zap, Globe, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const WorldCupCentral = () => {
  const [news, setNews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const { data, error } = await (supabase as any)
          .from("worldcup_rss_feeds")
          .select("*")
          .order("fetched_at", { ascending: false })
          .limit(10);
        
        if (data) {
          // Assuming content is stored as JSON or stringified HTML
          setNews(data);
        }
      } catch (err) {
        console.error("Error fetching news:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="relative rounded-[2rem] overflow-hidden mb-12 bg-gradient-to-br from-green-600 to-blue-700 p-8 md:p-16 text-white">
          <div className="relative z-10 max-w-2xl">
            <Badge className="mb-4 bg-white/20 hover:bg-white/30 text-white border-none backdrop-blur-md">
              Copa do Mundo FIFA 2026
            </Badge>
            <h1 className="text-4xl md:text-6xl font-black mb-6 tracking-tighter">
              A CENTRAL DO <br/> <span className="text-yellow-400">MUNDIAL 2026</span>
            </h1>
            <p className="text-lg md:text-xl opacity-90 mb-8">
              Acompanhe resultados em tempo real, tabelas, notícias e desafios exclusivos da maior Copa da história.
            </p>
            <div className="flex flex-wrap gap-4">
              <Button size="lg" className="bg-yellow-400 text-black hover:bg-yellow-500 font-bold rounded-full px-8">
                Ver Jogos de Hoje
              </Button>
              <Button size="lg" variant="outline" className="border-white/30 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full px-8">
                Participar nos Desafios
              </Button>
            </div>
          </div>
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-1/2 h-full opacity-20 pointer-events-none">
             <Globe className="w-full h-full text-white translate-x-1/4 translate-y-1/4" />
          </div>
        </div>

        <Tabs defaultValue="results" className="space-y-8">
          <div className="flex justify-center">
            <TabsList className="bg-secondary/50 p-1 rounded-full h-auto">
              <TabsTrigger value="results" className="rounded-full px-6 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Calendar className="w-4 h-4 mr-2" /> Resultados
              </TabsTrigger>
              <TabsTrigger value="standings" className="rounded-full px-6 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Trophy className="w-4 h-4 mr-2" /> Classificação
              </TabsTrigger>
              <TabsTrigger value="news" className="rounded-full px-6 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Newspaper className="w-4 h-4 mr-2" /> Notícias
              </TabsTrigger>
              <TabsTrigger value="stats" className="rounded-full px-6 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Star className="w-4 h-4 mr-2" /> Estatísticas
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="results" className="space-y-6">
            <Card className="border-none bg-secondary/30 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-yellow-500" />
                  Jogos e Resultados
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* SportBusy Widget Integration */}
                <div className="aspect-video w-full rounded-xl overflow-hidden bg-black/20 flex items-center justify-center border border-white/5">
                  <iframe 
                    src="https://www.sportbusy.com/widgets/football/fixtures?theme=dark&primaryColor=fbbf24" 
                    className="w-full h-full border-none"
                    title="Resultados Copa do Mundo"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="standings">
            <Card className="border-none bg-secondary/30 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-500" />
                  Tabela de Grupos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="aspect-[4/3] w-full rounded-xl overflow-hidden bg-black/20 border border-white/5">
                  <iframe 
                    src="https://www.sportbusy.com/widgets/football/standings?theme=dark&primaryColor=fbbf24" 
                    className="w-full h-full border-none"
                    title="Classificação Copa do Mundo"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="news">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {loading ? (
                Array(6).fill(0).map((_, i) => (
                  <Card key={i} className="animate-pulse bg-secondary/20 h-64 border-none" />
                ))
              ) : news.length > 0 ? (
                news.map((item) => (
                  <Card key={item.id} className="group overflow-hidden border-none bg-secondary/30 hover:bg-secondary/50 transition-all cursor-pointer">
                    <CardContent className="p-0">
                      <div className="p-6">
                        <div className="flex items-center gap-2 mb-4">
                          <Badge variant="secondary" className="text-[10px] uppercase">Globo Esporte</Badge>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(item.fetched_at).toLocaleDateString()}
                          </span>
                        </div>
                        <h3 className="font-bold text-lg leading-tight group-hover:text-primary transition-colors">
                          {item.content.substring(0, 100)}...
                        </h3>
                        <Button variant="link" className="px-0 text-primary mt-4">Ler mais →</Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="col-span-full text-center py-20 opacity-50">
                  Nenhuma notícia disponível no momento.
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="stats">
             <Card className="border-none bg-secondary/30 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-yellow-500" />
                  Líderes de Estatísticas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <h4 className="font-bold text-sm uppercase tracking-widest opacity-50">Melhores Marcadores</h4>
                    {/* Mock stats or API data */}
                    <div className="space-y-2">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="flex items-center justify-between p-4 bg-black/20 rounded-xl border border-white/5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary">#{i}</div>
                            <span className="font-medium">Jogador Exemplo {i}</span>
                          </div>
                          <span className="font-black text-primary">0 Golos</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h4 className="font-bold text-sm uppercase tracking-widest opacity-50">Assistências</h4>
                    <div className="space-y-2">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="flex items-center justify-between p-4 bg-black/20 rounded-xl border border-white/5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center font-bold text-blue-400">#{i}</div>
                            <span className="font-medium">Jogador Exemplo {i}</span>
                          </div>
                          <span className="font-black text-blue-400">0 Assist.</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <Footer />
    </div>
  );
};

export default WorldCupCentral;
