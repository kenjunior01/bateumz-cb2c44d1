import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Crown, Medal } from "lucide-react";

interface LeaderEntry {
  id: string;
  participant_name: string;
  votes_count: number;
  photo_url: string | null;
}

interface Props {
  contestId: string;
  evaluationType: string;
}

const MEDAL_COLORS = ["text-yellow-500", "text-gray-400", "text-amber-700"];
const BG_COLORS = ["from-yellow-500/10 to-yellow-500/5", "from-gray-300/10 to-gray-300/5", "from-amber-700/10 to-amber-600/5"];

export default function LiveLeaderboard({ contestId, evaluationType }: Props) {
  const [leaders, setLeaders] = useState<LeaderEntry[]>([]);

  const fetchTop = async () => {
    const orderCol = evaluationType === "views" ? "views_count" : "votes_count";
    const { data } = await supabase
      .from("contest_submissions")
      .select("id, participant_name, votes_count, views_count, photo_url")
      .eq("contest_id", contestId)
      .eq("status", "approved")
      .order(orderCol, { ascending: false })
      .limit(3);
    if (data) {
      setLeaders(data.map((d: any) => ({
        id: d.id,
        participant_name: d.participant_name,
        votes_count: evaluationType === "views" ? d.views_count : d.votes_count,
        photo_url: d.photo_url,
      })));
    }
  };

  useEffect(() => {
    fetchTop();
    const channel = supabase
      .channel(`leaderboard-${contestId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "contest_votes" }, () => {
        fetchTop();
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "contest_submissions", filter: `contest_id=eq.${contestId}` }, () => {
        fetchTop();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [contestId, evaluationType]);

  if (leaders.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-8 p-4 rounded-2xl glass"
    >
      <div className="flex items-center gap-2 mb-3">
        <Crown className="h-5 w-5 text-yellow-500" />
        <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
          Leaderboard ao Vivo
        </h3>
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="h-2 w-2 rounded-full bg-red-500"
        />
      </div>
      <div className="flex items-end justify-center gap-3 sm:gap-6">
        {/* Reorder for podium: 2nd, 1st, 3rd */}
        {[leaders[1], leaders[0], leaders[2]].filter(Boolean).map((entry, visualIdx) => {
          const realRank = visualIdx === 0 ? 2 : visualIdx === 1 ? 1 : 3;
          const height = realRank === 1 ? "h-20" : realRank === 2 ? "h-14" : "h-10";
          const colorIdx = realRank - 1;
          return (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: visualIdx * 0.1, type: "spring" }}
              className="flex flex-col items-center gap-1 min-w-[70px]"
            >
              <div className="relative">
                {entry.photo_url ? (
                  <img
                    src={entry.photo_url}
                    alt={entry.participant_name}
                    className={`${realRank === 1 ? "h-14 w-14" : "h-10 w-10"} rounded-full object-cover border-2 ${realRank === 1 ? "border-yellow-500" : "border-border"}`}
                  />
                ) : (
                  <div className={`${realRank === 1 ? "h-14 w-14" : "h-10 w-10"} rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary`}>
                    {entry.participant_name.charAt(0).toUpperCase()}
                  </div>
                )}
                {realRank === 1 && (
                  <motion.div
                    animate={{ y: [0, -3, 0] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    className="absolute -top-3 left-1/2 -translate-x-1/2"
                  >
                    <Crown className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                  </motion.div>
                )}
              </div>
              <p className="text-xs font-semibold text-foreground truncate max-w-[80px] text-center">
                {entry.participant_name}
              </p>
              <span className={`text-xs font-bold ${MEDAL_COLORS[colorIdx]}`}>
                {entry.votes_count} {evaluationType === "views" ? "👁" : "♥"}
              </span>
              <div className={`w-full ${height} rounded-t-lg bg-gradient-to-t ${BG_COLORS[colorIdx]} flex items-center justify-center`}>
                <span className={`text-lg font-bold ${MEDAL_COLORS[colorIdx]}`}>#{realRank}</span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
