import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Clock, Gamepad2, User, Cpu } from "lucide-react";

/* ------------------- Types ------------------- */
interface MexericaProps {
  onScore?: (name: string, score: number) => void;
  liveCode?: string;
}

type Mode = "bot" | "vs";
type Difficulty = "facil" | "medio" | "dificil";
type Phase = "idle" | "countdown" | "playing" | "finished";

interface Hand {
  id: number;
  position: { x: number; y: number };
  isLeft: boolean;
  spawnTime: number;
  claimedBy: "player" | "opponent" | null;
}

/* ------------------- Constants ------------------- */
const ROUND_DURATION = 30;
const HAND_LIFETIME = 1400; // ms before hand disappears
const HAND_SPAWN_INTERVAL = 900; // ms between hand spawns
const DIFFICULTY_REACTION: Record<Difficulty, number> = {
  facil: 800,
  medio: 500,
  dificil: 300,
};

const PHRASES = ["Eish!", "Ma-loko!", "Kupela!", "Boa!", "Azarado!", "Nhaca!", "Khoroko!"];

const HAND_POSITIONS = [
  { x: 12, y: 10 },
  { x: 72, y: 10 },
  { x: 12, y: 55 },
  { x: 72, y: 55 },
  { x: 42, y: 30 },
  { x: 28, y: 42 },
  { x: 58, y: 18 },
  { x: 20, y: 70 },
  { x: 65, y: 65 },
];

const CONFETTI_COLORS = ["#FFD700", "#FF0000", "#009140", "#d97706", "#f59e0b", "#ffffff", "#000000"];

/* ------------------- SVG Hand Components ------------------- */
const LeftHandSVG = ({ color = "#8B4513", hennaColor = "#d97706" }: { color?: string; hennaColor?: string }) => (
  <svg viewBox="0 0 120 140" width="100%" height="100%">
    {/* Palm */}
    <ellipse cx="60" cy="90" rx="38" ry="42" fill={color} opacity="0.95" />
    <ellipse cx="60" cy="90" rx="32" ry="36" fill={color} />
    {/* Henna palm patterns */}
    <circle cx="48" cy="78" r="4" fill="none" stroke={hennaColor} strokeWidth="1.2" opacity="0.7" />
    <circle cx="72" cy="78" r="4" fill="none" stroke={hennaColor} strokeWidth="1.2" opacity="0.7" />
    <circle cx="60" cy="92" r="6" fill="none" stroke={hennaColor} strokeWidth="1" opacity="0.6" />
    <line x1="48" y1="82" x2="72" y2="82" stroke={hennaColor} strokeWidth="0.8" opacity="0.5" />
    <line x1="54" y1="78" x2="54" y2="92" stroke={hennaColor} strokeWidth="0.8" opacity="0.5" />
    <line x1="66" y1="78" x2="66" y2="92" stroke={hennaColor} strokeWidth="0.8" opacity="0.5" />
    {/* Thumb - pointing right */}
    <ellipse cx="95" cy="78" rx="12" ry="22" transform="rotate(-30 95 78)" fill={color} />
    <ellipse cx="95" cy="78" rx="9" ry="18" transform="rotate(-30 95 78)" fill={color} />
    {/* Henna on thumb */}
    <circle cx="100" cy="68" r="3" fill="none" stroke={hennaColor} strokeWidth="1" opacity="0.6" />
    <circle cx="100" cy="76" r="2" fill={hennaColor} opacity="0.3" />
    {/* Fingers pointing up */}
    {[0, 1, 2, 3].map((i) => {
      const xOff = -22 + i * 15;
      const len = i === 0 ? 32 : i === 3 ? 28 : 30;
      return (
        <g key={i}>
          <rect x={55 + xOff - 6} y={50 - len} width="12" height={len + 12} rx="6" fill={color} />
          <rect x={55 + xOff - 4.5} y={50 - len + 2} width="9" height={len + 8} rx="4.5" fill={color} />
          {/* Finger henna rings */}
          <rect x={55 + xOff - 5} y={50 - len + 8} width="10" height="2" rx="1" fill={hennaColor} opacity="0.5" />
          <rect x={55 + xOff - 5} y={50 - len + 16} width="10" height="1.5" rx="0.75" fill={hennaColor} opacity="0.4" />
          {/* Fingertip dot */}
          <circle cx={55 + xOff} cy={50 - len + 4} r="2" fill={hennaColor} opacity="0.6" />
        </g>
      );
    })}
    {/* Wrist */}
    <rect x="38" y="120" width="44" height="20" rx="10" fill={color} opacity="0.85" />
    {/* Wrist bracelet pattern */}
    <rect x="40" y="122" width="40" height="3" rx="1.5" fill={hennaColor} opacity="0.6" />
    <rect x="40" y="127" width="40" height="2" rx="1" fill={hennaColor} opacity="0.4" />
    {/* Geometric henna on back of hand */}
    <polygon points="60,70 55,80 65,80" fill="none" stroke={hennaColor} strokeWidth="0.8" opacity="0.5" />
    <polygon points="50,88 46,96 54,96" fill="none" stroke={hennaColor} strokeWidth="0.8" opacity="0.4" />
    <polygon points="70,88 66,96 74,96" fill="none" stroke={hennaColor} strokeWidth="0.8" opacity="0.4" />
  </svg>
);

