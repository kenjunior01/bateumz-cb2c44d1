import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, RotateCcw, Trophy, User, Bot, Target } from "lucide-react";
import confetti from "canvas-confetti";

interface Props {
  onScore?: (name: string, score: number) => void;
  liveCode?: string;
}

type Phase = "idle" | "countdown" | "playing" | "done";
type Mode = "bot" | "vs";

type MoleState = "hidden" | "showing" | "hit" | "missed";

const GRID_SIZE = 9; // 3x3
const GAME_DURATION = 30;
const MOLE_SHOW_MIN = 600;
const MOLE_SHOW_MAX = 1400;
const MOLE_INTERVAL_MIN = 400;
const MOLE_INTERVAL_MAX = 900;
const HIT_POINTS = 1;

const EMOJIS = ["rodent", "gopher", "bug", "critter"];

const WhackAMole = ({ onScore, liveCode }: Props) => {
  const [phase, setPhase] = useState<Phase>("idle");
  const [mode, setMode] = useState<Mode>("bot");
  const [p1Score, setP1Score] = useState(0);
  const [p2Score, setP2Score] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [countdown, setCountdown] = useState(3);
  const [winner, setWinner] = useState("");
  const [p1Name, setP1Name] = useState("Jogador 1");
  const [p2Name, setP2Name] = useState("Jogador 2");
  const [p1Combo, setP1Combo] = useState(0);
  const [p2Combo, setP2Combo] = useState(0);
  const [lastHit, setLastHit] = useState<"p1" | "p2" | null>(null);

  // Each cell: which player's mole is showing (null = empty)
  const [cells, setCells] = useState<(null | { player: 1 | 2; state: MoleState; emoji: string; id: number })[]>(
    Array(GRID_SIZE).fill(null)
  );

  const moleIdRef = useRef(0);
  const timerRef = useRef<number>(0);
  const spawnRef = useRef<number>(0);
  const p2ScoreRef = useRef(0);
  const phaseRef = useRef<Phase>("idle");
  const modeRef = useRef<Mode>("bot");

  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { p2ScoreRef.current = p2Score; }, [p2Score]);

  const hideMole = useCallback((index: number) => {
    setCells((prev) => {
      const next = [...prev];
      if (next[index] && next[index]!.state === "showing") {
        next[index] = { ...next[index]!, state: "missed" };
        // Reset after animation
        setTimeout(() => {
          setCells((p) => {
            const n = [...p];
            if (n[index] && n[index]!.state === "missed") n[index] = null;
            return n;
          });
        }, 300);
      }
      return next;
    });
  }, []);

  const spawnMole = useCallback(() => {
    if (phaseRef.current !== "playing") return;

    // Find empty cells
    setCells((prev) => {
      const emptyIndices = prev.reduce<number[]>((acc, c, i) => { if (!c) acc.push(i); return acc; }, []);
      if (emptyIndices.length === 0) return prev;

      const next = [...prev];
      const idx = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
      const emoji = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
      const id = ++moleIdRef.current;

      // Player 1's mole
      next[idx] = { player: 1, state: "showing", emoji, id };

      // Auto-hide after random duration
      const showTime = MOLE_SHOW_MIN + Math.random() * (MOLE_SHOW_MAX - MOLE_SHOW_MIN);
 setTimeout(() => hideMole(idx), showTime);

      return next;
    });

    // Schedule next spawn
    const nextInterval = MOLE_INTERVAL_MIN + Math.random() * (MOLE_INTERVAL_MAX - MOLE_INTERVAL_MIN);
    spawnRef.current = window.setTimeout(spawnMole, nextInterval);
  }, [hideMole]);

  // Bot AI: auto-click moles with some delay and imperfection
  const botTick = useCallback(() => {
    if (phaseRef.current !== "playing" || modeRef.current !== "bot") return;

    setCells((prev) => {
      const showingIdx = prev.findIndex((c) => c && c.state === "showing" && c.player === 1);
      if (showingIdx === -1) return prev;

      // Bot has ~60% chance to hit, with random delay simulation
      if (Math.random() < 0.6) {
        const next = [...prev];
        next[showingIdx] = { ...next[showingIdx]!, state: "hit" };
        p2ScoreRef.current += 1;
        setTimeout(() => {
          setP2Score(p2ScoreRef.current);
          setCells((p) => {
            const n = [...p];
            if (n[showingIdx] && n[showingIdx]!.state === "hit") n[showingIdx] = null;
            return n;
          });
        }, 300);
        return next;
      }
      return prev;
    });
  }, []);

  useEffect(() => {
    if (phase !== "playing") return;
    const botInterval = window.setInterval(botTick, 700 + Math.random() * 500);
    return () => clearInterval(botInterval);
  }, [phase, botTick]);

  const hitCell = useCallback((index: number, player: 1 | 2) => {
    setCells((prev) => {
      const cell = prev[index];
      if (!cell || cell.state !== "showing") return prev;

      const next = [...prev];
      next[index] = { ...cell, state: "hit" };

      if (player === 1) {
        setP1Combo((c) => c + 1);
        setP2Combo(0);
        setP1Score((s) => {
          const bonus = Math.min(Math.floor(s / 5), 2); // speed bonus
          return s + HIT_POINTS + bonus;
        });
        setLastHit("p1");
      } else {
        setP2Combo((c) => c + 1);
        setP1Combo(0);
        setP2Score((s) => s + HIT_POINTS);
        setLastHit("p2");
      }

      // Clear after hit animation
      setTimeout(() => {
        setCells((p) => {
          const n = [...p];
          if (n[index] && n[index]!.state === "hit") n[index] = null;
          return n;
        });
      }, 300);

      return next;
    });
  }, []);

  const startGame = () => {
    setP1Score(0);
    setP2Score(0);
    setTimeLeft(GAME_DURATION);
    setP1Combo(0);
    setP2Combo(0);
    setLastHit(null);
    setWinner("");
    setCells(Array(GRID_SIZE).fill(null));
    setPhase("countdown");
    setCountdown(3);
  };

  // Countdown
  useEffect(() => {
    if (phase !== "countdown") return;
    if (countdown <= 0) {
      setPhase("playing");
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 800);
    return () => clearTimeout(t);
  }, [phase, countdown]);

  // Game timer
  useEffect(() => {
    if (phase !== "playing") return;
    const start = Date.now();
    timerRef.current = window.setInterval(() => {
      const elapsed = (Date.now() - start) / 1000;
      const remaining = Math.max(0, GAME_DURATION - elapsed);
      setTimeLeft(Number(remaining.toFixed(1)));
      if (remaining <= 0) {
        clearInterval(timerRef.current);
        clearTimeout(spawnRef.current);
        setPhase("done");
      }
    }, 50);

    // Start spawning
    const firstSpawn = window.setTimeout(spawnMole, 500);

    return () => {
      clearInterval(timerRef.current);
      clearTimeout(spawnRef.current);
      clearTimeout(firstSpawn);
    };
  }, [phase, spawnMole]);

  // Determine winner
  useEffect(() => {
    if (phase !== "done") return;
    if (p1Score > p2Score) {
      const w = p1Name;
      setWinner(w);
      onScore?.(w, p1Score);
      confetti({ particleCount: 100, spread: 70, origin: { x: 0.3, y: 0.7 } });
    } else if (p2Score > p1Score) {
      const w = mode === "bot" ? "Bot" : p2Name;
      setWinner(w);
      onScore?.(w, p2Score);
      confetti({ particleCount: 100, spread: 70, origin: { x: 0.7, y: 0.7 } });
    }
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const getCellVisual = (cell: typeof cells[0]) => {
    if (!cell) return null;
    const colors = cell.player === 1
      ? { bg: "from-blue-500 to-indigo-600", border: "border-blue-400" }
      : { bg: "from-amber-500 to-orange-600", border: "border-amber-400" };
    return { ...cell, colors };
  };

  return (
    <div className="max-w-lg mx-auto flex flex-col items-center gap-4">
      {phase === "idle" && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="w-full flex flex-col gap-3">
          <div className="flex gap-2 w-full">
            <button
              onClick={() => setMode("bot")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition ${mode === "bot" ? "bg-primary text-primary-foreground shadow-lg" : "bg-card border border-border hover:border-primary/40"}`}
            >
              <Bot className="h-4 w-4" /> vs Bot
            </button>
            <button
              onClick={() => setMode("vs")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition ${mode === "vs" ? "bg-primary text-primary-foreground shadow-lg" : "bg-card border border-border hover:border-primary/40"}`}
            >
              <User className="h-4 w-4" /> 2 Jogadores
            </button>
          </div>

          {mode === "vs" && (
            <div className="grid grid-cols-2 gap-2 w-full">
              <input value={p1Name} onChange={(e) => setP1Name(e.target.value)} placeholder="Jogador 1" className="px-3 py-2 rounded-xl bg-card border border-border text-sm text-center" />
              <input value={p2Name} onChange={(e) => setP2Name(e.target.value)} placeholder="Jogador 2" className="px-3 py-2 rounded-xl bg-card border border-border text-sm text-center" />
            </div>
          )}

          <button
            onClick={startGame}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 text-white font-bold text-sm shadow-lg flex items-center justify-center gap-2 hover:shadow-xl transition-shadow"
          >
            <Play className="h-4 w-4 fill-current" /> Começar Jogo
          </button>

          <div className="rounded-xl bg-muted/40 border border-border p-3 text-center">
            <p className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider mb-1">Como Jogar</p>
            <p className="text-xs text-muted-foreground">Toque nas criaturas que aparecem o mais rápido possível!</p>
            <p className="text-xs text-muted-foreground mt-1">{mode === "vs" ? "Cada jogador toca no seu lado da tela" : "Toque rápido antes que o bot alcance!"} | {GAME_DURATION}s</p>
          </div>
        </motion.div>
      )}

      {/* Score bar */}
      {phase !== "idle" && (
        <div className="w-full flex items-center justify-between px-2">
          <div className={`flex items-center gap-2 rounded-xl px-3 py-1.5 transition ${lastHit === "p1" ? "bg-blue-500/20" : "bg-muted/40"}`}>
            <div className="h-3 w-3 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500" />
            <span className="text-xs font-bold text-muted-foreground">{p1Name}</span>
            <span className="font-display text-xl font-bold text-foreground">{p1Score}</span>
            {p1Combo >= 3 && <span className="text-[10px] text-blue-400 font-bold">x{p1Combo}🔥</span>}
          </div>
          <div className="text-center">
            <p className="text-[10px] text-muted-foreground uppercase font-bold">Tempo</p>
            <p className={`font-mono text-lg font-bold ${timeLeft <= 5 ? "text-red-500" : "text-foreground"}`}>{timeLeft}s</p>
          </div>
          <div className={`flex items-center gap-2 rounded-xl px-3 py-1.5 transition ${lastHit === "p2" ? "bg-amber-500/20" : "bg-muted/40"}`}>
            {p2Combo >= 3 && <span className="text-[10px] text-amber-400 font-bold">x{p2Combo}🔥</span>}
            <span className="font-display text-xl font-bold text-foreground">{p2Score}</span>
            <span className="text-xs font-bold text-muted-foreground">{mode === "bot" ? "Bot" : p2Name}</span>
            <div className="h-3 w-3 rounded-full bg-gradient-to-r from-amber-500 to-orange-500" />
          </div>
        </div>
      )}

      {/* Game grid */}
      {phase !== "idle" && (
        <div className="relative w-full">
          {/* Countdown overlay */}
          <AnimatePresence>
            {phase === "countdown" && (
              <motion.div
                key={countdown}
                initial={{ scale: 2, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                className="absolute inset-0 z-20 flex items-center justify-center bg-black/50 rounded-2xl"
              >
                <span className="font-display text-7xl font-bold text-white">{countdown > 0 ? countdown : "GO!"}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid grid-cols-3 gap-2">
            {cells.map((cell, i) => {
              const visual = getCellVisual(cell);
              return (
                <motion.button
                  key={i}
                  whileTap={{ scale: cell ? 0.85 : 1 }}
                  onClick={() => cell && cell.state === "showing" && hitCell(i, cell.player)}
                  className={`relative aspect-square rounded-2xl border-2 transition-colors overflow-hidden ${
                    cell
                      ? cell.state === "showing"
                        ? `border-yellow-400 bg-gradient-to-br ${visual?.colors.bg}`
                        : cell.state === "hit"
                        ? "border-green-400 bg-green-500/30"
                        : "border-red-400/50 bg-red-500/10"
                      : "border-border bg-muted/30"
                  } ${cell && cell.state === "showing" ? "cursor-pointer" : "cursor-default"}`}
                  disabled={!cell || cell.state !== "showing"}
                >
                  <AnimatePresence mode="popLayout">
                    {cell && cell.state === "showing" && (
                      <motion.div
                        initial={{ scale: 0, y: 30 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0 }}
                        transition={{ type: "spring", stiffness: 400, damping: 20 }}
                        className="absolute inset-0 flex items-center justify-center"
                      >
                        <Target className="h-10 w-10 text-white/90 drop-shadow-lg" />
                      </motion.div>
                    )}
                    {cell && cell.state === "hit" && (
                      <motion.div
                        initial={{ scale: 1.2 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        className="absolute inset-0 flex items-center justify-center text-2xl"
                      >
                        💥
                      </motion.div>
                    )}
                    {cell && cell.state === "missed" && (
                      <motion.div
                        initial={{ opacity: 1 }}
                        animate={{ opacity: 0 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 flex items-center justify-center text-xl"
                      >
                        ❌
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Hole indicator */}
                  {!cell && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="h-8 w-8 rounded-full bg-black/20" />
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>

          {/* Winner overlay */}
          <AnimatePresence>
            {phase === "done" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/60 rounded-2xl gap-3"
              >
                <Trophy className="h-10 w-10 text-yellow-400" />
                <p className="font-display text-2xl font-bold text-white">
                  {winner ? `${winner} venceu!` : "Empate!"}
                </p>
                <p className="text-sm text-white/70">{p1Score} - {p2Score}</p>
                <button
                  onClick={startGame}
                  className="mt-2 px-6 py-2.5 rounded-full bg-gradient-to-r from-emerald-500 to-green-600 text-white font-bold text-sm flex items-center gap-2 shadow-lg"
                >
                  <RotateCcw className="h-4 w-4" /> Jogar Novamente
                </button>
                <button
                  onClick={() => setPhase("idle")}
                  className="px-4 py-2 rounded-full bg-white/10 text-white/80 text-xs font-medium hover:bg-white/20 transition"
                >
                  Voltar ao Menu
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

export default WhackAMole;
