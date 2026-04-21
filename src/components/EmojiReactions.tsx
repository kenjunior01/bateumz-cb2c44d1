import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const REACTIONS = [
  { emoji: "🔥", label: "Fogo" },
  { emoji: "❤️", label: "Amei" },
  { emoji: "😍", label: "Lindo" },
  { emoji: "👏", label: "Bravo" },
  { emoji: "🏆", label: "Campeão" },
];

interface Props {
  onReact?: (emoji: string) => void;
  compact?: boolean;
}

export default function EmojiReactions({ onReact, compact }: Props) {
  const [recent, setRecent] = useState<string | null>(null);

  const handleClick = (emoji: string) => {
    setRecent(emoji);
    onReact?.(emoji);
    setTimeout(() => setRecent(null), 1200);
  };

  return (
    <div className="flex items-center gap-1 relative">
      {REACTIONS.map((r) => (
        <motion.button
          key={r.emoji}
          whileTap={{ scale: 1.5 }}
          whileHover={{ scale: 1.2, y: -2 }}
          onClick={() => handleClick(r.emoji)}
          className={`${compact ? "text-sm p-0.5" : "text-lg p-1"} hover:bg-secondary rounded-full transition-colors relative`}
          title={r.label}
        >
          {r.emoji}
        </motion.button>
      ))}
      <AnimatePresence>
        {recent && (
          <motion.span
            initial={{ opacity: 1, y: 0, scale: 1 }}
            animate={{ opacity: 0, y: -30, scale: 1.8 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="absolute -top-2 left-1/2 -translate-x-1/2 text-2xl pointer-events-none"
          >
            {recent}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}
