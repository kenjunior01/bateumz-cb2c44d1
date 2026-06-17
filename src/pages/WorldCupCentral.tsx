import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Trophy, Calendar, Users, Zap, Globe, Users2, MessageSquare, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { 
  checkApiHealth, 
  fetchMatches, 
  fetchWorldCupMatchesApi,
  Match as ApiMatch 
} from "@/lib/the-stats-api";

interface Match {
  id: string;
  match_date: string;
  team_a: { id: string; team_name: string; flag_emoji: string };
  team_b: { id: string; team_name: string; flag_emoji: string };
  stage: string;
  status: string;
  team_a_goals?: number;
  team_b_goals?: number;
  winner_team_id?: string;
}

interface Team {
  id: string;
  country_code: string;
  team_name: string;
  flag_emoji: string;
  group_letter: string;
  coach_name: string;
  star_players: string[];
}

interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  image_url?: string;
  category: string;
  created_at: string;
}

export default function WorldCupCentral() {
  const [loading, setLoading] = useState(true);
  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [activeTab, setActiveTab] = useState("matches");
  const [apiHealth, setApiHealth] = useState<{ status: string; timestamp: string } | null>(null);
  const [apiMatches, setApiMatches] = useState<ApiMatch[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      // Check API health
      const health = await checkApiHealth();
      setApiHealth(health);
      
      // Fetch API matches
      const apiMatchesData = await fetchWorldCupMatchesApi();
      setApiMatches(apiMatchesData);

      // Load matches from Supabase
      const { data: matchesData, error: matchesError } = await supabase
        .from("world_cup_matches")
        .select(`
          id,
          match_date,
          stage,
          status,
          team_a_goals,
          team_b_goals,
          winner_team_id,
          team_a:world_cup_teams!team_a_id(id, team_name, flag_emoji),
          team_b:world_cup_teams!team_b_id(id, team_name, flag_emoji)
        `)
        .order("match_date", { ascending: true });

      if (matchesError) throw matchesError;
      setMatches(matchesData || []);

      // Load teams
      const { data: teamsData, error: teamsError } = await supabase
        .from("world_cup_teams")
        .select("*")
        .order("group_letter");

      if (teamsError) throw teamsError;
      setTeams(teamsData || []);

      // Load news
      const { data: newsData, error: newsError } = await supabase
        .from("world_cup_news")
        .select("*")
        .eq("published", true)
        .order("created_at", { ascending: false })
        .limit(10);

      if (newsError) throw newsError;
      setNews(newsData || []);
    } catch (error) {
      console.error("Error loading World Cup data:", error);
      toast.error("Erro ao carregar dados do Mundial");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Real-time updates
  useEffect(() => {
    const channel = supabase
      .channel('world_cup_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'world_cup_matches'
        },
        (payload) => {
          console.log('Real-time update:', payload);
          loadData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'world_cup_teams'
        },
        () => {
          loadData();
        }
      )
      .subscribe();

    // Refresh API data every 30 seconds for live updates
    const interval = setInterval(() => {
      refreshApiData();
    }, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  const refreshApiData = async () => {
    setRefreshing(true);
    try {
      const apiMatchesData = await fetchWorldCupMatchesApi();
      setApiMatches(apiMatchesData);
    } catch (error) {
      console.error('Error refreshing API data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const getStageLabel = (stage: string) => {
    const labels: Record<string, string> = {
      group: "Fase de Grupos",
      round16: "Oitavas de Final",
      quarterfinal: "Quartas de Final",
      semifinal: "Semifinal",
      final: "Final",
    };
    return labels[stage] || stage;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "scheduled":
        return "bg-blue-100 text-blue-800";
      case "live":
        return "bg-red-100 text-red-800 animate-pulse";
      case "completed":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      scheduled: "Agendado",
      live: "Ao Vivo",
      completed: "Concluído",
      cancelled: "Cancelado",
    };
    return labels[status] || status;
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-4 flex-wrap">
            <Trophy className="h-8 w-8 text-primary" />
            <h1 className="font-display text-4xl font-bold">Central do Mundial 2026</h1>
            <Trophy className="h-8 w-8 text-primary" />
            <Button 
              variant="outline" 
              size="sm" 
              onClick={loadData}
              disabled={loading || refreshing}
              className="ml-auto"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Atualizando...' : 'Atualizar'}
            </Button>
          </div>
          <div className="flex items-center justify-center gap-2 mb-4">
            <Badge variant={apiHealth?.status === 'healthy' ? 'default' : 'destructive'}>
              API: {apiHealth?.status === 'healthy' ? 'Online' : 'Offline'}
            </Badge>
            {apiMatches.length > 0 && (
              <Badge variant="outline">
                {apiMatches.length} jogos na API
              </Badge>
            )}
          </div>
          <p className="text-lg text-muted-foreground mb-6">
            Acompanhe todos os jogos, equipes e notícias do maior torneio de futebol do mundo
          </p>

          {/* Quick Navigation */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
            <Link to="/bolao">
              <Button variant="outline" className="w-full gap-2">
                <Zap className="h-4 w-4" />
                Bolão
              </Button>
            </Link>
            <Link to="/fantasy">
              <Button variant="outline" className="w-full gap-2">
                <Users2 className="h-4 w-4" />
                Fantasy
              </Button>
            </Link>
            <Link to="/forum-mundial">
              <Button variant="outline" className="w-full gap-2">
                <MessageSquare className="h-4 w-4" />
                Fórum
              </Button>
            </Link>
            <Link to="/pontos">
              <Button variant="outline" className="w-full gap-2">
                <Trophy className="h-4 w-4" />
                Ranking
              </Button>
            </Link>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8">
            <TabsTrigger value="matches" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Jogos</span>
            </TabsTrigger>
            <TabsTrigger value="teams" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Equipes</span>
            </TabsTrigger>
            <TabsTrigger value="api" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              <span className="hidden sm:inline">API</span>
            </TabsTrigger>
            <TabsTrigger value="news" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              <span className="hidden sm:inline">Notícias</span>
            </TabsTrigger>
          </TabsList>

          {/* Matches Tab */}
          <TabsContent value="matches" className="space-y-4">
            <div className="grid gap-4">
              {matches.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    Nenhum jogo disponível no momento
                  </CardContent>
                </Card>
              ) : (
                matches.map((match) => (
                  <Card key={match.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="py-6">
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex-1 text-center">
                          <p className="text-sm text-muted-foreground mb-2">
                            {getStageLabel(match.stage)}
                          </p>
                          <div className="flex items-center justify-center gap-4">
                            <div className="text-center">
                              <p className="text-2xl font-bold">{match.team_a.flag_emoji}</p>
                              <p className="text-sm font-medium">{match.team_a.team_name}</p>
                            </div>
                            <div className="text-center">
                              {match.status === "completed" ? (
                                <div className="text-2xl font-bold">
                                  {match.team_a_goals} - {match.team_b_goals}
                                </div>
                              ) : (
                                <Badge className={getStatusColor(match.status)}>
                                  {getStatusLabel(match.status)}
                                </Badge>
                              )}
                              <p className="text-xs text-muted-foreground mt-1">
                                {new Date(match.match_date).toLocaleDateString("pt-BR", {
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </p>
                            </div>
                            <div className="text-center">
                              <p className="text-2xl font-bold">{match.team_b.flag_emoji}</p>
                              <p className="text-sm font-medium">{match.team_b.team_name}</p>
                            </div>
                          </div>
                        </div>
                        {match.status !== "completed" && (
                          <Button size="sm" variant="outline">
                            Fazer Previsão
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* Teams Tab */}
          <TabsContent value="teams" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {teams.length === 0 ? (
                <Card className="md:col-span-2 lg:col-span-3">
                  <CardContent className="py-8 text-center text-muted-foreground">
                    Nenhuma equipe disponível no momento
                  </CardContent>
                </Card>
              ) : (
                teams.map((team) => (
                  <Card key={team.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                    <CardContent className="py-6">
                      <div className="text-center mb-4">
                        <p className="text-4xl mb-2">{team.flag_emoji}</p>
                        <h3 className="font-bold text-lg">{team.team_name}</h3>
                        <p className="text-sm text-muted-foreground">
                          Grupo {team.group_letter}
                        </p>
                      </div>
                      <div className="space-y-2 text-sm">
                        <p>
                          <span className="font-medium">Técnico:</span> {team.coach_name}
                        </p>
                        {team.star_players && team.star_players.length > 0 && (
                          <div>
                            <p className="font-medium mb-1">Destaques:</p>
                            <p className="text-muted-foreground">
                              {team.star_players.join(", ")}
                            </p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* API Tab */}
          <TabsContent value="api" className="space-y-4">
            <div className="grid gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-primary" />
                    Partidas da TheStatsApi
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {apiMatches.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground">
                      <p>Nenhuma partida encontrada na API</p>
                      <p className="text-sm mt-2">Usando dados de exemplo:</p>
                      <div className="mt-4 grid gap-4">
                        {[
                          { homeTeam: "Portugal", awayTeam: "França", kickoff_time: "2026-06-20T18:00:00Z", status: "completed", home_score: 2, away_score: 1 },
                          { homeTeam: "Brasil", awayTeam: "Argentina", kickoff_time: "2026-06-21T20:00:00Z", status: "live", home_score: 1, away_score: 2 },
                          { homeTeam: "Alemanha", awayTeam: "Espanha", kickoff_time: "2026-06-22T17:00:00Z", status: "scheduled" }
                        ].map((match, index) => (
                          <Card key={index} className="hover:shadow-lg transition-shadow">
                            <CardContent className="py-6">
                              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                                <div className="flex-1 text-center">
                                  <div className="flex items-center justify-center gap-4">
                                    <div className="text-center">
                                      <p className="text-2xl font-bold">🇵🇹</p>
                                      <p className="text-sm font-medium">{match.homeTeam}</p>
                                    </div>
                                    <div className="text-center">
                                      {match.status === "completed" ? (
                                        <div className="text-2xl font-bold">
                                          {match.home_score} - {match.away_score}
                                        </div>
                                      ) : match.status === "live" ? (
                                        <Badge className="bg-red-100 text-red-800 animate-pulse">
                                          Ao Vivo
                                        </Badge>
                                      ) : (
                                        <Badge className="bg-blue-100 text-blue-800">
                                          Agendado
                                        </Badge>
                                      )}
                                      <p className="text-xs text-muted-foreground mt-1">
                                        {new Date(match.kickoff_time).toLocaleDateString("pt-BR", {
                                          month: "short",
                                          day: "numeric",
                                          hour: "2-digit",
                                          minute: "2-digit",
                                        })}
                                      </p>
                                    </div>
                                    <div className="text-center">
                                      <p className="text-2xl font-bold">🇫🇷</p>
                                      <p className="text-sm font-medium">{match.awayTeam}</p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  ) : (
                    apiMatches.map((match) => (
                      <Card key={match.id} className="hover:shadow-lg transition-shadow">
                        <CardContent className="py-6">
                          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="flex-1 text-center">
                              <div className="flex items-center justify-center gap-4">
                                <div className="text-center">
                                  <p className="text-2xl font-bold">{match.home_team.logo ? <img src={match.home_team.logo} alt={match.home_team.name} className="w-12 h-12 object-contain" /> : "🏴"}</p>
                                  <p className="text-sm font-medium">{match.home_team.name}</p>
                                </div>
                                <div className="text-center">
                                  {match.status === "completed" ? (
                                    <div className="text-2xl font-bold">
                                      {match.home_score} - {match.away_score}
                                    </div>
                                  ) : match.status === "live" ? (
                                    <Badge className="bg-red-100 text-red-800 animate-pulse">
                                      Ao Vivo
                                    </Badge>
                                  ) : (
                                    <Badge className="bg-blue-100 text-blue-800">
                                      Agendado
                                    </Badge>
                                  )}
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {new Date(match.kickoff_time).toLocaleDateString("pt-BR", {
                                      month: "short",
                                      day: "numeric",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </p>
                                </div>
                                <div className="text-center">
                                  <p className="text-2xl font-bold">{match.away_team.logo ? <img src={match.away_team.logo} alt={match.away_team.name} className="w-12 h-12 object-contain" /> : "🏴"}</p>
                                  <p className="text-sm font-medium">{match.away_team.name}</p>
                                </div>
                              </div>
                            </div>
                            {match.venue && (
                              <p className="text-xs text-muted-foreground">
                                {match.venue}
                              </p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* News Tab */}
          <TabsContent value="news" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {news.length === 0 ? (
                <Card className="md:col-span-2">
                  <CardContent className="py-8 text-center text-muted-foreground">
                    Nenhuma notícia disponível no momento
                  </CardContent>
                </Card>
              ) : (
                news.map((article) => (
                  <Card
                    key={article.id}
                    className="hover:shadow-lg transition-shadow cursor-pointer overflow-hidden"
                  >
                    {article.image_url && (
                      <div className="h-40 overflow-hidden">
                        <img
                          src={article.image_url}
                          alt={article.title}
                          className="w-full h-full object-cover hover:scale-105 transition-transform"
                        />
                      </div>
                    )}
                    <CardContent className="py-4">
                      <Badge className="mb-2" variant="outline">
                        {article.category}
                      </Badge>
                      <h3 className="font-bold text-lg mb-2 line-clamp-2">{article.title}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-3">
                        {article.summary}
                      </p>
                      <p className="text-xs text-muted-foreground mt-3">
                        {new Date(article.created_at).toLocaleDateString("pt-BR")}
                      </p>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
