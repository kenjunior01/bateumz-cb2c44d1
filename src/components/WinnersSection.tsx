import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Star, Trophy, Sparkles, ShieldCheck, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import OptimizedImage from "@/components/OptimizedImage";
import LiveFeed from "./LiveFeed";

interface Winner {
  id: string;
  name: string;
  prize: string;
  city?: string;
  initials: string;
  raffleId?: string;
  gameType?: string;
  avatarUrl?: string;
  photoUrl?: string;
  winnerPhotoUrl?: string;
  verified: boolean;
  type: "raffle" | "game";
  sortDate?: string;
}

function WinnerAvatar({
  name,
  initials,
  avatarUrl,
  size = "md",
}: {
  name: string;
  initials: string;
  avatarUrl?: string;
  size?: "md" | "lg";
}) {
  const dim = size === "lg" ? "h-16 w-16" : "h-14 w-14";
  if (avatarUrl) {
    return (
      <motion.div
        className={`${dim} shrink-0 overflow-hidden rounded-xl border border-border`}
        whileHover={{ scale: 1.05, borderColor: "hsl(var(--primary) / 0.4)" }}
        transition={{ type: "spring" as const, stiffness: 400, damping: 20 }}
      >
        <OptimizedImage
          src={avatarUrl}
          alt={name}
          optimizeWidth={128}
          className="h-full w-full object-cover"
        />
      </motion.div>
    );
  }
  return (
    <motion.div
      className={`${dim} flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent font-display text-lg font-bold text-primary-foreground`}
      whileHover={{ scale: 1.05, rotate: [0, -3, 3, 0] }}
      transition={{ type: "spring" as const, stiffness: 400, damping: 20 }}
    >
      {initials}
    </motion.div>
  );
}

