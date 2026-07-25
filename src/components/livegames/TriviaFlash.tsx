"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { RotateCcw, Timer, Check, X, Zap } from "lucide-react";

interface Props {
  onScore?: (name: string, score: number) => void;
  liveCode?: string;
}

interface Question {
  text: string;
  answer: boolean;
  category: string;
}

const QUESTIONS: Question[] = [
  { text: "O Sol é uma estrela.", answer: true, category: "Ciência" },
  { text: "A Terra é plana.", answer: false, category: "Ciência" },
  { text: "O Brasil é o maior país da América do Sul.", answer: true, category: "Geografia" },
  { text: "A água ferve a 100°C ao nível do mar.", answer: true, category: "Ciência" },
  { text: "O Monte Everest fica no Nepal.", answer: true, category: "Geografia" },
  { text: "A lua tem luz própria.", answer: false, category: "Ciência" },
  { text: "O Brasil foi descoberto em 1500.", answer: true, category: "História" },
  { text: "O oceano Pacífico é o maior do mundo.", answer: true, category: "Geografia" },
  { text: "Os golfinhos são peixes.", answer: false, category: "Natureza" },
  { text: "O futebol é o esporte mais popular do Brasil.", answer: true, category: "Esportes" },
  { text: "A velocidade da luz é superior à do som.", answer: true, category: "Ciência" },
  { text: "A Austrália é um continente.", answer: true, category: "Geografia" },
  { text: "O coração humano tem 4 câmaras.", answer: true, category: "Ciência" },
  { text: "O Rio Amazonas é o rio mais longo do mundo.", answer: false, category: "Geografia" },
  { text: "Napoleão Bonaparte foi imperador da França.", answer: true, category: "História" },
  { text: "O ATP é produzido nas mitocôndrias.", answer: true, category: "Ciência" },
  { text: "O Japão é um país da América do Norte.", answer: false, category: "Geografia" },
  { text: "A gastrite é uma inflamação do estômago.", answer: true, category: "Ciência" },
  { text: "O Marrocos fica na África.", answer: true, category: "Geografia" },
  { text: "O Brasil tem a maior floresta tropical do mundo.", answer: true, category: "Natureza" },
  { text: "O ouro é um gás nobre.", answer: false, category: "Ciência" },
  { text: "A Segunda Guerra Mundial terminou em 1945.", answer: true, category: "História" },
  { text: "O vinho é feito a partir de uvas.", answer: true, category: "Cultura" },
  { text: "A Terra leva exatamente 24 horas para girar em torno do Sol.", answer: false, category: "Ciência" },
  { text: "O Brasil tem 26 estados.", answer: true, category: "Geografia" },
  { text: "A manga é uma fruta originária do Brasil.", answer: false, category: "Natureza" },
  { text: "O Império Romano durou mais de 1000 anos.", answer: true, category: "História" },
  { text: "O som viaja mais rápido no vácuo do que no ar.", answer: false, category: "Ciência" },
  { text: "A bandeira do Brasil tem 27 estrelas.", answer: true, category: "Cultura" },
  { text: "O polo Norte fica na Antártida.", answer: false, category: "Geografia" },
  { text: "As baleias são mamíferos.", answer: true, category: "Natureza" },
  { text: "O vôlei foi inventado nos Estados Unidos.", answer: true, category: "Esportes" },
  { text: "A Grande Muralha da China é visível do espaço a olho nu.", answer: false, category: "Geografia" },
  { text: "O hidrogênio é o elemento mais abundante do universo.", answer: true, category: "Ciência" },
  { text: "O Brasil já sediou as Olimpíadas duas vezes.", answer: false, category: "Esportes" },
  { text: "A Vitória-Régia é uma planta aquática da Amazônia.", answer: true, category: "Natureza" },
  { text: "O euro é a moeda do Japão.", answer: false, category: "Cultura" },
  { text: "A lua é o satélite natural da Terra.", answer: true, category: "Ciência" },
  { text: "O deserto do Saara fica na Ásia.", answer: false, category: "Geografia" },
  { text: "Cristóvão Colombo chegou ao Brasil em 1500.", answer: false, category: "História" },
  { text: "O corpo humano adulto tem 206 ossos.", answer: true, category: "Ciência" },
  { text: "O Brasil é o único país que fala português na América.", answer: true, category: "Geografia" },
  { text: "A Revolução Francesa aconteceu no século XVIII.", answer: true, category: "História" },
  { text: "O basquete foi inventado por um canadense.", answer: true, category: "Esportes" },
  { text: "Vênus é o planeta mais quente do sistema solar.", answer: true, category: "Ciência" },
  { text: "A Líbia é o maior país da África.", answer: false, category: "Geografia" },
  { text: "O Feng Shui é uma prática originária da China.", answer: true, category: "Cultura" },
];

