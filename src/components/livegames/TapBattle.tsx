import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Trophy, Users, User } from "lucide-react";
import confetti from "canvas-confetti";

interface Props {
  duration?: number;
  onScore?: (name: string, score: number) => void;
}

const TapBattle = ({ duration = 5, onScore }: Props) => {
  const [mode, setMode] = useState<"bot" | "vs">("bot");
  const [phase, setPhase] = useState<"idle" | "running" | "done">("idle");
  const [p1Taps, setP1Taps] = useState(0);
  const [p2Taps, setP2Taps] = useState(0); // bot or player 2
  const [time, setTime] = useState(duration);
  const [p1Name, setP1Name] = useState("Jogador 1");
  const [p2Name, setP2Name] = useState("Jogador 2");
  const intervalRef = useRef<number | null>(null);
  const botRef = useRef<number | null>(null);

  useEffect(() => setTime(duration), [duration]);

  const start = () => {
    setP1Taps(0);
    setP2Taps(0);
    setTime(duration);
    setPhase("running");
    const startTs = Date.now();

    intervalRef.current = window.setInterval(() => {
      const remaining = Math.max(0, duration - (Date.now() - startTs) / 1000);
      setTime(Number(remaining.toFixed(1)));
      if (remaining <= 0) finish();
    }, 80);

    if (mode === "bot") {
      const botRate = 3 + Math.random() * 3;
      botRef.current = window.setInterval(() => setP2Taps((o) => o + 1), 1000 / botRate);
    }
  };

  const finish = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (botRef.current) clearInterval(botRef.current);
    setPhase("done");
    setP1Taps((t1) => {
      setP2Taps((t2) => {
        if (t1 > t2) {
          confetti({ particleCount: 100, spread: 70, origin: { x: 0.3, y: 0.7 } });
          onScore?.(p1Name, t1);
        } else if (t2 > t1) {
          if (mode === "vs") {
            confetti({ particleCount: 100, spread: 70, origin: { x: 0.7, y: 0.7 } });
            onScore?.(p2Name, t2);
          }
        }
        return t2;
      });
      return t1;
    });
  };

  useEffect(() => () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (botRef.current) clearInterval(botRef.current);
  }, []);

  const winnerLabel = p1Taps === p2Taps ? "🤝 Empate!" : (p1Taps > p2Taps ? `🏆 ${p1Name} venceu!` : `🏆 ${mode === "vs" ? p2Name : "Adversário"} venceu!`);

  return (
    <div className="max-w-md mx-auto flex flex-col items-center gap-4">
      {/* Mode selector */}
      {phase === "idle" && (
        <div className="flex gap-2 w-full">
          <button
            onClick={() => setMode("bot")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-full text-xs font-medium transition ${mode === "bot" ? "bg-primary text-primary-foreground" : "bg-card border border-border"}`}
          >
            <User className="h-3.5 w-3.5" /> vs Bot
          </button>
          <button
            onClick={() => setMode("vs")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-full text-xs font-medium transition ${mode === "vs" ? "bg-primary text-primary-foreground" : "bg-card border border-border"}`}
          >
            <Users className="h-3.5 w-3.5" /> 2 Jogadores
          </button>
        </div>
      )}

      {phase === "idle" && mode === "vs" && (
        <div className="grid grid-cols-2 gap-2 w-full">
          <input
            value={p1Name}
            onChange={(e) => setP1Name(e.target.value)}
            placeholder="Jogador 1"
            className="px-3 py-2 rounded-xl bg-card border border-border text-sm"
          />
          <input
            value={p2Name}
            onChange={(e) => setP2Name(e.target.value)}
            placeholder="Jogador 2"
            className="px-3 py-2 rounded-xl bg-card border border-border text-sm"
          />
        </div>
      )}

      <div className="w-full grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-primary/10 border border-primary/30 p-3 text-center">
          <p className="text-[10px] uppercase tracking-wider text-primary font-bold truncate">{p1Name}</p>
          <p className="font-display text-3xl font-bold text-foreground">{p1Taps}</p>
        </div>
        <div className="rounded-2xl bg-card border border-border p-3 text-center">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold truncate">
            {mode === "vs" ? p2Name : "Adversário"}
          </p>
          <p className="font-display text-3xl font-bold text-foreground">{p2Taps}</p>
        </div>
      </div>

      <div className="w-full text-center">
        <p className="text-xs text-muted-foreground">Tempo restante</p>
        <p className="font-display text-2xl font-bold text-primary">{time}s</p>
      </div>

      {phase === "idle" && (
        <button
          onClick={start}
          className="px-8 py-4 rounded-full bg-primary text-primary-foreground font-bold text-base shadow-lg flex items-center gap-2"
        >
          <Zap className="h-5 w-5" /> Começar Batalha
        </button>
      )}

      {phase === "running" && (
        <div className={`w-full grid ${mode === "vs" ? "grid-cols-2" : "grid-cols-1"} gap-3 place-items-center`}>
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => setP1Taps((t) => t + 1)}
            className="w-40 h-40 rounded-full bg-gradient-to-br from-primary to-primary/70 text-primary-foreground font-bold text-lg shadow-2xl border-4 border-primary-foreground/20 select-none touch-none"
          >
            {p1Name.split(" ")[0]} 👆
          </motion.button>
          {mode === "vs" && (
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={() => setP2Taps((t) => t + 1)}
              className="w-40 h-40 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 text-white font-bold text-lg shadow-2xl border-4 border-white/20 select-none touch-none"
            >
              {p2Name.split(" ")[0]} 👆
            </motion.button>
          )}
        </div>
      )}

      <AnimatePresence>
        {phase === "done" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full text-center px-6 py-4 rounded-2xl bg-primary/10 text-primary"
          >
            <Trophy className="h-6 w-6 mx-auto mb-1" />
            <p className="font-bold text-lg">{winnerLabel}</p>
            <p className="text-xs mt-1">{p1Taps} vs {p2Taps} taps</p>
            <button onClick={() => setPhase("idle")} className="mt-3 text-sm text-primary font-medium hover:underline">
              🔁 Nova batalha
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TapBattle;
