import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { getLevelForXP } from "@/lib/gamification";
import type { CreatorLevel } from "@/lib/gamification";

interface Props {
  totalXP: number;
  showProgress?: boolean;
  size?: "sm" | "md" | "lg";
}

const sizeMap = {
  sm: { badge: "h-6 px-2 text-[9px]", bar: "h-1" },
  md: { badge: "h-8 px-3 text-xs", bar: "h-1.5" },
  lg: { badge: "h-10 px-4 text-sm", bar: "h-2" },
};

const CreatorLevelBadge = ({ totalXP, showProgress = true, size = "md" }: Props) => {
  const level = getLevelForXP(totalXP);
  const currentLevelXP = totalXP - level.min_xp;
  const nextLevel = { min_xp: level.min_xp * 3 }; // rough estimate
  const xpNeeded = nextLevel.min_xp - level.min_xp;
  const percent = xpNeeded > 0 ? Math.min(100, Math.round((currentLevelXP / xpNeeded) * 100)) : 100;
  const s = sizeMap[size];

  return (
    <div className="flex flex-col gap-0.5">
      <motion.div
        whileHover={{ scale: 1.05 }}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full font-bold text-white shrink-0",
          s.badge
        )}
        style={{ backgroundColor: level.badge_color }}
      >
        <span>{level.badge_emoji}</span>
        <span>Lv.{level.level}</span>
      </motion.div>
      {showProgress && (
        <div className={cn("w-full rounded-full bg-muted/50 overflow-hidden", s.bar)}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${percent}%`,
              backgroundColor: level.badge_color,
            }}
          />
        </div>
      )}
    </div>
  );
};

export default CreatorLevelBadge;
