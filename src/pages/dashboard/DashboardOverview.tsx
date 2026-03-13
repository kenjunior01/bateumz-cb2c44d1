import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Ticket, Users, TrendingUp, DollarSign, ArrowUpRight, ArrowDownRight,
  Plus, Eye, Clock, CheckCircle2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatMZN } from "@/lib/currency";

const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  active: { label: "Ativo", color: "text-primary", icon: CheckCircle2 },
  draft: { label: "Rascunho", color: "text-accent", icon: Clock },
  completed: { label: "Concluído", color: "text-muted-foreground", icon: CheckCircle2 },
};

export default function DashboardOverview() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [raffles, setRaffles] = useState<any[]>([]);
  const [participantCount, setParticipantCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      // Fetch raffles for this business user
      const { data: rafflesData } = await supabase
        .from("raffles")
        .select("*")
        .eq("business_user_id", user.id)
        .order("created_at", { ascending: false });

      const myRaffles = rafflesData || [];
      setRaffles(myRaffles);

      // Count participants across all user's raffles
      if (myRaffles.length > 0) {
        const raffleIds = myRaffles.map((r) => r.id);
        const { count } = await supabase
          .from("participants")
          .select("id", { count: "exact", head: true })
          .in("raffle_id", raffleIds);
        setParticipantCount(count || 0);
      }
      setLoading(false);
    };
    fetchData();
  }, [user]);

  const totalRevenue = raffles.reduce((s, r) => s + r.sold_tickets * Number(r.ticket_price), 0);
  const activeCount = raffles.filter((r) => r.status === "active").length;

  const stats = [
    { label: "Sorteios Ativos", value: String(activeCount), change: "+3", up: true, icon: Ticket },
    { label: "Participantes", value: participantCount.toLocaleString(), change: "+18%", up: true, icon: Users },
    { label: "Receita Total", value: formatMZN(totalRevenue), change: "+24%", up: true, icon: DollarSign },
    { label: "Taxa de Conversão", value: "4.2%", change: "-0.3%", up: false, icon: TrendingUp },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Painel Geral</h1>
          <p className="text-sm text-muted-foreground">Visão geral da sua plataforma de sorteios</p>
        </div>
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          onClick={() => navigate("/dashboard/raffles/create")}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground glow-primary">
          <Plus className="h-4 w-4" /> Novo Sorteio
        </motion.button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
            <Card className="glass border-glass-border">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <stat.icon className="h-5 w-5" />
                  </div>
                  <span className={`flex items-center gap-1 text-xs font-medium ${stat.up ? "text-primary" : "text-destructive"}`}>
                    {stat.up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                    {stat.change}
                  </span>
                </div>
                <p className="mt-3 font-display text-2xl font-bold text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="lg:col-span-2">
          <Card className="glass border-glass-border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Sorteios Recentes</CardTitle>
                <button onClick={() => navigate("/dashboard/raffles")} className="flex items-center gap-1 text-xs text-primary hover:underline">
                  Ver todos <Eye className="h-3 w-3" />
                </button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
              ) : raffles.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8">Nenhum sorteio criado ainda.</p>
              ) : (
                <div className="space-y-3">
                  {raffles.slice(0, 4).map((raffle) => {
                    const config = statusConfig[raffle.status] || statusConfig.draft;
                    const pct = raffle.total_tickets > 0 ? Math.round((raffle.sold_tickets / raffle.total_tickets) * 100) : 0;
                    return (
                      <div key={raffle.id} className="flex items-center gap-4 rounded-xl bg-secondary/30 p-4">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground truncate text-sm">{raffle.title}</p>
                          <div className="mt-1 flex items-center gap-2">
                            <config.icon className={`h-3 w-3 ${config.color}`} />
                            <span className={`text-xs ${config.color}`}>{config.label}</span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-semibold text-foreground">{formatMZN(raffle.sold_tickets * Number(raffle.ticket_price))}</p>
                          <div className="mt-1 flex items-center gap-2">
                            <div className="h-1.5 w-20 rounded-full bg-secondary">
                              <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-xs text-muted-foreground">{pct}%</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
          <Card className="glass border-glass-border">
            <CardHeader className="pb-3"><CardTitle className="text-lg">Ações Rápidas</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <button onClick={() => navigate("/dashboard/raffles/create")} className="w-full flex items-center gap-3 rounded-xl bg-primary/10 p-3 text-sm text-foreground hover:bg-primary/20 transition">
                <Plus className="h-4 w-4 text-primary" /> Criar novo sorteio
              </button>
              <button onClick={() => navigate("/dashboard/participants")} className="w-full flex items-center gap-3 rounded-xl bg-secondary/50 p-3 text-sm text-foreground hover:bg-secondary transition">
                <Users className="h-4 w-4 text-muted-foreground" /> Ver participantes
              </button>
              <button onClick={() => navigate("/dashboard/analytics")} className="w-full flex items-center gap-3 rounded-xl bg-secondary/50 p-3 text-sm text-foreground hover:bg-secondary transition">
                <TrendingUp className="h-4 w-4 text-muted-foreground" /> Ver analíticas
              </button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
