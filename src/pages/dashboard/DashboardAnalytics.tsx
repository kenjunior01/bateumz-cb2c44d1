import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatMZN } from "@/lib/currency";
import { toast } from "sonner";

const CHART_COLORS = ["#fbbf24", "#3b82f6", "#8b5cf6", "#10b981", "#f43f5e", "#06b6d4", "#f97316", "#84cc16"];

const spring = { type: "spring" as const, stiffness: 300, damping: 30 };

const fadeUp = { initial: { opacity: 0, y: 24 }, animate: { opacity: 1, y: 0 } };

interface GameSession {
  id: string;
  business_user_id: string;
  live_code: string;
  game_type: string;
  game_name: string;
  player_name: string;
  player_count: number;
  score: number;
  prize: string;
  prize_value: number;
  is_winner: boolean;
  duration_seconds: number;
  created_at: string;
}

interface AnalyticsSnapshot {
  date: string;
  total_sessions: number;
  total_players: number;
  total_winners: number;
  total_prize_value: number;
  avg_session_duration: number;
  unique_players: number;
}

interface Raffle {
  id: string;
  title: string;
  ticket_price: number;
  sold_tickets: number;
  total_tickets: number;
  created_at: string;
}

interface Participant {
  id: string;
  raffle_id: string;
  created_at: string;
  payment_status: string;
}

type DateRange = "7d" | "30d" | "90d" | "all";

function useAnimatedCounter(target: number, duration: number = 1200, enabled: boolean = true) {
  const [count, setCount] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!enabled || target === 0) {
      setCount(target);
      return;
    }
    const start = performance.now();
    const step = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step);
      }
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration, enabled]);

  return count;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

