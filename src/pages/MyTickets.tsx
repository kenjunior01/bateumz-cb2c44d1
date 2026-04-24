import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Ticket, Trophy, Clock, CheckCircle2, XCircle, Eye, WifiOff } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatMZN } from "@/lib/currency";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useOnline } from "@/hooks/use-online";

const statusMap: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  active: { label: "Ativo", color: "text-primary bg-primary/10", icon: CheckCircle2 },
  winner: { label: "🏆 Vencedor!", color: "text-accent bg-accent/10 font-bold", icon: Trophy },
  completed: { label: "Concluído", color: "text-muted-foreground bg-muted/30", icon: CheckCircle2 },
  cancelled: { label: "Cancelado", color: "text-destructive bg-destructive/10", icon: XCircle },
  pending: { label: "Pendente", color: "text-yellow-500 bg-yellow-500/10", icon: Clock },
};

const paymentStatusMap: Record<string, { label: string; color: string }> = {
  confirmed: { label: "Confirmado", color: "text-primary bg-primary/10" },
  pending: { label: "Aguardando", color: "text-yellow-500 bg-yellow-500/10" },
  rejected: { label: "Rejeitado", color: "text-destructive bg-destructive/10" },
};

export default function MyTickets() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const online = useOnline();
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "active" | "winner">("all");
  const [fromCache, setFromCache] = useState(false);

  useEffect(() => {
    if (!user) return;
    const cacheKey = `bateu_tickets_${user.id}`;

    // Hydrate from cache first for instant + offline view
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        setTickets(parsed);
        setFromCache(true);
        setLoading(false);
      }
    } catch {}

    if (!navigator.onLine) {
      setLoading(false);
      return;
    }

    const fetchTickets = async () => {
      const { data, error } = await supabase
        .from("participants")
        .select("*, raffles(title, slug, image_url, ticket_price, status, end_date, prize_title)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (!error && data) {
        setTickets(data);
        setFromCache(false);
        try { localStorage.setItem(cacheKey, JSON.stringify(data)); } catch {}
      }
      setLoading(false);
    };
    fetchTickets();
  }, [user, online]);

  const filtered = tickets.filter((t) => {
    if (filter === "active") return t.status === "active" && t.raffles?.status === "active";
    if (filter === "winner") return t.status === "winner";
    return true;
  });

  const winCount = tickets.filter((t) => t.status === "winner").length;
  const activeCount = tickets.filter((t) => t.status === "active" && t.raffles?.status === "active").length;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 pt-28 pb-20">
        {(!online || fromCache) && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-700 dark:text-yellow-400">
            <WifiOff className="h-3.5 w-3.5 shrink-0" />
            <span>
              {online
                ? "A mostrar bilhetes em cache — a sincronizar…"
                : "Estás offline. A mostrar a tua última versão guardada dos bilhetes."}
            </span>
          </div>
        )}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="font-display text-3xl font-bold text-foreground mb-2">Meus Bilhetes</h1>
          <p className="text-muted-foreground">Acompanhe todos os seus bilhetes e resultados</p>
        </motion.div>

        {/* Stats */}
        <div className="grid gap-4 grid-cols-3 mb-8">
          <Card className="glass">
            <CardContent className="p-4 text-center">
              <Ticket className="h-6 w-6 text-primary mx-auto mb-2" />
              <p className="font-display text-2xl font-bold text-foreground">{tickets.length}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </CardContent>
          </Card>
          <Card className="glass">
            <CardContent className="p-4 text-center">
              <Clock className="h-6 w-6 text-accent mx-auto mb-2" />
              <p className="font-display text-2xl font-bold text-foreground">{activeCount}</p>
              <p className="text-xs text-muted-foreground">Ativos</p>
            </CardContent>
          </Card>
          <Card className="glass border-accent/20">
            <CardContent className="p-4 text-center">
              <Trophy className="h-6 w-6 text-accent mx-auto mb-2" />
              <p className="font-display text-2xl font-bold text-accent">{winCount}</p>
              <p className="text-xs text-muted-foreground">Vitórias</p>
            </CardContent>
          </Card>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6">
          {[
            { value: "all" as const, label: "Todos" },
            { value: "active" as const, label: "Ativos" },
            { value: "winner" as const, label: "Vitórias" },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setFilter(tab.value)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                filter === tab.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tickets list */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Ticket className="h-12 w-12 text-muted-foreground/30" />
            <p className="mt-4 text-muted-foreground">Nenhum bilhete encontrado</p>
            <Button onClick={() => navigate("/marketplace")} className="mt-4">
              Explorar Sorteios
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((ticket, i) => {
              const raffle = ticket.raffles;
              const st = statusMap[ticket.status] || statusMap.active;
              const ps = paymentStatusMap[ticket.payment_status] || paymentStatusMap.pending;
              const isWinner = ticket.status === "winner";

              return (
                <motion.div
                  key={ticket.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <Card className={`glass ${isWinner ? "border-accent/40 glow-accent" : ""}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        {raffle?.image_url ? (
                          <img
                            src={raffle.image_url}
                            alt={raffle.title}
                            className="h-14 w-14 rounded-xl object-cover shrink-0"
                          />
                        ) : (
                          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-secondary">
                            <Ticket className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-foreground truncate">{raffle?.title || "Sorteio"}</p>
                            <Badge variant="outline" className={st.color}>
                              {st.label}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            <span>Bilhete #{ticket.ticket_number}</span>
                            <span>·</span>
                            <span>{formatMZN(Number(raffle?.ticket_price || 0))}</span>
                            <span>·</span>
                            <Badge variant="outline" className={`text-[10px] ${ps.color}`}>
                              {ps.label}
                            </Badge>
                          </div>
                          {raffle?.prize_title && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Prémio: {raffle.prize_title}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/raffle/${raffle?.slug || ticket.raffle_id}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
