import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, ArrowRight, Eye, ThumbsUp, Clock, Sparkles, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface FeaturedContest {
  id: string;
  title: string;
  description: string | null;
  prize_description: string | null;
  image_url: string | null;
  evaluation_type: string;
  end_date: string | null;
  status: string;
}

const FeaturedContestsCarousel = () => {
  const [contests, setContests] = useState<FeaturedContest[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("contests")
        .select("id, title, description, prize_description, image_url, evaluation_type, end_date, status")
        .in("status", ["active", "voting"])
        .order("created_at", { ascending: false })
        .limit(5);
      setContests(data || []);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (contests.length <= 1) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % contests.length), 6000);
    return () => clearInterval(t);
  }, [contests.length]);

  if (loading || contests.length === 0) return null;

  const current = contests[index];
  const timeLeft = (date: string | null) => {
    if (!date) return null;
    const diff = new Date(date).getTime() - Date.now();
    if (diff <= 0) return "Encerrado";
    const days = Math.floor(diff / 86400000);
    if (days > 0) return `${days}d restantes`;
    return `${Math.floor(diff / 3600000)}h restantes`;
  };

  const next = () => setIndex((i) => (i + 1) % contests.length);
  const prev = () => setIndex((i) => (i - 1 + contests.length) % contests.length);

  return (
    <section className="py-6">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-3 flex items-center gap-2"
        >
          <motion.div
            animate={{ rotate: [0, -8, 8, 0] }}
            transition={{ repeat: Infinity, duration: 3 }}
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-accent/20"
          >
            <Sparkles className="h-3.5 w-3.5 text-primary" />
          </motion.div>
          <h2 className="font-display text-lg font-bold text-foreground">Concursos em Destaque</h2>
          <Badge variant="secondary" className="text-[10px]">{contests.length}</Badge>
          <Link to="/concursos" className="ml-auto text-xs text-primary font-medium hover:underline flex items-center gap-1">
            Ver todos <ArrowRight className="h-3 w-3" />
          </Link>
        </motion.div>

        <div className="relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={current.id}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.4 }}
            >
              <Link to={`/concursos/${current.id}`}>
                <div className="relative overflow-hidden rounded-2xl glass group cursor-pointer">
                  <div className="relative aspect-[21/9] sm:aspect-[3/1] bg-gradient-to-br from-primary/10 to-accent/10 overflow-hidden">
                    {current.image_url ? (
                      <img
                        src={current.image_url}
                        alt={current.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Trophy className="h-20 w-20 text-primary/30" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

                    <div className="absolute top-4 left-4 flex gap-2">
                      <Badge className="bg-primary text-primary-foreground shadow-lg">
                        {current.status === "voting" ? "🗳️ Em Votação" : "🔥 Aberto"}
                      </Badge>
                      <Badge variant="outline" className="glass text-foreground border-border/50">
                        {current.evaluation_type === "views" ? (
                          <><Eye className="h-3 w-3 mr-1" /> Por visualizações</>
                        ) : (
                          <><ThumbsUp className="h-3 w-3 mr-1" /> Por votos</>
                        )}
                      </Badge>
                    </div>

                    {current.end_date && timeLeft(current.end_date) && (
                      <Badge variant="outline" className="absolute top-4 right-4 glass text-foreground border-border/50">
                        <Clock className="h-3 w-3 mr-1" />
                        {timeLeft(current.end_date)}
                      </Badge>
                    )}

                    <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 text-white">
                      <h3 className="font-display text-xl sm:text-3xl font-bold mb-1 sm:mb-2 line-clamp-1">
                        {current.title}
                      </h3>
                      {current.description && (
                        <p className="text-xs sm:text-sm text-white/80 line-clamp-1 sm:line-clamp-2 mb-2 sm:mb-3 max-w-2xl">
                          {current.description}
                        </p>
                      )}
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        {current.prize_description && (
                          <div className="flex items-center gap-2 text-sm font-semibold">
                            <Trophy className="h-4 w-4 text-yellow-400" />
                            <span className="line-clamp-1">{current.prize_description}</span>
                          </div>
                        )}
                        <Button size="sm" className="ml-auto gap-1 shadow-lg">
                          Participar <ArrowRight className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          </AnimatePresence>

          {contests.length > 1 && (
            <>
              <button
                onClick={(e) => { e.preventDefault(); prev(); }}
                aria-label="Anterior"
                className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full glass flex items-center justify-center text-foreground hover:bg-primary/20 transition-colors z-10"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={(e) => { e.preventDefault(); next(); }}
                aria-label="Seguinte"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full glass flex items-center justify-center text-foreground hover:bg-primary/20 transition-colors z-10"
              >
                <ChevronRight className="h-4 w-4" />
              </button>

              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                {contests.map((_, i) => (
                  <button
                    key={i}
                    onClick={(e) => { e.preventDefault(); setIndex(i); }}
                    aria-label={`Ir para ${i + 1}`}
                    className={`h-1.5 rounded-full transition-all ${
                      i === index ? "w-6 bg-primary" : "w-1.5 bg-white/40 hover:bg-white/60"
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
};

export default FeaturedContestsCarousel;
