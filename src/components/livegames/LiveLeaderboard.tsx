import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Medal } from "lucide-react";

export type LeaderEntry = {
  id: string;
  name: string;
  score: number;
  game: string;
  at: number;
};

interface Props {
  entries: LeaderEntry[];
  onClear?: () => void;
}

const medalColor = (i: number) =>
  i === 0 ? "text-yellow-500" : i === 1 ? "text-slate-400" : i === 2 ? "text-amber-700" : "text-muted-foreground";

const LiveLeaderboard = ({ entries, onClear }: Props) => {
  const sorted = [...entries].sort((a, b) => b.score - a.score).slice(0, 10);

  return (
    <div className="max-w-sm mx-auto rounded-2xl bg-card border border-border overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-primary/10 to-primary/5 border-b border-border">
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-primary" />
          <h3 className="font-display text-sm font-bold text-foreground">Leaderboard da Live</h3>
        </div>
        {onClear && entries.length > 0 && (
          <button onClick={onClear} className="text-[11px] text-muted-foreground hover:text-foreground">
            Limpar
          </button>
        )}
      </div>

      {sorted.length === 0 ? (
        <p className="text-center text-xs text-muted-foreground py-6">
          Sem jogadores ainda. Joga uma rodada para entrar!
        </p>
      ) : (
        <ul className="divide-y divide-border">
          <AnimatePresence initial={false}>
            {sorted.map((e, i) => (
              <motion.li
                key={e.id}
                layout
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-3 px-4 py-2.5"
              >
                <span className={`flex items-center justify-center w-7 h-7 rounded-full bg-secondary font-bold text-xs ${medalColor(i)}`}>
                  {i < 3 ? <Medal className="h-3.5 w-3.5" /> : i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{e.name}</p>
                  <p className="text-[10px] text-muted-foreground">{e.game}</p>
                </div>
                <span className="font-display text-sm font-bold text-primary">{e.score}</span>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </div>
  );
};

export default LiveLeaderboard;