const RightHandSVG = ({ color = "#8B4513", hennaColor = "#d97706" }: { color?: string; hennaColor?: string }) => (
  <svg viewBox="0 0 120 140" width="100%" height="100%" style={{ transform: "scaleX(-1)" }}>
    <ellipse cx="60" cy="90" rx="38" ry="42" fill={color} opacity="0.95" />
    <ellipse cx="60" cy="90" rx="32" ry="36" fill={color} />
    <circle cx="48" cy="78" r="4" fill="none" stroke={hennaColor} strokeWidth="1.2" opacity="0.7" />
    <circle cx="72" cy="78" r="4" fill="none" stroke={hennaColor} strokeWidth="1.2" opacity="0.7" />
    <circle cx="60" cy="92" r="6" fill="none" stroke={hennaColor} strokeWidth="1" opacity="0.6" />
    <line x1="48" y1="82" x2="72" y2="82" stroke={hennaColor} strokeWidth="0.8" opacity="0.5" />
    <line x1="54" y1="78" x2="54" y2="92" stroke={hennaColor} strokeWidth="0.8" opacity="0.5" />
    <line x1="66" y1="78" x2="66" y2="92" stroke={hennaColor} strokeWidth="0.8" opacity="0.5" />
    <ellipse cx="95" cy="78" rx="12" ry="22" transform="rotate(-30 95 78)" fill={color} />
    <ellipse cx="95" cy="78" rx="9" ry="18" transform="rotate(-30 95 78)" fill={color} />
    <circle cx="100" cy="68" r="3" fill="none" stroke={hennaColor} strokeWidth="1" opacity="0.6" />
    <circle cx="100" cy="76" r="2" fill={hennaColor} opacity="0.3" />
    {[0, 1, 2, 3].map((i) => {
      const xOff = -22 + i * 15;
      const len = i === 0 ? 32 : i === 3 ? 28 : 30;
      return (
        <g key={i}>
          <rect x={55 + xOff - 6} y={50 - len} width="12" height={len + 12} rx="6" fill={color} />
          <rect x={55 + xOff - 4.5} y={50 - len + 2} width="9" height={len + 8} rx="4.5" fill={color} />
          <rect x={55 + xOff - 5} y={50 - len + 8} width="10" height="2" rx="1" fill={hennaColor} opacity="0.5" />
          <rect x={55 + xOff - 5} y={50 - len + 16} width="10" height="1.5" rx="0.75" fill={hennaColor} opacity="0.4" />
          <circle cx={55 + xOff} cy={50 - len + 4} r="2" fill={hennaColor} opacity="0.6" />
        </g>
      );
    })}
    <rect x="38" y="120" width="44" height="20" rx="10" fill={color} opacity="0.85" />
    <rect x="40" y="122" width="40" height="3" rx="1.5" fill={hennaColor} opacity="0.6" />
    <rect x="40" y="127" width="40" height="2" rx="1" fill={hennaColor} opacity="0.4" />
    <polygon points="60,70 55,80 65,80" fill="none" stroke={hennaColor} strokeWidth="0.8" opacity="0.5" />
    <polygon points="50,88 46,96 54,96" fill="none" stroke={hennaColor} strokeWidth="0.8" opacity="0.4" />
    <polygon points="70,88 66,96 74,96" fill="none" stroke={hennaColor} strokeWidth="0.8" opacity="0.4" />
  </svg>
);

