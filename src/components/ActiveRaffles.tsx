import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Clock, Users, Ticket, Flame, Sparkles, Star, ChevronDown, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { formatMZN } from "@/lib/currency";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { getRegions } from "@/lib/regions";

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
  hide_prize_value: boolean;
  category: string | null;
  created_at: string;
}

const INITIAL_ROWS = 2;
const COLS = 2;

const getRaffleUrl = (r: Raffle) => `/raffle/${r.slug || r.id}`;

const timeLeft = (date: string | null) => {
  if (!date) return null;
  const diff = new Date(date).getTime() - Date.now();
  if (diff <= 0) return "Encerrado";
  const days = Math.floor(diff / 86400000);
  if (days > 0) return `${days}d`;
  const hours = Math.floor(diff / 3600000);
  return `${hours}h`;
};

const RaffleCard = ({ raffle, index }: { raffle: Raffle; index: number }) => {
  const pct = (raffle.sold_tickets / raffle.total_tickets) * 100;
  const isHot = pct > 80;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.05 }}
    >
      <Link to={getRaffleUrl(raffle)} className="block group">
        <div className="rounded-2xl border border-border bg-card transition-all hover:border-primary/40 overflow-hidden">
          <div className="relative aspect-[4/3] overflow-hidden">
            {raffle.image_url ? (
              <img src={raffle.image_url} alt={raffle.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
            ) : (
              <div className="h-full w-full flex items-center justify-center bg-secondary">
                <Ticket className="h-10 w-10 text-muted-foreground/20" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
            {isHot && (
              <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-destructive/20 text-destructive px-2 py-0.5 text-[10px] font-semibold">
                <Flame className="h-2.5 w-2.5" /> Selling fast
              </span>
            )}
            <span className="absolute right-2 top-2 rounded-full bg-card/80 backdrop-blur-sm px-2 py-0.5 text-[10px] font-bold text-foreground">
              {raffle.raffle_type === "free" ? "Free" : raffle.raffle_type === "points" ? `${raffle.points_cost} pts` : formatMZN(raffle.ticket_price)}
            </span>
          </div>
          <div className="p-3">
            <h3 className="mb-1 font-display text-sm font-bold text-foreground leading-tight line-clamp-1">{raffle.title}</h3>
            <p className="text-[11px] text-primary mb-2 line-clamp-1">{raffle.prize_title}</p>
            <div className="mb-1.5">
              <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                <motion.div
                  initial={{ width: 0 }}
                  whileInView={{ width: `${pct}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 1, delay: 0.1 }}
                  className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
                />
              </div>
            </div>
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span className="flex items-center gap-0.5"><Users className="h-2.5 w-2.5" /> {raffle.sold_tickets}/{raffle.total_tickets}</span>
              {timeLeft(raffle.end_date) && (
                <span className="flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" /> {timeLeft(raffle.end_date)}</span>
              )}
            </div>
            <Badge className="mt-2 w-full justify-center bg-primary text-primary-foreground text-[10px] py-1">
              {raffle.hide_prize_value ? "🎁 Surpresa" : formatMZN(raffle.prize_value)}
            </Badge>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

interface SectionProps {
  title: string;
  icon: React.ReactNode;
  raffles: Raffle[];
  emptyText?: string;
}

const RaffleSection = ({ title, icon, raffles, emptyText = "Nenhum sorteio" }: SectionProps) => {
  const [showAll, setShowAll] = useState(false);
  const visibleCount = showAll ? raffles.length : INITIAL_ROWS * COLS;
  const visible = raffles.slice(0, visibleCount);
  const hasMore = raffles.length > INITIAL_ROWS * COLS;

  if (raffles.length === 0) return null;

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="font-display text-lg font-bold text-foreground">{title}</h3>
          <Badge variant="secondary" className="text-[10px]">{raffles.length}</Badge>
        </div>
        {hasMore && (
          <Button variant="ghost" size="sm" onClick={() => setShowAll(!showAll)} className="text-xs text-primary gap-1">
            {showAll ? "Ver menos" : "Ver todos"}
            <ChevronDown className={`h-3 w-3 transition-transform ${showAll ? "rotate-180" : ""}`} />
          </Button>
        )}
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {visible.map((r, i) => (
          <RaffleCard key={r.id} raffle={r} index={i} />
        ))}
      </div>
    </div>
  );
};

interface ActiveRafflesProps {
  categoryFilter?: string;
  country?: string;
  region?: string;
}

const ActiveRaffles = ({ categoryFilter, country, region }: ActiveRafflesProps) => {
  const [raffles, setRaffles] = useState<Raffle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      let query = supabase
        .from("raffles")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (categoryFilter && categoryFilter !== "todos") {
        query = query.eq("category", categoryFilter);
      }

      const { data } = await query;
      if (data) setRaffles(data as unknown as Raffle[]);
      setLoading(false);
    };
    fetch();
  }, [categoryFilter]);

  if (loading) {
    return (
      <section className="py-8">
        <div className="flex justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </section>
    );
  }

  // Region/country filter (client-side)
  let visible = raffles;
  if (region) {
    visible = visible.filter((r) => (r as any).province === region);
  } else if (country) {
    const regs = getRegions(country).map((x) => x.value);
    if (regs.length) visible = visible.filter((r) => !(r as any).province || regs.includes((r as any).province));
  }

  // Split into sections
  const now = Date.now();
  const featured = visible.filter((r) => {
    const pct = (r.sold_tickets / r.total_tickets) * 100;
    return pct > 50 || (r.end_date && new Date(r.end_date).getTime() - now < 3 * 86400000);
  });
  const featuredIds = new Set(featured.map((r) => r.id));
  const recent = visible.filter((r) => !featuredIds.has(r.id));

  const hasResults = visible.length > 0;

  return (
    <section id="sorteios" className="relative py-6 md:py-12">
      <div className="absolute left-0 top-0 h-64 w-64 rounded-full bg-primary/5 blur-[100px]" />

      {!hasResults ? (
        <div className="text-center py-16">
          <Ticket className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">
            {categoryFilter && categoryFilter !== "todos"
              ? "Nenhum sorteio nesta categoria"
              : "Nenhum sorteio ativo de momento"}
          </p>
        </div>
      ) : (
        <>
          <RaffleSection
            title="🔥 Featured"
            icon={<Flame className="h-5 w-5 text-destructive" />}
            raffles={featured}
          />
          <RaffleSection
            title="✨ Recent"
            icon={<Sparkles className="h-5 w-5 text-primary" />}
            raffles={recent}
          />
          {featured.length === 0 && recent.length === 0 && (
            <RaffleSection
              title="Raffles"
              icon={<Ticket className="h-5 w-5 text-primary" />}
              raffles={raffles}
            />
          )}
        </>
      )}
    </section>
  );
};

export default ActiveRaffles;
