import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RotateCcw, Timer, Calculator, Send, Bot, Flame, Zap, Trophy, Check, X, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Props {
  onScore?: (name: string, score: number) => void;
  liveCode?: string;
}

type GameState = "idle" | "countdown" | "playing" | "roundResult" | "gameOver";
type Difficulty = "Fácil" | "Médio" | "Difícil";
type WrongMode = "retry" | "lose";
type GameMode = "player" | "bot";

type MathProblem = {
  expression: string;
  answer: number;
  difficulty: Difficulty;
};

type PlayerStats = {
  correct: number;
  totalTime: number;
  streak: number;
  bestStreak: number;
  fastestTime: number;
};

type RoundResult = {
  winner: 1 | 2 | null;
  winnerName: string | null;
  p1Time: number | null;
  p2Time: number | null;
  timedOut: boolean;
};

type ScorePop = {
  id: number;
  player: 1 | 2;
  points: number;
  streak: number;
};

const TOTAL_ROUNDS = 10;
const COUNTDOWN_SECONDS = 3;

function generateProblem(round: number): MathProblem {
  const roundIndex = round - 1;
  let difficulty: Difficulty;
  let expression: string;
  let answer: number;

  if (roundIndex < 3) {
    difficulty = "Fácil";
    const ops = ["+", "-"];
    const op = ops[Math.floor(Math.random() * ops.length)];
    const a = Math.floor(Math.random() * 20) + 1;
    const b = Math.floor(Math.random() * 20) + 1;
    if (op === "+") {
      expression = `${a} + ${b}`;
      answer = a + b;
    } else {
      const big = Math.max(a, b);
      const small = Math.min(a, b);
      expression = `${big} - ${small}`;
      answer = big - small;
    }
  } else if (roundIndex < 6) {
    difficulty = "Médio";
    if (Math.random() < 0.5) {
      const a = Math.floor(Math.random() * 12) + 1;
      const b = Math.floor(Math.random() * 12) + 1;
      expression = `${a} × ${b}`;
      answer = a * b;
    } else {
      const a = Math.floor(Math.random() * 41) + 10;
      const b = Math.floor(Math.random() * 41) + 10;
      expression = `${a} + ${b}`;
      answer = a + b;
    }
  } else {
    difficulty = "Difícil";
    const twoStepType = Math.floor(Math.random() * 4);
    if (twoStepType === 0) {
      const a = Math.floor(Math.random() * 8) + 2;
      const b = Math.floor(Math.random() * 8) + 2;
      const c = Math.floor(Math.random() * 15) + 1;
      expression = `${a} × ${b} + ${c}`;
      answer = a * b + c;
    } else if (twoStepType === 1) {
      const a = Math.floor(Math.random() * 8) + 2;
      const b = Math.floor(Math.random() * 8) + 2;
      const c = Math.floor(Math.random() * (a * b - 1)) + 1;
      expression = `${a * b} - ${c}`;
      answer = a * b - c;
    } else if (twoStepType === 2) {
      const a = Math.floor(Math.random() * 10) + 2;
      const b = Math.floor(Math.random() * 10) + 2;
      const c = Math.floor(Math.random() * 5) + 1;
      const sum = a + b;
      expression = `(${a} + ${b}) × ${c}`;
      answer = sum * c;
    } else {
      const a = Math.floor(Math.random() * 50) + 20;
      const b = Math.floor(Math.random() * 30) + 10;
      const c = Math.floor(Math.random() * 8) + 2;
      expression = `${a} + ${b} × ${c}`;
      answer = a + b * c;
    }
  }

  return { expression, answer, difficulty };
}

function getDifficultyColor(d: Difficulty): string {
  if (d === "Fácil") return "bg-green-500/20 text-green-400 border-green-500/30";
  if (d === "Médio") return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
  return "bg-red-500/20 text-red-400 border-red-500/30";
}

function getDifficultyGlow(d: Difficulty): string {
  if (d === "Fácil") return "shadow-green-500/20";
  if (d === "Médio") return "shadow-yellow-500/20";
  return "shadow-red-500/20";
}

function ConfettiParticles({ color }: { color: string }) {
  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    x: (Math.random() - 0.5) * 300,
    y: -(Math.random() * 250 + 50),
    rotate: Math.random() * 720 - 360,
    scale: Math.random() * 0.8 + 0.3,
    hue: Math.random() * 60 - 30,
  }));

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-50">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className={cn("absolute w-2 h-2 rounded-sm", color)}
          style={{
            left: "50%",
            top: "50%",
            backgroundColor: color.includes("cyan")
              ? `hsl(${180 + p.hue}, 90%, 60%)`
              : `hsl(${330 + p.hue}, 90%, 65%)`,
          }}
          initial={{ x: 0, y: 0, rotate: 0, opacity: 1 }}
          animate={{
            x: p.x,
            y: p.y,
            rotate: p.rotate,
            opacity: 0,
            scale: p.scale,
          }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />
      ))}
    </div>
  );
}

function ScorePopAnimation({ pop }: { pop: ScorePop }) {
  const isP1 = pop.player === 1;
  return (
    <motion.div
      key={pop.id}
      className={cn(
        "absolute -top-2 left-1/2 pointer-events-none z-30 flex flex-col items-center",
        isP1 ? "text-cyan-300" : "text-pink-300"
      )}
      initial={{ y: 0, opacity: 1, scale: 0.5 }}
      animate={{ y: -40, opacity: 0, scale: 1.2 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
    >
      <motion.span
        className="text-sm font-black whitespace-nowrap flex items-center gap-0.5"
        initial={{ scale: 0.5 }}
        animate={{ scale: [0.5, 1.3, 1] }}
        transition={{ duration: 0.4, type: "spring", stiffness: 400 }}
      >
        <Zap className="w-3 h-3" />
        +{pop.points}
      </motion.span>
      {pop.streak > 1 && (
        <motion.span
          className="text-[10px] font-bold text-yellow-400 whitespace-nowrap flex items-center gap-0.5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <Flame className="w-2.5 h-2.5" />
          x{pop.streak}
        </motion.span>
      )}
    </motion.div>
  );
}

function StreakBadge({ streak, color }: { streak: number; color: "cyan" | "pink" }) {
  if (streak <= 1) return null;
  return (
    <motion.div
      className={cn(
        "flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-black",
        color === "cyan"
          ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
          : "bg-pink-500/20 text-pink-300 border border-pink-500/30",
        streak >= 5 && "ring-2 ring-yellow-500/40 bg-yellow-500/15 border-yellow-500/40 text-yellow-300"
      )}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 500, damping: 15 }}
    >
      <motion.div
        animate={streak >= 3 ? { scale: [1, 1.3, 1], rotate: [0, -5, 5, 0] } : {}}
        transition={{ duration: 0.6, repeat: streak >= 3 ? Infinity : 0, repeatDelay: 1 }}
      >
        <Flame className={cn("w-3.5 h-3.5", streak >= 5 && "text-yellow-400")} />
      </motion.div>
      <span>{streak}</span>
      {streak >= 3 && (
        <motion.span
          className="text-[9px] uppercase tracking-wider"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1, repeat: Infinity }}
        >
          COMBO
        </motion.span>
      )}
    </motion.div>
  );
}

