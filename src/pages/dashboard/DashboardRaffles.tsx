import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Search, MoreVertical, Eye, Edit, Trash2, CheckCircle2, Clock, XCircle, Ticket, Trophy, Users,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { toast } from "sonner";

type RaffleStatus = "active" | "draft" | "completed" | "cancelled";

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: typeof Clock }> = {
  active: { label: "Ativo", color: "text-primary", bg: "bg-primary/10", icon: CheckCircle2 },
  draft: { label: "Rascunho", color: "text-accent", bg: "bg-accent/10", icon: Clock },
  completed: { label: "Concluído", color: "text-muted-foreground", bg: "bg-muted/40", icon: CheckCircle2 },
  cancelled: { label: "Cancelado", color: "text-destructive", bg: "bg-destructive/10", icon: XCircle },
  pending_activation: { label: "Aguarda Aprovação", color: "text-orange-500", bg: "bg-orange-500/10", icon: Clock },
  pending_payment: { label: "Aguarda Pagamento", color: "text-yellow-500", bg: "bg-yellow-500/10", icon: Clock },
  rejected: { label: "Rejeitado", color: "text-destructive", bg: "bg-destructive/10", icon: XCircle },
};

const filterTabs: { label: string; value: RaffleStatus | "all" }[] = [
  { label: "Todos", value: "all" },
  { label: "Ativos", value: "active" },
  { label: "Rascunhos", value: "draft" },
  { label: "Concluídos", value: "completed" },
];

