import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatMZN } from "@/lib/currency";
import { toast } from "sonner";

const MONTH_LABELS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const DAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export default function DashboardAnalytics() {
  const { user } = useAuth();
  const [raffles, setRaffles] = useState<any[]>([]);
  const [participants, setParticipants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const { data: raffleData, error: raffleErr } = await supabase
          .from("raffles")
          .select("id, title, ticket_price, sold_tickets, total_tickets, created_at, prize_title")
          .eq("business_user_id", user.id)
          .order("created_at", { ascending: false });

        if (raffleErr) throw raffleErr;
        setRaffles(raffleData || []);

        const ids = (raffleData || []).map((r) => r.id);
        if (ids.length > 0) {
          const { data: partData, error: partErr } = await supabase
            .from("participants")
            .select("id, raffle_id, created_at, payment_status")
            .in("raffle_id", ids)
            .eq("status", "active");
          if (partErr) throw partErr;
          setParticipants(partData || []);
        }
      } catch (e) {
        console.error(e);
        toast.error("Erro ao carregar analíticas");
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const topRaffles = useMemo(
    () =>
      raffles
        .map((r) => ({
          name: r.title,
          revenue: r.sold_tickets * Number(r.ticket_price),
          pct: r.total_tickets > 0 ? Math.round((r.sold_tickets / r.total_tickets) * 100) : 0,
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 4),
    [raffles],
  );

  const revenueData = useMemo(() => {
    const year = new Date().getFullYear();
    const byMonth = Array(12).fill(0);
    participants.forEach((p) => {
      const raffle = raffles.find((r) => r.id === p.raffle_id);
      if (!raffle || p.payment_status !== "paid") return;
      const d = new Date(p.created_at);
      if (d.getFullYear() === year) {
        byMonth[d.getMonth()] += Number(raffle.ticket_price) || 0;
      }
    });
    return MONTH_LABELS.map((month, i) => ({ month, value: byMonth[i] }));
  }, [participants, raffles]);

  const ticketsData = useMemo(() => {
    const counts = Array(7).fill(0);
    const now = new Date();
    participants.forEach((p) => {
      const d = new Date(p.created_at);
      const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays >= 0 && diffDays < 7) {
        counts[6 - diffDays] += 1;
      }
    });
    return DAY_LABELS.map((day, i) => ({ day, vendidos: counts[i] }));
  }, [participants]);

  const categoryData = useMemo(() => {
    if (topRaffles.length === 0) {
      return [{ name: "Sem dados", value: 100, color: "hsl(240, 4%, 40%)" }];
    }
    const colors = ["hsl(152, 80%, 50%)", "hsl(45, 100%, 60%)", "hsl(200, 80%, 60%)", "hsl(280, 60%, 60%)"];
    const total = topRaffles.reduce((s, r) => s + r.revenue, 0) || 1;
    return topRaffles.map((r, i) => ({
      name: r.name.length > 18 ? r.name.slice(0, 18) + "…" : r.name,
      value: Math.round((r.revenue / total) * 100),
      color: colors[i % colors.length],
    }));
  }, [topRaffles]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Analíticas</h1>
        <p className="text-sm text-muted-foreground">Métricas reais de performance dos seus sorteios</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="glass border-glass-border">
            <CardHeader><CardTitle className="text-lg">Receita Mensal (MZN)</CardTitle></CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueData}>
                    <defs>
                      <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(152, 80%, 50%)" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="hsl(152, 80%, 50%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 4%, 16%)" />
                    <XAxis dataKey="month" tick={{ fill: "hsl(240, 4%, 55%)", fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "hsl(240, 4%, 55%)", fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip contentStyle={{ backgroundColor: "hsl(240, 5%, 8%)", border: "1px solid hsl(240, 4%, 20%)", borderRadius: 12, color: "hsl(0, 0%, 95%)" }}
                      formatter={(value: number) => [formatMZN(value), "Receita"]} />
                    <Area type="monotone" dataKey="value" stroke="hsl(152, 80%, 50%)" strokeWidth={2} fill="url(#revenueGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="glass border-glass-border">
            <CardHeader><CardTitle className="text-lg">Bilhetes Vendidos (7 dias)</CardTitle></CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ticketsData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 4%, 16%)" />
                    <XAxis dataKey="day" tick={{ fill: "hsl(240, 4%, 55%)", fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "hsl(240, 4%, 55%)", fontSize: 12 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: "hsl(240, 5%, 8%)", border: "1px solid hsl(240, 4%, 20%)", borderRadius: 12, color: "hsl(0, 0%, 95%)" }} />
                    <Bar dataKey="vendidos" fill="hsl(45, 100%, 60%)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="glass border-glass-border">
          <CardHeader><CardTitle className="text-lg">Top Sorteios por Receita</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {topRaffles.length === 0 ? (
              <p className="text-sm text-muted-foreground">Ainda sem vendas registadas.</p>
            ) : (
              topRaffles.map((r) => (
                <div key={r.name} className="flex justify-between text-sm">
                  <span className="truncate pr-2">{r.name}</span>
                  <span className="font-semibold text-primary">{formatMZN(r.revenue)}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="glass border-glass-border">
          <CardHeader><CardTitle className="text-lg">Distribuição de Receita</CardTitle></CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, value }) => `${name} ${value}%`}>
                    {categoryData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