export default function QuickMath({ onScore, liveCode }: Props) {
  const [gameState, setGameState] = useState<GameState>("idle");
  const [mode, setMode] = useState<GameMode>("player");
  const [botDifficulty, setBotDifficulty] = useState<Difficulty>("Médio");
  const [currentRound, setCurrentRound] = useState(1);
  const [problem, setProblem] = useState<MathProblem | null>(null);
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [timeLeft, setTimeLeft] = useState(15);
  const [timerDuration, setTimerDuration] = useState(15);
  const [wrongMode, setWrongMode] = useState<WrongMode>("retry");
  const [p1Input, setP1Input] = useState("");
  const [p2Input, setP2Input] = useState("");
  const [p1Stats, setP1Stats] = useState<PlayerStats>({ correct: 0, totalTime: 0, streak: 0, bestStreak: 0, fastestTime: Infinity });
  const [p2Stats, setP2Stats] = useState<PlayerStats>({ correct: 0, totalTime: 0, streak: 0, bestStreak: 0, fastestTime: Infinity });
  const [p1Locked, setP1Locked] = useState(false);
  const [p2Locked, setP2Locked] = useState(false);
  const [p1Wrong, setP1Wrong] = useState(false);
  const [p2Wrong, setP2Wrong] = useState(false);
  const [roundResult, setRoundResult] = useState<RoundResult | null>(null);
  const [roundStartTime, setRoundStartTime] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [confettiColor, setConfettiColor] = useState("cyan");
  const [botThinking, setBotThinking] = useState(false);
  const [scorePops, setScorePops] = useState<ScorePop[]>([]);
  const [p1FlashCorrect, setP1FlashCorrect] = useState(false);
  const [p2FlashCorrect, setP2FlashCorrect] = useState(false);
  const p1Ref = useRef<HTMLInputElement>(null);
  const p2Ref = useRef<HTMLInputElement>(null);
  const timerInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const roundEnded = useRef(false);
  const botTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scorePopId = useRef(0);

  const getP2Name = useCallback(() => (mode === "bot" ? "Computador" : "Jogador 2"), [mode]);

  const clearBotTimeout = useCallback(() => {
    if (botTimeoutRef.current) {
      clearTimeout(botTimeoutRef.current);
      botTimeoutRef.current = null;
    }
  }, []);

  const clearTimer = useCallback(() => {
    if (timerInterval.current) {
      clearInterval(timerInterval.current);
      timerInterval.current = null;
    }
  }, []);

  const startTimer = useCallback(
    (duration: number) => {
      clearTimer();
      setTimeLeft(duration);
      const start = Date.now();
      timerInterval.current = setInterval(() => {
        const elapsed = (Date.now() - start) / 1000;
        const remaining = Math.max(0, duration - elapsed);
        setTimeLeft(remaining);
        if (remaining <= 0) {
          clearTimer();
          if (!roundEnded.current) {
            roundEnded.current = true;
            setRoundResult({ winner: null, winnerName: null, p1Time: null, p2Time: null, timedOut: true });
            setGameState("roundResult");
            setBotThinking(false);
            toast.error("Tempo!");
          }
        }
      }, 50);
    },
    [clearTimer]
  );

  const triggerScorePop = useCallback((player: 1 | 2, streak: number) => {
    const points = 10 + (streak > 1 ? streak * 2 : 0);
    const id = ++scorePopId.current;
    setScorePops((prev) => [...prev, { id, player, points, streak }]);
    setTimeout(() => {
      setScorePops((prev) => prev.filter((p) => p.id !== id));
    }, 1000);
  }, []);

  const startGame = useCallback(() => {
    clearBotTimeout();
    const firstProblem = generateProblem(1);
    setP1Stats({ correct: 0, totalTime: 0, streak: 0, bestStreak: 0, fastestTime: Infinity });
    setP2Stats({ correct: 0, totalTime: 0, streak: 0, bestStreak: 0, fastestTime: Infinity });
    setCurrentRound(1);
    setProblem(firstProblem);
    setP1Input("");
    setP2Input("");
    setP1Locked(false);
    setP2Locked(false);
    setP1Wrong(false);
    setP2Wrong(false);
    setRoundResult(null);
    setCountdown(COUNTDOWN_SECONDS);
    setBotThinking(false);
    setScorePops([]);
    setP1FlashCorrect(false);
    setP2FlashCorrect(false);
    roundEnded.current = false;
    setGameState("countdown");
  }, [clearBotTimeout]);

  useEffect(() => {
    if (gameState !== "countdown") return;
    if (countdown <= 0) {
      setGameState("playing");
      setRoundStartTime(Date.now());
      startTimer(timerDuration);
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 800);
    return () => clearTimeout(t);
  }, [gameState, countdown, timerDuration, startTimer]);

  useEffect(() => {
    if (gameState !== "playing" && gameState !== "countdown") {
      clearTimer();
    }
    return () => clearTimer();
  }, [gameState, clearTimer]);

  const handleWin = useCallback(
    (player: 1 | 2) => {
      if (roundEnded.current) return;
      roundEnded.current = true;
      clearTimer();
      clearBotTimeout();
      const elapsed = (Date.now() - roundStartTime) / 1000;
      const name = player === 1 ? "Jogador 1" : getP2Name();
      const setStats = player === 1 ? setP1Stats : setP2Stats;
      const otherSetStats = player === 1 ? setP2Stats : setP1Stats;

      const newStreak = (player === 1 ? p1Stats.streak : p2Stats.streak) + 1;

      setStats((prev) => ({
        correct: prev.correct + 1,
        totalTime: prev.totalTime + elapsed,
        streak: prev.streak + 1,
        bestStreak: Math.max(prev.bestStreak, prev.streak + 1),
        fastestTime: Math.min(prev.fastestTime, elapsed),
      }));

      otherSetStats((prev) => ({
        ...prev,
        streak: 0,
      }));

      setRoundResult({
        winner: player,
        winnerName: name,
        p1Time: player === 1 ? elapsed : null,
        p2Time: player === 2 ? elapsed : null,
        timedOut: false,
      });

      setConfettiColor(player === 1 ? "cyan" : "pink");
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 1500);

      if (player === 1) {
        setP1FlashCorrect(true);
        setTimeout(() => setP1FlashCorrect(false), 800);
      } else {
        setP2FlashCorrect(true);
        setTimeout(() => setP2FlashCorrect(false), 800);
      }

      triggerScorePop(player, newStreak);

      setGameState("roundResult");
      setBotThinking(false);
      toast.success(`${name} — Correto! (${elapsed.toFixed(1)}s)`);
    },
    [clearTimer, clearBotTimeout, roundStartTime, getP2Name, p1Stats.streak, p2Stats.streak, triggerScorePop]
  );

  const handleSubmit = useCallback(
    (player: 1 | 2) => {
      if (gameState !== "playing" || !problem || roundEnded.current) return;
      if (mode === "bot" && player === 2) return;
      if (player === 1 && p1Locked) return;
      if (player === 2 && p2Locked) return;

      const input = player === 1 ? p1Input : p2Input;
      const parsed = parseFloat(input);
      if (isNaN(parsed)) return;

      if (parsed === problem.answer) {
        if (player === 1) setP1Locked(true);
        else setP2Locked(true);
        handleWin(player);
      } else {
        if (wrongMode === "retry") {
          if (player === 1) {
            setP1Wrong(true);
            setTimeout(() => {
              setP1Wrong(false);
              setP1Input("");
              p1Ref.current?.focus();
            }, 500);
          } else {
            setP2Wrong(true);
            setTimeout(() => {
              setP2Wrong(false);
              setP2Input("");
              p2Ref.current?.focus();
            }, 500);
          }
        } else {
          if (player === 1) {
            setP1Locked(true);
            setP1Wrong(true);
          } else {
            setP2Locked(true);
            setP2Wrong(true);
          }
          const otherLocked = player === 1 ? p2Locked : p1Locked;
          if (otherLocked) {
            if (!roundEnded.current) {
              roundEnded.current = true;
              clearTimer();
              clearBotTimeout();
              const otherPlayer = player === 1 ? 2 : 1;
              const otherName = otherPlayer === 1 ? "Jogador 1" : getP2Name();
              const elapsed = (Date.now() - roundStartTime) / 1000;
              const otherSetStats = otherPlayer === 1 ? setP1Stats : setP2Stats;
              const loserSetStats = player === 1 ? setP2Stats : setP1Stats;

              const newStreak = (otherPlayer === 1 ? p1Stats.streak : p2Stats.streak) + 1;

              otherSetStats((prev) => ({
                correct: prev.correct + 1,
                totalTime: prev.totalTime + elapsed,
                streak: prev.streak + 1,
                bestStreak: Math.max(prev.bestStreak, prev.streak + 1),
                fastestTime: Math.min(prev.fastestTime, elapsed),
              }));
              loserSetStats((prev) => ({ ...prev, streak: 0 }));

              setRoundResult({
                winner: otherPlayer,
                winnerName: otherName,
                p1Time: otherPlayer === 1 ? elapsed : null,
                p2Time: otherPlayer === 2 ? elapsed : null,
                timedOut: false,
              });

              setConfettiColor(otherPlayer === 1 ? "cyan" : "pink");
              setShowConfetti(true);
              setTimeout(() => setShowConfetti(false), 1500);

              if (otherPlayer === 1) {
                setP1FlashCorrect(true);
                setTimeout(() => setP1FlashCorrect(false), 800);
              } else {
                setP2FlashCorrect(true);
                setTimeout(() => setP2FlashCorrect(false), 800);
              }

              triggerScorePop(otherPlayer, newStreak);

              setGameState("roundResult");
              setBotThinking(false);
              toast.success(`${otherName} — Correto! (${elapsed.toFixed(1)}s)`);
            }
          }
        }
      }
    },
    [gameState, problem, p1Input, p2Input, p1Locked, p2Locked, wrongMode, handleWin, clearTimer, clearBotTimeout, roundStartTime, mode, getP2Name, p1Stats.streak, p2Stats.streak, triggerScorePop]
  );

  /* Bot AI effect */
  useEffect(() => {
    if (gameState !== "playing" || mode !== "bot" || !problem || roundEnded.current) return;

    const botConfig: Record<Difficulty, { avgMs: number; wrongPct: number }> = {
      "Fácil": { avgMs: 1200, wrongPct: 0.15 },
      "Médio": { avgMs: 700, wrongPct: 0.05 },
      "Difícil": { avgMs: 400, wrongPct: 0.01 },
    };

    const config = botConfig[botDifficulty];
    const reactionMs = Math.max(200, config.avgMs + (Math.random() - 0.5) * config.avgMs * 0.8);
    const isWrong = Math.random() < config.wrongPct;

    setBotThinking(true);

    botTimeoutRef.current = setTimeout(() => {
      if (roundEnded.current) return;
      setBotThinking(false);
      if (isWrong) return;
      handleWin(2);
    }, reactionMs);

    return () => {
      if (botTimeoutRef.current) {
        clearTimeout(botTimeoutRef.current);
        botTimeoutRef.current = null;
      }
      setBotThinking(false);
    };
  }, [gameState, mode, botDifficulty, problem, handleWin]);

  const nextRound = useCallback(() => {
    if (currentRound >= TOTAL_ROUNDS) {
      const p1Score = p1Stats.correct * 10 + (p1Stats.correct > 0 ? Math.max(0, Math.round((timerDuration - p1Stats.totalTime / p1Stats.correct) * 2)) : 0);
      const p2Score = p2Stats.correct * 10 + (p2Stats.correct > 0 ? Math.max(0, Math.round((timerDuration - p2Stats.totalTime / p2Stats.correct) * 2)) : 0);
      onScore?.("Jogador 1", p1Score);
      onScore?.(getP2Name(), p2Score);
      setGameState("gameOver");
      return;
    }

    const nextProblem = generateProblem(currentRound + 1);
    setCurrentRound((r) => r + 1);
    setProblem(nextProblem);
    setP1Input("");
    setP2Input("");
    setP1Locked(false);
    setP2Locked(false);
    setP1Wrong(false);
    setP2Wrong(false);
    setRoundResult(null);
    setBotThinking(false);
    setP1FlashCorrect(false);
    setP2FlashCorrect(false);
    roundEnded.current = false;
    setGameState("playing");
    setRoundStartTime(Date.now());
    startTimer(timerDuration);
  }, [currentRound, p1Stats, p2Stats, timerDuration, onScore, startTimer, getP2Name]);

  const resetAll = useCallback(() => {
    clearTimer();
    clearBotTimeout();
    roundEnded.current = false;
    setGameState("idle");
    setCurrentRound(1);
    setProblem(null);
    setP1Input("");
    setP2Input("");
    setP1Stats({ correct: 0, totalTime: 0, streak: 0, bestStreak: 0, fastestTime: Infinity });
    setP2Stats({ correct: 0, totalTime: 0, streak: 0, bestStreak: 0, fastestTime: Infinity });
    setP1Locked(false);
    setP2Locked(false);
    setP1Wrong(false);
    setP2Wrong(false);
    setRoundResult(null);
    setShowConfetti(false);
    setBotThinking(false);
    setScorePops([]);
    setP1FlashCorrect(false);
    setP2FlashCorrect(false);
  }, [clearTimer, clearBotTimeout]);

  const timerPercent = gameState === "playing" ? (timeLeft / timerDuration) * 100 : 100;
  const timerUrgent = gameState === "playing" && timeLeft <= timerDuration * 0.25;
  const timerWarning = gameState === "playing" && timeLeft <= timerDuration * 0.5 && !timerUrgent;
  const timerBarColor = timeLeft > timerDuration * 0.5
    ? "from-green-500 to-green-400"
    : timeLeft > timerDuration * 0.25
    ? "from-yellow-500 to-orange-400"
    : "from-red-500 to-red-400";

  const p1AvgTime = p1Stats.correct > 0 ? (p1Stats.totalTime / p1Stats.correct).toFixed(1) : "—";
  const p2AvgTime = p2Stats.correct > 0 ? (p2Stats.totalTime / p2Stats.correct).toFixed(1) : "—";
  const p1Fastest = p1Stats.fastestTime === Infinity ? null : p1Stats.fastestTime;
  const p2Fastest = p2Stats.fastestTime === Infinity ? null : p2Stats.fastestTime;

  const p1Score = p1Stats.correct * 10 + (p1Stats.correct > 0 ? Math.max(0, Math.round((timerDuration - p1Stats.totalTime / p1Stats.correct) * 2)) : 0);
  const p2Score = p2Stats.correct * 10 + (p2Stats.correct > 0 ? Math.max(0, Math.round((timerDuration - p2Stats.totalTime / p2Stats.correct) * 2)) : 0);

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col gap-4 relative">
      {showConfetti && <ConfettiParticles color={confettiColor} />}

      {/* Score Header */}
      <div className="bg-gradient-to-r from-cyan-900/30 to-pink-900/30 border border-cyan-500/20 rounded-xl px-4 py-3 flex items-center justify-between gap-2">
        <div className="relative">
          <motion.div
            className="flex items-center gap-2"
            key={"p1score-" + p1Stats.correct}
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 0.35, type: "spring", stiffness: 400 }}
          >
            <span className="text-cyan-400 font-bold text-sm sm:text-base">Jogador 1</span>
            <span className="text-cyan-300 text-lg sm:text-xl font-black tabular-nums">{p1Stats.correct}</span>
            <span className="text-cyan-500/60 text-xs">✓</span>
          </motion.div>
          <StreakBadge streak={p1Stats.streak} color="cyan" />
          <AnimatePresence>
            {scorePops.filter((p) => p.player === 1).map((pop) => (
              <ScorePopAnimation key={pop.id} pop={pop} />
            ))}
          </AnimatePresence>
        </div>

        <div className="flex flex-col items-center">
          <h2 className="text-white font-black text-sm sm:text-base tracking-wider">
            DUELO DE MATEMÁTICA
          </h2>
          {liveCode && (
            <span className="text-white/30 text-[10px] font-mono">{liveCode}</span>
          )}
        </div>

        <div className="relative flex justify-end">
          <motion.div
            className="flex items-center gap-2"
            key={"p2score-" + p2Stats.correct}
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 0.35, type: "spring", stiffness: 400 }}
          >
            <span className="text-pink-500/60 text-xs">✓</span>
            <span className="text-pink-400 text-lg sm:text-xl font-black tabular-nums">{p2Stats.correct}</span>
            {mode === "bot" ? (
              <span className="text-pink-400 font-bold text-sm sm:text-base flex items-center gap-1">
                <Bot className="w-4 h-4" />
                <span className="hidden sm:inline">Computador</span>
              </span>
            ) : (
              <span className="text-pink-400 font-bold text-sm sm:text-base">Jogador 2</span>
            )}
          </motion.div>
          <StreakBadge streak={p2Stats.streak} color="pink" />
          <AnimatePresence>
            {scorePops.filter((p) => p.player === 2).map((pop) => (
              <ScorePopAnimation key={pop.id} pop={pop} />
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Round Info + Timer Display */}
      {gameState !== "idle" && (
        <div className="flex items-center justify-between gap-2 text-xs sm:text-sm">
          <span className="text-white/60 font-medium">
            Round {currentRound}/{TOTAL_ROUNDS}
          </span>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={cn("text-[10px] sm:text-xs", getDifficultyColor(problem?.difficulty ?? "Fácil"))}>
              {problem?.difficulty ?? "Fácil"}
            </Badge>
            <motion.span
              className={cn(
                "flex items-center gap-1 font-bold tabular-nums",
                timerUrgent
                  ? "text-red-400"
                  : timerWarning
                  ? "text-yellow-400"
                  : "text-white/60"
              )}
              animate={timerUrgent ? { scale: [1, 1.15, 1], opacity: [1, 0.7, 1] } : {}}
              transition={{ duration: 0.5, repeat: Infinity, ease: "easeInOut" }}
            >
              <motion.div
                animate={timerUrgent ? { rotate: [0, 10, -10, 0] } : {}}
                transition={{ duration: 0.4, repeat: Infinity, repeatDelay: 0.6 }}
              >
                <Clock className="w-3.5 h-3.5" />
              </motion.div>
              {Math.ceil(timeLeft)}s
            </motion.span>
          </div>
        </div>
      )}

      {/* Timer Bar with Urgency Effects */}
      {gameState === "playing" && (
        <div className="relative w-full">
          <motion.div
            className={cn(
              "w-full h-2.5 bg-white/5 rounded-full overflow-hidden",
              timerUrgent && "ring-1 ring-red-500/30"
            )}
            animate={timerUrgent ? { scale: [1, 1.01, 1] } : {}}
            transition={{ duration: 0.3, repeat: Infinity }}
          >
            <motion.div
              className={cn(
                "h-full rounded-full bg-gradient-to-r relative",
                timerBarColor,
                timerUrgent && "shadow-[0_0_12px_rgba(239,68,68,0.5)]"
              )}
              initial={{ width: "100%" }}
              animate={{ width: `${timerPercent}%` }}
              transition={{ duration: 0.1, ease: "linear" }}
            >
              {timerUrgent && (
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                  animate={{ x: ["-100%", "200%"] }}
                  transition={{ duration: 0.6, repeat: Infinity, ease: "linear" }}
                />
              )}
            </motion.div>
          </motion.div>
          {/* Urgency vignette overlay */}
          <AnimatePresence>
            {timerUrgent && (
              <motion.div
                className="absolute -inset-1 rounded-full pointer-events-none"
                style={{ boxShadow: "0 0 20px rgba(239,68,68,0.15), inset 0 0 20px rgba(239,68,68,0.05)" }}
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 0] }}
                transition={{ duration: 0.8, repeat: Infinity }}
              />
            )}
          </AnimatePresence>
        </div>
      )}

      <AnimatePresence mode="wait">
        {/* IDLE SCREEN */}
        {gameState === "idle" && (
          <motion.div
            key="idle"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col items-center gap-6 py-10"
          >
            <div className="flex items-center gap-3 text-white/80">
              <Calculator className="w-10 h-10 text-cyan-400" />
              <h1 className="text-3xl sm:text-4xl font-black bg-gradient-to-r from-cyan-400 to-pink-400 bg-clip-text text-transparent">
                Duelo de Matemática
              </h1>
              <Calculator className="w-10 h-10 text-pink-400" />
            </div>

            <p className="text-white/50 text-sm text-center max-w-md">
              10 rodadas de problemas matemáticos. O primeiro a responder corretamente ganha o ponto!
              A dificuldade aumenta a cada rodada.
            </p>

            <div className="flex flex-col items-center gap-3">
              <span className="text-white/40 text-xs">Modo de Jogo</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setMode("player")}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 border",
                    mode === "player"
                      ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/50"
                      : "bg-white/5 text-white/40 border-white/10 hover:bg-white/10"
                  )}
                >
                  👤 vs Jogador
                </button>
                <button
                  onClick={() => setMode("bot")}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 border",
                    mode === "bot"
                      ? "bg-pink-500/20 text-pink-300 border-pink-500/50"
                      : "bg-white/5 text-white/40 border-white/10 hover:bg-white/10"
                  )}
                >
                  <Bot className="w-4 h-4" />
                  vs Computador
                </button>
              </div>
            </div>

            {mode === "bot" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="flex flex-col items-center gap-2"
              >
                <span className="text-white/40 text-xs">Dificuldade do Computador</span>
                <div className="flex items-center gap-2">
                  {(["Fácil", "Médio", "Difícil"] as Difficulty[]).map((d) => (
                    <button
                      key={d}
                      onClick={() => setBotDifficulty(d)}
                      className={cn(
                        "px-3 py-1.5 rounded-md text-xs font-semibold transition-all border",
                        botDifficulty === d
                          ? d === "Fácil"
                            ? "bg-green-500/20 text-green-300 border-green-500/50"
                            : d === "Médio"
                            ? "bg-yellow-500/20 text-yellow-300 border-yellow-500/50"
                            : "bg-red-500/20 text-red-300 border-red-500/50"
                          : "bg-white/5 text-white/40 border-white/10 hover:bg-white/10"
                      )}
                    >
                      {d}
                    </button>
                  ))}
                </div>
                <p className="text-white/30 text-[10px] text-center max-w-xs">
                  {botDifficulty === "Fácil" && "Reação lenta, 15% de chance de errar"}
                  {botDifficulty === "Médio" && "Reação média, 5% de chance de errar"}
                  {botDifficulty === "Difícil" && "Reação rápida, 1% de chance de errar"}
                </p>
              </motion.div>
            )}

            <div className="flex flex-wrap items-center justify-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-white/40 text-xs">Timer:</span>
                {[10, 15, 20, 30].map((t) => (
                  <button
                    key={t}
                    onClick={() => setTimerDuration(t)}
                    className={cn(
                      "px-3 py-1 rounded-md text-xs font-semibold transition-all",
                      timerDuration === t
                        ? "bg-cyan-500/30 text-cyan-300 border border-cyan-500/50"
                        : "bg-white/5 text-white/40 border border-white/10 hover:bg-white/10"
                    )}
                  >
                    {t}s
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-white/40 text-xs">Erro:</span>
                <button
                  onClick={() => setWrongMode("retry")}
                  className={cn(
                    "px-3 py-1 rounded-md text-xs font-semibold transition-all",
                    wrongMode === "retry"
                      ? "bg-yellow-500/30 text-yellow-300 border border-yellow-500/50"
                      : "bg-white/5 text-white/40 border border-white/10 hover:bg-white/10"
                  )}
                >
                  Tentar de novo
                </button>
                <button
                  onClick={() => setWrongMode("lose")}
                  className={cn(
                    "px-3 py-1 rounded-md text-xs font-semibold transition-all",
                    wrongMode === "lose"
                      ? "bg-red-500/30 text-red-300 border border-red-500/50"
                      : "bg-white/5 text-white/40 border border-white/10 hover:bg-white/10"
                  )}
                >
                  Perde rodada
                </button>
              </div>
            </div>

            <Button
              onClick={startGame}
              size="lg"
              className="bg-gradient-to-r from-cyan-500 to-pink-500 hover:from-cyan-400 hover:to-pink-400 text-white font-bold text-lg px-10"
            >
              Iniciar
            </Button>
          </motion.div>
        )}

        {/* COUNTDOWN SCREEN */}
        {gameState === "countdown" && (
          <motion.div
            key="countdown"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-16"
          >
            <AnimatePresence mode="popLayout">
              <motion.div
                key={countdown}
                initial={{ scale: 2, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                transition={{ duration: 0.5, type: "spring", stiffness: 300 }}
                className="text-7xl sm:text-8xl font-black text-white"
              >
                {countdown > 0 ? countdown : "GO!"}
              </motion.div>
            </AnimatePresence>
          </motion.div>
        )}

        {/* PLAYING SCREEN */}
        {gameState === "playing" && problem && (
          <motion.div
            key={"playing-" + currentRound}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col gap-4"
          >
            {/* Enhanced Problem Card */}
            <motion.div
              className={cn(
                "relative rounded-2xl px-6 py-8 sm:py-10 text-center overflow-hidden",
                "bg-gradient-to-br from-white/[0.07] to-white/[0.02]",
                "border border-white/10",
                timerUrgent && "!border-red-500/30"
              )}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{
                scale: 1,
                opacity: 1,
                borderColor: timerUrgent
                  ? "rgba(239,68,68,0.4)"
                  : "rgba(255,255,255,0.1)",
              }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
            >
              {/* Animated gradient border effect */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-cyan-500/10 via-transparent to-pink-500/10" />
              {timerUrgent && (
                <motion.div
                  className="absolute inset-0 rounded-2xl"
                  style={{ background: "radial-gradient(ellipse at center, rgba(239,68,68,0.08) 0%, transparent 70%)" }}
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 0.6, repeat: Infinity }}
                />
              )}
              {/* Top glow line */}
              <motion.div
                className={cn(
                  "absolute top-0 left-0 right-0 h-[2px]",
                  timerUrgent
                    ? "bg-gradient-to-r from-transparent via-red-500/60 to-transparent"
                    : "bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent"
                )}
                animate={timerUrgent ? { opacity: [0.5, 1, 0.5] } : { opacity: [0.3, 0.7, 0.3] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
              <div className="relative z-10">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <span className={cn("inline-block w-1.5 h-1.5 rounded-full",
                    problem.difficulty === "Fácil" ? "bg-green-400" :
                    problem.difficulty === "Médio" ? "bg-yellow-400" : "bg-red-400"
                  )} />
                  <span className="text-white/30 text-xs font-medium uppercase tracking-widest">
                    {problem.difficulty}
                  </span>
                  <span className={cn("inline-block w-1.5 h-1.5 rounded-full",
                    problem.difficulty === "Fácil" ? "bg-green-400" :
                    problem.difficulty === "Médio" ? "bg-yellow-400" : "bg-red-400"
                  )} />
                </div>
                <motion.p
                  className="text-4xl sm:text-5xl font-black text-white tracking-tight"
                  animate={timerUrgent ? { scale: [1, 1.01, 1] } : {}}
                  transition={{ duration: 0.3, repeat: Infinity }}
                >
                  {problem.expression}{" "}=<span className="text-white/40">?</span>
                </motion.p>
              </div>
            </motion.div>

            {/* Input Cards */}
            <div className={cn("grid gap-3 sm:gap-4 mt-2", mode === "bot" ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2")}>
              {/* Player 1 Card */}
              <motion.div
                className={cn(
                  "relative flex flex-col gap-2 rounded-xl p-4 border transition-colors overflow-hidden",
                  p1Locked
                    ? "bg-green-500/10 border-green-500/30"
                    : p1FlashCorrect
                    ? "bg-green-500/15 border-green-500/50"
                    : "bg-cyan-950/20 border-cyan-500/20"
                )}
                animate={p1Wrong ? { x: [-8, 8, -6, 6, -3, 3, 0] } : {}}
                transition={{ duration: 0.4 }}
              >
                {/* Correct flash overlay */}
                <AnimatePresence>
                  {p1FlashCorrect && (
                    <motion.div
                      className="absolute inset-0 bg-green-500/20 z-10 pointer-events-none rounded-xl"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: [0, 1, 0] }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.6 }}
                    />
                  )}
                </AnimatePresence>
                {/* Wrong flash overlay */}
                <AnimatePresence>
                  {p1Wrong && (
                    <motion.div
                      className="absolute inset-0 bg-red-500/15 z-10 pointer-events-none rounded-xl"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    />
                  )}
                </AnimatePresence>
                <label className="text-cyan-400 font-bold text-sm flex items-center gap-2 relative z-20">
                  <span className="w-2 h-2 rounded-full bg-cyan-400" />
                  Jogador 1
                  {p1Locked && (
                    <motion.span
                      className="flex items-center gap-1 text-green-400 text-xs ml-auto"
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 500, damping: 15 }}
                    >
                      <Check className="w-3.5 h-3.5" />
                      Correto!
                    </motion.span>
                  )}
                  {p1Wrong && (
                    <motion.span
                      className="flex items-center gap-1 text-red-400 text-xs ml-auto"
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                    >
                      <X className="w-3.5 h-3.5" />
                      Errado!
                    </motion.span>
                  )}
                </label>
                <div className="flex gap-2 relative z-20">
                  <input
                    ref={p1Ref}
                    type="number"
                    value={p1Input}
                    onChange={(e) => setP1Input(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSubmit(1)}
                    disabled={p1Locked}
                    placeholder="Resposta"
                    className={cn(
                      "flex-1 bg-white/5 border rounded-lg px-3 py-2 text-white text-lg font-bold",
                      "placeholder:text-white/20 focus:outline-none focus:ring-2 transition-all",
                      p1Wrong
                        ? "border-red-500/50 focus:ring-red-500/30 bg-red-500/10"
                        : p1Locked
                        ? "border-green-500/50 bg-green-500/5 opacity-60 cursor-not-allowed"
                        : "border-cyan-500/30 focus:ring-cyan-500/30 focus:border-cyan-500/50"
                    )}
                    autoFocus
                  />
                  <Button
                    onClick={() => handleSubmit(1)}
                    disabled={p1Locked || !p1Input}
                    size="icon"
                    className={cn(
                      "shrink-0",
                      p1Locked
                        ? "bg-green-500/20 text-green-400"
                        : "bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30"
                    )}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>

              {/* Player 2 / Bot Card */}
              {mode === "bot" ? (
                <motion.div
                  className={cn(
                    "relative flex flex-col gap-2 rounded-xl p-4 border transition-colors overflow-hidden",
                    p2Locked
                      ? "bg-green-500/10 border-green-500/30"
                      : p2FlashCorrect
                      ? "bg-green-500/15 border-green-500/50"
                      : "bg-pink-950/20 border-pink-500/20"
                  )}
                  animate={botThinking ? { scale: [1, 1.01, 1] } : {}}
                  transition={{ duration: 1, repeat: botThinking ? Infinity : 0 }}
                >
                  <AnimatePresence>
                    {p2FlashCorrect && (
                      <motion.div
                        className="absolute inset-0 bg-green-500/20 z-10 pointer-events-none rounded-xl"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: [0, 1, 0] }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.6 }}
                      />
                    )}
                  </AnimatePresence>
                  <label className="text-pink-400 font-bold text-sm flex items-center gap-2 relative z-20">
                    <Bot className="w-4 h-4" />
                    Computador
                    {p2Locked && (
                      <motion.span
                        className="flex items-center gap-1 text-green-400 text-xs ml-auto"
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 500, damping: 15 }}
                      >
                        <Check className="w-3.5 h-3.5" />
                        Correto!
                      </motion.span>
                    )}
                    {botThinking && !p2Locked && (
                      <motion.span
                        animate={{ opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 1.2, repeat: Infinity }}
                        className="text-pink-300 text-xs ml-auto"
                      >
                        Pensando...
                      </motion.span>
                    )}
                  </label>
                  <div className="flex items-center justify-center py-2 text-white/20 text-sm relative z-20">
                    <Bot className="w-6 h-6 mr-2 text-pink-500/40" />
                    IA jogando automaticamente
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  className={cn(
                    "relative flex flex-col gap-2 rounded-xl p-4 border transition-colors overflow-hidden",
                    p2Locked
                      ? "bg-green-500/10 border-green-500/30"
                      : p2FlashCorrect
                      ? "bg-green-500/15 border-green-500/50"
                      : "bg-pink-950/20 border-pink-500/20"
                  )}
                  animate={p2Wrong ? { x: [-8, 8, -6, 6, -3, 3, 0] } : {}}
                  transition={{ duration: 0.4 }}
                >
                  <AnimatePresence>
                    {p2FlashCorrect && (
                      <motion.div
                        className="absolute inset-0 bg-green-500/20 z-10 pointer-events-none rounded-xl"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: [0, 1, 0] }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.6 }}
                      />
                    )}
                  </AnimatePresence>
                  <AnimatePresence>
                    {p2Wrong && (
                      <motion.div
                        className="absolute inset-0 bg-red-500/15 z-10 pointer-events-none rounded-xl"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      />
                    )}
                  </AnimatePresence>
                  <label className="text-pink-400 font-bold text-sm flex items-center gap-2 relative z-20">
                    <span className="w-2 h-2 rounded-full bg-pink-400" />
                    Jogador 2
                    {p2Locked && (
                      <motion.span
                        className="flex items-center gap-1 text-green-400 text-xs ml-auto"
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 500, damping: 15 }}
                      >
                        <Check className="w-3.5 h-3.5" />
                        Correto!
                      </motion.span>
                    )}
                    {p2Wrong && (
                      <motion.span
                        className="flex items-center gap-1 text-red-400 text-xs ml-auto"
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                      >
                        <X className="w-3.5 h-3.5" />
                        Errado!
                      </motion.span>
                    )}
                  </label>
                  <div className="flex gap-2 relative z-20">
                    <input
                      ref={p2Ref}
                      type="number"
                      value={p2Input}
                      onChange={(e) => setP2Input(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSubmit(2)}
                      disabled={p2Locked}
                      placeholder="Resposta"
                      className={cn(
                        "flex-1 bg-white/5 border rounded-lg px-3 py-2 text-white text-lg font-bold",
                        "placeholder:text-white/20 focus:outline-none focus:ring-2 transition-all",
                        p2Wrong
                          ? "border-red-500/50 focus:ring-red-500/30 bg-red-500/10"
                          : p2Locked
                          ? "border-green-500/50 bg-green-500/5 opacity-60 cursor-not-allowed"
                          : "border-pink-500/30 focus:ring-pink-500/30 focus:border-pink-500/50"
                      )}
                    />
                    <Button
                      onClick={() => handleSubmit(2)}
                      disabled={p2Locked || !p2Input}
                      size="icon"
                      className={cn(
                        "shrink-0",
                        p2Locked
                          ? "bg-green-500/20 text-green-400"
                          : "bg-pink-500/20 text-pink-300 hover:bg-pink-500/30"
                      )}
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Stats Bar with Enhanced Streak Display */}
            <div className={cn("grid gap-3 mt-1 text-xs text-white/40 px-2", mode === "bot" ? "grid-cols-1" : "grid-cols-2")}>
              <div className="flex items-center gap-3">
                <span className="text-cyan-400/70">Média: {p1AvgTime}s</span>
                <span className="text-white/20">•</span>
                <motion.span
                  className={cn(
                    "flex items-center gap-1 font-bold",
                    p1Stats.streak >= 3 ? "text-yellow-400" : "text-cyan-400/70"
                  )}
                  animate={p1Stats.streak >= 3 ? { scale: [1, 1.1, 1] } : {}}
                  transition={{ duration: 0.5, repeat: Infinity }}
                >
                  {p1Stats.streak >= 2 && <Flame className="w-3 h-3" />}
                  Streak: {p1Stats.streak}
                </motion.span>
              </div>
              <div className={cn("flex items-center gap-3", mode === "bot" ? "justify-start" : "justify-end")}>
                <span className="text-pink-400/70">Média: {p2AvgTime}s</span>
                <span className="text-white/20">•</span>
                <motion.span
                  className={cn(
                    "flex items-center gap-1 font-bold",
                    p2Stats.streak >= 3 ? "text-yellow-400" : "text-pink-400/70"
                  )}
                  animate={p2Stats.streak >= 3 ? { scale: [1, 1.1, 1] } : {}}
                  transition={{ duration: 0.5, repeat: Infinity }}
                >
                  {p2Stats.streak >= 2 && <Flame className="w-3 h-3" />}
                  Streak: {p2Stats.streak}
                </motion.span>
              </div>
            </div>
          </motion.div>
        )}

        {/* ROUND RESULT SCREEN */}
        {gameState === "roundResult" && roundResult && (
          <motion.div
            key={"result-" + currentRound}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex flex-col items-center gap-5 py-6"
          >
            {/* Answer reveal card */}
            <motion.div
              className="bg-white/5 border border-white/10 rounded-xl px-6 py-4 text-center"
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              <p className="text-sm text-white/30 mb-1">Resposta</p>
              <p className="text-2xl sm:text-3xl font-black text-white/80">
                {problem?.expression} = {problem?.answer}
              </p>
            </motion.div>

            {roundResult.timedOut ? (
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                className="text-center"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 10 }}
                  className="flex items-center justify-center gap-2 text-red-400 mb-2"
                >
                  <Timer className="w-6 h-6" />
                  <p className="text-2xl font-black">Tempo Esgotado!</p>
                </motion.div>
                <p className="text-white/40 text-sm mt-1">Ninguém respondeu a tempo</p>
              </motion.div>
            ) : (
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 15 }}
                className="text-center"
              >
                {/* Winner name with animated icon */}
                <div className="flex items-center justify-center gap-2 mb-1">
                  <motion.div
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    transition={{ delay: 0.2, type: "spring" }}
                  >
                    <Check className={cn("w-7 h-7", roundResult.winner === 1 ? "text-cyan-400" : "text-pink-400")} />
                  </motion.div>
                  <p
                    className={cn(
                      "text-3xl sm:text-4xl font-black",
                      roundResult.winner === 1 ? "text-cyan-400" : "text-pink-400"
                    )}
                  >
                    {roundResult.winnerName}
                  </p>
                </div>
                <motion.p
                  className={cn(
                    "text-lg font-bold",
                    roundResult.winner === 1 ? "text-cyan-300/70" : "text-pink-300/70"
                  )}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  Correto!
                </motion.p>
                {/* Time display with speed rating */}
                <motion.div
                  className="mt-3 flex items-center justify-center gap-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  <Clock className="w-4 h-4 text-white/40" />
                  <span className="text-white/50 text-sm font-medium">
                    {(roundResult.winner === 1 ? roundResult.p1Time : roundResult.p2Time)?.toFixed(1)}s
                  </span>
                  {(roundResult.winner === 1 ? roundResult.p1Time : roundResult.p2Time)! < 2 && (
                    <motion.span
                      className="text-yellow-400 text-xs font-bold flex items-center gap-0.5"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 500 }}
                    >
                      <Zap className="w-3 h-3" />
                      Rápido!
                    </motion.span>
                  )}
                </motion.div>
                {/* Streak indicator in result */}
                {((roundResult.winner === 1 ? p1Stats.streak : p2Stats.streak) >= 2) && (
                  <motion.div
                    className="mt-2 flex items-center justify-center gap-1"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.6, type: "spring", stiffness: 400 }}
                  >
                    <Flame className="w-4 h-4 text-yellow-400" />
                    <span className="text-yellow-400 text-sm font-bold">
                      Streak x{roundResult.winner === 1 ? p1Stats.streak : p2Stats.streak}!
                    </span>
                  </motion.div>
                )}
              </motion.div>
            )}

            <Button
              onClick={nextRound}
              className={cn(
                "font-bold px-8",
                currentRound >= TOTAL_ROUNDS
                  ? "bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-white"
                  : "bg-gradient-to-r from-cyan-500 to-pink-500 hover:from-cyan-400 hover:to-pink-400 text-white"
              )}
            >
              {currentRound >= TOTAL_ROUNDS ? "Ver Resultado" : "Próximo"}
            </Button>
          </motion.div>
        )}

        {/* GAME OVER SCREEN */}
        {gameState === "gameOver" && (
          <motion.div
            key="gameOver"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-6 py-6"
          >
            {/* Title */}
            <motion.div
              className="flex items-center gap-3"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <Trophy className="w-8 h-8 text-yellow-400" />
              <h3 className="text-3xl sm:text-4xl font-black text-white">Fim do Jogo!</h3>
              <Trophy className="w-8 h-8 text-yellow-400" />
            </motion.div>

            {/* Winner Announcement */}
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 300, damping: 12 }}
            >
              {p1Stats.correct > p2Stats.correct ? (
                <div className="flex items-center gap-2 text-2xl font-black text-cyan-400">
                  <Trophy className="w-7 h-7" />
                  <span>Jogador 1 Venceu!</span>
                </div>
              ) : p2Stats.correct > p1Stats.correct ? (
                <div className="flex items-center gap-2 text-2xl font-black text-pink-400">
                  <Trophy className="w-7 h-7" />
                  <span>{getP2Name()} Venceu!</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-2xl font-black text-yellow-400">
                  <span>Empate!</span>
                </div>
              )}
            </motion.div>

            {/* Player Stats Cards */}
            <div className="grid grid-cols-2 gap-4 w-full max-w-md">
              {/* Player 1 Card */}
              <motion.div
                className={cn(
                  "rounded-xl p-4 border text-center relative overflow-hidden",
                  p1Stats.correct > p2Stats.correct
                    ? "bg-cyan-500/10 border-cyan-500/40 ring-2 ring-cyan-500/20"
                    : "bg-white/5 border-white/10"
                )}
                initial={{ x: -30, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                {p1Stats.correct > p2Stats.correct && (
                  <motion.div
                    className="absolute top-2 right-2"
                    initial={{ rotate: -20, scale: 0 }}
                    animate={{ rotate: 0, scale: 1 }}
                    transition={{ delay: 0.6, type: "spring" }}
                  >
                    <Trophy className="w-5 h-5 text-yellow-400" />
                  </motion.div>
                )}
                <p className="text-cyan-400 font-bold text-sm">Jogador 1</p>
                <motion.p
                  className="text-4xl font-black text-white mt-2 tabular-nums"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.5, type: "spring", stiffness: 400 }}
                >
                  {p1Stats.correct}
                </motion.p>
                <p className="text-white/40 text-xs mt-1">acertos</p>

                {/* Score breakdown */}
                <div className="mt-3 space-y-1.5 text-xs text-white/50">
                  <div className="flex items-center justify-between">
                    <span>Pontuação</span>
                    <motion.span
                      className="text-cyan-300 font-bold tabular-nums"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.8 }}
                    >
                      {p1Score}
                    </motion.span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Média</span>
                    <span className="tabular-nums">{p1AvgTime}s</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Mais rápido</span>
                    <span className="tabular-nums flex items-center gap-0.5">
                      {p1Fastest !== null ? (
                        <><Zap className="w-2.5 h-2.5 text-yellow-400" />{p1Fastest.toFixed(1)}s</>
                      ) : "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Melhor streak</span>
                    <span className="flex items-center gap-0.5 tabular-nums">
                      {p1Stats.bestStreak > 0 && <Flame className="w-2.5 h-2.5 text-yellow-400" />}
                      {p1Stats.bestStreak}
                    </span>
                  </div>
                </div>

                {/* Accuracy bar */}
                <div className="mt-3">
                  <div className="flex justify-between text-[10px] text-white/30 mb-1">
                    <span>Precisão</span>
                    <span className="tabular-nums">{Math.round((p1Stats.correct / TOTAL_ROUNDS) * 100)}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-cyan-400"
                      initial={{ width: 0 }}
                      animate={{ width: `${(p1Stats.correct / TOTAL_ROUNDS) * 100}%` }}
                      transition={{ delay: 0.6, duration: 0.8, ease: "easeOut" }}
                    />
                  </div>
                </div>
              </motion.div>

              {/* Player 2 Card */}
              <motion.div
                className={cn(
                  "rounded-xl p-4 border text-center relative overflow-hidden",
                  p2Stats.correct > p1Stats.correct
                    ? "bg-pink-500/10 border-pink-500/40 ring-2 ring-pink-500/20"
                    : "bg-white/5 border-white/10"
                )}
                initial={{ x: 30, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                {p2Stats.correct > p1Stats.correct && (
                  <motion.div
                    className="absolute top-2 right-2"
                    initial={{ rotate: 20, scale: 0 }}
                    animate={{ rotate: 0, scale: 1 }}
                    transition={{ delay: 0.6, type: "spring" }}
                  >
                    <Trophy className="w-5 h-5 text-yellow-400" />
                  </motion.div>
                )}
                <p className="text-pink-400 font-bold text-sm flex items-center justify-center gap-1">
                  {mode === "bot" && <Bot className="w-4 h-4" />}
                  {getP2Name()}
                </p>
                <motion.p
                  className="text-4xl font-black text-white mt-2 tabular-nums"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.5, type: "spring", stiffness: 400 }}
                >
                  {p2Stats.correct}
                </motion.p>
                <p className="text-white/40 text-xs mt-1">acertos</p>

                {/* Score breakdown */}
                <div className="mt-3 space-y-1.5 text-xs text-white/50">
                  <div className="flex items-center justify-between">
                    <span>Pontuação</span>
                    <motion.span
                      className="text-pink-300 font-bold tabular-nums"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.8 }}
                    >
                      {p2Score}
                    </motion.span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Média</span>
                    <span className="tabular-nums">{p2AvgTime}s</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Mais rápido</span>
                    <span className="tabular-nums flex items-center gap-0.5">
                      {p2Fastest !== null ? (
                        <><Zap className="w-2.5 h-2.5 text-yellow-400" />{p2Fastest.toFixed(1)}s</>
                      ) : "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Melhor streak</span>
                    <span className="flex items-center gap-0.5 tabular-nums">
                      {p2Stats.bestStreak > 0 && <Flame className="w-2.5 h-2.5 text-yellow-400" />}
                      {p2Stats.bestStreak}
                    </span>
                  </div>
                </div>

                {/* Accuracy bar */}
                <div className="mt-3">
                  <div className="flex justify-between text-[10px] text-white/30 mb-1">
                    <span>Precisão</span>
                    <span className="tabular-nums">{Math.round((p2Stats.correct / TOTAL_ROUNDS) * 100)}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-pink-500 to-pink-400"
                      initial={{ width: 0 }}
                      animate={{ width: `${(p2Stats.correct / TOTAL_ROUNDS) * 100}%` }}
                      transition={{ delay: 0.6, duration: 0.8, ease: "easeOut" }}
                    />
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Score comparison bar */}
            <motion.div
              className="w-full max-w-md"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
            >
              <div className="flex justify-between text-xs text-white/40 mb-1">
                <span className="text-cyan-400">Jogador 1: {p1Score}</span>
                <span className="text-pink-400">{getP2Name()}: {p2Score}</span>
              </div>
              <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden flex">
                {p1Score + p2Score > 0 && (
                  <>
                    <motion.div
                      className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400"
                      initial={{ width: 0 }}
                      animate={{ width: `${(p1Score / (p1Score + p2Score)) * 100}%` }}
                      transition={{ delay: 0.9, duration: 1, ease: "easeOut" }}
                    />
                    <motion.div
                      className="h-full bg-gradient-to-r from-pink-400 to-pink-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${(p2Score / (p1Score + p2Score)) * 100}%` }}
                      transition={{ delay: 0.9, duration: 1, ease: "easeOut" }}
                    />
                  </>
                )}
              </div>
            </motion.div>

            <Button
              onClick={resetAll}
              variant="outline"
              className="gap-2 border-white/20 text-white/70 hover:bg-white/10 hover:text-white"
            >
              <RotateCcw className="w-4 h-4" />
              Reiniciar Tudo
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {(gameState === "playing" || gameState === "roundResult") && (
        <div className="flex items-center justify-center gap-3 mt-2">
          <Button
            onClick={resetAll}
            variant="ghost"
            size="sm"
            className="text-white/30 hover:text-white/60 hover:bg-white/5 gap-1.5"
          >
            <RotateCcw className="w-3 h-3" />
            Reiniciar Tudo
          </Button>
        </div>
      )}
    </div>
  );
}