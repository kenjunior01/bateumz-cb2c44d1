import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area,
} from "recharts";
import {
  Users, CheckCircle2, XCircle, Clock, TrendingUp, Instagram,
  Youtube, Music2, Share2, MessageCircle, Trophy, Target, Eye,
  ArrowUpRight, Zap, Crown,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const platformIcons: Record<string, typeof Instagram> = {
  instagram: Instagram, youtube: Youtube, tiktok: Music2,
  facebook: MessageCircle, twitter: Share2,
};
const platformColors: Record<string, string> = {
  instagram: "hsl(340, 75%, 55%)", youtube: "hsl(0, 70%, 55%)",
  tiktok: "hsl(180, 60%, 50%)", facebook: "hsl(220, 70%, 55%)",
  twitter: "hsl(200, 80%, 55%)",
};

function getTierInfo(missionsCount: number, totalMissions: number) {
  const pct = totalMissions > 0 ? (missionsCount / totalMissions) * 100 : 0;
  if (pct >= 100) return { tier: "Lenda", multiplier: 3, color: "text-amber-400" };
  if (pct >= 75) return { tier: "Super Fã", multiplier: 2, color: "text-purple-400" };
  if (pct >= 50) return { tier: "Engajado", multiplier: 1.5, color: "text-blue-400" };
  return { tier: "Iniciante", multiplier: 1, color: "text-muted-foreground" };
}

export default function SocialAnalytics() {
  const { user } = useAuth();
  const [raffles, setRaffles] = useState<any[]>([]);
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data: r } = await supabase
        .from("raffles")
        .select("*")
        .eq("business_user_id", user.id)
        .eq("raffle_type", "social");
      const socialRaffles = r || [];
      setRaffles(socialRaffles);

      if (socialRaffles.length > 0) {
        const ids = socialRaffles.map((x: any) => x.id);
        const { data: e } = await (supabase as any)
          .from("social_raffle_entries")
          .select("*")
          .in("raffle_id", ids);
        setEntries(e || []);
      }
      setLoading(false);
    };
    fetch();
  }, [user]);

  const stats = useMemo(() => {
    const total = entries.length;
    const approved = entries.filter((e: any) => e.status === "approved").length;
    const rejected = entries.filter((e: any) => e.status === "rejected").length;
    const pending = entries.filter((e: any) => e.status === "pending").length;
    const approvalRate = total > 0 ? Math.round((approved / total) * 100) : 0;

    // Mission stats
    const missionCounts: Record<string, number> = {};
    const platformCounts: Record<string, number> = {};
    entries.forEach((e: any) => {
      const missions = e.missions_completed || [];
      missions.forEach((m: string) => {
        missionCounts[m] = (missionCounts[m] || 0) + 1;
        const platform = m.split("_")[0];
        platformCounts[platform] = (platformCounts[platform] || 0) + 1;
      });
    });

    const topMissions = Object.entries(missionCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([key, count]) => {
        const parts = key.split("_");
        return { key, platform: parts[0], action: parts.slice(1).join("_"), count };
      });

    const platformData = Object.entries(platformCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([platform, count]) => ({
        name: platform.charAt(0).toUpperCase() + platform.slice(1),
        value: count,
        color: platformColors[platform] || "hsl(240, 4%, 40%)",
      }));

    // Tier distribution
    const tierDist: Record<string, number> = { Iniciante: 0, Engajado: 0, "Super Fã": 0, Lenda: 0 };
    entries.forEach((e: any) => {
      const totalMissions = raffles.find((r: any) => r.id === e.raffle_id)?.social_actions?.length || 1;
      const { tier } = getTierInfo((e.missions_completed || []).length, totalMissions);
      tierDist[tier]++;
    });

    // Growth over time (entries per day, last 14 days)
    const now = Date.now();
    const days14 = Array.from({ length: 14 }, (_, i) => {
      const d = new Date(now - (13 - i) * 86400000);
      return { date: d.toISOString().slice(5, 10), count: 0 };
    });
    entries.forEach((e: any) => {
      const d = new Date(e.created_at).toISOString().slice(5, 10);
      const found = days14.find(x => x.date === d);
      if (found) found.count++;
    });

    // Engagement ROI
    const totalMissionsCompleted = entries.reduce((a: number, e: any) => a + (e.missions_completed?.length || 0), 0);
    const avgMissions = total > 0 ? (totalMissionsCompleted / total).toFixed(1) : "0";

    return { total, approved, rejected, pending, approvalRate, topMissions, platformData, tierDist, growthData: days14, avgMissions, totalMissionsCompleted };
  }, [entries, raffles]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const tierColors = [
    { name: "Iniciante", color: "hsl(240, 4%, 50%)", value: stats.tierDist["Iniciante"] },
    { name: "Engajado", color: "hsl(200, 80%, 55%)", value: stats.tierDist["Engajado"] },
    { name: "Super Fã", color: "hsl(280, 60%, 55%)", value: stats.tierDist["Super Fã"] },
    { name: "Lenda", color: "hsl(45, 90%, 55%)", value: stats.tierDist["Lenda"] },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
          <Zap className="h-6 w-6 text-primary" /> Analíticas Sociais
        </h1>
        <p className="text-sm text-muted-foreground">Métricas de engajamento dos sorteios sociais</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Participações", value: stats.total, icon: Users, accent: "text-foreground" },
          { label: "Taxa Aprovação", value: `${stats.approvalRate}%`, icon: CheckCircle2, accent: "text-primary" },
          { label: "Missões Completadas", value: stats.totalMissionsCompleted, icon: Target, accent: "text-blue-400" },
          { label: "Média Missões/User", value: stats.avgMissions, icon: TrendingUp, accent: "text-amber-400" },
        ].map((kpi, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="glass border-glass-border">
              <CardContent className="p-4">
                <kpi.icon className={`h-5 w-5 mb-2 ${kpi.accent}`} />
                <p className="font-display text-2xl font-bold text-foreground">{kpi.value}</p>
                <p className="text-[11px] text-muted-foreground">{kpi.label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Status breakdown */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Pendentes", value: stats.pending, icon: Clock, color: "text-amber-500", bg: "bg-amber-500/10" },
          { label: "Aprovados", value: stats.approved, icon: CheckCircle2, color: "text-primary", bg: "bg-primary/10" },
          { label: "Rejeitados", value: stats.rejected, icon: XCircle, color: "text-destructive", bg: "bg-destructive/10" },
        ].map((s, i) => (
          <Card key={i} className="glass border-glass-border">
            <CardContent className="p-3 flex items-center gap-3">
              <div className={`h-10 w-10 rounded-lg ${s.bg} flex items-center justify-center`}>
                <s.icon className={`h-5 w-5 ${s.color}`} />
              </div>
              <div>
                <p className="font-display text-xl font-bold text-foreground">{s.value}</p>
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Growth chart */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="glass border-glass-border">
            <CardHeader><CardTitle className="text-lg">Crescimento (14 dias)</CardTitle></CardHeader>
            <CardContent>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.growthData}>
                    <defs>
                      <linearGradient id="growthGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(152, 80%, 50%)" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="hsl(152, 80%, 50%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 4%, 16%)" />
                    <XAxis dataKey="date" tick={{ fill: "hsl(240, 4%, 55%)", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "hsl(240, 4%, 55%)", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ backgroundColor: "hsl(240, 5%, 8%)", border: "1px solid hsl(240, 4%, 20%)", borderRadius: 12, color: "hsl(0, 0%, 95%)" }} />
                    <Area type="monotone" dataKey="count" stroke="hsl(152, 80%, 50%)" strokeWidth={2} fill="url(#growthGrad)" name="Participações" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Platform distribution */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="glass border-glass-border">
            <CardHeader><CardTitle className="text-lg">Por Plataforma</CardTitle></CardHeader>
            <CardContent>
              {stats.platformData.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Sem dados ainda</p>
              ) : (
                <div className="flex items-center gap-6">
                  <div className="h-44 w-44 shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={stats.platformData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} dataKey="value" strokeWidth={0}>
                          {stats.platformData.map((e, i) => <Cell key={i} fill={e.color} />)}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2.5">
                    {stats.platformData.map((p) => {
                      const Icon = platformIcons[p.name.toLowerCase()] || Share2;
                      return (
                        <div key={p.name} className="flex items-center gap-2.5">
                          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: p.color }} />
                          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-sm text-foreground">{p.name}</span>
                          <span className="text-xs text-muted-foreground ml-auto">{p.value}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Top missions */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card className="glass border-glass-border">
            <CardHeader><CardTitle className="text-lg">Missões Mais Completadas</CardTitle></CardHeader>
            <CardContent>
              {stats.topMissions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Sem dados ainda</p>
              ) : (
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.topMissions} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 4%, 16%)" horizontal={false} />
                      <XAxis type="number" tick={{ fill: "hsl(240, 4%, 55%)", fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis dataKey="action" type="category" width={100} tick={{ fill: "hsl(240, 4%, 55%)", fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: "hsl(240, 5%, 8%)", border: "1px solid hsl(240, 4%, 20%)", borderRadius: 12, color: "hsl(0, 0%, 95%)" }} />
                      <Bar dataKey="count" fill="hsl(152, 80%, 50%)" radius={[0, 6, 6, 0]} name="Completadas" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Tier distribution */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <Card className="glass border-glass-border">
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Crown className="h-5 w-5 text-amber-400" /> Distribuição por Nível</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-4">
                {tierColors.map((t) => {
                  const maxVal = Math.max(...tierColors.map(x => x.value), 1);
                  const pct = (t.value / maxVal) * 100;
                  return (
                    <div key={t.name}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-foreground">{t.name}</span>
                        <span className="text-sm font-bold text-foreground">{t.value}</span>
                      </div>
                      <div className="h-2.5 rounded-full bg-secondary">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ backgroundColor: t.color }}
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.8, delay: 0.3 }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 p-3 rounded-lg bg-secondary/30 text-xs text-muted-foreground">
                <p className="font-medium text-foreground mb-1">Multiplicadores de Sorte</p>
                <p>Iniciante 1x • Engajado 1.5x • Super Fã 2x • Lenda 3x</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Per-raffle breakdown */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
        <Card className="glass border-glass-border">
          <CardHeader><CardTitle className="text-lg">Sorteios Sociais</CardTitle></CardHeader>
          <CardContent>
            {raffles.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Nenhum sorteio social criado ainda.</p>
            ) : (
              <div className="space-y-3">
                {raffles.map((r: any) => {
                  const rEntries = entries.filter((e: any) => e.raffle_id === r.id);
                  const approved = rEntries.filter((e: any) => e.status === "approved").length;
                  const rate = rEntries.length > 0 ? Math.round((approved / rEntries.length) * 100) : 0;
                  return (
                    <div key={r.id} className="flex items-center gap-4 p-3 rounded-lg bg-secondary/20 hover:bg-secondary/40 transition-colors">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Trophy className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{r.title}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {rEntries.length} participações • {approved} aprovados • {r.social_actions?.length || 0} missões
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-lg font-bold text-foreground">{rate}%</p>
                        <p className="text-[10px] text-muted-foreground">aprovação</p>
                      </div>
                      <Badge variant={r.status === "active" ? "default" : "secondary"} className="text-[10px]">
                        {r.status}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
