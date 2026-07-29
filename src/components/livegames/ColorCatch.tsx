import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, RotateCcw, Trophy, Bot, User, Palette } from "lucide-react";
import confetti from "canvas-confetti";

interface Props {
  onScore?: (name: string, score: number) => void;
  liveCode?: string;
}

type Phase = "idle" | "countdown" | "playing" | "done";
type Mode = "bot" | "vs";

const COLORS = [
  { name: "Vermelho", bg: "bg-red-500", ring: "ring-red-300", hex: "#ef4444" },
  { name: "Azul", bg: "bg-blue-500", ring: "ring-blue-300", hex: "#3b82f6" },
  { name: "Verde", bg: "bg-green-500", ring: "ring-green-300", hex: "#22c55e" },
  { name: "Amarelo", bg: "bg-yellow-400", ring: "ring-yellow-300", hex: "#facc15" },
  { name: "Roxo", bg: "bg-purple-500", ring: "ring-purple-300", hex: "#a855f7" },
  { name: "Rosa", bg: "bg-pink-500", ring: "ring-pink-300", hex: "#ec4899" },
];

const GAME_DURATION = 30;
const SPAWN_INTERVAL = 800;
const CIRCLE_LIFETIME = 2000;
const GOOD_POINTS = 1;
const BAD_PENALTY = 1;

interface Circle {
  id: number;
  colorIndex: number;
  x: number;
  y: number;
  size: number;
  createdAt: number;
}

