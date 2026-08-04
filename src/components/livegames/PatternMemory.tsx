import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RotateCcw, Eye, Grid3X3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Props {
  onScore?: (name: string, score: number) => void;
  liveCode?: string;
}

type Phase =
  | "idle"
  | "memorize"
  | "recall_p1"
  | "feedback_p1"
  | "recall_p2"
  | "feedback_p2"
  | "round_result"
  | "game_over";

interface RoundConfig {
  gridSize: number;
  patternSize: number;
  memorizeTime: number;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const TOTAL_ROUNDS = 8;

const ROUNDS: RoundConfig[] = [
  { gridSize: 3, patternSize: 3, memorizeTime: 3.0 },
  { gridSize: 3, patternSize: 4, memorizeTime: 2.79 },
  { gridSize: 4, patternSize: 5, memorizeTime: 2.57 },
  { gridSize: 4, patternSize: 6, memorizeTime: 2.36 },
  { gridSize: 4, patternSize: 7, memorizeTime: 2.14 },
  { gridSize: 5, patternSize: 8, memorizeTime: 1.93 },
  { gridSize: 5, patternSize: 9, memorizeTime: 1.71 },
  { gridSize: 5, patternSize: 10, memorizeTime: 1.5 },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function pickPattern(total: number, count: number): Set<number> {
  const set = new Set<number>();
  while (set.size < count) set.add(Math.floor(Math.random() * total));
  return set;
}

function calcRoundScore(taps: Set<number>, pattern: Set<number>): number {
  let correct = 0;
  let wrong = 0;
  taps.forEach((c) => (pattern.has(c) ? correct++ : wrong++));
  return Math.max(0, correct * 10 - wrong * 5);
}

/* ------------------------------------------------------------------ */
/*  Animation presets                                                  */
/* ------------------------------------------------------------------ */

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
};

const popIn = {
  initial: { opacity: 0, scale: 0.88 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.92 },
};

const shakeKeyframes = { x: [0, -8, 8, -8, 8, -4, 4, 0] };

/* ------------------------------------------------------------------ */
/*  Scoreboard                                                         */
/* ------------------------------------------------------------------ */

function ScoreBar({
  p1,
  p2,
  round,
  highlight,
}: {
  p1: number;
  p2: number;
  round: number;
  highlight?: 1 | 2;
}) {
  return (
    <div className="flex w-full max-w-md items-center justify-between gap-2">
      <motion.div
        animate={{ scale: highlight === 1 ? 1.06 : 1 }}
        transition={{ type: "spring", stiffness: 300 }}
      >
        <Badge
          variant="outline"
          className={cn(
            "px-3 py-1 text-sm font-bold transition-colors",
            highlight === 1
              ? "text-cyan-300 border-cyan-400 bg-cyan-500/20 shadow-md shadow-cyan-500/20"
              : "text-cyan-400 border-cyan-500/50 bg-cyan-500/10"
          )}
        >
          Jogador 1: {p1}
        </Badge>
      </motion.div>

      <Badge
        variant="secondary"
        className="text-zinc-400 bg-zinc-800/80 px-2.5 py-1 text-xs font-medium"
      >
        Rodada {round + 1}/{TOTAL_ROUNDS}
      </Badge>

      <motion.div
        animate={{ scale: highlight === 2 ? 1.06 : 1 }}
        transition={{ type: "spring", stiffness: 300 }}
      >
        <Badge
          variant="outline"
          className={cn(
            "px-3 py-1 text-sm font-bold transition-colors",
            highlight === 2
              ? "text-pink-300 border-pink-400 bg-pink-500/20 shadow-md shadow-pink-500/20"
              : "text-pink-400 border-pink-500/50 bg-pink-500/10"
          )}
        >
          Jogador 2: {p2}
        </Badge>
      </motion.div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Grid cell component                                                */
/* ------------------------------------------------------------------ */

function Cell({
  index,
  inPattern,
  patternStaggerIndex,
  isTapped,
  isWrongTap,
  isCorrectTap,
  isMissed,
  showPattern,
  interactive,
  tapColor,
  phase,
  onTap,
}: {
  index: number;
  inPattern: boolean;
  patternStaggerIndex: number;
  isTapped: boolean;
  isWrongTap: boolean;
  isCorrectTap: boolean;
  isMissed: boolean;
  showPattern: boolean;
  interactive: boolean;
  tapColor: "cyan" | "pink" | null;
  phase: Phase;
  onTap: (i: number) => void;
}) {
  /* bg class */
  let bg = "bg-zinc-800/70 border-zinc-700/40";
  let glow = "";
  let shouldShake = false;
  let shouldPulse = false;
  let animDelay = 0;

  if (phase === "memorize") {
    if (inPattern) {
      bg = "bg-violet-500 border-violet-400/60";
      glow = "shadow-[0_0_22px_4px_rgba(139,92,246,0.55)]";
      shouldPulse = true;
      animDelay = patternStaggerIndex * 0.07;
    } else {
      bg = "bg-zinc-800/50 border-zinc-700/30";
    }
  } else if (phase === "recall_p1" || phase === "recall_p2") {
    if (isTapped && tapColor === "cyan") {
      bg = "bg-cyan-500 border-cyan-400/60";
      glow = "shadow-[0_0_16px_3px_rgba(6,182,212,0.45)]";
    } else if (isTapped && tapColor === "pink") {
      bg = "bg-pink-500 border-pink-400/60";
      glow = "shadow-[0_0_16px_3px_rgba(236,72,153,0.45)]";
    } else {
      bg = "bg-zinc-800/70 border-zinc-700/40";
    }
  } else if (phase === "feedback_p1" || phase === "feedback_p2") {
    if (isCorrectTap) {
      bg = "bg-emerald-500 border-emerald-400/60";
      glow = "shadow-[0_0_16px_3px_rgba(16,185,129,0.5)]";
    } else if (isWrongTap) {
      bg = "bg-red-500 border-red-400/60";
      shouldShake = true;
    } else if (isMissed) {
      bg = "bg-violet-700/35 border-violet-600/30";
    } else {
      bg = "bg-zinc-800/40 border-zinc-700/20";
    }
  } else if (phase === "round_result" || phase === "game_over") {
    if (showPattern && inPattern) {
      bg = "bg-violet-600/40 border-violet-500/30";
    } else {
      bg = "bg-zinc-800/30 border-zinc-700/20";
    }
  } else {
    bg = "bg-zinc-800/70 border-zinc-700/40";
  }

  return (
    <motion.button
      type="button"
      onClick={() => interactive && onTap(index)}
      className={cn(
        "w-14 h-14 sm:w-18 sm:h-18 rounded-xl border-2 transition-[background-color,border-color,box-shadow] duration-150",
        bg,
        glow,
        interactive && "cursor-pointer hover:brightness-125",
        !interactive && "cursor-default",
        shouldPulse && phase === "memorize" && "animate-pulse"
      )}
      animate={{
        ...(shouldShake ? shakeKeyframes : { x: 0 }),
        scale: phase === "memorize" && inPattern
          ? [0.6, 1.08, 1]
          : shouldShake
            ? [1, 0.95, 1.02, 0.98, 1]
            : 1,
      }}
      transition={{
        x: shouldShake ? { duration: 0.5, ease: "easeOut" } : { duration: 0.1 },
        scale: { duration: 0.35, ease: "easeOut" },
        delay: animDelay,
      }}
      whileTap={interactive ? { scale: 0.82 } : undefined}
      whileHover={interactive ? { scale: 1.06 } : undefined}
    />
  );
}

/* ================================================================== */
/*  Main Component                                                     */
/* ================================================================== */

export default function PatternMemory({ onScore, liveCode }: Props) {
  /* ── state ── */
  const [phase, setPhase] = useState<Phase>("idle");
  const [round, setRound] = useState(0);
  const [pattern, setPattern] = useState<Set<number>>(new Set());
  const [p1Taps, setP1Taps] = useState<Set<number>>(new Set());
  const [p2Taps, setP2Taps] = useState<Set<number>>(new Set());
  const [p1Total, setP1Total] = useState(0);
  const [p2Total, setP2Total] = useState(0);
  const [p1RoundPts, setP1RoundPts] = useState(0);
  const [p2RoundPts, setP2RoundPts] = useState(0);
  const [memProgress, setMemProgress] = useState(100);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onScoreFired = useRef(false);
  const scoresRef = useRef({ p1: 0, p2: 0 });

  const cfg = ROUNDS[round] ?? ROUNDS[0];
  const totalCells = cfg.gridSize * cfg.gridSize;
  const patternArr = Array.from(pattern).sort((a, b) => a - b);

  const recalling = phase === "recall_p1" || phase === "recall_p2";
  const isP1 = phase === "recall_p1";

  /* ── timer cleanup ── */
  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => clearTimer, [clearTimer]);

  /* ── memorize timer ── */
  useEffect(() => {
    if (phase !== "memorize") return;
    clearTimer();
    const start = Date.now();
    const durationMs = cfg.memorizeTime * 1000;
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.max(0, 100 - (elapsed / durationMs) * 100);
      setMemProgress(pct);
      if (elapsed >= durationMs) {
        clearTimer();
        setPhase("recall_p1");
      }
    }, 40);
    return clearTimer;
  }, [phase, cfg.memorizeTime, clearTimer]);

