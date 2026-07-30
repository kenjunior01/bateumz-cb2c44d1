import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { BarChart3, TrendingUp, Users, Trophy, Gamepad2, Clock, Flame, Target, Zap, ArrowUpRight, ArrowDownRight, Download, Calendar, PieChart, Award, Star, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { readHistory, aggregateByGame, exportSessionsCSV, exportGameAggregateCSV, downloadCSV, printSessionsPDF, printGameAggregatePDF, type LiveSession, type GameAggregate } from "@/lib/liveHistory";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const sb: any = supabase;

const fmtDur = (s: number) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
};

const fmtDate = (d: number) => new Date(d).toLocaleDateString("pt-PT", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

const StatCard = ({ icon: Icon, label, value, sub, trend, color }: { icon: any; label: string; value: string | number; sub?: string; trend?: "up" | "down" | "neutral"; color: string }) => (
  <Card className="border-border/50">
    <CardContent className="p-4">
      <div className="flex items-start justify-between">
        <div className={`p-2 rounded-xl`} style={{ backgroundColor: `${color}15` }}>
          <Icon className="h-4 w-4" style={{ color }} />
        </div>
        {trend === "up" && <ArrowUpRight className="h-4 w-4 text-emerald-500" />}
        {trend === "down" && <ArrowDownRight className="h-4 w-4 text-red-500" />}
      </div>
      <div className="mt-3">
        <p className="text-2xl font-black tabular-nums">{value}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">{label}</p>
        {sub && <p className="text-[10px] mt-1" style={{ color }}>{sub}</p>}
      </div>
    </CardContent>
  </Card>
);

const MiniBar = ({ data, color, maxVal }: { data: number[]; color: string; maxVal: number }) => {
  const bars = data.slice(-14);
  return (
    <div className="flex items-end gap-[2px] h-10">
      {bars.map((v, i) => (
        <div key={i} className="flex-1 rounded-t-sm transition-all duration-500" style={{ height: `${maxVal > 0 ? (v / maxVal) * 100 : 0}%`, backgroundColor: color, opacity: 0.3 + (i / bars.length) * 0.7, minWidth: 3 }} />
      ))}
    </div>
  );
};

const DashboardLiveStats = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [dbStats, setDbStats] = useState<any>(null);
  const [period, setPeriod] = useState<"7d" | "30d" | "90d" | "all">("all");

  useEffect(() => {
    setSessions(readHistory());
    const unsub = (window as any).__liveHistorySub;
    if (unsub) {
      const iv = setInterval(() => setSessions(readHistory()), 2000);
      return () => clearInterval(iv);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    const loadDbStats = async () => {
      try {
        const { data } = await sb.from("spin_wheel_sessions").select("*").eq("business_user_id", user?.id || "");
        if (data) setDbStats(data);
      } catch {}
    };
    loadDbStats();
  }, [user]);

  const filtered = useMemo(() => {
    if (period === "all") return sessions;
    const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
    const cutoff = Date.now() - days * 86400000;
    return sessions.filter(s => s.endedAt >= cutoff);
  }, [sessions, period]);

  const aggregates = useMemo(() => aggregateByGame(filtered), [filtered]);

  const stats = useMemo(() => {
    const totalLives = filtered.length;
    const totalDuration = filtered.reduce((a, s) => a + s.durationSec, 0);
    const allEntries = filtered.flatMap(s => s.leaderboard);
    const uniquePlayers = new Set(allEntries.map(e => e.name)).size;
    const totalGames = new Set(allEntries.map(e => e.game)).size;
    const totalWinners = filtered.reduce((a, s) => a + s.winners.length, 0);
    const totalScore = allEntries.reduce((a, e) => a + e.score, 0);
    const avgDuration = totalLives > 0 ? Math.round(totalDuration / totalLives) : 0;
    const avgPlayersPerLive = totalLives > 0 ? Math.round(allEntries.length / totalLives) : 0;
    const topPlayer = aggregates.flatMap(g => g.topPlayers).sort((a, b) => b.score - a.score)[0];
    const mostPlayedGame = aggregates.length > 0 ? aggregates[0] : null;
    const avgScore = allEntries.length > 0 ? Math.round(totalScore / allEntries.length) : 0;
    const dailyActivity = new Map<string, number>();
    filtered.forEach(s => {
      const day = new Date(s.endedAt).toLocaleDateString("pt-PT", { day: "2-digit", month: "short" });
      dailyActivity.set(day, (dailyActivity.get(day) || 0) + s.leaderboard.length);
    });
    const dailyScores = new Map<string, number>();
    filtered.forEach(s => {
      const day = new Date(s.endedAt).toLocaleDateString("pt-PT", { day: "2-digit", month: "short" });
      dailyScores.set(day, (dailyScores.get(day) || 0) + s.leaderboard.reduce((a, e) => a + e.score, 0));
    });
    return { totalLives, totalDuration, uniquePlayers, totalGames, totalWinners, totalScore, avgDuration, avgPlayersPerLive, topPlayer, mostPlayedGame, avgScore, dailyActivity: Array.from(dailyActivity.values()), dailyScores: Array.from(dailyScores.values()), allEntries };
  }, [filtered, aggregates]);

  const gameDistribution = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach(s => s.leaderboard.forEach(e => map.set(e.game || "Outro", (map.get(e.game || "Outro") || 0) + 1)));
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [filtered]);

  const maxDaily = Math.max(...stats.dailyActivity, 1);
  const maxDailyScore = Math.max(...stats.dailyScores, 1);

  const handleExportCSV = () => { downloadCSV("bateu-historico-lives.csv", exportSessionsCSV(filtered)); };
  const handleExportAggregateCSV = () => { downloadCSV("bateu-ranking-jogos.csv", exportGameAggregateCSV(aggregates)); };
  const handlePrintSessions = () => { printSessionsPDF(filtered); };
  const handlePrintAggregate = () => { printGameAggregatePDF(aggregates); };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black font-display flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" />
            Estatisticas das Lives
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Acompanhe tudo sobre os seus jogos ao vivo</p>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={period} onValueChange={(v) => setPeriod(v as any)}>
            <TabsList className="h-8">
              {["7d", "30d", "90d", "all"].map(p => (
                <TabsTrigger key={p} value={p} className="text-[11px] px-3">
                  {p === "all" ? "Tudo" : p}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Radio} label="Total de Lives" value={stats.totalLives} sub={`Duração total: ${fmtDur(stats.totalDuration)}`} trend={stats.totalLives > 0 ? "up" : "neutral"} color="#f59e0b" />
        <StatCard icon={Users} label="Jogadores Unicos" value={stats.uniquePlayers} sub={`Media por live: ${stats.avgPlayersPerLive}`} trend={stats.uniquePlayers > 0 ? "up" : "neutral"} color="#3b82f6" />
        <StatCard icon={Trophy} label="Vencedores" value={stats.totalWinners} sub={`${stats.allEntries.length} participacoes totais`} trend={stats.totalWinners > 0 ? "up" : "neutral"} color="#8b5cf6" />
        <StatCard icon={Gamepad2} label="Jogos Diferentes" value={stats.totalGames} sub={stats.mostPlayedGame ? `Mais jogado: ${stats.mostPlayedGame.game}` : undefined} color="#10b981" />
        <StatCard icon={Zap} label="Pontuacao Total" value={stats.totalScore.toLocaleString()} sub={`Media por participacao: ${stats.avgScore}`} color="#f59e0b" />
        <StatCard icon={Clock} label="Duracao Media" value={fmtDur(stats.avgDuration)} sub={stats.totalLives > 0 ? `${fmtDur(stats.totalDuration)} acumuladas` : undefined} color="#06b6d4" />
        <StatCard icon={Award} label="Melhor Jogador" value={stats.topPlayer?.name || "-"} sub={stats.topPlayer ? `${stats.topPlayer.score} pts em ${stats.topPlayer.plays} jogos` : undefined} color="#f43f5e" />
        <StatCard icon={Flame} label="Engajamento" value={stats.avgPlayersPerLive > 5 ? "Alto" : stats.avgPlayersPerLive > 2 ? "Medio" : "Baixo"} sub={`${stats.avgPlayersPerLive} jogadores/live em media`} color={stats.avgPlayersPerLive > 5 ? "#10b981" : stats.avgPlayersPerLive > 2 ? "#f59e0b" : "#ef4444"} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" /> Atividade Diaria (Participacoes)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.dailyActivity.length > 1 ? (
              <MiniBar data={stats.dailyActivity} color="#f59e0b" maxVal={maxDaily} />
            ) : (
              <p className="text-xs text-muted-foreground py-4 text-center">Dados insuficientes para o grafico</p>
            )}
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" /> Pontuacao Diaria
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.dailyScores.length > 1 ? (
              <MiniBar data={stats.dailyScores} color="#8b5cf6" maxVal={maxDailyScore} />
            ) : (
              <p className="text-xs text-muted-foreground py-4 text-center">Dados insuficientes para o grafico</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <PieChart className="h-4 w-4 text-primary" /> Distribuicao por Jogo
            </CardTitle>
            <span className="text-[10px] text-muted-foreground">{gameDistribution.length} jogos</span>
          </div>
        </CardHeader>
        <CardContent>
          {gameDistribution.length > 0 ? (
            <div className="space-y-2.5">
              {gameDistribution.slice(0, 10).map(([game, count]) => {
                const pct = Math.round((count / stats.allEntries.length) * 100);
                return (
                  <div key={game}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-bold truncate max-w-[60%]">{game}</span>
                      <span className="text-muted-foreground">{count} ({pct}%)</span>
                    </div>
                    <div className="h-2 rounded-full bg-secondary overflow-hidden">
                      <motion.div className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
                        initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, ease: "easeOut" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground py-4 text-center">Nenhuma atividade registada</p>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Trophy className="h-4 w-4 text-primary" /> Ranking por Jogo
            </CardTitle>
            <Button variant="outline" size="sm" onClick={handlePrintAggregate} className="gap-1 text-[10px]">
              <Download className="h-3 w-3" /> PDF
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {aggregates.length > 0 ? aggregates.slice(0, 8).map((g, gi) => (
            <div key={g.game} className="rounded-xl border border-border/50 p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black ${gi === 0 ? "bg-yellow-500 text-black" : "bg-secondary text-secondary-foreground"}`}>{gi + 1}</span>
                  <span className="font-bold text-sm">{g.game}</span>
                </div>
                <div className="flex gap-3 text-[10px]">
                  <span className="text-muted-foreground">{g.plays} jogadas</span>
                  <span className="text-muted-foreground">{g.uniquePlayers} jogadores</span>
                  <span className="text-muted-foreground">{g.livesCount} lives</span>
                </div>
              </div>
              {g.topPlayers.length > 0 && (
                <div className="space-y-1">
                  {g.topPlayers.slice(0, 3).map((p, pi) => (
                    <div key={p.name} className={`flex items-center gap-2 px-2 py-1 rounded-lg ${pi === 0 ? "bg-yellow-500/10" : ""}`}>
                      <Star className={`h-3 w-3 shrink-0 ${pi === 0 ? "text-yellow-500" : pi === 1 ? "text-gray-400" : "text-amber-600"}`} />
                      <span className={`text-xs flex-1 truncate ${pi === 0 ? "font-bold" : ""}`}>{p.name}</span>
                      <span className="text-xs font-bold tabular-nums">{p.score} pts</span>
                      <span className="text-[9px] text-muted-foreground">({p.plays}x)</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )) : (
            <p className="text-xs text-muted-foreground py-4 text-center">Nenhum jogo registado ainda</p>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" /> Historico de Lives
            </CardTitle>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-1 text-[10px]">
                <Download className="h-3 w-3" /> CSV
              </Button>
              <Button variant="outline" size="sm" onClick={handlePrintSessions} className="gap-1 text-[10px]">
                <Download className="h-3 w-3" /> PDF
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length > 0 ? (
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {filtered.map((s, i) => (
                <motion.div key={`${s.code}-${i}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                  className="rounded-xl border border-border/50 p-3 hover:border-primary/30 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <span className="font-mono font-bold text-sm text-primary">{s.code}</span>
                      </div>
                      <div>
                        <p className="text-xs font-bold">Live {s.code}</p>
                        <p className="text-[10px] text-muted-foreground">{fmtDate(s.startedAt)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold">{fmtDur(s.durationSec)}</p>
                      <p className="text-[10px] text-muted-foreground">{s.leaderboard.length} participacoes</p>
                    </div>
                  </div>
                  {s.winners.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {s.winners.map((w, wi) => (
                        <span key={wi} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 text-[10px] font-bold">
                          <Trophy className="h-2.5 w-2.5" /> {w.name}{w.meta ? ` - ${w.meta}` : ""}
                        </span>
                      ))}
                    </div>
                  )}
                  {s.leaderboard.length > 0 && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-[9px] text-muted-foreground">Top:</span>
                      {[...s.leaderboard].sort((a, b) => b.score - a.score).slice(0, 3).map((e, ei) => (
                        <span key={ei} className="text-[10px] font-bold" style={{ color: ei === 0 ? "#f59e0b" : ei === 1 ? "#9ca3af" : "#d97706" }}>{e.name} ({e.score})</span>
                      ))}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center">
              <Gamepad2 className="h-10 w-10 mx-auto mb-2 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Nenhuma live realizada ainda</p>
              <p className="text-xs text-muted-foreground mt-1">Inicie uma live para ver estatisticas aqui</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

function Radio(props: any) { return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/><path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"/><circle cx="12" cy="12" r="2"/><path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"/><path d="M19.1 4.9C23 8.8 23 15.1 19.1 19"/></svg>; }

export default DashboardLiveStats;
