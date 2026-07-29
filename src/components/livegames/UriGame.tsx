import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface UriProps {
  onScore?: (name: string, score: number) => void;
  liveCode?: string;
}

type Phase = "menu" | "countdown" | "playing" | "result";
type Mode = "bot" | "pvp";
type Difficulty = "Facil" | "Medio" | "Dificil";
type Temperature = "Quente" | "Morno" | "Frio" | "Congelado" | "Acertou";

interface GuessEntry {
  value: number;
  temperature: Temperature;
  direction: "maior" | "menor" | "";
}

const GAME_DURATION = 60;

const TEMP_COLORS: Record<Temperature, string> = {
  Acertou: "#009140",
  Quente: "#FF0000",
  Morno: "#FFD700",
  Frio: "#6B7280",
  Congelado: "#9CA3AF",
};

const TEMP_BG: Record<Temperature, string> = {
  Acertou: "rgba(0,145,64,0.15)",
  Quente: "rgba(255,0,0,0.12)",
  Morno: "rgba(255,215,0,0.12)",
  Frio: "rgba(107,114,128,0.10)",
  Congelado: "rgba(156,163,175,0.08)",
};

const BOT_NOISE: Record<Difficulty, number> = { Facil: 20, Medio: 8, Dificil: 2 };
const BOT_SPEED: Record<Difficulty, [number, number]> = {
  Facil: [2500, 4500],
  Medio: [1500, 3000],
  Dificil: [1000, 2000],
};

function getTemperature(guess: number, secret: number): Temperature {
  const diff = Math.abs(guess - secret);
  if (diff === 0) return "Acertou";
  if (diff <= 10) return "Quente";
  if (diff <= 25) return "Morno";
  if (diff <= 50) return "Frio";
  return "Congelado";
}

function getDirection(guess: number, secret: number): "maior" | "menor" | "" {
  if (guess === secret) return "";
  return guess < secret ? "maior" : "menor";
}

function generateSecret(): number {
  return Math.floor(Math.random() * 100) + 1;
}

const CapulanaPattern = () => (
  <svg
    className="absolute inset-0 w-full h-full opacity-[0.04] pointer-events-none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <pattern
        id="uri-capulana-pattern"
        x="0"
        y="0"
        width="28"
        height="28"
        patternUnits="userSpaceOnUse"
      >
        <path d="M14 0L28 14L14 28L0 14Z" fill="none" stroke="#FFD700" strokeWidth="0.6" />
        <circle cx="14" cy="14" r="4" fill="none" stroke="#009140" strokeWidth="0.4" />
        <path d="M14 2L26 14L14 26L2 14Z" fill="none" stroke="#FF6B35" strokeWidth="0.3" />
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#uri-capulana-pattern)" />
  </svg>
);

