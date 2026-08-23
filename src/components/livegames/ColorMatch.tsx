import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import {
  RotateCcw,
  Timer,
  Palette,
  Flame,
  Trophy,
  CheckCircle,
  XCircle,
  Crown,
  Star,
  ChevronRight,
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

interface ScorePopup {
  id: number;
  player: 1 | 2;
  value: number;
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

const scorePopVariant = {
  initial: { opacity: 1, y: 0, scale: 0.5 },
  animate: {
    opacity: 0,
    y: -55,
    scale: 1.3,
    transition: { duration: 0.9, ease: "easeOut" },
  },
  exit: { opacity: 0 },
};

const correctRingPulse = {
  initial: { scale: 0.85, opacity: 0.9 },
  animate: {
    scale: [0.85, 1.25, 1],
    opacity: [0.9, 0.4, 0],
    transition: { duration: 0.6, ease: "easeOut" },
  },
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function ColorMatch({ onScore, liveCode }: Props) {
  /* state */
  const [phase, setPhase]                 = useState<GamePhase>("idle");
  const [round, setRound]                 = useState(1);
  const [p1Score, setP1Score]             = useState(0);
  const [p2Score, setP2Score]             = useState(0);
  const [p1Streak, setP1Streak]           = useState(0);
  const [p2Streak, setP2Streak]           = useState(0);
  const [p1MaxStreak, setP1MaxStreak]     = useState(0);
  const [p2MaxStreak, setP2MaxStreak]     = useState(0);
  const [roundData, setRoundData]         = useState<RoundData | null>(null);
  const [timerProgress, setTimerProgress] = useState(1);
  const [countdownVal, setCountdownVal]   = useState(3);
  const [lastWinner, setLastWinner]       = useState<1 | 2 | "timeout" | null>(null);
  const [lastCorrect, setLastCorrect]      = useState<string | null>(null);

  /* per-button feedback */
  const [p1Feedback, setP1Feedback] = useState<{ colorId: string; type: "correct" | "wrong" } | null>(null);
  const [p2Feedback, setP2Feedback] = useState<{ colorId: string; type: "correct" | "wrong" } | null>(null);
  const [feedbackTick, setFeedbackTick] = useState(0);

  /* score bounce trigger */
  const [p1Bounce, setP1Bounce] = useState(0);
  const [p2Bounce, setP2Bounce] = useState(0);

  /* floating score popups */
  const [scorePopups, setScorePopups] = useState<ScorePopup[]>([]);
  const popupIdRef = useRef(0);

  /* screen shake on wrong answer */
  const [screenShake, setScreenShake] = useState(0);

  /* red flash overlay on wrong answer */
  const [wrongFlash, setWrongFlash] = useState(0);

  /* bot mode */
  const [botMode, setBotMode]             = useState(false);
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
    setScorePopups([]);
    setScreenShake(0);
    setWrongFlash(0);
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
    const jitter = (Math.random() - 0.5) * cfg.reactionMs * 0.4;
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
        const bonus       = Math.min(newStreak, 5);
        const points      = 1 + bonus;

        if (isP1) {
          setP1Score((s) => s + points);
          setP1Streak(newStreak);
          setP1MaxStreak((m) => Math.max(m, newStreak));
          setP2Streak(0);
          setP1Bounce((b) => b + 1);
          setP1Feedback({ colorId, type: "correct" });
        } else {
          setP2Score((s) => s + points);
          setP2Streak(newStreak);
          setP2MaxStreak((m) => Math.max(m, newStreak));
          setP1Streak(0);
          setP2Bounce((b) => b + 1);
          setP2Feedback({ colorId, type: "correct" });
        }

        /* floating score popup */
        const pid = popupIdRef.current++;
        setScorePopups((prev) => [...prev, { id: pid, player, value: points }]);
        setTimeout(() => {
          setScorePopups((prev) => prev.filter((p) => p.id !== pid));
        }, 1000);

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
        setScreenShake((s) => s + 1);
        setWrongFlash((f) => f + 1);
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
        confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
        setTimeout(() => confetti({ particleCount: 60, angle: 60, spread: 55, origin: { x: 0 } }), 250);
        setTimeout(() => confetti({ particleCount: 60, angle: 120, spread: 55, origin: { x: 1 } }), 500);
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
  const timerUrgent   = phase === "playing" && timerProgress < 0.25;
  const timerCritical = phase === "playing" && timerProgress < 0.12;

  const timerGradient = useMemo(() => {
    if (timerProgress > 0.5)  return "from-green-500 to-emerald-400";
    if (timerProgress > 0.25) return "from-yellow-500 to-orange-400";
    return "from-red-500 to-rose-400";
  }, [timerProgress]);

  const winnerLabel = useMemo(() => {
    if (p1Score > p2Score) return { text: "Jogador 1 Venceu!", color: "text-cyan-400" };
    if (p2Score > p1Score) return { text: botMode ? "Computador Venceu!" : "Jogador 2 Venceu!", color: "text-pink-400" };
    return { text: "Empate!", color: "text-yellow-400" };
  }, [p1Score, p2Score, botMode]);

  /* confetti pieces for game over */
  const confettiPieces = useMemo(
    () =>
      Array.from({ length: 36 }, (_, i) => ({
        id: i,
        x: (Math.random() - 0.5) * 500,
        y: -(Math.random() * 350 + 80),
        rotate: Math.random() * 720 - 360,
        color: ALL_COLORS[Math.floor(Math.random() * ALL_COLORS.length)].hex,
        delay: Math.random() * 0.6,
        size: Math.random() * 8 + 4,
      })),
    [],
  );

  /* ================================================================ */
  /*  RENDER                                                          */
  /* ================================================================ */

  return (
    <motion.div
      className="relative flex min-h-[600px] w-full max-w-2xl flex-col items-center justify-center rounded-2xl border border-white/10 bg-gray-950 px-4 py-6 sm:px-6 overflow-hidden"
      animate={screenShake > 0 ? { x: [0, -5, 5, -3, 3, 0] } : { x: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* ---- Wrong-answer red flash overlay ---- */}
      <AnimatePresence>
        {wrongFlash > 0 && (
          <motion.div
            key={`flash-${wrongFlash}`}
            initial={{ opacity: 0.3 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="pointer-events-none absolute inset-0 z-30 rounded-2xl bg-red-500"
          />
        )}
      </AnimatePresence>

      {/* ---- Timer urgency vignette ---- */}
      <AnimatePresence>
        {timerUrgent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{
              opacity: timerCritical ? [0.5, 0.85, 0.5] : 0.5,
              transition: timerCritical
                ? { duration: 0.5, repeat: Infinity, ease: "easeInOut" }
                : { duration: 0.3 },
            }}
            exit={{ opacity: 0 }}
            className="pointer-events-none absolute inset-0 z-20 rounded-2xl"
            style={{
              background:
                "radial-gradient(ellipse at center, transparent 30%, rgba(239,68,68,0.18) 100%)",
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {/* ======================== IDLE ======================== */}
        {phase === "idle" && (
          <motion.div
            key="idle"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col items-center gap-6 text-center"
          >
            <motion.div
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="flex items-center gap-3"
            >
              <Palette className="h-12 w-12 text-purple-400 drop-shadow-[0_0_12px_rgba(168,85,247,0.5)]" />
              <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent sm:text-4xl">
                Cor versus Palavra
              </h1>
            </motion.div>

            <p className="max-w-md text-gray-400 text-sm leading-relaxed">
              A palavra mostrada estará escrita numa{" "}
              <span className="text-white font-semibold">COR diferente</span> do que diz.
              Você deve identificar a{" "}
              <span className="text-cyan-400 font-semibold">COR DA TINTA</span>, não a palavra!
              Dois jogadores competem — o mais rápido ganha o ponto.
            </p>

            <div className="flex flex-wrap justify-center gap-2">
              {ALL_COLORS.map((c, i) => (
                <motion.span
                  key={c.id}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.07, type: "spring", stiffness: 300 }}
                  className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium text-white shadow-md"
                  style={{ backgroundColor: c.hex }}
                >
                  {c.name}
                </motion.span>
              ))}
            </div>

            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                size="lg"
                onClick={startGame}
                className="mt-2 bg-gradient-to-r from-cyan-600 to-pink-600 hover:from-cyan-500 hover:to-pink-500 text-white font-bold px-8 text-lg shadow-lg shadow-purple-500/20 shadow-[0_0_25px_rgba(168,85,247,0.3)]"
              >
                Jogar
              </Button>
            </motion.div>
          </motion.div>
        )}

        {/* ======================== COUNTDOWN ======================== */}
        {phase === "countdown" && countdownVal > 0 && (
          <motion.div
            key={`cd-${countdownVal}`}
            variants={countPop as any}
            initial="initial"
            animate="animate"
            exit="exit"
            className="flex flex-col items-center gap-4"
          >
            <span className="text-8xl font-black text-white drop-shadow-[0_0_40px_rgba(168,85,247,0.7)]">
              {countdownVal}
            </span>
            <span className="text-gray-400 text-sm tracking-widest">Preparar...</span>
          </motion.div>
        )}

        {/* ======================== PLAYING / ROUND RESULT ======================== */}
        {(phase === "playing" || phase === "roundResult") && roundData && (
          <motion.div
            key={`round-${round}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex w-full flex-col items-center gap-4"
          >
            {/* --- Score Header --- */}
            <div className="flex w-full items-center justify-between rounded-xl bg-gradient-to-r from-cyan-900/30 to-pink-900/30 border border-cyan-500/20 px-3 py-2 sm:px-5 sm:py-3">
              {/* P1 score area */}
              <div className="flex items-center gap-2 relative">
                <Badge className="bg-cyan-600/80 text-white text-xs">P1</Badge>
                <div className="relative">
                  <motion.span
                    key={`p1s-${p1Bounce}`}
                    animate={{ y: [0, -14, 0] }}
                    transition={{ type: "spring", stiffness: 400, damping: 12 }}
                    className="text-xl font-bold text-cyan-300 inline-block"
                  >
                    {p1Score}
                  </motion.span>
                  {/* Floating score popups for P1 */}
                  <AnimatePresence>
                    {scorePopups
                      .filter((p) => p.player === 1)
                      .map((popup) => (
                        <motion.span
                          key={popup.id}
                          variants={scorePopVariant}
                          initial="initial"
                          animate="animate"
                          exit="exit"
                          className="absolute -top-2 left-1/2 -translate-x-1/2 text-sm font-black text-green-400 whitespace-nowrap pointer-events-none"
                        >
                          +{popup.value}
                        </motion.span>
                      ))}
                  </AnimatePresence>
                </div>
                {/* Streak indicator for P1 */}
                {p1Streak >= 2 && (
                  <motion.div
                    key={`p1st-${p1Streak}`}
                    initial={{ scale: 0.3, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 500, damping: 12 }}
                    className="flex items-center gap-0.5"
                  >
                    <Flame
                      className={cn(
                        "h-4 w-4",
                        p1Streak >= 5
                          ? "text-orange-400 drop-shadow-[0_0_6px_rgba(251,146,60,0.6)]"
                          : p1Streak >= 3
                            ? "text-yellow-400"
                            : "text-amber-300",
                      )}
                    />
                    <span
                      className={cn(
                        "text-xs font-black",
                        p1Streak >= 5
                          ? "text-orange-400"
                          : p1Streak >= 3
                            ? "text-yellow-400"
                            : "text-amber-300",
                      )}
                    >
                      {p1Streak}
                    </span>
                  </motion.div>
                )}
              </div>

              <span className="text-xs font-semibold tracking-widest text-gray-400 uppercase sm:text-sm">
                Cor vs Palavra
              </span>

              {/* P2 score area */}
              <div className="flex items-center gap-2 relative">
                {/* Streak indicator for P2 */}
                {p2Streak >= 2 && (
                  <motion.div
                    key={`p2st-${p2Streak}`}
                    initial={{ scale: 0.3, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 500, damping: 12 }}
                    className="flex items-center gap-0.5"
                  >
                    <Flame
                      className={cn(
                        "h-4 w-4",
                        p2Streak >= 5
                          ? "text-orange-400 drop-shadow-[0_0_6px_rgba(251,146,60,0.6)]"
                          : p2Streak >= 3
                            ? "text-yellow-400"
                            : "text-amber-300",
                      )}
                    />
                    <span
                      className={cn(
                        "text-xs font-black",
                        p2Streak >= 5
                          ? "text-orange-400"
                          : p2Streak >= 3
                            ? "text-yellow-400"
                            : "text-amber-300",
                      )}
                    >
                      {p2Streak}
                    </span>
                  </motion.div>
                )}
                <div className="relative">
                  <motion.span
                    key={`p2s-${p2Bounce}`}
                    animate={{ y: [0, -14, 0] }}
                    transition={{ type: "spring", stiffness: 400, damping: 12 }}
                    className="text-xl font-bold text-pink-300 inline-block"
                  >
                    {p2Score}
                  </motion.span>
                  {/* Floating score popups for P2 */}
                  <AnimatePresence>
                    {scorePopups
                      .filter((p) => p.player === 2)
                      .map((popup) => (
                        <motion.span
                          key={popup.id}
                          variants={scorePopVariant}
                          initial="initial"
                          animate="animate"
                          exit="exit"
                          className="absolute -top-2 left-1/2 -translate-x-1/2 text-sm font-black text-green-400 whitespace-nowrap pointer-events-none"
                        >
                          +{popup.value}
                        </motion.span>
                      ))}
                  </AnimatePresence>
                </div>
                <Badge className="bg-pink-600/80 text-white text-xs">P2</Badge>
              </div>
            </div>

            {/* --- Timer bar --- */}
            <div className="flex w-full items-center gap-3 text-xs text-gray-400 sm:text-sm">
              <span className="font-medium whitespace-nowrap">
                Round {round}/{TOTAL_ROUNDS}
              </span>

              <div className="relative h-3 flex-1 overflow-hidden rounded-full bg-gray-800">
                <motion.div
                  className={cn(
                    "absolute inset-y-0 left-0 rounded-full bg-gradient-to-r",
                    timerGradient,
                    timerUrgent && "shadow-[0_0_8px_rgba(239,68,68,0.6)]",
                  )}
                  animate={
                    timerUrgent
                      ? { width: `${timerProgress * 100}%`, opacity: [0.7, 1, 0.7] }
                      : { width: `${timerProgress * 100}%` }
                  }
                  transition={
                    timerUrgent
                      ? {
                          width: { ease: "linear", duration: 0.05 },
                          opacity: { duration: 0.5, repeat: Infinity },
                        }
                      : { ease: "linear", duration: 0.05 }
                  }
                />
              </div>

              <motion.div
                className="flex items-center gap-1 whitespace-nowrap"
                animate={timerCritical ? { scale: [1, 1.15, 1] } : {}}
                transition={timerCritical ? { duration: 0.4, repeat: Infinity } : {}}
              >
                <Timer className={cn("h-3.5 w-3.5", timerUrgent && "text-red-400")} />
                <span className={cn(timerUrgent && "text-red-400 font-bold")}>Vel. {speedLevel}</span>
              </motion.div>
            </div>

            {/* --- Word display --- */}
            <p className="text-sm text-gray-400 mt-1 sm:text-base">
              Qual a COR do texto?
            </p>

            <div className="flex min-h-[120px] w-full items-center justify-center rounded-2xl border border-white/5 bg-gray-900/60 px-8 py-6 sm:min-h-[140px]">
              <AnimatePresence mode="wait">
                <motion.span
                  key={`${roundData.word.id}-${roundData.inkColor.id}`}
                  variants={wordIn as any}
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

            {/* --- Round result banner --- */}
            <AnimatePresence>
              {phase === "roundResult" && lastWinner && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold shadow-lg",
                    lastWinner === "timeout" && "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30",
                    lastWinner === 1 && "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30",
                    lastWinner === 2 && "bg-pink-500/20 text-pink-300 border border-pink-500/30",
                  )}
                >
                  {lastWinner === "timeout" && <Timer className="h-4 w-4" />}
                  {(lastWinner === 1 || lastWinner === 2) && <CheckCircle className="h-4 w-4" />}
                  {lastWinner === "timeout" && "Tempo esgotado!"}
                  {lastWinner === 1 && "Jogador 1 \u2014 Correto!"}
                  {lastWinner === 2 && (botMode ? "Computador \u2014 Correto!" : "Jogador 2 \u2014 Correto!")}
                  {lastCorrect && (
                    <span className="text-gray-400 font-normal">(era {lastCorrect})</span>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* --- Color buttons --- */}
            <div className="flex w-full flex-col items-center gap-6 sm:flex-row sm:justify-center sm:gap-10">
              {/* Player 1 */}
              <div className="flex flex-col items-center gap-1">
                <span className="mb-1 text-xs font-bold text-cyan-400 tracking-widest">
                  JOGADOR 1
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {roundData.choices.map((c) => {
                    const fb = p1Feedback;
                    const isHit = fb?.colorId === c.id;
                    const isCorrectHit = isHit && fb?.type === "correct";
                    const isWrongHit = isHit && fb?.type === "wrong";
                    return (
                      <motion.button
                        key={`p1-${c.id}-${feedbackTick}`}
                        whileHover={phase === "playing" ? { scale: 1.08, y: -2 } : {}}
                        whileTap={phase === "playing" ? { scale: 0.88, y: 2 } : {}}
                        initial={isWrongHit ? { x: 0 } : isCorrectHit ? { scale: 1 } : {}}
                        animate={
                          isCorrectHit
                            ? { scale: [1, 1.2, 1], transition: { duration: 0.5 } }
                            : isWrongHit
                              ? { x: [0, -10, 10, -10, 10, 0], transition: { duration: 0.4 } }
                              : {}
                        }
                        onClick={() => handleAnswer(1, c.id)}
                        disabled={phase === "roundResult"}
                        className={cn(
                          "relative flex items-center justify-center gap-1.5 rounded-xl px-3 py-3 text-xs font-bold text-white sm:px-4 sm:py-3.5 sm:text-sm overflow-hidden",
                          c.tailwind,
                          "shadow-lg",
                          phase === "roundResult" && "opacity-60 cursor-not-allowed",
                          isCorrectHit && "ring-2 ring-green-400 ring-offset-2 ring-offset-gray-950",
                          isWrongHit && "ring-2 ring-red-500 ring-offset-2 ring-offset-gray-950",
                        )}
                      >
                        {/* Shine/gloss overlay */}
                        <div className="absolute inset-0 bg-gradient-to-b from-white/25 to-transparent pointer-events-none rounded-xl" />

                        {/* Correct expanding green ring */}
                        {isCorrectHit && (
                          <motion.div
                            variants={correctRingPulse}
                            initial="initial"
                            animate="animate"
                            className="absolute inset-0 rounded-xl border-2 border-green-400 pointer-events-none"
                          />
                        )}

                        {/* Feedback icon overlay */}
                        <AnimatePresence>
                          {isCorrectHit && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0 }}
                              transition={{ delay: 0.1 }}
                              className="absolute inset-0 flex items-center justify-center bg-green-500/30 rounded-xl z-20"
                            >
                              <CheckCircle className="h-6 w-6 text-white drop-shadow-lg" />
                            </motion.div>
                          )}
                          {isWrongHit && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0 }}
                              transition={{ delay: 0.05 }}
                              className="absolute inset-0 flex items-center justify-center bg-red-500/30 rounded-xl z-20"
                            >
                              <XCircle className="h-6 w-6 text-white drop-shadow-lg" />
                            </motion.div>
                          )}
                        </AnimatePresence>

                        <span
                          className="inline-block h-3.5 w-3.5 rounded-full border-2 border-white/60 sm:h-4 sm:w-4 relative z-10"
                          style={{ backgroundColor: c.hex }}
                        />
                        <span className="relative z-10">{c.name}</span>
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Player 2 */}
              <div className="flex flex-col items-center gap-1">
                <span className="mb-1 text-xs font-bold text-pink-400 tracking-widest">
                  {botMode ? "COMPUTADOR" : "JOGADOR 2"}
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {roundData.choices.map((c) => {
                    const fb = p2Feedback;
                    const isHit = fb?.colorId === c.id;
                    const isCorrectHit = isHit && fb?.type === "correct";
                    const isWrongHit = isHit && fb?.type === "wrong";
                    return (
                      <motion.button
                        key={`p2-${c.id}-${feedbackTick}`}
                        whileHover={phase === "playing" ? { scale: 1.08, y: -2 } : {}}
                        whileTap={phase === "playing" ? { scale: 0.88, y: 2 } : {}}
                        initial={isWrongHit ? { x: 0 } : isCorrectHit ? { scale: 1 } : {}}
                        animate={
                          isCorrectHit
                            ? { scale: [1, 1.2, 1], transition: { duration: 0.5 } }
                            : isWrongHit
                              ? { x: [0, -10, 10, -10, 10, 0], transition: { duration: 0.4 } }
                              : {}
                        }
                        onClick={() => handleAnswer(2, c.id)}
                        disabled={phase === "roundResult"}
                        className={cn(
                          "relative flex items-center justify-center gap-1.5 rounded-xl px-3 py-3 text-xs font-bold text-white sm:px-4 sm:py-3.5 sm:text-sm overflow-hidden",
                          c.tailwind,
                          "shadow-lg",
                          phase === "roundResult" && "opacity-60 cursor-not-allowed",
                          isCorrectHit && "ring-2 ring-green-400 ring-offset-2 ring-offset-gray-950",
                          isWrongHit && "ring-2 ring-red-500 ring-offset-2 ring-offset-gray-950",
                        )}
                      >
                        <div className="absolute inset-0 bg-gradient-to-b from-white/25 to-transparent pointer-events-none rounded-xl" />

                        {isCorrectHit && (
                          <motion.div
                            variants={correctRingPulse}
                            initial="initial"
                            animate="animate"
                            className="absolute inset-0 rounded-xl border-2 border-green-400 pointer-events-none"
                          />
                        )}

                        <AnimatePresence>
                          {isCorrectHit && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0 }}
                              transition={{ delay: 0.1 }}
                              className="absolute inset-0 flex items-center justify-center bg-green-500/30 rounded-xl z-20"
                            >
                              <CheckCircle className="h-6 w-6 text-white drop-shadow-lg" />
                            </motion.div>
                          )}
                          {isWrongHit && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0 }}
                              transition={{ delay: 0.05 }}
                              className="absolute inset-0 flex items-center justify-center bg-red-500/30 rounded-xl z-20"
                            >
                              <XCircle className="h-6 w-6 text-white drop-shadow-lg" />
                            </motion.div>
                          )}
                        </AnimatePresence>

                        <span
                          className="inline-block h-3.5 w-3.5 rounded-full border-2 border-white/60 sm:h-4 sm:w-4 relative z-10"
                          style={{ backgroundColor: c.hex }}
                        />
                        <span className="relative z-10">{c.name}</span>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* --- Next round button --- */}
            {phase === "roundResult" && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mt-2"
              >
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    onClick={advanceRound}
                    className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold px-6 shadow-lg shadow-purple-500/20 shadow-[0_0_20px_rgba(168,85,247,0.3)]"
                  >
                    {round >= TOTAL_ROUNDS ? "Ver Resultado" : (
                      <>
                        Próximo Round
                        <ChevronRight className="ml-1 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </motion.div>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* ======================== GAME OVER ======================== */}
        {phase === "gameOver" && (
          <motion.div
            key="gameOver"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex flex-col items-center gap-6 text-center relative z-10"
          >
            {/* Confetti particles */}
            {confettiPieces.map((piece) => (
              <motion.div
                key={piece.id}
                initial={{ opacity: 1, y: 150, x: 0, rotate: 0 }}
                animate={{
                  opacity: 0,
                  y: piece.y,
                  x: piece.x,
                  rotate: piece.rotate,
                  transition: { duration: 2.2, delay: piece.delay, ease: "easeOut" },
                }}
                className="absolute rounded-sm pointer-events-none"
                style={{
                  width: piece.size,
                  height: piece.size,
                  backgroundColor: piece.color,
                  top: "50%",
                  left: "50%",
                }}
              />
            ))}

            {/* Trophy / Star result icon */}
            <motion.div
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 12, delay: 0.1 }}
              className="relative"
            >
              {p1Score !== p2Score ? (
                <>
                  <Trophy
                    className={cn(
                      "h-16 w-16 drop-shadow-lg",
                      p1Score > p2Score
                        ? "text-cyan-400 drop-shadow-[0_0_20px_rgba(34,211,238,0.4)]"
                        : "text-pink-400 drop-shadow-[0_0_20px_rgba(244,114,182,0.4)]",
                    )}
                  />
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute -inset-2 rounded-full pointer-events-none"
                    style={{
                      background: p1Score > p2Score
                        ? "radial-gradient(circle, rgba(34,211,238,0.15) 0%, transparent 70%)"
                        : "radial-gradient(circle, rgba(244,114,182,0.15) 0%, transparent 70%)",
                    }}
                  />
                </>
              ) : (
                <Star className="h-16 w-16 text-yellow-400 drop-shadow-[0_0_20px_rgba(250,204,21,0.4)]" />
              )}
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="text-3xl font-black bg-gradient-to-r from-yellow-400 via-pink-400 to-purple-400 bg-clip-text text-transparent sm:text-4xl"
            >
              Fim de Jogo!
            </motion.h2>

            {/* Score comparison cards */}
            <div className="flex items-center gap-6 sm:gap-10">
              {/* P1 score card */}
              <motion.div
                initial={{ x: -40, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ type: "spring", delay: 0.3 }}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-xl px-6 py-4 border",
                  p1Score > p2Score
                    ? "bg-cyan-500/10 border-cyan-500/30 shadow-lg shadow-cyan-500/10"
                    : "bg-gray-800/50 border-gray-700/30",
                )}
              >
                {p1Score > p2Score && <Crown className="h-5 w-5 text-yellow-400 mb-1" />}
                <span className="text-xs font-bold text-cyan-400">Jogador 1</span>
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, delay: 0.4 }}
                  className={cn(
                    "text-4xl font-black",
                    p1Score > p2Score ? "text-cyan-300" : "text-gray-400",
                  )}
                >
                  {p1Score}
                </motion.span>
                <span className="text-xs text-gray-500">pontos</span>
              </motion.div>

              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-2xl font-bold text-gray-600"
              >
                vs
              </motion.span>

              {/* P2 score card */}
              <motion.div
                initial={{ x: 40, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ type: "spring", delay: 0.35 }}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-xl px-6 py-4 border",
                  p2Score > p1Score
                    ? "bg-pink-500/10 border-pink-500/30 shadow-lg shadow-pink-500/10"
                    : "bg-gray-800/50 border-gray-700/30",
                )}
              >
                {p2Score > p1Score && <Crown className="h-5 w-5 text-yellow-400 mb-1" />}
                <span className="text-xs font-bold text-pink-400">
                  {botMode ? "Computador" : "Jogador 2"}
                </span>
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, delay: 0.45 }}
                  className={cn(
                    "text-4xl font-black",
                    p2Score > p1Score ? "text-pink-300" : "text-gray-400",
                  )}
                >
                  {p2Score}
                </motion.span>
                <span className="text-xs text-gray-500">pontos</span>
              </motion.div>
            </div>

            {/* Score bar comparison */}
            <div className="w-full max-w-xs">
              <div className="flex h-4 overflow-hidden rounded-full bg-gray-800">
                {p1Score + p2Score > 0 && (
                  <>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(p1Score / (p1Score + p2Score)) * 100}%` }}
                      transition={{ duration: 0.8, delay: 0.5, ease: "easeOut" }}
                      className="bg-gradient-to-r from-cyan-500 to-cyan-400"
                    />
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(p2Score / (p1Score + p2Score)) * 100}%` }}
                      transition={{ duration: 0.8, delay: 0.5, ease: "easeOut" }}
                      className="bg-gradient-to-r from-pink-500 to-pink-400"
                    />
                  </>
                )}
              </div>
            </div>

            {/* Winner text */}
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className={cn("text-lg font-bold", winnerLabel.color)}
            >
              {winnerLabel.text}
            </motion.p>

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-3 text-xs text-gray-400">
              <div className="flex items-center gap-1.5 rounded-lg bg-gray-800/50 px-3 py-2 border border-gray-700/30">
                <Flame className="h-3.5 w-3.5 text-amber-400" />
                <span>Streak P1: <strong className="text-cyan-300">{p1MaxStreak}</strong></span>
              </div>
              <div className="flex items-center gap-1.5 rounded-lg bg-gray-800/50 px-3 py-2 border border-gray-700/30">
                <Flame className="h-3.5 w-3.5 text-amber-400" />
                <span>Streak P2: <strong className="text-pink-300">{p2MaxStreak}</strong></span>
              </div>
            </div>

            {/* Action buttons */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="flex gap-3 mt-2"
            >
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  onClick={goToMenu}
                  variant="outline"
                  className="border-gray-700 text-gray-300 hover:bg-gray-800"
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Menu
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  onClick={startGame}
                  className="bg-gradient-to-r from-cyan-600 to-pink-600 hover:from-cyan-500 hover:to-pink-500 text-white font-bold px-6 shadow-lg shadow-purple-500/20 shadow-[0_0_20px_rgba(168,85,247,0.3)]"
                >
                  Reiniciar Tudo
                </Button>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Live code badge */}
      {liveCode && (
        <Badge
          variant="outline"
          className="absolute top-3 right-3 border-gray-700 text-[10px] text-gray-500 z-40"
        >
          {liveCode}
        </Badge>
      )}
    </motion.div>
  );
}