  /* ── feedback auto-advance timers ── */
  useEffect(() => {
    if (phase === "feedback_p1") {
      const id = setTimeout(() => setPhase("recall_p2"), 1800);
      return () => clearTimeout(id);
    }
    if (phase === "feedback_p2") {
      const id = setTimeout(() => setPhase("round_result"), 1800);
      return () => clearTimeout(id);
    }
  }, [phase]);

  /* ── start round ── */
  const startRound = useCallback(() => {
    const pat = pickPattern(totalCells, cfg.patternSize);
    setPattern(pat);
    setP1Taps(new Set());
    setP2Taps(new Set());
    setP1RoundPts(0);
    setP2RoundPts(0);
    setMemProgress(100);
    setPhase("memorize");
  }, [totalCells, cfg.patternSize]);

  /* ── begin full game ── */
  const handleStart = useCallback(() => {
    scoresRef.current = { p1: 0, p2: 0 };
    onScoreFired.current = false;
    setRound(0);
    setP1Total(0);
    setP2Total(0);
    setP1Taps(new Set());
    setP2Taps(new Set());
    setP1RoundPts(0);
    setP2RoundPts(0);
    setPattern(new Set());
    setPhase("idle");
    // Use round 0 config values directly instead of stale closure
    const r0Cells = 3;
    const r0Size = 2;
    const pat = pickPattern(r0Cells * r0Cells, r0Size);
    setPattern(pat);
    setP1Taps(new Set());
    setP2Taps(new Set());
    setP1RoundPts(0);
    setP2RoundPts(0);
    setMemProgress(100);
    setTimeout(() => setPhase("memorize"), 50);
  }, []);

