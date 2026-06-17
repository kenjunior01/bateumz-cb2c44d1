import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useRegionalTheme } from "@/contexts/RegionalThemeContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, Trophy, TrendingUp, Users, Calendar, Globe, MessageSquare, Zap, ArrowLeft, Users2 } from "lucide-react";
import { toast } from "sonner";
import { awardEngagementPoints } from "@/lib/awardEngagement";

interface Match {
  id: string;
  match_date: string;
  stage: string;
  status: string;
  team_a_goals?: number;
  team_b_goals?: number;
  team_a: { id: string; team_name: string; flag_emoji: string };
  team_b: { id: string; team_name: string; flag_emoji: string };
}

interface UserPrediction {
  id: string;
  match_id: string;
  predicted_team_a_goals: number;
  predicted_team_b_goals: number;
  points: number;
}

interface LeagueRanking {
  user_id: string;
  user_email: string;
  points: number;
  rank: number;
}

export default function WorldCupPredictions() {
  const { user, loading: authLoading } = useAuth();
  const { region } = useRegionalTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [matches, setMatches] = useState<Match[]>([]);
  const [predictions, setPredictions] = useState<Map<string, UserPrediction>>(new Map());
  const [leagues, setLeagues] = useState<any[]>([]);
  const [selectedLeagueId, setSelectedLeagueId] = useState<string | null>(null);
  const [leagueRanking, setLeagueRanking] = useState<LeagueRanking[]>([]);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [userPoints, setUserPoints] = useState(0);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load matches
      const { data: matchesData, error: matchesError } = await supabase
        .from("world_cup_matches")
        .select(`
          id,
          match_date,
          stage,
          status,
          team_a_goals,
          team_b_goals,
          team_a:world_cup_teams!team_a_id(id, team_name, flag_emoji),
          team_b:world_cup_teams!team_b_id(id, team_name, flag_emoji)
        `)
        .order("match_date", { ascending: true });

      if (matchesError) throw matchesError;
      setMatches(matchesData || []);

      // Load user predictions
      const { data: predictionsData, error: predictionsError } = await supabase
        .from("world_cup_predictions")
        .select("*")
        .eq("user_id", user!.id);

      if (predictionsError) throw predictionsError;
      const predMap = new Map();
      (predictionsData || []).forEach((p) => {
        predMap.set(p.match_id, p);
      });
      setPredictions(predMap);

      // Load user's leagues
      const { data: leaguesData, error: leaguesError } = await supabase
        .from("league_participants")
        .select(`
          league_id,
          prediction_leagues(id, name, region_id, league_type)
        `)
        .eq("user_id", user!.id);

      if (leaguesError) throw leaguesError;
      const uniqueLeagues = leaguesData
        ?.map((l) => l.prediction_leagues)
        .filter((v, i, a) => a.findIndex((t) => t.id === v.id) === i) || [];
      setLeagues(uniqueLeagues);
      if (uniqueLeagues.length > 0) {
        setSelectedLeagueId(uniqueLeagues[0].id);
      }

      // Load user engagement points
      const { data: pointsData, error: pointsError } = await supabase
        .from("engagement_points")
        .select("points")
        .eq("user_id", user!.id)
        .single();

      if (!pointsError && pointsData) {
        setUserPoints(pointsData.points);
      }
    } catch (error) {
      console.error("Error loading predictions data:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const loadLeagueRanking = async (leagueId: string) => {
    try {
      const { data, error } = await supabase
        .from("league_participants")
        .select(`
          rank,
          points,
          user_id,
          profiles(user_id)
        `)
        .eq("league_id", leagueId)
        .order("rank", { ascending: true });

      if (error) throw error;

      const ranking = data?.map((p: any) => ({
        user_id: p.user_id,
        user_email: p.profiles?.user_id || "Usuário",
        points: p.points,
        rank: p.rank,
      })) || [];

      setLeagueRanking(ranking);

      const userRankEntry = ranking.find((r) => r.user_id === user!.id);
      setUserRank(userRankEntry?.rank || null);
    } catch (error) {
      console.error("Error loading league ranking:", error);
      toast.error("Erro ao carregar ranking da liga");
    }
  };

  const handlePredictionChange = (matchId: string, field: string, value: number) => {
    const current = predictions.get(matchId) || {
      id: "",
      match_id: matchId,
      predicted_team_a_goals: 0,
      predicted_team_b_goals: 0,
      points: 0,
    };

    const updated = { ...current, [field]: value };
    setPredictions(new Map(predictions).set(matchId, updated));
  };

  const savePredictions = async () => {
    if (!user) return;
    setSaving(true);

    try {
      const toInsert: any[] = [];
      const toUpdate: any[] = [];

      predictions.forEach((pred, matchId) => {
        const match = matches.find((m) => m.id === matchId);
        if (!match || match.status !== "scheduled") return;

        if (pred.id) {
          toUpdate.push({
            id: pred.id,
            predicted_team_a_goals: pred.predicted_team_a_goals,
            predicted_team_b_goals: pred.predicted_team_b_goals,
          });
        } else {
          toInsert.push({
            user_id: user.id,
            match_id: matchId,
            region_id: region?.id || "default-region-id",
            predicted_team_a_goals: pred.predicted_team_a_goals,
            predicted_team_b_goals: pred.predicted_team_b_goals,
          });
        }
      });

      if (toInsert.length > 0) {
        const { error: insertError } = await supabase
          .from("world_cup_predictions")
          .insert(toInsert);
        if (insertError) throw insertError;
      }

      if (toUpdate.length > 0) {
        for (const pred of toUpdate) {
          const { error: updateError } = await supabase
            .from("world_cup_predictions")
            .update({
              predicted_team_a_goals: pred.predicted_team_a_goals,
              predicted_team_b_goals: pred.predicted_team_b_goals,
            })
            .eq("id", pred.id);
          if (updateError) throw updateError;
        }
      }

      toast.success("Previsões salvas com sucesso!");

      if (region?.id && (toInsert.length > 0 || toUpdate.length > 0)) {
        const pts = await awardEngagementPoints(region.id, "prediction_made");
        if (pts.success && pts.pointsAwarded) {
          toast.info(`+${pts.pointsAwarded} pontos de engagement!`);
        }
      }

      loadData();
    } catch (error) {
      console.error("Error saving predictions:", error);
      toast.error("Erro ao salvar previsões");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const scheduledMatches = matches.filter((m) => m.status === "scheduled");
  const completedMatches = matches.filter((m) => m.status === "completed");

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 py-8">
      <div className="container mx-auto px-4">
        {/* Back Button */}
        <div className="mb-4">
          <Link to="/mundial">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Voltar para Central do Mundial
            </Button>
          </Link>
        </div>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Trophy className="h-8 w-8 text-primary" />
            <h1 className="font-display text-3xl font-bold">Bolão do Mundial</h1>
          </div>
          <p className="text-muted-foreground mb-6">
            Faça suas previsões e acumule pontos com seus amigos
          </p>

          {/* Quick Navigation */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
            <Link to="/mundial">
              <Button variant="outline" className="w-full gap-2">
                <Calendar className="h-4 w-4" />
                Jogos
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

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <Card>
            <CardContent className="py-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Seus Pontos</p>
                  <p className="text-3xl font-bold">{userPoints}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-primary opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="py-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Previsões Feitas</p>
                  <p className="text-3xl font-bold">{predictions.size}</p>
                </div>
                <Trophy className="h-8 w-8 text-primary opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="py-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Sua Posição</p>
                  <p className="text-3xl font-bold">
                    {userRank ? `#${userRank}` : "—"}
                  </p>
                </div>
                <Users className="h-8 w-8 text-primary opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="predictions" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="predictions">Fazer Previsões</TabsTrigger>
            <TabsTrigger value="results">Resultados</TabsTrigger>
            <TabsTrigger value="leagues">Ligas</TabsTrigger>
          </TabsList>

          {/* Predictions Tab */}
          <TabsContent value="predictions" className="space-y-4">
            {scheduledMatches.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Nenhum jogo agendado no momento
                </CardContent>
              </Card>
            ) : (
              <>
                {scheduledMatches.map((match) => (
                  <Card key={match.id}>
                    <CardContent className="py-6">
                      <div className="grid gap-4 md:grid-cols-[1fr_auto_1fr_auto_1fr]">
                        {/* Team A */}
                        <div className="text-center">
                          <p className="text-3xl mb-2">{match.team_a.flag_emoji}</p>
                          <p className="font-medium text-sm">{match.team_a.team_name}</p>
                        </div>

                        {/* Team A Goals Input */}
                        <div className="flex flex-col items-center justify-center">
                          <Label className="text-xs text-muted-foreground mb-1">Gols A</Label>
                          <Input
                            type="number"
                            min="0"
                            max="10"
                            value={
                              predictions.get(match.id)?.predicted_team_a_goals || 0
                            }
                            onChange={(e) =>
                              handlePredictionChange(
                                match.id,
                                "predicted_team_a_goals",
                                parseInt(e.target.value) || 0
                              )
                            }
                            className="w-16 text-center"
                          />
                        </div>

                        {/* VS */}
                        <div className="flex items-center justify-center">
                          <span className="text-lg font-bold text-muted-foreground">VS</span>
                        </div>

                        {/* Team B Goals Input */}
                        <div className="flex flex-col items-center justify-center">
                          <Label className="text-xs text-muted-foreground mb-1">Gols B</Label>
                          <Input
                            type="number"
                            min="0"
                            max="10"
                            value={
                              predictions.get(match.id)?.predicted_team_b_goals || 0
                            }
                            onChange={(e) =>
                              handlePredictionChange(
                                match.id,
                                "predicted_team_b_goals",
                                parseInt(e.target.value) || 0
                              )
                            }
                            className="w-16 text-center"
                          />
                        </div>

                        {/* Team B */}
                        <div className="text-center">
                          <p className="text-3xl mb-2">{match.team_b.flag_emoji}</p>
                          <p className="font-medium text-sm">{match.team_b.team_name}</p>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-4 text-center">
                        {new Date(match.match_date).toLocaleDateString("pt-BR", {
                          weekday: "long",
                          month: "long",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </CardContent>
                  </Card>
                ))}

                <div className="flex justify-end">
                  <Button onClick={savePredictions} disabled={saving} size="lg">
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Trophy className="h-4 w-4 mr-2" />
                    )}
                    Salvar Previsões
                  </Button>
                </div>
              </>
            )}
          </TabsContent>

          {/* Results Tab */}
          <TabsContent value="results" className="space-y-4">
            {completedMatches.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Nenhum resultado disponível
                </CardContent>
              </Card>
            ) : (
              completedMatches.map((match) => {
                const pred = predictions.get(match.id);
                const correct =
                  pred &&
                  pred.predicted_team_a_goals === match.team_a_goals &&
                  pred.predicted_team_b_goals === match.team_b_goals;

                return (
                  <Card key={match.id} className={correct ? "border-green-500" : ""}>
                    <CardContent className="py-6">
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex-1 text-center">
                          <div className="flex items-center justify-center gap-4 mb-2">
                            <div>
                              <p className="text-2xl">{match.team_a.flag_emoji}</p>
                              <p className="text-sm font-medium">{match.team_a.team_name}</p>
                            </div>
                            <div className="text-center">
                              <p className="text-2xl font-bold">
                                {match.team_a_goals} - {match.team_b_goals}
                              </p>
                              {correct && (
                                <Badge className="mt-1 bg-green-500">Acertou!</Badge>
                              )}
                            </div>
                            <div>
                              <p className="text-2xl">{match.team_b.flag_emoji}</p>
                              <p className="text-sm font-medium">{match.team_b.team_name}</p>
                            </div>
                          </div>
                          {pred && (
                            <p className="text-xs text-muted-foreground">
                              Sua previsão: {pred.predicted_team_a_goals} -{" "}
                              {pred.predicted_team_b_goals}
                            </p>
                          )}
                        </div>
                        {pred && (
                          <div className="text-center">
                            <p className="text-sm text-muted-foreground">Pontos</p>
                            <p className="text-2xl font-bold">{pred.points}</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>

          {/* Leagues Tab */}
          <TabsContent value="leagues" className="space-y-4">
            {leagues.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  <p className="mb-4">Você ainda não está em nenhuma liga</p>
                  <Button>Criar ou Entrar em uma Liga</Button>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="grid gap-2 mb-4">
                  {leagues.map((league) => (
                    <Button
                      key={league.id}
                      variant={selectedLeagueId === league.id ? "default" : "outline"}
                      onClick={() => {
                        setSelectedLeagueId(league.id);
                        loadLeagueRanking(league.id);
                      }}
                      className="justify-start"
                    >
                      {league.name}
                    </Button>
                  ))}
                </div>

                {selectedLeagueId && leagueRanking.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Ranking da Liga</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {leagueRanking.map((entry) => (
                          <div
                            key={entry.user_id}
                            className={`flex items-center justify-between p-3 rounded-lg ${
                              entry.user_id === user.id
                                ? "bg-primary/10 border border-primary"
                                : "bg-muted"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <Badge variant="outline">#{entry.rank}</Badge>
                              <span className="font-medium">{entry.user_email}</span>
                            </div>
                            <span className="font-bold">{entry.points} pts</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
