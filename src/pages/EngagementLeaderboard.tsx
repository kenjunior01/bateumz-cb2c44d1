import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, Zap, Trophy, TrendingUp, Star } from "lucide-react";
import { toast } from "sonner";

interface UserEngagement {
  user_id: string;
  user_email: string;
  points: number;
  total_lifetime_points: number;
  rank: number;
}

interface PointsBreakdown {
  reason: string;
  count: number;
  total_points: number;
}

export default function EngagementLeaderboard() {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [leaderboard, setLeaderboard] = useState<UserEngagement[]>([]);
  const [userRank, setUserRank] = useState<UserEngagement | null>(null);
  const [pointsBreakdown, setPointsBreakdown] = useState<PointsBreakdown[]>([]);
  const [timeFilter, setTimeFilter] = useState("all");

  useEffect(() => {
    loadData();
  }, [user, timeFilter]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load global leaderboard
      const { data: leaderboardData, error: leaderboardError } = await supabase
        .from("engagement_points")
        .select("user_id, points, total_lifetime_points")
        .order("points", { ascending: false })
        .limit(100);

      if (leaderboardError) throw leaderboardError;

      // Rank users
      const ranked = (leaderboardData || []).map((entry, index) => ({
        ...entry,
        user_email: `User ${entry.user_id.slice(0, 8)}`,
        rank: index + 1,
      }));

      setLeaderboard(ranked);

      // Find user's rank
      if (user) {
        const userEntry = ranked.find((r) => r.user_id === user.id);
        setUserRank(userEntry || null);

        // Load user's points breakdown
        const { data: breakdownData, error: breakdownError } = await supabase
          .from("engagement_points_log")
          .select("reason")
          .eq("user_id", user.id);

        if (!breakdownError && breakdownData) {
          const breakdown: Record<string, PointsBreakdown> = {};
          breakdownData.forEach((log: any) => {
            if (!breakdown[log.reason]) {
              breakdown[log.reason] = {
                reason: log.reason,
                count: 0,
                total_points: 0,
              };
            }
            breakdown[log.reason].count += 1;
          });

          setPointsBreakdown(Object.values(breakdown));
        }
      }
    } catch (error) {
      console.error("Error loading engagement data:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const getReasonLabel = (reason: string) => {
    const labels: Record<string, string> = {
      raffle_participation: "Participação em Sorteios",
      prediction_made: "Previsão Feita",
      prediction_correct: "Previsão Correta",
      friend_invite: "Convite de Amigo",
      social_share: "Compartilhamento Social",
      contest_entry: "Entrada em Concurso",
      daily_login: "Login Diário",
      achievement: "Conquista Desbloqueada",
    };
    return labels[reason] || reason;
  };

  const getReasonIcon = (reason: string) => {
    switch (reason) {
      case "raffle_participation":
        return "🎰";
      case "prediction_made":
        return "🎯";
      case "prediction_correct":
        return "✅";
      case "friend_invite":
        return "👥";
      case "social_share":
        return "📱";
      case "contest_entry":
        return "🏆";
      case "daily_login":
        return "📅";
      case "achievement":
        return "⭐";
      default:
        return "✨";
    }
  };

  if (authLoading || loading) {
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
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Zap className="h-8 w-8 text-primary" />
            <h1 className="font-display text-3xl font-bold">Pontos de Engajamento</h1>
          </div>
          <p className="text-muted-foreground">
            Acumula pontos participando em sorteios, fazendo previsões e compartilhando
          </p>
        </div>

        {/* User Stats */}
        {userRank && (
          <div className="grid gap-4 md:grid-cols-3 mb-8">
            <Card>
              <CardContent className="py-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Teus Pontos</p>
                    <p className="text-3xl font-bold">{userRank.points}</p>
                  </div>
                  <Zap className="h-8 w-8 text-yellow-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="py-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Tua Posição</p>
                    <p className="text-3xl font-bold">#{userRank.rank}</p>
                  </div>
                  <Trophy className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="py-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Pontos Totais (Carreira)</p>
                    <p className="text-3xl font-bold">{userRank.total_lifetime_points}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tabs */}
        <Tabs defaultValue="leaderboard" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="leaderboard">Ranking Global</TabsTrigger>
            <TabsTrigger value="breakdown">Meu Progresso</TabsTrigger>
          </TabsList>

          {/* Leaderboard Tab */}
          <TabsContent value="leaderboard" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  Top 100 Jogadores
                </CardTitle>
              </CardHeader>
              <CardContent>
                {leaderboard.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhum jogador no ranking ainda
                  </p>
                ) : (
                  <div className="space-y-2">
                    {leaderboard.map((entry) => {
                      const isUser = user && entry.user_id === user.id;
                      const medal =
                        entry.rank === 1 ? "🥇" : entry.rank === 2 ? "🥈" : entry.rank === 3 ? "🥉" : "  ";

                      return (
                        <div
                          key={entry.user_id}
                          className={`flex items-center justify-between p-4 rounded-lg transition-all ${
                            isUser
                              ? "bg-primary/10 border-2 border-primary"
                              : "bg-muted hover:bg-muted/80"
                          }`}
                        >
                          <div className="flex items-center gap-4 flex-1">
                            <span className="text-2xl w-8 text-center">{medal}</span>
                            <div>
                              <p className="font-bold">
                                #{entry.rank} {isUser && "(Você)"}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {entry.user_email}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold flex items-center gap-1">
                              <Zap className="h-5 w-5 text-yellow-500" />
                              {entry.points}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {entry.total_lifetime_points} total
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Breakdown Tab */}
          <TabsContent value="breakdown" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Como Ganhas Pontos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {pointsBreakdown.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Começa a participar para ganhar pontos!
                  </p>
                ) : (
                  <div className="space-y-3">
                    {pointsBreakdown.map((item) => (
                      <div
                        key={item.reason}
                        className="flex items-center justify-between p-4 bg-muted rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">
                            {getReasonIcon(item.reason)}
                          </span>
                          <div>
                            <p className="font-medium">
                              {getReasonLabel(item.reason)}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {item.count} vez{item.count !== 1 ? "es" : ""}
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-lg">
                          +{item.total_points}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}

                {/* Points Guide */}
                <div className="border-t pt-6 mt-6">
                  <h3 className="font-bold mb-4">Guia de Pontos</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>🎰 Participação em Sorteio</span>
                      <Badge>+10 pts</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>🎯 Fazer uma Previsão</span>
                      <Badge>+5 pts</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>✅ Previsão Correta</span>
                      <Badge>+25 pts</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>👥 Convidar um Amigo</span>
                      <Badge>+50 pts</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>📱 Compartilhar em Redes Sociais</span>
                      <Badge>+15 pts</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>🏆 Entrada em Concurso</span>
                      <Badge>+20 pts</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>📅 Login Diário</span>
                      <Badge>+2 pts</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>⭐ Conquista Desbloqueada</span>
                      <Badge>+100 pts</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
