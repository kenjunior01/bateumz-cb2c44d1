import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RotateCcw, Timer, Palette, Bot } from "lucide-react";
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

interface ColorDef {
  id: string;
  name: string;
  hex: string;
  tailwind: string;
}

type GamePhase =
  | "idle"
  | "countdown"
  | "playing"
  | "roundResult"
  | "gameOver";

interface RoundData {
  word: ColorDef;
  inkColor: ColorDef;
  choices: ColorDef[];
}

type BotDifficulty = "facil" | "medio" | "dificil";

const BOT_CONFIG: Record<BotDifficulty, { reactionMs: number; wrongRate: number }> = {
  facil:  { reactionMs: 800, wrongRate: 0.20 },
  medio:  { reactionMs: 500, wrongRate: 0.08 },
  dificil: { reactionMs: 250, wrongRate: 0.02 },
};

/* ------------------------------------------------------------------ */
/*  Colour palette (Portuguese names)                                  */
/* ------------------------------------------------------------------ */

const ALL_COLORS: ColorDef[] = [
  { id: "vermelho", name: "Vermelho", hex: "#EF4444", tailwind: "bg-red-500" },
  { id: "azul",     name: "Azul",     hex: "#3B82F6", tailwind: "bg-blue-500" },
  { id: "verde",    name: "Verde",    hex: "#22C55E", tailwind: "bg-green-500" },
  { id: "amarelo",  name: "Amarelo",  hex: "#EAB308", tailwind: "bg-yellow-500" },
  { id: "roxo",     name: "Roxo",     hex: "#A855F7", tailwind: "bg-purple-500" },
  { id: "laranja",  name: "Laranja",  hex: "#F97316", tailwind: "bg-orange-500" },
];

const TOTAL_ROUNDS = 15;
const INITIAL_TIME_MS = 5000;
const MIN_TIME_MS = 2000;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function makeRound(): RoundData {
  const word = ALL_COLORS[Math.floor(Math.random() * ALL_COLORS.length)];
  let ink: ColorDef;
  do {
    ink = ALL_COLORS[Math.floor(Math.random() * ALL_COLORS.length)];
  } while (ink.id === word.id);
  const others = shuffle(ALL_COLORS.filter((c) => c.id !== ink.id)).slice(0, 3);
  return { word, inkColor: ink, choices: shuffle([ink, ...others]) };
}

function roundDuration(roundNum: number): number {
  const t = (roundNum - 1) / (TOTAL_ROUNDS - 1);
  return Math.round(INITIAL_TIME_MS - t * (INITIAL_TIME_MS - MIN_TIME_MS));
}

/* ------------------------------------------------------------------ */
/*  Animation variants                                                 */
/* ------------------------------------------------------------------ */

const wordIn = {
  hidden:  { scale: 0, opacity: 0, rotate: -12 },
  visible: { scale: 1, opacity: 1, rotate: 0, transition: { type: "spring", stiffness: 260, damping: 20 } },
  exit:    { scale: 0, opacity: 0, rotate: 12 },
};

