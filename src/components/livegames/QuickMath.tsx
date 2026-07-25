import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RotateCcw, Timer, Calculator, Send } from "lucide-react";
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
};

type RoundResult = {
  winner: 1 | 2 | null;
  winnerName: string | null;
  p1Time: number | null;
  p2Time: number | null;
  timedOut: boolean;
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

export default function QuickMath({ onScore, liveCode }: Props) {
  const [gameState, setGameState] = useState<GameState>("idle");
  const [currentRound, setCurrentRound] = useState(1);
  const [problem, setProblem] = useState<MathProblem | null>(null);
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [timeLeft, setTimeLeft] = useState(15);
  const [timerDuration, setTimerDuration] = useState(15);
  const [wrongMode, setWrongMode] = useState<WrongMode>("retry");
  const [p1Input, setP1Input] = useState("");
  const [p2Input, setP2Input] = useState("");
  const [p1Stats, setP1Stats] = useState<PlayerStats>({ correct: 0, totalTime: 0, streak: 0, bestStreak: 0 });
  const [p2Stats, setP2Stats] = useState<PlayerStats>({ correct: 0, totalTime: 0, streak: 0, bestStreak: 0 });
  const [p1Locked, setP1Locked] = useState(false);
  const [p2Locked, setP2Locked] = useState(false);
  const [p1Wrong, setP1Wrong] = useState(false);
  const [p2Wrong, setP2Wrong] = useState(false);
  const [roundResult, setRoundResult] = useState<RoundResult | null>(null);
  const [roundStartTime, setRoundStartTime] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [confettiColor, setConfettiColor] = useState("cyan");
  const p1Ref = useRef<HTMLInputElement>(null);
  const p2Ref = useRef<HTMLInputElement>(null);
  const timerInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const roundEnded = useRef(false);

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
            toast.error("Tempo!");
          }
        }
      }, 50);
    },
    [clearTimer]
  );

  const startGame = useCallback(() => {
    const firstProblem = generateProblem(1);
    setP1Stats({ correct: 0, totalTime: 0, streak: 0, bestStreak: 0 });
    setP2Stats({ correct: 0, totalTime: 0, streak: 0, bestStreak: 0 });
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
    roundEnded.current = false;
    setGameState("countdown");
  }, []);

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
      const elapsed = (Date.now() - roundStartTime) / 1000;
      const name = player === 1 ? "Jogador 1" : "Jogador 2";
      const setStats = player === 1 ? setP1Stats : setP2Stats;
      const otherSetStats = player === 1 ? setP2Stats : setP1Stats;

      setStats((prev) => ({
        correct: prev.correct + 1,
        totalTime: prev.totalTime + elapsed,
        streak: prev.streak + 1,
        bestStreak: Math.max(prev.bestStreak, prev.streak + 1),
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

      setGameState("roundResult");
      toast.success(`${name} — Correto! (${elapsed.toFixed(1)}s)`);
    },
    [clearTimer, roundStartTime]
  );

  const handleSubmit = useCallback(
    (player: 1 | 2) => {
      if (gameState !== "playing" || !problem || roundEnded.current) return;
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
              const otherPlayer = player === 1 ? 2 : 1;
              const otherName = otherPlayer === 1 ? "Jogador 1" : "Jogador 2";
              const elapsed = (Date.now() - roundStartTime) / 1000;
              const otherSetStats = otherPlayer === 1 ? setP1Stats : setP2Stats;
              const loserSetStats = player === 1 ? setP2Stats : setP1Stats;

              otherSetStats((prev) => ({
                correct: prev.correct + 1,
                totalTime: prev.totalTime + elapsed,
                streak: prev.streak + 1,
                bestStreak: Math.max(prev.bestStreak, prev.streak + 1),
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

              setGameState("roundResult");
              toast.success(`${otherName} — Correto! (${elapsed.toFixed(1)}s)`);
            }
          }
        }
      }
    },
    [gameState, problem, p1Input, p2Input, p1Locked, p2Locked, wrongMode, handleWin, clearTimer, roundStartTime]
  );

  const nextRound = useCallback(() => {
    if (currentRound >= TOTAL_ROUNDS) {
      const p1Score = p1Stats.correct * 10 + (p1Stats.correct > 0 ? Math.max(0, Math.round((timerDuration - p1Stats.totalTime / p1Stats.correct) * 2)) : 0);
      const p2Score = p2Stats.correct * 10 + (p2Stats.correct > 0 ? Math.max(0, Math.round((timerDuration - p2Stats.totalTime / p2Stats.correct) * 2)) : 0);
      onScore?.("Jogador 1", p1Score);
      onScore?.("Jogador 2", p2Score);
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
    roundEnded.current = false;
    setGameState("playing");
    setRoundStartTime(Date.now());
    startTimer(timerDuration);
  }, [currentRound, p1Stats, p2Stats, timerDuration, onScore, startTimer]);

  const resetAll = useCallback(() => {
    clearTimer();
    roundEnded.current = false;
    setGameState("idle");
    setCurrentRound(1);
    setProblem(null);
    setP1Input("");
    setP2Input("");
    setP1Stats({ correct: 0, totalTime: 0, streak: 0, bestStreak: 0 });
    setP2Stats({ correct: 0, totalTime: 0, streak: 0, bestStreak: 0 });
    setP1Locked(false);
    setP2Locked(false);
    setP1Wrong(false);
    setP2Wrong(false);
    setRoundResult(null);
    setShowConfetti(false);
  }, [clearTimer]);

  const timerPercent = gameState === "playing" ? (timeLeft / timerDuration) * 100 : 100;
  const timerBarColor = timeLeft > timerDuration * 0.5
    ? "from-green-500 to-green-400"
    : timeLeft > timerDuration * 0.25
    ? "from-yellow-500 to-orange-400"
    : "from-red-500 to-red-400";

  const p1AvgTime = p1Stats.correct > 0 ? (p1Stats.totalTime / p1Stats.correct).toFixed(1) : "—";
  const p2AvgTime = p2Stats.correct > 0 ? (p2Stats.totalTime / p2Stats.correct).toFixed(1) : "—";

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col gap-4 relative">
      {showConfetti && <ConfettiParticles color={confettiColor} />}

      {/* Scoreboard */}
      <div className="bg-gradient-to-r from-cyan-900/30 to-pink-900/30 border border-cyan-500/20 rounded-xl px-4 py-3 flex items-center justify-between gap-2">
        <motion.div
          className="flex items-center gap-2"
          key={p1Stats.correct}
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 0.3 }}
        >
          <span className="text-cyan-400 font-bold text-sm sm:text-base">Jogador 1</span>
          <span className="text-cyan-300 text-lg sm:text-xl font-black">{p1Stats.correct}</span>
          <span className="text-cyan-500/60 text-xs">✓</span>
        </motion.div>

        <div className="flex flex-col items-center">
          <h2 className="text-white font-black text-sm sm:text-base tracking-wider">
            DUELO DE MATEMÁTICA
          </h2>
          {liveCode && (
            <span className="text-white/30 text-[10px] font-mono">{liveCode}</span>
          )}
        </div>

        <motion.div
          className="flex items-center gap-2"
          key={p2Stats.correct}
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 0.3 }}
        >
          <span className="text-pink-500/60 text-xs">✓</span>
          <span className="text-pink-400 text-lg sm:text-xl font-black">{p2Stats.correct}</span>
          <span className="text-pink-400 font-bold text-sm sm:text-base">Jogador 2</span>
        </motion.div>
      </div>

      {/* Round / Timer / Difficulty */}
      {gameState !== "idle" && (
        <div className="flex items-center justify-between gap-2 text-xs sm:text-sm">
          <span className="text-white/60 font-medium">
            Round {currentRound}/{TOTAL_ROUNDS}
          </span>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={cn("text-[10px] sm:text-xs", getDifficultyColor(problem?.difficulty ?? "Fácil"))}>
              {problem?.difficulty ?? "Fácil"}
            </Badge>
            <span className="flex items-center gap-1 text-white/60">
              <Timer className="w-3 h-3" />
              {Math.ceil(timeLeft)}s
            </span>
          </div>
        </div>
      )}

      {/* Timer bar */}
      {gameState === "playing" && (
        <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
          <motion.div
            className={cn("h-full rounded-full bg-gradient-to-r", timerBarColor)}
            initial={{ width: "100%" }}
            animate={{ width: `${timerPercent}%` }}
            transition={{ duration: 0.1, ease: "linear" }}
          />
        </div>
      )}

      {/* IDLE STATE */}
      <AnimatePresence mode="wait">
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

        {/* COUNTDOWN STATE */}
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

        {/* PLAYING STATE */}
        {gameState === "playing" && problem && (
          <motion.div
            key={"playing-" + currentRound}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col gap-4"
          >
            {/* Problem Display */}
            <motion.div
              className="bg-white/5 border border-white/10 rounded-2xl px-6 py-8 sm:py-10 text-center relative overflow-hidden"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-pink-500/5" />
              <p className="text-4xl sm:text-5xl font-black text-white relative z-10">
                {problem.expression} = ?
              </p>
            </motion.div>

            {/* Player Inputs - Desktop: side by side, Mobile: stacked */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-2">
              {/* Player 1 */}
              <motion.div
                className={cn(
                  "flex flex-col gap-2 rounded-xl p-4 border transition-colors",
                  p1Locked
                    ? "bg-green-500/10 border-green-500/30"
                    : "bg-cyan-950/20 border-cyan-500/20"
                )}
                animate={p1Wrong ? { x: [-8, 8, -6, 6, -3, 3, 0] } : {}}
                transition={{ duration: 0.4 }}
              >
                <label className="text-cyan-400 font-bold text-sm flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-400" />
                  Jogador 1
                  {p1Locked && <span className="text-green-400 text-xs ml-auto">✓ Correto!</span>}
                </label>
                <div className="flex gap-2">
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

              {/* Player 2 */}
              <motion.div
                className={cn(
                  "flex flex-col gap-2 rounded-xl p-4 border transition-colors",
                  p2Locked
                    ? "bg-green-500/10 border-green-500/30"
                    : "bg-pink-950/20 border-pink-500/20"
                )}
                animate={p2Wrong ? { x: [-8, 8, -6, 6, -3, 3, 0] } : {}}
                transition={{ duration: 0.4 }}
              >
                <label className="text-pink-400 font-bold text-sm flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-pink-400" />
                  Jogador 2
                  {p2Locked && <span className="text-green-400 text-xs ml-auto">✓ Correto!</span>}
                </label>
                <div className="flex gap-2">
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
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 gap-3 mt-1">
              <div className="flex items-center gap-3 text-xs text-white/40 px-2">
                <span className="text-cyan-400/70">Média: {p1AvgTime}s</span>
                <span>•</span>
                <span className="text-cyan-400/70">Streak: {p1Stats.streak}</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-white/40 px-2 justify-end">
                <span className="text-pink-400/70">Média: {p2AvgTime}s</span>
                <span>•</span>
                <span className="text-pink-400/70">Streak: {p2Stats.streak}</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* ROUND RESULT STATE */}
        {gameState === "roundResult" && roundResult && (
          <motion.div
            key={"result-" + currentRound}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex flex-col items-center gap-5 py-6"
          >
            {/* Show the problem with answer */}
            <div className="bg-white/5 border border-white/10 rounded-xl px-6 py-4 text-center">
              <p className="text-2xl sm:text-3xl font-black text-white/60">
                {problem?.expression} = {problem?.answer}
              </p>
            </div>

            {roundResult.timedOut ? (
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                className="text-center"
              >
                <p className="text-2xl font-black text-red-400">Tempo!</p>
                <p className="text-white/40 text-sm mt-1">Ninguém respondeu a tempo</p>
              </motion.div>
            ) : (
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 15 }}
                className="text-center"
              >
                <p
                  className={cn(
                    "text-3xl sm:text-4xl font-black",
                    roundResult.winner === 1 ? "text-cyan-400" : "text-pink-400"
                  )}
                >
                  {roundResult.winnerName} — Correto!
                </p>
                <p className="text-white/40 text-sm mt-2">
                  Resposta em {(roundResult.winner === 1 ? roundResult.p1Time : roundResult.p2Time)?.toFixed(1)}s
                </p>
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

        {/* GAME OVER STATE */}
        {gameState === "gameOver" && (
          <motion.div
            key="gameOver"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-5 py-6"
          >
            <h3 className="text-3xl sm:text-4xl font-black text-white">Fim do Jogo!</h3>

            <div className="grid grid-cols-2 gap-4 w-full max-w-md">
              {/* P1 Final Stats */}
              <motion.div
                className={cn(
                  "rounded-xl p-4 border text-center",
                  p1Stats.correct > p2Stats.correct
                    ? "bg-cyan-500/10 border-cyan-500/40 ring-2 ring-cyan-500/20"
                    : "bg-white/5 border-white/10"
                )}
                initial={{ x: -30, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <p className="text-cyan-400 font-bold text-sm">Jogador 1</p>
                <p className="text-4xl font-black text-white mt-2">{p1Stats.correct}</p>
                <p className="text-white/40 text-xs mt-1">acertos</p>
                <div className="mt-3 space-y-1 text-xs text-white/50">
                  <p>Média: {p1AvgTime}s</p>
                  <p>Melhor streak: {p1Stats.bestStreak}</p>
                </div>
              </motion.div>

              {/* P2 Final Stats */}
              <motion.div
                className={cn(
                  "rounded-xl p-4 border text-center",
                  p2Stats.correct > p1Stats.correct
                    ? "bg-pink-500/10 border-pink-500/40 ring-2 ring-pink-500/20"
                    : "bg-white/5 border-white/10"
                )}
                initial={{ x: 30, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <p className="text-pink-400 font-bold text-sm">Jogador 2</p>
                <p className="text-4xl font-black text-white mt-2">{p2Stats.correct}</p>
                <p className="text-white/40 text-xs mt-1">acertos</p>
                <div className="mt-3 space-y-1 text-xs text-white/50">
                  <p>Média: {p2AvgTime}s</p>
                  <p>Melhor streak: {p2Stats.bestStreak}</p>
                </div>
              </motion.div>
            </div>

            {/* Winner announcement */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.5, type: "spring" }}
            >
              {p1Stats.correct > p2Stats.correct ? (
                <p className="text-2xl font-black text-cyan-400">
                  🏆 Jogador 1 Venceu!
                </p>
              ) : p2Stats.correct > p1Stats.correct ? (
                <p className="text-2xl font-black text-pink-400">
                  🏆 Jogador 2 Venceu!
                </p>
              ) : (
                <p className="text-2xl font-black text-yellow-400">
                  🤝 Empate!
                </p>
              )}
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

      {/* Bottom controls (visible during play) */}
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