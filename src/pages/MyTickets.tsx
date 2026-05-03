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
    <div className="min-h-screen bg-background pb-20 lg:pb-0">
      <Navbar />
      <div className="container mx-auto px-3 sm:px-4 pt-4 lg:pt-28 pb-10">
        {(!online || fromCache) && (
          <div className="mb-3 flex items-center gap-2 rounded-xl border border-accent/30 bg-accent/10 px-3 py-2 text-xs text-accent-foreground">
            <WifiOff className="h-3.5 w-3.5 shrink-0 text-accent" />
            <span>
              {online
                ? "A mostrar bilhetes em cache — a sincronizar…"
                : "Estás offline. A mostrar a tua última versão guardada dos bilhetes."}
            </span>
          </div>
        )}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-5">
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-1">Meus Bilhetes</h1>
          <p className="text-sm text-muted-foreground">Acompanhe todos os seus bilhetes e resultados</p>
        </motion.div>

        {/* Stats compact horizontal */}
        <div className="grid gap-2 grid-cols-3 mb-5">
          <Card className="glass">
            <CardContent className="p-3 text-center">
              <Ticket className="h-5 w-5 text-primary mx-auto mb-1" />
              <p className="font-display text-xl font-bold text-foreground leading-none">{tickets.length}</p>
              <p className="text-[11px] text-muted-foreground mt-1">Total</p>
            </CardContent>
          </Card>
          <Card className="glass">
            <CardContent className="p-3 text-center">
              <Clock className="h-5 w-5 text-accent mx-auto mb-1" />
              <p className="font-display text-xl font-bold text-foreground leading-none">{activeCount}</p>
              <p className="text-[11px] text-muted-foreground mt-1">Ativos</p>
            </CardContent>
          </Card>
          <Card className="glass border-accent/20">
            <CardContent className="p-3 text-center">
              <Trophy className="h-5 w-5 text-accent mx-auto mb-1" />
              <p className="font-display text-xl font-bold text-accent leading-none">{winCount}</p>
              <p className="text-[11px] text-muted-foreground mt-1">Vitórias</p>
            </CardContent>
          </Card>
        </div>

        {/* Filter tabs - sticky */}
        <div className="sticky top-12 lg:top-0 z-10 -mx-3 sm:-mx-4 px-3 sm:px-4 py-2 bg-background/85 backdrop-blur-xl mb-3 flex gap-2 overflow-x-auto no-scrollbar">
          {[
            { value: "all" as const, label: `Todos (${tickets.length})` },
            { value: "active" as const, label: `Ativos (${activeCount})` },
            { value: "winner" as const, label: `Vitórias (${winCount})` },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setFilter(tab.value)}
              className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
                filter === tab.value
                  ? "bg-primary text-primary-foreground shadow"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tickets list */}
        {loading ? (
          <div className="space-y-2.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="glass">
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="h-14 w-14 rounded-xl bg-muted animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 w-3/4 rounded bg-muted animate-pulse" />
                    <div className="h-3 w-1/2 rounded bg-muted/70 animate-pulse" />
                  </div>
                </CardContent>
              </Card>
            ))}
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
                    <CardContent className="p-3 sm:p-4">
                      <div className="flex items-center gap-3">
                        {raffle?.image_url ? (
                          <img
                            src={raffle.image_url}
                            alt={raffle.title}
                            className="h-14 w-14 sm:h-16 sm:w-16 rounded-xl object-cover shrink-0"
                          />
                        ) : (
                          <div className="flex h-14 w-14 sm:h-16 sm:w-16 shrink-0 items-center justify-center rounded-xl bg-secondary">
                            <Ticket className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="font-semibold text-sm sm:text-base text-foreground truncate flex-1 min-w-0">{raffle?.title || "Sorteio"}</p>
                            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${st.color}`}>
                              {st.label}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1.5 mt-1 text-[11px] sm:text-xs text-muted-foreground flex-wrap">
                            <span className="font-mono">#{ticket.ticket_number}</span>
                            <span>·</span>
                            <span>{formatMZN(Number(raffle?.ticket_price || 0))}</span>
                            <Badge variant="outline" className={`text-[9px] px-1 py-0 ${ps.color}`}>
                              {ps.label}
                            </Badge>
                          </div>
                          {raffle?.prize_title && (
                            <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5 truncate">
                              🏆 {raffle.prize_title}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 shrink-0"
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