export default function DashboardRaffles() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { formatMoney } = useCurrency();
  const [raffles, setRaffles] = useState<any[]>([]);
  const [filter, setFilter] = useState<RaffleStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [drawingRaffle, setDrawingRaffle] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRaffles = async () => {
    if (!user) return;
    const { data } = await supabase.from("raffles").select("*").eq("business_user_id", user.id).order("created_at", { ascending: false });
    if (data) setRaffles(data);
    setLoading(false);
  };

  useEffect(() => { fetchRaffles(); }, [user]);

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("raffles").delete().eq("id", id);
    if (!error) { setRaffles((r) => r.filter((x) => x.id !== id)); toast.success("Sorteio eliminado"); }
    setOpenMenu(null);
  };

  const handleDraw = async (raffle: any) => {
    setDrawingRaffle(raffle.id);
    setOpenMenu(null);
    try {
      const { data: participants } = await supabase.from("participants").select("*").eq("raffle_id", raffle.id).eq("status", "active");
      if (!participants || participants.length === 0) {
        toast.error("Nenhum participante ativo para sortear!");
        setDrawingRaffle(null);
        return;
      }
      const numWinners = Math.min(raffle.max_winners || 1, participants.length);
      const pool = [...participants];
      const winners = [];
      for (let i = 0; i < numWinners; i++) {
        const idx = Math.floor(Math.random() * pool.length);
        winners.push(pool.splice(idx, 1)[0]);
      }
      // Marcar todos os vencedores primeiro
      const winnerIds = winners.map(w => w.id);
      const { error: updateErr } = await supabase.from("participants").update({ status: "winner" }).in("id", winnerIds);
      if (updateErr) throw updateErr;
      // Atribuir pontos de sorte (melhor esforço — erros aqui não bloqueiam o sorteio)
      await Promise.allSettled(
        winners.map(w => supabase.from("luck_points").insert({
          user_id: w.user_id, points: 500, action: "bonus",
          description: `Vencedor do sorteio: ${raffle.title}`, raffle_id: raffle.id,
        }))
      );
      // Finalizar o sorteio
      const { error: raffleErr } = await supabase.from("raffles").update({ status: "completed" }).eq("id", raffle.id);
      if (raffleErr) throw raffleErr;
      const winnerNums = winners.map(w => `#${w.ticket_number}`).join(", ");
      toast.success(`Sorteio realizado! Vencedor${numWinners > 1 ? "es" : ""}: Bilhete ${winnerNums}`);
      fetchRaffles();
    } catch (err: any) {
      console.error("Erro no sorteio:", err);
      toast.error(`Erro ao realizar sorteio: ${err.message || "erro desconhecido"}`);
    } finally {
      setDrawingRaffle(null);
    }
  };

  const handleStatusToggle = async (raffle: any) => {
    const newStatus = raffle.status === "draft" ? "active" : "draft";
    await supabase.from("raffles").update({ status: newStatus }).eq("id", raffle.id);
    toast.success(newStatus === "active" ? "Sorteio ativado!" : "Sorteio pausado");
    fetchRaffles();
    setOpenMenu(null);
  };

  const filtered = raffles.filter((r) => {
    if (filter !== "all" && r.status !== filter) return false;
    if (search && !r.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Meus Sorteios</h1>
          <p className="text-sm text-muted-foreground">Gerir e monitorizar todos os seus sorteios</p>
        </div>
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          onClick={() => navigate("/dashboard/raffles/create")}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground glow-primary">
          <Plus className="h-4 w-4" /> Novo Sorteio
        </motion.button>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2">
          {filterTabs.map((tab) => (
            <button key={tab.value} onClick={() => setFilter(tab.value)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${filter === tab.value ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
              {tab.label}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input type="text" placeholder="Pesquisar sorteios..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full rounded-lg border border-border bg-secondary/50 pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary sm:w-64" />
        </div>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="flex justify-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
        ) : (
          <AnimatePresence mode="popLayout">
            {filtered.map((raffle) => {
              const config = statusConfig[raffle.status as RaffleStatus] || statusConfig.draft;
              const pct = raffle.total_tickets > 0 ? Math.round((raffle.sold_tickets / raffle.total_tickets) * 100) : 0;
              const revenue = raffle.sold_tickets * Number(raffle.ticket_price);
              const isDrawing = drawingRaffle === raffle.id;
              return (
                <motion.div key={raffle.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}>
                  <Card className={`glass border-glass-border ${isDrawing ? "border-accent/50 glow-accent" : ""}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-secondary text-lg">
                          {isDrawing ? (
                            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>
                              <Trophy className="h-6 w-6 text-accent" />
                            </motion.div>
                          ) : (
                            <Ticket className="h-6 w-6 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-foreground truncate">{raffle.title}</p>
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${config.color} ${config.bg}`}>
                              <config.icon className="h-2.5 w-2.5" />{config.label}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {formatMoney(Number(raffle.ticket_price))}/bilhete
                            {raffle.end_date && ` · Encerra ${new Date(raffle.end_date).toLocaleDateString("pt-MZ")}`}
                          </p>
                        </div>
                        <div className="hidden items-center gap-6 md:flex">
                          <div className="text-center">
                            <p className="text-sm font-semibold text-foreground">{raffle.sold_tickets}/{raffle.total_tickets}</p>
                            <div className="mt-1 flex items-center gap-2">
                              <div className="h-1.5 w-16 rounded-full bg-secondary">
                                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-[10px] text-muted-foreground">{pct}%</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-foreground">{formatMoney(revenue)}</p>
                            <p className="text-[10px] text-muted-foreground">Receita</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {raffle.status === "active" && raffle.sold_tickets > 0 && (
                            <>
                              <Button size="sm" variant="outline" className="gap-1 border-primary/50 text-primary hover:bg-primary/10"
                                onClick={() => navigate(`/raffle/${raffle.slug || raffle.id}/live`)}>
                                <Eye className="h-3.5 w-3.5" /> Ao Vivo
                              </Button>
                              <Button size="sm" variant="outline" className="gap-1 border-accent/50 text-accent hover:bg-accent/10"
                                onClick={() => handleDraw(raffle)} disabled={!!drawingRaffle}>
                                <Trophy className="h-3.5 w-3.5" /> Sortear
                              </Button>
                            </>
                          )}
                          <div className="relative">
                            <button onClick={() => setOpenMenu(openMenu === raffle.id ? null : raffle.id)}
                              className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground">
                              <MoreVertical className="h-4 w-4" />
                            </button>
                            <AnimatePresence>
                              {openMenu === raffle.id && (
                                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                                  className="absolute right-0 top-full z-10 mt-1 w-44 rounded-xl glass border border-glass-border p-1">
                                  <button onClick={() => navigate(`/raffle/${raffle.slug || raffle.id}`)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-secondary">
                                    <Eye className="h-3.5 w-3.5" /> Ver detalhes
                                  </button>
                                  {(raffle.status === "draft" || raffle.status === "active" || raffle.status === "pending_activation") && (
                                    <button onClick={() => navigate(`/dashboard/raffles/${raffle.id}/edit`)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-secondary">
                                      <Edit className="h-3.5 w-3.5" /> Editar
                                    </button>
                                   )}
                                  {raffle.raffle_type === "social" && (
                                    <button onClick={() => navigate(`/dashboard/raffles/${raffle.id}/social`)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-secondary">
                                      <Users className="h-3.5 w-3.5" /> Gestão Social
                                    </button>
                                  )}
                                  {(raffle.status === "draft" || raffle.status === "active") && (
                                    <button onClick={() => handleStatusToggle(raffle)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-secondary">
                                      <Edit className="h-3.5 w-3.5" /> {raffle.status === "draft" ? "Ativar" : "Pausar"}
                                    </button>
                                  )}
                                  <button onClick={() => handleDelete(raffle.id)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-destructive hover:bg-destructive/10">
                                    <Trash2 className="h-3.5 w-3.5" /> Eliminar
                                  </button>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}

        {!loading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Ticket className="h-12 w-12 text-muted-foreground/30" />
            <p className="mt-4 text-sm text-muted-foreground">Nenhum sorteio encontrado</p>
            <Button onClick={() => navigate("/dashboard/raffles/create")} className="mt-4 gap-2">
              <Plus className="h-4 w-4" /> Criar primeiro sorteio
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
