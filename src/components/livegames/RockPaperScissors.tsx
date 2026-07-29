import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { RotateCcw, Coins, Bot } from "lucide-react";

interface Props {
  onScore?: (name: string, score: number) => void;
  liveCode?: string;
}

type Choice = "rock" | "paper" | "scissors";
type GameMode = "1v1" | "bot";
type GamePhase = "choosing" | "reveal" | "roundResult" | "gameOver";
type BetAmount = 0 | 10 | 25 | 50 | 100;

const CHOICES: { id: Choice; emoji: string; label: string }[] = [
  { id: "rock", emoji: "\u270a", label: "Pedra" },
  { id: "paper", emoji: "\u270b", label: "Papel" },
  { id: "scissors", emoji: "\u270c\ufe0f", label: "Tesoura" },
];

const BET_OPTIONS: BetAmount[] = [0, 10, 25, 50, 100];

type RoundResult = "p1" | "p2" | "draw";

function determineWinner(p1: Choice, p2: Choice): RoundResult {
  if (p1 === p2) return "draw";
  if (
    (p1 === "rock" && p2 === "scissors") ||
    (p1 === "paper" && p2 === "rock") ||
    (p1 === "scissors" && p2 === "paper")
  ) {
    return "p1";
  }
  return "p2";
}

function getBotChoice(): Choice {
  const r = Math.random();
  if (r < 1 / 3) return "rock";
  if (r < 2 / 3) return "paper";
  return "scissors";
}

