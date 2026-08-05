import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Star, Zap, TrendingUp, Award } from "lucide-react";

const LEVELS = [
  { level: 1, title: "Iniciante", minXP: 0, color: "from-gray-400 to-gray-500" },
  { level: 2, title: "Entusiasta", minXP: 100, color: "from-blue-400 to-blue-500" },
  { level: 3, title: "Regular", minXP: 500, color: "from-emerald-400 to-green-500" },
  { level: 4, title: "Popular", minXP: 1500, color: "from-amber-400 to-yellow-500" },
  { level: 5, title: "Estrela", minXP: 5000, color: "from-pink-400 to-rose-500" },
  { level: 6, title: "Lenda", minXP: 15000, color: "from-violet-400 to-purple-500" },
  { level: 7, title: "Idolo", minXP: 50000, color: "from-red-400 to-orange-500" },
  { level: 8, title: "Mitico", minXP: 150000, color: "from-amber-500 to-yellow-400" },
];

interface UserData {
  totalXP: number;
  level: number;
  title: string;
  nextLevel: number;
  nextTitle: string;
  progress: number;
  xpInLevel: number;
  xpNeeded: number;
  streak: number;
  gamesPlayed: number;
}

function getLevelData(xp: number): UserData {
  let current = LEVELS[0];
  let next = LEVELS[1] || current;
  for (let i = 0; i < LEVELS.length; i++) {
    if (xp >= LEVELS[i].minXP) {
      current = LEVELS[i];
      next = LEVELS[i + 1] || { ...LEVELS[i], minXP: LEVELS[i].minXP + 100000 };
    } else break;
  }
  const xpInLevel = xp - current.minXP;
  const xpNeeded = next.minXP - current.minXP;
  const progress = Math.min(100, Math.round((xpInLevel / xpNeeded) * 100));
  const stored = localStorage.getItem("bateu_daily_rewards");
  let streak = 0;
  if (stored) {
    try { streak = JSON.parse(stored).streak || 0; } catch { /* empty */ }
  }
  const gamesPlayed = parseInt(localStorage.getItem("bateu_games_played") || "0", 10);
  return { totalXP: xp, level: current.level, title: current.title, nextLevel: next.level, nextTitle: next.title || "MAX", progress, xpInLevel, xpNeeded, streak, gamesPlayed };
}

export default function LevelProgressWidget({ className = "" }: { className?: string }) {
  const [data, setData] = useState<UserData>(() => getLevelData(0));

  useEffect(() => {
    const xp = parseInt(localStorage.getItem("bateu_user_xp") || "0", 10);
    setData(getLevelData(xp));

    const interval = window.setInterval(() => {
      const newXp = parseInt(localStorage.getItem("bateu_user_xp") || "0", 10);
      setData(getLevelData(newXp));
    }, 5000);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className={"rounded-2xl border border-border bg-card p-4 overflow-hidden relative " + className}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5 pointer-events-none" />
      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className={"h-10 w-10 rounded-xl bg-gradient-to-br " + LEVELS[Math.min(data.level - 1, LEVELS.length - 1)].color + " flex items-center justify-center shadow-lg"}>
              <Award className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className={"text-sm font-bold bg-gradient-to-r " + LEVELS[Math.min(data.level - 1, LEVELS.length - 1)].color + " bg-clip-text text-transparent"}>
                Nivel {data.level} - {data.title}
              </p>
              <p className="text-[10px] text-muted-foreground">Jogador Bateu</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-primary">{data.totalXP.toLocaleString()} XP</p>
            <p className="text-[10px] text-muted-foreground">Nivel {data.nextLevel}: {data.nextTitle}</p>
          </div>
        </div>

        <div className="relative h-2.5 rounded-full bg-muted/50 overflow-hidden mb-2">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: data.progress + "%" }}
            transition={{ duration: 1.2, ease: [0.25, 0.46, 0.45, 0.94] }}
            className={"absolute inset-y-0 left-0 rounded-full bg-gradient-to-r " + LEVELS[Math.min(data.level - 1, LEVELS.length - 1)].color}
            style={{ boxShadow: "0 0 12px hsl(var(--primary) / 0.3)" }}
          />
          <div className="absolute inset-0 rounded-full border border-white/10" />
        </div>
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span>{data.xpInLevel} / {data.xpNeeded} XP</span>
          <span>{data.progress}%</span>
        </div>

        <div className="grid grid-cols-3 gap-2 mt-3">
          <div className="flex items-center gap-1.5 rounded-lg bg-muted/30 px-2.5 py-1.5">
            <Zap className="h-3 w-3 text-amber-500" />
            <div>
              <p className="text-xs font-bold">{data.streak}</p>
              <p className="text-[9px] text-muted-foreground">Streak</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg bg-muted/30 px-2.5 py-1.5">
            <Star className="h-3 w-3 text-primary" />
            <div>
              <p className="text-xs font-bold">{data.gamesPlayed}</p>
              <p className="text-[9px] text-muted-foreground">Jogos</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg bg-muted/30 px-2.5 py-1.5">
            <TrendingUp className="h-3 w-3 text-emerald-500" />
            <div>
              <p className="text-xs font-bold">{data.totalXP}</p>
              <p className="text-[9px] text-muted-foreground">XP Total</p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
