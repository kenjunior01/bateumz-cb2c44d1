import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Ticket, Search, Eye, Trash2, CheckCircle2, Clock, XCircle, Trophy, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatMZN } from "@/lib/currency";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Link } from "react-router-dom";

const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  active: { label: "Ativo", color: "text-primary bg-primary/10", icon: CheckCircle2 },
  draft: { label: "Rascunho", color: "text-accent bg-accent/10", icon: Clock },
  completed: { label: "Concluído", color: "text-muted-foreground bg-muted/40", icon: Trophy },
  cancelled: { label: "Cancelado", color: "text-destructive bg-destructive/10", icon: XCircle },
};

export default function AdminRaffles() {
  const [raffles, setRaffles] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  const fetchRaffles = async () => {
    const { data } = await supabase.from("raffles").select("*").order("created_at", { ascending: false });
    if (data) setRaffles(data);
    setLoading(false);
  };

  useEffect(() => { fetchRaffles(); }, []);

  const handleDelete = async (id: string) => {
    await supabase.from("participants").delete().eq("raffle_id", id);
    const { error } = await supabase.from("raffles").delete().eq("id", id);
    if (!error) {
      setRaffles((r) => r.filter((x) => x.id !== id));
      toast.success("Sorteio eliminado");
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    await supabase.from("raffles").update({ status }).eq("id", id);
    toast.success(`Status alterado para ${statusConfig[status]?.label || status}`);
    fetchRaffles();
  };

  const filtered = raffles.filter((r) => {
    if (filter !== "all" && r.status !== filter) return false;
    if (search && !r.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const stats = {
    total: raffles.length,
    active: raffles.filter((r) => r.status === "active").length,
    revenue: raffles.reduce((s, r) => s + r.sold_tickets * Number(r.ticket_price), 0),
    tickets: raffles.reduce((s, r) => s + r.sold_tickets, 0),
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Todos os Sorteios</h1>
        <p className="text-sm text-muted-foreground">Supervisão completa de todos os sorteios da plataforma</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label: "Total Sorteios", value: stats.total },
          { label: "Ativos", value: stats.active },
          { label: "Receita Total", value: formatMZN(stats.revenue) },
          { label: "Bilhetes Vendidos", value: stats.tickets.toLocaleString() },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="glass">
              <CardContent className="p-4">
                <p className="font-display text-2xl font-bold text-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Pesquisar sorteios..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <div className="flex gap-2">
          {["all", "active", "draft", "completed", "cancelled"].map((s) => (
            <Button key={s} variant={filter === s ? "default" : "outline"} size="sm" onClick={() => setFilter(s)}>
              {s === "all" ? "Todos" : statusConfig[s]?.label || s}
            </Button>
          ))}
        </div>
      </div>

      <Card className="glass">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sorteio</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Progresso</TableHead>
                  <TableHead>Receita</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => {
                  const config = statusConfig[r.status] || statusConfig.draft;
                  const pct = r.total_tickets > 0 ? Math.round((r.sold_tickets / r.total_tickets) * 100) : 0;
                  return (
                    <TableRow key={r.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-foreground">{r.title}</p>
                          <p className="text-xs text-muted-foreground">{r.prize_title}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={config.color}>
                          <config.icon className="h-3 w-3 mr-1" />{config.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={pct} className="h-2 w-20" />
                          <span className="text-xs text-muted-foreground">{pct}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium text-foreground">
                        {formatMZN(r.sold_tickets * Number(r.ticket_price))}
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-secondary px-2 py-1 rounded">{r.slug || "—"}</code>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          <Link to={`/raffle/${r.slug || r.id}`}>
                            <Button variant="ghost" size="sm"><Eye className="h-3.5 w-3.5" /></Button>
                          </Link>
                          {r.status === "draft" && (
                            <Button variant="ghost" size="sm" onClick={() => handleStatusChange(r.id, "active")}>
                              <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                            </Button>
                          )}
                          {r.status === "active" && (
                            <Button variant="ghost" size="sm" onClick={() => handleStatusChange(r.id, "cancelled")}>
                              <XCircle className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(r.id)}>
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum sorteio encontrado</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
