import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const revenueData = [
  { month: "Out", value: 42000 },
  { month: "Nov", value: 58000 },
  { month: "Dez", value: 75000 },
  { month: "Jan", value: 68000 },
  { month: "Fev", value: 95000 },
  { month: "Mar", value: 124800 },
];

const ticketsData = [
  { day: "Seg", vendidos: 120 },
  { day: "Ter", vendidos: 180 },
  { day: "Qua", vendidos: 95 },
  { day: "Qui", vendidos: 240 },
  { day: "Sex", vendidos: 310 },
  { day: "Sáb", vendidos: 420 },
  { day: "Dom", vendidos: 380 },
];

const categoryData = [
  { name: "Automóveis", value: 40, color: "hsl(152, 80%, 50%)" },
  { name: "Tecnologia", value: 25, color: "hsl(45, 100%, 60%)" },
  { name: "Viagens", value: 20, color: "hsl(200, 80%, 60%)" },
  { name: "Lifestyle", value: 15, color: "hsl(280, 60%, 60%)" },
];

const topRaffles = [
  { name: "Setup Gaming RTX 5090", revenue: "R$ 40.000", pct: 100 },
  { name: "Porsche 911 GT3", revenue: "R$ 39.000", pct: 78 },
  { name: "iPhone 16 Pro Max", revenue: "R$ 22.800", pct: 91 },
  { name: "MacBook Pro M4", revenue: "R$ 18.500", pct: 62 },
];

export default function DashboardAnalytics() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">
          Analíticas
        </h1>
        <p className="text-sm text-muted-foreground">
          Métricas detalhadas de performance dos seus sorteios
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Revenue Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="glass border-glass-border">
            <CardHeader>
              <CardTitle className="text-lg">Receita Mensal</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueData}>
                    <defs>
                      <linearGradient
                        id="revenueGrad"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="hsl(152, 80%, 50%)"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="100%"
                          stopColor="hsl(152, 80%, 50%)"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="hsl(240, 4%, 16%)"
                    />
                    <XAxis
                      dataKey="month"
                      tick={{ fill: "hsl(240, 4%, 55%)", fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: "hsl(240, 4%, 55%)", fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => `${v / 1000}k`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(240, 5%, 8%)",
                        border: "1px solid hsl(240, 4%, 20%)",
                        borderRadius: 12,
                        color: "hsl(0, 0%, 95%)",
                      }}
                      formatter={(value: number) => [
                        `R$ ${value.toLocaleString()}`,
                        "Receita",
                      ]}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="hsl(152, 80%, 50%)"
                      strokeWidth={2}
                      fill="url(#revenueGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Tickets Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="glass border-glass-border">
            <CardHeader>
              <CardTitle className="text-lg">Bilhetes Vendidos (Semana)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ticketsData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="hsl(240, 4%, 16%)"
                    />
                    <XAxis
                      dataKey="day"
                      tick={{ fill: "hsl(240, 4%, 55%)", fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: "hsl(240, 4%, 55%)", fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(240, 5%, 8%)",
                        border: "1px solid hsl(240, 4%, 20%)",
                        borderRadius: 12,
                        color: "hsl(0, 0%, 95%)",
                      }}
                    />
                    <Bar
                      dataKey="vendidos"
                      fill="hsl(152, 80%, 50%)"
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Category Pie */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="glass border-glass-border">
            <CardHeader>
              <CardTitle className="text-lg">Por Categoria</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6">
                <div className="h-48 w-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        dataKey="value"
                        strokeWidth={0}
                      >
                        {categoryData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-3">
                  {categoryData.map((cat) => (
                    <div key={cat.name} className="flex items-center gap-3">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: cat.color }}
                      />
                      <span className="text-sm text-foreground">
                        {cat.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {cat.value}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Top Raffles */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="glass border-glass-border">
            <CardHeader>
              <CardTitle className="text-lg">Top Sorteios</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topRaffles.map((r, i) => (
                  <div key={r.name} className="flex items-center gap-4">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {r.name}
                      </p>
                      <div className="mt-1 h-1.5 w-full rounded-full bg-secondary">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${r.pct}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-foreground shrink-0">
                      {r.revenue}
                    </span>
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
