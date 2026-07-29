import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

const _MODES: ("bot" | "pvp")[] = ["bot", "pvp"];
const _DIFFS: ("Facil" | "Medio" | "Dificil")[] = ["Facil", "Medio", "Dificil"];
const _PLAYERS: ("p1" | "p2")[] = ["p1", "p2"];

interface NtchuvaProps {
  onScore?: (name: string, score: number) => void;
  liveCode?: string;
}

/* Capulana-inspired SVG pattern for background (same as MexericaGame) */
const CapulanaPattern = () => (
  <svg className="absolute inset-0 w-full h-full opacity-[0.04]" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <pattern id="ntchuva-cap" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
        <rect width="40" height="40" fill="none" />
        <path d="M0 0L20 20L40 0" stroke="#FFD700" strokeWidth="1" fill="none" />
        <path d="M0 20L20 40L40 20" stroke="#009140" strokeWidth="1" fill="none" />
        <circle cx="20" cy="20" r="3" fill="#FF0000" />
        <circle cx="0" cy="0" r="2" fill="#FFD700" />
        <circle cx="40" cy="0" r="2" fill="#FFD700" />
        <circle cx="0" cy="40" r="2" fill="#009140" />
        <circle cx="40" cy="40" r="2" fill="#009140" />
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#ntchuva-cap)" />
  </svg>
);

/* Hopscotch foot SVG */
const FootSVG = () => (
  <svg viewBox="0 0 40 56" className="w-full h-full">
    <ellipse cx="20" cy="10" rx="8" ry="10" fill="#FFD700" />
    <ellipse cx="20" cy="10" rx="6" ry="8" fill="#CD853F" />
    <rect x="14" y="18" width="12" height="28" rx="4" fill="#FFD700" />
    <rect x="15" y="18" width="10" height="28" rx="3" fill="#CD853F" />
    <ellipse cx="20" cy="48" rx="9" ry="5" fill="#FFD700" />
    <ellipse cx="20" cy="48" rx="7" ry="4" fill="#CD853F" />
  </svg>
);

interface SquareData {
  id: number;
  row: number;
  col: number;
  value: number;
  isTrap: boolean;
  tapped: boolean;
  tappedBy: "p1" | "p2" | null;
}

/* Hopscotch grid layout: 3 columns x 5 rows with 9 main slots + 6 trap slots */
const GRID_POSITIONS: { row: number; col: number; isMain: boolean }[] = [
  /* Row 0: two outer squares, center is trap slot */
  { row: 0, col: 0, isMain: true },
  { row: 0, col: 1, isMain: false },
  { row: 0, col: 2, isMain: true },
  /* Row 1: center square, outer slots for traps */
  { row: 1, col: 0, isMain: false },
  { row: 1, col: 1, isMain: true },
  { row: 1, col: 2, isMain: false },
  /* Row 2: three squares across */
  { row: 2, col: 0, isMain: true },
  { row: 2, col: 1, isMain: true },
  { row: 2, col: 2, isMain: true },
  /* Row 3: center square, outer slots for traps */
  { row: 3, col: 0, isMain: false },
  { row: 3, col: 1, isMain: true },
  { row: 3, col: 2, isMain: false },
  /* Row 4: two outer squares, center is trap slot */
  { row: 4, col: 0, isMain: true },
  { row: 4, col: 1, isMain: false },
  { row: 4, col: 2, isMain: true },
];

