import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useLanguage } from "@/contexts/LanguageContext";
import { Medal } from "lucide-react";
import type { TournamentStanding } from "@/lib/tournaments";

interface TournamentLeaderboardProps {
  standings: TournamentStanding[];
}

const RANK_STYLES: Record<number, string> = {
  1: "bg-gradient-to-r from-amber-400 to-yellow-500 text-white shadow-amber-500/30 shadow-lg",
  2: "bg-gradient-to-r from-slate-300 to-gray-400 text-white shadow-gray-400/30 shadow-lg",
  3: "bg-gradient-to-r from-amber-600 to-orange-700 text-white shadow-orange-600/30 shadow-lg",
};

const RANK_COLORS: Record<number, string> = {
  1: "text-amber-500",
  2: "text-gray-400",
  3: "text-orange-600",
};

export default function TournamentLeaderboard({ standings }: TournamentLeaderboardProps) {
  const { t } = useLanguage();

  if (standings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Medal className="h-12 w-12 text-muted-foreground/40 mb-3" />
        <p className="text-sm text-muted-foreground">{t("tournament.noStandings")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Top 3 podium */}
      {standings.length >= 3 && (
        <div className="grid grid-cols-3 items-end gap-2 py-4">
          {/* 2nd place */}
          <PodiumCard standing={standings[1]} position={2} t={t} />
          {/* 1st place */}
          <PodiumCard standing={standings[0]} position={1} t={t} tall />
          {/* 3rd place */}
          <PodiumCard standing={standings[2]} position={3} t={t} />
        </div>
      )}

      {/* Full list */}
      <div className="space-y-1.5">
        <AnimatePresence>
          {standings.map((s, idx) => {
            const rank = idx + 1;
            const isTopThree = rank <= 3;
            return (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05, type: "spring", stiffness: 200 }}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors ${
                  isTopThree ? "bg-accent/10" : "hover:bg-muted/50"
                }`}
              >
                {/* Rank badge */}
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    RANK_STYLES[rank] ?? "bg-muted text-muted-foreground"
                  }`}
                >
                  {rank}
                </div>

                {/* Avatar + name */}
                <Avatar className="h-8 w-8">
                  <AvatarImage src={s.avatar_url} />
                  <AvatarFallback className="text-xs">
                    {(s.display_name || s.user_id).slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{s.display_name || "Anônimo"}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {s.games_played} {t("tournament.games")}
                    {s.wins > 0 && (
                      <span className={RANK_COLORS[rank] ?? "text-emerald-500"}>
                        {" "}
                        · {s.wins} {t("tournament.wins")}
                      </span>
                    )}
                  </p>
                </div>

                {/* Points */}
                <div className="text-right">
                  <p className={`text-sm font-bold ${isTopThree ? RANK_COLORS[rank] : ""}`}>
                    {s.total_points.toLocaleString("pt-BR")}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{t("tournament.points")}</p>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}

function PodiumCard({
  standing,
  position,
  t,
  tall,
}: {
  standing: TournamentStanding;
  position: number;
  t: (k: string) => string;
  tall?: boolean;
}) {
  const heights: Record<number, string> = { 1: "h-28", 2: "h-20", 3: "h-16" };
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: position * 0.15, type: "spring" }}
      className="flex flex-col items-center"
    >
      <Avatar className={`h-${tall ? "14" : "10"} w-${tall ? "14" : "10"} ring-2 ring-offset-2 ring-offset-background ${
        position === 1
          ? "ring-amber-400"
          : position === 2
          ? "ring-gray-400"
          : "ring-orange-600"
      }`}>
        <AvatarImage src={standing.avatar_url} />
        <AvatarFallback>
          {(standing.display_name || standing.user_id).slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <p className="mt-1 text-xs font-semibold truncate max-w-[80px]">
        {standing.display_name || "Anônimo"}
      </p>
      <p className="text-[10px] text-muted-foreground">
        {standing.total_points.toLocaleString("pt-BR")} {t("tournament.points")}
      </p>
      <div
        className={`mt-2 w-full rounded-t-lg flex items-center justify-center ${heights[position]} ${
          position === 1
            ? "bg-gradient-to-t from-amber-500/20 to-amber-400/40"
            : position === 2
            ? "bg-gradient-to-t from-gray-500/20 to-gray-400/30"
            : "bg-gradient-to-t from-orange-600/20 to-orange-500/30"
        }`}
      >
        <span className="text-lg font-bold">{position}</span>
      </div>
    </motion.div>
  );
}
