"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { RotateCcw, ArrowUp, ArrowDown, Check } from "lucide-react";

interface GuessEntry {
  player: number;
  value: number;
  hint: "higher" | "lower" | "correct";
  round: number;
}

type GameState = "new-round" | "guessing" | "round-result" | "game-over";

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
        {/* Dimmed left zone */}
        <div
          className="absolute top-0 left-0 h-full bg-slate-700/70"
          style={{ width: `${leftPct}%` }}
        />
        {/* Active range */}
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
          {/* Glow effect */}
          <div className="absolute inset-0 bg-emerald-400/10 blur-sm" />
        </motion.div>
        {/* Dimmed right zone */}
        <div
          className="absolute top-0 right-0 h-full bg-slate-700/70"
          style={{ width: `${100 - rightPct}%` }}
        />
        {/* Secret number marker (only on reveal) */}
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
        {/* Tick marks */}
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
      {/* Labels */}
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
  const [gameState, setGameState] = useState<GameState>("new-round");
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
  const inputRef = useRef<HTMLInputElement>(null);
  const roundRef = useRef(currentRound);
  roundRef.current = currentRound;
  const [triggerScoreAnim, setTriggerScoreAnim] = useState<number | null>(null);

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
    setGameState("guessing");
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const startGame = useCallback(() => {
    setCurrentRound(1);
    setScores([0, 0]);
    setGameState("new-round");
    setTimeout(() => startNewRound(), 800);
  }, [startNewRound]);

  useEffect(() => {
    startGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGuess = () => {
    const guess = parseInt(guessInput, 10);
    if (isNaN(guess) || guess < MIN_NUMBER || guess > MAX_NUMBER) return;

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
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleNextRound = () => {
    if (currentRound >= TOTAL_ROUNDS) {
      setGameState("game-over");
      const winnerName = scores[0] > scores[1] ? "Jogador 1" : scores[1] > scores[0] ? "Jogador 2" : "Empate";
      const winnerScore = Math.max(scores[0], scores[1]);
      if (onScore) {
        if (scores[0] > scores[1]) {
          onScore("Jogador 1", scores[0]);
        } else if (scores[1] > scores[0]) {
          onScore("Jogador 2", scores[1]);
        }
      }
    } else {
      setCurrentRound((r) => r + 1);
      setGameState("new-round");
      setTimeout(() => startNewRound(), 800);
    }
  };

  const handleRestart = () => {
    startGame();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleGuess();
    }
  };

  const p1Color = "text-cyan-400";
  const p2Color = "text-pink-400";
  const p1Bg = "bg-cyan-400/10 border-cyan-400/30";
  const p2Bg = "bg-pink-400/10 border-pink-400/30";

  const getPlayerColor = (player: number) => (player === 1 ? p1Color : p2Color);
  const getPlayerBg = (player: number) => (player === 1 ? p1Bg : p2Bg);
  const getPlayerName = (player: number) =>
    player === 1 ? "Jogador 1" : "Jogador 2";

  const roundGuesses = guesses.filter((g) => g.round === currentRound);

  return (
    <div className="w-full max-w-lg mx-auto p-4 space-y-4">
      {/* Scoreboard */}
      <div className="bg-gradient-to-r from-cyan-900/30 to-pink-900/30 border border-cyan-500/20 rounded-xl p-4">
        <div className="flex items-center justify-between">
          {/* Player 1 Score */}
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

          {/* Title */}
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

          {/* Player 2 Score */}
          <div className="flex flex-col items-center gap-1 min-w-[80px]">
            <span className={cn("text-xs font-medium uppercase tracking-wider", p2Color)}>
              Jogador 2
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

      {/* Game Info Bar */}
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
        </Badge>
        <Badge variant="outline" className="text-xs border-emerald-400/50 text-emerald-400">
          Intervalo: {rangeMin} - {rangeMax}
        </Badge>
        <Badge variant="outline" className="text-xs border-slate-500 text-slate-300">
          Tentativas: {roundAttempts}
        </Badge>
      </div>

      {/* Visual Number Line */}
      <div className="py-2">
        <NumberLine
          rangeMin={rangeMin}
          rangeMax={rangeMax}
          secretNumber={secretNumber}
          revealSecret={gameState === "round-result" || gameState === "game-over"}
        />
      </div>

      {/* New Round Overlay */}
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

      {/* Guessing State */}
      <AnimatePresence>
        {gameState === "guessing" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            {/* Current Player Indicator */}
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
              <div
                className={cn(
                  "w-3 h-3 rounded-full",
                  currentPlayer === 1 ? "bg-cyan-400" : "bg-pink-400"
                )}
              />
              <span className={cn("font-semibold", getPlayerColor(currentPlayer))}>
                {getPlayerName(currentPlayer)}, é a sua vez!
              </span>
            </motion.div>

            {/* Input + Button */}
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
              <Button
                onClick={handleGuess}
                disabled={
                  !guessInput ||
                  parseInt(guessInput, 10) < MIN_NUMBER ||
                  parseInt(guessInput, 10) > MAX_NUMBER
                }
                className={cn(
                  "px-6 py-3 font-semibold text-base transition-all",
                  currentPlayer === 1
                    ? "bg-cyan-600 hover:bg-cyan-500 text-white"
                    : "bg-pink-600 hover:bg-pink-500 text-white"
                )}
              >
                Chutar
              </Button>
            </div>

            {/* Last Hint Animation */}
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

      {/* Round Result */}
      <AnimatePresence>
        {gameState === "round-result" && roundWinner !== null && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex flex-col items-center gap-4 py-6"
          >
            {/* Celebration */}
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

            <Button
              onClick={handleNextRound}
              className={cn(
                "px-8 py-3 font-semibold text-base transition-all",
                currentPlayer === 1
                  ? "bg-cyan-600 hover:bg-cyan-500 text-white"
                  : "bg-pink-600 hover:bg-pink-500 text-white"
              )}
            >
              {currentRound >= TOTAL_ROUNDS ? "Ver Resultado Final" : "Próximo Round →"}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Game Over */}
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
              {/* Final P1 Score */}
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

              {/* VS */}
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3 }}
                className="text-2xl font-bold text-slate-500"
              >
                VS
              </motion.span>

              {/* Final P2 Score */}
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
                <span className={cn("text-sm font-medium", p2Color)}>Jogador 2</span>
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

            <Button
              onClick={handleRestart}
              className="bg-gradient-to-r from-cyan-600 to-pink-600 hover:from-cyan-500 hover:to-pink-500 text-white px-8 py-3 font-semibold text-base transition-all"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reiniciar Tudo
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Guess History */}
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
                      {getPlayerName(entry.player)}
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

      {/* Restart button (visible during game) */}
      {gameState !== "game-over" && gameState !== "new-round" && (
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
