import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Trophy, Flame, Ticket, ThumbsUp, Eye, Crown, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

interface TopRaffle {
  id: string;
  slug: string | null;
  title: string;
  prize_title: string;
  sold_tickets: number;
  total_tickets: number;
  image_url: string | null;
}

interface TopContest {
  id: string;
  title: string;
  evaluation_type: string;
  image_url: string | null;
  score: number;
  participants: number;
}

const medalColors = ["text-yellow-500", "text-gray-400", "text-amber-700"];
const medalBg = ["bg-yellow-500/10", "bg-gray-400/10", "bg-amber-700/10"];

const PopularLeaderboard = () => {
  const [raffles, setRaffles] = useState<TopRaffle[]>([]);
  const [contests, setContests] = useState<TopContest[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data: rafflesData } = await supabase
      .from("raffles")
      .select("id, slug, title, prize_title, sold_tickets, total_tickets, image_url")
      .eq("status", "active")
      .order("sold_tickets", { ascending: false })
      .limit(5);
    setRaffles(rafflesData || []);

    const { data: contestsData } = await supabase
      .from("contests")
      .select("id, title, evaluation_type, image_url")
      .in("status", ["active", "voting"])
      .limit(20);

    if (contestsData && contestsData.length > 0) {
      const ids = contestsData.map((c) => c.id);
      const { data: subs } = await supabase
        .from("contest_submissions")
        .select("contest_id, votes_count, views_count")
        .in("contest_id", ids)
        .eq("status", "approved");

      const enriched: TopContest[] = contestsData.map((c) => {
        const cs = (subs || []).filter((s) => s.contest_id === c.id);
        const score = cs.reduce(
          (acc, s) => acc + (c.evaluation_type === "views" ? s.views_count : s.votes_count),
          0
        );
        return {
          id: c.id,
          title: c.title,
          evaluation_type: c.evaluation_type,
          image_url: c.image_url,
          score,
          participants: cs.length,
        };
      });
      enriched.sort((a, b) => b.score - a.score);
      setContests(enriched.slice(0, 5));
    }

    setLoading(false);
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, []);

  if (loading) return null;
  if (raffles.length === 0 && contests.length === 0) return null;

  return (
    <section className="py-10">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-6 flex items-center gap-3"
        >
          <motion.div
            animate={{ rotate: [0, -10, 10, 0] }}
            transition={{ repeat: Infinity, duration: 3 }}
            className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-yellow-500/20 to-primary/20"
          >
            <Crown className="h-5 w-5 text-yellow-500" />
          </motion.div>
          <div>
            <h2 className="font-display text-2xl font-bold text-foreground">Mais Populares</h2>
            <p className="text-xs text-muted-foreground">Ranking em tempo real • atualiza a cada 30s</p>
          </div>
          <div className="ml-auto flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-primary">Live</span>
          </div>
        </motion.div>

        <div className="grid gap-4 lg:grid-cols-2">
          {raffles.length > 0 && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="glass rounded-2xl p-5"
            >
              <div className="mb-4 flex items-center gap-2">
                <Flame className="h-4 w-4 text-accent" />
                <h3 className="font-display font-bold text-foreground">Trending Raffles</h3>
                <Badge variant="secondary" className="ml-auto text-[10px]">
                  {raffles.length}
                </Badge>
              </div>
              <div className="space-y-2">
                {raffles.map((r, i) => {
                  const pct = r.total_tickets > 0 ? (r.sold_tickets / r.total_tickets) * 100 : 0;
                  return (
                    <motion.div
                      key={r.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <Link
                        to={`/raffle/${r.slug || r.id}`}
                        className="flex items-center gap-3 rounded-xl p-2 transition-all hover:bg-secondary/50 group"
                      >
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                            i < 3 ? medalBg[i] : "bg-secondary"
                          } font-display text-sm font-bold ${i < 3 ? medalColors[i] : "text-muted-foreground"}`}
                        >
                          {i + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                            {r.title}
                          </p>
                          <div className="mt-1 flex items-center gap-2">
                            <div className="h-1 flex-1 rounded-full bg-secondary overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${pct}%` }}
                                transition={{ duration: 0.8, delay: i * 0.05 }}
                                className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
                              />
                            </div>
                            <span className="text-[10px] font-mono text-muted-foreground">
                              {pct.toFixed(0)}%
                            </span>
                          </div>
                        </div>
                        <Ticket className="h-4 w-4 text-muted-foreground/50 shrink-0 group-hover:text-primary transition-colors" />
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {contests.length > 0 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="glass rounded-2xl p-5"
            >
              <div className="mb-4 flex items-center gap-2">
                <Trophy className="h-4 w-4 text-primary" />
                <h3 className="font-display font-bold text-foreground">Featured Contests</h3>
                <Badge variant="secondary" className="ml-auto text-[10px]">
                  {contests.length}
                </Badge>
              </div>
              <div className="space-y-2">
                {contests.map((c, i) => (
                  <motion.div
                    key={c.id}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Link
                      to={`/concursos/${c.id}`}
                      className="flex items-center gap-3 rounded-xl p-2 transition-all hover:bg-secondary/50 group"
                    >
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                          i < 3 ? medalBg[i] : "bg-secondary"
                        } font-display text-sm font-bold ${i < 3 ? medalColors[i] : "text-muted-foreground"}`}
                      >
                        {i + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                          {c.title}
                        </p>
                        <div className="mt-0.5 flex items-center gap-3 text-[10px] text-muted-foreground">
                          <span className="flex items-center gap-1">
                            {c.evaluation_type === "views" ? (
                              <Eye className="h-3 w-3" />
                            ) : (
                              <ThumbsUp className="h-3 w-3" />
                            )}
                            {c.score}
                          </span>
                          <span>{c.participants} entries</span>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground/50 shrink-0 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                    </Link>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </section>
  );
};

export default PopularLeaderboard;