const WinnersSection = () => {
  const { t } = useLanguage();
  const [winners, setWinners] = useState<Winner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWinners = async () => {
      const { data: winnerParticipants } = await supabase
        .from("participants")
        .select("user_id, raffle_id, ticket_number, created_at")
        .eq("status", "winner")
        .order("created_at", { ascending: false })
        .limit(6);

      // Game winners table not available yet; only raffle winners are shown.
      const gameWinners: any[] = [];

      const allWinners: Winner[] = [];

      if (winnerParticipants && winnerParticipants.length > 0) {
        const userIds = [...new Set(winnerParticipants.map((w) => w.user_id))];
        const raffleIds = [...new Set(winnerParticipants.map((w) => w.raffle_id))];

        const [{ data: profiles }, { data: raffles }, { data: verifs }] = await Promise.all([
          supabase.from("profiles_public").select("user_id, display_name, avatar_url").in("user_id", userIds),
          supabase.from("raffles").select("id, prize_title, city, country, image_url").in("id", raffleIds),
          supabase.from("blockchain_verifications").select("raffle_id").in("raffle_id", raffleIds),
        ]);

        const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);
        const raffleMap = new Map(raffles?.map((r) => [r.id, r]) || []);
        const verifiedSet = new Set(verifs?.map((v) => v.raffle_id) || []);

        const mask = (name: string) => {
          const parts = name.split(" ");
          if (parts.length === 1) return `${parts[0].slice(0, 2)}•••`;
          return `${parts[0]} ${parts[parts.length - 1][0]}.`;
        };

        winnerParticipants.forEach((w) => {
          const profile = profileMap.get(w.user_id);
          const raffle = raffleMap.get(w.raffle_id);
          const rawName = profile?.display_name || `Winner #${w.ticket_number}`;
          const country = raffle?.country || "US";
          const city = raffle?.city || country;

          allWinners.push({
            id: `raffle-${w.raffle_id}-${w.ticket_number}`,
            name: mask(rawName),
            prize: raffle?.prize_title || "Prize",
            city: `${city}, ${country}`,
            initials: rawName.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase(),
            avatarUrl: profile?.avatar_url || undefined,
            photoUrl: raffle?.image_url || undefined,
            raffleId: w.raffle_id,
            verified: verifiedSet.has(w.raffle_id),
            type: "raffle",
            sortDate: w.created_at,
          });
        });
      }


      setWinners(
        allWinners.sort((a, b) => (b.sortDate || "").localeCompare(a.sortDate || "")),
      );
      setLoading(false);
    };
    fetchWinners();
  }, []);

  const renderWinnerCard = (w: Winner) => {
    const header = (
      <div className="flex items-center gap-5">
        <WinnerAvatar name={w.name} initials={w.initials} avatarUrl={w.avatarUrl || w.winnerPhotoUrl} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-display font-semibold text-foreground">{w.name}</h4>
            <Star className="h-4 w-4 text-accent" />
            {w.gameType && (
              <span className="inline-flex items-center gap-1 rounded-full bg-secondary/50 px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                {w.gameType}
              </span>
            )}
            {w.verified && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                <ShieldCheck className="h-3 w-3" /> {t("winners.verified")}
              </span>
            )}
          </div>
          <p className="truncate text-sm text-muted-foreground">
            {t("winners.won")}{" "}
            <span className="font-medium text-primary">{w.prize}</span>
            {w.city ? ` — ${w.city}` : ""}
          </p>
        </div>
        {w.type === "raffle" && (
          <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
        )}
      </div>
    );

    const prizePhoto = w.photoUrl && (
      <div className="mt-3 overflow-hidden rounded-xl border border-border">
        <OptimizedImage
          src={w.photoUrl}
          alt={w.prize}
          optimizeWidth={640}
          className="h-44 w-full object-cover sm:h-48"
        />
        <p className="bg-muted/40 px-3 py-1.5 text-[10px] font-medium text-muted-foreground">
          {t("winners.prizePhoto")}
        </p>
      </div>
    );

    if (w.type === "raffle") {
      return (
        <motion.div
          whileHover={{ y: -3, scale: 1.01 }}
          transition={{ type: "spring" as const, stiffness: 300, damping: 20 }}
        >
          <Link
            to={`/transparencia?raffle=${w.raffleId}`}
            className="glass group block overflow-hidden rounded-2xl p-5 transition-all hover:border-primary/30 relative"
          >
            {/* Gradient hover overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl pointer-events-none" />
            <div className="relative">{header}{prizePhoto}</div>
          </Link>
        </motion.div>
      );
    }

    return (
      <motion.div
        whileHover={{ y: -3, scale: 1.01 }}
        transition={{ type: "spring" as const, stiffness: 300, damping: 20 }}
      >
        <div className="glass group overflow-hidden rounded-2xl p-5 transition-all hover:border-primary/30 relative">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl pointer-events-none" />
          <div className="relative">{header}{prizePhoto}</div>
        </div>
      </motion.div>
    );
  };

  return (
    <section id="winners" className="relative py-24 section-glow-divider">
      <div className="absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full blur-[120px]" style={{ background: "color-mix(in srgb, var(--region-primary, hsl(var(--primary))) 5%, transparent)" }} />
      <div className="container mx-auto px-6">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] as const }} className="mb-4 text-center">
          <motion.span
            className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold uppercase tracking-widest px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20"
            whileHover={{ scale: 1.05, borderColor: "hsl(var(--primary) / 0.4)" }}
            transition={{ type: "spring" as const, stiffness: 300, damping: 20 }}
          >
            <motion.div
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
              className="inline-block"
            >
              <ShieldCheck className="h-4 w-4 text-primary" />
            </motion.div>
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">{t("winners.badge")}</span>
          </motion.span>
          <h2 className="font-display text-4xl font-bold md:text-5xl">
            <span className="bg-gradient-to-r from-foreground via-foreground/90 to-foreground/70 bg-clip-text text-transparent">{t("winners.title")}</span>
          </h2>
        </motion.div>
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mx-auto mb-14 max-w-xl text-center text-muted-foreground"
        >
          {t("winners.subtitle")}
        </motion.p>

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            {loading ? (
              <div className="flex justify-center py-16">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : winners.length > 0 ? (
              winners.map((w, i) => (
                <motion.div
                  key={w.id}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                >
                  {renderWinnerCard(w)}
                </motion.div>
              ))
            ) : (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] as const }} className="glass flex flex-col items-center justify-center rounded-2xl p-12 text-center">
                <motion.div
                  className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-accent/10"
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                >
                  <Sparkles className="h-7 w-7 text-primary" />
                </motion.div>
                <h3 className="mb-2 font-display text-lg font-semibold text-foreground">{t("winners.emptyTitle")}</h3>
                <p className="max-w-sm text-sm text-muted-foreground">{t("winners.emptyDesc")}</p>
              </motion.div>
            )}

            {winners.length > 0 && (
              <motion.div
                className="pt-2 text-center"
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.6, duration: 0.4 }}
              >
                <motion.div whileHover={{ x: 4 }} transition={{ type: "spring" as const, stiffness: 300, damping: 20 }}>
                  <Link to="/historico" className="group inline-flex items-center gap-1.5 text-sm font-semibold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent hover:underline">
                    {t("winners.viewHistory")} <Trophy className="h-3.5 w-3.5" />
                  </Link>
                </motion.div>
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
