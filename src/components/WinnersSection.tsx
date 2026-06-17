import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Star, Trophy, Sparkles, ShieldCheck, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import LiveFeed from "./LiveFeed";

interface Winner {
  id: string;
  name: string;
  prize: string;
  city?: string;
  initials: string;
  raffleId?: string;
  gameType?: string;
  photoUrl?: string;
  winnerPhotoUrl?: string;
  verified: boolean;
  type: "raffle" | "game";
}

const WinnersSection = () => {
  const [winners, setWinners] = useState<Winner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWinners = async () => {
      // Fetch raffle winners
      const { data: winnerParticipants } = await supabase
        .from("participants")
        .select("user_id, raffle_id, ticket_number, created_at")
        .eq("status", "winner")
        .order("created_at", { ascending: false })
        .limit(6);

      // Fetch game winners
      const { data: gameWinners } = await supabase
        .from("game_winners")
        .select("*")
        .eq("is_verified", true)
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .limit(6);

      const allWinners: Winner[] = [];

      if (winnerParticipants && winnerParticipants.length > 0) {
        const userIds = [...new Set(winnerParticipants.map((w) => w.user_id))];
        const raffleIds = [...new Set(winnerParticipants.map((w) => w.raffle_id))];

        const [{ data: profiles }, { data: raffles }, { data: verifs }] = await Promise.all([
          supabase.from("profiles_public").select("user_id, display_name").in("user_id", userIds),
          supabase.from("raffles").select("id, prize_title, city, country").in("id", raffleIds),
          supabase.from("blockchain_verifications").select("raffle_id").in("raffle_id", raffleIds),
        ]);

        const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);
        const raffleMap = new Map(raffles?.map((r) => [r.id, r]) || []);
        const verifiedSet = new Set(verifs?.map((v) => v.raffle_id) || []);

        const mask = (name: string) => {
          const parts = name.split(" ");
          if (parts.length === 1) return parts[0].slice(0, 2) + "•••";
          return `${parts[0]} ${parts[parts.length - 1][0]}.`;
        };

        const mappedRaffleWinners = winnerParticipants.map((w) => {
          const profile = profileMap.get(w.user_id);
          const raffle = raffleMap.get(w.raffle_id);
          const rawName = profile?.display_name || `Vencedor #${w.ticket_number}`;
          const name = mask(rawName);
          const initials = rawName.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();
          const country = raffle?.country || "US";
          const city = raffle?.city || (country === "CA" ? "Moçambique" : "Moçambique");
          return {
            id: `raffle-${w.ticket_number}`,
            name,
            prize: raffle?.prize_title || "Prémio",
            city: `${city}, ${country}`,
            initials,
            raffleId: w.raffle_id,
            verified: verifiedSet.has(w.raffle_id),
            type: "raffle" as const,
          };
        });
        allWinners.push(...mappedRaffleWinners);
      }

      if (gameWinners && gameWinners.length > 0) {
        const mappedGameWinners = gameWinners.map((w) => {
          const initials = w.winner_name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();
          return {
            id: `game-${w.id}`,
            name: w.winner_name,
            prize: w.prize,
            initials,
            gameType: w.game_type,
            photoUrl: w.photo_url,
            winnerPhotoUrl: w.winner_photo_url,
            verified: w.is_verified,
            type: "game" as const,
          };
        });
        allWinners.push(...mappedGameWinners);
      }

      // Sort all winners by date (newest first)
      setWinners(allWinners.sort(() => Math.random() - 0.5));
      setLoading(false);
    };
    fetchWinners();
  }, []);

  return (
    <section id="winners" className="relative py-24">
      <div className="container mx-auto px-6">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-4 text-center">
          <span className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold uppercase tracking-widest text-primary">
            <ShieldCheck className="h-4 w-4" /> Vencedores Verificados
          </span>
          <h2 className="font-display text-4xl font-bold text-foreground md:text-5xl">Jogaram. Ganharam.</h2>
        </motion.div>
        <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
          className="mx-auto mb-14 max-w-xl text-center text-muted-foreground">
          Pessoas reais, prémios reais, prova real. Cada sorteio é verificado publicamente — clica em qualquer vencedor para ver a verificação.
        </motion.p>

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            {loading ? (
              <div className="flex justify-center py-16">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : winners.length > 0 ? (
              winners.map((w, i) => (
                <motion.div key={w.id} initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}>
                  {w.type === "raffle" ? (
                    <Link
                      to={`/transparencia?raffle=${w.raffleId}`}
                      className="glass group flex items-center gap-5 rounded-2xl p-5 transition-all hover:border-primary/30"
                    >
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent font-display text-lg font-bold text-primary-foreground">
                        {w.initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-display font-semibold text-foreground">{w.name}</h4>
                          <Star className="h-4 w-4 text-accent" />
                          {w.verified && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                              <ShieldCheck className="h-3 w-3" /> Verificado
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          Ganhou <span className="font-medium text-primary">{w.prize}</span> — {w.city}
                        </p>
                      </div>
                      <ExternalLink className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  ) : (
                    <div className="glass group rounded-2xl p-5 transition-all hover:border-primary/30 overflow-hidden">
                      <div className="flex items-center gap-5">
                        {w.winnerPhotoUrl ? (
                          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl overflow-hidden border border-border">
                            <img src={w.winnerPhotoUrl} alt={w.name} className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent font-display text-lg font-bold text-primary-foreground">
                            {w.initials}
                          </div>
                        )}
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-display font-semibold text-foreground">{w.name}</h4>
                            <Star className="h-4 w-4 text-accent" />
                            {w.gameType && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-secondary/50 px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                                {w.gameType}
                              </span>
                            )}
                            {w.verified && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                                <ShieldCheck className="h-3 w-3" /> Verificado
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            Ganhou <span className="font-medium text-primary">{w.prize}</span>
                          </p>
                        </div>
                      </div>
                      
                      {w.photoUrl && (
                        <div className="mt-3 rounded-xl overflow-hidden border border-border">
                          <img src={w.photoUrl} alt={w.prize} className="w-full h-48 object-cover" />
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              ))
            ) : (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass flex flex-col items-center justify-center rounded-2xl p-12 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <Sparkles className="h-7 w-7 text-primary" />
                </div>
                <h3 className="font-display text-lg font-semibold text-foreground mb-2">Os primeiros vencedores estão a caminho!</h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Assim que os primeiros sorteios terminarem, os vencedores aparecerão aqui. Participa já e sê um dos primeiros.
                </p>
              </motion.div>
            )}

            {winners.length > 0 && (
              <div className="text-center pt-2">
                <Link to="/historico" className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
                  Ver histórico completo de vencedores <Trophy className="h-3.5 w-3.5" />
                </Link>
              </div>
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