  /* ── tap cell ── */
  const handleTap = useCallback(
    (idx: number) => {
      if (phase === "recall_p1") {
        setP1Taps((prev) => {
          const next = new Set(prev);
          next.has(idx) ? next.delete(idx) : next.add(idx);
          return next;
        });
      } else if (phase === "recall_p2") {
        setP2Taps((prev) => {
          const next = new Set(prev);
          next.has(idx) ? next.delete(idx) : next.add(idx);
          return next;
        });
      }
    },
    [phase]
  );

  /* ── confirm recall ── */
  const handleConfirm = useCallback(() => {
    if (phase === "recall_p1") {
      const pts = calcRoundScore(p1Taps, pattern);
      setP1RoundPts(pts);
      scoresRef.current.p1 += pts;
      setP1Total(scoresRef.current.p1);
      setPhase("feedback_p1");
    } else if (phase === "recall_p2") {
      const pts = calcRoundScore(p2Taps, pattern);
      setP2RoundPts(pts);
      scoresRef.current.p2 += pts;
      setP2Total(scoresRef.current.p2);
      setPhase("feedback_p2");
    }
  }, [phase, p1Taps, p2Taps, pattern]);

  /* ── next round / game over ── */
  const handleNextRound = useCallback(() => {
    const nextRound = round + 1;
    if (nextRound >= TOTAL_ROUNDS) {
      setPhase("game_over");
      if (onScore && !onScoreFired.current) {
        onScoreFired.current = true;
        const { p1, p2 } = scoresRef.current;
        if (p1 > p2) {
          onScore("Jogador 1", p1);
        } else if (p2 > p1) {
          onScore("Jogador 2", p2);
        } else {
          onScore("Jogador 1", p1);
          onScore("Jogador 2", p2);
        }
      }
    } else {
      setRound(nextRound);
      setPhase("idle");
      setTimeout(() => startRound(), 0);
    }
  }, [round, onScore, startRound]);