function getStartDate(range: DateRange): Date | null {
  if (range === "all") return null;
  const now = new Date();
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

function filterByDate<T extends { created_at: string }>(items: T[], range: DateRange): T[] {
  const start = getStartDate(range);
  if (!start) return items;
  return items.filter((item) => new Date(item.created_at) >= start);
}

const tooltipStyle = {
  backgroundColor: "hsl(240, 5%, 8%)",
  border: "1px solid hsl(240, 4%, 20%)",
  borderRadius: 12,
  color: "hsl(0, 0%, 95%)",
  fontSize: 13,
};

const axisTick = { fill: "hsl(240, 4%, 55%)", fontSize: 12 };
const axisLine = false;
const tickLine = false;

export default function DashboardAnalytics() {
  const { user } = useAuth();
  const [dateRange, setDateRange] = useState<DateRange>("30d");
  const [sessions, setSessions] = useState<GameSession[]>([]);
  const [snapshots, setSnapshots] = useState<AnalyticsSnapshot[]>([]);
  const [raffles, setRaffles] = useState<Raffle[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const promises = [
          supabase
            .from("game_sessions")
            .select("*")
            .eq("business_user_id", user.id)
            .order("created_at", { ascending: false }),
          supabase
            .from("analytics_snapshots")
            .select("*")
            .eq("business_user_id", user.id)
            .order("date", { ascending: true }),
          supabase
            .from("raffles")
            .select("id, title, ticket_price, sold_tickets, total_tickets, created_at")
            .eq("business_user_id", user.id)
            .order("created_at", { ascending: false }),
        ];

        const [sessionsRes, snapshotsRes, rafflesRes] = await Promise.all(promises);

        if (sessionsRes.error) throw sessionsRes.error;
        if (snapshotsRes.error) throw snapshotsRes.error;
        if (rafflesRes.error) throw rafflesRes.error;

        if (cancelled) return;

        const raffleData = (rafflesRes.data as Raffle[]) || [];
        setSessions((sessionsRes.data as GameSession[]) || []);
        setSnapshots((snapshotsRes.data as AnalyticsSnapshot[]) || []);
        setRaffles(raffleData);

        const ids = raffleData.map((r) => r.id);
        if (ids.length > 0) {
          const { data: partData, error: partErr } = await supabase
            .from("participants")
            .select("id, raffle_id, created_at, payment_status")
            .in("raffle_id", ids);
          if (partErr) throw partErr;
          if (!cancelled) setParticipants((partData as Participant[]) || []);
        }
      } catch (e) {
        console.error(e);
        toast.error("Erro ao carregar analíticas");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  const filteredSessions = useMemo(
    () => filterByDate(sessions, dateRange),
    [sessions, dateRange]
  );

  const filteredParticipants = useMemo(
    () => filterByDate(participants, dateRange),
    [participants, dateRange]
  );

  const kpi = useMemo(() => {
    const totalSessions = filteredSessions.length;
    const uniquePlayers = new Set(filteredSessions.map((s) => s.player_name)).size;
    const totalWinners = filteredSessions.filter((s) => s.is_winner).length;
    const totalPrizeValue = filteredSessions.reduce((sum, s) => sum + (Number(s.prize_value) || 0), 0);
    const avgDuration = totalSessions > 0
      ? Math.round(filteredSessions.reduce((sum, s) => sum + (Number(s.duration_seconds) || 0), 0) / totalSessions)
      : 0;
    const winRate = totalSessions > 0 ? Math.round((totalWinners / totalSessions) * 100) : 0;
    return { totalSessions, uniquePlayers, totalWinners, totalPrizeValue, avgDuration, winRate };
  }, [filteredSessions]);

  const animTotalSessions = useAnimatedCounter(kpi.totalSessions, 1400, !loading);
  const animUniquePlayers = useAnimatedCounter(kpi.uniquePlayers, 1400, !loading);
  const animTotalWinners = useAnimatedCounter(kpi.totalWinners, 1400, !loading);
  const animPrizeValue = useAnimatedCounter(kpi.totalPrizeValue, 1600, !loading);
  const animAvgDuration = useAnimatedCounter(kpi.avgDuration, 1200, !loading);
  const animWinRate = useAnimatedCounter(kpi.winRate, 1000, !loading);

  // Sessions by game type (BarChart)
  const sessionsByType = useMemo(() => {
    const map = new Map<string, number>();
    filteredSessions.forEach((s) => {
      const type = s.game_type || s.game_name || "Outro";
      map.set(type, (map.get(type) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, sessions: count }))
      .sort((a, b) => b.sessions - a.sessions)
      .slice(0, 8);
  }, [filteredSessions]);

  const playersOverTime = useMemo(() => {
    const days = dateRange === "7d" ? 7 : dateRange === "30d" ? 30 : dateRange === "90d" ? 90 : 90;
    const now = new Date();
    const buckets: Record<string, { date: string; players: Set<string>; sessions: number }> = {};

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().slice(0, 10);
      buckets[key] = { date: key, players: new Set(), sessions: 0 };
    }

    filteredSessions.forEach((s) => {
      const key = s.created_at?.slice(0, 10);
      if (key && buckets[key]) {
        buckets[key].players.add(s.player_name);
        buckets[key].sessions += 1;
      }
    });

    return Object.values(buckets).map((b) => ({
      date: b.date.slice(5),
      jogadores: b.players.size,
      sessoes: b.sessions,
    }));
  }, [filteredSessions, dateRange]);

  const winLossData = useMemo(() => {
    const wins = filteredSessions.filter((s) => s.is_winner).length;
    const losses = filteredSessions.length - wins;
    return [
      { name: "Vitórias", value: wins, color: "#10b981" },
      { name: "Sem prémio", value: losses, color: "#f43f5e" },
    ];
  }, [filteredSessions]);

  const topGames = useMemo(() => {
    const map = new Map<string, { sessions: number; prize: number; winners: number }>();
    filteredSessions.forEach((s) => {
      const name = s.game_name || s.game_type || "Outro";
      const existing = map.get(name) || { sessions: 0, prize: 0, winners: 0 };
      existing.sessions += 1;
      existing.prize += Number(s.prize_value) || 0;
      if (s.is_winner) existing.winners += 1;
      map.set(name, existing);
    });
    return Array.from(map.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.sessions - a.sessions)
      .slice(0, 6);
  }, [filteredSessions]);

  const recentSessions = useMemo(() => filteredSessions.slice(0, 20), [filteredSessions]);

  const topRaffles = useMemo(
    () =>
      raffles
        .map((r) => ({
          name: r.title,
          revenue: r.sold_tickets * Number(r.ticket_price),
          pct: r.total_tickets > 0 ? Math.round((r.sold_tickets / r.total_tickets) * 100) : 0,
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5),
    [raffles]
  );

  const raffleRevenueData = useMemo(() => {
    const year = new Date().getFullYear();
    const byMonth = Array(12).fill(0);
    filteredParticipants.forEach((p) => {
      const raffle = raffles.find((r) => r.id === p.raffle_id);
      if (!raffle || p.payment_status !== "paid") return;
      const d = new Date(p.created_at);
      if (d.getFullYear() === year) {
        byMonth[d.getMonth()] += Number(raffle.ticket_price) || 0;
      }
    });
    const labels = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    return labels.map((month, i) => ({ month, value: byMonth[i] }));
  }, [filteredParticipants, raffles]);

  const exportCSV = useCallback(() => {
    const headers = ["Jogo", "Jogador", "Pontuação", "Prémio", "Valor (MZN)", "Vencedor", "Duração", "Data"];
    const rows = recentSessions.map((s) => [
      s.game_name || s.game_type || "",
      s.player_name || "",
      s.score ?? "",
      s.prize || "",
      s.prize_value ?? "",
      s.is_winner ? "Sim" : "Não",
      formatDuration(s.duration_seconds || 0),
      s.created_at ? new Date(s.created_at).toLocaleString("pt-MZ") : "",
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.map((c) => `"${c}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analytics_${dateRange}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exportado com sucesso");
  }, [recentSessions, dateRange]);

  const dateRangeButtons: { label: string; value: DateRange }[] = [
    { label: "7 dias", value: "7d" },
    { label: "30 dias", value: "30d" },
    { label: "90 dias", value: "90d" },
    { label: "Tudo", value: "all" },
  ];

  const kpiCards = [
    { label: "Total de Sessões", value: animTotalSessions, suffix: "", icon: "🎯", gradient: "from-amber-500/20 to-orange-500/10", border: "border-amber-500/20" },
    { label: "Jogadores Únicos", value: animUniquePlayers, suffix: "", icon: "👥", gradient: "from-blue-500/20 to-cyan-500/10", border: "border-blue-500/20" },
    { label: "Total de Vencedores", value: animTotalWinners, suffix: "", icon: "🏆", gradient: "from-emerald-500/20 to-green-500/10", border: "border-emerald-500/20" },
    { label: "Valor Total de Prémios", value: animPrizeValue, suffix: " MZN", icon: "💰", gradient: "from-violet-500/20 to-purple-500/10", border: "border-violet-500/20", format: true },
    { label: "Duração Média", value: animAvgDuration, suffix: "s", icon: "⏱️", gradient: "from-rose-500/20 to-pink-500/10", border: "border-rose-500/20" },
    { label: "Taxa de Vitória", value: animWinRate, suffix: "%", icon: "📈", gradient: "from-cyan-500/20 to-teal-500/10", border: "border-cyan-500/20" },
  ];

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Analíticas & Relatórios</h1>
          <p className="text-sm text-muted-foreground">Métricas completas de performance dos seus jogos e sorteios</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-glass-border bg-glass p-0.5">
            {dateRangeButtons.map((btn) => (
              <button
                key={btn.value}
                onClick={() => setDateRange(btn.value)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                  dateRange === btn.value
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={exportCSV} className="gap-1.5">
            <DownloadIcon />
            Exportar CSV
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {kpiCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ ...spring, delay: i * 0.06 }}
          >
            <Card className={`glass relative overflow-hidden ${card.border}`}>
              <CardContent className="p-4">
                <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-60`} />
                <div className="relative z-10">
                  <div className="flex items-center justify-between">
                    <span className="text-lg">{card.icon}</span>
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{card.label}</span>
                  </div>
                  <div className="mt-3">
                    <span className="text-2xl font-bold tabular-nums text-foreground">
                      {card.format ? formatMZN(card.value) : card.value.toLocaleString("pt-MZ")}
                      {card.suffix && !card.format ? card.suffix : ""}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <motion.div {...fadeUp} transition={{ ...spring, delay: 0.15 }}>
          <Card className="glass border-glass-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Sessões por Tipo de Jogo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                {sessionsByType.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={sessionsByType} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 4%, 16%)" />
                      <XAxis dataKey="name" tick={axisTick} axisLine={axisLine} tickLine={tickLine} />
                      <YAxis tick={axisTick} axisLine={axisLine} tickLine={tickLine} allowDecimals={false} />
                      <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "hsl(240, 4%, 12%)" }} />
                      <Bar dataKey="sessions" name="Sessões" radius={[6, 6, 0, 0]}>
                        {sessionsByType.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    Sem dados de sessões no período selecionado
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div {...fadeUp} transition={{ ...spring, delay: 0.2 }}>
          <Card className="glass border-glass-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Jogadores ao Longo do Tempo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                {playersOverTime.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={playersOverTime} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                      <defs>
                        <linearGradient id="playersGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="sessionsGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#fbbf24" stopOpacity={0.2} />
                          <stop offset="100%" stopColor="#fbbf24" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 4%, 16%)" />
                      <XAxis dataKey="date" tick={axisTick} axisLine={axisLine} tickLine={tickLine} />
                      <YAxis tick={axisTick} axisLine={axisLine} tickLine={tickLine} allowDecimals={false} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Area type="monotone" dataKey="jogadores" name="Jogadores" stroke="#3b82f6" strokeWidth={2} fill="url(#playersGrad)" />
                      <Area type="monotone" dataKey="sessoes" name="Sessões" stroke="#fbbf24" strokeWidth={2} fill="url(#sessionsGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    Sem dados no período selecionado
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <motion.div {...fadeUp} transition={{ ...spring, delay: 0.25 }}>
          <Card className="glass border-glass-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Distribuição Vitória / Sem Prémio</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                {filteredSessions.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={winLossData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={90}
                        paddingAngle={3}
                        strokeWidth={0}
                      >
                        {winLossData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    Sem dados no período selecionado
                  </div>
                )}
              </div>
              {filteredSessions.length > 0 && (
                <div className="mt-2 flex justify-center gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-emerald-500" />
                    <span className="text-muted-foreground">Vitórias ({kpi.totalWinners})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-rose-500" />
                    <span className="text-muted-foreground">Sem prémio ({filteredSessions.length - kpi.totalWinners})</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div {...fadeUp} transition={{ ...spring, delay: 0.3 }}>
          <Card className="glass border-glass-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Top Jogos por Sessões</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                {topGames.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topGames} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 4%, 16%)" horizontal={false} />
                      <XAxis type="number" tick={axisTick} axisLine={axisLine} tickLine={tickLine} allowDecimals={false} />
                      <YAxis type="category" dataKey="name" tick={axisTick} axisLine={axisLine} tickLine={tickLine} width={120} />
                      <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "hsl(240, 4%, 12%)" }} />
                      <Bar dataKey="sessions" name="Sessões" radius={[0, 6, 6, 0]}>
                        {topGames.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    Sem dados no período selecionado
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <motion.div {...fadeUp} transition={{ ...spring, delay: 0.35 }}>
        <Card className="glass border-glass-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Histórico Recente de Jogos</CardTitle>
              <span className="text-xs text-muted-foreground">Últimas 20 sessões</span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-glass-border text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-3">Jogo</th>
                    <th className="px-4 py-3">Jogador</th>
                    <th className="px-4 py-3 text-center">Pontuação</th>
                    <th className="px-4 py-3">Prémio</th>
                    <th className="px-4 py-3 text-right">Valor</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-right">Data</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-glass-border">
                  {recentSessions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                        Nenhuma sessão registada no período selecionado
                      </td>
                    </tr>
                  ) : (
                    recentSessions.map((s, i) => (
                      <tr
                        key={s.id}
                        className="transition-colors hover:bg-white/[0.02]"
                        style={{ animationDelay: `${i * 30}ms` }}
                      >
                        <td className="px-4 py-3 font-medium">
                          <div className="flex items-center gap-2">
                            <span
                              className="inline-block h-2 w-2 rounded-full"
                              style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                            />
                            {s.game_name || s.game_type || "—"}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{s.player_name || "—"}</td>
                        <td className="px-4 py-3 text-center tabular-nums font-mono">{s.score ?? "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground">{s.prize || "—"}</td>
                        <td className="px-4 py-3 text-right tabular-nums font-mono">
                          {s.prize_value ? formatMZN(Number(s.prize_value)) : "—"}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {s.is_winner ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
                              ✓ Vencedor
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-white/5 px-2.5 py-0.5 text-xs text-muted-foreground">
                              —
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                          {s.created_at ? new Date(s.created_at).toLocaleDateString("pt-MZ", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <div className="space-y-6">
        <h2 className="font-display text-xl font-bold text-foreground">Analíticas de Sorteios</h2>

        <div className="grid gap-6 lg:grid-cols-2">
          <motion.div {...fadeUp} transition={{ ...spring, delay: 0.4 }}>
            <Card className="glass border-glass-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Receita Mensal de Sorteios (MZN)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={raffleRevenueData}>
                      <defs>
                        <linearGradient id="raffleRevGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 4%, 16%)" />
                      <XAxis dataKey="month" tick={axisTick} axisLine={axisLine} tickLine={tickLine} />
                      <YAxis tick={axisTick} axisLine={axisLine} tickLine={tickLine} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                      <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [formatMZN(value), "Receita"]} />
                      <Area type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} fill="url(#raffleRevGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div {...fadeUp} transition={{ ...spring, delay: 0.45 }}>
            <Card className="glass border-glass-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Top Sorteios por Receita</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {topRaffles.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Ainda sem vendas registadas.</p>
                ) : (
                  topRaffles.map((r, i) => (
                    <div key={r.name} className="flex items-center justify-between rounded-lg bg-white/[0.02] px-3 py-2.5">
                      <div className="flex items-center gap-3">
                        <span
                          className="flex h-7 w-7 items-center justify-center rounded-md text-xs font-bold"
                          style={{ backgroundColor: `${CHART_COLORS[i % CHART_COLORS.length]}22`, color: CHART_COLORS[i % CHART_COLORS.length] }}
                        >
                          {i + 1}
                        </span>
                        <span className="text-sm font-medium truncate max-w-[180px]">{r.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-semibold text-primary">{formatMZN(r.revenue)}</span>
                        <span className="ml-2 text-xs text-muted-foreground">{r.pct}%</span>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

function DownloadIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}