const ColorCatch = ({ onScore, liveCode }: Props) => {
  const [phase, setPhase] = useState<Phase>("idle");
  const [mode, setMode] = useState<Mode>("bot");
  const [p1Score, setP1Score] = useState(0);
  const [p2Score, setP2Score] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [countdown, setCountdown] = useState(3);
  const [winner, setWinner] = useState("");
  const [p1Name, setP1Name] = useState("Jogador 1");
  const [p2Name, setP2Name] = useState("Jogador 2");
  const [targetColor, setTargetColor] = useState(0);
  const [circles, setCircles] = useState<Circle[]>([]);
  const [p1Combo, setP1Combo] = useState(0);
  const [p2Combo, setP2Combo] = useState(0);
  const [lastHit, setLastHit] = useState<"p1" | "p2" | null>(null);

  const circleIdRef = useRef(0);
  const timerRef = useRef<number>(0);
  const spawnRef = useRef<number>(0);
  const cleanupRef = useRef<number>(0);
  const p2ScoreRef = useRef(0);
  const phaseRef = useRef<Phase>("idle");
  const modeRef = useRef<Mode>("bot");
  const targetColorRef = useRef(0);
  const circlesRef = useRef<Circle[]>([]);

  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { targetColorRef.current = targetColor; }, [targetColor]);
  useEffect(() => { p2ScoreRef.current = p2Score; }, [p2Score]);
  useEffect(() => { circlesRef.current = circles; }, [circles]);

  const changeTargetColor = useCallback(() => {
    let next: number;
    do { next = Math.floor(Math.random() * COLORS.length); } while (next === targetColorRef.current);
    setTargetColor(next);
  }, []);

  const spawnCircle = useCallback(() => {
    if (phaseRef.current !== "playing") return;
    const id = ++circleIdRef.current;
    // 50% chance of being the target color
    const isTarget = Math.random() < 0.45;
    const colorIndex = isTarget ? targetColorRef.current : (() => {
      let c: number;
      do { c = Math.floor(Math.random() * COLORS.length); } while (c === targetColorRef.current);
      return c;
    })();

    const size = 36 + Math.random() * 24; // 36-60px
    const x = 10 + Math.random() * 80; // 10-90%
    const y = 10 + Math.random() * 80;
    const circle: Circle = { id, colorIndex, x, y, size, createdAt: Date.now() };

    setCircles((prev) => [...prev.slice(-12), circle]); // Max 12 on screen
  }, []);

  // Cleanup expired circles
  const cleanupCircles = useCallback(() => {
    const now = Date.now();
    setCircles((prev) => prev.filter((c) => now - c.createdAt < CIRCLE_LIFETIME));
  }, []);

  // Bot AI
  const botTick = useCallback(() => {
    if (phaseRef.current !== "playing" || modeRef.current !== "bot") return;
    const now = Date.now();
    const cList = circlesRef.current;
    const target = targetColorRef.current;
    // Find a target-colored circle that the bot can "click"
    const targetCircle = cList.find((c) => c.colorIndex === target && now - c.createdAt < CIRCLE_LIFETIME * 0.7);
    if (targetCircle && Math.random() < 0.55) {
      p2ScoreRef.current += 1;
      setP2Score(p2ScoreRef.current);
      setCircles((prev) => prev.filter((c) => c.id !== targetCircle.id));
      setP2Combo((c) => c + 1);
      setLastHit("p2");
    }
  }, []);

  useEffect(() => {
    if (phase !== "playing") return;
    const botInterval = window.setInterval(botTick, 600);
    return () => clearInterval(botInterval);
  }, [phase, botTick]);

  const tapCircle = useCallback((circle: Circle, player: 1 | 2) => {
    const isCorrect = circle.colorIndex === targetColorRef.current;
    // Remove circle
    setCircles((prev) => prev.filter((c) => c.id !== circle.id));

    if (isCorrect) {
      if (player === 1) {
        const bonus = p1Combo >= 5 ? 2 : p1Combo >= 3 ? 1 : 0;
        setP1Score((s) => s + GOOD_POINTS + bonus);
        setP1Combo((c) => c + 1);
        setP2Combo(0);
        setLastHit("p1");
      } else {
        setP2Score((s) => s + GOOD_POINTS);
        setP2Combo((c) => c + 1);
        setP1Combo(0);
        setLastHit("p2");
      }
    } else {
      // Wrong color - penalty
      if (player === 1) {
        setP1Score((s) => Math.max(0, s - BAD_PENALTY));
        setP1Combo(0);
      } else {
        setP2Score((s) => Math.max(0, s - BAD_PENALTY));
        setP2Combo(0);
      }
    }
  }, [p1Combo]);

  const startGame = () => {
    setP1Score(0);
    setP2Score(0);
    setTimeLeft(GAME_DURATION);
    setP1Combo(0);
    setP2Combo(0);
    setLastHit(null);
    setWinner("");
    setCircles([]);
    // Pick initial target color
    const initialColor = Math.floor(Math.random() * COLORS.length);
    setTargetColor(initialColor);
    targetColorRef.current = initialColor;
    setPhase("countdown");
    setCountdown(3);
  };

  // Countdown
  useEffect(() => {
    if (phase !== "countdown") return;
    if (countdown <= 0) { setPhase("playing"); return; }
    const t = setTimeout(() => setCountdown((c) => c - 1), 800);
    return () => clearTimeout(t);
  }, [phase, countdown]);

  // Game timer + spawner + cleanup
  useEffect(() => {
    if (phase !== "playing") return;
    const start = Date.now();

    timerRef.current = window.setInterval(() => {
      const elapsed = (Date.now() - start) / 1000;
      const remaining = Math.max(0, GAME_DURATION - elapsed);
      setTimeLeft(Number(remaining.toFixed(1)));
      if (remaining <= 0) {
        clearInterval(timerRef.current);
        clearInterval(spawnRef.current);
        clearInterval(cleanupRef.current);
        setPhase("done");
      }
    }, 50);

    spawnRef.current = window.setInterval(spawnCircle, SPAWN_INTERVAL);
    cleanupRef.current = window.setInterval(cleanupCircles, 500);

    // Change target color every 8 seconds
    const colorChangeInterval = window.setInterval(changeTargetColor, 8000);

    return () => {
      clearInterval(timerRef.current);
      clearInterval(spawnRef.current);
      clearInterval(cleanupRef.current);
      clearInterval(colorChangeInterval);
    };
  }, [phase, spawnCircle, cleanupCircles, changeTargetColor]);

  // Winner
  useEffect(() => {
    if (phase !== "done") return;
    if (p1Score > p2Score) {
      setWinner(p1Name);
      onScore?.(p1Name, p1Score);
      confetti({ particleCount: 100, spread: 70, origin: { x: 0.3, y: 0.7 } });
    } else if (p2Score > p1Score) {
      const w = mode === "bot" ? "Bot" : p2Name;
      setWinner(w);
      onScore?.(w, p2Score);
      confetti({ particleCount: 100, spread: 70, origin: { x: 0.7, y: 0.7 } });
    }
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const target = COLORS[targetColor];

  return (
    <div className="max-w-lg mx-auto flex flex-col items-center gap-4">
      {phase === "idle" && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="w-full flex flex-col gap-3">
          <div className="flex gap-2 w-full">
            <button onClick={() => setMode("bot")} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition ${mode === "bot" ? "bg-primary text-primary-foreground shadow-lg" : "bg-card border border-border hover:border-primary/40"}`}>
              <Bot className="h-4 w-4" /> vs Bot
            </button>
            <button onClick={() => setMode("vs")} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition ${mode === "vs" ? "bg-primary text-primary-foreground shadow-lg" : "bg-card border border-border hover:border-primary/40"}`}>
              <User className="h-4 w-4" /> 2 Jogadores
            </button>
          </div>
          {mode === "vs" && (
            <div className="grid grid-cols-2 gap-2 w-full">
              <input value={p1Name} onChange={(e) => setP1Name(e.target.value)} placeholder="Jogador 1" className="px-3 py-2 rounded-xl bg-card border border-border text-sm text-center" />
              <input value={p2Name} onChange={(e) => setP2Name(e.target.value)} placeholder="Jogador 2" className="px-3 py-2 rounded-xl bg-card border border-border text-sm text-center" />
            </div>
          )}
          <button onClick={startGame} className="w-full py-3 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold text-sm shadow-lg flex items-center justify-center gap-2 hover:shadow-xl transition-shadow">
            <Play className="h-4 w-4 fill-current" /> Começar Jogo
          </button>
          <div className="rounded-xl bg-muted/40 border border-border p-3 text-center">
            <p className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider mb-1">Como Jogar</p>
            <p className="text-xs text-muted-foreground">Toque APENAS nos círculos da cor indicada. Cores erradas tiram pontos!</p>
            <p className="text-xs text-muted-foreground mt-1">A cor-alvo muda a cada 8s | {GAME_DURATION}s</p>
          </div>
        </motion.div>
      )}

      {phase !== "idle" && (
        <div className="w-full flex items-center justify-between px-2">
          <div className={`flex items-center gap-2 rounded-xl px-3 py-1.5 transition ${lastHit === "p1" ? "bg-blue-500/20" : "bg-muted/40"}`}>
            <div className="h-3 w-3 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500" />
            <span className="text-xs font-bold text-muted-foreground">{p1Name}</span>
            <span className="font-display text-xl font-bold text-foreground">{p1Score}</span>
            {p1Combo >= 3 && <span className="text-[10px] text-blue-400 font-bold">x{p1Combo}🔥</span>}
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className={`h-8 w-8 rounded-full ${target.bg} ring-2 ${target.ring} ring-offset-2 ring-offset-background shadow-lg`} />
            <p className="text-[10px] text-muted-foreground font-bold">{target.name}</p>
            <p className={`font-mono text-sm font-bold ${timeLeft <= 5 ? "text-red-500" : "text-foreground"}`}>{timeLeft}s</p>
          </div>
          <div className={`flex items-center gap-2 rounded-xl px-3 py-1.5 transition ${lastHit === "p2" ? "bg-amber-500/20" : "bg-muted/40"}`}>
            {p2Combo >= 3 && <span className="text-[10px] text-amber-400 font-bold">x{p2Combo}🔥</span>}
            <span className="font-display text-xl font-bold text-foreground">{p2Score}</span>
            <span className="text-xs font-bold text-muted-foreground">{mode === "bot" ? "Bot" : p2Name}</span>
            <div className="h-3 w-3 rounded-full bg-gradient-to-r from-amber-500 to-orange-500" />
          </div>
        </div>
      )}

      {phase !== "idle" && (
        <div className="relative w-full aspect-square max-w-md rounded-2xl border-2 border-border bg-background/50 overflow-hidden">
          <AnimatePresence>
            {phase === "countdown" && (
              <motion.div key={countdown} initial={{ scale: 2, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }} className="absolute inset-0 z-20 flex items-center justify-center bg-black/50 rounded-2xl">
                <span className="font-display text-7xl font-bold text-white">{countdown > 0 ? countdown : "GO!"}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {circles.map((c) => {
              const color = COLORS[c.colorIndex];
              const isTarget = c.colorIndex === targetColor;
              return (
                <motion.button
                  key={c.id}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  onClick={() => phase === "playing" && tapCircle(c, 1)}
                  className={`absolute rounded-full ${color.bg} ${isTarget ? "ring-2 ring-white/60 shadow-lg" : "opacity-80"} hover:scale-110 active:scale-90 transition-transform cursor-pointer`}
                  style={{
                    left: `${c.x}%`,
                    top: `${c.y}%`,
                    width: c.size,
                    height: c.size,
                    transform: "translate(-50%, -50%)",
                  }}
                />
              );
            })}
          </AnimatePresence>

          <AnimatePresence>
            {phase === "done" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/60 rounded-2xl gap-3">
                <Trophy className="h-10 w-10 text-yellow-400" />
                <p className="font-display text-2xl font-bold text-white">{winner ? `${winner} venceu!` : "Empate!"}</p>
                <p className="text-sm text-white/70">{p1Score} - {p2Score}</p>
                <button onClick={startGame} className="mt-2 px-6 py-2.5 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold text-sm flex items-center gap-2 shadow-lg">
                  <RotateCcw className="h-4 w-4" /> Jogar Novamente
                </button>
                <button onClick={() => setPhase("idle")} className="px-4 py-2 rounded-full bg-white/10 text-white/80 text-xs font-medium hover:bg-white/20 transition">
                  Voltar ao Menu
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {phase === "playing" && (
        <p className="text-[10px] text-muted-foreground text-center flex items-center gap-1">
          <Palette className="h-3 w-3" /> Toque nos círculos <span className={target.bg + " text-white px-1 rounded"}>{target.name}</span> | Evite as outras cores!
        </p>
      )}
    </div>
  );
};

export default ColorCatch;
