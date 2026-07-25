import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { RotateCcw, Timer, Target, Bomb } from "lucide-react";

interface Props {
  onScore?: (name: string, score: number) => void;
  liveCode?: string;
}

type TargetOwner = "p1" | "p2" | "any";
type TargetKind = "normal" | "fast" | "golden" | "bomb";
type GamePhase = "idle" | "playing" | "done";

interface TargetData {
  id: number;
  kind: TargetKind;
  owner: TargetOwner;
  row: number;
  col: number;
  createdAt: number;
  duration: number;
  points: number;
}

interface FloatingScore {
  id: number;
  value: number;
  row: number;
  col: number;
  player: 1 | 2;
  isPenalty: boolean;
}

interface HitRipple {
  id: number;
  row: number;
  col: number;
  color: string;
}

const GRID_SIZE = 4;

const TARGET_CONFIGS: Record<TargetKind, { points: number; duration: number; weight: number; size: "normal" | "small" }> = {
  normal: { points: 1, duration: 1500, weight: 55, size: "normal" },
  fast: { points: 2, duration: 800, weight: 15, size: "small" },
  golden: { points: 3, duration: 1000, weight: 10, size: "normal" },
  bomb: { points: -2, duration: 2000, weight: 20, size: "normal" },
};

function pickTargetKind(): TargetKind {
  const kinds = Object.keys(TARGET_CONFIGS) as TargetKind[];
  const totalWeight = kinds.reduce((s, k) => s + TARGET_CONFIGS[k].weight, 0);
  let r = Math.random() * totalWeight;
  for (const k of kinds) {
    r -= TARGET_CONFIGS[k].weight;
    if (r <= 0) return k;
  }
  return "normal";
}

function getTargetOwner(kind: TargetKind): TargetOwner {
  if (kind === "golden" || kind === "bomb") return "any";
  return Math.random() < 0.5 ? "p1" : "p2";
}

let nextTargetId = 0;
let nextFloatingId = 0;
let nextRippleId = 0;

function TargetSVG({ kind }: { kind: TargetKind }) {
  switch (kind) {
    case "normal":
      return (
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" className="drop-shadow-lg">
          <circle cx="14" cy="14" r="11" stroke="currentColor" strokeWidth="2" strokeDasharray="4 3" />
          <circle cx="14" cy="14" r="5" fill="currentColor" opacity="0.7" />
        </svg>
      );
    case "fast":
      return (
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none" className="drop-shadow-lg">
          <polygon
            points="11,1 14,8 21,9 16,14 17,21 11,17 5,21 6,14 1,9 8,8"
            stroke="currentColor"
            strokeWidth="1.5"
            fill="currentColor"
            fillOpacity="0.6"
          />
        </svg>
      );
    case "golden":
      return (
        <svg width="30" height="30" viewBox="0 0 30 30" fill="none" className="drop-shadow-lg">
          <circle cx="15" cy="15" r="12" stroke="currentColor" strokeWidth="2" />
          <circle cx="15" cy="15" r="7" fill="currentColor" opacity="0.5" />
          <circle cx="15" cy="10" r="3" fill="currentColor" opacity="0.8" />
          <rect x="4" y="13" width="22" height="4" rx="2" fill="currentColor" opacity="0.3" />
        </svg>
      );
    case "bomb":
      return (
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" className="drop-shadow-lg">
          <circle cx="14" cy="14" r="10" stroke="currentColor" strokeWidth="2" />
          <line x1="8" y1="8" x2="20" y2="20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="20" y1="8" x2="8" y2="20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      );
  }
}

function getTargetColors(kind: TargetKind, owner: TargetOwner) {
  if (kind === "bomb") {
    return {
      bg: "bg-red-500/20",
      border: "border-red-400",
      text: "text-red-400",
      glow: "shadow-red-500/40",
    };
  }
  if (kind === "golden") {
    return {
      bg: "bg-amber-500/20",
      border: "border-amber-400",
      text: "text-amber-400",
      glow: "shadow-amber-500/50",
    };
  }
  if (owner === "p1") {
    return {
      bg: "bg-cyan-500/20",
      border: "border-cyan-400",
      text: "text-cyan-400",
      glow: "shadow-cyan-500/30",
    };
  }
  return {
    bg: "bg-pink-500/20",
    border: "border-pink-400",
    text: "text-pink-400",
    glow: "shadow-pink-500/30",
  };
}

