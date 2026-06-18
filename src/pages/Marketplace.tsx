import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Filter, Ticket, Clock, Users, ArrowRight, MapPin, Gift, Star, Trophy, ThumbsUp, Eye, Video, X, SlidersHorizontal, Gamepad2, Zap } from "lucide-react";
import { formatMZN } from "@/lib/currency";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PROVINCES } from "@/lib/provinces";
import { getRegions } from "@/lib/regions";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CountryRegionFilter from "@/components/CountryRegionFilter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import MobileDiscoveryHeader from "@/components/meituan/MobileDiscoveryHeader";
import MobileFilterSheet from "@/components/meituan/MobileFilterSheet";
import MarketplaceEmptyState from "@/components/MarketplaceEmptyState";
import { useLanguage } from "@/contexts/LanguageContext";

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

type ContentType = "all" | "raffles" | "contests" | "games";

const Marketplace = () => {
  const { t } = useLanguage();
  const [raffles, setRaffles] = useState<Raffle[]>([]);
  const [contests, setContests] = useState<Contest[]>([]);
  const [games, setGames] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<"newest" | "ending" | "popular">("newest");
  const [typeFilter, setTypeFilter] = useState<"all" | "paid" | "free" | "points">("all");
  const [country, setCountry] = useState("");
  const [region, setRegion] = useState("");
  const [searchParams] = useSearchParams();
  const [contentType, setContentType] = useState<ContentType>((searchParams.get("tab") as ContentType) || "all");
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    const tab = searchParams.get("tab") as ContentType;
    if (tab && (tab === "all" || tab === "raffles" || tab === "contests" || tab === "games")) {
      setContentType(tab);
    }
    const q = searchParams.get("q");
    if (q) setSearch(q);
    const filter = searchParams.get("filter");
    if (filter) {
      switch (filter) {
        case "trending":
          setSortBy("popular");
          break;
        case "new":
          setSortBy("newest");
          break;
        case "ending":
          setSortBy("ending");
          break;
        case "cheap":
          setTypeFilter("free");
          setContentType("raffles");
          break;
        case "premium":
          setSortBy("popular");
          setContentType("raffles");
          break;
      }
    }
  }, [searchParams]);

  useEffect(() => {
    const fetchData = async () => {
      const [rafflesRes, contestsRes, spinRes, millRes] = await Promise.all([
        supabase.from("raffles").select("*").eq("status", "active").order("created_at", { ascending: false }),
        supabase.from("contests").select("*").in("status", ["active", "voting", "completed"]).order("created_at", { ascending: false }),
        supabase.from("spin_wheel_games").select("*").eq("is_published", true),
        supabase.from("millionaire_games").select("*").eq("is_published", true),
      ]);
      if (rafflesRes.data) setRaffles(rafflesRes.data as Raffle[]);
      if (contestsRes.data) setContests(contestsRes.data as Contest[]);
      
      const allGames = [
        ...(spinRes.data || []).map(g => ({ ...g, type: 'spin' })),
        ...(millRes.data || []).map(g => ({ ...g, type: 'millionaire' }))
      ];
      setGames(allGames);
      setLoading(false);
    };
    fetchData();
  }, []);

  const filteredRaffles = raffles
    .filter((r) => {
      if (!r.title.toLowerCase().includes(search.toLowerCase()) && !r.prize_title.toLowerCase().includes(search.toLowerCase())) return false;
      if (typeFilter !== "all" && r.raffle_type !== typeFilter) return false;
      if (region && r.province !== region) return false;
      if (country && !region) {
        const regs = getRegions(country).map((x) => x.value);
        if (r.province && !regs.includes(r.province)) return false;
      }
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
  const showGames = contentType === "all" || contentType === "games";

  const contestStatusMap: Record<string, { label: string; color: string }> = {
    active: { label: "Aberto", color: "bg-primary text-primary-foreground" },
    voting: { label: "Em Votação", color: "bg-accent text-accent-foreground" },
    completed: { label: "Encerrado", color: "bg-muted text-muted-foreground" },
  };

  const activeFilterCount =
    (typeFilter !== "all" ? 1 : 0) +
    (contentType !== "all" ? 1 : 0) +
    (country ? 1 : 0) +
    (region ? 1 : 0) +
    (sortBy !== "newest" ? 1 : 0);

  const sortLabel = sortBy === "newest" ? "Recentes" : sortBy === "ending" ? "A terminar" : "Populares";
  const typeLabel = typeFilter === "all" ? null : typeFilter === "paid" ? "Pagos" : typeFilter === "free" ? "Gratuitos" : "Pontos";
  const contentLabel = contentType === "all" ? null : contentType === "raffles" ? "Sorteios" : "Concursos";

  const FiltersBody = () => (
    <div className="space-y-5">
      <div>
        <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Tipo de conteúdo</p>
        <div className="flex flex-wrap gap-2">
          {([
            { value: "all" as ContentType, label: "🔥 Tudo" },
            { value: "raffles" as ContentType, label: "🎟️ Sorteios" },
            { value: "contests" as ContentType, label: "🏆 Concursos" },
            { value: "games" as ContentType, label: "🎮 Jogos" },
          ]).map((t) => (
            <Button key={t.value} variant={contentType === t.value ? "default" : "outline"} size="sm" onClick={() => setContentType(t.value)}>
              {t.label}
            </Button>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Ordenar</p>
        <div className="flex flex-wrap gap-2">
          {(["newest", "ending", "popular"] as const).map((s) => (
            <Button key={s} variant={sortBy === s ? "default" : "outline"} size="sm" onClick={() => setSortBy(s)}>
              {s === "newest" ? "Recentes" : s === "ending" ? "A terminar" : "Populares"}
            </Button>
          ))}
        </div>
      </div>
      {showRaffles && (
        <div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Modalidade de sorteio</p>
          <div className="flex flex-wrap gap-2">
            {(["all", "paid", "free", "points"] as const).map((t) => (
              <Button key={t} variant={typeFilter === t ? "default" : "outline"} size="sm" onClick={() => setTypeFilter(t)} className="gap-1">
                {t === "all" ? "Todos" : t === "paid" ? <><Ticket className="h-3 w-3" /> Pagos</> : t === "free" ? <><Gift className="h-3 w-3" /> Gratuitos</> : <><Star className="h-3 w-3" /> Pontos</>}
              </Button>
            ))}
          </div>
        </div>
      )}
      <div>
        <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Região</p>
        <CountryRegionFilter country={country} region={region} onCountry={setCountry} onRegion={setRegion} />
      </div>
    </div>
  );

  const chipCategories = [
    { id: "all", label: "Tudo", icon: "🔥", count: raffles.length + contests.length + games.length },
    { id: "raffles", label: "Sorteios", icon: "🎟️", count: raffles.length },
    { id: "contests", label: "Concursos", icon: "🏆", count: contests.length },
    { id: "games", label: "Jogos", icon: "🎮", count: games.length },
    { id: "paid", label: "Pagos", icon: "💎" },
    { id: "free", label: "Grátis", icon: "🎁" },
    { id: "points", label: "Pontos", icon: "⭐" },
    { id: "ending", label: "A terminar", icon: "⏰" },
    { id: "popular", label: "Populares", icon: "🚀" },
  ];

  const handleChipChange = (id: string) => {
    if (id === "all") { setContentType("all"); setTypeFilter("all"); setSortBy("newest"); return; }
    if (id === "raffles" || id === "contests" || id === "games") { setContentType(id); return; }
    if (id === "paid" || id === "free" || id === "points") { setTypeFilter(id); setContentType("raffles"); return; }
    if (id === "ending") { setSortBy("ending"); return; }
    if (id === "popular") { setSortBy("popular"); return; }
  };
  const activeChip =
    sortBy === "ending" ? "ending" :
    sortBy === "popular" ? "popular" :
    typeFilter !== "all" ? typeFilter :
    contentType !== "all" ? contentType :
    "all";

  const isCatalogEmpty = !loading && raffles.length === 0 && contests.length === 0 && games.length === 0;
  const hasFilteredResults =
    (showRaffles && filteredRaffles.length > 0) ||
    (showContests && filteredContests.length > 0) ||
    (showGames && games.length > 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop navbar */}
      <div className="hidden md:block">
        <Navbar />
      </div>

      <div className="container mx-auto px-4 md:pt-28 pb-20">
        {/* Mobile sticky header (Meituan) */}
        <MobileDiscoveryHeader
          title={t("marketplace.title")}
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder={t("marketplace.searchPlaceholder")}
          categories={chipCategories}
          activeCategory={activeChip}
          onCategoryChange={handleChipChange}
          onOpenFilters={() => setFilterSheetOpen(true)}
        />

        {/* Desktop title */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10 hidden md:block">
          <h1 className="font-display text-4xl font-bold text-foreground mb-2">{t("marketplace.title")}</h1>
          <p className="text-muted-foreground text-lg">{t("marketplace.subtitle")}</p>
        </motion.div>

        {/* Desktop search + filter */}
        <div className="hidden md:flex flex-col gap-3 mb-8">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Pesquisar..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 glass border-border h-10" />
            </div>
            <Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="h-10 gap-1.5 shrink-0 relative">
                  <SlidersHorizontal className="h-4 w-4" />
                  <span>Filtros</span>
                  {activeFilterCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] font-bold text-primary-foreground flex items-center justify-center">
                      {activeFilterCount}
                    </span>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto">
                <SheetHeader>
                  <div className="mx-auto mb-2 h-1.5 w-12 rounded-full bg-border" />
                  <SheetTitle className="text-left flex items-center gap-2">
                    <SlidersHorizontal className="h-4 w-4 text-primary" /> Filtros
                  </SheetTitle>
                </SheetHeader>
                <div className="py-4">
                  <FiltersBody />
                </div>
                <div className="sticky bottom-0 bg-background pt-3 pb-2 flex gap-2 border-t border-border">
                  <Button variant="outline" className="flex-1" onClick={() => {
                    setTypeFilter("all"); setContentType("all"); setCountry(""); setRegion(""); setSortBy("newest");
                  }}>Limpar</Button>
                  <Button className="flex-1" onClick={() => setFilterSheetOpen(false)}>Aplicar</Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>

          {activeFilterCount > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {contentLabel && (<Chip onRemove={() => setContentType("all")}>{contentLabel}</Chip>)}
              {typeLabel && (<Chip onRemove={() => setTypeFilter("all")}>{typeLabel}</Chip>)}
              {sortBy !== "newest" && (<Chip onRemove={() => setSortBy("newest")}>{sortLabel}</Chip>)}
              {region && (<Chip onRemove={() => setRegion("")}>{PROVINCES.find(p => p.value === region)?.label || region}</Chip>)}
              {country && !region && (<Chip onRemove={() => setCountry("")}>{country.toUpperCase()}</Chip>)}
            </div>
          )}
        </div>

        {/* Mobile filter sheet */}
        <MobileFilterSheet
          open={filterSheetOpen && isMobile}
          onOpenChange={setFilterSheetOpen}
          title="Filtrar"
          onReset={() => { setTypeFilter("all"); setContentType("all"); setCountry(""); setRegion(""); setSortBy("newest"); }}
          onApply={() => {}}
        >
          <FiltersBody />
        </MobileFilterSheet>

        <div className="mt-3 md:mt-0" />

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : isCatalogEmpty ? (
          <MarketplaceEmptyState />
        ) : !hasFilteredResults ? (
          <div className="text-center py-20">
            <Ticket className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-xl text-muted-foreground">{t("marketplace.noResults")}</p>
          </div>
        ) : (
          <div className="space-y-10">
            {/* Games Section */}
            {showGames && games.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <div className="flex items-center gap-2 mb-4">
                  <Zap className="h-5 w-5 text-primary" />
                  <h2 className="font-display text-xl font-bold text-foreground">Jogos & Diversão</h2>
                  <Badge variant="secondary">{games.length}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-4">
                  {games.map((game, i) => (
                    <Link key={game.id} to={`/games/${game.type === 'spin' ? 'spin-wheel' : 'millionaire'}/${game.id}`}>
                      <Card className="glass group hover:border-primary/30 transition-all overflow-hidden h-full">
                        <div className="relative aspect-video bg-secondary overflow-hidden">
                          {game.background_image_url ? (
                            <img src={game.background_image_url} alt={game.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-primary/10">
                              <Gamepad2 className="h-12 w-12 text-primary/40" />
                            </div>
                          )}
                          <div className="absolute top-2 right-2">
                            <Badge className="bg-black/60 backdrop-blur-md border-none">
                              {game.type === 'spin' ? 'Roda' : 'Milionário'}
                            </Badge>
                          </div>
                        </div>
                        <CardContent className="p-3">
                          <h3 className="font-bold text-sm line-clamp-1 group-hover:text-primary transition-colors">{game.name}</h3>
                          <p className="text-[10px] text-muted-foreground line-clamp-2 mt-1">{game.description}</p>
                          <div className="flex items-center justify-between mt-3">
                            <span className="text-[10px] font-bold text-primary">
                              {game.spin_cost > 0 ? `${game.spin_cost} MZN` : 'GRÁTIS'}
                            </span>
                            <Button size="xs" className="h-6 text-[10px]">Jogar</Button>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </motion.div>
            )}

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
                          <CardContent className="p-3 sm:p-5">
                            <h3 className="font-display text-sm sm:text-lg font-bold text-foreground mb-1 group-hover:text-primary transition-colors line-clamp-2">{contest.title}</h3>
                            {contest.description && (
                              <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{contest.description}</p>
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
                            <div className="mt-2 sm:mt-4 flex items-center gap-1 text-xs sm:text-sm text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                              Participar <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4" />
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
                {filteredRaffles.length === 0 && filteredContests.length === 0 && contentType !== "all" ? (
                  <div className="text-center py-20">
                    <Ticket className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                    <p className="text-xl text-muted-foreground">{t("marketplace.noRaffles")}</p>
                  </div>
                ) : filteredRaffles.length === 0 && contentType === "raffles" ? (
                  <div className="text-center py-20">
                    <Ticket className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                    <p className="text-xl text-muted-foreground">{t("marketplace.noRaffles")}</p>
                  </div>
                ) : filteredRaffles.length > 0 ? (
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
                              <CardContent className="p-3 sm:p-5">
                                <h3 className="font-display text-sm sm:text-lg font-bold text-foreground mb-1 group-hover:text-primary transition-colors line-clamp-2">{raffle.title}</h3>
                                <p className="text-xs sm:text-sm text-primary mb-2 sm:mb-3 line-clamp-1">{raffle.prize_title}</p>
                                <Progress value={pct} className="h-2 mb-2" />
                                <div className="flex justify-between items-center text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {raffle.sold_tickets}/{raffle.total_tickets}</span>
                                  <span className="font-semibold text-foreground">
                                    {raffle.raffle_type === "free" ? "Grátis" : raffle.raffle_type === "points" ? `${raffle.points_cost} pts` : `${formatMZN(raffle.ticket_price)}/bilhete`}
                                  </span>
                                </div>
                                <div className="mt-2 sm:mt-4 flex items-center gap-1 text-xs sm:text-sm text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                                  Participar <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4" />
                                </div>
                              </CardContent>
                            </Card>
                          </Link>
                        </motion.div>
                      );
                    })}
                  </div>
                ) : null}
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
      <div className="hidden md:block"><Footer /></div>
    </div>
  );
};

const Chip = ({ children, onRemove }: { children: React.ReactNode; onRemove: () => void }) => (
  <button
    onClick={onRemove}
    className="inline-flex items-center gap-1 rounded-full bg-primary/10 border border-primary/30 px-2.5 py-1 text-[11px] font-semibold text-primary hover:bg-primary/15 transition-colors"
  >
    {children}
    <X className="h-3 w-3" />
  </button>
);

export default Marketplace;
