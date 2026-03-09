import { motion } from "framer-motion";
import {
  Ticket,
  Users,
  TrendingUp,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Eye,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";

const stats = [
  {
    label: "Sorteios Ativos",
    value: "12",
    change: "+3",
    up: true,
    icon: Ticket,
  },
  {
    label: "Participantes Totais",
    value: "8.492",
    change: "+18%",
    up: true,
    icon: Users,
  },
  {
    label: "Receita Mensal",
    value: "R$ 124.800",
    change: "+24%",
    up: true,
    icon: DollarSign,
  },
  {
    label: "Taxa de Conversão",
    value: "4.2%",
    change: "-0.3%",
    up: false,
    icon: TrendingUp,
  },
];

const recentRaffles = [
  {
    name: "Porsche 911 GT3",
    status: "active",
    sold: 78,
    total: 1000,
    revenue: "R$ 39.000",
  },
  {
    name: "iPhone 16 Pro Max",
    status: "active",
    sold: 456,
    total: 500,
    revenue: "R$ 22.800",
  },
  {
    name: "Villa em Algarve",
    status: "pending",
    sold: 0,
    total: 2000,
    revenue: "R$ 0",
  },
  {
    name: "Setup Gaming RTX 5090",
    status: "completed",
    sold: 800,
    total: 800,
    revenue: "R$ 40.000",
  },
];

const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  active: { label: "Ativo", color: "text-primary", icon: CheckCircle2 },
  pending: { label: "Pendente", color: "text-accent", icon: Clock },
  completed: { label: "Concluído", color: "text-muted-foreground", icon: CheckCircle2 },
};

const recentActivity = [
  { text: "João M. comprou 5 bilhetes no sorteio Porsche 911 GT3", time: "2 min" },
  { text: "Novo participante registado: Maria S.", time: "8 min" },
  { text: "Sorteio 'Setup Gaming' atingiu 100% dos bilhetes", time: "1h" },
  { text: "Pagamento de R$ 250 confirmado - Pedro L.", time: "2h" },
  { text: "Sorteio 'iPhone 16 Pro Max' atingiu 91% dos bilhetes", time: "3h" },
];

export default function DashboardOverview() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            Painel Geral
          </h1>
          <p className="text-sm text-muted-foreground">
            Visão geral da sua plataforma de sorteios
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate("/dashboard/raffles/create")}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground glow-primary"
        >
          <Plus className="h-4 w-4" />
          Novo Sorteio
        </motion.button>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
          >
            <Card className="glass border-glass-border">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <stat.icon className="h-5 w-5" />
                  </div>
                  <span
                    className={`flex items-center gap-1 text-xs font-medium ${
                      stat.up ? "text-primary" : "text-destructive"
                    }`}
                  >
                    {stat.up ? (
                      <ArrowUpRight className="h-3 w-3" />
                    ) : (
                      <ArrowDownRight className="h-3 w-3" />
                    )}
                    {stat.change}
                  </span>
                </div>
                <p className="mt-3 font-display text-2xl font-bold text-foreground">
                  {stat.value}
                </p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Raffles */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="lg:col-span-2"
        >
          <Card className="glass border-glass-border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Sorteios Recentes</CardTitle>
                <button
                  onClick={() => navigate("/dashboard/raffles")}
                  className="flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  Ver todos <Eye className="h-3 w-3" />
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentRaffles.map((raffle) => {
                  const config = statusConfig[raffle.status];
                  const pct =
                    raffle.total > 0
                      ? Math.round((raffle.sold / raffle.total) * 100)
                      : 0;
                  return (
                    <div
                      key={raffle.name}
                      className="flex items-center gap-4 rounded-xl bg-secondary/30 p-4"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate text-sm">
                          {raffle.name}
                        </p>
                        <div className="mt-1 flex items-center gap-2">
                          <config.icon className={`h-3 w-3 ${config.color}`} />
                          <span className={`text-xs ${config.color}`}>
                            {config.label}
                          </span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold text-foreground">
                          {raffle.revenue}
                        </p>
                        <div className="mt-1 flex items-center gap-2">
                          <div className="h-1.5 w-20 rounded-full bg-secondary">
                            <div
                              className="h-full rounded-full bg-primary"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {pct}%
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Activity Feed */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
        >
          <Card className="glass border-glass-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Atividade Recente</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.map((a, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                    <div className="min-w-0">
                      <p className="text-sm text-foreground leading-snug">
                        {a.text}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        há {a.time}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
