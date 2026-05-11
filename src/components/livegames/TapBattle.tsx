import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Trophy } from "lucide-react";
import confetti from "canvas-confetti";

const DURATION = 5;

const TapBattle = () => {
  const [phase, setPhase] = useState<"idle" | "running" | "done">("idle");
  const [taps, setTaps] = useState(0);
  const [time, setTime] = useState(DURATION);
  const [opponent, setOpponent] = useState(0);
  const intervalRef = useRef<number | null>(null);
  const opponentRef = useRef<number | null>(null);

  const start = () => {
    setTaps(0);
    setOpponent(0);
    setTime(DURATION);
    setPhase("running");
    const startTs = Date.now();

    intervalRef.current = window.setInterval(() => {
      const elapsed = (Date.now() - startTs) / 1000;
      const remaining = Math.max(0, DURATION - elapsed);
      setTime(Number(remaining.toFixed(1)));
      if (remaining <= 0) {
        finish();
      }
    }, 80);

    // Bot opponent: random tap rate (3-6 tps)
    const botRate = 3 + Math.random() * 3;
    opponentRef.current = window.setInterval(() => {
      setOpponent((o) => o + 1);
    }, 1000 / botRate);
  };

  const finish = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (opponentRef.current) clearInterval(opponentRef.current);
    setPhase("done");
    setTaps((t) => {
      setOpponent((o) => {
        if (t > o) {
          confetti({ particleCount: 100, spread: 70, origin: { y: 0.7 } });
        }
        return o;
      });
      return t;
    });
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (opponentRef.current) clearInterval(opponentRef.current);
    };
  }, []);

  const tap = () => {
    if (phase !== "running") return;
    setTaps((t) => t + 1);
  };

  const won = taps > opponent;

  return (
    <div className="max-w-sm mx-auto flex flex-col items-center gap-4">
      <div className="w-full grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-primary/10 border border-primary/30 p-3 text-center">
          <p className="text-[10px] uppercase tracking-wider text-primary font-bold">Tu</p>
          <p className="font-display text-3xl font-bold text-foreground">{taps}</p>
        </div>
        <div className="rounded-2xl bg-card border border-border p-3 text-center">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Adversário</p>
          <p className="font-display text-3xl font-bold text-foreground">{opponent}</p>
        </div>
      </div>

      <div className="w-full text-center">
        <p className="text-xs text-muted-foreground">Tempo restante</p>
        <p className="font-display text-2xl font-bold text-primary">{time}s</p>
      </div>

      {phase === "idle" && (
        <button
          onClick={start}
          className="px-8 py-4 rounded-full bg-primary text-primary-foreground font-bold text-base hover:bg-primary/90 transition-all shadow-lg flex items-center gap-2"
        >
          <Zap className="h-5 w-5" /> Começar Batalha
        </button>
      )}

      {phase === "running" && (
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={tap}
          className="w-48 h-48 rounded-full bg-gradient-to-br from-primary to-primary/70 text-primary-foreground font-bold text-xl shadow-2xl border-4 border-primary-foreground/20 select-none touch-none"
        >
          TAP! 👆
        </motion.button>
      )}

      <AnimatePresence>
        {phase === "done" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`w-full text-center px-6 py-4 rounded-2xl ${won ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"}`}
          >
            <Trophy className="h-6 w-6 mx-auto mb-1" />
            <p className="font-bold text-lg">{won ? "🏆 Vitória!" : "😅 Tente outra vez!"}</p>
            <p className="text-xs mt-1">{taps} vs {opponent} taps</p>
            <button onClick={start} className="mt-3 text-sm text-primary font-medium hover:underline">
              🔁 Nova batalha
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TapBattle;