export default function RockPaperScissors({ onScore, liveCode }: Props) {
  const [mode, setMode] = useState<GameMode>("bot");
  const [bestOf, setBestOf] = useState<3 | 5 | 7>(3);
  const [phase, setPhase] = useState<GamePhase>("choosing");
  const [p1Choice, setP1Choice] = useState<Choice | null>(null);
  const [p2Choice, setP2Choice] = useState<Choice | null>(null);
  const [p1Revealed, setP1Revealed] = useState(false);
  const [p2Revealed, setP2Revealed] = useState(false);
  const [p1Score, setP1Score] = useState(0);
  const [p2Score, setP2Score] = useState(0);
  const [round, setRound] = useState(1);
  const [roundResult, setRoundResult] = useState<RoundResult | null>(null);
  const [p2Choosing, setP2Choosing] = useState(false);
  const [bet, setBet] = useState<BetAmount>(0);
  const [p1Streak, setP1Streak] = useState(0);
  const [p2Streak, setP2Streak] = useState(0);
  const [lastWinner, setLastWinner] = useState<"p1" | "p2" | null>(null);

  const winsNeeded = Math.ceil(bestOf / 2);
  const p2Label = mode === "bot" ? "Bot" : "Jogador 2";

  const resetAll = useCallback(() => {
    setPhase("choosing");
    setP1Choice(null);
    setP2Choice(null);
    setP1Revealed(false);
    setP2Revealed(false);
    setP1Score(0);
    setP2Score(0);
    setRound(1);
    setRoundResult(null);
    setP2Choosing(false);
    setP1Streak(0);
    setP2Streak(0);
    setLastWinner(null);
  }, []);

  const nextRound = useCallback(() => {
    if (p1Score >= winsNeeded || p2Score >= winsNeeded) {
      const winnerName = p1Score >= winsNeeded ? "Jogador 1" : p2Label;
      const winnerScore = Math.max(p1Score, p2Score);
      onScore?.(winnerName, winnerScore);
      setPhase("gameOver");
      return;
    }
    setPhase("choosing");
    setP1Choice(null);
    setP2Choice(null);
    setP1Revealed(false);
    setP2Revealed(false);
    setRoundResult(null);
    setP2Choosing(false);
    setRound((r) => r + 1);
  }, [p1Score, p2Score, winsNeeded, p2Label, onScore]);

  const handleP1Choice = useCallback(
    (choice: Choice) => {
      if (phase !== "choosing") return;
      setP1Choice(choice);

      if (mode === "bot") {
        const botPick = getBotChoice();
        setP2Choice(botPick);
        setP2Choosing(true);
        setTimeout(() => {
          setP2Choosing(false);
        }, 400);
      } else {
        setP2Choosing(true);
      }
    },
    [phase, mode]
  );

  const handleP2Choice = useCallback(
    (choice: Choice) => {
      if (phase !== "choosing" || !p1Choice || mode === "bot") return;
      setP2Choice(choice);
      setP2Choosing(false);
    },
    [phase, p1Choice, mode]
  );

  const handleReveal = useCallback(() => {
    if (!p1Choice || !p2Choice) return;
    setPhase("reveal");
    setP1Revealed(false);
    setP2Revealed(false);

    setTimeout(() => setP1Revealed(true), 200);
    setTimeout(() => setP2Revealed(true), 600);

    setTimeout(() => {
      const result = determineWinner(p1Choice, p2Choice);
      setRoundResult(result);

      if (result === "p1") {
        setP1Score((s) => s + 1);
        setP1Streak((s) => s + 1);
        setP2Streak(0);
        setLastWinner("p1");
      } else if (result === "p2") {
        setP2Score((s) => s + 1);
        setP2Streak((s) => s + 1);
        setP1Streak(0);
        setLastWinner("p2");
      } else {
        setP1Streak(0);
        setP2Streak(0);
        setLastWinner(null);
      }
      setPhase("roundResult");
    }, 1200);
  }, [p1Choice, p2Choice]);

  const switchMode = useCallback(
    (newMode: GameMode) => {
      setMode(newMode);
      resetAll();
    },
    [resetAll]
  );

  const changeBestOf = useCallback(
    (val: 3 | 5 | 7) => {
      setBestOf(val);
      resetAll();
    },
    [resetAll]
  );

  useEffect(() => {
    if (phase === "roundResult") {
      if (p1Score >= winsNeeded || p2Score >= winsNeeded) {
        const winnerName = p1Score >= winsNeeded ? "Jogador 1" : p2Label;
        const winnerScore = Math.max(p1Score, p2Score);
        onScore?.(winnerName, winnerScore);
        setPhase("gameOver");
      }
    }
  }, [phase, p1Score, p2Score, winsNeeded, p2Label, onScore]);

  const canReveal = p1Choice !== null && p2Choice !== null && phase === "choosing";
  const isGameOver = phase === "gameOver";
  const gameWinner = isGameOver
    ? p1Score >= winsNeeded
      ? "p1"
      : "p2"
    : null;

  const p1Winning = isGameOver && gameWinner === "p1";
  const p2Winning = isGameOver && gameWinner === "p2";

  const p1ChoiceData = p1Choice ? CHOICES.find((c) => c.id === p1Choice) : null;
  const p2ChoiceData = p2Choice ? CHOICES.find((c) => c.id === p2Choice) : null;

  return (
    <div className="w-full max-w-3xl mx-auto space-y-4 bg-slate-900 rounded-2xl p-4 sm:p-6 border border-slate-700/50">
      <div className="bg-gradient-to-r from-cyan-900/30 to-pink-900/30 border border-cyan-500/20 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <motion.div
            className="text-center flex-1"
            animate={{
              scale: p1Winning ? [1, 1.1, 1] : 1,
            }}
            transition={{ repeat: p1Winning ? Infinity : 0, duration: 0.6 }}
          >
            <p className="text-cyan-400 text-xs sm:text-sm font-semibold tracking-wide uppercase">
              Jogador 1
            </p>
            <motion.p
              key={p1Score}
              initial={{ scale: 1.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className={cn(
                "text-3xl sm:text-4xl font-bold",
                p1Winning ? "text-cyan-300" : "text-white"
              )}
            >
              {p1Score}
            </motion.p>
            {p1Streak >= 2 && (
              <Badge className="mt-1 bg-orange-600/80 text-white text-xs border-0">
                \ud83d\udd25 {p1Streak}
              </Badge>
            )}
          </motion.div>

          <div className="flex flex-col items-center px-2">
            <span className="text-slate-400 text-xs">Round {round}</span>
            <span className="text-slate-300 font-bold text-lg">\u2694\ufe0f</span>
            <span className="text-slate-500 text-xs">
              Melhor de {bestOf}
            </span>
          </div>

          <motion.div
            className="text-center flex-1"
            animate={{
              scale: p2Winning ? [1, 1.1, 1] : 1,
            }}
            transition={{ repeat: p2Winning ? Infinity : 0, duration: 0.6 }}
          >
            <p className="text-pink-400 text-xs sm:text-sm font-semibold tracking-wide uppercase flex items-center justify-center gap-1">
              {mode === "bot" && <Bot className="w-3.5 h-3.5" />}
              {p2Label}
            </p>
            <motion.p
              key={p2Score}
              initial={{ scale: 1.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className={cn(
                "text-3xl sm:text-4xl font-bold",
                p2Winning ? "text-pink-300" : "text-white"
              )}
            >
              {p2Score}
            </motion.p>
            {p2Streak >= 2 && (
              <Badge className="mt-1 bg-orange-600/80 text-white text-xs border-0">
                \ud83d\udd25 {p2Streak}
              </Badge>
            )}
          </motion.div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex rounded-lg overflow-hidden border border-slate-700">
          <button
            onClick={() => switchMode("1v1")}
            className={cn(
              "px-3 py-1.5 text-xs font-medium transition-colors",
              mode === "1v1"
                ? "bg-cyan-600 text-white"
                : "bg-slate-800 text-slate-400 hover:text-slate-200"
            )}
          >
            1v1
          </button>
          <button
            onClick={() => switchMode("bot")}
            className={cn(
              "px-3 py-1.5 text-xs font-medium transition-colors flex items-center gap-1",
              mode === "bot"
                ? "bg-pink-600 text-white"
                : "bg-slate-800 text-slate-400 hover:text-slate-200"
            )}
          >
            <Bot className="w-3 h-3" /> Bot
          </button>
        </div>

        <div className="flex items-center gap-1">
          <span className="text-slate-500 text-xs mr-1">Melhor de</span>
          {([3, 5, 7]).map((val) => (
            <button
              key={val}
              onClick={() => changeBestOf(val)}
              disabled={phase !== "choosing" && phase !== "gameOver"}
              className={cn(
                "w-7 h-7 rounded text-xs font-bold transition-colors",
                bestOf === val
                  ? "bg-slate-600 text-white"
                  : "bg-slate-800 text-slate-500 hover:text-slate-300"
              )}
            >
              {val}
            </button>
          ))}
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={resetAll}
          className="text-slate-400 hover:text-white hover:bg-slate-800"
        >
          <RotateCcw className="w-3.5 h-3.5 mr-1" />
          Reiniciar Tudo
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Coins className="w-4 h-4 text-yellow-500" />
        <span className="text-slate-400 text-xs">Aposta:</span>
        {BET_OPTIONS.map((amount) => (
          <button
            key={amount}
            onClick={() => (bet === amount ? setBet(0) : setBet(amount))}
            disabled={phase !== "choosing"}
            className={cn(
              "px-2 py-0.5 rounded text-xs font-medium transition-colors border",
              bet === amount
                ? "bg-yellow-600/30 border-yellow-500/50 text-yellow-300"
                : "bg-slate-800 border-slate-700 text-slate-500 hover:text-slate-300"
            )}
          >
            {amount === 0 ? "\u2014" : amount}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] gap-2 sm:gap-4 items-start">
        <div
          className={cn(
            "flex flex-col items-center gap-3 transition-all duration-500 rounded-xl p-3",
            phase === "roundResult" && roundResult === "p1" &&
              "bg-cyan-400/5 shadow-lg shadow-cyan-400/20",
            phase === "roundResult" && roundResult === "p2" && "opacity-40",
            isGameOver && p1Winning &&
              "bg-cyan-400/10 shadow-lg shadow-cyan-400/30",
            isGameOver && p2Winning && "opacity-40"
          )}
        >
          <div className="relative">
            <AnimatePresence mode="wait">
              {p1Revealed && p1ChoiceData ? (
                <motion.div
                  key="revealed-p1"
                  initial={{ rotateY: 90, scale: 0.5, opacity: 0 }}
                  animate={{ rotateY: 0, scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15 }}
                  className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-2 border-cyan-400/50 bg-slate-800 flex items-center justify-center text-5xl sm:text-6xl"
                >
                  {p1ChoiceData.emoji}
                </motion.div>
              ) : p1Choice ? (
                <motion.div
                  key="hidden-p1"
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-2 border-cyan-400/30 bg-slate-800 flex items-center justify-center"
                >
                  <motion.div
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{
                      repeat: Infinity,
                      duration: 2,
                      ease: "easeInOut",
                    }}
                    className="text-4xl sm:text-5xl"
                  >
                    \u2753
                  </motion.div>
                </motion.div>
              ) : (
                <motion.div
                  key="empty-p1"
                  className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-2 border-dashed border-slate-600 bg-slate-800/50 flex items-center justify-center text-slate-600 text-3xl sm:text-4xl"
                >
                  ?
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex gap-2">
            {CHOICES.map((choice) => {
              const isSelected = p1Choice === choice.id;
              const isDisabled =
                phase !== "choosing" ||
                p2Choosing ||
                (mode === "1v1" && p1Choice !== null);
              return (
                <motion.button
                  key={choice.id}
                  whileHover={isDisabled ? {} : { scale: 1.15, y: -4 }}
                  whileTap={isDisabled ? {} : { scale: 0.9 }}
                  onClick={() => handleP1Choice(choice.id)}
                  disabled={isDisabled}
                  className={cn(
                    "w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-slate-800 border text-2xl sm:text-3xl flex items-center justify-center transition-colors",
                    isSelected
                      ? "border-cyan-400 ring-2 ring-cyan-400 shadow-lg shadow-cyan-400/30"
                      : "border-slate-700 hover:border-cyan-500/50",
                    isDisabled && "opacity-40 cursor-not-allowed"
                  )}
                >
                  {choice.emoji}
                </motion.button>
              );
            })}
          </div>
          <p className="text-cyan-400 text-xs font-medium">
            {p1Choice ? p1ChoiceData?.label : "Escolher"}
          </p>
        </div>

        <div className="flex flex-col items-center justify-center gap-3 self-center">
          <motion.span
            animate={
              phase === "roundResult" && roundResult !== "draw"
                ? { scale: [1, 1.3, 1] }
                : {}
            }
            transition={{ repeat: 1, duration: 0.5 }}
            className="text-3xl sm:text-4xl font-black text-slate-500"
          >
            VS
          </motion.span>

          <AnimatePresence mode="wait">
            {phase === "choosing" && canReveal && (
              <motion.div
                key="reveal-btn"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <Button
                  onClick={handleReveal}
                  className="bg-gradient-to-r from-cyan-600 to-pink-600 hover:from-cyan-500 hover:to-pink-500 text-white font-bold shadow-lg"
                >
                  Revelar
                </Button>
              </motion.div>
            )}

            {phase === "roundResult" && (
              <motion.div
                key="round-result"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                className="flex flex-col items-center gap-2"
              >
                {roundResult === "draw" ? (
                  <motion.p
                    initial={{ scale: 0.5 }}
                    animate={{ scale: 1 }}
                    className="text-yellow-400 font-bold text-lg"
                  >
                    Empate!
                  </motion.p>
                ) : (
                  <motion.p
                    initial={{ scale: 0.5 }}
                    animate={{ scale: 1 }}
                    className={cn(
                      "font-bold text-lg",
                      roundResult === "p1" ? "text-cyan-400" : "text-pink-400"
                    )}
                  >
                    {roundResult === "p1" ? "Jogador 1" : p2Label} Venceu!
                  </motion.p>
                )}
                {bet > 0 && roundResult !== "draw" && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-1 text-yellow-400 text-sm"
                  >
                    <Coins className="w-3.5 h-3.5" />+{bet}
                  </motion.div>
                )}
                <Button
                  onClick={nextRound}
                  variant="outline"
                  size="sm"
                  className="border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-white"
                >
                  Pr\u00f3ximo Round
                </Button>
              </motion.div>
            )}

            {isGameOver && (
              <motion.div
                key="game-over"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center gap-2"
              >
                <motion.p
                  animate={{ scale: [1, 1.15, 1] }}
                  transition={{ repeat: Infinity, duration: 1 }}
                  className={cn(
                    "font-black text-xl",
                    gameWinner === "p1" ? "text-cyan-400" : "text-pink-400"
                  )}
                >
                  \ud83c\udfc6
                </motion.p>
                <p
                  className={cn(
                    "font-bold text-sm",
                    gameWinner === "p1" ? "text-cyan-300" : "text-pink-300"
                  )}
                >
                  {gameWinner === "p1" ? "Jogador 1" : p2Label} Venceu!
                </p>
                <Button
                  onClick={resetAll}
                  size="sm"
                  className="bg-gradient-to-r from-cyan-600 to-pink-600 hover:from-cyan-500 hover:to-pink-500 text-white font-bold"
                >
                  Reiniciar Tudo
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div
          className={cn(
            "flex flex-col items-center gap-3 transition-all duration-500 rounded-xl p-3",
            phase === "roundResult" && roundResult === "p2" &&
              "bg-pink-400/5 shadow-lg shadow-pink-400/20",
            phase === "roundResult" && roundResult === "p1" && "opacity-40",
            isGameOver && p2Winning &&
              "bg-pink-400/10 shadow-lg shadow-pink-400/30",
            isGameOver && p1Winning && "opacity-40"
          )}
        >
          <div className="relative">
            <AnimatePresence mode="wait">
              {p2Revealed && p2ChoiceData ? (
                <motion.div
                  key="revealed-p2"
                  initial={{ rotateY: -90, scale: 0.5, opacity: 0 }}
                  animate={{ rotateY: 0, scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15 }}
                  className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-2 border-pink-400/50 bg-slate-800 flex items-center justify-center text-5xl sm:text-6xl"
                >
                  {p2ChoiceData.emoji}
                </motion.div>
              ) : p2Choice ? (
                <motion.div
                  key="hidden-p2"
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-2 border-pink-400/30 bg-slate-800 flex items-center justify-center"
                >
                  <motion.div
                    animate={{ rotate: [0, -10, 10, 0] }}
                    transition={{
                      repeat: Infinity,
                      duration: 2,
                      ease: "easeInOut",
                    }}
                    className="text-4xl sm:text-5xl"
                  >
                    \u2753
                  </motion.div>
                </motion.div>
              ) : (
                <motion.div
                  key="empty-p2"
                  className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-2 border-dashed border-slate-600 bg-slate-800/50 flex items-center justify-center text-slate-600 text-3xl sm:text-4xl"
                >
                  ?
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {mode === "1v1" ? (
            <div className="flex gap-2">
              {CHOICES.map((choice) => {
                const isSelected = p2Choice === choice.id;
                const isDisabled =
                  phase !== "choosing" || !p1Choice || p2Choice !== null;
                return (
                  <motion.button
                    key={choice.id}
                    whileHover={isDisabled ? {} : { scale: 1.15, y: -4 }}
                    whileTap={isDisabled ? {} : { scale: 0.9 }}
                    onClick={() => handleP2Choice(choice.id)}
                    disabled={isDisabled}
                    className={cn(
                      "w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-slate-800 border text-2xl sm:text-3xl flex items-center justify-center transition-colors",
                      isSelected
                        ? "border-pink-400 ring-2 ring-pink-400 shadow-lg shadow-pink-400/30"
                        : "border-slate-700 hover:border-pink-500/50",
                      isDisabled && "opacity-40 cursor-not-allowed"
                    )}
                  >
                    {choice.emoji}
                  </motion.button>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1">
              <AnimatePresence>
                {p2Choosing && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-1 text-pink-400 text-xs"
                  >
                    <Bot className="w-3.5 h-3.5 animate-pulse" />
                    Pensando...
                  </motion.div>
                )}
              </AnimatePresence>
              <div className="flex gap-2 opacity-30">
                {CHOICES.map((choice) => (
                  <div
                    key={choice.id}
                    className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-2xl sm:text-3xl"
                  >
                    {choice.emoji}
                  </div>
                ))}
              </div>
            </div>
          )}
          <p className="text-pink-400 text-xs font-medium">
            {p2Choice &&
            (p2Revealed || phase === "roundResult" || phase === "gameOver")
              ? p2ChoiceData?.label
              : "Escolher"}
          </p>
        </div>
      </div>

      {mode === "1v1" && phase === "choosing" && p1Choice && !p2Choice && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center text-slate-500 text-sm"
        >
          Aguardando {p2Label} escolher...
        </motion.p>
      )}

      {mode === "1v1" && phase === "choosing" && !p1Choice && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center text-cyan-500/60 text-sm"
        >
          Jogador 1: fa\u00e7a sua escolha
        </motion.p>
      )}

      {mode === "bot" && phase === "choosing" && !p1Choice && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center text-cyan-500/60 text-sm"
        >
          Escolha para jogar contra o Bot
        </motion.p>
      )}
    </div>
  );
}
