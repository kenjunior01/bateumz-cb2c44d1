import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { RotateCcw, Timer, Send, Shuffle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Props {
  onScore?: (name: string, score: number) => void;
  liveCode?: string;
}

type GameState =
  | "category_select"
  | "countdown"
  | "playing"
  | "round_result"
  | "final_results";

interface Category {
  name: string;
  emoji: string;
  words: string[];
}

const CATEGORIES: Category[] = [
  {
    name: "Animais",
    emoji: "🐱",
    words: [
      "GATO",
      "CACHORRO",
      "ELEFANTE",
      "TIGRE",
      "LEÃO",
      "PAPAGAIO",
      "TARTARUGA",
      "GOLFINHO",
      "BORBOLETA",
      "JABUTI",
      "PINGUIM",
      "CACHORRO",
    ],
  },
  {
    name: "Frutas",
    emoji: "🍎",
    words: [
      "MORANGO",
      "BANANA",
      "ABACAXI",
      "LARANJA",
      "UVA",
      "MANGA",
      "CEREJA",
      "GOIABA",
      "AMORA",
      "PÊSSEGO",
      "CARAMBOLA",
      "JABUTICABA",
    ],
  },
  {
    name: "Países",
    emoji: "🌍",
    words: [
      "BRASIL",
      "PORTUGAL",
      "JAPÃO",
      "FRANÇA",
      "MÉXICO",
      "ITÁLIA",
      "ALEMANHA",
      "ARGENTINA",
      "CHILE",
      "CANADÁ",
      "ÍNDIA",
      "EGITO",
    ],
  },
  {
    name: "Esportes",
    emoji: "⚽",
    words: [
      "FUTEBOL",
      "BASQUETE",
      "VOLEIBOL",
      "TÊNIS",
      "NATAÇÃO",
      "BOXE",
      "SURFE",
      "JUDÔ",
      "GINÁSTICA",
      "ATLETISMO",
      "ESCALADA",
      "KARATÊ",
    ],
  },
  {
    name: "Cores",
    emoji: "🎨",
    words: [
      "VERMELHO",
      "AZUL",
      "VERDE",
      "AMARELO",
      "LARANJA",
      "ROXO",
      "MARROM",
      "CINZA",
      "DOURADO",
      "PRATEADO",
      "BRANCO",
      "PRETO",
    ],
  },
  {
    name: "Partes do Corpo",
    emoji: "🦶",
    words: [
      "CABEÇA",
      "CORPO",
      "BRAÇO",
      "PERNA",
      "MÃO",
      "PÉ",
      "DEDOS",
      "OLHO",
      "NARIZ",
      "BOCA",
      "ORELHA",
      "COTOVELO",
    ],
  },
  {
    name: "Comidas",
    emoji: "🍕",
    words: [
      "PIZZA",
      "HAMBÚRGUER",
      "SUSHI",
      "PASTEL",
      "COXINHA",
      "BRIGADEIRO",
      "PAO",
      "QUEIJO",
      "ARROZ",
      "FEIJÃO",
      "MACARRÃO",
      "SALADA",
    ],
  },
  {
    name: "Profissões",
    emoji: "👩‍⚕️",
    words: [
      "MÉDICO",
      "PROFESSOR",
      "ENGENHEIRO",
      "BOMBEIRO",
      "POLICIAL",
      "ADVOGADO",
      "DENTISTA",
      "COZINHEIRO",
      "MÚSICO",
      "ARTISTA",
      "PILOTO",
      "FARMACÊUTICO",
    ],
  },
];

const TOTAL_ROUNDS = 10;
const ROUND_TIME = 15;

function scrambleWord(word: string): string[] {
  const letters = word.split("");
  let attempts = 0;
  do {
    for (let i = letters.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [letters[i], letters[j]] = [letters[j], letters[i]];
    }
    attempts++;
  } while (
    letters.join("") === word &&
    letters.length > 1 &&
    attempts < 50
  );
  return letters;
}

function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

const WordScramble = ({ onScore, liveCode }: Props) => {
  const [gameState, setGameState] = useState<GameState>("category_select");
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [isRandom, setIsRandom] = useState(false);
  const [currentWord, setCurrentWord] = useState<string>("");
  const [scrambledLetters, setScrambledLetters] = useState<string[]>([]);
  const [currentHint, setCurrentHint] = useState<{ emoji: string; name: string }>({
    emoji: "",
    name: "",
  });
  const [round, setRound] = useState(1);
  const [timer, setTimer] = useState(ROUND_TIME);
  const [countdown, setCountdown] = useState(3);
  const [score1, setScore1] = useState(0);
  const [score2, setScore2] = useState(0);
  const [p1Input, setP1Input] = useState("");
  const [p2Input, setP2Input] = useState("");
  const [p1Answered, setP1Answered] = useState(false);
  const [p2Answered, setP2Answered] = useState(false);
  const [p1Correct, setP1Correct] = useState<boolean | null>(null);
  const [p2Correct, setP2Correct] = useState<boolean | null>(null);
  const [roundWinner, setRoundWinner] = useState<1 | 2 | 0>(0);
  const [wordPool, setWordPool] = useState<{ word: string; category: Category }[]>([]);
  const [letterRotations, setLetterRotations] = useState<number[]>([]);
  const [p1SpeedBonus, setP1SpeedBonus] = useState(0);
  const [p2SpeedBonus, setP2SpeedBonus] = useState(0);
  const [usedWords, setUsedWords] = useState<Set<string>>(new Set());

  const p1InputRef = useRef<HTMLInputElement>(null);
  const p2InputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const roundStartTimeRef = useRef<number>(0);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const clearCountdown = useCallback(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }, []);

  const generateWordPool = useCallback((cat: Category | null, random: boolean) => {
    if (random) {
      const pool: { word: string; category: Category }[] = [];
      const shuffled = shuffleArray(CATEGORIES);
      let idx = 0;
      while (pool.length < TOTAL_ROUNDS) {
        const c = shuffled[idx % shuffled.length];
        const cw = shuffleArray(c.words.filter((w) => w.length >= 4 && w.length <= 8));
        for (const word of cw) {
          if (!pool.find((p) => p.word === word) && pool.length < TOTAL_ROUNDS) {
            pool.push({ word, category: c });
          }
        }
        idx++;
      }
      return shuffleArray(pool).slice(0, TOTAL_ROUNDS);
    } else if (cat) {
      const filtered = shuffleArray(
        cat.words.filter((w) => w.length >= 4 && w.length <= 8)
      );
      const pool: { word: string; category: Category }[] = [];
      for (const word of filtered) {
        pool.push({ word, category: cat });
      }
      return pool.slice(0, TOTAL_ROUNDS);
    }
    return [];
  }, []);

  const startGame = useCallback(
    (cat: Category | null, random: boolean) => {
      const pool = generateWordPool(cat, random);
      setWordPool(pool);
      setSelectedCategory(cat);
      setIsRandom(random);
      setScore1(0);
      setScore2(0);
      setRound(1);
      setUsedWords(new Set());
      setGameState("countdown");
      setCountdown(3);
    },
    [generateWordPool]
  );

  const startRound = useCallback(
    (roundNum: number, pool: { word: string; category: Category }[]) => {
      if (roundNum > TOTAL_ROUNDS || pool.length === 0) {
        const s1 = score1;
        const s2 = score2;
        if (s1 > s2) onScore?.("Jogador 1", s1);
        if (s2 > s1) onScore?.("Jogador 2", s2);
        if (s1 === s2 && s1 > 0) {
          onScore?.("Jogador 1", s1);
          onScore?.("Jogador 2", s2);
        }
        if (s1 !== s2) {
          confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
          setTimeout(() => confetti({ particleCount: 60, angle: 60, spread: 55, origin: { x: 0 } }), 250);
          setTimeout(() => confetti({ particleCount: 60, angle: 120, spread: 55, origin: { x: 1 } }), 500);
        }
        setGameState("final_results");
        return;
      }

      const entry = pool[roundNum - 1];
      const word = entry.word;
      setCurrentWord(word);
      setCurrentHint({ emoji: entry.category.emoji, name: entry.category.name });
      const scrambled = scrambleWord(word);
      setScrambledLetters(scrambled);
      setLetterRotations(
        scrambled.map(() => Math.floor(Math.random() * 24) - 12)
      );
      setTimer(ROUND_TIME);
      setP1Input("");
      setP2Input("");
      setP1Answered(false);
      setP2Answered(false);
      setP1Correct(null);
      setP2Correct(null);
      setRoundWinner(0);
      setP1SpeedBonus(0);
      setP2SpeedBonus(0);
      roundStartTimeRef.current = Date.now();
      setGameState("playing");
    },
    [score1, score2, onScore]
  );

  const endRound = useCallback(
    (winner: 1 | 2 | 0, speedBonus: number = 0) => {
      clearTimer();
      if (winner === 1) {
        setScore1((s) => s + 1);
        setP1Correct(true);
        setP1SpeedBonus(speedBonus);
      } else if (winner === 2) {
        setScore2((s) => s + 1);
        setP2Correct(true);
        setP2SpeedBonus(speedBonus);
      }
      setRoundWinner(winner);
      setGameState("round_result");
    },
    [clearTimer]
  );

  useEffect(() => {
    if (gameState !== "countdown") return;
    clearCountdown();
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearCountdown();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearCountdown();
  }, [gameState, clearCountdown]);

  useEffect(() => {
    if (gameState === "countdown" && countdown === 0) {
      startRound(round, wordPool);
    }
  }, [gameState, countdown, round, wordPool, startRound]);

  useEffect(() => {
    if (gameState !== "playing") return;
    clearTimer();
    timerRef.current = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          clearTimer();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearTimer();
  }, [gameState, clearTimer]);

  useEffect(() => {
    if (gameState === "playing" && timer === 0) {
      endRound(0);
    }
  }, [gameState, timer, endRound]);

  const normalizeAnswer = (input: string): string => {
    return input
      .trim()
      .toUpperCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  };

  const normalizeWord = (word: string): string => {
    return word
      .trim()
      .toUpperCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  };

  const submitAnswer = useCallback(
    (player: 1 | 2) => {
      if (gameState !== "playing") return;
      if (player === 1 && p1Answered) return;
      if (player === 2 && p2Answered) return;

      const input = player === 1 ? p1Input : p2Input;
      const elapsed = (Date.now() - roundStartTimeRef.current) / 1000;
      const speedBonus = elapsed < ROUND_TIME ? Math.max(0, Math.floor((ROUND_TIME - elapsed) * 2)) : 0;

      if (normalizeAnswer(input) === normalizeWord(currentWord)) {
        if (player === 1) {
          setP1Answered(true);
          endRound(1, speedBonus);
        } else {
          setP2Answered(true);
          endRound(2, speedBonus);
        }
      } else {
        if (player === 1) {
          setP1Answered(true);
          setP1Correct(false);
          setTimeout(() => {
            setP1Correct(null);
            setP1Answered(false);
            setP1Input("");
            p1InputRef.current?.focus();
          }, 600);
        } else {
          setP2Answered(true);
          setP2Correct(false);
          setTimeout(() => {
            setP2Correct(null);
            setP2Answered(false);
            setP2Input("");
            p2InputRef.current?.focus();
          }, 600);
        }
      }
    },
    [
      gameState,
      p1Answered,
      p2Answered,
      p1Input,
      p2Input,
      currentWord,
      roundStartTimeRef,
      endRound,
    ]
  );

  const handleP1Submit = useCallback(() => submitAnswer(1), [submitAnswer]);
  const handleP2Submit = useCallback(() => submitAnswer(2), [submitAnswer]);

  const handleP1KeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleP1Submit();
      }
    },
    [handleP1Submit]
  );

  const handleP2KeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleP2Submit();
      }
    },
    [handleP2Submit]
  );

  const nextRound = useCallback(() => {
    const nextRoundNum = round + 1;
    setRound(nextRoundNum);
    if (nextRoundNum > TOTAL_ROUNDS) {
      const s1 = score1 + (roundWinner === 1 ? 1 : 0);
      const s2 = score2 + (roundWinner === 2 ? 1 : 0);
      if (s1 > s2) onScore?.("Jogador 1", s1 * 10 + Math.floor(Math.random() * 20));
      if (s2 > s1) onScore?.("Jogador 2", s2 * 10 + Math.floor(Math.random() * 20));
      if (s1 === s2 && s1 > 0) {
        onScore?.("Jogador 1", s1 * 10);
        onScore?.("Jogador 2", s2 * 10);
      }
      if (s1 !== s2) {
        confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
        setTimeout(() => confetti({ particleCount: 60, angle: 60, spread: 55, origin: { x: 0 } }), 250);
        setTimeout(() => confetti({ particleCount: 60, angle: 120, spread: 55, origin: { x: 1 } }), 500);
      }
      setGameState("final_results");
    } else {
      setGameState("countdown");
      setCountdown(3);
    }
  }, [round, roundWinner, score1, score2, onScore]);

  const resetAll = useCallback(() => {
    clearTimer();
    clearCountdown();
    setGameState("category_select");
    setSelectedCategory(null);
    setIsRandom(false);
    setCurrentWord("");
    setScrambledLetters([]);
    setRound(1);
    setTimer(ROUND_TIME);
    setCountdown(3);
    setScore1(0);
    setScore2(0);
    setP1Input("");
    setP2Input("");
    setP1Answered(false);
    setP2Answered(false);
    setP1Correct(null);
    setP2Correct(null);
    setRoundWinner(0);
    setWordPool([]);
    setLetterRotations([]);
    setUsedWords(new Set());
    setP1SpeedBonus(0);
    setP2SpeedBonus(0);
  }, [clearTimer, clearCountdown]);

  const computeFinalScores = useCallback(() => {
    const fScore1 =
      score1 * 10 +
      (roundWinner === 1 ? p1SpeedBonus : 0);
    const fScore2 =
      score2 * 10 +
      (roundWinner === 2 ? p2SpeedBonus : 0);
    return { fScore1, fScore2 };
  }, [score1, score2, roundWinner, p1SpeedBonus, p2SpeedBonus]);

  const timerColor =
    timer > 10
      ? "text-green-400"
      : timer > 5
        ? "text-yellow-400"
        : "text-red-400";

  const timerBarWidth = `${(timer / ROUND_TIME) * 100}%`;

  const { fScore1, fScore2 } = gameState === "final_results" ? computeFinalScores() : { fScore1: 0, fScore2: 0 };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4">
      <AnimatePresence mode="wait">
        {gameState === "category_select" && (
          <motion.div
            key="category_select"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            className="w-full max-w-2xl"
          >
            <div className="text-center mb-8">
              <motion.h1
                className="text-4xl md:text-5xl font-black bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-2"
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
              >
                <Shuffle className="inline-block mr-2 text-cyan-400" />
                Palavras Embaralhadas
              </motion.h1>
              <p className="text-slate-400 text-lg">Escolha uma categoria para jogar!</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              {CATEGORIES.map((cat) => (
                <motion.button
                  key={cat.name}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => startGame(cat, false)}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl bg-slate-800/80 border border-slate-700 hover:border-cyan-500/50 hover:bg-slate-800 transition-all cursor-pointer"
                >
                  <span className="text-3xl">{cat.emoji}</span>
                  <span className="text-sm font-semibold text-slate-200">{cat.name}</span>
                  <span className="text-xs text-slate-500">
                    {cat.words.filter((w) => w.length >= 4 && w.length <= 8).length} palavras
                  </span>
                </motion.button>
              ))}
            </div>

            <div className="text-center">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => startGame(null, true)}
                className="inline-flex items-center gap-3 px-8 py-4 rounded-xl bg-gradient-to-r from-cyan-600 to-pink-600 hover:from-cyan-500 hover:to-pink-500 font-bold text-lg transition-all cursor-pointer"
              >
                <Shuffle className="w-5 h-5" />
                Aleatório
              </motion.button>
            </div>
          </motion.div>
        )}

        {gameState === "countdown" && (
          <motion.div
            key="countdown"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.5 }}
            className="flex flex-col items-center gap-4"
          >
            <AnimatePresence mode="wait">
              {countdown > 0 && (
                <motion.span
                  key={countdown}
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  exit={{ scale: 2, opacity: 0, rotate: 180 }}
                  transition={{ type: "spring", stiffness: 300, damping: 15 }}
                  className="text-8xl font-black bg-gradient-to-r from-cyan-400 to-pink-400 bg-clip-text text-transparent"
                >
                  {countdown}
                </motion.span>
              )}
            </AnimatePresence>
            {countdown === 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="text-5xl font-black text-yellow-400"
              >
                Começar!
              </motion.span>
            )}
            <Badge variant="outline" className="border-cyan-500/40 text-cyan-400 text-sm">
              Round {round}/{TOTAL_ROUNDS}
            </Badge>
          </motion.div>
        )}

        {(gameState === "playing" || gameState === "round_result") && (
          <motion.div
            key="playing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full max-w-2xl"
          >
            <div className="bg-gradient-to-r from-cyan-900/30 to-pink-900/30 border border-cyan-500/20 rounded-xl p-4 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <motion.div
                    className="w-10 h-10 rounded-full bg-cyan-500/20 border-2 border-cyan-400 flex items-center justify-center text-cyan-400 font-bold text-sm"
                    animate={
                      roundWinner === 1
                        ? { scale: [1, 1.2, 1] }
                        : {}
                    }
                  >
                    1
                  </motion.div>
                  <div>
                    <p className="text-cyan-400 font-bold text-sm">Jogador 1</p>
                    <motion.p
                      key={`s1-${score1}`}
                      initial={{ scale: 1.4, color: "#22d3ee" }}
                      animate={{ scale: 1, color: "#22d3ee" }}
                      className="text-white font-black text-2xl"
                    >
                      {score1}
                    </motion.p>
                  </div>
                </div>

                <div className="text-center flex-1">
                  <p className="text-slate-400 text-xs font-semibold tracking-widest uppercase">
                    Palavras Embaralhadas
                  </p>
                  <p className="text-slate-500 text-xs">
                    Round {round}/{TOTAL_ROUNDS}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-pink-400 font-bold text-sm">Jogador 2</p>
                    <motion.p
                      key={`s2-${score2}`}
                      initial={{ scale: 1.4, color: "#f472b6" }}
                      animate={{ scale: 1, color: "#f472b6" }}
                      className="text-white font-black text-2xl"
                    >
                      {score2}
                    </motion.p>
                  </div>
                  <motion.div
                    className="w-10 h-10 rounded-full bg-pink-500/20 border-2 border-pink-400 flex items-center justify-center text-pink-400 font-bold text-sm"
                    animate={
                      roundWinner === 2
                        ? { scale: [1, 1.2, 1] }
                        : {}
                    }
                  >
                    2
                  </motion.div>
                </div>
              </div>
            </div>

            <div className="mb-4">
              <div className="flex items-center justify-between mb-1">
                <Badge variant="outline" className="border-slate-700 text-slate-400 text-xs">
                  <Timer className="w-3 h-3 mr-1" />
                  Dica
                </Badge>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-slate-300">
                    {currentHint.emoji} {currentHint.name}
                  </span>
                  <motion.span
                    className={cn("font-black text-xl tabular-nums", timerColor)}
                    animate={timer <= 5 && timer > 0 ? { scale: [1, 1.1, 1] } : {}}
                    transition={{ repeat: Infinity, duration: 0.5 }}
                  >
                    {timer}s
                  </motion.span>
                </div>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <motion.div
                  className={cn(
                    "h-full rounded-full transition-all duration-1000 ease-linear",
                    timer > 10
                      ? "bg-green-500"
                      : timer > 5
                        ? "bg-yellow-500"
                        : "bg-red-500"
                  )}
                  style={{ width: timerBarWidth }}
                />
              </div>
            </div>

            <div className="flex justify-center flex-wrap gap-2 my-6">
              <AnimatePresence>
                {scrambledLetters.map((letter, i) => (
                  <motion.div
                    key={`${currentWord}-${i}-${letter}`}
                    initial={{ opacity: 0, y: -40, rotate: letterRotations[i] * 3 }}
                    animate={{
                      opacity: 1,
                      y: 0,
                      rotate: letterRotations[i],
                      scale: 1,
                    }}
                    exit={{ opacity: 0, y: 40, scale: 0 }}
                    transition={{
                      type: "spring",
                      stiffness: 400,
                      damping: 15,
                      delay: i * 0.06,
                    }}
                    whileHover={{ scale: 1.15, rotate: 0 }}
                    className={cn(
                      "w-10 h-12 rounded-lg bg-slate-800 border-2 border-slate-600 flex items-center justify-center text-white font-black text-xl select-none",
                      gameState === "round_result" &&
                        roundWinner !== 0 &&
                        "border-yellow-500/50 bg-yellow-500/10"
                    )}
                  >
                    {letter}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            <AnimatePresence>
              {gameState === "round_result" && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center mb-4"
                >
                  <p className="text-slate-500 text-sm">A resposta era:</p>
                  <p className="text-2xl font-black text-yellow-400 tracking-wider">
                    {currentWord}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            <div className={cn("flex flex-col md:flex-row gap-4 mb-6")}>
              <div className="flex-1">
                <motion.div
                  animate={
                    p1Correct === true
                      ? { x: [0, 0, 0], borderColor: "#22c55e" }
                      : p1Correct === false
                        ? { x: [0, -10, 10, -10, 10, 0] }
                        : {}
                  }
                  className={cn(
                    "flex gap-2 rounded-xl border-2 p-1",
                    p1Correct === true
                      ? "border-green-500 bg-green-500/10"
                      : p1Correct === false
                        ? "border-red-500 bg-red-500/10"
                        : "border-slate-700 bg-slate-900"
                  )}
                >
                  <input
                    ref={p1InputRef}
                    type="text"
                    value={p1Input}
                    onChange={(e) => setP1Input(e.target.value)}
                    onKeyDown={handleP1KeyDown}
                    placeholder="Jogador 1..."
                    disabled={gameState === "round_result" || p1Answered}
                    autoComplete="off"
                    className="flex-1 bg-transparent text-cyan-400 placeholder:text-slate-600 font-semibold text-lg px-3 py-2 outline-none disabled:opacity-50"
                  />
                  <Button
                    size="sm"
                    onClick={handleP1Submit}
                    disabled={gameState === "round_result" || p1Answered || !p1Input.trim()}
                    className="bg-cyan-600 hover:bg-cyan-500 text-white"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </motion.div>
                <AnimatePresence>
                  {p1Correct === true && (
                    <motion.p
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0 }}
                      className="text-green-400 text-sm font-bold mt-1"
                    >
                      ✅ Correto!
                    </motion.p>
                  )}
                  {p1Correct === false && (
                    <motion.p
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0 }}
                      className="text-red-400 text-sm font-bold mt-1"
                    >
                      ❌ Errou!
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              <div className="flex items-center justify-center">
                <Badge
                  className="bg-gradient-to-r from-cyan-600 to-pink-600 border-0 text-white font-black text-sm px-4 py-1"
                >
                  VS
                </Badge>
              </div>

              <div className="flex-1">
                <motion.div
                  animate={
                    p2Correct === true
                      ? { x: [0, 0, 0], borderColor: "#22c55e" }
                      : p2Correct === false
                        ? { x: [0, -10, 10, -10, 10, 0] }
                        : {}
                  }
                  className={cn(
                    "flex gap-2 rounded-xl border-2 p-1",
                    p2Correct === true
                      ? "border-green-500 bg-green-500/10"
                      : p2Correct === false
                        ? "border-red-500 bg-red-500/10"
                        : "border-slate-700 bg-slate-900"
                  )}
                >
                  <input
                    ref={p2InputRef}
                    type="text"
                    value={p2Input}
                    onChange={(e) => setP2Input(e.target.value)}
                    onKeyDown={handleP2KeyDown}
                    placeholder="Jogador 2..."
                    disabled={gameState === "round_result" || p2Answered}
                    autoComplete="off"
                    className="flex-1 bg-transparent text-pink-400 placeholder:text-slate-600 font-semibold text-lg px-3 py-2 outline-none disabled:opacity-50"
                  />
                  <Button
                    size="sm"
                    onClick={handleP2Submit}
                    disabled={gameState === "round_result" || p2Answered || !p2Input.trim()}
                    className="bg-pink-600 hover:bg-pink-500 text-white"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </motion.div>
                <AnimatePresence>
                  {p2Correct === true && (
                    <motion.p
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0 }}
                      className="text-green-400 text-sm font-bold mt-1"
                    >
                      ✅ Correto!
                    </motion.p>
                  )}
                  {p2Correct === false && (
                    <motion.p
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0 }}
                      className="text-red-400 text-sm font-bold mt-1"
                    >
                      ❌ Errou!
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <AnimatePresence>
              {gameState === "round_result" && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-center"
                >
                  {roundWinner === 0 && (
                    <motion.p
                      initial={{ scale: 0.8 }}
                      animate={{ scale: 1 }}
                      className="text-yellow-400 font-black text-2xl mb-4"
                    >
                      ⏰ Tempo!
                    </motion.p>
                  )}
                  {roundWinner === 1 && (
                    <motion.div
                      initial={{ scale: 0.8 }}
                      animate={{ scale: 1 }}
                      className="mb-4"
                    >
                      <p className="text-cyan-400 font-black text-2xl mb-1">
                        🎉 Jogador 1 venceu!
                      </p>
                      <p className="text-slate-500 text-sm">
                        +10 pontos {p1SpeedBonus > 0 && `+${p1SpeedBonus} bônus de velocidade`}
                      </p>
                    </motion.div>
                  )}
                  {roundWinner === 2 && (
                    <motion.div
                      initial={{ scale: 0.8 }}
                      animate={{ scale: 1 }}
                      className="mb-4"
                    >
                      <p className="text-pink-400 font-black text-2xl mb-1">
                        🎉 Jogador 2 venceu!
                      </p>
                      <p className="text-slate-500 text-sm">
                        +10 pontos {p2SpeedBonus > 0 && `+${p2SpeedBonus} bônus de velocidade`}
                      </p>
                    </motion.div>
                  )}

                  <div className="flex items-center justify-center gap-3">
                    <motion.div whileHover={{ scale: 1.03 }}>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={resetAll}
                      className="border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800"
                    >
                      <RotateCcw className="w-4 h-4 mr-1" />
                      Reiniciar Tudo
                    </Button>
                    </motion.div>
                    <motion.div whileHover={{ scale: 1.03 }}>
                    <Button
                      onClick={nextRound}
                      className="bg-gradient-to-r from-cyan-600 to-pink-600 hover:from-cyan-500 hover:to-pink-500 text-white font-bold shadow-[0_0_20px_rgba(34,211,238,0.3)]"
                    >
                      {round >= TOTAL_ROUNDS ? "Ver Resultados" : "Próximo Round"}
                      <Send className="w-4 h-4 ml-1" />
                    </Button>
                    </motion.div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {gameState === "final_results" && (
          <motion.div
            key="final_results"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -40 }}
            className="w-full max-w-2xl"
          >
            <motion.div
              className="bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-700 rounded-2xl p-8 text-center"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
            >
              <motion.h2
                className="text-3xl font-black mb-6 bg-gradient-to-r from-cyan-400 to-pink-400 bg-clip-text text-transparent"
                initial={{ y: -20 }}
                animate={{ y: 0 }}
              >
                🏆 Resultado Final 🏆
              </motion.h2>

              <div className="flex items-center justify-center gap-8 mb-8">
                <motion.div
                  className={cn(
                    "flex flex-col items-center gap-2 p-6 rounded-xl border-2",
                    fScore1 > fScore2
                      ? "border-cyan-400 bg-cyan-500/10"
                      : fScore1 === fScore2
                        ? "border-yellow-400 bg-yellow-500/10"
                        : "border-slate-700 bg-slate-800/50"
                  )}
                  initial={{ x: -50, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <div className="w-14 h-14 rounded-full bg-cyan-500/20 border-2 border-cyan-400 flex items-center justify-center text-cyan-400 font-black text-xl">
                    1
                  </div>
                  <p className="text-cyan-400 font-bold">Jogador 1</p>
                  <motion.p
                    className="text-4xl font-black text-white"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.5, type: "spring" }}
                  >
                    {fScore1}
                  </motion.p>
                  <p className="text-slate-500 text-xs">{score1} acertos</p>
                  {fScore1 > fScore2 && (
                    <Badge className="bg-cyan-600 border-0 mt-1">👑 Vencedor!</Badge>
                  )}
                </motion.div>

                <div className="text-slate-600 text-2xl font-bold">VS</div>

                <motion.div
                  className={cn(
                    "flex flex-col items-center gap-2 p-6 rounded-xl border-2",
                    fScore2 > fScore1
                      ? "border-pink-400 bg-pink-500/10"
                      : fScore2 === fScore1
                        ? "border-yellow-400 bg-yellow-500/10"
                        : "border-slate-700 bg-slate-800/50"
                  )}
                  initial={{ x: 50, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <div className="w-14 h-14 rounded-full bg-pink-500/20 border-2 border-pink-400 flex items-center justify-center text-pink-400 font-black text-xl">
                    2
                  </div>
                  <p className="text-pink-400 font-bold">Jogador 2</p>
                  <motion.p
                    className="text-4xl font-black text-white"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.5, type: "spring" }}
                  >
                    {fScore2}
                  </motion.p>
                  <p className="text-slate-500 text-xs">{score2} acertos</p>
                  {fScore2 > fScore1 && (
                    <Badge className="bg-pink-600 border-0 mt-1">👑 Vencedor!</Badge>
                  )}
                </motion.div>
              </div>

              {fScore1 === fScore2 && fScore1 > 0 && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-yellow-400 font-bold text-xl mb-6"
                >
                  🤝 Empate!
                </motion.p>
              )}

              <div className="flex items-center justify-center gap-3">
                <motion.div whileHover={{ scale: 1.03 }}>
                <Button
                  onClick={resetAll}
                  className="bg-gradient-to-r from-cyan-600 to-pink-600 hover:from-cyan-500 hover:to-pink-500 text-white font-bold px-6 shadow-[0_0_20px_rgba(34,211,238,0.3)]"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reiniciar Tudo
                </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.03 }}>
                <Button
                  variant="outline"
                  onClick={() => {
                    if (selectedCategory && !isRandom) {
                      startGame(selectedCategory, false);
                    } else {
                      startGame(null, true);
                    }
                  }}
                  className="border-slate-700 text-slate-300 hover:bg-slate-800 px-6 shadow-[0_0_15px_rgba(161,161,170,0.15)]"
                >
                  <Shuffle className="w-4 h-4 mr-2" />
                  Jogar Novamente
                </Button>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default WordScramble;