/* ------------------- Capulana Pattern (CSS keyframes injected once) ------------------- */
let styleInjected = false;
function injectCapulanaStyles() {
  if (styleInjected) return;
  styleInjected = true;
  const s = document.createElement("style");
  s.textContent = `
    @keyframes capulanaShift {
      0% { background-position: 0 0, 30px 30px, 0 0, 30px 30px; }
      100% { background-position: 60px 60px, 0 0, 60px 60px, 0 0; }
    }
    @keyframes pulseGlow {
      0%, 100% { filter: drop-shadow(0 0 8px rgba(255,215,0,0.3)); }
      50% { filter: drop-shadow(0 0 20px rgba(255,215,0,0.7)); }
    }
    @keyframes handShake {
      0%, 100% { transform: rotate(0deg); }
      25% { transform: rotate(-4deg); }
      75% { transform: rotate(4deg); }
    }
    .mexerica-capulana {
      background-image:
        linear-gradient(45deg, rgba(0,145,64,0.06) 25%, transparent 25%),
        linear-gradient(-45deg, rgba(255,0,0,0.05) 25%, transparent 25%),
        linear-gradient(45deg, transparent 75%, rgba(255,215,0,0.06) 75%),
        linear-gradient(-45deg, transparent 75%, rgba(0,145,64,0.04) 75%);
      background-size: 60px 60px;
      background-position: 0 0, 30px 30px, 0 0, 30px 30px;
      animation: capulanaShift 20s linear infinite;
    }
    .mexerica-hand-glow {
      animation: pulseGlow 1.5s ease-in-out infinite;
    }
    .mexerica-hand-idle {
      animation: handShake 0.6s ease-in-out infinite;
    }
  `;
  document.head.appendChild(s);
}

/* ------------------- Confetti Piece ------------------- */
const ConfettiPiece = ({ index }: { index: number }) => {
  const color = CONFETTI_COLORS[index % CONFETTI_COLORS.length];
  const startX = 50 + (Math.random() - 0.5) * 80;
  const startY = -10;
  const endX = startX + (Math.random() - 0.5) * 120;
  const endY = 100 + Math.random() * 30;
  const rotation = Math.random() * 720 - 360;
  const size = 6 + Math.random() * 8;
  const delay = Math.random() * 0.6;
  const duration = 2 + Math.random() * 1.5;
  const isCircle = Math.random() > 0.5;

  return (
    <motion.div
      initial={{ x: `${startX}%`, y: `${startY}%`, rotate: 0, opacity: 1, scale: 1 }}
      animate={{ x: `${endX}%`, y: `${endY}%`, rotate: rotation, opacity: 0, scale: 0.3 }}
      transition={{ duration, delay, ease: "easeOut" }}
      style={{
        position: "absolute",
        width: size,
        height: isCircle ? size : size * 1.6,
        backgroundColor: color,
        borderRadius: isCircle ? "50%" : "2px",
        top: 0,
        left: 0,
        pointerEvents: "none",
        zIndex: 100,
      }}
    />
  );
};

