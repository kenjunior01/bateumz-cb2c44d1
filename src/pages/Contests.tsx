import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Calendar, Eye, ThumbsUp, ArrowRight, Flame, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import CountryRegionFilter from "@/components/CountryRegionFilter";
import ContestCountdown from "@/components/ContestCountdown";
import MobileDiscoveryHeader from "@/components/meituan/MobileDiscoveryHeader";
import MeituanSkeleton from "@/components/meituan/MeituanSkeleton";

interface Contest {
  id: string;
  title: string;
  description: string | null;
  prize_description: string | null;
  image_url: string | null;
  status: string;
  evaluation_type: string;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
}

const statusMap: Record<string, { label: string; emoji: string; color: string }> = {
  active: { label: "Aberto", emoji: "🔥", color: "bg-primary text-primary-foreground" },
  voting: { label: "Em Votação", emoji: "🗳️", color: "bg-accent text-accent-foreground" },
  completed: { label: "Encerrado", emoji: "✅", color: "bg-muted text-muted-foreground" },
};

export default function Contests() {
  const [contests, setContests] = useState<Contest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [country, setCountry] = useState("");
  const [region, setRegion] = useState("");

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("contests")
        .select("*")
        .in("status", ["active", "voting", "completed"])
        .order("created_at", { ascending: false });
      setContests(data || []);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = contests.filter((c) => {
    const q = search.toLowerCase();
    if (q && !c.title.toLowerCase().includes(q) && !(c.description || "").toLowerCase().includes(q)) return false;
    return true;
  });

  const active = filtered.filter((c) => c.status === "active" || c.status === "voting");
  const past = filtered.filter((c) => c.status === "completed");

  const timeLeft = (date: string | null) => {
    if (!date) return null;
    const diff = new Date(date).getTime() - Date.now();
    if (diff <= 0) return "Encerrado";
    const days = Math.floor(diff / 86400000);
    if (days > 0) return `${days}d`;
    const hours = Math.floor(diff / 3600000);
    return `${hours}h`;
  };

  const ContestCard = ({ contest, index }: { contest: Contest; index: number }) => {
    const status = statusMap[contest.status] || statusMap.active;
    const isFeatured = (contest as any).featured;
    const isMultiPhase = (contest as any).contest_mode === "multi";
    const sponsor = (contest as any).sponsor_name;
    return (
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: index * 0.06, type: "spring", stiffness: 200 }}
        whileHover={{ y: -6, scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <Link to={`/concursos/${contest.id}`}>
          <Card className={`overflow-hidden glass group hover:border-primary/30 transition-all cursor-pointer h-full relative ${isFeatured ? "ring-2 ring-primary/40 shadow-lg" : ""}`}>
            {isFeatured && (
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-primary via-accent to-primary z-10" />
            )}
            <div className="relative aspect-[3/2] sm:aspect-[4/3] bg-secondary overflow-hidden">
              {contest.image_url ? (
                <img src={contest.image_url} alt={contest.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10">
                  <motion.div animate={{ rotate: [0, 5, -5, 0] }} transition={{ repeat: Infinity, duration: 4 }}>
                    <Trophy className="h-12 w-12 text-primary/30" />
                  </motion.div>
                </div>
              )}
              <Badge className={`absolute top-2 left-2 sm:top-3 sm:left-3 ${status.color} shadow-md text-[10px] sm:text-xs`}>
                {status.emoji} {status.label}
              </Badge>
              {isMultiPhase && (
                <Badge className="absolute top-3 left-[50%] -translate-x-1/2 bg-accent/90 text-accent-foreground text-[10px] shadow-md">
                  🏆 Multi-fases
                </Badge>
              )}
              {contest.end_date && timeLeft(contest.end_date) && contest.status !== "completed" && (
                <div className="absolute top-3 right-3">
                  <ContestCountdown endDate={contest.end_date} compact />
                </div>
              )}
              <div className="absolute bottom-0 inset-x-0 h-20 bg-gradient-to-t from-black/50 to-transparent" />
              {sponsor && (
                <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full bg-background/80 backdrop-blur text-[10px] text-muted-foreground flex items-center gap-1">
                  💼 {sponsor}
                </div>
              )}
            </div>
            <CardContent className="p-3 sm:p-4 space-y-1.5 sm:space-y-2">
              <h3 className="font-display text-xs sm:text-sm md:text-base font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-tight">{contest.title}</h3>
              {contest.description && (
                <p className="text-[11px] sm:text-xs text-muted-foreground line-clamp-2">{contest.description}</p>
              )}
              <div className="flex items-center gap-2 sm:gap-3 text-[10px] sm:text-xs text-muted-foreground">
                {contest.evaluation_type === "views" ? (
                  <span className="flex items-center gap-0.5"><Eye className="h-2.5 w-2.5 sm:h-3 sm:w-3" /> Views</span>
                ) : (
                  <span className="flex items-center gap-0.5"><ThumbsUp className="h-2.5 w-2.5 sm:h-3 sm:w-3" /> Votos</span>
                )}
                {contest.end_date && (
                  <span className="flex items-center gap-0.5">
                    <Calendar className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                    {new Date(contest.end_date).toLocaleDateString("pt-MZ")}
                  </span>
                )}
              </div>
              {contest.prize_description && (
                <div className="flex items-center gap-1 text-[10px] sm:text-xs font-medium text-primary">
                  <Trophy className="h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0" />
                  <span className="line-clamp-1">{contest.prize_description}</span>
                </div>
              )}
              <div className="pt-0.5 sm:pt-1 hidden sm:flex items-center gap-1 text-xs text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                Participar <ArrowRight className="h-3 w-3" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </motion.div>
    );
  };

  const [tab, setTab] = useState<"active" | "past">("active");

  const chips = [
    { id: "active", label: "Ativos", icon: "🔥", count: active.length },
    { id: "past", label: "Encerrados", icon: "🏆", count: past.length },
  ];

  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-0 bg-mesh-soft bg-noise">
      <div className="hidden md:block"><Navbar /></div>
      <div className="container mx-auto px-3 sm:px-4 md:pt-24 pb-10">
        {/* Mobile sticky header */}
        <MobileDiscoveryHeader
          title="Concursos"
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Pesquisar concursos..."
          categories={chips}
          activeCategory={tab}
          onCategoryChange={(id) => setTab(id as "active" | "past")}
        />

        {/* Desktop hero */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10 hidden md:block">
          <Trophy className="h-12 w-12 text-primary mx-auto mb-3" />
          <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-1">Concursos</h1>
          <p className="text-sm text-muted-foreground max-w-xl mx-auto px-2">
            Participe, mostre o seu talento e ganhe prémios incríveis!
          </p>
        </motion.div>

        {/* Desktop search row */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mb-4 max-w-3xl mx-auto hidden md:block">
          <div className="flex flex-col sm:flex-row gap-2 items-stretch">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Pesquisar concursos..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 h-10 glass" />
            </div>
            <CountryRegionFilter country={country} region={region} onCountry={setCountry} onRegion={setRegion} compact />
          </div>
        </motion.div>

        {loading ? (
          <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="aspect-[3/2] bg-muted animate-pulse" />
                <div className="p-3 space-y-2">
                  <div className="h-3.5 w-3/4 rounded bg-muted animate-pulse" />
                  <div className="h-3 w-1/2 rounded bg-muted/70 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Tabs value={tab} onValueChange={(v) => setTab(v as "active" | "past")} className="w-full">
            <TabsList className="mb-4 lg:mb-6 hidden md:inline-flex">
              <TabsTrigger value="active" className="gap-1 text-xs sm:text-sm"><Flame className="h-3 w-3" /> Ativos ({active.length})</TabsTrigger>
              <TabsTrigger value="past" className="gap-1 text-xs sm:text-sm"><Trophy className="h-3 w-3" /> Encerrados ({past.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="active">
              {active.length === 0 ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12 glass rounded-2xl">
                  <Trophy className="h-14 w-14 text-muted-foreground/20 mx-auto mb-3" />
                  <p className="text-base text-muted-foreground">Nenhum concurso ativo de momento.</p>
                </motion.div>
              ) : (
                <div className="grid gap-3 sm:gap-4 md:gap-6 grid-cols-2 lg:grid-cols-3">
                  {active.map((c, i) => <ContestCard key={c.id} contest={c} index={i} />)}
                </div>
              )}
            </TabsContent>
            <TabsContent value="past">
              {past.length === 0 ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12 glass rounded-2xl">
                  <Trophy className="h-14 w-14 text-muted-foreground/20 mx-auto mb-3" />
                  <p className="text-base text-muted-foreground">Nenhum concurso encerrado.</p>
                </motion.div>
              ) : (
                <div className="grid gap-3 sm:gap-4 md:gap-6 grid-cols-2 lg:grid-cols-3">
                  {past.map((c, i) => <ContestCard key={c.id} contest={c} index={i} />)}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
      <div className="hidden md:block"><Footer /></div>
    </div>
  );
}
