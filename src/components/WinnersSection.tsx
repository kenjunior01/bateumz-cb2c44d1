import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Star, Play, Trophy, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import LiveFeed from "./LiveFeed";

interface Winner {
  name: string;
  prize: string;
  city: string;
  initials: string;
}

const WinnersSection = () => {
  const [winners, setWinners] = useState<Winner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWinners = async () => {
      // Get completed raffles with winners
      const { data: winnerParticipants } = await supabase
        .from("participants")
        .select("user_id, raffle_id, ticket_number")
        .eq("status", "winner")
        .limit(6);

      if (winnerParticipants && winnerParticipants.length > 0) {
        const userIds = [...new Set(winnerParticipants.map((w) => w.user_id))];
        const raffleIds = [...new Set(winnerParticipants.map((w) => w.raffle_id))];

        const [{ data: profiles }, { data: raffles }] = await Promise.all([
          supabase.from("profiles").select("user_id, display_name").in("user_id", userIds),
          supabase.from("raffles").select("id, prize_title, city").in("id", raffleIds),
        ]);

        const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);
        const raffleMap = new Map(raffles?.map((r) => [r.id, r]) || []);

        const mapped = winnerParticipants.map((w) => {
          const profile = profileMap.get(w.user_id);
          const raffle = raffleMap.get(w.raffle_id);
          const name = profile?.display_name || `Participante #${w.ticket_number}`;
          const initials = name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();
          return {
            name,
            prize: raffle?.prize_title || "Prémio",
            city: raffle?.city || "Moçambique",
            initials,
          };
        });
        setWinners(mapped);
      }
      setLoading(false);
    };
    fetchWinners();
  }, []);

  return (
    <section id="vencedores" className="relative py-24">
      <div className="container mx-auto px-6">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-4 text-center">
          <span className="mb-3 inline-block text-sm font-semibold uppercase tracking-widest text-primary">Histórias Reais</span>
          <h2 className="font-display text-4xl font-bold text-foreground md:text-5xl">Eles participaram. Eles ganharam.</h2>
        </motion.div>
        <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
          className="mx-auto mb-14 max-w-xl text-center text-muted-foreground">
          Não são números. São pessoas reais com histórias reais. E o próximo pode ser você.
        </motion.p>

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            {loading ? (
              <div className="flex justify-center py-16">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : winners.length > 0 ? (
              winners.map((w, i) => (
                <motion.div key={`${w.name}-${i}`} initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="glass group flex items-center gap-5 rounded-2xl p-5 transition-all hover:border-primary/30">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent font-display text-lg font-bold text-primary-foreground">
                    {w.initials}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-display font-semibold text-foreground">{w.name}</h4>
                      <Star className="h-4 w-4 text-accent" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Ganhou <span className="font-medium text-primary">{w.prize}</span> — {w.city}
                    </p>
                  </div>
                </motion.div>
              ))
            ) : (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass flex flex-col items-center justify-center rounded-2xl p-12 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <Sparkles className="h-7 w-7 text-primary" />
                </div>
                <h3 className="font-display text-lg font-semibold text-foreground mb-2">Os primeiros vencedores estão a caminho!</h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Assim que os primeiros sorteios forem concluídos, os vencedores aparecerão aqui. Participa agora e sê o primeiro!
                </p>
              </motion.div>
            )}
          </div>
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <LiveFeed />
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default WinnersSection;