/* Shuffle array (Fisher-Yates) */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* Generate a new round of squares */
function generateRound(roundNum: number): SquareData[] {
  const numTraps = Math.min(6, (roundNum - 1) * 2);
  const mainPositions = GRID_POSITIONS.filter((p) => p.isMain);
  const trapSlots = shuffle(GRID_POSITIONS.filter((p) => !p.isMain));

  const shuffledNumbers = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);

  const squares: SquareData[] = [];

  mainPositions.forEach((pos, i) => {
    squares.push({
      id: i,
      row: pos.row,
      col: pos.col,
      value: shuffledNumbers[i],
      isTrap: false,
      tapped: false,
      tappedBy: null,
    });
  });

  /* Trap values: confusing numbers outside 1-9 range */
  const trapPool = [0, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
  for (let i = 0; i < numTraps; i++) {
    const pos = trapSlots[i];
    squares.push({
      id: 9 + i,
      row: pos.row,
      col: pos.col,
      value: trapPool[i % trapPool.length],
      isTrap: true,
      tapped: false,
      tappedBy: null,
    });
  }

  return squares;
}

const BOT_SPEED = { Facil: 1800, Medio: 1000, Dificil: 550 };
const BOT_WRONG_CHANCE = { Facil: 0.22, Medio: 0.10, Dificil: 0.03 };
const SEQUENCE_BONUS = 20;
const GAME_TIME = 45;
const CORRECT_POINTS = 10;
const TRAP_PENALTY = 5;
const WRONG_ORDER_PENALTY = 3;
const MOZ_PHRASES = ["Boa!", "Eish!", "Kupa!", "Tse!", "Forte!", "Aye!", "Pega!"];

