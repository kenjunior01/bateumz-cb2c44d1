import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Trophy, Calendar, Users, Ticket, Crown, Star, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { formatMZN } from "@/lib/currency";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import MobileDiscoveryHeader from "@/components/meituan/MobileDiscoveryHeader";
import MeituanSkeleton from "@/components/meituan/MeituanSkeleton";

interface CompletedRaffle {
  id: string;
  title: string;
  slug: string | null;
  prize_title: string;
  prize_value: number;
  total_tickets: number;
  sold_tickets: number;
  image_url: string | null;
  end_date: string | null;
  updated_at: string;
  hide_prize_value: boolean;
  winner_ticket?: number | null;
  winner_name?: string | null;
}

export default function RaffleHistory() {
  const [raffles, setRaffles] = useState<CompletedRaffle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCompleted = async () => {
      const { data: completedRaffles } = await supabase
        .from("raffles")
        .select("id, title, slug, prize_title, prize_value, total_tickets, sold_tickets, image_url, end_date, updated_at, hide_prize_value")
        .eq("status", "completed")
        .order("updated_at", { ascending: false });

      if (completedRaffles && completedRaffles.length > 0) {
        // Fetch blockchain verifications for winner info
        const raffleIds = completedRaffles.map((r) => r.id);
        const { data: verifications } = await supabase
          .from("blockchain_verifications")
          .select("raffle_id, winner_ticket_number")
          .in("raffle_id", raffleIds);

        const verificationMap = new Map(
          (verifications || []).map((v) => [v.raffle_id, v.winner_ticket_number])
        );

        // Fetch winner profiles
        const { data: winners } = await supabase
          .from("participants")
          .select("raffle_id, ticket_number, user_id")
          .in("raffle_id", raffleIds)
          .eq("status", "winner");

        const winnerUserIds = [...new Set((winners || []).map((w) => w.user_id))];
        const { data: profiles } = winnerUserIds.length > 0
          ? await supabase.from("profiles_public").select("user_id, display_name").in("user_id", winnerUserIds)
          : { data: [] };

        const profileMap = new Map((profiles || []).map((p) => [p.user_id, p.display_name]));
        const winnerMap = new Map(
          (winners || []).map((w) => [w.raffle_id, {
            ticket: w.ticket_number,
            name: profileMap.get(w.user_id) || null,
          }])
        );

        const enriched: CompletedRaffle[] = completedRaffles.map((r) => ({
          ...r,
          winner_ticket: verificationMap.get(r.id) || winnerMap.get(r.id)?.ticket || null,
          winner_name: winnerMap.get(r.id)?.name || null,
        }));

        setRaffles(enriched);
      }
      setLoading(false);
    };
    fetchCompleted();
  }, []);

  const maskName = (name: string | null) => {
    if (!name) return "Participante";
    if (name.length <= 3) return name[0] + "***";
    return name.slice(0, 3) + "***" + name.slice(-1);
  };

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "verified" | "surprise">("all");

  const visible = useMemo(() => {
    let list = raffles;
    if (filter === "verified") list = list.filter((r) => !!r.winner_ticket);
    if (filter === "surprise") list = list.filter((r) => r.hide_prize_value);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) => r.title.toLowerCase().includes(q) || r.prize_title.toLowerCase().includes(q)
      );
    }
    return list;
  }, [raffles, search, filter]);

  const chipCategories = [
    { id: "all", label: "Todos", icon: "🏆", count: raffles.length },
    { id: "verified", label: "Verificados", icon: "✅", count: raffles.filter((r) => !!r.winner_ticket).length },
    { id: "surprise", label: "Surpresa", icon: "🎁", count: raffles.filter((r) => r.hide_prize_value).length },
  ];

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navbar />
      <div className="container mx-auto px-3 sm:px-4 pt-2 md:pt-28 pb-10 md:pb-20">
        {/* Mobile sticky header */}
        <MobileDiscoveryHeader
          title="Histórico de Vencedores"
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Pesquisar sorteio ou prémio..."
          categories={chipCategories}
          activeCategory={filter}
          onCategoryChange={(id) => setFilter(id as any)}
        />

        {/* Desktop hero */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="hidden md:block text-center mb-10">
          <Trophy className="h-12 w-12 text-accent mx-auto mb-4" />
          <h1 className="font-display text-3xl font-bold text-foreground mb-2">Histórico de Vencedores</h1>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Todos os sorteios realizados com vencedores verificados na blockchain. Transparência total.
          </p>
        </motion.div>

        {loading ? (
          <div className="mt-4">
            <div className="md:hidden"><MeituanSkeleton count={6} /></div>
            <div className="hidden md:flex justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          </div>
        ) : visible.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
            <Crown className="h-16 w-16 text-muted-foreground/20 mx-auto mb-4" />
            <h2 className="font-display text-xl font-bold text-foreground mb-2">Nenhum vencedor encontrado</h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Tente outra pesquisa ou aguarde novos sorteios concluídos.
            </p>
            <Link to="/marketplace" className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 transition">
              <Ticket className="h-4 w-4" /> Ver Sorteios Activos
            </Link>
          </motion.div>
        ) : (
          <div className="grid gap-3 md:gap-6 grid-cols-2 md:grid-cols-2 lg:grid-cols-3 mt-3 md:mt-0">
            {visible.map((raffle, i) => (
              <motion.div
                key={raffle.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i, 8) * 0.03 }}
              >
                <Link to={`/raffle/${raffle.slug || raffle.id}`}>
                  <Card className="glass group hover:border-accent/40 transition-all overflow-hidden rounded-2xl">
                    <div className="relative aspect-square md:aspect-[4/3] bg-secondary overflow-hidden">
                      {raffle.image_url ? (
                        <img src={raffle.image_url} alt={raffle.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Trophy className="h-10 w-10 text-muted-foreground/20" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
                      <Badge className="absolute top-2 left-2 bg-accent text-accent-foreground font-bold gap-1 text-[10px] md:text-xs px-1.5 py-0.5">
                        <Crown className="h-3 w-3" /> <span className="hidden md:inline">Concluído</span>
                      </Badge>
                      {raffle.winner_ticket && (
                        <div className="absolute bottom-2 right-2">
                          <Badge className="bg-primary text-primary-foreground font-mono text-[10px] md:text-sm px-2 md:px-3">
                            #{raffle.winner_ticket}
                          </Badge>
                        </div>
                      )}
                    </div>
                    <CardContent className="p-2.5 md:p-5">
                      <h3 className="font-display text-sm md:text-lg font-bold text-foreground mb-0.5 md:mb-1 group-hover:text-primary transition-colors line-clamp-1">
                        {raffle.title}
                      </h3>
                      <p className="text-xs md:text-sm text-primary mb-2 md:mb-3 line-clamp-1">{raffle.prize_title}</p>

                      {raffle.winner_name && (
                        <div className="hidden md:flex items-center gap-2 rounded-xl bg-accent/10 border border-accent/20 p-3 mb-3">
                          <div className="h-8 w-8 rounded-full bg-accent/20 flex items-center justify-center">
                            <Star className="h-4 w-4 text-accent" />
                          </div>
                          <div>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Vencedor</p>
                            <p className="text-sm font-semibold text-foreground">{maskName(raffle.winner_name)}</p>
                          </div>
                        </div>
                      )}

                      <div className="hidden md:flex items-center justify-between text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" /> {raffle.sold_tickets} participantes
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(raffle.updated_at).toLocaleDateString("pt-MZ", { day: "numeric", month: "short", year: "numeric" })}
                        </span>
                      </div>

                      <div className="mt-1 md:mt-3 flex items-center justify-between">
                        <Badge variant="outline" className="text-[10px] md:text-xs px-1.5">
                          {raffle.hide_prize_value ? "🎁 Surpresa" : formatMZN(raffle.prize_value)}
                        </Badge>
                        <span className="hidden md:flex items-center gap-1 text-xs text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                          Ver detalhes <ExternalLink className="h-3 w-3" />
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
