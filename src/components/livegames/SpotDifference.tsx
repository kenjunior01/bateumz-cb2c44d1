"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RotateCcw, Timer, Eye, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/* ──────────────────────────────────────────────────────────────────── */
/*  Types                                                              */
/* ──────────────────────────────────────────────────────────────────── */

interface SpotDifferenceProps {
  onScore?: (name: string, score: number) => void;
  liveCode?: string;
}

interface Shape {
  id: number;
  type: "circle" | "rect" | "triangle";
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  rotation: number;
}

interface DiffInfo {
  idx: number;
  targetA: { x: number; y: number };
  targetB: { x: number; y: number };
}

type GameStatus = "idle" | "playing" | "roundResult" | "gameOver";

/* ──────────────────────────────────────────────────────────────────── */
/*  Constants                                                          */
/* ──────────────────────────────────────────────────────────────────── */

const SCENE_W = 300;
const SCENE_H = 220;
const SHAPE_COUNT = 14;
const DIFF_COUNT = 5;
const ROUND_TIME = 60;
const CLICK_RADIUS = 25;
const TOTAL_ROUNDS = 5;

const PALETTE = [
  "#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6",
  "#8b5cf6", "#ec4899", "#06b6d4", "#f43f5e", "#14b8a6",
  "#a855f7", "#84cc16", "#f59e0b", "#10b981",
];

/* ──────────────────────────────────────────────────────────────────── */
/*  Utility helpers                                                    */
/* ──────────────────────────────────────────────────────────────────── */

const rand = (lo: number, hi: number) =>
  Math.floor(Math.random() * (hi - lo + 1)) + lo;

const pick = <T,>(arr: T[]) => arr[rand(0, arr.length - 1)];

const randColor = (exclude?: string) =>
  pick(exclude ? PALETTE.filter((c) => c !== exclude) : PALETTE);

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

const shapeCenter = (s: Shape) => ({ x: s.x + s.w / 2, y: s.y + s.h / 2 });

/* ──────────────────────────────────────────────────────────────────── */
/*  Scene generation                                                   */
/* ──────────────────────────────────────────────────────────────────── */

function generateBaseScene(): Shape[] {
  const shapes: Shape[] = [];
  for (let i = 0; i < SHAPE_COUNT; i++) {
    const type = pick(["circle", "rect", "triangle"] as const);
    const w = clamp(rand(20, 55), 20, SCENE_W - 20);
    const h =
      type === "circle" ? w : clamp(rand(18, 48), 18, SCENE_H - 20);
    shapes.push({
      id: i,
      type,
      x: rand(5, SCENE_W - w - 5),
      y: rand(5, SCENE_H - h - 5),
      w,
      h,
      color: randColor(),
      rotation: type === "circle" ? 0 : rand(0, 359),
    });
  }
  return shapes;
}

