import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Users, Ticket, DollarSign, TrendingUp, ArrowUpRight, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatMZN } from "@/lib/currency";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ users: 0, raffles: 0, revenue: 0, tickets: 0 });
  const [recentRaffles, setRecentRaffles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const [profilesRes, rafflesRes] = await Promise.all([
        supabase.from("profiles").select("id"),
        supabase.from("raffles").select("*").order("created_at", { ascending: false }).limit(5),
      ]);

      const raffles = rafflesRes.data || [];
      const revenue = raffles.reduce((s, r) => s + r.sold_tickets * Number(r.ticket_price), 0);
      const tickets = raffles.reduce((s, r) => s + r.sold_tickets, 0);

      setStats({
        users: profilesRes.data?.length || 0,
        raffles: raffles.length,
        revenue,
        tickets,
      });
      setRecentRaffles(raffles);
      setLoading(false);
    };
    fetch();
  }, []);

  const cards = [
    { label: "Utilizadores", value: stats.users.toLocaleString(), icon: Users, change: "+12%" },
    { label: "Sorteios", value: stats.raffles.toLocaleString(), icon: Ticket, change: "+8%" },
    { label: "Receita Total", value: formatMZN(stats.revenue), icon: DollarSign, change: "+24%" },
    { label: "Bilhetes Vendidos", value: stats.tickets.toLocaleString(), icon: TrendingUp, change: "+18%" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10">
          <Shield className="h-5 w-5 text-destructive" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Painel de Administração</h1>
          <p className="text-sm text-muted-foreground">Visão global da plataforma SORTEX</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card, i) => (
          <motion.div key={card.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
            <Card className="glass">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <card.icon className="h-5 w-5" />
                  </div>
                  <span className="flex items-center gap-1 text-xs font-medium text-primary">
                    <ArrowUpRight className="h-3 w-3" /> {card.change}
                  </span>
                </div>
                <p className="mt-3 font-display text-2xl font-bold text-foreground">{card.value}</p>
                <p className="text-xs text-muted-foreground">{card.label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="glass">
          <CardHeader><CardTitle>Sorteios Recentes</CardTitle></CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
            ) : recentRaffles.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">Nenhum sorteio</p>
            ) : (
              <div className="space-y-3">
                {recentRaffles.map((r) => (
                  <div key={r.id} className="flex items-center justify-between rounded-xl bg-secondary/30 p-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">{r.title}</p>
                      <p className="text-xs text-muted-foreground">{r.sold_tickets}/{r.total_tickets} bilhetes</p>
                    </div>
                    <p className="text-sm font-semibold text-foreground">{formatMZN(r.sold_tickets * Number(r.ticket_price))}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader><CardTitle>Ações Rápidas</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <button onClick={() => navigate("/admin/users")} className="w-full flex items-center gap-3 rounded-xl bg-secondary/50 p-3 text-sm text-foreground hover:bg-secondary transition">
              <Users className="h-4 w-4 text-primary" /> Gerir Utilizadores
            </button>
            <button onClick={() => navigate("/admin/raffles")} className="w-full flex items-center gap-3 rounded-xl bg-secondary/50 p-3 text-sm text-foreground hover:bg-secondary transition">
              <Ticket className="h-4 w-4 text-accent" /> Gerir Sorteios
            </button>
            <button onClick={() => navigate("/admin/revenue")} className="w-full flex items-center gap-3 rounded-xl bg-secondary/50 p-3 text-sm text-foreground hover:bg-secondary transition">
              <DollarSign className="h-4 w-4 text-primary" /> Ver Receitas
            </button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