/* ------------------- Main Component ------------------- */
const MexericaGame: React.FC<MexericaProps> = ({ onScore, liveCode }) => {
  injectCapulanaStyles();

  const [mode, setMode] = useState<Mode>("bot");
  const [difficulty, setDifficulty] = useState<Difficulty>("medio");
  const [phase, setPhase] = useState<Phase>("idle");
  const [countdown, setCountdown] = useState(3);
  const [playerScore, setPlayerScore] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(ROUND_DURATION);
  const [hands, setHands] = useState<Hand[]>([]);
  const [phrases, setPhrases] = useState<{ id: number; text: string; x: number; y: number }[]>([]);
  const [round, setRound] = useState(1);
  const [winner, setWinner] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  const handIdRef = useRef(0);
  const phraseIdRef = useRef(0);
  const spawnTimerRef = useRef<number | null>(null);
  const gameTimerRef = useRef<number | null>(null);
  const botTimerRef = useRef<number | null>(null);
  const cleanupTimerRef = useRef<number | null>(null);
  const handsRef = useRef<Hand[]>([]);

  // Keep handsRef in sync
  useEffect(() => {
    handsRef.current = hands;
  }, [hands]);

  /* --- Cleanup all timers --- */
  const clearAllTimers = useCallback(() => {
    if (spawnTimerRef.current) { clearInterval(spawnTimerRef.current); spawnTimerRef.current = null; }
    if (gameTimerRef.current) { clearInterval(gameTimerRef.current); gameTimerRef.current = null; }
    if (botTimerRef.current) { clearInterval(botTimerRef.current); botTimerRef.current = null; }
    if (cleanupTimerRef.current) { clearInterval(cleanupTimerRef.current); cleanupTimerRef.current = null; }
  }, []);

  /* --- End round --- */
  const endRound = useCallback(() => {
    clearAllTimers();
    setPhase("finished");
    setHands([]);
    let winnerName = "";
    if (playerScore > opponentScore) {
      winnerName = "Jogador 1";
      onScore?.("Jogador 1", playerScore);
    } else if (opponentScore > playerScore) {
      winnerName = mode === "bot" ? "Computador" : "Jogador 2";
      onScore?.(winnerName, opponentScore);
    } else {
      winnerName = "Empate";
    }
    setWinner(winnerName);
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 3500);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clearAllTimers, mode, playerScore, opponentScore, onScore]);

  /* --- Spawn a hand --- */
  const spawnHand = useCallback(() => {
    const posIndex = Math.floor(Math.random() * HAND_POSITIONS.length);
    const pos = HAND_POSITIONS[posIndex];
    const isLeft = Math.random() > 0.5;
    const id = handIdRef.current++;
    const newHand: Hand = { id, position: pos, isLeft, spawnTime: Date.now(), claimedBy: null };
    setHands((prev) => [...prev, newHand]);
  }, []);

  /* --- Bot AI: attempts to tap unclaimed hands --- */
  const botTick = useCallback(() => {
    if (mode !== "bot") return;
    const reactionTime = DIFFICULTY_REACTION[difficulty];
    const jitter = (Math.random() - 0.5) * reactionTime * 0.5;
    const now = Date.now();
    setHands((prev) => {
      const updated = [...prev];
      for (const hand of updated) {
        if (hand.claimedBy) continue;
        const elapsed = now - hand.spawnTime;
        if (elapsed >= reactionTime + jitter && Math.random() > 0.3) {
          hand.claimedBy = "opponent";
          setOpponentScore((s) => s + 1);
          const pid = phraseIdRef.current++;
          setPhrases((p) => [...p, { id: pid, text: PHRASES[Math.floor(Math.random() * PHRASES.length)], x: hand.position.x + 10, y: hand.position.y - 5 }]);
          setTimeout(() => setPhrases((p) => p.filter((pp) => pp.id !== pid)), 800);
          break; // one tap per tick
        }
      }
      return updated;
    });
  }, [mode, difficulty]);

  /* --- Remove expired hands --- */
  const cleanupHands = useCallback(() => {
    const now = Date.now();
    setHands((prev) => prev.filter((h) => now - h.spawnTime < HAND_LIFETIME));
  }, []);

  /* --- Start game --- */
  const startGame = useCallback(() => {
    clearAllTimers();
    setPlayerScore(0);
    setOpponentScore(0);
    setTimeLeft(ROUND_DURATION);
    setHands([]);
    setPhrases([]);
    setWinner(null);
    setShowConfetti(false);
    setPhase("countdown");
    setCountdown(3);
  }, [clearAllTimers]);

  /* --- Countdown effect --- */
  useEffect(() => {
    if (phase !== "countdown") return;
    if (countdown <= 0) {
      setPhase("playing");
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 800);
    return () => clearTimeout(t);
  }, [phase, countdown]);

  /* --- Playing phase: timers --- */
  useEffect(() => {
    if (phase !== "playing") return;
    const startTs = Date.now();

    // Game timer
    gameTimerRef.current = window.setInterval(() => {
      const elapsed = (Date.now() - startTs) / 1000;
      const remaining = Math.max(0, ROUND_DURATION - elapsed);
      setTimeLeft(Number(remaining.toFixed(1)));
      if (remaining <= 0) {
        endRound();
      }
    }, 80);

    // Hand spawner
    spawnTimerRef.current = window.setInterval(() => {
      spawnHand();
    }, HAND_SPAWN_INTERVAL);

    // Bot AI
    if (mode === "bot") {
      const botInterval = Math.max(100, DIFFICULTY_REACTION[difficulty] * 0.6);
      botTimerRef.current = window.setInterval(() => {
        botTick();
      }, botInterval);
    }

    // Cleanup expired hands
    cleanupTimerRef.current = window.setInterval(() => {
      cleanupHands();
    }, 200);

    // Spawn first hand immediately
    spawnHand();

    return () => clearAllTimers();
  }, [phase, mode, difficulty, spawnHand, botTick, cleanupHands, endRound, clearAllTimers]);

  /* --- Handle player tap --- */
  const handleTap = useCallback(
    (handId: number) => {
      if (phase !== "playing") return;
      const hand = handsRef.current.find((h) => h.id === handId);
      if (!hand || hand.claimedBy) return;

      setHands((prev) =>
        prev.map((h) => (h.id === handId ? { ...h, claimedBy: "player" } : h))
      );
      setPlayerScore((s) => s + 1);

      const pid = phraseIdRef.current++;
      const phraseText = PHRASES[Math.floor(Math.random() * PHRASES.length)];
      setPhrases((p) => [
        ...p,
        { id: pid, text: phraseText, x: hand.position.x + 10, y: hand.position.y - 5 },
      ]);
      setTimeout(() => setPhrases((p) => p.filter((pp) => pp.id !== pid)), 800);
    },
    [phase]
  );

  /* --- Next round --- */
  const nextRound = () => {
    setRound((r) => r + 1);
    startGame();
  };

  const opponentName = mode === "bot" ? "Computador" : "Jogador 2";

  /* =============== RENDER =============== */
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        minHeight: 480,
        borderRadius: 16,
        overflow: "hidden",
        background: "linear-gradient(145deg, #1a0e04 0%, #2d1810 30%, #1a1208 60%, #0f0a04 100%)",
        fontFamily: "'Segoe UI', system-ui, sans-serif",
        color: "#f5e6d0",
        userSelect: "none",
      }}
    >
      {/* -- Capulana pattern overlay -- */}
      <div
        className="mexerica-capulana"
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 0,
          opacity: 0.9,
        }}
      />

      {/* -- Decorative border -- */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          border: "3px solid transparent",
          borderImage: "linear-gradient(135deg, #FFD700, #FF0000, #009140, #FFD700) 1",
          zIndex: 1,
          pointerEvents: "none",
        }}
      />

      {/* -- Inner decorative line -- */}
      <div
        style={{
          position: "absolute",
          inset: 6,
          border: "1px solid rgba(255,215,0,0.15)",
          borderRadius: 12,
          zIndex: 1,
          pointerEvents: "none",
        }}
      />

      {/* -- Content -- */}
      <div style={{ position: "relative", zIndex: 2, padding: "16px 20px" }}>
        {/* -- Header -- */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ fontSize: 28, lineHeight: 1 }}>
              <span style={{ color: "#FFD700", fontWeight: 800, letterSpacing: -0.5 }}>Mexerica</span>
              <span style={{ color: "#f5e6d0", fontWeight: 300, fontSize: 16, marginLeft: 6, fontStyle: "italic", opacity: 0.8 }}>
                Bate a Mão
              </span>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "rgba(255,215,0,0.6) }}>
            <Gamepad2 size={14} />
    </div>
  );
};

export default MexericaGame;