function generateRoundData(): {
  sceneA: Shape[];
  sceneB: Shape[];
  diffs: DiffInfo[];
} {
  const sceneA = generateBaseScene();
  const sceneB: Shape[] = sceneA.map((s) => ({ ...s }));

  // Fisher-Yates shuffle to pick 5 random shape indices
  const indices = [...Array(SHAPE_COUNT).keys()];
  for (let i = indices.length - 1; i > 0; i--) {
    const j = rand(0, i);
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  const diffIndices = indices.slice(0, DIFF_COUNT);

  const modTypes = ["color", "position", "size", "missing", "extra"] as const;
  const diffs: DiffInfo[] = [];

  for (let d = 0; d < DIFF_COUNT; d++) {
    const si = diffIndices[d];
    const shapeA = sceneA[si];
    const bi = sceneB.findIndex((s) => s.id === shapeA.id);
    const mod = pick(modTypes);

    switch (mod) {
      /* ── colour change ─────────────────────────────────────── */
      case "color": {
        sceneB[bi].color = randColor(shapeA.color);
        diffs.push({
          idx: d,
          targetA: shapeCenter(shapeA),
          targetB: shapeCenter(sceneB[bi]),
        });
        break;
      }

      /* ── position shift ±15 px ─────────────────────────────── */
      case "position": {
        const dx = rand(-15, 15) || (Math.random() > 0.5 ? 12 : -12);
        const dy = rand(-15, 15) || (Math.random() > 0.5 ? 10 : -10);
        sceneB[bi].x = clamp(
          sceneB[bi].x + dx,
          5,
          SCENE_W - sceneB[bi].w - 5
        );
        sceneB[bi].y = clamp(
          sceneB[bi].y + dy,
          5,
          SCENE_H - sceneB[bi].h - 5
        );
        diffs.push({
          idx: d,
          targetA: shapeCenter(shapeA),
          targetB: shapeCenter(sceneB[bi]),
        });
        break;
      }

      /* ── size change ±30 % ──────────────────────────────────── */
      case "size": {
        let factor = 1 + rand(-30, 30) / 100;
        if (Math.abs(factor - 1) < 0.05) factor = 1.25;
        sceneB[bi].w = clamp(
          Math.round(sceneB[bi].w * factor),
          12,
          SCENE_W - sceneB[bi].x - 5
        );
        sceneB[bi].h = clamp(
          Math.round(sceneB[bi].h * factor),
          12,
          SCENE_H - sceneB[bi].y - 5
        );
        diffs.push({
          idx: d,
          targetA: shapeCenter(shapeA),
          targetB: shapeCenter(sceneB[bi]),
        });
        break;
      }

      /* ── missing from B ────────────────────────────────────── */
      case "missing": {
        const c = shapeCenter(shapeA);
        sceneB.splice(bi, 1); // remove from scene B
        diffs.push({
          idx: d,
          targetA: c, // visible in A
          targetB: c, // ghost position in B
        });
        break;
      }

      /* ── extra in B (removed from A) ───────────────────────── */
      case "extra": {
        const c = shapeCenter(sceneB[bi]);
        sceneA.splice(si, 1); // remove from scene A
        sceneB[bi].color = randColor(); // give it a fresh look
        diffs.push({
          idx: d,
          targetA: c, // ghost position in A
          targetB: c,
        });
        break;
      }
    }
  }

  return { sceneA, sceneB, diffs };
}

/* ──────────────────────────────────────────────────────────────────── */
/*  Shape renderer                                                     */
/* ──────────────────────────────────────────────────────────────────── */

function ShapeEl({ shape }: { shape: Shape }) {
  const base: React.CSSProperties = {
    position: "absolute",
    left: shape.x,
    top: shape.y,
    width: shape.w,
    height: shape.h,
    backgroundColor: shape.color,
    transform: `rotate(${shape.rotation}deg)`,
  };

  if (shape.type === "circle")
    return <div className="rounded-full" style={base} />;

  if (shape.type === "rect")
    return <div className="rounded-lg" style={base} />;

  // triangle — CSS clip-path
  return (
    <div
      style={{
        ...base,
        clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)",
      }}
    />
  );
}

/* ──────────────────────────────────────────────────────────────────── */
/*  Main component                                                     */
/* ──────────────────────────────────────────────────────────────────── */