  /* ── restart ── */
  const handleRestart = useCallback(() => {
    clearTimer();
    handleStart();
  }, [clearTimer, handleStart]);

  /* ── derived sets for feedback ── */
  const fbTaps =
    phase === "feedback_p1" ? p1Taps : phase === "feedback_p2" ? p2Taps : null;
  const correctSet = new Set<number>();
  const wrongSet = new Set<number>();
  const missedSet = new Set<number>();
  if (fbTaps) {
    fbTaps.forEach((c) => (pattern.has(c) ? correctSet.add(c) : wrongSet.add(c)));
    pattern.forEach((c) => {
      if (!fbTaps.has(c)) missedSet.add(c);
    });
  }

  const currentTaps =
    phase === "recall_p1" ? p1Taps : phase === "recall_p2" ? p2Taps : new Set<number>();
  const activePlayer: 1 | 2 = phase === "recall_p1" ? 1 : 2;

  /* ================================================================ */
  /*  RENDER                                                           */
  /* ================================================================ */

  return (
    <div className="min-h-[540px] bg-gradient-to-b from-zinc-900 to-zinc-950 text-white flex flex-col items-center justify-center p-4 select-none overflow-hidden rounded-2xl border border-zinc-800/60 shadow-2xl">
      <AnimatePresence>
        {phase !== "idle" && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="w-full flex justify-center mb-4"
          >
            <ScoreBar
              p1={p1Total}
              p2={p2Total}
              round={round}
              highlight={phase === "recall_p1" ? 1 : phase === "recall_p2" ? 2 : undefined}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {phase === "idle" && (
          <motion.div
            key="idle"
            {...fadeUp}
            transition={{ duration: 0.35 }}
            className="flex flex-col items-center gap-5 text-center max-w-sm"
          >
            <motion.div
              initial={{ scale: 0, rotate: -15 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.1, type: "spring", stiffness: 200, damping: 15 }}
              className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-pink-500/20 border border-zinc-700/60 flex items-center justify-center"
            >
              <Grid3X3 className="w-10 h-10 text-violet-400" />
            </motion.div>

            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              <span className="bg-gradient-to-r from-cyan-400 to-cyan-300 bg-clip-text text-transparent">
                Memória
              </span>{" "}
              <span className="bg-gradient-to-r from-pink-400 to-pink-300 bg-clip-text text-transparent">
                de Padrão
              </span>
            </h1>

            <p className="text-zinc-400 text-sm leading-relaxed">
              Um padrão acende brevemente na grade.
              <br />
              Cada jogador recria de memória.
              <br />
              <span className="text-emerald-400/80">Acerto = +10 pts</span>{" "}
              <span className="text-zinc-600">•</span>{" "}
              <span className="text-red-400/80">Erro = −5 pts</span>
            </p>

            <div className="flex items-center gap-3 text-xs">
              <Badge className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-3 py-0.5">
                Jogador 1
              </Badge>
              <span className="text-zinc-500 font-extrabold text-sm">VS</span>
              <Badge className="bg-pink-500/20 text-pink-300 border border-pink-500/30 px-3 py-0.5">
                Jogador 2
              </Badge>
            </div>

            <div className="flex flex-col gap-0.5 text-[11px] text-zinc-500 mt-1">
              <span>
                {TOTAL_ROUNDS} rodadas • Grade 3×3 → 5×5
              </span>
              <span>
                Padrão cresce de {ROUNDS[0].patternSize} a {ROUNDS[ROUNDS.length - 1].patternSize}{" "}
                células
              </span>
              <span>
                Memorização: {ROUNDS[0].memorizeTime}s → {ROUNDS[ROUNDS.length - 1].memorizeTime}s
              </span>
            </div>

            <Button
              size="lg"
              onClick={handleStart}
              className="mt-2 bg-gradient-to-r from-cyan-600 to-pink-600 hover:from-cyan-500 hover:to-pink-500 text-white font-bold px-8 shadow-lg shadow-cyan-500/20 transition-all"
            >
              <Grid3X3 className="w-5 h-5 mr-2" />
              Iniciar Jogo
            </Button>
          </motion.div>
        )}

        {phase === "memorize" && (
          <motion.div
            key={`mem-${round}`}
            {...popIn}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="flex flex-col items-center gap-4"
          >
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Eye className="w-5 h-5 text-violet-400" />
                <p className="text-violet-300 font-bold text-lg">
                  Memorize o padrão! ({cfg.memorizeTime.toFixed(1)}s)
                </p>
              </div>
              <p className="text-zinc-500 text-xs">
                {cfg.gridSize}×{cfg.gridSize} • {cfg.patternSize} células
              </p>
            </motion.div>

            <div className="w-full max-w-xs flex items-center gap-2">
              <div className="flex-1 h-2.5 bg-zinc-800 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-violet-500 to-violet-400 rounded-full"
                  initial={{ width: "100%" }}
                  animate={{ width: `${memProgress}%` }}
                  transition={{ duration: 0.05 }}
                />
              </div>
              <span className="text-xs text-violet-300 tabular-nums w-8 text-right">
                {((memProgress / 100) * cfg.memorizeTime).toFixed(1)}s
              </span>
            </div>

            <div
              className="grid gap-2"
              style={{
                gridTemplateColumns: `repeat(${cfg.gridSize}, 1fr)`,
              }}
            >
              {Array.from({ length: totalCells }).map((_, i) => (
                <Cell
                  key={i}
                  index={i}
                  inPattern={pattern.has(i)}
                  patternStaggerIndex={patternArr.indexOf(i)}
                  isTapped={false}
                  isWrongTap={false}
                  isCorrectTap={false}
                  isMissed={false}
                  showPattern={false}
                  interactive={false}
                  tapColor={null}
                  phase={phase}
                  onTap={handleTap}
                />
              ))}
            </div>
          </motion.div>
        )}

        {(phase === "recall_p1" || phase === "recall_p2") && (
          <motion.div
            key={phase}
            {...popIn}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="flex flex-col items-center gap-3"
          >
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "rounded-xl px-5 py-2.5 text-center font-bold text-lg border",
                isP1
                  ? "bg-cyan-500/15 text-cyan-300 border-cyan-500/30 shadow-lg shadow-cyan-500/10"
                  : "bg-pink-500/15 text-pink-300 border-pink-500/30 shadow-lg shadow-pink-500/10"
              )}
            >
              {isP1 ? "Jogador 1" : "Jogador 2"} — Selecione as células lembradas (
              {currentTaps.size}/{cfg.patternSize})
            </motion.div>

            <p className="text-zinc-500 text-xs">
              Toque nas células que se lembra do padrão
            </p>

            <div
              className="grid gap-2"
              style={{
                gridTemplateColumns: `repeat(${cfg.gridSize}, 1fr)`,
              }}
            >
              {Array.from({ length: totalCells }).map((_, i) => (
                <Cell
                  key={i}
                  index={i}
                  inPattern={false}
                  patternStaggerIndex={-1}
                  isTapped={currentTaps.has(i)}
                  isWrongTap={false}
                  isCorrectTap={false}
                  isMissed={false}
                  showPattern={false}
                  interactive={true}
                  tapColor={isP1 ? "cyan" : "pink"}
                  phase={phase}
                  onTap={handleTap}
                />
              ))}
            </div>

            <Button
              size="lg"
              onClick={handleConfirm}
              className={cn(
                "mt-3 font-bold px-8 shadow-lg transition-all",
                activePlayer === 1
                  ? "bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-500/25"
                  : "bg-pink-600 hover:bg-pink-500 text-white shadow-pink-500/25"
              )}
            >
              <Eye className="w-4 h-4 mr-2" />
              Confirmar ({currentTaps.size})
            </Button>
          </motion.div>
        )}

