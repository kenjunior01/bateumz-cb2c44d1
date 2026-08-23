"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { RotateCcw, ArrowUp, ArrowDown, Check, Bot } from "lucide-react";

interface GuessEntry {
  player: number;
  value: number;
  hint: "higher" | "lower" | "correct";
  round: number;
}

type GameState = "start" | "new-round" | "guessing" | "round-result" | "game-over";
type BotDifficulty = "Fácil" | "Médio" | "Difícil";
type GameMode = "player" | "bot";

interface Props {
  onScore?: (name: string, score: number) => void;
  liveCode?: string;
}

const TOTAL_ROUNDS = 5;
const MIN_NUMBER = 1;
const MAX_NUMBER = 100;

function generateSecretNumber(): number {
  return Math.floor(Math.random() * (MAX_NUMBER - MIN_NUMBER + 1)) + MIN_NUMBER;
}

function calculatePoints(attempts: number): number {
  return Math.max(10, 50 - attempts * 5);
}

function NumberLine({
  rangeMin,
  rangeMax,
  secretNumber,
  revealSecret,
}: {
  rangeMin: number;
  rangeMax: number;
  secretNumber: number;
  revealSecret: boolean;
}) {
  const leftPct = ((rangeMin - MIN_NUMBER) / (MAX_NUMBER - MIN_NUMBER)) * 100;
  const rightPct = ((rangeMax - MIN_NUMBER) / (MAX_NUMBER - MIN_NUMBER)) * 100;
  const widthPct = rightPct - leftPct;
  const secretPct = ((secretNumber - MIN_NUMBER) / (MAX_NUMBER - MIN_NUMBER)) * 100;

  return (
    <div className="w-full px-2">
      <div className="relative w-full h-10 rounded-full bg-slate-700/50 overflow-hidden border border-slate-600/30">
        <div
          className="absolute top-0 left-0 h-full bg-slate-700/70"
          style={{ width: `${leftPct}%` }}
        />
        <motion.div
          className="absolute top-0 h-full"
          style={{
            background:
              "linear-gradient(90deg, rgba(16,185,129,0.3), rgba(16,185,129,0.6), rgba(16,185,129,0.3))",
            borderLeft: "2px solid rgba(16,185,129,0.8)",
            borderRight: "2px solid rgba(16,185,129,0.8)",
          }}
          animate={{ left: `${leftPct}%`, width: `${widthPct}%` }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          <div className="absolute inset-0 bg-emerald-400/10 blur-sm" />
        </motion.div>
        <div
          className="absolute top-0 right-0 h-full bg-slate-700/70"
          style={{ width: `${100 - rightPct}%` }}
        />
        <AnimatePresence>
          {revealSecret && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="absolute top-1/2 -translate-y-1/2 z-10"
              style={{ left: `${secretPct}%` }}
            >
              <div className="w-4 h-4 rounded-full bg-amber-400 border-2 border-white shadow-lg shadow-amber-400/50 -ml-2" />
            </motion.div>
          )}
        </AnimatePresence>
        {[1, 25, 50, 75, 100].map((tick) => {
          const pct = ((tick - MIN_NUMBER) / (MAX_NUMBER - MIN_NUMBER)) * 100;
          return (
            <div
              key={tick}
              className="absolute top-0 h-full w-px bg-slate-500/30"
              style={{ left: `${pct}%` }}
            />
          );
        })}
      </div>
      <div className="flex justify-between mt-1 px-1">
        <span className="text-xs text-slate-500">{MIN_NUMBER}</span>
        <motion.span
          className="text-xs font-bold text-emerald-400"
          animate={{ left: `${leftPct}%` }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          style={{ position: "relative" }}
        >
          {rangeMin}
        </motion.span>
        <motion.span
          className="text-xs font-bold text-emerald-400"
          animate={{ right: `${100 - rightPct}%` }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          style={{ position: "relative" }}
        >
          {rangeMax}
        </motion.span>
        <span className="text-xs text-slate-500">{MAX_NUMBER}</span>
      </div>
    </div>
  );
}

export default function GuessNumber100({ onScore, liveCode }: Props) {
  const [gameState, setGameState] = useState<GameState>("start");
  const [mode, setMode] = useState<GameMode>("player");
  const [botDifficulty, setBotDifficulty] = useState<BotDifficulty>("Médio");
  const [currentRound, setCurrentRound] = useState(1);
  const [currentPlayer, setCurrentPlayer] = useState(1);
  const [secretNumber, setSecretNumber] = useState<number>(0);
  const [rangeMin, setRangeMin] = useState(MIN_NUMBER);
  const [rangeMax, setRangeMax] = useState(MAX_NUMBER);
  const [guessInput, setGuessInput] = useState("");
  const [guesses, setGuesses] = useState<GuessEntry[]>([]);
  const [scores, setScores] = useState([0, 0]);
  const [roundWinner, setRoundWinner] = useState<number | null>(null);
  const [lastHint, setLastHint] = useState<"higher" | "lower" | "correct" | null>(null);
  const [roundAttempts, setRoundAttempts] = useState(0);
  const [botThinking, setBotThinking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const roundRef = useRef(currentRound);
  roundRef.current = currentRound;
  const [triggerScoreAnim, setTriggerScoreAnim] = useState<number | null>(null);
  const botTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Bot binary search state (per round)
  const botLowRef = useRef(MIN_NUMBER);
  const botHighRef = useRef(MAX_NUMBER);
  const botRangeMinRef = useRef(MIN_NUMBER);
  const botRangeMaxRef = useRef(MAX_NUMBER);

  const getP2Name = () => (mode === "bot" ? "Computador" : "Jogador 2");

  const clearBotTimeout = useCallback(() => {
    if (botTimeoutRef.current) {
      clearTimeout(botTimeoutRef.current);
      botTimeoutRef.current = null;
    }
  }, []);

  const getPlayerColor = (player: number) => (player === 1 ? "text-cyan-400" : "text-pink-400");
  const getPlayerBg = (player: number) => (player === 1 ? "bg-cyan-400/10 border-cyan-400/30" : "bg-pink-400/10 border-pink-400/30");
  const getPlayerName = (player: number) =>
    player === 1 ? "Jogador 1" : getP2Name();

  const startNewRound = useCallback(() => {
    const newSecret = generateSecretNumber();
    setSecretNumber(newSecret);
    setRangeMin(MIN_NUMBER);
    setRangeMax(MAX_NUMBER);
    setGuessInput("");
    setGuesses([]);
    setRoundWinner(null);
    setLastHint(null);
    setRoundAttempts(0);
    setCurrentPlayer(roundRef.current % 2 === 0 ? 2 : 1);
    setBotThinking(false);
    setGameState("new-round");
    // Reset bot binary search state
    botLowRef.current = MIN_NUMBER;
    botHighRef.current = MAX_NUMBER;
    botRangeMinRef.current = MIN_NUMBER;
    botRangeMaxRef.current = MAX_NUMBER;
    setTimeout(() => {
      setGameState("guessing");
      setTimeout(() => inputRef.current?.focus(), 100);
    }, 800);
  }, []);

  const startGame = useCallback(() => {
    clearBotTimeout();
    setCurrentRound(1);
    setScores([0, 0]);
    startNewRound();
  }, [startNewRound, clearBotTimeout]);

  const handleGuess = useCallback((guess: number) => {
    if (guess < MIN_NUMBER || guess > MAX_NUMBER) return;
    if (gameState !== "guessing") return;

    const attempts = roundAttempts + 1;
    setRoundAttempts(attempts);

    let hint: "higher" | "lower" | "correct";
    if (guess === secretNumber) {
      hint = "correct";
    } else if (guess < secretNumber) {
      hint = "higher";
    } else {
      hint = "lower";
    }

    const entry: GuessEntry = {
      player: currentPlayer,
      value: guess,
      hint,
      round: currentRound,
    };

    setGuesses((prev) => [...prev, entry]);
    setGuessInput("");
    setLastHint(hint);

    if (hint === "correct") {
      const points = calculatePoints(attempts);
      setRoundWinner(currentPlayer);
      setScores((prev) => {
        const newScores = [...prev] as [number, number];
        newScores[currentPlayer - 1] += points;
        return newScores;
      });
      setTriggerScoreAnim(currentPlayer);
      clearBotTimeout();
      setBotThinking(false);
      setGameState("round-result");
    } else {
      // Update range
      if (hint === "higher" && guess >= rangeMin) {
        setRangeMin(guess + 1);
      } else if (hint === "lower" && guess <= rangeMax) {
        setRangeMax(guess - 1);
      }
      // Switch player
      setCurrentPlayer(currentPlayer === 1 ? 2 : 1);
      setTimeout(() => {
        if (currentPlayer === 1) inputRef.current?.focus();
      }, 50);
    }
  }, [gameState, roundAttempts, secretNumber, currentPlayer, currentRound, rangeMin, rangeMax, clearBotTimeout]);

  const handlePlayerGuess = () => {
    const guess = parseInt(guessInput, 10);
    if (isNaN(guess)) return;
    handleGuess(guess);
  };

  /* Bot AI effect */
  useEffect(() => {
    if (gameState !== "guessing" || mode !== "bot" || currentPlayer !== 2 || roundWinner !== null) return;

    setBotThinking(true);

    const getThinkingDelay = () => {
      switch (botDifficulty) {
        case "Fácil": return 1500 + Math.random() * 1000;
        case "Médio": return 1000 + Math.random() * 500;
        case "Difícil": return 500 + Math.random() * 300;
      }
    };

    botTimeoutRef.current = setTimeout(() => {
 if (gameState !== "guessing" || currentPlayer !== 2) {
        setBotThinking(false);
        return;
      }

      // Binary search with difficulty offset
      let low = botLowRef.current;
      let high = botHighRef.current;
      let guess: number;

      if (low > high) {
        // Fallback
        guess = Math.floor((botRangeMinRef.current + botRangeMaxRef.current) / 2);
      } else {
        guess = Math.floor((low + high) / 2);
      }

      // Apply difficulty offset
      switch (botDifficulty) {
        case "Fácil": {
          const offset = Math.floor(Math.random() * 21) - 10; // ±10
          guess = guess + offset;
          break;
        }
        case "Médio": {
          const offset = Math.floor(Math.random() * 7) - 3; // ±3
          guess = guess + offset;
          break;
        }
        case "Difícil":
          // Pure binary search, no offset
          break;
      }

      // Clamp to valid range
      guess = Math.max(MIN_NUMBER, Math.min(MAX_NUMBER, guess));

      handleGuess(guess);
    }, getThinkingDelay());

    return () => {
      if (botTimeoutRef.current) {
        clearTimeout(botTimeoutRef.current);
        botTimeoutRef.current = null;
      }
      setBotThinking(false);
    };
  }, [gameState, mode, currentPlayer, botDifficulty, handleGuess, roundWinner]);

  // Update bot binary search range based on the latest guess
  useEffect(() => {
    if (mode !== "bot" || guesses.length === 0) return;
    const latestGuess = guesses[guesses.length - 1];
    if (latestGuess.player !== 2) return;
    if (latestGuess.hint === "correct") return;

    if (latestGuess.hint === "higher") {
      if (latestGuess.value >= botLowRef.current) {
        botLowRef.current = latestGuess.value + 1;
      }
    } else if (latestGuess.hint === "lower") {
      if (latestGuess.value <= botHighRef.current) {
        botHighRef.current = latestGuess.value - 1;
      }
    }
  }, [guesses, mode]);

  // Also update bot range when player 1 guesses (bot can use that info too)
  useEffect(() => {
    if (mode !== "bot" || guesses.length === 0) return;
    const latestGuess = guesses[guesses.length - 1];
    if (latestGuess.player !== 1) return;
    if (latestGuess.hint === "correct") return;

    if (latestGuess.hint === "higher") {
      if (latestGuess.value >= botRangeMinRef.current) {
        botRangeMinRef.current = latestGuess.value + 1;
      }
    } else if (latestGuess.hint === "lower") {
      if (latestGuess.value <= botRangeMaxRef.current) {
        botRangeMaxRef.current = latestGuess.value - 1;
      }
    }
  }, [guesses, mode]);

  const handleNextRound = () => {
    if (currentRound >= TOTAL_ROUNDS) {
      setGameState("game-over");
      if (onScore) {
        if (scores[0] > scores[1]) {
          onScore("Jogador 1", scores[0]);
          confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
          setTimeout(() => confetti({ particleCount: 60, angle: 60, spread: 55, origin: { x: 0 } }), 250);
          setTimeout(() => confetti({ particleCount: 60, angle: 120, spread: 55, origin: { x: 1 } }), 500);
        } else if (scores[1] > scores[0]) {
          onScore(getP2Name(), scores[1]);
          confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
          setTimeout(() => confetti({ particleCount: 60, angle: 60, spread: 55, origin: { x: 0 } }), 250);
          setTimeout(() => confetti({ particleCount: 60, angle: 120, spread: 55, origin: { x: 1 } }), 500);
        }
      }
    } else {
      setCurrentRound((r) => r + 1);
      startNewRound();
    }
  };

  const handleRestart = () => {
    clearBotTimeout();
    startGame();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handlePlayerGuess();
    }
  };

  const p1Color = "text-cyan-400";
  const p2Color = "text-pink-400";
  const p1Bg = "bg-cyan-400/10 border-cyan-400/30";
  const p2Bg = "bg-pink-400/10 border-pink-400/30";

  const roundGuesses = guesses.filter((g) => g.round === currentRound);

  return (
    <div className="w-full max-w-lg mx-auto p-4 space-y-4">
      <div className="bg-gradient-to-r from-cyan-900/30 to-pink-900/30 border border-cyan-500/20 rounded-xl p-4 shadow-[0_0_25px_rgba(34,211,238,0.1)]">
        <div className="flex items-center justify-between">
          <div className="flex flex-col items-center gap-1 min-w-[80px]">
            <span className={cn("text-xs font-medium uppercase tracking-wider", p1Color)}>
              Jogador 1
            </span>
            <motion.div
              key={`score-p1-${scores[0]}`}
              initial={{ scale: 1.4, color: "#22d3ee" }}
              animate={{ scale: 1, color: "#f8fafc" }}
              transition={{ type: "spring", stiffness: 400, damping: 15 }}
              className="text-2xl font-bold text-white"
            >
              {scores[0]}
            </motion.div>
          </div>

          <div className="text-center">
            <h2 className="text-lg font-bold text-white tracking-tight">
              🎯 Adivinha o Número
            </h2>
            <Badge
              variant="outline"
              className="text-xs text-slate-300 border-slate-600 mt-1"
            >
              Round {currentRound}/{TOTAL_ROUNDS}
            </Badge>
          </div>

          <div className="flex flex-col items-center gap-1 min-w-[80px]">
            <span className={cn("text-xs font-medium uppercase tracking-wider", p2Color)}>
              {mode === "bot" ? (
                <span className="flex items-center gap-1">
                  <Bot className="w-3.5 h-3.5" />
                  Computador
                </span>
              ) : (
                "Jogador 2"
              )}
            </span>
            <motion.div
              key={`score-p2-${scores[1]}`}
              initial={{ scale: 1.4, color: "#f472b6" }}
              animate={{ scale: 1, color: "#f8fafc" }}
              transition={{ type: "spring", stiffness: 400, damping: 15 }}
              className="text-2xl font-bold text-white"
            >
              {scores[1]}
            </motion.div>
          </div>
        </div>
      </div>

      {gameState === "start" && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-6 py-8"
        >
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            className="text-5xl"
          >
            🎲
          </motion.div>

          <h1 className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-cyan-400 to-pink-400 bg-clip-text text-transparent">
            Adivinha o Número
          </h1>

          <p className="text-slate-400 text-sm text-center max-w-sm">
            Adivinhe o número secreto entre 1 e 100! Vence quem acertar primeiro.
            Quanto menos tentativas, mais pontos!
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
                {(["Fácil", "Médio", "Difícil"] as BotDifficulty[]).map((d) => (
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
                {botDifficulty === "Fácil" && "Busca binária com desvio de ±10"}
                {botDifficulty === "Médio" && "Busca binária com desvio de ±3"}
                {botDifficulty === "Difícil" && "Busca binária perfeita"}
              </p>
            </motion.div>
          )}

          <motion.div whileHover={{ scale: 1.03 }}>
          <Button
            onClick={startGame}
            className="bg-gradient-to-r from-cyan-600 to-pink-600 hover:from-cyan-500 hover:to-pink-500 text-white px-8 py-3 font-semibold text-base shadow-[0_0_20px_rgba(34,211,238,0.3)]"
          >
            Iniciar Jogo
          </Button>
          </motion.div>
        </motion.div>
      )}

      {gameState !== "start" && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Badge
            variant="outline"
            className={cn(
              "text-xs border",
              currentPlayer === 1
                ? "border-cyan-400/50 text-cyan-400"
                : "border-pink-400/50 text-pink-400"
            )}
          >
            Vez de: <span className="font-bold ml-1">{getPlayerName(currentPlayer)}</span>
            {mode === "bot" && currentPlayer === 2 && botThinking && (
              <motion.span
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="ml-2 text-pink-300"
              >
                Pensando...
              </motion.span>
            )}
          </Badge>
          <Badge variant="outline" className="text-xs border-emerald-400/50 text-emerald-400">
            Intervalo: {rangeMin} - {rangeMax}
          </Badge>
          <Badge variant="outline" className="text-xs border-slate-500 text-slate-300">
            Tentativas: {roundAttempts}
          </Badge>
        </div>
      )}

      {gameState !== "start" && (
        <div className="py-2">
          <NumberLine
            rangeMin={rangeMin}
            rangeMax={rangeMax}
            secretNumber={secretNumber}
            revealSecret={gameState === "round-result" || gameState === "game-over"}
          />
        </div>
      )}

      <AnimatePresence>
        {gameState === "new-round" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            className="flex flex-col items-center justify-center py-8 gap-3"
          >
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
              className="text-5xl"
            >
              🎲
            </motion.div>
            <p className="text-white text-lg font-semibold">Novo número sorteado!</p>
            <p className="text-slate-400 text-sm">Round {currentRound} começando...</p>
            <motion.div
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="text-slate-500 text-xs"
            >
              Preparando...
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {gameState === "guessing" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            <motion.div
              key={`player-indicator-${currentPlayer}`}
              initial={{ x: currentPlayer === 1 ? -50 : 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className={cn(
                "flex items-center gap-2 p-3 rounded-lg border text-center justify-center",
                currentPlayer === 1 ? p1Bg : p2Bg
              )}
            >
              {mode === "bot" && currentPlayer === 2 ? (
                <>
                  <Bot className={cn("w-4 h-4", "text-pink-400")} />
                  <span className="text-pink-400 font-semibold flex items-center gap-2">
                    Computador
                    {botThinking && (
                      <motion.span
                        animate={{ opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 0.8, repeat: Infinity }}
                        className="text-pink-300 text-sm"
                      >
                        pensando...
                      </motion.span>
                    )}
                  </span>
                </>
              ) : (
                <>
                  <div
                    className={cn(
                      "w-3 h-3 rounded-full",
                      currentPlayer === 1 ? "bg-cyan-400" : "bg-pink-400"
                    )}
                  />
                  <span className={cn("font-semibold", getPlayerColor(currentPlayer))}>
                    {getPlayerName(currentPlayer)}, é a sua vez!
                  </span>
                </>
              )}
            </motion.div>

            {!(mode === "bot" && currentPlayer === 2) && (
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="number"
                  min={MIN_NUMBER}
                  max={MAX_NUMBER}
                  value={guessInput}
                  onChange={(e) => setGuessInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Digite um número (1-100)"
                  className={cn(
                    "flex-1 bg-slate-800/80 border rounded-lg px-4 py-3 text-white text-lg text-center",
                    "placeholder:text-slate-500 placeholder:text-sm focus:outline-none focus:ring-2 transition-all",
                    currentPlayer === 1
                      ? "border-cyan-500/30 focus:ring-cyan-500/50"
                      : "border-pink-500/30 focus:ring-pink-500/50"
                  )}
                />
                <motion.div whileHover={{ scale: 1.03 }}>
                <Button
                  onClick={handlePlayerGuess}
                  disabled={
                    !guessInput ||
                    parseInt(guessInput, 10) < MIN_NUMBER ||
                    parseInt(guessInput, 10) > MAX_NUMBER
                  }
                  className={cn(
                    "px-6 py-3 font-semibold text-base transition-all",
                    currentPlayer === 1
                      ? "bg-cyan-600 hover:bg-cyan-500 text-white shadow-[0_0_20px_rgba(6,182,212,0.3)]"
                      : "bg-pink-600 hover:bg-pink-500 text-white shadow-[0_0_20px_rgba(236,72,153,0.3)]"
                  )}
                >
                  Chutar
                </Button>
                </motion.div>
              </div>
            )}

            {mode === "bot" && currentPlayer === 2 && (
              <motion.div
                className="flex items-center justify-center gap-3 py-4"
                animate={botThinking ? { opacity: [0.5, 1, 0.5] } : {}}
                transition={{ duration: 1.5, repeat: botThinking ? Infinity : 0 }}
              >
                <Bot className="w-8 h-8 text-pink-500/60" />
                <span className="text-pink-400/60 text-sm">Computador calculando...</span>
              </motion.div>
            )}

            <AnimatePresence>
              {lastHint && lastHint !== "correct" && (
                <motion.div
                  key={`hint-${guesses.length}`}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center gap-1 py-2"
                >
                  {lastHint === "higher" ? (
                    <motion.div
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: [20, -10, 0], opacity: 1 }}
                      transition={{ duration: 0.6 }}
                      className="flex items-center gap-2"
                    >
                      <ArrowUp className="w-8 h-8 text-amber-400" />
                      <span className="text-amber-400 font-bold text-lg">
                        É MAIOR 🔼
                      </span>
                      <ArrowUp className="w-8 h-8 text-amber-400" />
                    </motion.div>
                  ) : (
                    <motion.div
                      initial={{ y: -20, opacity: 0 }}
                      animate={{ y: [-20, 10, 0], opacity: 1 }}
                      transition={{ duration: 0.6 }}
                      className="flex items-center gap-2"
                    >
                      <ArrowDown className="w-8 h-8 text-blue-400" />
                      <span className="text-blue-400 font-bold text-lg">
                        É MENOR 🔽
                      </span>
                      <ArrowDown className="w-8 h-8 text-blue-400" />
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {gameState === "round-result" && roundWinner !== null && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex flex-col items-center gap-4 py-6"
          >
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                rotate: [0, 5, -5, 0],
              }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="text-6xl"
            >
              🎉
            </motion.div>

            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-center space-y-2"
            >
              <div className="flex items-center justify-center gap-2">
                <Check className="w-6 h-6 text-emerald-400" />
                <span className="text-emerald-400 font-bold text-xl">Correto!</span>
                <Check className="w-6 h-6 text-emerald-400" />
              </div>

              <p className={cn("text-2xl font-bold", getPlayerColor(roundWinner))}>
                {getPlayerName(roundWinner)} Venceu!
              </p>

              <div className="space-y-1">
                <p className="text-slate-300 text-sm">
                  O número era{" "}
                  <span className="text-amber-400 font-bold text-lg">{secretNumber}</span>
                </p>
                <p className="text-slate-400 text-sm">
                  {roundAttempts} tentativa{roundAttempts !== 1 ? "s" : ""}
                </p>
                <p className="text-emerald-400 font-semibold text-sm">
                  +{calculatePoints(roundAttempts)} pontos
                </p>
              </div>
            </motion.div>

            <motion.div whileHover={{ scale: 1.03 }}>
            <Button
              onClick={handleNextRound}
              className={cn(
                "px-8 py-3 font-semibold text-base transition-all",
                roundWinner === 1
                  ? "bg-cyan-600 hover:bg-cyan-500 text-white shadow-[0_0_20px_rgba(6,182,212,0.3)]"
                  : "bg-pink-600 hover:bg-pink-500 text-white shadow-[0_0_20px_rgba(236,72,153,0.3)]"
              )}
            >
              {currentRound >= TOTAL_ROUNDS ? "Ver Resultado Final" : "Próximo Round →"}
            </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {gameState === "game-over" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex flex-col items-center gap-4 py-6"
          >
            <motion.div
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="text-5xl"
            >
              🏆
            </motion.div>

            <motion.h2
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="text-3xl font-bold text-white"
            >
              Fim de Jogo!
            </motion.h2>

            <div className="flex items-center gap-8 py-4">
              <motion.div
                initial={{ x: -30, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className={cn(
                  "flex flex-col items-center gap-2 p-4 rounded-xl border",
                  p1Bg,
                  scores[0] >= scores[1] && scores[0] !== scores[1] && "ring-2 ring-cyan-400/50"
                )}
              >
                <span className={cn("text-sm font-medium", p1Color)}>Jogador 1</span>
                <span className="text-3xl font-bold text-white">{scores[0]}</span>
                {scores[0] >= scores[1] && scores[0] !== scores[1] && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="text-xs text-cyan-400"
                  >
                    🏅 Vencedor!
                  </motion.span>
                )}
              </motion.div>

              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3 }}
                className="text-2xl font-bold text-slate-500"
              >
                VS
              </motion.span>

              <motion.div
                initial={{ x: 30, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className={cn(
                  "flex flex-col items-center gap-2 p-4 rounded-xl border",
                  p2Bg,
                  scores[1] >= scores[0] && scores[0] !== scores[1] && "ring-2 ring-pink-400/50"
                )}
              >
                <span className={cn("text-sm font-medium", p2Color, "flex items-center gap-1")}>
                  {mode === "bot" && <Bot className="w-3.5 h-3.5" />}
                  {getP2Name()}
                </span>
                <span className="text-3xl font-bold text-white">{scores[1]}</span>
                {scores[1] >= scores[0] && scores[0] !== scores[1] && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="text-xs text-pink-400"
                  >
                    🏅 Vencedor!
                  </motion.span>
                )}
              </motion.div>
            </div>

            {scores[0] === scores[1] && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-amber-400 font-bold text-lg"
              >
                Empate! 🤝
              </motion.p>
            )}

            <motion.div whileHover={{ scale: 1.03 }}>
            <Button
              onClick={handleRestart}
              className="bg-gradient-to-r from-cyan-600 to-pink-600 hover:from-cyan-500 hover:to-pink-500 text-white px-8 py-3 font-semibold text-base transition-all shadow-[0_0_20px_rgba(34,211,238,0.3)]"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reiniciar Tudo
            </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {guesses.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
            Histórico
          </h3>
          <div className="bg-slate-800/40 rounded-lg border border-slate-700/50 max-h-48 overflow-y-auto">
            <div className="divide-y divide-slate-700/30">
              {[...guesses].reverse().map((entry, idx) => {
                const isLatest = idx === 0;
                return (
                  <motion.div
                    key={`${entry.round}-${idx}`}
                    initial={isLatest ? { opacity: 0, x: -20 } : false}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3 }}
                    className={cn(
                      "flex items-center justify-between px-3 py-2 text-sm",
                      entry.player === 1 ? "bg-cyan-950/20" : "bg-pink-950/20"
                    )}
                  >
                    <span className={cn("font-medium", getPlayerColor(entry.player))}>
                      {entry.player === 2 && mode === "bot" ? (
                        <span className="flex items-center gap-1">
                          <Bot className="w-3 h-3" />
                          Computador
                        </span>
                      ) : (
                        getPlayerName(entry.player)
                      )}
                    </span>
                    <span className="text-white font-mono font-bold">{entry.value}</span>
                    <div className="flex items-center gap-1">
                      {entry.hint === "higher" && (
                        <>
                          <ArrowUp className="w-4 h-4 text-amber-400" />
                          <span className="text-amber-400 text-xs font-medium">
                            É MAIOR
                          </span>
                        </>
                      )}
                      {entry.hint === "lower" && (
                        <>
                          <ArrowDown className="w-4 h-4 text-blue-400" />
                          <span className="text-blue-400 text-xs font-medium">
                            É MENOR
                          </span>
                        </>
                      )}
                      {entry.hint === "correct" && (
                        <>
                          <Check className="w-4 h-4 text-emerald-400" />
                          <span className="text-emerald-400 text-xs font-medium">
                            Correto!
                          </span>
                        </>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {gameState !== "game-over" && gameState !== "new-round" && gameState !== "start" && (
        <div className="flex justify-center pt-2">
          <Button
            variant="ghost"
            onClick={handleRestart}
            className="text-slate-500 hover:text-slate-300 hover:bg-slate-800/50 text-sm"
          >
            <RotateCcw className="w-4 h-4 mr-1" />
            Reiniciar Tudo
          </Button>
        </div>
      )}
    </div>
  );
}
