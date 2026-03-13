import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, Filter, Ticket, Clock, Users, ArrowRight } from "lucide-react";
import { formatMZN } from "@/lib/currency";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
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
}

const Marketplace = () => {
  const [raffles, setRaffles] = useState<Raffle[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<"newest" | "ending" | "popular">("newest");

  useEffect(() => {
    const fetchRaffles = async () => {
      const { data } = await supabase
        .from("raffles")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false });
      if (data) setRaffles(data as Raffle[]);
      setLoading(false);
    };
    fetchRaffles();
  }, []);

  const filtered = raffles
    .filter((r) => r.title.toLowerCase().includes(search.toLowerCase()) || r.prize_title.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === "ending") return (a.end_date || "z").localeCompare(b.end_date || "z");
      if (sortBy === "popular") return b.sold_tickets - a.sold_tickets;
      return 0;
    });

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

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 pt-28 pb-20">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <h1 className="font-display text-4xl font-bold text-foreground mb-2">Marketplace</h1>
          <p className="text-muted-foreground text-lg">Descubra sorteios incríveis e concorra a prémios de luxo.</p>
        </motion.div>

        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Pesquisar sorteios..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 glass border-border" />
          </div>
          <div className="flex gap-2">
            {(["newest", "ending", "popular"] as const).map((s) => (
              <Button key={s} variant={sortBy === s ? "default" : "outline"} size="sm" onClick={() => setSortBy(s)}>
                {s === "newest" ? "Recentes" : s === "ending" ? "A terminar" : "Populares"}
              </Button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Ticket className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-xl text-muted-foreground">Nenhum sorteio encontrado</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((raffle, i) => {
              const pct = (raffle.sold_tickets / raffle.total_tickets) * 100;
              return (
                <motion.div key={raffle.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
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
                          {formatMZN(raffle.prize_value)}
                        </Badge>
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
                          <span className="font-semibold text-foreground">{formatMZN(raffle.ticket_price)}/bilhete</span>
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
      </div>
      <Footer />
    </div>
  );
};

export default Marketplace;
