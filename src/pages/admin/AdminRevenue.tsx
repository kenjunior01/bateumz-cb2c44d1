import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { DollarSign, TrendingUp, Ticket, ArrowUpRight, CreditCard, Smartphone, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatMZN } from "@/lib/currency";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

export default function AdminRevenue() {
  const [raffles, setRaffles] = useState<any[]>([]);
  const [participants, setParticipants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const [rafflesRes, participantsRes] = await Promise.all([
        supabase.from("raffles").select("*").order("created_at", { ascending: false }),
        supabase.from("participants").select("*, raffles(title, ticket_price)").order("created_at", { ascending: false }).limit(50),
      ]);
      if (rafflesRes.data) setRaffles(rafflesRes.data);
      if (participantsRes.data) setParticipants(participantsRes.data);
      setLoading(false);
    };
    fetchData();
  }, []);

  const totalRevenue = raffles.reduce((s, r) => s + r.sold_tickets * Number(r.ticket_price), 0);
  const platformFee = totalRevenue * 0.05;
  const totalTickets = raffles.reduce((s, r) => s + r.sold_tickets, 0);
  const avgTicketPrice = totalTickets > 0 ? totalRevenue / totalTickets : 0;

  // Revenue by raffle for chart
  const chartData = raffles
    .filter((r) => r.sold_tickets > 0)
    .slice(0, 8)
    .map((r) => ({
      name: r.title.length > 15 ? r.title.substring(0, 15) + "..." : r.title,
      receita: r.sold_tickets * Number(r.ticket_price),
      comissao: r.sold_tickets * Number(r.ticket_price) * 0.05,
    }));

  const statusData = [
    { name: "Ativos", value: raffles.filter((r) => r.status === "active").length, color: "hsl(var(--primary))" },
    { name: "Rascunhos", value: raffles.filter((r) => r.status === "draft").length, color: "hsl(var(--accent))" },
    { name: "Concluídos", value: raffles.filter((r) => r.status === "completed").length, color: "hsl(var(--muted-foreground))" },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Receitas da Plataforma</h1>
        <p className="text-sm text-muted-foreground">Visão financeira completa da SORTEX</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label: "Receita Total", value: formatMZN(totalRevenue), icon: DollarSign, change: "+24%" },
          { label: "Comissão (5%)", value: formatMZN(platformFee), icon: TrendingUp, change: "+24%" },
          { label: "Bilhetes Vendidos", value: totalTickets.toLocaleString(), icon: Ticket, change: "+18%" },
          { label: "Preço Médio", value: formatMZN(avgTicketPrice), icon: CreditCard, change: "+5%" },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="glass">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <s.icon className="h-5 w-5" />
                  </div>
                  <span className="flex items-center gap-1 text-xs font-medium text-primary">
                    <ArrowUpRight className="h-3 w-3" /> {s.change}
                  </span>
                </div>
                <p className="mt-3 font-display text-2xl font-bold text-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="lg:col-span-2">
          <Card className="glass">
            <CardHeader><CardTitle>Receita por Sorteio</CardTitle></CardHeader>
            <CardContent>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip
                      contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12 }}
                      formatter={(value: number) => formatMZN(value)}
                    />
                    <Bar dataKey="receita" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} name="Receita" />
                    <Bar dataKey="comissao" fill="hsl(var(--accent))" radius={[6, 6, 0, 0]} name="Comissão" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center py-16 text-muted-foreground">Sem dados de receita</p>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="glass">
            <CardHeader><CardTitle>Distribuição de Sorteios</CardTitle></CardHeader>
            <CardContent>
              {statusData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                      {statusData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center py-16 text-muted-foreground">Sem dados</p>
              )}
              <div className="space-y-2 mt-4">
                {statusData.map((d) => (
                  <div key={d.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: d.color }} />
                      <span className="text-muted-foreground">{d.name}</span>
                    </div>
                    <span className="font-medium text-foreground">{d.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
        <Card className="glass">
          <CardHeader><CardTitle>Últimas Transações</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sorteio</TableHead>
                  <TableHead>Bilhete</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {participants.slice(0, 20).map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium text-foreground">
                      {(p.raffles as any)?.title || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">#{p.ticket_number}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={p.payment_status === "completed" ? "bg-primary/10 text-primary" : "bg-accent/10 text-accent"}>
                        {p.payment_status === "completed" ? "Pago" : "Pendente"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(p.created_at).toLocaleDateString("pt-MZ")}
                    </TableCell>
                    <TableCell className="text-right font-medium text-foreground">
                      {formatMZN(Number((p.raffles as any)?.ticket_price || 0))}
                    </TableCell>
                  </TableRow>
                ))}
                {participants.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhuma transação</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
