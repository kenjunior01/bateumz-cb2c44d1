import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Calendar, Users, Eye, ThumbsUp, Video } from "lucide-react";

interface Contest {
  id: string;
  title: string;
  description: string | null;
  prize_description: string | null;
  image_url: string | null;
  status: string;
  evaluation_type: string;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
}

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  active: { label: "Aberto", variant: "default" },
  voting: { label: "Em Votação", variant: "secondary" },
  completed: { label: "Encerrado", variant: "outline" },
};

export default function Contests() {
  const [contests, setContests] = useState<Contest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("contests")
        .select("*")
        .in("status", ["active", "voting", "completed"])
        .order("created_at", { ascending: false });
      setContests(data || []);
      setLoading(false);
    }
    load();
  }, []);

  const active = contests.filter((c) => c.status === "active" || c.status === "voting");
  const past = contests.filter((c) => c.status === "completed");

  const ContestCard = ({ contest }: { contest: Contest }) => (
    <Link to={`/concursos/${contest.id}`}>
      <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group">
        {contest.image_url && (
          <div className="aspect-video overflow-hidden">
            <img src={contest.image_url} alt={contest.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          </div>
        )}
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{contest.title}</CardTitle>
            <Badge variant={statusMap[contest.status]?.variant || "outline"}>
              {statusMap[contest.status]?.label || contest.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {contest.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">{contest.description}</p>
          )}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            {contest.evaluation_type === "views" ? (
              <span className="flex items-center gap-1"><Video className="h-3 w-3" /> Por visualizações</span>
            ) : (
              <span className="flex items-center gap-1"><ThumbsUp className="h-3 w-3" /> Por votos</span>
            )}
            {contest.end_date && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {new Date(contest.end_date).toLocaleDateString("pt-MZ")}
              </span>
            )}
          </div>
          {contest.prize_description && (
            <div className="flex items-center gap-1 text-sm font-medium text-primary">
              <Trophy className="h-4 w-4" />
              {contest.prize_description}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 pt-24 pb-16">
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">🏆 Concursos</h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Participe nos concursos, mostre o seu talento e ganhe prémios incríveis!
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : (
          <Tabs defaultValue="active" className="w-full">
            <TabsList className="mb-6">
              <TabsTrigger value="active">Ativos ({active.length})</TabsTrigger>
              <TabsTrigger value="past">Encerrados ({past.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="active">
              {active.length === 0 ? (
                <p className="text-center text-muted-foreground py-12">Nenhum concurso ativo de momento.</p>
              ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">{active.map((c) => <ContestCard key={c.id} contest={c} />)}</div>
              )}
            </TabsContent>
            <TabsContent value="past">
              {past.length === 0 ? (
                <p className="text-center text-muted-foreground py-12">Nenhum concurso encerrado.</p>
              ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">{past.map((c) => <ContestCard key={c.id} contest={c} />)}</div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
      <Footer />
    </div>
  );
}