        {phase === "feedback_p1" && (
          <motion.div
            key="feedback_p1"
            {...popIn}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="flex flex-col items-center gap-3"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-cyan-500/15 border border-cyan-500/40 rounded-xl px-5 py-2 text-center"
            >
              <p className="text-cyan-300 font-bold text-lg">
                Jogador 1 — +{p1RoundPts} pontos
              </p>
            </motion.div>

            <div
              className="grid gap-2"
              style={{
                gridTemplateColumns: `repeat(${cfg.gridSize}, 1fr)`,
              }}
            >
              {Array.from({ length: totalCells }).map((_, i) => (
                <Cell
                  key={i}
                  index={i}
                  inPattern={pattern.has(i)}
                  patternStaggerIndex={-1}
                  isTapped={p1Taps.has(i)}
                  isWrongTap={wrongSet.has(i)}
                  isCorrectTap={correctSet.has(i)}
                  isMissed={missedSet.has(i)}
                  showPattern={true}
                  interactive={false}
                  tapColor="cyan"
                  phase={phase}
                  onTap={handleTap}
                />
              ))}
            </div>
          </motion.div>
        )}

        {phase === "feedback_p2" && (
          <motion.div
            key="feedback_p2"
            {...popIn}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="flex flex-col items-center gap-3"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-pink-500/15 border border-pink-500/40 rounded-xl px-5 py-2 text-center"
            >
              <p className="text-pink-300 font-bold text-lg">
                Jogador 2 — +{p2RoundPts} pontos
              </p>
            </motion.div>

            <div
              className="grid gap-2"
              style={{
                gridTemplateColumns: `repeat(${cfg.gridSize}, 1fr)`,
              }}
            >
              {Array.from({ length: totalCells }).map((_, i) => (
                <Cell
                  key={i}
                  index={i}
                  inPattern={pattern.has(i)}
                  patternStaggerIndex={-1}
                  isTapped={p2Taps.has(i)}
                  isWrongTap={wrongSet.has(i)}
                  isCorrectTap={correctSet.has(i)}
                  isMissed={missedSet.has(i)}
                  showPattern={true}
                  interactive={false}
                  tapColor="pink"
                  phase={phase}
                  onTap={handleTap}
                />
              ))}
            </div>
          </motion.div>
        )}

