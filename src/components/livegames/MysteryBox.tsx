import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Gift } from "lucide-react";
import confetti from "canvas-confetti";

const PRIZES = [
  { emoji: "💎", label: "200 Luck Points", value: "high" },
  { emoji: "🎫", label: "Bilhete Grátis", value: "high" },
  { emoji: "⭐", label: "50 Luck Points", value: "low" },
  { emoji: "😅", label: "Tente outra vez", value: "none" },
];

const MysteryBox = () => {
  const [picked, setPicked] = useState<number | null>(null);
  const [boxes, setBoxes] = useState(() => [...PRIZES].sort(() => Math.random() - 0.5));

  const pick = (i: number) => {
    if (picked !== null) return;
    setPicked(i);
    if (boxes[i].value !== "none") {
      confetti({ particleCount: 60, spread: 50, origin: { y: 0.6 } });
    }
  };

  const reset = () => {
    setBoxes([...PRIZES].sort(() => Math.random() - 0.5));
    setPicked(null);
  };

  return (
    <div className="max-w-sm mx-auto">
      <div className="text-center mb-5">
        <Gift className="h-8 w-8 text-primary mx-auto mb-1" />
        <h3 className="font-display text-base font-bold text-foreground">Caixa Misteriosa</h3>
        <p className="text-xs text-muted-foreground">Escolhe 1 das 4 caixas. Apenas 1 tem o melhor prémio!</p>
      </div>

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
          <button onClick={reset} className="mt-2 text-sm text-primary font-medium hover:underline">
            🔁 Nova rodada
          </button>
        </motion.div>
      )}
    </div>
  );
};

export default MysteryBox;