export default function NtchuvaGame({ onScore, liveCode }: NtchuvaProps) {
  const [mode, setMode] = useState<"bot" | "pvp">("bot");
  const [difficulty, setDifficulty] = useState<"Facil" | "Medio" | "Dificil">("Medio");
  const [phase, setPhase] = useState<"menu" | "countdown" | "playing" | "result">("menu");
  const [countdown, setCountdown] = useState(3);
  const [score, setScore] = useState({ p1: 0, p2: 0 });
  const [timeLeft, setTimeLeft] = useState(GAME_TIME);
  const [squares, setSquares] = useState<SquareData[]>([]);
  const [round, setRound] = useState(1);
  const [p1Next, setP1Next] = useState(1);
  const [p2Next, setP2Next] = useState(1);
  const [activePlayer, setActivePlayer] = useState<"p1" | "p2">("p1");
  const [phrase, setPhrase] = useState("");
  const [particles, setParticles] = useState<{ id: number; x: number; y: number; color: string }[]>([]);
  const [feedback, setFeedback] = useState<{ text: string; color: string; id: number } | null>(null);
  const [roundFlash, setRoundFlash] = useState(false);
  const [seqComplete, setSeqComplete] = useState(false);

  /* Refs for mutable game state accessed inside callbacks/timers */
  const p1NextRef = useRef(1);
  const p2NextRef = useRef(1);
  const botNextRef = useRef(1);
  const roundRef = useRef(1);
  const scoreRef = useRef({ p1: 0, p2: 0 });
  const gameTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const botTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const newRoundTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const roundTransitioningRef = useRef(false);

  /* Keep scoreRef in sync with state */
  useEffect(() => {
    scoreRef.current = score;
  }, [score]);

  const showPhrase = useCallback((text: string) => {
    setPhrase(text);
    setTimeout(() => setPhrase(""), 600);
  }, []);

  const spawnParticles = useCallback((x: number, y: number) => {
    const colors = ["#FFD700", "#009140", "#FF0000", "#FF6B35"];
    const newP = Array.from({ length: 6 }).map((_, i) => ({
      id: Date.now() + i,
      x: x + (Math.random() - 0.5) * 60,
      y: y + (Math.random() - 0.5) * 60,
      color: colors[i % colors.length],
    }));
    setParticles((p) => [...p, ...newP]);
    setTimeout(() => setParticles((p) => p.slice(0, -6)), 800);
  }, []);

  const showFeedback = useCallback((text: string, color: string) => {
    const id = Date.now();
    setFeedback({ text, color, id });
    setTimeout(() => setFeedback(null), 500);
  }, []);

  const triggerNewRound = useCallback((currentRound: number) => {
    if (roundTransitioningRef.current) return;
    roundTransitioningRef.current = true;

    setSeqComplete(true);
    setTimeout(() => setSeqComplete(false), 800);

    setTimeout(() => {
      const newRound = currentRound + 1;
      roundRef.current = newRound;
      p1NextRef.current = 1;
      p2NextRef.current = 1;
      botNextRef.current = 1;
      setP1Next(1);
      setP2Next(1);
      setRound(newRound);
      setRoundFlash(true);
      setTimeout(() => setRoundFlash(false), 600);
      setSquares(generateRound(newRound));
      roundTransitioningRef.current = false;
    }, 500);
  }, []);

  const startGame = useCallback(() => {
    const fresh = { p1: 0, p2: 0 };
    setScore(fresh);
    scoreRef.current = fresh;
    setTimeLeft(GAME_TIME);
    setRound(1);
    roundRef.current = 1;
    setP1Next(1);
    p1NextRef.current = 1;
    botNextRef.current = 1;
    p2NextRef.current = 1;
    setP2Next(1);
    setActivePlayer("p1");
    setSquares([]);
    setParticles([]);
    setFeedback(null);
    setPhrase("");
    setRoundFlash(false);
    setSeqComplete(false);
    roundTransitioningRef.current = false;
    setPhase("countdown");
    setCountdown(3);
  }, []);

  /* Countdown effect */
  useEffect(() => {
    if (phase !== "countdown") return;
    if (countdown <= 0) {
      setSquares(generateRound(1));
      setPhase("playing");
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 800);
    return () => clearTimeout(t);
  }, [phase, countdown]);

  /* Game timer */
  useEffect(() => {
    if (phase !== "playing") return;
    gameTimerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          if (gameTimerRef.current) clearInterval(gameTimerRef.current);
          if (botTimerRef.current) clearInterval(botTimerRef.current);
          if (newRoundTimeoutRef.current) clearTimeout(newRoundTimeoutRef.current);
          setPhase("result");
          if (onScore) onScore("Ntchuva", scoreRef.current.p1);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => {
      if (gameTimerRef.current) clearInterval(gameTimerRef.current);
    };
  }, [phase, onScore]);

  /* Bot AI: automatically taps squares */
  useEffect(() => {
    if (phase !== "playing" || mode !== "bot") return;

    const baseDelay = BOT_SPEED[difficulty];

    const botTick = () => {
      if (roundTransitioningRef.current) return;
      const botTarget = botNextRef.current;
      if (botTarget > 9) return;

      setSquares((current) => {
        /* Check if bot makes a mistake — taps a trap */
        if (Math.random() < BOT_WRONG_CHANCE[difficulty]) {
          const traps = current.filter((s) => s.isTrap && !s.tapped);
          if (traps.length > 0) {
            const trap = traps[Math.floor(Math.random() * traps.length)];
            setScore((s) => {
              const ns = { ...s, p2: Math.max(0, s.p2 - TRAP_PENALTY) };
              scoreRef.current = ns;
              return ns;
            });
            return current.map((sq) =>
              sq.id === trap.id ? { ...sq, tapped: true, tappedBy: "p2" as const } : sq
            );
          }
        }

        /* Bot finds and taps the correct next number */
        const target = current.find((s) => s.value === botTarget && !s.tapped && !s.isTrap);
        if (target) {
          botNextRef.current++;
          setScore((s) => {
            const ns = { ...s, p2: s.p2 + CORRECT_POINTS };
            scoreRef.current = ns;
            return ns;
          });

          /* Check if bot completed sequence */
          if (botNextRef.current > 9) {
            setScore((s) => {
              const ns = { ...s, p2: s.p2 + SEQUENCE_BONUS };
              scoreRef.current = ns;
              return ns;
            });
            newRoundTimeoutRef.current = setTimeout(() => {
              triggerNewRound(roundRef.current);
            }, 300);
          }

          return current.map((sq) =>
            sq.id === target.id ? { ...sq, tapped: true, tappedBy: "p2" as const } : sq
          );
        }

        return current;
      });
    };

    botTimerRef.current = setInterval(botTick, baseDelay);
    return () => {
      if (botTimerRef.current) clearInterval(botTimerRef.current);
    };
  }, [phase, mode, difficulty, triggerNewRound]);

  /* Handle player tap on a square */
  const handleTap = useCallback(
    (squareId: number, e: React.MouseEvent) => {
      if (roundTransitioningRef.current) return;

      setSquares((current) => {
        const square = current.find((s) => s.id === squareId);
        if (!square || square.tapped) return current;

        /* Determine active player and their next target */
        const isP2Turn = mode === "pvp" && activePlayer === "p2";
        const playerKey: "p1" | "p2" = isP2Turn ? "p2" : "p1";
        const currentNext = isP2Turn ? p2NextRef.current : p1NextRef.current;

        if (square.isTrap) {
          /* Tapped a trap square — lose points */
          setScore((s) => {
            const ns = { ...s, [playerKey]: Math.max(0, (s as Record<string, number>)[playerKey] - TRAP_PENALTY) };
            scoreRef.current = ns;
            return ns;
          });
          showFeedback(`-${TRAP_PENALTY} Armadilha!`, "#FF0000");
          showPhrase("Armadilha!");
          spawnParticles(e.clientX, e.clientY);
          return current.map((sq) =>
            sq.id === squareId ? { ...sq, tapped: true, tappedBy: playerKey } : sq
          );
        }

        if (square.value === currentNext) {
          /* Correct tap! */
          if (isP2Turn) {
            p2NextRef.current++;
            setP2Next(p2NextRef.current);
          } else {
            p1NextRef.current++;
            setP1Next(p1NextRef.current);
          }

          setScore((s) => {
            const ns = { ...s, [playerKey]: (s as Record<string, number>)[playerKey] + CORRECT_POINTS };
            scoreRef.current = ns;
            return ns;
          });

          showFeedback(`+${CORRECT_POINTS}`, "#009140");
          if (Math.random() > 0.4) {
            showPhrase(MOZ_PHRASES[Math.floor(Math.random() * MOZ_PHRASES.length)]);
          }
          spawnParticles(e.clientX, e.clientY);

          /* Check if this player completed the sequence */
          const newNext = isP2Turn ? p2NextRef.current : p1NextRef.current;
          if (newNext > 9) {
            setScore((s) => {
              const ns = { ...s, [playerKey]: (s as Record<string, number>)[playerKey] + SEQUENCE_BONUS };
              scoreRef.current = ns;
              return ns;
            });
            showFeedback(`+${SEQUENCE_BONUS} Bonus!`, "#FFD700");
            showPhrase("Sequencia!");
            newRoundTimeoutRef.current = setTimeout(() => {
              triggerNewRound(roundRef.current);
            }, 300);
          }

          /* In PvP mode, switch active player after correct tap */
          if (mode === "pvp") {
            setActivePlayer(playerKey === "p1" ? "p2" : "p1");
          }

          return current.map((sq) =>
            sq.id === squareId ? { ...sq, tapped: true, tappedBy: playerKey } : sq
          );
        } else {
          /* Wrong number tapped (out of sequence) */
          setScore((s) => {
            const ns = { ...s, [playerKey]: Math.max(0, (s as Record<string, number>)[playerKey] - WRONG_ORDER_PENALTY) };
            scoreRef.current = ns;
            return ns;
          });
          showFeedback(`-${WRONG_ORDER_PENALTY} Fora de ordem!`, "#FF6B35");
          return current.map((sq) =>
            sq.id === squareId ? { ...sq, tapped: true, tappedBy: playerKey } : sq
          );
        }
      });
    },
    [mode, activePlayer, showFeedback, showPhrase, spawnParticles, triggerNewRound]
  );

  /* Computed values */
  const winner =
    score.p1 > score.p2
      ? mode === "bot"
        ? "Voce"
        : "Jogador 1"
      : score.p2 > score.p1
        ? mode === "bot"
          ? "Computador"
          : "Jogador 2"
        : "Empate";
  const isWin = score.p1 > score.p2;
  const p1Label = mode === "bot" ? "Voce" : "Jogador 1";
  const p2Label = mode === "bot" ? "Bot" : "Jogador 2";

  /* Render a single grid cell */
  const renderCell = (row: number, col: number) => {
    const square = squares.find((s) => s.row === row && s.col === col);
    const isMainSlot = GRID_POSITIONS.find((p) => p.row === row && p.col === col)?.isMain;

    return (
      <div
        key={`${row}-${col}`}
        className="w-14 h-14 sm:w-16 sm:h-16 md:w-[70px] md:h-[70px] flex items-center justify-center"
      >
        {square ? (
          <motion.button
            whileHover={square.tapped ? {} : { scale: 1.08 }}
            whileTap={square.tapped ? {} : { scale: 0.88 }}
            onClick={(e) => handleTap(square.id, e)}
            className={`relative w-14 h-14 sm:w-16 sm:h-16 md:w-[70px] md:h-[70px] rounded-xl font-black text-xl sm:text-2xl transition-all flex items-center justify-center select-none ${
              square.tapped ? "cursor-default" : "cursor-pointer"
            }`}
            style={{
              background: square.tapped
                ? square.tappedBy === "p1"
                  ? "rgba(0,145,64,0.25)"
                  : "rgba(255,107,53,0.25)"
                : square.isTrap
                  ? "rgba(255,0,0,0.10)"
                  : "rgba(255,215,0,0.08)",
              border: `2.5px solid ${
                square.tapped
                  ? square.tappedBy === "p1"
                    ? "#009140"
                    : "#FF6B35"
                  : square.isTrap
                    ? "rgba(255,0,0,0.35)"
                    : "rgba(255,215,0,0.35)"
              }`,
              color: square.tapped
                ? "#665"
                : square.isTrap
                  ? "#FF4444"
                  : "#FFD700",
              boxShadow: square.tapped
                ? "none"
                : square.isTrap
                  ? "0 0 8px rgba(255,0,0,0.15)"
                  : "0 0 12px rgba(255,215,0,0.12)",
              textShadow: square.tapped ? "none" : "0 1px 4px rgba(0,0,0,0.4)",
            }}
            disabled={square.tapped}
          >
            {square.value}
            {square.tappedBy && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold"
                style={{
                  background: square.tappedBy === "p1" ? "#009140" : "#FF6B35",
                  color: "white",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                }}
              >
                {square.tappedBy === "p1" ? "1" : "2"}
              </motion.div>
            )}
            {square.isTrap && !square.tapped && (
              <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 text-[8px]" style={{ color: "#FF4444" }}>
                ⚠
              </div>
            )}
          </motion.button>
        ) : isMainSlot && phase === "playing" ? (
          /* Empty main slot — show outline placeholder */
          <div
            className="w-14 h-14 sm:w-16 sm:h-16 md:w-[70px] md:h-[70px] rounded-xl flex items-center justify-center opacity-20"
            style={{
              border: "2px dashed rgba(255,215,0,0.2)",
            }}
          />
        ) : null}
      </div>
    );
  };

  /* Hopscotch preview for menu */
  const previewCells = [
    { v: 1, show: true },
    { v: null, show: false },
    { v: 2, show: true },
    { v: null, show: false },
    { v: 3, show: true },
    { v: null, show: false },
    { v: 4, show: true },
    { v: 5, show: true },
    { v: 6, show: true },
    { v: null, show: false },
    { v: 7, show: true },
    { v: null, show: false },
    { v: 8, show: true },
    { v: null, show: false },
    { v: 9, show: true },
  ];

  return (
    <div
      className="relative w-full max-w-2xl mx-auto rounded-2xl border-2 border-amber-700/40 overflow-hidden"
      style={{
        background: "linear-gradient(145deg, #1a1207 0%, #2d1f0e 50%, #1a1207 100%)",
      }}
    >
      <CapulanaPattern />

      {/* Confetti particles */}
      <AnimatePresence>
        {particles.map((p) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 1, scale: 1 }}
            animate={{ opacity: 0, scale: 0, y: -40 }}
            exit={{ opacity: 0 }}
            className="absolute w-2 h-2 rounded-full pointer-events-none z-50"
            style={{ left: p.x, top: p.y, background: p.color }}
          />
        ))}
      </AnimatePresence>

      {/* Phrase popup */}
      <AnimatePresence>
        {phrase && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5, y: 20 }}
            animate={{ opacity: 1, scale: 1.2, y: 0 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute top-1/3 left-1/2 -translate-x-1/2 z-50 pointer-events-none text-4xl font-black"
            style={{ color: "#FFD700", textShadow: "0 2px 8px rgba(0,0,0,0.8)" }}
          >
            {phrase}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sequence complete flash */}
      <AnimatePresence>
        {seqComplete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.15, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="absolute inset-0 z-30 pointer-events-none"
            style={{ background: "#FFD700" }}
          />
        )}
      </AnimatePresence>

      <div className="relative z-10 p-4 md:p-6">
        {/* Header with Mozambican flag stripe */}
        <div className="flex items-center gap-3 mb-4">
          <div
            className="h-10 w-10 rounded-xl flex items-center justify-center"
            style={{
              background:
                "linear-gradient(135deg, #009140 0%, #009140 33%, #FF0000 33%, #FF0000 66%, #FFD700 66%, #FFD700 100%)",
            }}
          >
            <FootSVG />
          </div>
          <div>
            <h2 className="font-bold text-lg" style={{ color: "#FFD700" }}>
              Ntchuva
            </h2>
            <p className="text-[11px]" style={{ color: "#CD853F" }}>
              Macaquinhos — Jogo Mocambicano
            </p>
          </div>
        </div>

        {/* ============ MENU PHASE ============ */}
        {phase === "menu" && (
          <div className="space-y-4">
            <p className="text-sm text-center" style={{ color: "#DEB887" }}>
              Toque nos numeros de 1 a 9 na ordem correcta! Evite as armadilhas
              vermelhas. {GAME_TIME} segundos de pura agilidade.
            </p>

            {/* Hopscotch preview */}
            <div className="flex justify-center py-2">
              <div
                className="grid grid-cols-3 gap-1.5"
                style={{ width: "fit-content" }}
              >
                {previewCells.map((cell, i) => (
                  <div
                    key={i}
                    className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center"
                  >
                    {cell.show && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center font-black text-sm"
                        style={{
                          background: "rgba(255,215,0,0.08)",
                          border: "2px solid rgba(255,215,0,0.25)",
                          color: "#FFD700",
                        }}
                      >
                        {cell.v}
                      </motion.div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Scoring legend */}
            <div className="flex justify-center gap-4 text-[10px]" style={{ color: "#CD853F" }}>
              <span>
                <span style={{ color: "#009140" }}>+{CORRECT_POINTS}</span> Correcto
              </span>
              <span>
                <span style={{ color: "#FF0000" }}>-{TRAP_PENALTY}</span> Armadilha
              </span>
              <span>
                <span style={{ color: "#FFD700" }}>+{SEQUENCE_BONUS}</span> Bonus Sequencia
              </span>
            </div>

            {/* Mode toggle */}
            <div className="flex justify-center gap-2">
              {_MODES.map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                    mode === m ? "text-black" : "text-amber-200/60"
                  }`}
                  style={
                    mode === m
                      ? { background: "linear-gradient(135deg, #FFD700, #FF6B35)" }
                      : {
                          background: "rgba(255,215,0,0.1)",
                          border: "1px solid rgba(255,215,0,0.2)",
                        }
                  }
                >
                  {m === "bot" ? "vs Computador" : "vs Jogador"}
                </button>
              ))}
            </div>

            {/* Difficulty (bot only) */}
            {mode === "bot" && (
              <div className="flex justify-center gap-2">
                {_DIFFS.map((d) => (
                  <button
                    key={d}
                    onClick={() => setDifficulty(d)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      difficulty === d ? "text-black" : "text-amber-200/60"
                    }`}
                    style={
                      difficulty === d
                        ? {
                            background:
                              d === "Facil"
                                ? "#009140"
                                : d === "Medio"
                                  ? "#FF6B35"
                                  : "#FF0000",
                          }
                        : { background: "rgba(255,255,255,0.05)" }
                    }
                  >
                    {d}
                  </button>
                ))}
              </div>
            )}

            <button
              onClick={startGame}
              className="w-full py-3 rounded-xl text-black font-black text-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: "linear-gradient(135deg, #FFD700, #FF6B35)",
              }}
            >
              Comecar Jogo
            </button>
          </div>
        )}

        {/* ============ COUNTDOWN PHASE ============ */}
        {phase === "countdown" && (
          <div className="flex items-center justify-center py-16">
            <AnimatePresence mode="wait">
              <motion.div
                key={countdown}
                initial={{ scale: 2, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                className="text-8xl font-black"
                style={{
                  color: "#FFD700",
                  textShadow: "0 0 40px rgba(255,215,0,0.5)",
                }}
              >
                {countdown > 0 ? countdown : "VAI!"}
              </motion.div>
            </AnimatePresence>
          </div>
        )}

        {/* ============ PLAYING PHASE ============ */}
        {phase === "playing" && (
          <>
            {/* Score bar */}
            <div className="flex items-center justify-between mb-2">
              {/* Player 1 */}
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full" style={{ background: "#009140" }} />
                <span className="text-xs font-bold" style={{ color: "#DEB887" }}>
                  {p1Label}
                </span>
                <span
                  className="text-xl font-black"
                  style={{ color: "#FFD700" }}
                >
                  {score.p1}
                </span>
              </div>

              {/* Timer */}
              <div className="text-center">
                <p className="text-[9px] font-medium mb-0.5" style={{ color: "#CD853F" }}>
                  Tempo
                </p>
                <div
                  className={`text-2xl md:text-3xl font-black ${
                    timeLeft <= 10 ? "animate-pulse" : ""
                  }`}
                  style={{ color: timeLeft <= 10 ? "#FF0000" : "#FFD700" }}
                >
                  {timeLeft}s
                </div>
              </div>

              {/* Player 2 */}
              <div className="flex items-center gap-1.5">
                <span
                  className="text-xl font-black"
                  style={{ color: "#FF6B35" }}
                >
                  {score.p2}
                </span>
                <span className="text-xs font-bold" style={{ color: "#CD853F" }}>
                  {p2Label}
                </span>
                <div className="w-3 h-3 rounded-full" style={{ background: "#FF6B35" }} />
              </div>
            </div>

            {/* Round + Next Target indicators */}
            <div className="flex items-center justify-between mb-2 px-1">
              <div className="flex items-center gap-2">
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                  style={{
                    background: "rgba(255,215,0,0.1)",
                    color: "#FFD700",
                  }}
                >
                  Ronda {round}
                </span>
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                  style={{
                    background: "rgba(0,145,64,0.15)",
                    color: "#009140",
                  }}
                >
                  Proximo: {p1Next}
                </span>
                {mode === "bot" && (
                  <span
                    className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                    style={{
                      background: "rgba(255,107,53,0.15)",
                      color: "#FF6B35",
                    }}
                  >
                    Bot: {botNextRef.current}
                  </span>
                )}
              </div>
              <span
                className="text-[10px]"
                style={{ color: "#CD853F" }}
              >
                Armadilhas: {Math.min(6, (round - 1) * 2)}
              </span>
            </div>

            {/* PvP active player toggle */}
            {mode === "pvp" && (
              <div className="flex justify-center mb-2">
                <div
                  className="flex items-center gap-1 p-0.5 rounded-xl"
                  style={{ background: "rgba(255,215,0,0.08)" }}
                >
                  {_PLAYERS.map((p) => (
                    <button
                      key={p}
                      onClick={() => setActivePlayer(p)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        activePlayer === p ? "text-white" : "text-amber-200/60"
                      }`}
                      style={
                        activePlayer === p
                          ? {
                              background:
                                p === "p1" ? "#009140" : "#FF6B35",
                            }
                          : { background: "transparent" }
                      }
                    >
                      {p === "p1" ? "Jogador 1" : "Jogador 2"} (
                      {p === "p1" ? p1Next : p2Next})
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Score feedback popup */}
            <div className="flex justify-center mb-1 h-6">
              <AnimatePresence>
                {feedback && (
                  <motion.div
                    key={feedback.id}
                    initial={{ opacity: 0, y: 10, scale: 0.8 }}
                    animate={{ opacity: 1, y: 0, scale: 1.1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.9 }}
                    className="text-sm font-black"
                    style={{ color: feedback.color }}
                  >
                    {feedback.text}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Game grid — hopscotch layout */}
            <div className="flex justify-center">
              <div
                className="relative rounded-2xl p-3 sm:p-4"
                style={{
                  background:
                    "radial-gradient(ellipse at center, rgba(139,69,19,0.12) 0%, transparent 70%)",
                }}
              >
                <CapulanaPattern />
                <div
                  className="relative z-10 grid grid-cols-3 gap-2"
                  style={{ width: "fit-content" }}
                >
                  {Array.from({ length: 15 }, (_, i) => {
                    const row = Math.floor(i / 3);
                    const col = i % 3;
                    return renderCell(row, col);
                  })}
                </div>
              </div>
            </div>

            {/* Pontuação label */}
            <div className="mt-3 text-center">
              <p className="text-[10px]" style={{ color: "#CD853F" }}>
                Pontuacao: {p1Label} {score.p1} — {p2Label} {score.p2}
              </p>
            </div>
          </>
        )}

        {/* ============ RESULT PHASE ============ */}
        {phase === "result" && (
          <div className="text-center py-8 space-y-4">
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", damping: 12 }}
              className="text-6xl"
            >
              {isWin ? "🏆" : score.p1 === score.p2 ? "🤝" : "😤"}
            </motion.div>
            <h3
              className="text-2xl font-black"
              style={{ color: isWin ? "#FFD700" : "#DEB887" }}
            >
              {winner === "Empate" ? "Empate!" : `Vencedor: ${winner}`}
            </h3>
            <div className="flex justify-center gap-8">
              <div>
                <p className="text-xs" style={{ color: "#CD853F" }}>
                  {p1Label}
                </p>
                <p
                  className="text-3xl font-black"
                  style={{ color: "#009140" }}
                >
                  {score.p1}
                </p>
              </div>
              <div
                className="text-xl font-bold self-center"
                style={{ color: "#FFD700" }}
              >
                vs
              </div>
              <div>
                <p className="text-xs" style={{ color: "#CD853F" }}>
                  {p2Label}
                </p>
                <p
                  className="text-3xl font-black"
                  style={{ color: "#FF6B35" }}
                >
                  {score.p2}
                </p>
              </div>
            </div>
            <button
              onClick={() => setPhase("menu")}
              className="px-8 py-2.5 rounded-xl text-black font-bold transition-all hover:scale-105 active:scale-95"
              style={{
                background: "linear-gradient(135deg, #FFD700, #FF6B35)",
              }}
            >
              Jogar Novamente
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
