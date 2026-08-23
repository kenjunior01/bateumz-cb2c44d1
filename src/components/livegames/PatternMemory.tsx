import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  RotateCcw,
  Eye,
  Grid3X3,
  Trophy,
  Handshake,
  Zap,
} from "lucide-react";
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

const CONFETTI_COLORS = [
  "#06b6d4",
  "#ec4899",
  "#a855f7",
  "#f59e0b",
  "#10b981",
  "#3b82f6",
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

/* ------------------------------------------------------------------ */
/*  Confetti burst                                                     */
/* ------------------------------------------------------------------ */

function ConfettiBurst() {
  const particles = useMemo(
    () =>
      Array.from({ length: 48 }, (_, i) => ({
        id: i,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        x: (Math.random() - 0.5) * 360,
        y: -(Math.random() * 200 + 60),
        rotate: (Math.random() - 0.5) * 720,
        delay: Math.random() * 0.4,
        size: Math.random() * 5 + 3,
        borderRadius: Math.random() > 0.5 ? "50%" : "2px",
      })),
    [],
  );

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{ opacity: 1, x: 0, y: 0, rotate: 0, scale: 1 }}
          animate={{
            opacity: 0,
            x: p.x,
            y: p.y,
            rotate: p.rotate,
            scale: 0.2,
          }}
          transition={{ duration: 1.8, delay: p.delay, ease: "easeOut" }}
          className="absolute left-1/2 top-1/2"
          style={{
            backgroundColor: p.color,
            width: p.size,
            height: p.size,
            borderRadius: p.borderRadius as string,
          }}
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Level-up overlay                                                   */
/* ------------------------------------------------------------------ */

function LevelUpOverlay({ text }: { text: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: [0, 1, 1, 0], scale: [0.5, 1.15, 1, 0.9] }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1.3, ease: "easeInOut" }}
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-2xl"
    >
      <div className="flex flex-col items-center gap-2">
        <motion.div
          animate={{ rotate: [0, 15, -15, 10, -10, 0], scale: [1, 1.2, 1] }}
          transition={{ duration: 0.6 }}
        >
          <Zap className="w-12 h-12 text-amber-400 drop-shadow-[0_0_12px_rgba(251,191,36,0.6)]" />
        </motion.div>
        <p className="text-3xl font-black text-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.4)]">
          NIVEL {text}
        </p>
      </div>
    </motion.div>
  );
}

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
  const total = p1 + p2;
  const p1Pct = total > 0 ? (p1 / total) * 100 : 50;

  return (
    <div className="w-full max-w-md flex flex-col gap-1.5">
      <div className="flex w-full items-end justify-between">
        {/* Player 1 */}
        <motion.div
          animate={{
            scale: highlight === 1 ? 1.1 : 1,
            y: highlight === 1 ? -3 : 0,
          }}
          transition={{ type: "spring", stiffness: 300 }}
          className="flex flex-col items-center min-w-[80px]"
        >
          <span className="text-[10px] font-semibold uppercase tracking-widest text-cyan-400/60">
            Jogador 1
          </span>
          <motion.span
            key={`p1-${p1}`}
            initial={{ scale: 1.4 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 400 }}
            className="text-2xl font-black tabular-nums text-cyan-300 leading-tight"
          >
            {p1}
          </motion.span>
        </motion.div>

        {/* Round indicator */}
        <div className="flex flex-col items-center">
          <Badge
            variant="secondary"
            className="bg-zinc-800/80 text-zinc-400 px-2.5 py-0.5 text-[10px] font-semibold"
          >
            RODADA {round + 1}/{TOTAL_ROUNDS}
          </Badge>
        </div>

        {/* Player 2 */}
        <motion.div
          animate={{
            scale: highlight === 2 ? 1.1 : 1,
            y: highlight === 2 ? -3 : 0,
          }}
          transition={{ type: "spring", stiffness: 300 }}
          className="flex flex-col items-center min-w-[80px]"
        >
          <span className="text-[10px] font-semibold uppercase tracking-widest text-pink-400/60">
            Jogador 2
          </span>
          <motion.span
            key={`p2-${p2}`}
            initial={{ scale: 1.4 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 400 }}
            className="text-2xl font-black tabular-nums text-pink-300 leading-tight"
          >
            {p2}
          </motion.span>
        </motion.div>
      </div>

      {/* Score comparison bar */}
      <motion.div
        initial={{ opacity: 0, scaleX: 0 }}
        animate={{ opacity: total > 0 ? 1 : 0, scaleX: total > 0 ? 1 : 0 }}
        className="h-1.5 bg-zinc-800 rounded-full overflow-hidden flex origin-center"
      >
        <motion.div
          animate={{ width: `${p1Pct}%` }}
          transition={{ type: "spring", stiffness: 200, damping: 25 }}
          className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400"
        />
        <motion.div
          animate={{ width: `${100 - p1Pct}%` }}
          transition={{ type: "spring", stiffness: 200, damping: 25 }}
          className="h-full bg-gradient-to-r from-pink-400 to-pink-600"
        />
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
  /* ---- visual state ---- */
  let bg = "bg-zinc-800/70 border-zinc-700/40";
  let glow = "";
  let showFlash = false;
  let flashColor = "bg-white";

  /* ---- per-phase animation config ---- */
  const anim: Record<string, unknown> = {};
  const trans: Record<string, unknown> = {};

  if (phase === "memorize") {
    if (inPattern) {
      bg = "bg-violet-500 border-violet-400/60";
      const d = patternStaggerIndex * 0.07;
      anim.scale = [0.5, 1.06, 0.97, 1.04, 1];
      anim.boxShadow = [
        "0 0 6px 1px rgba(139,92,246,0.3)",
        "0 0 30px 8px rgba(139,92,246,0.6)",
        "0 0 18px 4px rgba(139,92,246,0.4)",
        "0 0 36px 10px rgba(139,92,246,0.65)",
        "0 0 22px 6px rgba(139,92,246,0.5)",
      ];
      trans.duration = 2.5;
      trans.repeat = Infinity;
      trans.ease = "easeInOut";
      trans.delay = d;
    } else {
      bg = "bg-zinc-800/50 border-zinc-700/30";
    }
  } else if (phase === "recall_p1" || phase === "recall_p2") {
    if (isTapped && tapColor === "cyan") {
      bg = "bg-cyan-500 border-cyan-400/60";
      glow = "shadow-[0_0_16px_3px_rgba(6,182,212,0.45)]";
      anim.scale = [0.85, 1.06, 1];
      trans.duration = 0.2;
      trans.ease = "easeOut";
    } else if (isTapped && tapColor === "pink") {
      bg = "bg-pink-500 border-pink-400/60";
      glow = "shadow-[0_0_16px_3px_rgba(236,72,153,0.45)]";
      anim.scale = [0.85, 1.06, 1];
      trans.duration = 0.2;
      trans.ease = "easeOut";
    } else {
      bg = "bg-zinc-800/70 border-zinc-700/40";
    }
  } else if (phase === "feedback_p1" || phase === "feedback_p2") {
    if (isCorrectTap) {
      bg = "bg-emerald-500 border-emerald-400/60";
      showFlash = true;
      flashColor = "bg-emerald-200";
      anim.scale = [1, 1.22, 1];
      anim.boxShadow = [
        "0 0 0 0 rgba(16,185,129,0)",
        "0 0 28px 10px rgba(16,185,129,0.65)",
        "0 0 16px 4px rgba(16,185,129,0.4)",
      ];
      trans.scale = { duration: 0.6, ease: "easeOut" };
      trans.boxShadow = { duration: 0.6, ease: "easeOut" };
    } else if (isWrongTap) {
      bg = "bg-red-500 border-red-400/60";
      showFlash = true;
      flashColor = "bg-red-300";
      anim.x = [0, -8, 8, -6, 6, -3, 3, 0];
      anim.scale = [1, 0.88, 1.06, 0.94, 1];
      anim.boxShadow = [
        "0 0 0 0 rgba(239,68,68,0)",
        "0 0 24px 8px rgba(239,68,68,0.65)",
        "0 0 12px 3px rgba(239,68,68,0.35)",
      ];
      trans.x = { duration: 0.5, ease: "easeOut" };
      trans.scale = { duration: 0.5, ease: "easeOut" };
      trans.boxShadow = { duration: 0.5, ease: "easeOut" };
    } else if (isMissed) {
      bg = "bg-violet-700/40 border-violet-500/40";
      anim.scale = [1, 1.1, 0.96, 1.04, 1];
      anim.boxShadow = [
        "0 0 0 0 rgba(139,92,246,0)",
        "0 0 18px 5px rgba(139,92,246,0.45)",
        "0 0 8px 2px rgba(139,92,246,0.25)",
      ];
      trans.duration = 0.9;
      trans.ease = "easeOut";
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
        "w-14 h-14 sm:w-18 sm:h-18 rounded-xl border-2 relative overflow-hidden transition-[background-color,border-color] duration-150",
        bg,
        glow,
        interactive && "cursor-pointer hover:brightness-125",
        !interactive && "cursor-default",
      )}
      animate={anim}
      transition={trans}
      whileTap={interactive ? { scale: 0.82 } : undefined}
      whileHover={interactive ? { scale: 1.06 } : undefined}
    >
      {/* Flash overlay for correct / wrong feedback */}
      <AnimatePresence>
        {showFlash && (
          <motion.div
            key="flash"
            className={cn("absolute inset-0 rounded-[10px]", flashColor)}
            initial={{ opacity: 0.9 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
          />
        )}
      </AnimatePresence>
    </motion.button>
  );
}

/* ================================================================== */
/*  Main Component                                                     */
/* ================================================================== */

export default function PatternMemory({ onScore, liveCode }: Props) {
  /* ---- state ---- */
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
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [levelUpText, setLevelUpText] = useState("");

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onScoreFired = useRef(false);
  const scoresRef = useRef({ p1: 0, p2: 0 });

  const cfg = ROUNDS[round] ?? ROUNDS[0];
  const totalCells = cfg.gridSize * cfg.gridSize;
  const patternArr = Array.from(pattern).sort((a, b) => a - b);

  const recalling = phase === "recall_p1" || phase === "recall_p2";
  const isP1 = phase === "recall_p1";

  /* ---- timer cleanup ---- */
  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => clearTimer, [clearTimer]);

  /* ---- memorize timer ---- */
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

  /* ---- feedback auto-advance timers ---- */
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

  /* ---- level-up detection ---- */
  useEffect(() => {
    if (round > 0 && phase === "memorize") {
      const prevGrid = ROUNDS[round - 1]?.gridSize;
      const currGrid = ROUNDS[round].gridSize;
      if (prevGrid !== undefined && prevGrid !== currGrid) {
        const txt = `${currGrid}\u00D7${currGrid}`;
        setLevelUpText(txt);
        setShowLevelUp(true);
        const t = setTimeout(() => setShowLevelUp(false), 1300);
        return () => clearTimeout(t);
      }
    }
  }, [round, phase]);

  /* ---- start round ---- */
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

  /* ---- begin full game ---- */
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
    setShowLevelUp(false);
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

  /* ---- tap cell ---- */
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
    [phase],
  );

  /* ---- confirm recall ---- */
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

  /* ---- next round / game over ---- */
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

  /* ---- restart ---- */
  const handleRestart = useCallback(() => {
    clearTimer();
    handleStart();
  }, [clearTimer, handleStart]);

  /* ---- derived sets for feedback ---- */
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

  /* ---- determine winner ---- */
  const winner = p1Total > p2Total ? 1 : p2Total > p1Total ? 2 : 0;

  /* ================================================================ */
  /*  RENDER                                                           */
  /* ================================================================ */

  return (
    <div className="relative min-h-[540px] bg-gradient-to-b from-zinc-900 to-zinc-950 text-white flex flex-col items-center justify-center p-4 select-none overflow-hidden rounded-2xl border border-zinc-800/60 shadow-2xl">
      {/* Level-up overlay */}
      <AnimatePresence>
        {showLevelUp && <LevelUpOverlay text={levelUpText} />}
      </AnimatePresence>

      <AnimatePresence>
        {phase !== "idle" && phase !== "game_over" && (
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
              highlight={
                phase === "recall_p1"
                  ? 1
                  : phase === "recall_p2"
                    ? 2
                    : undefined
              }
            />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {/* ==================== IDLE ==================== */}
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
              transition={{
                delay: 0.1,
                type: "spring",
                stiffness: 200,
                damping: 15,
              }}
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

        {/* ==================== MEMORIZE ==================== */}
        {phase === "memorize" && (
          <motion.div
            key={`mem-${round}`}
            {...popIn}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="flex flex-col items-center gap-4"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center"
            >
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

            {/* Grid wrapper with ambient glow pulse */}
            <motion.div
              className="grid gap-2 p-3 rounded-2xl"
              style={{
                gridTemplateColumns: `repeat(${cfg.gridSize}, 1fr)`,
              }}
              animate={{
                boxShadow: [
                  "0 0 0 0 rgba(139,92,246,0)",
                  "0 0 40px 4px rgba(139,92,246,0.15)",
                  "0 0 0 0 rgba(139,92,246,0)",
                ],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
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
            </motion.div>
          </motion.div>
        )}

        {/* ==================== RECALL ==================== */}
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
                  : "bg-pink-500/15 text-pink-300 border-pink-500/30 shadow-lg shadow-pink-500/10",
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
                  : "bg-pink-600 hover:bg-pink-500 text-white shadow-pink-500/25",
              )}
            >
              <Eye className="w-4 h-4 mr-2" />
              Confirmar ({currentTaps.size})
            </Button>
          </motion.div>
        )}

        {/* ==================== FEEDBACK P1 ==================== */}
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
                Jogador 1 —{" "}
                <motion.span
                  key={`fb1-${p1RoundPts}`}
                  initial={{
                    scale: 1.5,
                    color: p1RoundPts > 0 ? "#34d399" : "#f87171",
                  }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  {p1RoundPts > 0 ? "+" : ""}
                  {p1RoundPts} pontos
                </motion.span>
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

        {/* ==================== FEEDBACK P2 ==================== */}
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
                Jogador 2 —{" "}
                <motion.span
                  key={`fb2-${p2RoundPts}`}
                  initial={{
                    scale: 1.5,
                    color: p2RoundPts > 0 ? "#34d399" : "#f87171",
                  }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  {p2RoundPts > 0 ? "+" : ""}
                  {p2RoundPts} pontos
                </motion.span>
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

        {/* ==================== ROUND RESULT ==================== */}
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
                  "rounded-xl px-5 py-2.5 text-center font-bold text-lg border flex items-center justify-center gap-2",
                  p1RoundPts > p2RoundPts
                    ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-300"
                    : p2RoundPts > p1RoundPts
                      ? "bg-pink-500/15 border-pink-500/40 text-pink-300"
                      : "bg-zinc-500/15 border-zinc-500/40 text-zinc-200",
                )}
              >
                {p1RoundPts > p2RoundPts ? (
                  <Trophy className="w-5 h-5" />
                ) : p2RoundPts > p1RoundPts ? (
                  <Trophy className="w-5 h-5" />
                ) : (
                  <Handshake className="w-5 h-5" />
                )}
                {p1RoundPts > p2RoundPts
                  ? "Jogador 1 venceu a rodada!"
                  : p2RoundPts > p1RoundPts
                    ? "Jogador 2 venceu a rodada!"
                    : "Empate na rodada!"}
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
                      : "bg-zinc-800/50 border-zinc-700/30",
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
                    color: "cyan" as "cyan" | "pink",
                  },
                  {
                    label: "Jogador 2",
                    pts: p2RoundPts,
                    color: "pink" as "cyan" | "pink",
                  },
                ]
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
                      : "bg-pink-500/10 border-pink-500/30",
                  )}
                >
                  <p
                    className={cn(
                      "text-xs font-bold mb-2",
                      color === "cyan" ? "text-cyan-400" : "text-pink-400",
                    )}
                  >
                    {label}
                  </p>
                  <motion.p
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.4, type: "spring", stiffness: 300 }}
                    className={cn(
                      "text-2xl font-extrabold",
                      pts > 0
                        ? "text-emerald-400"
                        : pts === 0
                          ? "text-zinc-400"
                          : "text-red-400",
                    )}
                  >
                    {pts > 0 ? "+" : ""}
                    {pts}
                  </motion.p>
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
              {round + 1 < TOTAL_ROUNDS
                ? "Próxima Rodada"
                : "Ver Resultado Final"}
            </Button>
          </motion.div>
        )}

        {/* ==================== GAME OVER ==================== */}
        {phase === "game_over" && (
          <motion.div
            key="game_over"
            {...fadeUp}
            transition={{ duration: 0.4 }}
            className="relative flex flex-col items-center gap-5 text-center max-w-sm"
          >
            {/* Confetti burst */}
            <ConfettiBurst />

            {/* Ambient background glow */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
              <motion.div
                className="absolute -top-10 -left-10 w-40 h-40 rounded-full bg-cyan-500/10 blur-3xl"
                animate={{
                  x: [0, 20, 0],
                  y: [0, -10, 0],
                  scale: [1, 1.2, 1],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
              <motion.div
                className="absolute -bottom-10 -right-10 w-40 h-40 rounded-full bg-pink-500/10 blur-3xl"
                animate={{
                  x: [0, -20, 0],
                  y: [0, 10, 0],
                  scale: [1, 1.2, 1],
                }}
                transition={{
                  duration: 5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            </div>

            {/* Trophy icon */}
            <motion.div
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{
                delay: 0.2,
                type: "spring",
                stiffness: 200,
                damping: 12,
              }}
              className="relative z-10"
            >
              <div
                className={cn(
                  "w-24 h-24 rounded-2xl border flex items-center justify-center",
                  winner === 1
                    ? "bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 border-cyan-500/40 shadow-[0_0_30px_8px_rgba(6,182,212,0.2)]"
                    : winner === 2
                      ? "bg-gradient-to-br from-pink-500/20 to-pink-600/10 border-pink-500/40 shadow-[0_0_30px_8px_rgba(236,72,153,0.2)]"
                      : "bg-gradient-to-br from-amber-500/20 to-yellow-500/10 border-amber-500/40 shadow-[0_0_30px_8px_rgba(245,158,11,0.2)]",
                )}
              >
                <Trophy
                  className={cn(
                    "w-12 h-12",
                    winner === 1
                      ? "text-cyan-300"
                      : winner === 2
                        ? "text-pink-300"
                        : "text-amber-300",
                  )}
                />
              </div>
            </motion.div>

            <h2 className="text-2xl sm:text-3xl font-extrabold relative z-10">
              Resultado Final
            </h2>

            {/* Winner announcement */}
            <AnimatePresence>
              {winner === 1 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{
                    delay: 0.4,
                    type: "spring",
                    stiffness: 300,
                  }}
                  className="relative z-10 bg-cyan-500/15 border border-cyan-500/40 rounded-xl px-6 py-3 shadow-lg shadow-cyan-500/10"
                >
                  <p className="text-cyan-300 font-extrabold text-xl flex items-center justify-center gap-2">
                    <Trophy className="w-5 h-5" />
                    Jogador 1 Venceu!
                  </p>
                  <p className="text-cyan-400/80 text-sm mt-1">
                    Com {p1Total} pontos
                  </p>
                </motion.div>
              )}
              {winner === 2 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{
                    delay: 0.4,
                    type: "spring",
                    stiffness: 300,
                  }}
                  className="relative z-10 bg-pink-500/15 border border-pink-500/40 rounded-xl px-6 py-3 shadow-lg shadow-pink-500/10"
                >
                  <p className="text-pink-300 font-extrabold text-xl flex items-center justify-center gap-2">
                    <Trophy className="w-5 h-5" />
                    Jogador 2 Venceu!
                  </p>
                  <p className="text-pink-400/80 text-sm mt-1">
                    Com {p2Total} pontos
                  </p>
                </motion.div>
              )}
              {winner === 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{
                    delay: 0.4,
                    type: "spring",
                    stiffness: 300,
                  }}
                  className="relative z-10 bg-zinc-500/15 border border-zinc-500/40 rounded-xl px-6 py-3"
                >
                  <p className="text-zinc-200 font-extrabold text-xl flex items-center justify-center gap-2">
                    <Handshake className="w-5 h-5" />
                    Empate!
                  </p>
                  <p className="text-zinc-400 text-sm mt-1">
                    Ambos com {p1Total} pontos
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Score comparison */}
            <div className="flex items-center gap-8 mt-1 relative z-10">
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  delay: 0.5,
                  type: "spring",
                  stiffness: 200,
                }}
                className="text-center"
              >
                <motion.p
                  key={`go-p1-${p1Total}`}
                  initial={{ scale: 1.3 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 400 }}
                  className={cn(
                    "text-4xl font-black tabular-nums",
                    winner === 1
                      ? "text-cyan-300"
                      : "text-cyan-400/60",
                  )}
                >
                  {p1Total}
                </motion.p>
                <p className="text-cyan-400/60 text-xs font-bold mt-1 uppercase tracking-wider">
                  Jogador 1
                </p>
              </motion.div>

              <div className="flex flex-col items-center gap-1">
                <span className="text-zinc-600 font-black text-lg">VS</span>
              </div>

              <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  delay: 0.5,
                  type: "spring",
                  stiffness: 200,
                }}
                className="text-center"
              >
                <motion.p
                  key={`go-p2-${p2Total}`}
                  initial={{ scale: 1.3 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 400 }}
                  className={cn(
                    "text-4xl font-black tabular-nums",
                    winner === 2
                      ? "text-pink-300"
                      : "text-pink-400/60",
                  )}
                >
                  {p2Total}
                </motion.p>
                <p className="text-pink-400/60 text-xs font-bold mt-1 uppercase tracking-wider">
                  Jogador 2
                </p>
              </motion.div>
            </div>

            {/* Score bar */}
            {p1Total + p2Total > 0 && (
              <div className="w-full max-w-xs h-3 bg-zinc-800 rounded-full overflow-hidden flex mt-1 relative z-10">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{
                    width: `${(p1Total / (p1Total + p2Total)) * 100}%`,
                  }}
                  transition={{
                    delay: 0.7,
                    duration: 0.8,
                    ease: "easeOut",
                  }}
                  className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400"
                />
                <motion.div
                  initial={{ width: 0 }}
                  animate={{
                    width: `${(p2Total / (p1Total + p2Total)) * 100}%`,
                  }}
                  transition={{
                    delay: 0.7,
                    duration: 0.8,
                    ease: "easeOut",
                  }}
                  className="h-full bg-gradient-to-r from-pink-400 to-pink-500"
                />
              </div>
            )}

            {/* Difference display */}
            {p1Total !== p2Total && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="text-zinc-500 text-xs relative z-10"
              >
                Diferença: {" "}
                <span className="text-zinc-300 font-bold">
                  {Math.abs(p1Total - p2Total)} pontos
                </span>
              </motion.p>
            )}

            <Button
              variant="outline"
              size="lg"
              onClick={handleRestart}
              className="relative z-10 border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white font-bold px-6 mt-2"
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
