import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Gift } from "lucide-react";
import confetti from "canvas-confetti";

interface Props {
  highChance?: number;
  lowChance?: number;
  noneChance?: number;
  onScore?: (name: string, score: number) => void;
}

const buildBoxes = (high: number, low: number, none: number) => {
  // Normalize
  const total = high + low + none || 1;
  const h = high / total;
  const l = low / total;
  const n = none / total;

  // Build 4 boxes weighted by probabilities (using cumulative pick)
  const pool: { emoji: string; label: string; value: "high" | "low" | "none" }[] = [];
  const pick = () => {
    const r = Math.random();
    if (r < h) return { emoji: "💎", label: "200 Luck Points", value: "high" as const };
    if (r < h + l) return { emoji: "⭐", label: "50 Luck Points", value: "low" as const };
    return { emoji: "😅", label: "Tente outra vez", value: "none" as const };
  };
  // Ensure at least one of each common types if probs > 0
  for (let i = 0; i < 4; i++) pool.push(pick());
  return pool.sort(() => Math.random() - 0.5);
};

const MysteryBox = ({ highChance = 0.25, lowChance = 0.4, noneChance = 0.35, onScore }: Props) => {
  const [picked, setPicked] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [boxes, setBoxes] = useState(() => buildBoxes(highChance, lowChance, noneChance));

  // Rebuild when chances change and game is idle
  useEffect(() => {
    if (picked === null) setBoxes(buildBoxes(highChance, lowChance, noneChance));
  }, [highChance, lowChance, noneChance, picked]);

  const pick = (i: number) => {
    if (picked !== null) return;
    setPicked(i);
    const box = boxes[i];
    if (box.value !== "none") {
      confetti({ particleCount: 60, spread: 50, origin: { y: 0.6 } });
      const score = box.value === "high" ? 200 : 50;
      if (name.trim()) onScore?.(name.trim(), score);
    }
  };

  const reset = () => {
    setBoxes(buildBoxes(highChance, lowChance, noneChance));
    setPicked(null);
  };

  return (
    <div className="max-w-sm mx-auto">
      <div className="text-center mb-4">
        <Gift className="h-8 w-8 text-primary mx-auto mb-1" />
        <h3 className="font-display text-base font-bold text-foreground">Caixa Misteriosa</h3>
        <p className="text-xs text-muted-foreground">Escolhe 1 das 4 caixas</p>
      </div>

      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="O teu nome (para o leaderboard)"
        className="w-full mb-3 px-3 py-2 rounded-xl bg-card border border-border text-sm"
        style={{ boxShadow: '0 0 12px rgba(59,130,246,0.1)' }}
        disabled={picked !== null}
      />

      <div className="grid grid-cols-2 gap-3">
        {boxes.map((box, i) => {
          const revealed = picked === i || picked !== null;
          const isPicked = picked === i;
          return (
            <motion.button
              key={i}
              whileHover={picked === null ? { scale: 1.04 } : {}}
              whileTap={picked === null ? { scale: 0.96 } : {}}
              onClick={() => pick(i)}
              disabled={picked !== null}
              className={`aspect-square rounded-2xl flex flex-col items-center justify-center gap-1 border-2 transition-all ${
                isPicked
                  ? "bg-primary/10 border-primary"
                  : picked !== null
                  ? "bg-card border-border opacity-60"
                  : "bg-gradient-to-br from-primary/20 to-primary/5 border-primary/30 hover:border-primary"
              }`}
              style={picked === null ? { boxShadow: '0 0 20px rgba(59,130,246,0.15)' } : undefined}
            >
              <AnimatePresence mode="wait">
                {!revealed ? (
                  <motion.span key="closed" initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="text-4xl">
                    🎁
                  </motion.span>
                ) : (
                  <motion.div
                    key="open"
                    initial={{ rotateY: 180, opacity: 0 }}
                    animate={{ rotateY: 0, opacity: 1 }}
                    className="flex flex-col items-center gap-1"
                  >
                    <span className="text-3xl">{box.emoji}</span>
                    <span className="text-[10px] font-bold text-foreground px-2 text-center leading-tight">{box.label}</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          );
        })}
      </div>

      {picked !== null && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center mt-5">
          <p className={`font-bold text-base ${boxes[picked].value === "none" ? "text-muted-foreground" : "text-primary"}`}>
            {boxes[picked].value === "none" ? "😅 Sem sorte desta vez" : `🎉 Ganhaste: ${boxes[picked].label}`}
          </p>
          <motion.button whileHover={{scale:1.03}} onClick={reset} className="mt-2 text-sm text-primary font-medium hover:underline">
            🔁 Nova rodada
          </motion.button>
        </motion.div>
      )}
    </div>
  );
};

export default MysteryBox;
