"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { RotateCcw, Timer, Zap } from "lucide-react";

interface Props {
  onScore?: (name: string, score: number) => void;
  liveCode?: string;
}

type GameState = "waiting" | "countdown" | "ready" | "result" | "gameOver";

type RoundResult = {
  p1Time: number | null;
  p2Time: number | null;
  p1FalseStart: boolean;
  p2FalseStart: boolean;
  winner: 0 | 1 | 2;
};

const ROUND_OPTIONS = [3, 5, 7] as const;

export default function ReactionRace({ onScore, liveCode }: Props) {
  const [gameState, setGameState] = useState<GameState>("waiting");
  const [totalRounds, setTotalRounds] = useState<3 | 5 | 7>(5);
  const [currentRound, setCurrentRound] = useState(1);
  const [roundResults, setRoundResults] = useState<RoundResult[]>([]);
  const [p1Time, setP1Time] = useState<number | null>(null);
  const [p2Time, setP2Time] = useState<number | null>(null);
  const [p1FalseStart, setP1FalseStart] = useState(false);
  const [p2FalseStart, setP2FalseStart] = useState(false);
  const [roundWinner, setRoundWinner] = useState<0 | 1 | 2>(0);
  const [goTimestamp, setGoTimestamp] = useState(0);
  const [p1Pressed, setP1Pressed] = useState(false);
  const [p2Pressed, setP2Pressed] = useState(false);
  const countdownRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoAdvanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gameActiveRef = useRef(false);

  const clearTimers = useCallback(() => {
    if (countdownRef.current) {
      clearTimeout(countdownRef.current);
      countdownRef.current = null;
    }
    if (autoAdvanceRef.current) {
      clearTimeout(autoAdvanceRef.current);
      autoAdvanceRef.current = null;
    }
  }, []);

  const resetGame = useCallback(() => {
    clearTimers();
    gameActiveRef.current = false;
    setGameState("waiting");
    setCurrentRound(1);
    setRoundResults([]);
    setP1Time(null);
    setP2Time(null);
    setP1FalseStart(false);
    setP2FalseStart(false);
    setRoundWinner(0);
    setP1Pressed(false);
    setP2Pressed(false);
    setGoTimestamp(0);
  }, [clearTimers]);

  const startRound = useCallback(() => {
    clearTimers();
    gameActiveRef.current = false;
    setP1Time(null);
    setP2Time(null);
    setP1FalseStart(false);
    setP2FalseStart(false);
    setRoundWinner(0);
    setP1Pressed(false);
    setP2Pressed(false);
    setGoTimestamp(0);
    setGameState("countdown");

    const delay = 2000 + Math.random() * 3000;
    countdownRef.current = setTimeout(() => {
      const now = performance.now();
      setGoTimestamp(now);
      gameActiveRef.current = true;
      setGameState("ready");
    }, delay);
  }, [clearTimers]);

  const handleReaction = useCallback(
    (player: 1 | 2) => {
      if (gameState === "waiting" || gameState === "result" || gameState === "gameOver") {
        return;
      }

      if (player === 1 && p1Pressed) return;
      if (player === 2 && p2Pressed) return;

      if (gameState === "countdown") {
        if (player === 1) {
          setP1FalseStart(true);
          setP1Pressed(true);
        } else {
          setP2FalseStart(true);
          setP2Pressed(true);
        }

        if (
          (player === 1 && p2Pressed && p2FalseStart) ||
          (player === 2 && p1Pressed && p1FalseStart)
        ) {
          gameActiveRef.current = false;
          clearTimers();
          setRoundWinner(0);
          autoAdvanceRef.current = setTimeout(() => {
            setGameState("result");
          }, 1500);
        } else if (
          (player === 1 && p2Pressed && !p2FalseStart) ||
          (player === 2 && p1Pressed && !p1FalseStart)
        ) {
          const nonFalsePlayer = player === 1 ? 2 : 1;
          gameActiveRef.current = false;
          clearTimers();
          setRoundWinner(nonFalsePlayer as 0 | 1 | 2);
          autoAdvanceRef.current = setTimeout(() => {
            setGameState("result");
          }, 1500);
        } else {
          const otherFalseStart = player === 1 ? p2FalseStart : p1FalseStart;
          const otherPressed = player === 1 ? p2Pressed : p1Pressed;
          if (!otherPressed && !otherFalseStart) {
            autoAdvanceRef.current = setTimeout(() => {
              gameActiveRef.current = false;
              clearTimers();
              const winner = player === 1 ? 2 : 1;
              setRoundWinner(winner as 0 | 1 | 2);
              setGameState("result");
            }, 2000);
          }
        }
        return;
      }

      if (gameState === "ready") {
        const reactionTime = Math.round(performance.now() - goTimestamp);
        if (player === 1) {
          setP1Time(reactionTime);
          setP1Pressed(true);
        } else {
          setP2Time(reactionTime);
          setP2Pressed(true);
        }

        const otherPressed = player === 1 ? p2Pressed : p1Pressed;
        const otherFalseStart = player === 1 ? p2FalseStart : p1FalseStart;

        if (otherFalseStart) {
          gameActiveRef.current = false;
          clearTimers();
          setRoundWinner(player);
          autoAdvanceRef.current = setTimeout(() => {
            setGameState("result");
          }, 1500);
          return;
        }

        if (otherPressed) {
          const otherTime = player === 1 ? p2Time : p1Time;
          if (otherTime !== null) {
            gameActiveRef.current = false;
            clearTimers();
            if (reactionTime < otherTime) {
              setRoundWinner(player);
            } else if (otherTime < reactionTime) {
              setRoundWinner(player === 1 ? 2 : 1);
            } else {
              setRoundWinner(0);
            }
            autoAdvanceRef.current = setTimeout(() => {
              setGameState("result");
            }, 1500);
          }
        } else {
          autoAdvanceRef.current = setTimeout(() => {
            gameActiveRef.current = false;
            clearTimers();
            setRoundWinner(player);
            setGameState("result");
          }, 5000);
        }
      }
    },
    [gameState, p1Pressed, p2Pressed, p1FalseStart, p2FalseStart, p1Time, p2Time, goTimestamp, clearTimers]
  );

  const finishRound = useCallback(() => {
    const result: RoundResult = {
      p1Time,
      p2Time,
      p1FalseStart,
      p2FalseStart,
      winner: roundWinner,
    };
    const newResults = [...roundResults, result];
    setRoundResults(newResults);

    if (currentRound >= totalRounds) {
      setGameState("gameOver");

      const p1Wins = newResults.filter((r) => r.winner === 1).length;
      const p2Wins = newResults.filter((r) => r.winner === 2).length;

      const p1ValidTimes = newResults
        .filter((r) => !r.p1FalseStart && r.p1Time !== null)
        .map((r) => r.p1Time!);
      const p2ValidTimes = newResults
        .filter((r) => !r.p2FalseStart && r.p2Time !== null)
        .map((r) => r.p2Time!);

      const p1Avg = p1ValidTimes.length > 0 ? p1ValidTimes.reduce((a, b) => a + b, 0) / p1ValidTimes.length : 9999;
      const p2Avg = p2ValidTimes.length > 0 ? p2ValidTimes.reduce((a, b) => a + b, 0) / p2ValidTimes.length : 9999;

      const p1Score = Math.max(0, Math.round(1000 - p1Avg));
      const p2Score = Math.max(0, Math.round(1000 - p2Avg));

      if (p1Wins > p2Wins) {
        onScore?.("Jogador 1", p1Score);
      } else if (p2Wins > p1Wins) {
        onScore?.("Jogador 2", p2Score);
      } else {
        if (p1Avg < p2Avg) {
          onScore?.("Jogador 1", p1Score);
        } else if (p2Avg < p1Avg) {
          onScore?.("Jogador 2", p2Score);
        } else {
          onScore?.("Jogador 1", p1Score);
        }
      }
    } else {
      setCurrentRound((prev) => prev + 1);
      setGameState("waiting");
      setP1Time(null);
      setP2Time(null);
      setP1FalseStart(false);
      setP2FalseStart(false);
      setRoundWinner(0);
      setP1Pressed(false);
      setP2Pressed(false);
      setGoTimestamp(0);
    }
  }, [p1Time, p2Time, p1FalseStart, p2FalseStart, roundWinner, roundResults, currentRound, totalRounds, onScore]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.code === "Space") {
        e.preventDefault();
        if (gameState === "waiting") {
          startRound();
        } else {
          handleReaction(1);
        }
      }
      if (e.code === "Enter") {
        e.preventDefault();
        if (gameState === "waiting") {
          startRound();
        } else {
          handleReaction(2);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [gameState, handleReaction, startRound]);

  useEffect(() => {
    return () => {
      clearTimers();
    };
  }, [clearTimers]);

  const p1Wins = roundResults.filter((r) => r.winner === 1).length;
  const p2Wins = roundResults.filter((r) => r.winner === 2).length;

  const p1ValidTimes = roundResults
    .filter((r) => !r.p1FalseStart && r.p1Time !== null)
    .map((r) => r.p1Time!);
  const p2ValidTimes = roundResults
    .filter((r) => !r.p2FalseStart && r.p2Time !== null)
    .map((r) => r.p2Time!);

  const p1Avg =
    p1ValidTimes.length > 0
      ? Math.round(p1ValidTimes.reduce((a, b) => a + b, 0) / p1ValidTimes.length)
      : null;
  const p2Avg =
    p2ValidTimes.length > 0
      ? Math.round(p2ValidTimes.reduce((a, b) => a + b, 0) / p2ValidTimes.length)
      : null;

  const overallWinner = (() => {
    if (roundResults.length === 0) return 0;
    if (p1Wins > p2Wins) return 1;
    if (p2Wins > p1Wins) return 2;
    if (p1Avg !== null && p2Avg !== null) {
      if (p1Avg < p2Avg) return 1;
      if (p2Avg < p1Avg) return 2;
    }
    return 0;
  })();

  const centerBg =
    gameState === "countdown"
      ? "bg-red-500/10"
      : gameState === "ready"
      ? "bg-emerald-500/20"
      : "bg-slate-800";

  const roundDots = Array.from({ length: totalRounds }, (_, i) => {
    const roundNum = i + 1;
    const isCompleted =
      roundNum < currentRound ||
      (roundNum === currentRound && (gameState === "result" || gameState === "gameOver"));
    const isCurrent =
      roundNum === currentRound && gameState !== "result" && gameState !== "gameOver";
    const result = roundResults[i];

    let dotColor = "bg-slate-600";
    if (isCompleted && result) {
      if (result.winner === 1) dotColor = "bg-cyan-400";
      else if (result.winner === 2) dotColor = "bg-pink-400";
      else dotColor = "bg-yellow-400";
    }
    if (isCurrent) dotColor = "bg-white animate-pulse";

    return (
      <div
        key={i}
        className={cn("h-3 w-3 rounded-full transition-colors duration-300", dotColor)}
      />
    );
  });

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <div className="rounded-xl bg-gradient-to-r from-cyan-900/30 to-pink-900/30 border border-cyan-500/20 p-4">
        <div className="flex items-center justify-between">
          <div className="flex flex-col items-start gap-1">
            <span className="text-sm font-medium text-cyan-400">Jogador 1</span>
            <div className="flex items-center gap-2">
              <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30 text-xs">
                {p1Wins}V
              </Badge>
              {p1Avg !== null && (
                <span className="text-xs text-slate-400">média: {p1Avg}ms</span>
              )}
            </div>
          </div>

          <div className="flex flex-col items-center gap-1">
            <div className="flex items-center gap-1.5">
              <Zap className="h-4 w-4 text-yellow-400" />
              <span className="text-sm font-bold tracking-wider text-white">
                CORRIDA DE REAÇÃO
              </span>
              <Zap className="h-4 w-4 text-yellow-400" />
            </div>
            <span className="text-xs text-slate-500">
              Round {currentRound}/{totalRounds}
            </span>
          </div>

          <div className="flex flex-col items-end gap-1">
            <span className="text-sm font-medium text-pink-400">Jogador 2</span>
            <div className="flex items-center gap-2">
              {p2Avg !== null && (
                <span className="text-xs text-slate-400">média: {p2Avg}ms</span>
              )}
              <Badge className="bg-pink-500/20 text-pink-300 border-pink-500/30 text-xs">
                {p2Wins}V
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center gap-2">
        {roundDots}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={`${gameState}-${currentRound}`}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className={cn(
            "relative flex min-h-[280px] flex-col items-center justify-center rounded-2xl border transition-colors duration-300 overflow-hidden",
            centerBg,
            gameState === "countdown"
              ? "border-red-500/30"
              : gameState === "ready"
              ? "border-emerald-500/30"
              : "border-slate-700"
          )}
        >
          {gameState === "waiting" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center gap-4 px-6 text-center"
            >
              <Timer className="h-16 w-16 text-slate-500" />
              <div className="space-y-2">
                <p className="text-2xl font-bold text-white">Pronto?</p>
                <p className="text-sm text-slate-400">
                  Pressione{" "}
                  <kbd className="rounded bg-slate-700 px-2 py-0.5 text-xs font-mono text-cyan-300">Space</kbd>{" "}
                  ou{" "}
                  <kbd className="rounded bg-slate-700 px-2 py-0.5 text-xs font-mono text-pink-300">Enter</kbd>{" "}
                  para começar
                </p>
                <p className="text-xs text-slate-500">
                  Jogador 1: Space · Jogador 2: Enter
                </p>
              </div>
              <Button
                onClick={startRound}
                className="mt-2 bg-gradient-to-r from-cyan-500 to-pink-500 text-white hover:from-cyan-600 hover:to-pink-600"
              >
                <Zap className="mr-2 h-4 w-4" />
                Iniciar Round {currentRound}
              </Button>
            </motion.div>
          )}

          {gameState === "countdown" && (
            <>
              <motion.div
                animate={{
                  scale: [1, 1.08, 1],
                  opacity: [0.7, 1, 0.7],
                }}
                transition={{
                  duration: 1.2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="relative z-10"
              >
                <span className="text-6xl font-black tracking-wider text-red-400 drop-shadow-[0_0_30px_rgba(239,68,68,0.5)]">
                  Preparar...
                </span>
              </motion.div>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="mt-4 text-sm text-red-300/70"
              >
                Não clique ainda!
              </motion.p>
              {(p1FalseStart || p2FalseStart) && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute bottom-6 flex gap-4"
                >
                  {p1FalseStart && (
                    <motion.div
                      animate={{ x: [0, -8, 8, -6, 6, -3, 3, 0] }}
                      transition={{ duration: 0.5 }}
                      className="flex items-center gap-2 rounded-lg bg-red-500/20 px-3 py-2 border border-red-500/30"
                    >
                      <span className="text-xl font-bold text-red-400">✕</span>
                      <span className="text-sm font-semibold text-red-300">
                        Falsa Partida!
                      </span>
                    </motion.div>
                  )}
                  {p2FalseStart && (
                    <motion.div
                      animate={{ x: [0, 8, -8, 6, -6, 3, -3, 0] }}
                      transition={{ duration: 0.5 }}
                      className="flex items-center gap-2 rounded-lg bg-red-500/20 px-3 py-2 border border-red-500/30"
                    >
                      <span className="text-xl font-bold text-red-400">✕</span>
                      <span className="text-sm font-semibold text-red-300">
                        Falsa Partida!
                      </span>
                    </motion.div>
                  )}
                </motion.div>
              )}
            </>
          )}

          {gameState === "ready" && (
            <>
              <motion.div
                initial={{ scale: 0.3, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{
                  type: "spring",
                  stiffness: 300,
                  damping: 15,
                }}
                className="relative"
              >
                <motion.span
                  animate={{
                    textShadow: [
                      "0 0 20px rgba(16,185,129,0.5)",
                      "0 0 60px rgba(16,185,129,0.8), 0 0 100px rgba(16,185,129,0.3)",
                      "0 0 20px rgba(16,185,129,0.5)",
                    ],
                  }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                  className="text-7xl font-black tracking-wider text-emerald-400"
                >
                  JÁ!
                </motion.span>
              </motion.div>
              <motion.div
                initial={{ scale: 0, opacity: 0.6 }}
                animate={{ scale: 4, opacity: 0 }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="pointer-events-none absolute h-20 w-20 rounded-full bg-emerald-400/30"
              />
              <motion.div
                initial={{ scale: 0, opacity: 0.4 }}
                animate={{ scale: 6, opacity: 0 }}
                transition={{ duration: 1.2, ease: "easeOut", delay: 0.1 }}
                className="pointer-events-none absolute h-16 w-16 rounded-full bg-emerald-300/20"
              />
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 0.7, 1] }}
                transition={{ duration: 0.6 }}
                className="mt-6 text-sm text-emerald-300/80"
              >
                AGORA! Toque o mais rápido possível!
              </motion.p>
              {p1Pressed && p1Time !== null && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute bottom-6 left-6 rounded-lg bg-cyan-500/20 px-4 py-2 border border-cyan-500/30"
                >
                  <span className="text-sm text-cyan-400">
                    P1: <span className="text-lg font-bold text-cyan-300">{p1Time}ms</span>
                  </span>
                </motion.div>
              )}
              {p2Pressed && p2Time !== null && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute bottom-6 right-6 rounded-lg bg-pink-500/20 px-4 py-2 border border-pink-500/30"
                >
                  <span className="text-sm text-pink-400">
                    P2: <span className="text-lg font-bold text-pink-300">{p2Time}ms</span>
                  </span>
                </motion.div>
              )}
            </>
          )}

          {gameState === "result" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex w-full flex-col items-center gap-4 px-6 py-4"
            >
              <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="text-center"
              >
                {roundWinner === 0 ? (
                  <span className="text-3xl font-bold text-yellow-400">Empate!</span>
                ) : (
                  <span
                    className={cn(
                      "text-3xl font-bold",
                      roundWinner === 1 ? "text-cyan-400" : "text-pink-400"
                    )}
                  >
                    Jogador {roundWinner} venceu!
                  </span>
                )}
              </motion.div>

              <div className="flex w-full items-center justify-center gap-6">
                <motion.div
                  initial={{ x: -30, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.2, type: "spring" }}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-xl border p-4 min-w-[120px]",
                    roundWinner === 1
                      ? "border-cyan-500/40 bg-cyan-500/10"
                      : "border-slate-700 bg-slate-800/50"
                  )}
                >
                  <span className="text-xs font-semibold text-cyan-400">Jogador 1</span>
                  {p1FalseStart ? (
                    <motion.span
                      animate={{ x: [0, -4, 4, -2, 2, 0] }}
                      transition={{ duration: 0.4 }}
                      className="text-lg font-bold text-red-400"
                    >
                      Falsa Partida!
                    </motion.span>
                  ) : p1Time !== null ? (
                    <span className="text-2xl font-bold text-cyan-300">
                      {p1Time}
                      <span className="ml-1 text-sm font-normal text-slate-400">ms</span>
                    </span>
                  ) : (
                    <span className="text-lg text-slate-500">---</span>
                  )}
                  {roundWinner === 1 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", delay: 0.4 }}
                      className="text-xs font-bold text-cyan-300"
                    >
                      ✓ Vencedor
                    </motion.span>
                  )}
                </motion.div>

                <motion.span
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-xl font-bold text-slate-500"
                >
                  VS
                </motion.span>

                <motion.div
                  initial={{ x: 30, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.2, type: "spring" }}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-xl border p-4 min-w-[120px]",
                    roundWinner === 2
                      ? "border-pink-500/40 bg-pink-500/10"
                      : "border-slate-700 bg-slate-800/50"
                  )}
                >
                  <span className="text-xs font-semibold text-pink-400">Jogador 2</span>
                  {p2FalseStart ? (
                    <motion.span
                      animate={{ x: [0, 4, -4, 2, -2, 0] }}
                      transition={{ duration: 0.4 }}
                      className="text-lg font-bold text-red-400"
                    >
                      Falsa Partida!
                    </motion.span>
                  ) : p2Time !== null ? (
                    <span className="text-2xl font-bold text-pink-300">
                      {p2Time}
                      <span className="ml-1 text-sm font-normal text-slate-400">ms</span>
                    </span>
                  ) : (
                    <span className="text-lg text-slate-500">---</span>
                  )}
                  {roundWinner === 2 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", delay: 0.4 }}
                      className="text-xs font-bold text-pink-300"
                    >
                      ✓ Vencedor
                    </motion.span>
                  )}
                </motion.div>
              </div>

              {currentRound < totalRounds && (
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  <Button
                    onClick={finishRound}
                    className="bg-gradient-to-r from-cyan-500 to-pink-500 text-white hover:from-cyan-600 hover:to-pink-600"
                  >
                    <Zap className="mr-2 h-4 w-4" />
                    Próximo Round
                  </Button>
                </motion.div>
              )}
              {currentRound >= totalRounds && (
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  <Button
                    onClick={finishRound}
                    className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white hover:from-yellow-600 hover:to-orange-600"
                  >
                    <Timer className="mr-2 h-4 w-4" />
                    Ver Resultado Final
                  </Button>
                </motion.div>
              )}
            </motion.div>
          )}

          {gameState === "gameOver" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex w-full flex-col items-center gap-5 px-6 py-4"
            >
              {overallWinner !== 0 ? (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 12 }}
                  className="flex flex-col items-center gap-2"
                >
                  <motion.span
                    animate={{
                      scale: [1, 1.1, 1],
                      rotate: [0, 3, -3, 0],
                    }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="text-5xl"
                  >
                    🏆
                  </motion.span>
                  <span
                    className={cn(
                      "text-3xl font-black",
                      overallWinner === 1 ? "text-cyan-400" : "text-pink-400"
                    )}
                  >
                    Vencedor
                  </span>
                  <span
                    className={cn(
                      "text-xl font-bold",
                      overallWinner === 1 ? "text-cyan-300" : "text-pink-300"
                    )}
                  >
                    Jogador {overallWinner}
                  </span>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring" }}
                  className="flex flex-col items-center gap-2"
                >
                  <span className="text-5xl">🤝</span>
                  <span className="text-3xl font-black text-yellow-400">Empate!</span>
                </motion.div>
              )}

              <div className="flex w-full gap-4">
                <motion.div
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.3, type: "spring" }}
                  className={cn(
                    "flex-1 rounded-xl border p-3",
                    overallWinner === 1
                      ? "border-cyan-500/40 bg-cyan-500/10"
                      : "border-slate-700 bg-slate-800/50"
                  )}
                >
                  <span className="text-xs font-semibold text-cyan-400">Jogador 1</span>
                  <div className="mt-2 space-y-1">
                    {roundResults.map((r, i) => (
                      <div key={i} className="flex items-center gap-1 text-xs">
                        <span className="text-slate-500 w-8">R{i + 1}</span>
                        {r.p1FalseStart ? (
                          <span className="text-red-400 font-mono">FALSA</span>
                        ) : r.p1Time !== null ? (
                          <span
                            className={cn(
                              "font-mono",
                              r.winner === 1 ? "text-cyan-300 font-bold" : "text-slate-300"
                            )}
                          >
                            {r.p1Time}ms
                          </span>
                        ) : (
                          <span className="text-slate-600">---</span>
                        )}
                        {r.winner === 1 && <span className="text-cyan-400">✓</span>}
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 border-t border-slate-700 pt-2">
                    <span className="text-xs text-slate-400">
                      Média: {p1Avg !== null ? `${p1Avg}ms` : "---"}
                    </span>
                    <span className="ml-2 text-xs text-cyan-400 font-bold">{p1Wins}V</span>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ x: 20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.3, type: "spring" }}
                  className={cn(
                    "flex-1 rounded-xl border p-3",
                    overallWinner === 2
                      ? "border-pink-500/40 bg-pink-500/10"
                      : "border-slate-700 bg-slate-800/50"
                  )}
                >
                  <span className="text-xs font-semibold text-pink-400">Jogador 2</span>
                  <div className="mt-2 space-y-1">
                    {roundResults.map((r, i) => (
                      <div key={i} className="flex items-center gap-1 text-xs">
                        <span className="text-slate-500 w-8">R{i + 1}</span>
                        {r.p2FalseStart ? (
                          <span className="text-red-400 font-mono">FALSA</span>
                        ) : r.p2Time !== null ? (
                          <span
                            className={cn(
                              "font-mono",
                              r.winner === 2 ? "text-pink-300 font-bold" : "text-slate-300"
                            )}
                          >
                            {r.p2Time}ms
                          </span>
                        ) : (
                          <span className="text-slate-600">---</span>
                        )}
                        {r.winner === 2 && <span className="text-pink-400">✓</span>}
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 border-t border-slate-700 pt-2">
                    <span className="text-xs text-slate-400">
                      Média: {p2Avg !== null ? `${p2Avg}ms` : "---"}
                    </span>
                    <span className="ml-2 text-xs text-pink-400 font-bold">{p2Wins}V</span>
                  </div>
                </motion.div>
              </div>

              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                <Button
                  onClick={resetGame}
                  className="bg-gradient-to-r from-cyan-500 to-pink-500 text-white hover:from-cyan-600 hover:to-pink-600"
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Reiniciar Tudo
                </Button>
              </motion.div>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>

      {(gameState === "waiting" || gameState === "countdown" || gameState === "ready") && (
        <div className="flex gap-3">
          <motion.div whileTap={{ scale: 0.95 }} className="flex-1">
            <button
              onTouchStart={(e) => {
                e.preventDefault();
                if (gameState === "waiting") {
                  startRound();
                } else {
                  handleReaction(1);
                }
              }}
              onMouseDown={() => {
                if (gameState === "waiting") {
                  startRound();
                } else {
                  handleReaction(1);
                }
              }}
              className={cn(
                "flex h-16 w-full items-center justify-center rounded-xl border-2 text-sm font-bold transition-all active:scale-95 md:hidden",
                gameState === "ready"
                  ? "border-emerald-500/50 bg-emerald-500/20 text-emerald-300"
                  : "border-cyan-500/30 bg-cyan-500/10 text-cyan-300"
              )}
            >
              Jogador 1
            </button>
          </motion.div>
          <motion.div whileTap={{ scale: 0.95 }} className="flex-1">
            <button
              onTouchStart={(e) => {
                e.preventDefault();
                if (gameState === "waiting") {
                  startRound();
                } else {
                  handleReaction(2);
                }
              }}
              onMouseDown={() => {
                if (gameState === "waiting") {
                  startRound();
                } else {
                  handleReaction(2);
                }
              }}
              className={cn(
                "flex h-16 w-full items-center justify-center rounded-xl border-2 text-sm font-bold transition-all active:scale-95 md:hidden",
                gameState === "ready"
                  ? "border-emerald-500/50 bg-emerald-500/20 text-emerald-300"
                  : "border-pink-500/30 bg-pink-500/10 text-pink-300"
              )}
            >
              Jogador 2
            </button>
          </motion.div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={resetGame}
          className="text-slate-400 hover:text-white"
        >
          <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
          Reiniciar Tudo
        </Button>

        <div className="flex items-center gap-1">
          <span className="mr-1.5 text-xs text-slate-500">Rounds:</span>
          {ROUND_OPTIONS.map((opt) => (
            <button
              key={opt}
              onClick={() => {
                if (gameState === "waiting" && roundResults.length === 0) {
                  setTotalRounds(opt);
                }
              }}
              disabled={gameState !== "waiting" || roundResults.length > 0}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                totalRounds === opt
                  ? "bg-white/10 text-white"
                  : "text-slate-500 hover:text-slate-300",
                (gameState !== "waiting" || roundResults.length > 0) &&
                  "cursor-not-allowed opacity-50"
              )}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
