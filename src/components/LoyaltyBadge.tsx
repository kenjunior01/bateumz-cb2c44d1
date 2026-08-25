import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Shield, Star, Crown, Gem } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface LoyaltyLevel {
  name: string;
  icon: typeof Shield;
  minPoints: number;
  color: string;
  gradient: string;
  benefits: string[];
}

const LEVELS: LoyaltyLevel[] = [
  { name: "Bronze", icon: Shield, minPoints: 0, color: "text-orange-700", gradient: "from-orange-600 to-orange-800", benefits: ["Basic access", "Earn points"] },
  { name: "Silver", icon: Star, minPoints: 500, color: "text-slate-400", gradient: "from-slate-400 to-slate-600", benefits: ["5% points bonus", "Monthly free ticket"] },
  { name: "Gold", icon: Crown, minPoints: 2000, color: "text-yellow-500", gradient: "from-yellow-400 to-amber-600", benefits: ["10% points bonus", "Early access", "2 free tickets/month"] },
  { name: "VIP", icon: Gem, minPoints: 5000, color: "text-violet-400", gradient: "from-violet-500 to-purple-700", benefits: ["20% bonus", "2x multiplier", "Exclusive raffles", "Priority support"] },
];

export const getLevelForPoints = (points: number): LoyaltyLevel => {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (points >= LEVELS[i].minPoints) return LEVELS[i];
  }
  return LEVELS[0];
};

export const getNextLevel = (points: number): LoyaltyLevel | null => {
  const current = getLevelForPoints(points);
  const idx = LEVELS.indexOf(current);
  return idx < LEVELS.length - 1 ? LEVELS[idx + 1] : null;
};

interface Props {
  compact?: boolean;
  showProgress?: boolean;
}

const LoyaltyBadge = ({ compact = false, showProgress = true }: Props) => {
  const { user } = useAuth();
  const [totalPoints, setTotalPoints] = useState(0);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("luck_points")
      .select("points")
      .eq("user_id", user.id)
      .then(({ data }) => {
        if (data) setTotalPoints(data.reduce((sum, r) => sum + r.points, 0));
      });
  }, [user]);

  if (!user) return null;

  const level = getLevelForPoints(totalPoints);
  const next = getNextLevel(totalPoints);
  const Icon = level.icon;

  if (compact) {
    return (
      <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-gradient-to-r ${level.gradient} text-white text-[10px] font-bold`}>
        <Icon className="h-3 w-3" />
        {level.name}
      </div>
    );
  }

  const progressPct = next
    ? ((totalPoints - level.minPoints) / (next.minPoints - level.minPoints)) * 100
    : 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-card border border-border p-4 shadow-[0_0_10px_hsl(var(--primary)/0.1)]"
    >
      <div className="flex items-center gap-3 mb-3">
        <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${level.gradient} flex items-center justify-center shadow-[0_0_12px_hsl(var(--primary)/0.15)]`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Nível actual</p>
          <p className={`font-display font-bold ${level.color}`}>{level.name}</p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-xs text-muted-foreground">Pontos</p>
          <p className="font-bold text-foreground">{totalPoints.toLocaleString()}</p>
        </div>
      </div>

      {showProgress && next && (
        <div>
          <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
            <span>{level.name}</span>
            <span>{next.name} ({next.minPoints.toLocaleString()} pts)</span>
          </div>
          <div className="h-2 rounded-full bg-secondary overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(progressPct, 100)}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className={`h-full rounded-full bg-gradient-to-r ${level.gradient}`}
            />
          </div>
          <p className="text-[10px] text-muted-foreground mt-1 text-center">
            Faltam {(next.minPoints - totalPoints).toLocaleString()} pts para {next.name}
          </p>
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-1.5">
        {level.benefits.map((b) => (
          <span key={b} className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
            ✓ {b}
          </span>
        ))}
      </div>
    </motion.div>
  );
};

export default LoyaltyBadge;
