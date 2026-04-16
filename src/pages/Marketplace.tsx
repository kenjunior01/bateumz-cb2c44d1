import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Filter, Ticket, Clock, Users, ArrowRight, MapPin, Gift, Star, Trophy, ThumbsUp, Eye, Video } from "lucide-react";
import { formatMZN } from "@/lib/currency";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PROVINCES } from "@/lib/provinces";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface Raffle {
  id: string;
  title: string;
  slug: string | null;
  prize_title: string;
  prize_value: number;
  ticket_price: number;
  total_tickets: number;
  sold_tickets: number;
  end_date: string | null;
  image_url: string | null;
  status: string;
  raffle_type: string;
  points_cost: number;
  province: string | null;
  city: string | null;
}

interface Contest {
  id: string;
  title: string;
  description: string | null;
  prize_description: string | null;
  image_url: string | null;
  status: string;
  evaluation_type: string;
  end_date: string | null;
  created_at: string;
}

type ContentType = "all" | "raffles" | "contests";

const Marketplace = () => {
  const [raffles, setRaffles] = useState<Raffle[]>([]);
  const [contests, setContests] = useState<Contest[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<"newest" | "ending" | "popular">("newest");
  const [typeFilter, setTypeFilter] = useState<"all" | "paid" | "free" | "points">("all");
  const [provinceFilter, setProvinceFilter] = useState("");
  const [contentType, setContentType] = useState<ContentType>("all");

  useEffect(() => {
    const fetchData = async () => {
      const [rafflesRes, contestsRes] = await Promise.all([
        supabase.from("raffles").select("*").eq("status", "active").order("created_at", { ascending: false }),
        supabase.from("contests").select("*").in("status", ["active", "voting", "completed"]).order("created_at", { ascending: false }),
      ]);
      if (rafflesRes.data) setRaffles(rafflesRes.data as Raffle[]);
      if (contestsRes.data) setContests(contestsRes.data as Contest[]);
      setLoading(false);
    };
    fetchData();
  }, []);

  const filteredRaffles = raffles
    .filter((r) => {
      if (!r.title.toLowerCase().includes(search.toLowerCase()) && !r.prize_title.toLowerCase().includes(search.toLowerCase())) return false;
      if (typeFilter !== "all" && r.raffle_type !== typeFilter) return false;
      if (provinceFilter && r.province !== provinceFilter) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "ending") return (a.end_date || "z").localeCompare(b.end_date || "z");
      if (sortBy === "popular") return b.sold_tickets - a.sold_tickets;
      return 0;
    });

  const filteredContests = contests.filter((c) =>
    c.title.toLowerCase().includes(search.toLowerCase()) ||
    (c.description || "").toLowerCase().includes(search.toLowerCase()) ||
    (c.prize_description || "").toLowerCase().includes(search.toLowerCase())
  );

  const timeLeft = (date: string | null) => {
    if (!date) return "Sem prazo";
    const diff = new Date(date).getTime() - Date.now();
    if (diff <= 0) return "Encerrado";
    const days = Math.floor(diff / 86400000);
    if (days > 0) return `${days}d restantes`;
    const hours = Math.floor(diff / 3600000);
    return `${hours}h restantes`;
  };

  const getRaffleUrl = (raffle: Raffle) => `/raffle/${raffle.slug || raffle.id}`;

  const showRaffles = contentType === "all" || contentType === "raffles";
  const showContests = contentType === "all" || contentType === "contests";

  const contestStatusMap: Record<string, { label: string; color: string }> = {
    active: { label: "Aberto", color: "bg-primary text-primary-foreground" },
    voting: { label: "Em Votação", color: "bg-accent text-accent-foreground" },
    completed: { label: "Encerrado", color: "bg-muted text-muted-foreground" },
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 pt-28 pb-20">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <h1 className="font-display text-4xl font-bold text-foreground mb-2">Marketplace</h1>
          <p className="text-muted-foreground text-lg">Descubra sorteios e concursos incríveis.</p>
        </motion.div>

        <div className="flex flex-col gap-3 mb-8">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Pesquisar sorteios e concursos..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 glass border-border" />
            </div>
            <div className="flex gap-2">
              {(["newest", "ending", "popular"] as const).map((s) => (
                <Button key={s} variant={sortBy === s ? "default" : "outline"} size="sm" onClick={() => setSortBy(s)}>
                  {s === "newest" ? "Recentes" : s === "ending" ? "A terminar" : "Populares"}
                </Button>
              ))}
            </div>
          </div>

          {/* Content type filter */}
          <div className="flex flex-wrap gap-2">
            {([
              { value: "all" as ContentType, label: "🔥 Tudo", icon: null },
              { value: "raffles" as ContentType, label: "🎟️ Sorteios", icon: null },
              { value: "contests" as ContentType, label: "🏆 Concursos", icon: null },
            ]).map((t) => (
              <Button key={t.value} variant={contentType === t.value ? "default" : "outline"} size="sm" onClick={() => setContentType(t.value)}>
                {t.label}
              </Button>
            ))}
          </div>

          {/* Raffle sub-filters */}
          {showRaffles && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="flex flex-wrap gap-2">
              {(["all", "paid", "free", "points"] as const).map((t) => (
                <Button key={t} variant={typeFilter === t ? "default" : "outline"} size="sm" onClick={() => setTypeFilter(t)} className="gap-1">
                  {t === "all" ? "Todos" : t === "paid" ? <><Ticket className="h-3 w-3" /> Pagos</> : t === "free" ? <><Gift className="h-3 w-3" /> Gratuitos</> : <><Star className="h-3 w-3" /> Pontos</>}
                </Button>
              ))}
              <select value={provinceFilter} onChange={(e) => setProvinceFilter(e.target.value)}
                className="h-8 rounded-md border border-border bg-secondary/50 px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                <option value="">📍 Todas Províncias</option>
                {PROVINCES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </motion.div>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : (
          <div className="space-y-10">
            {/* Contests Section */}
            {showContests && filteredContests.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                {contentType === "all" && (
                  <div className="flex items-center gap-2 mb-4">
                    <Trophy className="h-5 w-5 text-primary" />
                    <h2 className="font-display text-xl font-bold text-foreground">Concursos</h2>
                    <Badge variant="secondary">{filteredContests.length}</Badge>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-3">
                  {filteredContests.map((contest, i) => (
                    <motion.div
                      key={contest.id}
                      initial={{ opacity: 0, y: 20, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ delay: i * 0.05, type: "spring", stiffness: 200 }}
                      whileHover={{ y: -4 }}
                    >
                      <Link to={`/concursos/${contest.id}`}>
                        <Card className="glass group hover:border-primary/30 transition-all overflow-hidden h-full">
                          <div className="relative aspect-[4/3] bg-secondary overflow-hidden">
                            {contest.image_url ? (
                              <img src={contest.image_url} alt={contest.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10">
                                <Trophy className="h-12 w-12 text-primary/30" />
                              </div>
                            )}
                            <Badge className={`absolute top-3 left-3 ${contestStatusMap[contest.status]?.color || "bg-muted"}`}>
                              {contestStatusMap[contest.status]?.label || contest.status}
                            </Badge>
                            {contest.end_date && (
                              <Badge variant="outline" className="absolute top-3 right-3 glass text-foreground border-border">
                                <Clock className="h-3 w-3 mr-1" />
                                {timeLeft(contest.end_date)}
                              </Badge>
                            )}
                            <div className="absolute bottom-0 inset-x-0 h-16 bg-gradient-to-t from-black/40 to-transparent" />
                          </div>
                          <CardContent className="p-5">
                            <h3 className="font-display text-lg font-bold text-foreground mb-1 group-hover:text-primary transition-colors">{contest.title}</h3>
                            {contest.description && (
                              <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{contest.description}</p>
                            )}
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                {contest.evaluation_type === "views" ? <><Eye className="h-3 w-3" /> Visualizações</> : <><ThumbsUp className="h-3 w-3" /> Votos</>}
                              </span>
                              {contest.prize_description && (
                                <span className="font-semibold text-primary flex items-center gap-1">
                                  <Trophy className="h-3 w-3" /> {contest.prize_description.length > 20 ? contest.prize_description.slice(0, 20) + "…" : contest.prize_description}
                                </span>
                              )}
                            </div>
                            <div className="mt-4 flex items-center gap-1 text-sm text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                              Participar <ArrowRight className="h-4 w-4" />
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Raffles Section */}
            {showRaffles && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                {contentType === "all" && filteredRaffles.length > 0 && (
                  <div className="flex items-center gap-2 mb-4">
                    <Ticket className="h-5 w-5 text-primary" />
                    <h2 className="font-display text-xl font-bold text-foreground">Sorteios</h2>
                    <Badge variant="secondary">{filteredRaffles.length}</Badge>
                  </div>
                )}
                {filteredRaffles.length === 0 && filteredContests.length === 0 ? (
                  <div className="text-center py-20">
                    <Ticket className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                    <p className="text-xl text-muted-foreground">Nenhum resultado encontrado</p>
                  </div>
                ) : filteredRaffles.length === 0 && contentType !== "all" ? (
                  <div className="text-center py-20">
                    <Ticket className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                    <p className="text-xl text-muted-foreground">Nenhum sorteio encontrado</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-3">
                    {filteredRaffles.map((raffle, i) => {
                      const pct = (raffle.sold_tickets / raffle.total_tickets) * 100;
                      return (
                        <motion.div
                          key={raffle.id}
                          initial={{ opacity: 0, y: 20, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          transition={{ delay: i * 0.05, type: "spring", stiffness: 200 }}
                          whileHover={{ y: -4 }}
                        >
                          <Link to={getRaffleUrl(raffle)}>
                            <Card className="glass group hover:border-primary/30 transition-all overflow-hidden">
                              <div className="relative aspect-[4/3] bg-secondary overflow-hidden">
                                {raffle.image_url ? (
                                  <img src={raffle.image_url} alt={raffle.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <Ticket className="h-12 w-12 text-muted-foreground/20" />
                                  </div>
                                )}
                                <Badge className="absolute top-3 left-3 bg-primary text-primary-foreground font-bold">
                                  {raffle.raffle_type === "free" ? "🎁 Grátis" : raffle.raffle_type === "points" ? `⭐ ${raffle.points_cost} pts` : (raffle as any).hide_prize_value ? "🎁 Surpresa" : formatMZN(raffle.prize_value)}
                                </Badge>
                                {raffle.province && (
                                  <Badge variant="outline" className="absolute bottom-3 left-3 glass text-foreground border-border text-[10px]">
                                    <MapPin className="h-2.5 w-2.5 mr-0.5" />
                                    {PROVINCES.find(p => p.value === raffle.province)?.label || raffle.province}
                                  </Badge>
                                )}
                                {raffle.end_date && (
                                  <Badge variant="outline" className="absolute top-3 right-3 glass text-foreground border-border">
                                    <Clock className="h-3 w-3 mr-1" />
                                    {timeLeft(raffle.end_date)}
                                  </Badge>
                                )}
                              </div>
                              <CardContent className="p-5">
                                <h3 className="font-display text-lg font-bold text-foreground mb-1 group-hover:text-primary transition-colors">{raffle.title}</h3>
                                <p className="text-sm text-primary mb-3">{raffle.prize_title}</p>
                                <Progress value={pct} className="h-2 mb-2" />
                                <div className="flex justify-between items-center text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {raffle.sold_tickets}/{raffle.total_tickets}</span>
                                  <span className="font-semibold text-foreground">
                                    {raffle.raffle_type === "free" ? "Grátis" : raffle.raffle_type === "points" ? `${raffle.points_cost} pts` : `${formatMZN(raffle.ticket_price)}/bilhete`}
                                  </span>
                                </div>
                                <div className="mt-4 flex items-center gap-1 text-sm text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                                  Participar <ArrowRight className="h-4 w-4" />
                                </div>
                              </CardContent>
                            </Card>
                          </Link>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}

            {/* No contests message */}
            {showContests && filteredContests.length === 0 && contentType === "contests" && (
              <div className="text-center py-20">
                <Trophy className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-xl text-muted-foreground">Nenhum concurso encontrado</p>
              </div>
            )}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default Marketplace;