export default function SpotDifference({
  onScore,
  liveCode,
}: SpotDifferenceProps) {
  /* ── state ──────────────────────────────────────────────────────── */
  const [status, setStatus] = useState<GameStatus>("idle");
  const [round, setRound] = useState(1);
  const [timeLeft, setTimeLeft] = useState(ROUND_TIME);
  const [sceneA, setSceneA] = useState<Shape[]>([]);
  const [sceneB, setSceneB] = useState<Shape[]>([]);
  const [diffs, setDiffs] = useState<DiffInfo[]>([]);
  const [found, setFound] = useState<(1 | 2 | null)[]>(
    Array(DIFF_COUNT).fill(null)
  );
  const [totalScore, setTotalScore] = useState({ p1: 0, p2: 0 });
  const [roundScore, setRoundScore] = useState({ p1: 0, p2: 0 });
  const [feedback, setFeedback] = useState<{
    player: 1 | 2;
    hit: boolean;
  } | null>(null);

  /* ── refs ────────────────────────────────────────────────────────── */
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>();
  const roundStartRef = useRef(0);
  const roundScoreRef = useRef({ p1: 0, p2: 0 });
  const totalScoreRef = useRef({ p1: 0, p2: 0 });
  const foundRef = useRef<(1 | 2 | null)[]>(Array(DIFF_COUNT).fill(null));
  const endedRef = useRef(false);
  const prevRoundRef = useRef(1);
  const scoredRef = useRef(false);

  /* sync refs with state */
  useEffect(() => {
    roundScoreRef.current = roundScore;
  }, [roundScore]);
  useEffect(() => {
    totalScoreRef.current = totalScore;
  }, [totalScore]);
  useEffect(() => {
    foundRef.current = found;
  }, [found]);

  /* ── cleanup on unmount ──────────────────────────────────────────── */
  useEffect(() => {
    return () => {
      clearInterval(timerRef.current);
      clearTimeout(timeoutRef.current);
    };
  }, []);

  /* ── timer helpers ───────────────────────────────────────────────── */
  const clearTimers = useCallback(() => {
    clearInterval(timerRef.current);
    clearTimeout(timeoutRef.current);
    timerRef.current = undefined;
    timeoutRef.current = undefined;
  }, []);

  /* ──────────────────────────────────────────────────────────────── */
  /*  START ROUND                                                      */
  /* ──────────────────────────────────────────────────────────────── */
  const startRound = useCallback(() => {
    clearTimers();
    endedRef.current = false;

    const data = generateRoundData();
    setSceneA(data.sceneA);
    setSceneB(data.sceneB);
    setDiffs(data.diffs);
    setFound(Array(DIFF_COUNT).fill(null));
    foundRef.current = Array(DIFF_COUNT).fill(null);
    setRoundScore({ p1: 0, p2: 0 });
    roundScoreRef.current = { p1: 0, p2: 0 };
    setTimeLeft(ROUND_TIME);
    setFeedback(null);
    roundStartRef.current = Date.now();
    setStatus("playing");

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          timerRef.current = undefined;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [clearTimers]);

  /* ──────────────────────────────────────────────────────────────── */
  /*  END ROUND                                                        */
  /* ──────────────────────────────────────────────────────────────── */
  const finishRound = useCallback(() => {
    if (endedRef.current) return;
    endedRef.current = true;
    clearTimers();

    const rs = roundScoreRef.current;
    setTotalScore((prev) => {
      const next = { p1: prev.p1 + rs.p1, p2: prev.p2 + rs.p2 };
      totalScoreRef.current = next;
      return next;
    });
    setStatus("roundResult");

    timeoutRef.current = setTimeout(() => {
      setRound((prev) => {
        if (prev >= TOTAL_ROUNDS) {
          setStatus("gameOver");
          return prev;
        }
        return prev + 1;
      });
    }, 2500);
  }, [clearTimers]);

  /* ── auto-start next round when round number increments ─────────── */
  useEffect(() => {
    if (round > prevRoundRef.current && status === "roundResult") {
      prevRoundRef.current = round;
      startRound();
    }
  }, [round, status, startRound]);

  /* ── end round when timer hits 0 ─────────────────────────────────── */
  useEffect(() => {
    if (status === "playing" && timeLeft === 0) {
      finishRound();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, timeLeft]);

  /* ── fire onScore when game ends ────────────────────────────────── */
  useEffect(() => {
    if (status === "gameOver" && onScore && !scoredRef.current) {
      scoredRef.current = true;
      const s = totalScoreRef.current;
      if (s.p1 > s.p2) onScore("Jogador 1", s.p1);
      else if (s.p2 > s.p1) onScore("Jogador 2", s.p2);
      else {
        onScore("Jogador 1", s.p1);
        onScore("Jogador 2", s.p2);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  /* ──────────────────────────────────────────────────────────────── */
  /*  SCENE CLICK HANDLER                                              */
  /* ──────────────────────────────────────────────────────────────── */
  const handleClick = useCallback(
    (
      player: 1 | 2,
      scene: "A" | "B",
      e: React.MouseEvent<HTMLDivElement>
    ) => {
      if (status !== "playing" || endedRef.current) return;

      const rect = e.currentTarget.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;

      // Use ref for latest found array to handle near-simultaneous clicks
      const currentFound = [...foundRef.current];
      let hit = false;

      for (let i = 0; i < diffs.length; i++) {
        if (currentFound[i] !== null) continue;
        const t =
          scene === "A" ? diffs[i].targetA : diffs[i].targetB;
        if (Math.hypot(cx - t.x, cy - t.y) <= CLICK_RADIUS) {
          currentFound[i] = player;
          hit = true;

          // Speed bonus
          const elapsed = (Date.now() - roundStartRef.current) / 1000;
          const bonus = elapsed <= 10 ? 5 : elapsed <= 20 ? 3 : 0;
          const pts = 10 + bonus;

          const key: "p1" | "p2" = player === 1 ? "p1" : "p2";
          roundScoreRef.current = {
            ...roundScoreRef.current,
            [key]: roundScoreRef.current[key] + pts,
          };
          setRoundScore({ ...roundScoreRef.current });
          break;
        }
      }

      if (!hit) {
        const key: "p1" | "p2" = player === 1 ? "p1" : "p2";
        roundScoreRef.current = {
          ...roundScoreRef.current,
          [key]: Math.max(0, roundScoreRef.current[key] - 2),
        };
        setRoundScore({ ...roundScoreRef.current });
      }

      foundRef.current = currentFound;
      setFound([...currentFound]);
      setFeedback({ player, hit });
      setTimeout(() => setFeedback(null), 700);

      // All 5 found — end round after brief visual pause
      if (currentFound.every((f) => f !== null)) {
        clearInterval(timerRef.current);
        timerRef.current = undefined;
        setTimeout(() => finishRound(), 600);
      }
    },
    [status, diffs, finishRound]
  );

  /* ──────────────────────────────────────────────────────────────── */
  /*  RESET                                                            */
  /* ──────────────────────────────────────────────────────────────── */
  const resetAll = useCallback(() => {
    clearTimers();
    endedRef.current = false;
    prevRoundRef.current = 1;
    scoredRef.current = false;
    setStatus("idle");
    setRound(1);
    setTimeLeft(ROUND_TIME);
    setSceneA([]);
    setSceneB([]);
    setDiffs([]);
    setFound(Array(DIFF_COUNT).fill(null));
    foundRef.current = Array(DIFF_COUNT).fill(null);
    setTotalScore({ p1: 0, p2: 0 });
    setRoundScore({ p1: 0, p2: 0 });
    roundScoreRef.current = { p1: 0, p2: 0 };
    totalScoreRef.current = { p1: 0, p2: 0 };
    setFeedback(null);
  }, [clearTimers]);

  /* ── derived values ──────────────────────────────────────────────── */
  const foundCount = found.filter((f) => f !== null).length;
  const p1Total = totalScore.p1 + roundScore.p1;
  const p2Total = totalScore.p2 + roundScore.p2;

  // Suppress unused-variable lint for liveCode (used by parent)
  void liveCode;

  /* ══════════════════════════════════════════════════════════════════ */
  /*  RENDER                                                            */
  /* ══════════════════════════════════════════════════════════════════ */

  return (
    <div className="w-full max-w-3xl mx-auto bg-slate-950 rounded-2xl p-6 text-white select-none">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="text-center mb-4">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-pink-400 bg-clip-text text-transparent">
          Encontre as Diferenças
        </h2>

        {(status === "playing" || status === "roundResult") && (
          <div className="flex items-center justify-center gap-3 mt-2 flex-wrap">
            <Badge
              variant="outline"
              className="border-slate-600 text-slate-300"
            >
              Round {round}/{TOTAL_ROUNDS}
            </Badge>
            <Badge
              variant="outline"
              className={cn(
                "border",
                timeLeft <= 10
                  ? "border-red-500 text-red-400 animate-pulse"
                  : "border-slate-600 text-slate-300"
              )}
            >
              <Timer className="w-3 h-3 mr-1" />
              {timeLeft}s
            </Badge>
            <Badge
              variant="outline"
              className="border-slate-600 text-slate-300"
            >
              <Search className="w-3 h-3 mr-1" />
              {foundCount}/{DIFF_COUNT}
            </Badge>
          </div>
        )}
      </div>

      {/* ── Feedback Toast ─────────────────────────────────────── */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            key="feedback"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={cn(
              "text-center text-sm font-bold py-1 px-3 rounded-lg mb-3",
              feedback.hit
                ? feedback.player === 1
                  ? "bg-cyan-500/20 text-cyan-300"
                  : "bg-pink-500/20 text-pink-300"
                : "bg-red-500/20 text-red-400"
            )}
          >
            {feedback.hit ? "Encontrou!" : "Errou!"} — Jogador{" "}
            {feedback.player === 1 ? "1" : "2"}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Idle Screen ────────────────────────────────────────── */}
      {status === "idle" && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-10"
        >
          <Eye className="w-16 h-16 mx-auto mb-4 text-cyan-400" />
          <p className="text-lg text-slate-300 mb-1">
            Encontre 5 diferenças!
          </p>
          <p className="text-sm text-slate-500 mb-6">
            Jogador 1 clica na cena esquerda • Jogador 2 clica na cena
            direita
          </p>
          <Button
            onClick={startRound}
            className="bg-gradient-to-r from-cyan-500 to-pink-500 hover:from-cyan-600 hover:to-pink-600 text-white font-bold px-8"
          >
            Iniciar Jogo
          </Button>
        </motion.div>
      )}

      {/* ── Game Scenes ────────────────────────────────────────── */}
      {(status === "playing" || status === "roundResult") && (
        <div className="flex gap-4 justify-center mb-4">
          {/* Scene A — Player 1 */}
          <div className="text-center">
            <Badge className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 mb-2">
              Jogador 1
            </Badge>
            <div
              className={cn(
                "relative bg-slate-900 rounded-xl border-2 border-cyan-500/30 overflow-hidden",
                status === "playing" && "cursor-pointer"
              )}
              style={{ width: SCENE_W, height: SCENE_H }}
              onClick={(e) => handleClick(1, "A", e)}
            >
              {/* shapes */}
              {sceneA.map((s) => (
                <ShapeEl key={s.id} shape={s} />
              ))}

              {/* found-difference markers */}
              {diffs.map((d, i) =>
                found[i] !== null ? (
                  <motion.div
                    key={`fa-${i}`}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute w-8 h-8 -ml-4 -mt-4 rounded-full border-2 border-red-500 bg-red-500/30 flex items-center justify-center text-red-400 text-xs font-bold pointer-events-none"
                    style={{ left: d.targetA.x, top: d.targetA.y }}
                  >
                    {i + 1}
                  </motion.div>
                ) : null
              )}
            </div>
          </div>

          {/* Scene B — Player 2 */}
          <div className="text-center">
            <Badge className="bg-pink-500/20 text-pink-300 border border-pink-500/30 mb-2">
              Jogador 2
            </Badge>
            <div
              className={cn(
                "relative bg-slate-900 rounded-xl border-2 border-pink-500/30 overflow-hidden",
                status === "playing" && "cursor-pointer"
              )}
              style={{ width: SCENE_W, height: SCENE_H }}
              onClick={(e) => handleClick(2, "B", e)}
            >
              {sceneB.map((s) => (
                <ShapeEl key={s.id} shape={s} />
              ))}

              {diffs.map((d, i) =>
                found[i] !== null ? (
                  <motion.div
                    key={`fb-${i}`}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute w-8 h-8 -ml-4 -mt-4 rounded-full border-2 border-red-500 bg-red-500/30 flex items-center justify-center text-red-400 text-xs font-bold pointer-events-none"
                    style={{ left: d.targetB.x, top: d.targetB.y }}
                  >
                    {i + 1}
                  </motion.div>
                ) : null
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Scoreboard ─────────────────────────────────────────── */}
      {(status === "playing" || status === "roundResult") && (
        <div className="bg-gradient-to-r from-cyan-900/30 to-pink-900/30 border border-cyan-500/20 rounded-xl p-4 mb-4">
          <div className="flex justify-between items-center">
            {/* P1 column */}
            <div className="text-center flex-1">
              <p className="text-xs text-cyan-400 uppercase tracking-wider">
                Jogador 1
              </p>
              <p className="text-2xl font-bold text-cyan-300">{p1Total}</p>
              <p className="text-xs text-slate-500">
                +{roundScore.p1} esta rodada
              </p>
            </div>

            {/* centre – found dots */}
            <div className="text-center px-4">
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">
                Encontradas
              </p>
              <div className="flex gap-1.5 justify-center">
                {found.map((f, i) => (
                  <div
                    key={i}
                    className={cn(
                      "w-3.5 h-3.5 rounded-full border transition-colors",
                      f === 1
                        ? "bg-cyan-400 border-cyan-400"
                        : f === 2
                          ? "bg-pink-400 border-pink-400"
                          : "bg-slate-800 border-slate-600"
                    )}
                  />
                ))}
              </div>
            </div>

            {/* P2 column */}
            <div className="text-center flex-1">
              <p className="text-xs text-pink-400 uppercase tracking-wider">
                Jogador 2
              </p>
              <p className="text-2xl font-bold text-pink-300">{p2Total}</p>
              <p className="text-xs text-slate-500">
                +{roundScore.p2} esta rodada
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Round Result Banner ────────────────────────────────── */}
      <AnimatePresence>
        {status === "roundResult" && (
          <motion.div
            key="round-banner"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center py-2 mb-2"
          >
            {timeLeft === 0 && (
              <p className="text-lg text-red-400 font-semibold animate-pulse">
                Tempo!
              </p>
            )}
            <p className="text-yellow-300 font-semibold">
              Round {round} encerrado — Próximo...
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Game Over ─────────────────────────────────────────── */}
      <AnimatePresence>
        {status === "gameOver" && (
          <motion.div
            key="gameover"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-8"
          >
            <p className="text-3xl font-bold mb-2">
              {totalScore.p1 > totalScore.p2 ? (
                <span className="text-cyan-400">
                  Jogador 1 Venceu!
                </span>
              ) : totalScore.p2 > totalScore.p1 ? (
                <span className="text-pink-400">
                  Jogador 2 Venceu!
                </span>
              ) : (
                <span className="text-yellow-400">Empate!</span>
              )}
            </p>
            <p className="text-slate-400 text-xl mb-6">
              {totalScore.p1} — {totalScore.p2}
            </p>
            <Button
              onClick={resetAll}
              variant="outline"
              className="border-slate-600 text-slate-300 hover:bg-slate-800"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reiniciar Tudo
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Small Reset during play ───────────────────────────── */}
      {status === "playing" && (
        <div className="text-center mt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={resetAll}
            className="text-slate-500 hover:text-slate-300"
          >
            <RotateCcw className="w-3 h-3 mr-1" />
            Reiniciar Tudo
          </Button>
        </div>
      )}
    </div>
  );
}