const countPop = {
  initial: { scale: 0, opacity: 0 },
  animate: { scale: 1, opacity: 1, transition: { type: "spring", stiffness: 300, damping: 15 } },
  exit:    { scale: 2.5, opacity: 0, transition: { duration: 0.22 } },
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function ColorMatch({ onScore, liveCode }: Props) {
  /* state */
  const [phase, setPhase]               = useState<GamePhase>("idle");
  const [round, setRound]               = useState(1);
  const [p1Score, setP1Score]           = useState(0);
  const [p2Score, setP2Score]           = useState(0);
  const [p1Streak, setP1Streak]         = useState(0);
  const [p2Streak, setP2Streak]         = useState(0);
  const [p1MaxStreak, setP1MaxStreak]   = useState(0);
  const [p2MaxStreak, setP2MaxStreak]   = useState(0);
  const [roundData, setRoundData]       = useState<RoundData | null>(null);
  const [timerProgress, setTimerProgress] = useState(1);
  const [countdownVal, setCountdownVal] = useState(3);
  const [lastWinner, setLastWinner]     = useState<1 | 2 | "timeout" | null>(null);
  const [lastCorrect, setLastCorrect]    = useState<string | null>(null);

  /* per-button feedback – tracked via unique keys to force re-mount for animation */
  const [p1Feedback, setP1Feedback] = useState<{ colorId: string; type: "correct" | "wrong" } | null>(null);
  const [p2Feedback, setP2Feedback] = useState<{ colorId: string; type: "correct" | "wrong" } | null>(null);
  const [feedbackTick, setFeedbackTick] = useState(0);

  /* score bounce trigger */
  const [p1Bounce, setP1Bounce] = useState(0);
  const [p2Bounce, setP2Bounce] = useState(0);

  /* bot mode */
  const [botMode, setBotMode]         = useState(false);
  const [botDifficulty, setBotDifficulty] = useState<BotDifficulty>("medio");
  const botTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* refs */
  const timerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const lockedRef = useRef(false);

  /* cleanup */
  const clearTimers = useCallback(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    if (tickRef.current)  { clearInterval(tickRef.current);  tickRef.current = null; }
    if (botTimerRef.current) { clearTimeout(botTimerRef.current); botTimerRef.current = null; }
    lockedRef.current = false;
  }, []);

  useEffect(() => () => clearTimers(), [clearTimers]);

  /* ---- start / restart game ---- */
  const startGame = useCallback(() => {
    clearTimers();
    setP1Score(0); setP2Score(0);
    setP1Streak(0); setP2Streak(0);
    setP1MaxStreak(0); setP2MaxStreak(0);
    setRound(1); setCountdownVal(3);
    setLastWinner(null); setLastCorrect(null);
    setP1Feedback(null); setP2Feedback(null);
    setFeedbackTick(0);
    setP1Bounce(0); setP2Bounce(0);
    setPhase("countdown");
  }, [clearTimers]);

  /* ---- countdown tick ---- */
  useEffect(() => {
    if (phase !== "countdown") return;
    if (countdownVal <= 0) {
      const rd = makeRound();
      setRoundData(rd);
      setTimerProgress(1);
      setLastWinner(null);
      setLastCorrect(null);
      setP1Feedback(null); setP2Feedback(null);
      setFeedbackTick((t) => t + 1);
      lockedRef.current = false;
      setPhase("playing");
      return;
    }
    const id = setTimeout(() => setCountdownVal((v) => v - 1), 800);
    return () => clearTimeout(id);
  }, [phase, countdownVal]);

  /* ---- round timer (starts when phase goes to "playing") ---- */
  useEffect(() => {
    if (phase !== "playing") return;
    const dur = roundDuration(round);
    const t0 = performance.now();

    tickRef.current = setInterval(() => {
      const elapsed = performance.now() - t0;
      setTimerProgress(Math.max(0, 1 - elapsed / dur));
    }, 30);

    timerRef.current = setTimeout(() => {
      clearTimers();
      setLastWinner("timeout");
      setP1Streak(0); setP2Streak(0);
      setPhase("roundResult");
    }, dur);

    return () => clearTimers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, round]);


  /* ---- bot AI: trigger bot answer when playing ---- */
  useEffect(() => {
    if (phase !== "playing" || !botMode || !roundData) return;
    const cfg = BOT_CONFIG[botDifficulty];
    const jitter = (Math.random() - 0.5) * cfg.reactionMs * 0.4; // +-20% jitter
    const delay = Math.max(150, cfg.reactionMs + jitter);
    botTimerRef.current = setTimeout(() => {
      const isWrong = Math.random() < cfg.wrongRate;
      if (isWrong) {
        const wrongChoices = roundData.choices.filter(c => c.id !== roundData.inkColor.id);
        const pick = wrongChoices[Math.floor(Math.random() * wrongChoices.length)];
        handleAnswer(2, pick.id);
      } else {
        handleAnswer(2, roundData.inkColor.id);
      }
    }, delay);
    return () => { if (botTimerRef.current) { clearTimeout(botTimerRef.current); botTimerRef.current = null; } };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, roundData, botMode, botDifficulty]);

  /* ---- handle answer ---- */
  const handleAnswer = useCallback(
    (player: 1 | 2, colorId: string) => {
      if (lockedRef.current || phase !== "playing" || !roundData) return;

      const isCorrect = colorId === roundData.inkColor.id;

      if (isCorrect) {
        lockedRef.current = true;
        clearTimers();

        const isP1 = player === 1;
        const prevStreak = isP1 ? p1Streak : p2Streak;
        const newStreak  = prevStreak + 1;
        const bonus       = Math.min(newStreak, 5); // up to +5 streak bonus

        if (isP1) {
          setP1Score((s) => s + 1 + bonus);
          setP1Streak(newStreak);
          setP1MaxStreak((m) => Math.max(m, newStreak));
          setP2Streak(0);
          setP1Bounce((b) => b + 1);
          setP1Feedback({ colorId, type: "correct" });
        } else {
          setP2Score((s) => s + 1 + bonus);
          setP2Streak(newStreak);
          setP2MaxStreak((m) => Math.max(m, newStreak));
          setP1Streak(0);
          setP2Bounce((b) => b + 1);
          setP2Feedback({ colorId, type: "correct" });
        }

        setFeedbackTick((t) => t + 1);
        setLastWinner(player);
        setLastCorrect(roundData.inkColor.name);
        setPhase("roundResult");
      } else {
        const isP1 = player === 1;
        if (isP1) {
          setP1Score((s) => Math.max(0, s - 1));
          setP1Streak(0);
          setP1Bounce((b) => b + 1);
          setP1Feedback({ colorId, type: "wrong" });
        } else {
          setP2Score((s) => Math.max(0, s - 1));
          setP2Streak(0);
          setP2Bounce((b) => b + 1);
          setP2Feedback({ colorId, type: "wrong" });
        }
        setFeedbackTick((t) => t + 1);
      }
    },
    [phase, roundData, p1Streak, p2Streak, clearTimers],
  );

  /* ---- advance / finish ---- */
  const advanceRound = useCallback(() => {
    if (round >= TOTAL_ROUNDS) {
      setPhase("gameOver");
      if (p1Score !== p2Score) {
        const p2Name = botMode ? "Computador" : "Jogador 2";
        const winner = p1Score > p2Score ? "Jogador 1" : p2Name;
        onScore?.(winner, Math.max(p1Score, p2Score));
      }
    } else {
      setRound((r) => r + 1);
      setCountdownVal(3);
      setP1Feedback(null); setP2Feedback(null);
      setFeedbackTick((t) => t + 1);
      setPhase("countdown");
    }
  }, [round, p1Score, p2Score, onScore]);

  /* ---- back to menu ---- */
  const goToMenu = useCallback(() => {
    clearTimers();
    setPhase("idle");
  }, [clearTimers]);

  /* ---- derived ---- */
  const speedLevel = useMemo(() => Math.ceil((round / TOTAL_ROUNDS) * 10), [round]);
  const timerGradient = useMemo(() => {
    if (timerProgress > 0.5)  return "from-green-500 to-green-400";
    if (timerProgress > 0.25) return "from-yellow-500 to-orange-400";
    return "from-red-500 to-red-400";
  }, [timerProgress]);

  /* ================================================================ */
  /*  RENDER                                                          */
  /* ================================================================ */

  return (
    <div className="relative flex min-h-[600px] w-full max-w-2xl flex-col items-center justify-center rounded-2xl border border-white/10 bg-gray-950 px-4 py-6 sm:px-6">
      <AnimatePresence mode="wait">
        {phase === "idle" && (
          <motion.div
            key="idle"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col items-center gap-6 text-center"
          >
            <div className="flex items-center gap-3">
              <Palette className="h-10 w-10 text-purple-400" />
              <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-pink-400 bg-clip-text text-transparent">
                Cor versus Palavra
              </h1>
            </div>

            <p className="max-w-md text-gray-400 text-sm leading-relaxed">
              A palavra mostrada estará escrita numa{" "}
              <span className="text-white font-semibold">COR diferente</span> do que diz.
              Você deve identificar a{" "}
              <span className="text-cyan-400 font-semibold">COR DA TINTA</span>, não a palavra!
              Dois jogadores competem — o mais rápido ganha o ponto.
            </p>

            <div className="flex flex-wrap justify-center gap-2">
              {ALL_COLORS.map((c) => (
                <span
                  key={c.id}
                  className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium text-white"
                  style={{ backgroundColor: c.hex }}
                >
                  {c.name}
                </span>
              ))}
            </div>

            <Button
              size="lg"
              onClick={startGame}
              className="mt-2 bg-gradient-to-r from-cyan-600 to-pink-600 hover:from-cyan-500 hover:to-pink-500 text-white font-bold px-8 text-lg"
            >
              Jogar
            </Button>
          </motion.div>
        )}

        {phase === "countdown" && countdownVal > 0 && (
          <motion.div
            key={`cd-${countdownVal}`}
            variants={countPop}
            initial="initial"
            animate="animate"
            exit="exit"
            className="flex flex-col items-center gap-4"
          >
            <span className="text-8xl font-black text-white drop-shadow-[0_0_30px_rgba(168,85,247,0.6)]">
              {countdownVal}
            </span>
            <span className="text-gray-400 text-sm">Preparar...</span>
          </motion.div>
        )}

        {(phase === "playing" || phase === "roundResult") && roundData && (
          <motion.div
            key={`round-${round}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex w-full flex-col items-center gap-4"
          >
            <div className="flex w-full items-center justify-between rounded-xl bg-gradient-to-r from-cyan-900/30 to-pink-900/30 border border-cyan-500/20 px-3 py-2 sm:px-5 sm:py-3">
              <div className="flex items-center gap-2">
                <Badge className="bg-cyan-600/80 text-white text-xs">P1</Badge>
                <motion.span
                  key={`p1s-${p1Bounce}`}
                  animate={{ y: [0, -14, 0] }}
                  transition={{ type: "spring", stiffness: 400, damping: 12 }}
                  className="text-xl font-bold text-cyan-300"
                >
                  {p1Score}
                </motion.span>
                {p1Streak >= 2 && (
                  <motion.span
                    key={`p1st-${p1Streak}`}
                    initial={{ scale: 0.5 }}
                    animate={{ scale: 1 }}
                    className="text-sm"
                  >
                    🔥{p1Streak}
                  </motion.span>
                )}
              </div>

              <span className="text-xs font-semibold tracking-widest text-gray-400 uppercase sm:text-sm">
                Cor vs Palavra
              </span>

              <div className="flex items-center gap-2">
                {p2Streak >= 2 && (
                  <motion.span
                    key={`p2st-${p2Streak}`}
                    initial={{ scale: 0.5 }}
                    animate={{ scale: 1 }}
                    className="text-sm"
                  >
                    🔥{p2Streak}
                  </motion.span>
                )}
                <motion.span
                  key={`p2s-${p2Bounce}`}
                  animate={{ y: [0, -14, 0] }}
                  transition={{ type: "spring", stiffness: 400, damping: 12 }}
                  className="text-xl font-bold text-pink-300"
                >
                  {p2Score}
                </motion.span>
                <Badge className="bg-pink-600/80 text-white text-xs">P2</Badge>
              </div>
            </div>

            <div className="flex w-full items-center gap-3 text-xs text-gray-400 sm:text-sm">
              <span className="font-medium whitespace-nowrap">
                Round {round}/{TOTAL_ROUNDS}
              </span>

              <div className="relative h-3 flex-1 overflow-hidden rounded-full bg-gray-800">
                <motion.div
                  className={cn("absolute inset-y-0 left-0 rounded-full bg-gradient-to-r", timerGradient)}
                  animate={{ width: `${timerProgress * 100}%` }}
                  transition={{ ease: "linear", duration: 0.05 }}
                />
              </div>

              <div className="flex items-center gap-1 whitespace-nowrap">
                <Timer className="h-3.5 w-3.5" />
                <span>Vel. {speedLevel}</span>
              </div>
            </div>

            <p className="text-sm text-gray-400 mt-1 sm:text-base">
              Qual a COR do texto?
            </p>

            <div className="flex min-h-[120px] w-full items-center justify-center rounded-2xl border border-white/5 bg-gray-900/60 px-8 py-6 sm:min-h-[140px]">
              <AnimatePresence mode="wait">
                <motion.span
                  key={`${roundData.word.id}-${roundData.inkColor.id}`}
                  variants={wordIn}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="select-none text-5xl font-black tracking-wider sm:text-7xl"
                  style={{ color: roundData.inkColor.hex }}
                >
                  {roundData.word.name}
                </motion.span>
              </AnimatePresence>
            </div>

            <AnimatePresence>
              {phase === "roundResult" && lastWinner && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={cn(
                    "rounded-lg px-4 py-2 text-sm font-bold",
                    lastWinner === "timeout" && "bg-yellow-500/20 text-yellow-300",
                    lastWinner === 1 && "bg-cyan-500/20 text-cyan-300",
                    lastWinner === 2 && "bg-pink-500/20 text-pink-300",
                  )}
                >
                  {lastWinner === "timeout" && "Tempo esgotado!"}
                  {lastWinner === 1 && "Jogador 1 — Correto! ✅"}
                  {lastWinner === 2 && "Jogador 2 — Correto! ✅"}
                  {lastCorrect && (
                    <span className="ml-1 text-gray-400">(era {lastCorrect})</span>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex w-full flex-col items-center gap-6 sm:flex-row sm:justify-center sm:gap-10">
              <div className="flex flex-col items-center gap-1">
                <span className="mb-1 text-xs font-bold text-cyan-400 tracking-widest">
                  JOGADOR 1
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {roundData.choices.map((c) => {
                    const fb = p1Feedback;
                    const isHit = fb?.colorId === c.id;
                    return (
                      <motion.button
                        key={`p1-${c.id}-${feedbackTick}`}
                        whileTap={{ scale: 0.92 }}
                        initial={
                          isHit && fb?.type === "correct"
                            ? { scale: 1 }
                            : isHit && fb?.type === "wrong"
                              ? { x: 0 }
                              : {}
                        }
                        animate={
                          isHit && fb?.type === "correct"
                            ? {
                                scale: [1, 1.18, 1],
                                boxShadow: [
                                  "0 0 0 0 rgba(34,197,94,0)",
                                  "0 0 0 12px rgba(34,197,94,0.6)",
                                  "0 0 0 0 rgba(34,197,94,0)",
                                ],
                                transition: { duration: 0.45 },
                              }
                            : isHit && fb?.type === "wrong"
                              ? {
                                  x: [0, -10, 10, -10, 10, 0],
                                  transition: { duration: 0.4 },
                                }
                            : {}
                        }
                        onClick={() => handleAnswer(1, c.id)}
                        disabled={phase === "roundResult"}
                        className={cn(
                          "flex items-center justify-center gap-1.5 rounded-xl px-3 py-3 text-xs font-bold text-white shadow-lg transition-opacity sm:px-4 sm:py-3.5 sm:text-sm",
                          c.tailwind,
                          phase === "roundResult" && "opacity-60 cursor-not-allowed",
                          isHit && fb?.type === "correct" && "ring-3 ring-green-400",
                          isHit && fb?.type === "wrong" && "ring-3 ring-red-500",
                        )}
                      >
                        <span
                          className="inline-block h-3.5 w-3.5 rounded-full border-2 border-white/60 sm:h-4 sm:w-4"
                          style={{ backgroundColor: c.hex }}
                        />
                        {c.name}
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-col items-center gap-1">
                <span className="mb-1 text-xs font-bold text-pink-400 tracking-widest">
                  JOGADOR 2
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {roundData.choices.map((c) => {
                    const fb = p2Feedback;
                    const isHit = fb?.colorId === c.id;
                    return (
                      <motion.button
                        key={`p2-${c.id}-${feedbackTick}`}
                        whileTap={{ scale: 0.92 }}
                        initial={
                          isHit && fb?.type === "correct"
                            ? { scale: 1 }
                            : isHit && fb?.type === "wrong"
                              ? { x: 0 }
                              : {}
                        }
                        animate={
                          isHit && fb?.type === "correct"
                            ? {
                                scale: [1, 1.18, 1],
                                boxShadow: [
                                  "0 0 0 0 rgba(34,197,94,0)",
                                  "0 0 0 12px rgba(34,197,94,0.6)",
                                  "0 0 0 0 rgba(34,197,94,0)",
                                ],
                                transition: { duration: 0.45 },
                              }
                            : isHit && fb?.type === "wrong"
                              ? {
                                  x: [0, -10, 10, -10, 10, 0],
                                  transition: { duration: 0.4 },
                                }
                            : {}
                        }
                        onClick={() => handleAnswer(2, c.id)}
                        disabled={phase === "roundResult"}
                        className={cn(
                          "flex items-center justify-center gap-1.5 rounded-xl px-3 py-3 text-xs font-bold text-white shadow-lg transition-opacity sm:px-4 sm:py-3.5 sm:text-sm",
                          c.tailwind,
                          phase === "roundResult" && "opacity-60 cursor-not-allowed",
                          isHit && fb?.type === "correct" && "ring-3 ring-green-400",
                          isHit && fb?.type === "wrong" && "ring-3 ring-red-500",
                        )}
                      >
                        <span
                          className="inline-block h-3.5 w-3.5 rounded-full border-2 border-white/60 sm:h-4 sm:w-4"
                          style={{ backgroundColor: c.hex }}
                        />
                        {c.name}
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            </div>

            {phase === "roundResult" && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-2"
              >
                <Button
                  onClick={advanceRound}
                  className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold px-6"
                >
                  {round >= TOTAL_ROUNDS ? "Ver Resultado" : "Próximo Round →"}
                </Button>
              </motion.div>
            )}
          </motion.div>
        )}

        {phase === "gameOver" && (
          <motion.div
            key="gameOver"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-6 text-center"
          >
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 0.6, repeat: 2 }}
            >
              <Palette className="h-14 w-14 text-purple-400" />
            </motion.div>

            <h2 className="text-3xl font-black bg-gradient-to-r from-yellow-400 to-pink-400 bg-clip-text text-transparent">
              Fim de Jogo!
            </h2>

            <div className="flex items-center gap-8">
              <div className="flex flex-col items-center gap-1">
                <span className="text-xs font-bold text-cyan-400">Jogador 1</span>
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", delay: 0.2 }}
                  className="text-4xl font-black text-cyan-300"
                >
                  {p1Score}
                </motion.span>
                <span className="text-xs text-gray-500">pontos</span>
              </div>

              <span className="text-2xl font-bold text-gray-600">vs</span>

              <div className="flex flex-col items-center gap-1">
                <span className="text-xs font-bold text-pink-400">Jogador 2</span>
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", delay: 0.35 }}
                  className="text-4xl font-black text-pink-300"
                >
                  {p2Score}
                </motion.span>
                <span className="text-xs text-gray-500">pontos</span>
              </div>
            </div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className={cn(
                "text-lg font-bold",
                p1Score > p2Score && "text-cyan-400",
                p2Score > p1Score && "text-pink-400",
                p1Score === p2Score && "text-yellow-400",
              )}
            >
              {p1Score > p2Score && "🏆 Jogador 1 Venceu!"}
              {p2Score > p1Score && "🏆 Jogador 2 Venceu!"}
              {p1Score === p2Score && "🤝 Empate!"}
            </motion.p>

            <div className="flex gap-4 text-xs text-gray-400">
              <span>Maior streak P1: 🔥{p1MaxStreak}</span>
              <span>Maior streak P2: 🔥{p2MaxStreak}</span>
            </div>

            <div className="flex gap-3 mt-2">
              <Button
                onClick={goToMenu}
                variant="outline"
                className="border-gray-700 text-gray-300 hover:bg-gray-800"
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Menu
              </Button>
              <Button
                onClick={startGame}
                className="bg-gradient-to-r from-cyan-600 to-pink-600 hover:from-cyan-500 hover:to-pink-500 text-white font-bold px-6"
              >
                Reiniciar Tudo
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {liveCode && (
        <Badge
          variant="outline"
          className="absolute top-3 right-3 border-gray-700 text-[10px] text-gray-500"
        >
          {liveCode}
        </Badge>
      )}
    </div>
  );
}