        {phase === "round_result" && (
          <motion.div
            key={`result-${round}`}
            {...popIn}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="flex flex-col items-center gap-4 w-full max-w-sm"
          >
            <p className="text-zinc-300 font-bold text-base">
              Resultado da Rodada {round + 1}
            </p>

            <AnimatePresence>
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "rounded-xl px-5 py-2 text-center font-bold text-lg border",
                  p1RoundPts > p2RoundPts
                    ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-300"
                    : p2RoundPts > p1RoundPts
                      ? "bg-pink-500/15 border-pink-500/40 text-pink-300"
                      : "bg-zinc-500/15 border-zinc-500/40 text-zinc-200"
                )}
              >
                {p1RoundPts > p2RoundPts
                  ? "🏆 Jogador 1 venceu a rodada!"
                  : p2RoundPts > p1RoundPts
                    ? "🏆 Jogador 2 venceu a rodada!"
                    : "🤝 Empate na rodada!"}
              </motion.div>
            </AnimatePresence>

            <div
              className="grid gap-1.5"
              style={{
                gridTemplateColumns: `repeat(${cfg.gridSize}, 32px)`,
              }}
            >
              {Array.from({ length: totalCells }).map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.02 }}
                  className={cn(
                    "w-8 h-8 rounded-md border",
                    pattern.has(i)
                      ? "bg-violet-500/40 border-violet-400/60 shadow-sm shadow-violet-500/20"
                      : "bg-zinc-800/50 border-zinc-700/30"
                  )}
                />
              ))}
            </div>
            <p className="text-zinc-500 text-[11px]">Padrão correto</p>

            <div className="grid grid-cols-2 gap-3 w-full">
              {(
                [
                  {
                    label: "Jogador 1",
                    pts: p1RoundPts,
                    color: "cyan" as const,
                  },
                  {
                    label: "Jogador 2",
                    pts: p2RoundPts,
                    color: "pink" as const,
                  },
                ] as const
              ).map(({ label, pts, color }) => (
                <motion.div
                  key={label}
                  initial={{ opacity: 0, x: color === "cyan" ? -20 : 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                  className={cn(
                    "rounded-xl border p-3 text-center",
                    color === "cyan"
                      ? "bg-cyan-500/10 border-cyan-500/30"
                      : "bg-pink-500/10 border-pink-500/30"
                  )}
                >
                  <p
                    className={cn(
                      "text-xs font-bold mb-2",
                      color === "cyan" ? "text-cyan-400" : "text-pink-400"
                    )}
                  >
                    {label}
                  </p>
                  <p
                    className={cn(
                      "text-2xl font-extrabold",
                      pts > 0
                        ? "text-emerald-400"
                        : pts === 0
                          ? "text-zinc-400"
                          : "text-red-400"
                    )}
                  >
                    {pts > 0 ? "+" : ""}
                    {pts}
                  </p>
                </motion.div>
              ))}
            </div>

            <div className="flex items-center gap-4 text-sm mt-1">
              <span className="text-cyan-400 font-bold">J1: {p1Total}</span>
              <span className="text-zinc-600">—</span>
              <span className="text-pink-400 font-bold">J2: {p2Total}</span>
            </div>

            <Button
              size="lg"
              onClick={handleNextRound}
              className="mt-1 bg-gradient-to-r from-cyan-600 to-pink-600 hover:from-cyan-500 hover:to-pink-500 text-white font-bold px-8 shadow-lg"
            >
              {round + 1 < TOTAL_ROUNDS ? "Próxima Rodada" : "Ver Resultado Final"}
            </Button>
          </motion.div>
        )}

        {phase === "game_over" && (
          <motion.div
            key="game_over"
            {...fadeUp}
            transition={{ duration: 0.4 }}
            className="flex flex-col items-center gap-5 text-center max-w-sm"
          >
            <motion.div
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 12 }}
              className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-500/20 to-yellow-500/20 border border-amber-500/30 flex items-center justify-center"
            >
              <Grid3X3 className="w-10 h-10 text-amber-400" />
            </motion.div>

            <h2 className="text-2xl sm:text-3xl font-extrabold">Resultado Final</h2>

            {p1Total > p2Total && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 }}
                className="bg-cyan-500/15 border border-cyan-500/40 rounded-xl px-6 py-3"
              >
                <p className="text-cyan-300 font-extrabold text-xl">🏆 Jogador 1 Venceu!</p>
                <p className="text-cyan-400/80 text-sm mt-1">Com {p1Total} pontos</p>
              </motion.div>
            )}
            {p2Total > p1Total && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 }}
                className="bg-pink-500/15 border border-pink-500/40 rounded-xl px-6 py-3"
              >
                <p className="text-pink-300 font-extrabold text-xl">🏆 Jogador 2 Venceu!</p>
                <p className="text-pink-400/80 text-sm mt-1">Com {p2Total} pontos</p>
              </motion.div>
            )}
            {p1Total === p2Total && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 }}
                className="bg-zinc-500/15 border border-zinc-500/40 rounded-xl px-6 py-3"
              >
                <p className="text-zinc-200 font-extrabold text-xl">🤝 Empate!</p>
                <p className="text-zinc-400 text-sm mt-1">Ambos com {p1Total} pontos</p>
              </motion.div>
            )}

            <div className="flex items-center gap-6 mt-1">
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
                className="text-center"
              >
                <p className="text-cyan-400 text-3xl font-black tabular-nums">{p1Total}</p>
                <p className="text-cyan-400/60 text-xs font-bold mt-1">Jogador 1</p>
              </motion.div>
              <div className="text-zinc-600 font-black text-lg">VS</div>
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
                className="text-center"
              >
                <p className="text-pink-400 text-3xl font-black tabular-nums">{p2Total}</p>
                <p className="text-pink-400/60 text-xs font-bold mt-1">Jogador 2</p>
              </motion.div>
            </div>

            {p1Total + p2Total > 0 && (
              <div className="w-full max-w-xs h-3 bg-zinc-800 rounded-full overflow-hidden flex mt-1">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(p1Total / (p1Total + p2Total)) * 100}%` }}
                  transition={{ delay: 0.7, duration: 0.8, ease: "easeOut" }}
                  className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400"
                />
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(p2Total / (p1Total + p2Total)) * 100}%` }}
                  transition={{ delay: 0.7, duration: 0.8, ease: "easeOut" }}
                  className="h-full bg-gradient-to-r from-pink-400 to-pink-500"
                />
              </div>
            )}

            <Button
              variant="outline"
              size="lg"
              onClick={handleRestart}
              className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white font-bold px-6 mt-2"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Jogar Novamente
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