export default function TargetTap({ onScore, liveCode }: Props) {
  const [phase, setPhase] = useState<GamePhase>("idle");
  const [duration, setDuration] = useState(60);
  const [timeLeft, setTimeLeft] = useState(60);
  const [p1Score, setP1Score] = useState(0);
  const [p2Score, setP2Score] = useState(0);
  const [targets, setTargets] = useState<TargetData[]>([]);
  const [floats, setFloats] = useState<FloatingScore[]>([]);
  const [ripples, setRipples] = useState<HitRipple[]>([]);
  const [shakingCell, setShakingCell] = useState<string | null>(null);
  const [currentKindLabel, setCurrentKindLabel] = useState<string>("");

  const timerRef = useRef<number | null>(null);
  const spawnRef = useRef<number | null>(null);
  const cleanupRef = useRef<number | null>(null);
  const p1ScoreRef = useRef(0);
  const p2ScoreRef = useRef(0);

  const clearAllTimers = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (spawnRef.current) { clearInterval(spawnRef.current); spawnRef.current = null; }
    if (cleanupRef.current) { clearInterval(cleanupRef.current); cleanupRef.current = null; }
  }, []);

  const finishGame = useCallback(() => {
    clearAllTimers();
    setPhase("done");
    setTargets([]);
    onScore?.("Jogador 1", p1ScoreRef.current);
    onScore?.("Jogador 2", p2ScoreRef.current);
  }, [onScore, clearAllTimers]);

  const spawnTarget = useCallback(() => {
    setTargets((prev) => {
      const occupied = new Set(prev.map((t) => `${t.row}-${t.col}`));
      const empty: [number, number][] = [];
      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          if (!occupied.has(`${r}-${c}`)) empty.push([r, c]);
        }
      }
      if (empty.length === 0) return prev;

      const [row, col] = empty[Math.floor(Math.random() * empty.length)];
      const kind = pickTargetKind();
      const config = TARGET_CONFIGS[kind];
      const owner = getTargetOwner(kind);

      const labels: Record<TargetKind, string> = {
        normal: "",
        fast: "Alvo Rápido",
        golden: "Bônus",
        bomb: "Bomba",
      };
      if (labels[kind]) setCurrentKindLabel(labels[kind]);

      const target: TargetData = {
        id: nextTargetId++,
        kind,
        owner,
        row,
        col,
        createdAt: Date.now(),
        duration: config.duration,
        points: config.points,
      };

      const newTargets = [...prev, target];
      if (newTargets.length > 6) return newTargets.slice(-6);
      return newTargets;
    });
  }, []);

  const cleanupTargets = useCallback(() => {
    const now = Date.now();
    setTargets((prev) => prev.filter((t) => now - t.createdAt < t.duration));
  }, []);

  const startGame = useCallback(() => {
    clearAllTimers();
    setP1Score(0);
    setP2Score(0);
    p1ScoreRef.current = 0;
    p2ScoreRef.current = 0;
    setTargets([]);
    setFloats([]);
    setRipples([]);
    setShakingCell(null);
    setCurrentKindLabel("");
    setTimeLeft(duration);
    setPhase("playing");

    const startTime = Date.now();
    timerRef.current = window.setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      const remaining = Math.max(0, duration - elapsed);
      setTimeLeft(Math.ceil(remaining));
      if (remaining <= 0) finishGame();
    }, 100);

    spawnRef.current = window.setInterval(spawnTarget, 700);
    cleanupRef.current = window.setInterval(cleanupTargets, 100);
  }, [duration, clearAllTimers, spawnTarget, cleanupTargets, finishGame]);

  const restartAll = useCallback(() => {
    clearAllTimers();
    setPhase("idle");
    setP1Score(0);
    setP2Score(0);
    p1ScoreRef.current = 0;
    p2ScoreRef.current = 0;
    setTargets([]);
    setFloats([]);
    setRipples([]);
    setShakingCell(null);
    setCurrentKindLabel("");
    setTimeLeft(duration);
  }, [clearAllTimers, duration]);

  const nextRound = useCallback(() => {
    clearAllTimers();
    setP1Score(0);
    setP2Score(0);
    p1ScoreRef.current = 0;
    p2ScoreRef.current = 0;
    setTargets([]);
    setFloats([]);
    setRipples([]);
    setShakingCell(null);
    setCurrentKindLabel("");
    setTimeLeft(duration);
    startGame();
  }, [clearAllTimers, duration, startGame]);

  useEffect(() => {
    return () => clearAllTimers();
  }, [clearAllTimers]);

  const handleTap = useCallback(
    (row: number, col: number) => {
      if (phase !== "playing") return;

      setTargets((prev) => {
        const target = prev.find((t) => t.row === row && t.col === col);
        if (!target) return prev;

        const isP1Target = target.owner === "p1";
        const isP2Target = target.owner === "p2";
        const isAnyTarget = target.owner === "any";
        const isBomb = target.kind === "bomb";

        let p1Delta = 0;
        let p2Delta = 0;
        let p1Float: FloatingScore | null = null;
        let p2Float: FloatingScore | null = null;
        let isPenalty = false;

        if (isBomb) {
          // Either player hitting a bomb gets -2. Since both players tap the same board,
          // the bomb penalizes the player who tapped it.
          // We assign penalty to whichever player is more likely the one tapping.
          // For simplicity, the bomb penalizes the player whose color zone it's NOT in.
          // Actually, bombs penalize whoever taps. Since we can't distinguish on a shared board,
          // we penalize both players.
          p1Delta = target.points;
          p2Delta = target.points;
          isPenalty = true;
          p1Float = {
            id: nextFloatingId++,
            value: target.points,
            row, col,
            player: 1,
            isPenalty: true,
          };
          p2Float = {
            id: nextFloatingId++,
            value: target.points,
            row: row + 0.1,
            col: col + 0.1,
            player: 2,
            isPenalty: true,
          };
        } else if (isAnyTarget) {
          // Golden: both players can score. We give points to both.
          p1Delta = target.points;
          p2Delta = target.points;
          p1Float = {
            id: nextFloatingId++,
            value: target.points,
            row, col,
            player: 1,
            isPenalty: false,
          };
          p2Float = {
            id: nextFloatingId++,
            value: target.points,
            row: row + 0.1,
            col: col + 0.1,
            player: 2,
            isPenalty: false,
          };
        } else if (isP1Target) {
          // P1 scores for hitting their own color
          p1Delta = target.points;
          p1Float = {
            id: nextFloatingId++,
            value: target.points,
            row, col,
            player: 1,
            isPenalty: false,
          };
        } else if (isP2Target) {
          // P2 scores for hitting their own color
          p2Delta = target.points;
          p2Float = {
            id: nextFloatingId++,
            value: target.points,
            row, col,
            player: 2,
            isPenalty: false,
          };
        }

        // Remove the tapped target
        const newTargets = prev.filter((t) => t.id !== target.id);

        // Apply score changes
        if (p1Delta !== 0) {
          setP1Score((s) => {
            const ns = Math.max(0, s + p1Delta);
            p1ScoreRef.current = ns;
            return ns;
          });
        }
        if (p2Delta !== 0) {
          setP2Score((s) => {
            const ns = Math.max(0, s + p2Delta);
            p2ScoreRef.current = ns;
            return ns;
          });
        }

        // Add floating scores
        if (p1Float) setFloats((f) => [...f, p1Float!]);
        if (p2Float) setFloats((f) => [...f, p2Float!]);

        // Add ripple
        const colors = getTargetColors(target.kind, target.owner);
        const rippleColor =
          target.kind === "bomb"
            ? "rgba(248,113,113,0.6)"
            : target.kind === "golden"
            ? "rgba(251,191,36,0.6)"
            : isP1Target
            ? "rgba(34,211,238,0.6)"
            : "rgba(244,114,182,0.6)";
        setRipples((r) => [
          ...r,
          { id: nextRippleId++, row, col, color: rippleColor },
        ]);

        // Shake on penalty
        if (isPenalty) {
          setShakingCell(`${row}-${col}`);
          setTimeout(() => setShakingCell(null), 400);
        }

        // Clean up floats
        setTimeout(() => {
          if (p1Float) setFloats((f) => f.filter((x) => x.id !== p1Float!.id));
          if (p2Float) setFloats((f) => f.filter((x) => x.id !== p2Float!.id));
        }, 800);
        setTimeout(() => {
          setRipples((r) => r.filter((x) => x.row !== row || x.col !== col));
        }, 500);

        return newTargets;
      });
    },
    [phase]
  );

  const grid: (TargetData | null)[][] = Array.from({ length: GRID_SIZE }, () =>
    Array.from({ length: GRID_SIZE }, () => null)
  );
  for (const t of targets) {
    grid[t.row][t.col] = t;
  }

  const timerColor =
    timeLeft <= 10 ? "text-red-400" : timeLeft <= 20 ? "text-amber-400" : "text-slate-200";

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-md mx-auto select-none">
      {/* Scoreboard */}
      <div className="w-full rounded-2xl bg-gradient-to-r from-cyan-900/30 to-pink-900/30 border border-cyan-500/20 p-4">
        <div className="flex items-center justify-between">
          <div className="flex flex-col items-center gap-1 min-w-[80px]">
            <span className="text-xs font-medium text-cyan-400 tracking-wider uppercase">
              Jogador 1
            </span>
            <motion.span
              key={p1Score}
              initial={{ scale: 1.3, y: -4 }}
              animate={{ scale: 1, y: 0 }}
              className="text-3xl font-bold text-cyan-300 tabular-nums"
            >
              {p1Score}
            </motion.span>
          </div>

          <div className="flex flex-col items-center gap-1">
            <AnimatePresence mode="wait">
              {currentKindLabel && phase === "playing" && (
                <motion.div
                  key={currentKindLabel}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.2 }}
                >
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px] sm:text-xs font-bold tracking-widest uppercase",
                      currentKindLabel === "Alvo Rápido" && "border-amber-400/50 text-amber-400",
                      currentKindLabel === "Bônus" && "border-amber-400/50 text-amber-400",
                      currentKindLabel === "Bomba" && "border-red-400/50 text-red-400"
                    )}
                  >
                    <Target className="w-3 h-3 mr-1" />
                    {currentKindLabel}
                  </Badge>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.div
              className={cn("text-4xl sm:text-5xl font-black tabular-nums", timerColor)}
              animate={timeLeft <= 10 && phase === "playing" ? { scale: [1, 1.1, 1] } : { scale: 1 }}
              transition={{ repeat: Infinity, duration: 0.5 }}
            >
              {timeLeft}s
            </motion.div>
          </div>

          <div className="flex flex-col items-center gap-1 min-w-[80px]">
            <span className="text-xs font-medium text-pink-400 tracking-wider uppercase">
              Jogador 2
            </span>
            <motion.span
              key={p2Score}
              initial={{ scale: 1.3, y: -4 }}
              animate={{ scale: 1, y: 0 }}
              className="text-3xl font-bold text-pink-300 tabular-nums"
            >
              {p2Score}
            </motion.span>
          </div>
        </div>
      </div>

      {/* Duration selector */}
      {phase === "idle" && (
        <div className="flex items-center gap-2">
          <Timer className="w-4 h-4 text-slate-400" />
          <span className="text-xs text-slate-400 font-medium">Duração</span>
          <div className="flex gap-1">
            {[30, 60, 90].map((d) => (
              <Button
                key={d}
                size="sm"
                variant={duration === d ? "default" : "outline"}
                className={cn(
                  "h-7 px-3 text-xs",
                  duration === d && "bg-slate-700 hover:bg-slate-600"
                )}
                onClick={() => setDuration(d)}
              >
                {d}s
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Game Grid */}
      <div className="relative w-full bg-slate-900/50 border border-slate-800 rounded-2xl p-3">
        <div className="grid grid-cols-4 gap-2 justify-items-center">
          {grid.map((row, r) =>
            row.map((cell, c) => {
              const target = cell;
              const cellKey = `${r}-${c}`;
              const isShaking = shakingCell === cellKey;
              const colors = target ? getTargetColors(target.kind, target.owner) : null;
              const isSmall = target?.kind === "fast";

              return (
                <div key={cellKey} className="relative">
                  {/* Ripple effect */}
                  <AnimatePresence>
                    {ripples.some((rp) => rp.row === r && rp.col === c) && (
                      <motion.div
                        key={`ripple-${cellKey}`}
                        initial={{ scale: 0.3, opacity: 1 }}
                        animate={{ scale: 2.5, opacity: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                        className="absolute inset-0 rounded-xl pointer-events-none"
                        style={{
                          backgroundColor: ripples.find((rp) => rp.row === r && rp.col === c)?.color || "transparent",
                          zIndex: 5,
                        }}
                      />
                    )}
                  </AnimatePresence>

                  {/* Floating scores */}
                  <AnimatePresence>
                    {floats
                      .filter((f) => Math.floor(f.row) === r && Math.floor(f.col) === c)
                      .map((f) => (
                        <motion.div
                          key={f.id}
                          initial={{ opacity: 1, y: 0, scale: 0.8 }}
                          animate={{ opacity: 0, y: -30, scale: 1.2 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.7, ease: "easeOut" }}
                          className={cn(
                            "absolute -top-2 left-1/2 -translate-x-1/2 text-sm font-black pointer-events-none z-20",
                            f.isPenalty ? "text-red-400" : f.player === 1 ? "text-cyan-300" : "text-pink-300"
                          )}
                        >
                          {f.value > 0 ? `+${f.value}` : f.value}
                        </motion.div>
                      ))}
                  </AnimatePresence>

                  {/* Cell button */}
                  <motion.button
                    onClick={() => handleTap(r, c)}
                    disabled={phase !== "playing" || !target}
                    animate={
                      isShaking
                        ? { x: [0, -6, 6, -4, 4, 0] }
                        : { x: 0 }
                    }
                    transition={
                      isShaking
                        ? { duration: 0.4 }
                        : {}
                    }
                    className={cn(
                      "relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl border-2 flex items-center justify-center transition-colors",
                      "focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500",
                      target
                        ? cn(colors?.bg, colors?.border, "cursor-pointer active:scale-95")
                        : "bg-slate-800/30 border-slate-800",
                      target?.kind === "golden" && "shadow-lg shadow-amber-500/20",
                      phase !== "playing" && !target && "cursor-default"
                    )}
                  >
                    <AnimatePresence mode="popLayout">
                      {target && (
                        <motion.div
                          key={target.id}
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{
                            scale: 1,
                            opacity: 1,
                          }}
                          exit={{
                            scale: 0,
                            opacity: 0,
                          }}
                          transition={{
                            type: "spring",
                            stiffness: 400,
                            damping: 15,
                          }}
                          className={cn(
                            "flex items-center justify-center",
                            colors?.text,
                            isSmall ? "scale-75" : "scale-100"
                          )}
                        >
                          <TargetSVG kind={target.kind} />
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Time remaining bar for target */}
                    {target && phase === "playing" && (
                      <TargetTimerBar
                        target={target}
                        colorClass={
                          target.kind === "bomb"
                            ? "bg-red-400"
                            : target.kind === "golden"
                            ? "bg-amber-400"
                            : target.owner === "p1"
                            ? "bg-cyan-400"
                            : "bg-pink-400"
                        }
                      />
                    )}
                  </motion.button>
                </div>
              );
            })
          )}
        </div>

        {/* Idle / Done overlays */}
        <AnimatePresence>
          {phase === "idle" && (
            <motion.div
              key="idle-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/70 rounded-2xl flex flex-col items-center justify-center gap-4 backdrop-blur-sm z-30"
            >
              <Target className="w-12 h-12 text-slate-500" />
              <p className="text-slate-300 text-sm font-medium text-center px-4">
                Toque nos alvos da sua cor! Alvos dourados são para todos.
              </p>
              <Button
                onClick={startGame}
                className="bg-slate-700 hover:bg-slate-600 text-white font-bold px-8"
              >
                <Target className="w-4 h-4 mr-2" />
                Iniciar
              </Button>
            </motion.div>
          )}

          {phase === "done" && (
            <motion.div
              key="done-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/80 rounded-2xl flex flex-col items-center justify-center gap-3 backdrop-blur-sm z-30"
            >
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.1 }}
                className="text-center"
              >
                <p className="text-slate-400 text-xs font-medium uppercase tracking-widest mb-1">
                  Tempo!
                </p>
                <div className="flex items-center gap-6 mb-4">
                  <div className="flex flex-col items-center">
                    <span className="text-xs text-cyan-400 font-medium mb-1">Jogador 1</span>
                    <span className={cn(
                      "text-4xl font-black",
                      p1Score > p2Score ? "text-cyan-300" : "text-slate-400"
                    )}>
                      {p1Score}
                    </span>
                    {p1Score > p2Score && (
                      <span className="text-[10px] text-amber-400 font-bold mt-1">
                        VENCEDOR
                      </span>
                    )}
                  </div>
                  <span className="text-2xl text-slate-600 font-bold">vs</span>
                  <div className="flex flex-col items-center">
                    <span className="text-xs text-pink-400 font-medium mb-1">Jogador 2</span>
                    <span className={cn(
                      "text-4xl font-black",
                      p2Score > p1Score ? "text-pink-300" : "text-slate-400"
                    )}>
                      {p2Score}
                    </span>
                    {p2Score > p1Score && (
                      <span className="text-[10px] text-amber-400 font-bold mt-1">
                        VENCEDOR
                      </span>
                    )}
                  </div>
                </div>
                {p1Score === p2Score && (
                  <p className="text-amber-400 text-xs font-bold">EMPATE!</p>
                )}
              </motion.div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={nextRound}
                  className="bg-slate-700 hover:bg-slate-600 text-white font-bold"
                >
                  Próximo Round
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={restartAll}
                  className="border-slate-700 text-slate-300 hover:bg-slate-800"
                >
                  <RotateCcw className="w-3 h-3 mr-1" />
                  Reiniciar Tudo
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-3 text-[10px] sm:text-xs text-slate-400">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full border-2 border-cyan-400 bg-cyan-500/20" />
          <span>Normal P1</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full border-2 border-pink-400 bg-pink-500/20" />
          <span>Normal P2</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2.5 h-2.5 rounded-full border-2 border-amber-400 bg-amber-500/20" />
          <span>Rápido</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full border-2 border-amber-400 bg-amber-500/30 shadow shadow-amber-500/30" />
          <span>Bônus</span>
        </div>
        <div className="flex items-center gap-1">
          <Bomb className="w-3 h-3 text-red-400" />
          <span>Bomba</span>
        </div>
      </div>

      {/* Restart during game */}
      {phase === "playing" && (
        <Button
          variant="ghost"
          size="sm"
          onClick={restartAll}
          className="text-slate-500 hover:text-slate-300 hover:bg-slate-800"
        >
          <RotateCcw className="w-3 h-3 mr-1" />
          Reiniciar
        </Button>
      )}
    </div>
  );
}

function TargetTimerBar({ target, colorClass }: { target: TargetData; colorClass: string }) {
  const [pct, setPct] = useState(100);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const tick = () => {
      const elapsed = Date.now() - target.createdAt;
      const remaining = Math.max(0, 1 - elapsed / target.duration);
      setPct(remaining * 100);
      if (remaining > 0) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target.createdAt, target.duration]);

  return (
    <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-10 h-0.5 bg-slate-700 rounded-full overflow-hidden">
      <motion.div
        className={cn("h-full rounded-full", colorClass)}
        style={{ width: `${pct}%` }}
        transition={{ duration: 0.05 }}
      />
    </div>
  );
}
