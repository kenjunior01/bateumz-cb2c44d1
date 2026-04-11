import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Users, Ticket, DollarSign, TrendingUp, ArrowUpRight, Shield, CreditCard, Settings, Activity, Eye, Clock, CheckCircle2, AlertTriangle, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatMZN } from "@/lib/currency";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    users: 0, raffles: 0, activeRaffles: 0, completedRaffles: 0,
    revenue: 0, tickets: 0, pendingPayments: 0, socialEntries: 0,
  });
  const [recentRaffles, setRecentRaffles] = useState<any[]>([]);
  const [recentUsers, setRecentUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [platformStatus, setPlatformStatus] = useState({ maintenance: false, countdownActive: false });

  useEffect(() => {
    const load = async () => {
      const [profilesRes, rafflesRes, pendingRes, socialRes, settingsRes, recentProfilesRes] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("raffles").select("*").order("created_at", { ascending: false }),
        supabase.from("participants").select("id", { count: "exact", head: true }).eq("payment_status", "pending"),
        supabase.from("social_raffle_entries").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("platform_settings").select("key, value"),
        supabase.from("profiles").select("display_name, created_at, avatar_url").order("created_at", { ascending: false }).limit(5),
      ]);

      const raffles = rafflesRes.data || [];
      const revenue = raffles.reduce((s, r) => s + r.sold_tickets * Number(r.ticket_price), 0);
      const tickets = raffles.reduce((s, r) => s + r.sold_tickets, 0);
      const activeRaffles = raffles.filter(r => r.status === "active").length;
      const completedRaffles = raffles.filter(r => r.status === "completed").length;

      setStats({
        users: profilesRes.count || 0,
        raffles: raffles.length,
        activeRaffles,
        completedRaffles,
        revenue,
        tickets,
        pendingPayments: pendingRes.count || 0,
        socialEntries: socialRes.count || 0,
      });
      setRecentRaffles(raffles.slice(0, 5));
      setRecentUsers(recentProfilesRes.data || []);

      if (settingsRes.data) {
        const map = new Map(settingsRes.data.map((s: any) => [s.key, s.value]));
        const maint = map.get("maintenance") as any;
        const feat = map.get("featured") as any;
        setPlatformStatus({
          maintenance: maint?.enabled === true,
          countdownActive: feat?.countdownEnabled === true && !!feat?.raffleId,
        });
      }

      setLoading(false);
    };
    load();
  }, []);

  const statCards = [
    { label: "Utilizadores", value: stats.users.toLocaleString(), icon: Users, color: "text-primary" },
    { label: "Sorteios Activos", value: stats.activeRaffles.toLocaleString(), icon: Activity, color: "text-primary" },
    { label: "Receita Total", value: formatMZN(stats.revenue), icon: DollarSign, color: "text-accent" },
    { label: "Bilhetes Vendidos", value: stats.tickets.toLocaleString(), icon: TrendingUp, color: "text-primary" },
  ];

  const statusConfig: Record<string, { label: string; color: string }> = {
    active: { label: "Activo", color: "bg-primary/10 text-primary border-primary/20" },
    draft: { label: "Rascunho", color: "bg-secondary text-muted-foreground border-border" },
    completed: { label: "Concluído", color: "bg-accent/10 text-accent border-accent/20" },
    cancelled: { label: "Cancelado", color: "bg-destructive/10 text-destructive border-destructive/20" },
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10">
            <Shield className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Painel de Administração</h1>
            <p className="text-sm text-muted-foreground">Visão global da plataforma Bateu</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {platformStatus.maintenance && (
            <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
              <AlertTriangle className="h-3 w-3 mr-1" /> Manutenção
            </Badge>
          )}
          {platformStatus.countdownActive && (
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
              <Clock className="h-3 w-3 mr-1" /> Countdown Activo
            </Badge>
          )}
        </div>
      </div>

      {/* Alert badges */}
      {(stats.pendingPayments > 0 || stats.socialEntries > 0) && (
        <div className="flex flex-wrap gap-3">
          {stats.pendingPayments > 0 && (
            <motion.button
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              onClick={() => navigate("/admin/payments")}
              className="flex items-center gap-2 rounded-xl bg-accent/10 border border-accent/20 px-4 py-2 text-sm text-accent hover:bg-accent/20 transition-colors"
            >
              <CreditCard className="h-4 w-4" />
              <span className="font-semibold">{stats.pendingPayments}</span> pagamentos pendentes
              <ArrowUpRight className="h-3 w-3" />
            </motion.button>
          )}
          {stats.socialEntries > 0 && (
            <motion.button
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              onClick={() => navigate("/admin/raffles")}
              className="flex items-center gap-2 rounded-xl bg-primary/10 border border-primary/20 px-4 py-2 text-sm text-primary hover:bg-primary/20 transition-colors"
            >
              <Eye className="h-4 w-4" />
              <span className="font-semibold">{stats.socialEntries}</span> participações sociais para revisar
              <ArrowUpRight className="h-3 w-3" />
            </motion.button>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card, i) => (
          <motion.div key={card.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
            <Card className="glass">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 ${card.color}`}>
                    <card.icon className="h-5 w-5" />
                  </div>
                </div>
                <p className="mt-3 font-display text-2xl font-bold text-foreground">{card.value}</p>
                <p className="text-xs text-muted-foreground">{card.label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Secondary stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="glass">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <CheckCircle2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-display text-xl font-bold text-foreground">{stats.completedRaffles}</p>
              <p className="text-xs text-muted-foreground">Sorteios Concluídos</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10">
              <Ticket className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="font-display text-xl font-bold text-foreground">{stats.raffles}</p>
              <p className="text-xs text-muted-foreground">Total de Sorteios</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <BarChart3 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-display text-xl font-bold text-foreground">
                {stats.raffles > 0 ? Math.round(stats.tickets / stats.raffles) : 0}
              </p>
              <p className="text-xs text-muted-foreground">Média Bilhetes/Sorteio</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent raffles */}
        <Card className="glass">
          <CardHeader><CardTitle>Sorteios Recentes</CardTitle></CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
            ) : recentRaffles.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">Nenhum sorteio</p>
            ) : (
              <div className="space-y-3">
                {recentRaffles.map((r) => {
                  const sc = statusConfig[r.status] || statusConfig.draft;
                  return (
                    <div key={r.id} className="flex items-center justify-between rounded-xl bg-secondary/30 p-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-foreground truncate">{r.title}</p>
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${sc.color}`}>{sc.label}</Badge>
                          {r.raffle_type === "social" && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-primary/5 text-primary border-primary/20">Social</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{r.sold_tickets}/{r.total_tickets} bilhetes</p>
                      </div>
                      <p className="text-sm font-semibold text-foreground">{formatMZN(r.sold_tickets * Number(r.ticket_price))}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent users + Quick actions */}
        <div className="space-y-6">
          <Card className="glass">
            <CardHeader><CardTitle>Novos Utilizadores</CardTitle></CardHeader>
            <CardContent>
              {recentUsers.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-4">Nenhum utilizador</p>
              ) : (
                <div className="space-y-2">
                  {recentUsers.map((u, i) => (
                    <div key={i} className="flex items-center gap-3 rounded-xl bg-secondary/30 p-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                        {(u.display_name || "U")[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{u.display_name || "Utilizador"}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(u.created_at).toLocaleDateString("pt-MZ")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="glass">
            <CardHeader><CardTitle>Ações Rápidas</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {[
                { label: "Gerir Utilizadores", icon: Users, path: "/admin/users", color: "text-primary" },
                { label: "Gerir Sorteios", icon: Ticket, path: "/admin/raffles", color: "text-accent" },
                { label: "Ver Receitas", icon: DollarSign, path: "/admin/revenue", color: "text-primary" },
                { label: "Aprovar Pagamentos", icon: CreditCard, path: "/admin/payments", color: "text-accent", badge: stats.pendingPayments },
                { label: "Configurações", icon: Settings, path: "/admin/settings", color: "text-primary" },
              ].map((action) => (
                <button
                  key={action.path}
                  onClick={() => navigate(action.path)}
                  className="w-full flex items-center gap-3 rounded-xl bg-secondary/50 p-3 text-sm text-foreground hover:bg-secondary transition"
                >
                  <action.icon className={`h-4 w-4 ${action.color}`} />
                  <span className="flex-1 text-left">{action.label}</span>
                  {action.badge ? (
                    <Badge className="bg-accent/20 text-accent border-accent/30 text-[10px]">{action.badge}</Badge>
                  ) : null}
                </button>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