const TOTAL_QUESTIONS = 20;
const TIME_LIMIT = 5000;
const BASE_POINTS = 10;
const MAX_BONUS = 5;
const RESULT_DISPLAY_MS = 1500;

type GameState = "idle" | "countdown" | "question" | "result" | "finished";

type PlayerAnswerData = {
  choice: boolean | null;
  correct: boolean;
  points: number;
  time: number | null;
};

type PlayerState = {
  score: number;
  correct: number;
  currentAnswer: PlayerAnswerData;
};

function createPlayer(): PlayerState {
  return {
    score: 0,
    correct: 0,
    currentAnswer: { choice: null, correct: false, points: 0, time: null },
  };
}

function createEmptyAnswer(): PlayerAnswerData {
  return { choice: null, correct: false, points: 0, time: null };
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const categoryEmoji: Record<string, string> = {
  Ciência: "🔬",
  Geografia: "🌍",
  História: "📜",
  Natureza: "🌿",
  Esportes: "⚽",
  Cultura: "🎭",
};

export default function TriviaFlash({ onScore, liveCode }: Props) {
  const [gameState, setGameState] = useState<GameState>("idle");
  const [questionPool] = useState<Question[]>(() =>
    shuffle(QUESTIONS).slice(0, TOTAL_QUESTIONS)
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [player1, setPlayer1] = useState<PlayerState>(createPlayer);
  const [player2, setPlayer2] = useState<PlayerState>(createPlayer);
  const [timeRemaining, setTimeRemaining] = useState(100);
  const [showingResult, setShowingResult] = useState(false);
  const [countdownNum, setCountdownNum] = useState(3);
  const [p1Times, setP1Times] = useState<number[]>([]);
  const [p2Times, setP2Times] = useState<number[]>([]);

  const questionStartTime = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const p1AnsweredRef = useRef(false);
  const p2AnsweredRef = useRef(false);
  const showingResultRef = useRef(false);

  const currentQuestion = questionPool[currentIndex];
  const p1Answered = player1.currentAnswer.choice !== null;
  const p2Answered = player2.currentAnswer.choice !== null;
  const bothAnswered = p1Answered && p2Answered;

  const timerColor = useMemo(() => {
    if (timeRemaining > 60) return "bg-emerald-500";
    if (timeRemaining > 30) return "bg-yellow-500";
    return "bg-red-500";
  }, [timeRemaining]);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const advanceToNext = useCallback(() => {
    clearTimer();
    setShowingResult(true);
    showingResultRef.current = true;

    setTimeout(() => {
      if (currentIndex + 1 >= TOTAL_QUESTIONS) {
        setGameState("finished");
      } else {
        setCurrentIndex((prev) => prev + 1);
        setPlayer1((prev) => ({ ...prev, currentAnswer: createEmptyAnswer() }));
        setPlayer2((prev) => ({ ...prev, currentAnswer: createEmptyAnswer() }));
        p1AnsweredRef.current = false;
        p2AnsweredRef.current = false;
        showingResultRef.current = false;
      }
    }, RESULT_DISPLAY_MS);
  }, [clearTimer, currentIndex]);

  const handleAnswer = useCallback(
    (playerNum: 1 | 2, choice: boolean) => {
      if (!currentQuestion || showingResultRef.current) return;

      const ref = playerNum === 1 ? p1AnsweredRef : p2AnsweredRef;
      if (ref.current) return;
      ref.current = true;

      const elapsed = Date.now() - questionStartTime.current;
      const isCorrect = choice === currentQuestion.answer;
      let points = 0;
      if (isCorrect) {
        const fraction = Math.max(0, 1 - elapsed / TIME_LIMIT);
        points = BASE_POINTS + Math.round(fraction * MAX_BONUS);
      }

      const answerData: PlayerAnswerData = { choice, correct: isCorrect, points, time: elapsed };

      if (playerNum === 1) {
        setP1Times((prev) => [...prev, elapsed]);
        setPlayer1((prev) => ({
          ...prev,
          currentAnswer: answerData,
          score: prev.score + points,
          correct: prev.correct + (isCorrect ? 1 : 0),
        }));
      } else {
        setP2Times((prev) => [...prev, elapsed]);
        setPlayer2((prev) => ({
          ...prev,
          currentAnswer: answerData,
          score: prev.score + points,
          correct: prev.correct + (isCorrect ? 1 : 0),
        }));
      }
    },
    [currentQuestion]
  );

  const startCountdown = useCallback(() => {
    setGameState("countdown");
    setCountdownNum(3);
    let count = 3;
    const interval = setInterval(() => {
      count -= 1;
      if (count <= 0) {
        clearInterval(interval);
        setGameState("question");
      } else {
        setCountdownNum(count);
      }
    }, 800);
  }, []);

  const startGame = useCallback(() => {
    setPlayer1(createPlayer());
    setPlayer2(createPlayer());
    setP1Times([]);
    setP2Times([]);
    setCurrentIndex(0);
    setShowingResult(false);
    p1AnsweredRef.current = false;
    p2AnsweredRef.current = false;
    showingResultRef.current = false;
    startCountdown();
  }, [startCountdown]);

  const handleRestart = useCallback(() => {
    clearTimer();
    startGame();
  }, [clearTimer, startGame]);

  useEffect(() => {
    if (gameState !== "question") return;

    questionStartTime.current = Date.now();
    setTimeRemaining(100);
    setShowingResult(false);
    showingResultRef.current = false;
    p1AnsweredRef.current = false;
    p2AnsweredRef.current = false;

    const step = 50;
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - questionStartTime.current;
      const pct = Math.max(0, 100 - (elapsed / TIME_LIMIT) * 100);
      setTimeRemaining(pct);

      if (elapsed >= TIME_LIMIT) {
        advanceToNext();
      }
    }, step);

    return () => clearTimer();
  }, [gameState, currentIndex, clearTimer, advanceToNext]);

  useEffect(() => {
    if (gameState !== "question" || !bothAnswered || showingResultRef.current) return;
    advanceToNext();
  }, [bothAnswered, gameState, advanceToNext]);

  useEffect(() => {
    if (gameState === "finished") {
      onScore?.("Jogador 1", player1.score);
      onScore?.("Jogador 2", player2.score);
    }
  }, [gameState, onScore, player1.score, player2.score]);

  const avgTime = (times: number[]) => {
    if (times.length === 0) return 0;
    return Math.round(times.reduce((a, b) => a + b, 0) / times.length);
  };

  const p1Avg = avgTime(p1Times);
  const p2Avg = avgTime(p2Times);

  /* ===================== IDLE SCREEN ===================== */
  if (gameState === "idle") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] gap-6 p-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 12 }}
          className="text-center"
        >
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            className="text-6xl mb-4"
          >
            ⚡
          </motion.div>
          <h1 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-cyan-400 to-pink-400 bg-clip-text text-transparent">
            TRIVIA FLASH
          </h1>
          <p className="text-slate-400 mt-3 text-lg">Rápido e Verdadeiro ou Falso!</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2 text-sm text-slate-400">
          <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50 text-center">
            <span className="text-emerald-400 font-bold">20</span> Perguntas
          </div>
          <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50 text-center">
            <span className="text-yellow-400 font-bold">5s</span> por pergunta
          </div>
          <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50 text-center">
            <span className="text-cyan-400 font-bold">2</span> Jogadores
          </div>
        </div>

        <div className="text-xs text-slate-500 space-y-1 text-center">
          <p>
            Cada pergunta tem apenas 2 opções: <span className="text-emerald-400">Verdadeiro</span> ou{" "}
            <span className="text-red-400">Falso</span>
          </p>
          <p>
            Responda rápido para ganhar <span className="text-yellow-400">bônus de velocidade</span>!
          </p>
        </div>

        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button
            onClick={startGame}
            size="lg"
            className="bg-gradient-to-r from-cyan-500 to-pink-500 hover:from-cyan-600 hover:to-pink-600 text-white font-bold text-lg px-10 py-6 rounded-2xl"
          >
            Começar Jogo
          </Button>
        </motion.div>
      </div>
    );
  }

  /* ===================== COUNTDOWN SCREEN ===================== */
  if (gameState === "countdown") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={countdownNum}
            initial={{ scale: 2, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="text-8xl font-black text-white"
          >
            {countdownNum}
          </motion.div>
        </AnimatePresence>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-slate-400 mt-6 text-lg"
        >
          Preparem-se!
        </motion.p>
      </div>
    );
  }

  /* ===================== FINISHED SCREEN ===================== */
  if (gameState === "finished") {
    const p1Won = player1.score > player2.score;
    const draw = player1.score === player2.score;
    const winner = p1Won ? 1 : draw ? 0 : 2;

    const getPodiumBorder = (pos: number) => {
      if (winner === 0) return "border-slate-500/50";
      if (pos === winner) return "border-yellow-500/50 shadow-lg shadow-yellow-500/10";
      return "border-slate-700/50 opacity-70";
    };

    return (
      <div className="flex flex-col items-center gap-6 p-4 min-h-[500px]">
        <motion.h1
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-3xl md:text-4xl font-black bg-gradient-to-r from-cyan-400 to-pink-400 bg-clip-text text-transparent"
        >
          Resultado Final
        </motion.h1>

        <div className="flex flex-col md:flex-row gap-4 items-stretch justify-center w-full max-w-2xl">
          <motion.div
            initial={{ x: -60, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 150 }}
            className={cn("flex-1 bg-slate-800/50 border rounded-2xl p-5", getPodiumBorder(1))}
          >
            {winner === 1 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.8, type: "spring" }}
                className="text-3xl mb-2 text-center"
              >
                🏆
              </motion.div>
            )}
            <div className="text-cyan-400 font-bold text-lg text-center">Jogador 1</div>
            <motion.div
              key={player1.score}
              initial={{ scale: 0.5 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 10 }}
              className="text-4xl font-black text-white text-center mt-2"
            >
              {player1.score}
            </motion.div>
            <div className="text-sm text-slate-400 text-center mt-1">pontos</div>
            <div className="flex justify-center gap-4 mt-3 text-sm text-slate-400">
              <span>
                <span className="text-emerald-400 font-bold">{player1.correct}</span> corretas
              </span>
              <span>
                <span className="text-yellow-400 font-bold">{p1Avg}ms</span> média
              </span>
            </div>
          </motion.div>

          <motion.div
            initial={{ x: 60, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.4, type: "spring", stiffness: 150 }}
            className={cn("flex-1 bg-slate-800/50 border rounded-2xl p-5", getPodiumBorder(2))}
          >
            {winner === 2 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.8, type: "spring" }}
                className="text-3xl mb-2 text-center"
              >
                🏆
              </motion.div>
            )}
            <div className="text-pink-400 font-bold text-lg text-center">Jogador 2</div>
            <motion.div
              key={player2.score}
              initial={{ scale: 0.5 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 10 }}
              className="text-4xl font-black text-white text-center mt-2"
            >
              {player2.score}
            </motion.div>
            <div className="text-sm text-slate-400 text-center mt-1">pontos</div>
            <div className="flex justify-center gap-4 mt-3 text-sm text-slate-400">
              <span>
                <span className="text-emerald-400 font-bold">{player2.correct}</span> corretas
              </span>
              <span>
                <span className="text-yellow-400 font-bold">{p2Avg}ms</span> média
              </span>
            </div>
          </motion.div>
        </div>

        {winner === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
            className="text-xl font-bold text-slate-300 mt-2"
          >
            Empate!
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
            className={cn("text-xl font-bold mt-2", winner === 1 ? "text-cyan-400" : "text-pink-400")}
          >
            Jogador {winner} venceu! 🎉
          </motion.div>
        )}

        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button
            onClick={handleRestart}
            size="lg"
            className="bg-gradient-to-r from-cyan-500 to-pink-500 hover:from-cyan-600 hover:to-pink-600 text-white font-bold text-lg px-8 py-5 rounded-2xl"
          >
            <RotateCcw className="mr-2 h-5 w-5" />
            Reiniciar Tudo
          </Button>
        </motion.div>
      </div>
    );
  }

  /* ===================== MAIN GAME SCREEN ===================== */
  return (
    <div className="flex flex-col gap-4 p-3 md:p-4 w-full max-w-3xl mx-auto">
      {/* Scoreboard */}
      <div className="bg-gradient-to-r from-cyan-900/30 to-pink-900/30 border border-cyan-500/20 rounded-xl p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-cyan-400 font-bold text-sm">Jogador 1</span>
          <motion.span
            key={`p1-${player1.score}`}
            initial={{ scale: 1.3 }}
            animate={{ scale: 1 }}
            className="text-white font-black text-lg"
          >
            {player1.score}
          </motion.span>
          <span className="text-emerald-400 text-xs">({player1.correct}✓)</span>
        </div>
        <div className="text-sm font-bold bg-slate-800/60 px-3 py-1 rounded-full">
          <Zap className="inline h-3.5 w-3.5 text-yellow-400 mr-1" />
          <span className="bg-gradient-to-r from-cyan-400 to-pink-400 bg-clip-text text-transparent">
            TRIVIA FLASH
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-emerald-400 text-xs">({player2.correct}✓)</span>
          <motion.span
            key={`p2-${player2.score}`}
            initial={{ scale: 1.3 }}
            animate={{ scale: 1 }}
            className="text-white font-black text-lg"
          >
            {player2.score}
          </motion.span>
          <span className="text-pink-400 font-bold text-sm">Jogador 2</span>
        </div>
      </div>

      {/* Progress + Timer + Category */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-slate-400 font-medium whitespace-nowrap">
          Pergunta {currentIndex + 1}/{TOTAL_QUESTIONS}
        </span>
        <div className="flex-1 h-2.5 bg-slate-800 rounded-full overflow-hidden min-w-[80px]">
          <motion.div
            className={cn("h-full rounded-full", timerColor)}
            style={{ width: `${timeRemaining}%` }}
          />
        </div>
        <Badge
          variant="outline"
          className="text-xs border-slate-600 text-slate-300 whitespace-nowrap"
        >
          {categoryEmoji[currentQuestion.category] || "❓"} {currentQuestion.category}
        </Badge>
      </div>

      {/* Question Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -30, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 text-center"
        >
          <div className="text-sm text-slate-400 mb-3 font-medium">
            {categoryEmoji[currentQuestion.category] || "❓"} {currentQuestion.category}
          </div>
          <p className="text-xl md:text-2xl font-semibold text-white leading-relaxed">
            &ldquo;{currentQuestion.text}&rdquo;
          </p>
          {showingResult && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="mt-4"
            >
              <Badge
                variant="outline"
                className={cn(
                  "text-sm px-4 py-1.5 font-bold",
                  currentQuestion.answer
                    ? "border-emerald-500/50 text-emerald-400 bg-emerald-500/10"
                    : "border-red-500/50 text-red-400 bg-red-500/10"
                )}
              >
                {currentQuestion.answer ? "Verdadeiro" : "Falso"}
              </Badge>
            </motion.div>
          )}
          {showingResult && timeRemaining <= 0 && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-red-400 font-bold mt-2 text-sm"
            >
              Tempo!
            </motion.p>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Player Zones - Side by Side on desktop, stacked on mobile */}
      <div className="flex flex-col md:flex-row gap-4">
        {/* Player 1 Zone */}
        <motion.div
          animate={
            showingResult && p1Answered
              ? player1.currentAnswer.correct
                ? { backgroundColor: ["rgba(16,185,129,0)", "rgba(16,185,129,0.15)"] }
                : { x: [0, -8, 8, -6, 6, -3, 3, 0] }
              : {}
          }
          transition={{ duration: 0.4 }}
          className={cn(
            "relative flex-1 rounded-xl border p-4",
            showingResult && p1Answered && player1.currentAnswer.correct
              ? "border-emerald-500/50"
              : showingResult && p1Answered && !player1.currentAnswer.correct
                ? "border-red-500/50"
                : "border-slate-700/50 bg-slate-900/50"
          )}
        >
          <div className="text-cyan-400 font-bold text-sm mb-3 text-center">Jogador 1</div>
          <div className="flex gap-3">
            <motion.div
              whileTap={{ scale: 0.92 }}
              whileHover={{ scale: 1.03 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
              className="flex-1"
            >
              <Button
                onClick={() => handleAnswer(1, true)}
                disabled={p1Answered || showingResult}
                className={cn(
                  "w-full h-14 md:h-16 text-base md:text-lg font-bold py-3 rounded-xl transition-all",
                  p1Answered && player1.currentAnswer.choice === true && player1.currentAnswer.correct
                    ? "bg-emerald-500/40 border-emerald-500/70 text-emerald-300"
                    : p1Answered && player1.currentAnswer.choice === true && !player1.currentAnswer.correct
                      ? "bg-red-500/40 border-red-500/70 text-red-300"
                      : "bg-emerald-500/20 border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/30 border"
                )}
              >
                <Check className="mr-2 h-4 w-4 md:h-5 md:w-5" />
                Verdadeiro
              </Button>
            </motion.div>
            <motion.div
              whileTap={{ scale: 0.92 }}
              whileHover={{ scale: 1.03 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
              className="flex-1"
            >
              <Button
                onClick={() => handleAnswer(1, false)}
                disabled={p1Answered || showingResult}
                className={cn(
                  "w-full h-14 md:h-16 text-base md:text-lg font-bold py-3 rounded-xl transition-all",
                  p1Answered && player1.currentAnswer.choice === false && player1.currentAnswer.correct
                    ? "bg-emerald-500/40 border-emerald-500/70 text-emerald-300"
                    : p1Answered && player1.currentAnswer.choice === false && !player1.currentAnswer.correct
                      ? "bg-red-500/40 border-red-500/70 text-red-300"
                      : "bg-red-500/20 border-red-500/50 text-red-400 hover:bg-red-500/30 border"
                )}
              >
                <X className="mr-2 h-4 w-4 md:h-5 md:w-5" />
                Falso
              </Button>
            </motion.div>
          </div>
          {p1Answered && player1.currentAnswer.time !== null && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute top-1 right-2 text-xs text-slate-500"
            >
              {player1.currentAnswer.time}ms
            </motion.span>
          )}
          {p1Answered && player1.currentAnswer.correct && player1.currentAnswer.points > BASE_POINTS && (
            <motion.span
              initial={{ scale: 0, x: -10 }}
              animate={{ scale: 1, x: 0 }}
              className="absolute top-1 left-2 text-xs text-yellow-400 font-bold flex items-center gap-0.5"
            >
              <Zap className="h-3 w-3" />
              +{player1.currentAnswer.points - BASE_POINTS}
            </motion.span>
          )}
          {showingResult && p1Answered && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "text-center text-sm font-bold mt-2",
                player1.currentAnswer.correct ? "text-emerald-400" : "text-red-400"
              )}
            >
              {player1.currentAnswer.correct ? "Correto!" : "Errado!"}
            </motion.div>
          )}
        </motion.div>

        {/* Player 2 Zone */}
        <motion.div
          animate={
            showingResult && p2Answered
              ? player2.currentAnswer.correct
                ? { backgroundColor: ["rgba(16,185,129,0)", "rgba(16,185,129,0.15)"] }
                : { x: [0, -8, 8, -6, 6, -3, 3, 0] }
              : {}
          }
          transition={{ duration: 0.4 }}
          className={cn(
            "relative flex-1 rounded-xl border p-4",
            showingResult && p2Answered && player2.currentAnswer.correct
              ? "border-emerald-500/50"
              : showingResult && p2Answered && !player2.currentAnswer.correct
                ? "border-red-500/50"
                : "border-slate-700/50 bg-slate-900/50"
          )}
        >
          <div className="text-pink-400 font-bold text-sm mb-3 text-center">Jogador 2</div>
          <div className="flex gap-3">
            <motion.div
              whileTap={{ scale: 0.92 }}
              whileHover={{ scale: 1.03 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
              className="flex-1"
            >
              <Button
                onClick={() => handleAnswer(2, true)}
                disabled={p2Answered || showingResult}
                className={cn(
                  "w-full h-14 md:h-16 text-base md:text-lg font-bold py-3 rounded-xl transition-all",
                  p2Answered && player2.currentAnswer.choice === true && player2.currentAnswer.correct
                    ? "bg-emerald-500/40 border-emerald-500/70 text-emerald-300"
                    : p2Answered && player2.currentAnswer.choice === true && !player2.currentAnswer.correct
                      ? "bg-red-500/40 border-red-500/70 text-red-300"
                      : "bg-emerald-500/20 border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/30 border"
                )}
              >
                <Check className="mr-2 h-4 w-4 md:h-5 md:w-5" />
                Verdadeiro
              </Button>
            </motion.div>
            <motion.div
              whileTap={{ scale: 0.92 }}
              whileHover={{ scale: 1.03 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
              className="flex-1"
            >
              <Button
                onClick={() => handleAnswer(2, false)}
                disabled={p2Answered || showingResult}
                className={cn(
                  "w-full h-14 md:h-16 text-base md:text-lg font-bold py-3 rounded-xl transition-all",
                  p2Answered && player2.currentAnswer.choice === false && player2.currentAnswer.correct
                    ? "bg-emerald-500/40 border-emerald-500/70 text-emerald-300"
                    : p2Answered && player2.currentAnswer.choice === false && !player2.currentAnswer.correct
                      ? "bg-red-500/40 border-red-500/70 text-red-300"
                      : "bg-red-500/20 border-red-500/50 text-red-400 hover:bg-red-500/30 border"
                )}
              >
                <X className="mr-2 h-4 w-4 md:h-5 md:w-5" />
                Falso
              </Button>
            </motion.div>
          </div>
          {p2Answered && player2.currentAnswer.time !== null && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute top-1 right-2 text-xs text-slate-500"
            >
              {player2.currentAnswer.time}ms
            </motion.span>
          )}
          {p2Answered && player2.currentAnswer.correct && player2.currentAnswer.points > BASE_POINTS && (
            <motion.span
              initial={{ scale: 0, x: 10 }}
              animate={{ scale: 1, x: 0 }}
              className="absolute top-1 left-2 text-xs text-yellow-400 font-bold flex items-center gap-0.5"
            >
              <Zap className="h-3 w-3" />
              +{player2.currentAnswer.points - BASE_POINTS}
            </motion.span>
          )}
          {showingResult && p2Answered && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "text-center text-sm font-bold mt-2",
                player2.currentAnswer.correct ? "text-emerald-400" : "text-red-400"
              )}
            >
              {player2.currentAnswer.correct ? "Correto!" : "Errado!"}
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Restart Button */}
      <div className="flex justify-center pt-1">
        <Button
          onClick={handleRestart}
          variant="ghost"
          size="sm"
          className="text-slate-500 hover:text-slate-300"
        >
          <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
          Reiniciar Tudo
        </Button>
      </div>
    </div>
  );
}
