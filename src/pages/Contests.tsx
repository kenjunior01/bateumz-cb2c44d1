import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Calendar, Eye, ThumbsUp, Video, ArrowRight, Clock, Flame, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import CountryRegionFilter from "@/components/CountryRegionFilter";
import ContestCountdown from "@/components/ContestCountdown";

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
            <div className="relative aspect-[4/3] bg-secondary overflow-hidden">
              {contest.image_url ? (
                <img src={contest.image_url} alt={contest.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10">
                  <motion.div animate={{ rotate: [0, 5, -5, 0] }} transition={{ repeat: Infinity, duration: 4 }}>
                    <Trophy className="h-12 w-12 text-primary/30" />
                  </motion.div>
                </div>
              )}
              <Badge className={`absolute top-3 left-3 ${status.color} shadow-md`}>
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
            <CardContent className="p-4 space-y-2">
              <h3 className="font-display text-sm md:text-base font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2">{contest.title}</h3>
              {contest.description && (
                <p className="text-xs text-muted-foreground line-clamp-2">{contest.description}</p>
              )}
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                {contest.evaluation_type === "views" ? (
                  <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> Views</span>
                ) : (
                  <span className="flex items-center gap-1"><ThumbsUp className="h-3 w-3" /> Votos</span>
                )}
                {contest.end_date && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(contest.end_date).toLocaleDateString("pt-MZ")}
                  </span>
                )}
              </div>
              {contest.prize_description && (
                <div className="flex items-center gap-1 text-xs font-medium text-primary">
                  <Trophy className="h-3 w-3" />
                  <span className="line-clamp-1">{contest.prize_description}</span>
                </div>
              )}
              <div className="pt-1 flex items-center gap-1 text-xs text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                Participar <ArrowRight className="h-3 w-3" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 pt-24 pb-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.1 }}>
            <Trophy className="h-12 w-12 text-primary mx-auto mb-3" />
          </motion.div>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-2">Concursos</h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Participe nos concursos, mostre o seu talento e ganhe prémios incríveis!
          </p>
        </motion.div>

        {/* Search + Country/Region */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="max-w-3xl mx-auto mb-8 flex flex-col sm:flex-row gap-3 items-stretch">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Pesquisar concursos..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 glass" />
          </div>
          <CountryRegionFilter country={country} region={region} onCountry={setCountry} onRegion={setRegion} />
        </motion.div>

        {loading ? (
          <div className="flex justify-center py-20">
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : (
          <Tabs defaultValue="active" className="w-full">
            <TabsList className="mb-6">
              <TabsTrigger value="active" className="gap-1"><Flame className="h-3 w-3" /> Ativos ({active.length})</TabsTrigger>
              <TabsTrigger value="past" className="gap-1"><Trophy className="h-3 w-3" /> Encerrados ({past.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="active">
              {active.length === 0 ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16 glass rounded-2xl">
                  <Trophy className="h-16 w-16 text-muted-foreground/20 mx-auto mb-4" />
                  <p className="text-lg text-muted-foreground">Nenhum concurso ativo de momento.</p>
                </motion.div>
              ) : (
                <div className="grid gap-4 sm:gap-6 grid-cols-2 lg:grid-cols-3">
                  {active.map((c, i) => <ContestCard key={c.id} contest={c} index={i} />)}
                </div>
              )}
            </TabsContent>
            <TabsContent value="past">
              {past.length === 0 ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16 glass rounded-2xl">
                  <Trophy className="h-16 w-16 text-muted-foreground/20 mx-auto mb-4" />
                  <p className="text-lg text-muted-foreground">Nenhum concurso encerrado.</p>
                </motion.div>
              ) : (
                <div className="grid gap-4 sm:gap-6 grid-cols-2 lg:grid-cols-3">
                  {past.map((c, i) => <ContestCard key={c.id} contest={c} index={i} />)}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
      <Footer />
    </div>
  );
}