export default function UriGame({ onScore, liveCode }: UriProps) {
  const [mode, setMode] = useState<Mode>("bot");
  const [difficulty, setDifficulty] = useState<Difficulty>("Medio");
  const [phase, setPhase] = useState<Phase>("menu");
  const [countdownNum, setCountdownNum] = useState(3);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [secret, setSecret] = useState(0);
  const [round, setRound] = useState(1);
  const [score, setScore] = useState({ p1: 0, p2: 0 });
  const [p1History, setP1History] = useState<GuessEntry[]>([]);
  const [p2History, setP2History] = useState<GuessEntry[]>([]);
  const [p1Tries, setP1Tries] = useState(0);
  const [p2Tries, setP2Tries] = useState(0);
  const [p1Input, setP1Input] = useState("");
  const [p2Input, setP2Input] = useState("");
  const [roundWinner, setRoundWinner] = useState<"p1" | "p2" | null>(null);
  const [roundMsg, setRoundMsg] = useState("");
  const [roundsWon, setRoundsWon] = useState({ p1: 0, p2: 0 });

  const roundEndedRef = useRef(false);
  const botStateRef = useRef({ low: 1, high: 100 });
  const botTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const roundTransRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gameTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const secretRef = useRef(0);
  const p1InputRef = useRef<HTMLInputElement>(null);
  const p2InputRef = useRef<HTMLInputElement>(null);

  const secretSnapshot = useRef(0);
  const p1TriesRef = useRef(0);
  const p2TriesRef = useRef(0);

  // Keep refs in sync
  useEffect(() => {
    secretSnapshot.current = secret;
  }, [secret]);
  useEffect(() => {
    p1TriesRef.current = p1Tries;
  }, [p1Tries]);
  useEffect(() => {
    p2TriesRef.current = p2Tries;
  }, [p2Tries]);

  const clearAllTimers = useCallback(() => {
    if (botTimerRef.current) { clearTimeout(botTimerRef.current); botTimerRef.current = null; }
    if (roundTransRef.current) { clearTimeout(roundTransRef.current); roundTransRef.current = null; }
    if (gameTimerRef.current) { clearInterval(gameTimerRef.current); gameTimerRef.current = null; }
  }, []);

  const startNewRound = useCallback(() => {
    const newSecret = generateSecret();
    setSecret(newSecret);
    secretRef.current = newSecret;
    setP1History([]);
    setP2History([]);
    setP1Tries(0);
    setP2Tries(0);
    p1TriesRef.current = 0;
    p2TriesRef.current = 0;
    setRoundWinner(null);
    setRoundMsg("");
    roundEndedRef.current = false;
    botStateRef.current = { low: 1, high: 100 };
    setRound((r) => r + 1);
  }, []);

  const endGame = useCallback(() => {
    clearAllTimers();
    setPhase("result");
    onScore?.("Uri", score.p1);
  }, [clearAllTimers, onScore, score.p1]);

  // Handle a guess from a player
  const processGuess = useCallback(
    (player: "p1" | "p2", value: number) => {
      if (roundEndedRef.current) return;
      const s = secretSnapshot.current;
      const temp = getTemperature(value, s);
      const dir = getDirection(value, s);
      const entry: GuessEntry = { value, temperature: temp, direction: dir };

      if (player === "p1") {
        setP1History((h) => [...h, entry]);
        setP1Tries((t) => t + 1);
        p1TriesRef.current += 1;
      } else {
        setP2History((h) => [...h, entry]);
        setP2Tries((t) => t + 1);
        p2TriesRef.current += 1;
      }

      if (temp === "Acertou") {
        roundEndedRef.current = true;
        const tries = player === "p1" ? p1TriesRef.current : p2TriesRef.current;
        const pts = Math.max(0, 100 - tries * 5);
        setRoundWinner(player);
        const label = player === "p1" ? "Jogador 1" : mode === "bot" ? "Bot" : "Jogador 2";
        setRoundMsg(`${label} acertou! O numero era ${s}. +${pts} pontos!`);
        setScore((prev) => ({ ...prev, [player]: prev[player as "p1" | "p2"] + pts }));
        setRoundsWon((prev) => ({ ...prev, [player]: prev[player as "p1" | "p2"] + 1 }));

        // Start new round after delay
        roundTransRef.current = setTimeout(() => {
          startNewRound();
        }, 2000);
      }
    },
    [mode, startNewRound]
  );

  // Bot AI
  useEffect(() => {
    if (phase !== "playing" || mode !== "bot" || roundEndedRef.current) return;

    const [minMs, maxMs] = BOT_SPEED[difficulty];
    const delay = minMs + Math.random() * (maxMs - minMs);

    botTimerRef.current = setTimeout(() => {
      if (roundEndedRef.current || phase !== "playing") return;

      const bs = botStateRef.current;
      const mid = Math.floor((bs.low + bs.high) / 2);
      const noise = BOT_NOISE[difficulty];
      const noisyGuess = mid + Math.floor(Math.random() * (noise * 2 + 1)) - noise;
      const clamped = Math.max(1, Math.min(100, Math.max(bs.low, Math.min(bs.high, noisyGuess))));

      const temp = getTemperature(clamped, secretSnapshot.current);
      const dir = getDirection(clamped, secretSnapshot.current);

      // Update bot's binary search bounds
      if (dir === "maior") {
        botStateRef.current.low = Math.min(100, clamped + 1);
      } else if (dir === "menor") {
        botStateRef.current.high = Math.max(1, clamped - 1);
      }

      processGuess("p2", clamped);
    }, delay);

    return () => {
      if (botTimerRef.current) {
        clearTimeout(botTimerRef.current);
        botTimerRef.current = null;
      }
    };
  }, [phase, mode, difficulty, round, roundWinner, processGuess]);

  // Game timer
  useEffect(() => {
    if (phase !== "playing") return;
    gameTimerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearAllTimers();
          setPhase("result");
          onScore?.("Uri", score.p1);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (gameTimerRef.current) {
        clearInterval(gameTimerRef.current);
        gameTimerRef.current = null;
      }
    };
  }, [phase, clearAllTimers, onScore, score.p1]);

  // Countdown effect
  useEffect(() => {
    if (phase !== "countdown") return;
    if (countdownNum <= 0) {
      const s = generateSecret();
      setSecret(s);
      secretSnapshot.current = s;
      setPhase("playing");
      return;
    }
    const t = setTimeout(() => setCountdownNum((n) => n - 1), 800);
    return () => clearTimeout(t);
  }, [phase, countdownNum]);

  const startGame = useCallback(() => {
    setScore({ p1: 0, p2: 0 });
    setRoundsWon({ p1: 0, p2: 0 });
    setP1History([]);
    setP2History([]);
    setP1Tries(0);
    setP2Tries(0);
    p1TriesRef.current = 0;
    p2TriesRef.current = 0;
    setRound(1);
    setTimeLeft(GAME_DURATION);
    setRoundWinner(null);
    setRoundMsg("");
    setP1Input("");
    setP2Input("");
    roundEndedRef.current = false;
    botStateRef.current = { low: 1, high: 100 };
    setCountdownNum(3);
    setPhase("countdown");
  }, []);

  const handleP1Submit = useCallback(() => {
    const num = parseInt(p1Input);
    if (isNaN(num) || num < 1 || num > 100) return;
    processGuess("p1", num);
    setP1Input("");
    setTimeout(() => p1InputRef.current?.focus(), 50);
  }, [p1Input, processGuess]);

  const handleP2Submit = useCallback(() => {
    const num = parseInt(p2Input);
    if (isNaN(num) || num < 1 || num > 100) return;
    processGuess("p2", num);
    setP2Input("");
    setTimeout(() => p2InputRef.current?.focus(), 50);
  }, [p2Input, processGuess]);

  const handleP1KeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") handleP1Submit();
    },
    [handleP1Submit]
  );

  const handleP2KeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") handleP2Submit();
    },
    [handleP2Submit]
  );

  const resetGame = useCallback(() => {
    clearAllTimers();
    setPhase("menu");
  }, [clearAllTimers]);

  // Cleanup on unmount
  useEffect(() => {
    return () => clearAllTimers();
  }, [clearAllTimers]);

  const p2Label = mode === "bot" ? "Bot" : "Jogador 2";
  const timerPct = (timeLeft / GAME_DURATION) * 100;
  const timerColor =
    timeLeft > 30 ? "#009140" : timeLeft > 15 ? "#FFD700" : "#FF0000";

  return (
    <div className="relative w-full max-w-2xl mx-auto rounded-2xl border-2 border-amber-700/40 overflow-hidden bg-gradient-to-br from-stone-900 via-stone-800 to-stone-900 text-white">
      <CapulanaPattern />

      <div className="relative z-10">
        <AnimatePresence mode="wait">
          {/* =================== MENU =================== */}
          {phase === "menu" && (
            <motion.div
              key="menu"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="p-6 space-y-6"
            >
              {/* Title */}
              <div className="text-center space-y-2">
                <motion.h2
                  className="text-3xl font-black tracking-tight"
                  style={{ color: "#FFD700" }}
                  animate={{ scale: [1, 1.03, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                >
                  Uri
                </motion.h2>
                <p className="text-stone-400 text-sm">
                  Jogo tradicional mocambicano de adivinhacao
                </p>
                <div className="flex items-center justify-center gap-2 mt-2">
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: "rgba(0,145,64,0.2)", color: "#009140" }}>
                    Quente
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: "rgba(255,215,0,0.15)", color: "#FFD700" }}>
                    Morno
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: "rgba(107,114,128,0.15)", color: "#9CA3AF" }}>
                    Frio
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: "rgba(156,163,175,0.1)", color: "#6B7280" }}>
                    Congelado
                  </span>
                </div>
              </div>

              {/* Mode Selection */}
              <div className="space-y-2">
                <label className="text-xs text-stone-500 uppercase tracking-wider font-semibold">
                  Modo de Jogo
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {(["bot", "pvp"] as Mode[]).map((m) => (
                    <motion.button
                      key={m}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setMode(m)}
                      className="py-3 px-4 rounded-xl font-bold text-sm border-2 transition-all"
                      style={{
                        borderColor: mode === m ? "#FFD700" : "rgba(255,255,255,0.08)",
                        backgroundColor: mode === m ? "rgba(255,215,0,0.12)" : "rgba(255,255,255,0.03)",
                        color: mode === m ? "#FFD700" : "#9CA3AF",
                      }}
                    >
                      {m === "bot" ? "Contra Bot" : "Jogador vs Jogador"}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Difficulty Selection (bot only) */}
              {mode === "bot" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-2"
                >
                  <label className="text-xs text-stone-500 uppercase tracking-wider font-semibold">
                    Dificuldade
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["Facil", "Medio", "Dificil"] as Difficulty[]).map((d) => (
                      <motion.button
                        key={d}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setDifficulty(d)}
                        className="py-2.5 px-3 rounded-xl font-bold text-xs border-2 transition-all"
                        style={{
                          borderColor: difficulty === d ? "#FF6B35" : "rgba(255,255,255,0.08)",
                          backgroundColor:
                            difficulty === d ? "rgba(255,107,53,0.15)" : "rgba(255,255,255,0.03)",
                          color: difficulty === d ? "#FF6B35" : "#9CA3AF",
                        }}
                      >
                        {d}
                      </motion.button>
                    ))}
                  </div>
                  <p className="text-[11px] text-stone-500">
                    {difficulty === "Facil" && "O bot e distraido — faz muitas tentativas aleatorias"}
                    {difficulty === "Medio" && "O bot e esperto — comete alguns erros"}
                    {difficulty === "Dificil" && "O bot e quase perfeito — busca binaria precisa"}
                  </p>
                </motion.div>
              )}

              {/* Rules */}
              <div className="rounded-xl p-4" style={{ backgroundColor: "rgba(255,215,0,0.05)", border: "1px solid rgba(255,215,0,0.1)" }}>
                <h3 className="text-xs font-bold mb-2" style={{ color: "#FFD700" }}>
                  Como Jogar
                </h3>
                <ul className="text-xs text-stone-400 space-y-1">
                  <li>Ambos os jogadores tentam adivinhar o mesmo numero secreto (1-100)</li>
                  <li>Apos cada tentativa, recebe uma dica de temperatura e direccao</li>
                  <li>O primeiro a acertar ganha pontos: 100 - (tentativas x 5)</li>
                  <li>Multiplas rodadas em 60 segundos. Acumule a maior pontuacao!</li>
                </ul>
              </div>

              {/* Start Button */}
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={startGame}
                className="w-full py-3.5 rounded-xl font-black text-base tracking-wide"
                style={{
                  background: "linear-gradient(135deg, #009140, #006B30)",
                  color: "#FFD700",
                  boxShadow: "0 4px 20px rgba(0,145,64,0.3)",
                }}
              >
                COMECAR JOGO
              </motion.button>
            </motion.div>
          )}

          {/* =================== COUNTDOWN =================== */}
          {phase === "countdown" && (
            <motion.div
              key="countdown"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-20 space-y-4"
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={countdownNum}
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 1.5, opacity: 0 }}
                  transition={{ duration: 0.6 }}
                  className="text-8xl font-black"
                  style={{ color: countdownNum > 0 ? "#FFD700" : "#009140" }}
                >
                  {countdownNum > 0 ? countdownNum : "VAI!"}
                </motion.div>
              </AnimatePresence>
              <p className="text-stone-500 text-sm">Preparem-se...</p>
            </motion.div>
          )}

          {/* =================== PLAYING =================== */}
          {phase === "playing" && (
            <motion.div
              key="playing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-4 space-y-3"
            >
              {/* Timer bar */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-stone-400">
                    Rodada {round}
                  </span>
                  <span
                    className="text-sm font-black tabular-nums"
                    style={{ color: timerColor }}
                  >
                    {timeLeft}s
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-stone-700/50 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: timerColor }}
                    animate={{ width: `${timerPct}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>

              {/* Score row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg p-2.5 text-center" style={{ backgroundColor: "rgba(0,145,64,0.08)", border: "1px solid rgba(0,145,64,0.15)" }}>
                  <div className="text-[10px] text-stone-500 uppercase font-semibold">Jogador 1</div>
                  <div className="text-lg font-black" style={{ color: "#009140" }}>{score.p1}</div>
                  <div className="text-[10px] text-stone-600">{roundsWon.p1} rodada{roundsWon.p1 !== 1 ? "s" : ""}</div>
                </div>
                <div className="rounded-lg p-2.5 text-center" style={{ backgroundColor: "rgba(255,107,53,0.08)", border: "1px solid rgba(255,107,53,0.15)" }}>
                  <div className="text-[10px] text-stone-500 uppercase font-semibold">{p2Label}</div>
                  <div className="text-lg font-black" style={{ color: "#FF6B35" }}>{score.p2}</div>
                  <div className="text-[10px] text-stone-600">{roundsWon.p2} rodada{roundsWon.p2 !== 1 ? "s" : ""}</div>
                </div>
              </div>

              {/* Round win message */}
              <AnimatePresence>
                {roundWinner && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    className="rounded-lg p-3 text-center text-sm font-bold"
                    style={{
                      backgroundColor:
                        roundWinner === "p1" ? "rgba(0,145,64,0.15)" : "rgba(255,107,53,0.15)",
                      color: roundWinner === "p1" ? "#009140" : "#FF6B35",
                      border: `1px solid ${roundWinner === "p1" ? "rgba(0,145,64,0.3)" : "rgba(255,107,53,0.3)"}`,
                    }}
                  >
                    {roundMsg}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Two columns: P1 and P2 histories */}
              <div className="grid grid-cols-2 gap-3">
                {/* P1 History */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold" style={{ color: "#009140" }}>
                      Jogador 1
                    </span>
                    {p1History.length > 0 && (
                      <span className="text-[10px] text-stone-600">
                        {p1History.length} tentativa{p1History.length !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  <div className="max-h-40 overflow-y-auto space-y-1 pr-1" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.1) transparent" }}>
                    {p1History.length === 0 && (
                      <p className="text-[11px] text-stone-600 italic">Nenhuma tentativa ainda</p>
                    )}
                    {p1History.map((g, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-1.5 rounded-md px-2 py-1"
                        style={{ backgroundColor: TEMP_BG[g.temperature] }}
                      >
                        <span className="text-xs font-bold tabular-nums w-7 text-right" style={{ color: TEMP_COLORS[g.temperature] }}>
                          {g.value}
                        </span>
                        {g.direction && (
                          <span className="text-[10px]" style={{ color: TEMP_COLORS[g.temperature] }}>
                            {g.direction === "maior" ? "▲" : "▼"}
                          </span>
                        )}
                        <span
                          className="text-[10px] font-semibold ml-auto"
                          style={{ color: TEMP_COLORS[g.temperature] }}
                        >
                          {g.temperature}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* P2 History */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold" style={{ color: "#FF6B35" }}>
                      {p2Label}
                    </span>
                    {p2History.length > 0 && (
                      <span className="text-[10px] text-stone-600">
                        {p2History.length} tentativa{p2History.length !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  <div className="max-h-40 overflow-y-auto space-y-1 pr-1" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.1) transparent" }}>
                    {p2History.length === 0 && (
                      <p className="text-[11px] text-stone-600 italic">
                        {mode === "bot" ? "O bot esta a pensar..." : "Nenhuma tentativa ainda"}
                      </p>
                    )}
                    {p2History.map((g, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-1.5 rounded-md px-2 py-1"
                        style={{ backgroundColor: TEMP_BG[g.temperature] }}
                      >
                        <span className="text-xs font-bold tabular-nums w-7 text-right" style={{ color: TEMP_COLORS[g.temperature] }}>
                          {g.value}
                        </span>
                        {g.direction && (
                          <span className="text-[10px]" style={{ color: TEMP_COLORS[g.temperature] }}>
                            {g.direction === "maior" ? "▲" : "▼"}
                          </span>
                        )}
                        <span
                          className="text-[10px] font-semibold ml-auto"
                          style={{ color: TEMP_COLORS[g.temperature] }}
                        >
                          {g.temperature}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Input area */}
              <div className={mode === "pvp" ? "grid grid-cols-2 gap-3" : ""}>
                {/* P1 Input */}
                <div className="space-y-1.5">
                  <label className="text-[10px] text-stone-500 uppercase tracking-wider font-semibold block">
                    Jogador 1
                  </label>
                  <div className="flex gap-2">
                    <input
                      ref={p1InputRef}
                      type="number"
                      min={1}
                      max={100}
                      value={p1Input}
                      onChange={(e) => setP1Input(e.target.value.slice(0, 3))}
                      onKeyDown={handleP1KeyDown}
                      disabled={!!roundWinner}
                      placeholder="1-100"
                      className="flex-1 min-w-0 rounded-lg px-3 py-2 text-sm font-bold bg-stone-800/60 border border-stone-700/50 text-white placeholder:text-stone-600 focus:outline-none focus:ring-2 focus:ring-[#009140]/50 focus:border-[#009140]/50 disabled:opacity-40 transition-all"
                    />
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleP1Submit}
                      disabled={!!roundWinner || !p1Input}
                      className="px-4 py-2 rounded-lg font-bold text-xs transition-all disabled:opacity-30"
                      style={{
                        backgroundColor: "rgba(0,145,64,0.2)",
                        color: "#009140",
                        border: "1px solid rgba(0,145,64,0.3)",
                      }}
                    >
                      Chutar
                    </motion.button>
                  </div>
                </div>

                {/* P2 Input (PvP only) */}
                {mode === "pvp" && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-stone-500 uppercase tracking-wider font-semibold block">
                      Jogador 2
                    </label>
                    <div className="flex gap-2">
                      <input
                        ref={p2InputRef}
                        type="number"
                        min={1}
                        max={100}
                        value={p2Input}
                        onChange={(e) => setP2Input(e.target.value.slice(0, 3))}
                        onKeyDown={handleP2KeyDown}
                        disabled={!!roundWinner}
                        placeholder="1-100"
                        className="flex-1 min-w-0 rounded-lg px-3 py-2 text-sm font-bold bg-stone-800/60 border border-stone-700/50 text-white placeholder:text-stone-600 focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/50 focus:border-[#FF6B35]/50 disabled:opacity-40 transition-all"
                      />
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleP2Submit}
                        disabled={!!roundWinner || !p2Input}
                        className="px-4 py-2 rounded-lg font-bold text-xs transition-all disabled:opacity-30"
                        style={{
                          backgroundColor: "rgba(255,107,53,0.2)",
                          color: "#FF6B35",
                          border: "1px solid rgba(255,107,53,0.3)",
                        }}
                      >
                        Chutar
                      </motion.button>
                    </div>
                  </div>
                )}
              </div>

              {/* Temperature legend */}
              <div className="flex items-center justify-center gap-3 pt-1">
                {[
                  { label: "Quente", color: "#FF0000", desc: "≤10" },
                  { label: "Morno", color: "#FFD700", desc: "≤25" },
                  { label: "Frio", color: "#6B7280", desc: "≤50" },
                  { label: "Congelado", color: "#9CA3AF", desc: ">50" },
                ].map((t) => (
                  <div key={t.label} className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: t.color }} />
                    <span className="text-[10px] text-stone-500">
                      {t.label}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* =================== RESULT =================== */}
          {phase === "result" && (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="p-6 space-y-6"
            >
              {/* Title */}
              <div className="text-center space-y-2">
                <motion.h2
                  className="text-2xl font-black"
                  style={{ color: "#FFD700" }}
                  initial={{ y: -10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                >
                  Jogo Terminado!
                </motion.h2>
                <p className="text-stone-400 text-sm">
                  {roundsWon.p1 + roundsWon.p2} rodada{roundsWon.p1 + roundsWon.p2 !== 1 ? "s" : ""} jogada{roundsWon.p1 + roundsWon.p2 !== 1 ? "s" : ""}
                </p>
              </div>

              {/* Winner announcement */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, type: "spring" }}
                className="rounded-xl p-5 text-center"
                style={{
                  backgroundColor:
                    score.p1 > score.p2
                      ? "rgba(0,145,64,0.1)"
                      : score.p2 > score.p1
                      ? "rgba(255,107,53,0.1)"
                      : "rgba(255,215,0,0.08)",
                  border: `2px solid ${
                    score.p1 > score.p2
                      ? "rgba(0,145,64,0.3)"
                      : score.p2 > score.p1
                      ? "rgba(255,107,53,0.3)"
                      : "rgba(255,215,0,0.2)"
                  }`,
                }}
              >
                {score.p1 > score.p2 ? (
                  <div>
                    <div className="text-4xl mb-2">🏆</div>
                    <div className="text-lg font-black" style={{ color: "#009140" }}>
                      Jogador 1 Venceu!
                    </div>
                  </div>
                ) : score.p2 > score.p1 ? (
                  <div>
                    <div className="text-4xl mb-2">🏆</div>
                    <div className="text-lg font-black" style={{ color: "#FF6B35" }}>
                      {p2Label} Venceu!
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="text-4xl mb-2">🤝</div>
                    <div className="text-lg font-black" style={{ color: "#FFD700" }}>
                      Empate!
                    </div>
                  </div>
                )}
              </motion.div>

              {/* Score comparison */}
              <div className="grid grid-cols-2 gap-4">
                <motion.div
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="rounded-xl p-4 text-center space-y-2"
                  style={{
                    backgroundColor: "rgba(0,145,64,0.06)",
                    border: "1px solid rgba(0,145,64,0.15)",
                  }}
                >
                  <div className="text-xs text-stone-500 uppercase font-semibold">Jogador 1</div>
                  <div className="text-3xl font-black" style={{ color: "#009140" }}>
                    {score.p1}
                  </div>
                  <div className="text-xs text-stone-500">
                    {roundsWon.p1} rodada{roundsWon.p1 !== 1 ? "s" : ""} vencida{roundsWon.p1 !== 1 ? "s" : ""}
                  </div>
                </motion.div>

                <motion.div
                  initial={{ x: 20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="rounded-xl p-4 text-center space-y-2"
                  style={{
                    backgroundColor: "rgba(255,107,53,0.06)",
                    border: "1px solid rgba(255,107,53,0.15)",
                  }}
                >
                  <div className="text-xs text-stone-500 uppercase font-semibold">{p2Label}</div>
                  <div className="text-3xl font-black" style={{ color: "#FF6B35" }}>
                    {score.p2}
                  </div>
                  <div className="text-xs text-stone-500">
                    {roundsWon.p2} rodada{roundsWon.p2 !== 1 ? "s" : ""} vencida{roundsWon.p2 !== 1 ? "s" : ""}
                  </div>
                </motion.div>
              </div>

              {/* Action buttons */}
              <div className="grid grid-cols-2 gap-3">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={startGame}
                  className="py-3 rounded-xl font-bold text-sm"
                  style={{
                    background: "linear-gradient(135deg, #009140, #006B30)",
                    color: "#FFD700",
                  }}
                >
                  Jogar Novamente
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={resetGame}
                  className="py-3 rounded-xl font-bold text-sm border border-stone-600 text-stone-400 hover:text-white hover:border-stone-500 transition-colors"
                >
                  Menu
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
