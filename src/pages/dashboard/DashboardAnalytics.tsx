import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatMZN } from "@/lib/currency";

const categoryData = [
  { name: "Automóveis", value: 40, color: "hsl(152, 80%, 50%)" },
  { name: "Tecnologia", value: 25, color: "hsl(45, 100%, 60%)" },
  { name: "Viagens", value: 20, color: "hsl(200, 80%, 60%)" },
  { name: "Lifestyle", value: 15, color: "hsl(280, 60%, 60%)" },
];

export default function DashboardAnalytics() {
  const { user } = useAuth();
  const [raffles, setRaffles] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.from("raffles").select("*").eq("business_user_id", user.id).order("created_at", { ascending: false })
      .then(({ data }) => { if (data) setRaffles(data); });
  }, [user]);

  const topRaffles = raffles
    .map((r) => ({ name: r.title, revenue: r.sold_tickets * Number(r.ticket_price), pct: r.total_tickets > 0 ? Math.round((r.sold_tickets / r.total_tickets) * 100) : 0 }))
    .sort((a, b) => b.revenue - a.revenue).slice(0, 4);

  const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun"];
  const revenueData = months.map((m, i) => ({ month: m, value: Math.round(Math.random() * 500000 + (i + 1) * 100000) }));
  const days = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
  const ticketsData = days.map((d) => ({ day: d, vendidos: Math.round(Math.random() * 300 + 50) }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Analíticas</h1>
        <p className="text-sm text-muted-foreground">Métricas detalhadas de performance dos seus sorteios</p>
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
            <CardHeader><CardTitle className="text-lg">Bilhetes Vendidos (Semana)</CardTitle></CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ticketsData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 4%, 16%)" />
                    <XAxis dataKey="day" tick={{ fill: "hsl(240, 4%, 55%)", fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "hsl(240, 4%, 55%)", fontSize: 12 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: "hsl(240, 5%, 8%)", border: "1px solid hsl(240, 4%, 20%)", borderRadius: 12, color: "hsl(0, 0%, 95%)" }} />
                    <Bar dataKey="vendidos" fill="hsl(152, 80%, 50%)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="glass border-glass-border">
            <CardHeader><CardTitle className="text-lg">Por Categoria</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-center gap-6">
                <div className="h-48 w-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={categoryData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" strokeWidth={0}>
                        {categoryData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-3">
                  {categoryData.map((cat) => (
                    <div key={cat.name} className="flex items-center gap-3">
                      <div className="h-3 w-3 rounded-full" style={{ backgroundColor: cat.color }} />
                      <span className="text-sm text-foreground">{cat.name}</span>
                      <span className="text-xs text-muted-foreground">{cat.value}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="glass border-glass-border">
            <CardHeader><CardTitle className="text-lg">Top Sorteios</CardTitle></CardHeader>
            <CardContent>
              {topRaffles.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Crie sorteios para ver as analíticas.</p>
              ) : (
                <div className="space-y-4">
                  {topRaffles.map((r, i) => (
                    <div key={r.name} className="flex items-center gap-4">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{r.name}</p>
                        <div className="mt-1 h-1.5 w-full rounded-full bg-secondary">
                          <div className="h-full rounded-full bg-primary" style={{ width: `${r.pct}%` }} />
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-foreground shrink-0">{formatMZN(r.revenue)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
