import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";

const _MODES: ("bot" | "pvp")[] = ["bot", "pvp"];
const _DIFFS: ("Facil" | "Medio" | "Dificil")[] = ["Facil", "Medio", "Dificil"];

interface DjikotaProps {
  onScore?: (name: string, score: number) => void;
  liveCode?: string;
}

/* ===== Mozambican palette ===== */
const MOZ_GREEN = "#009140";
const MOZ_RED = "#FF0000";
const MOZ_GOLD = "#FFD700";
const MOZ_ORANGE = "#FF6B35";

/* ===== Game constants ===== */
const TOTAL_PITS = 12;       // 6 pits per player × 2 players
const SEEDS_PER_PIT = 4;     // standard Oware/Djikota starting count
const SOW_DELAY = 170;       // ms between each sowed seed
const CAPTURE_DELAY = 260;   // ms between each captured pit
const BOT_THINK_DELAY = 750; // ms the bot "thinks" before moving

/* ===== Capulana-inspired SVG pattern ===== */
const CapulanaPattern = () => (
  <svg
    className="absolute inset-0 w-full h-full opacity-[0.04] pointer-events-none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <pattern
        id="djikota-cap"
        x="0"
        y="0"
        width="44"
        height="44"
        patternUnits="userSpaceOnUse"
      >
        <rect width="44" height="44" fill="none" />
        <path d="M0 0L22 22L44 0" stroke={MOZ_GOLD} strokeWidth="1" fill="none" />
        <path d="M0 22L22 44L44 22" stroke={MOZ_GREEN} strokeWidth="1" fill="none" />
        <circle cx="22" cy="22" r="3.2" fill={MOZ_RED} />
        <circle cx="0" cy="0" r="2" fill={MOZ_GOLD} />
        <circle cx="44" cy="0" r="2" fill={MOZ_GOLD} />
        <circle cx="0" cy="44" r="2" fill={MOZ_GREEN} />
        <circle cx="44" cy="44" r="2" fill={MOZ_GREEN} />
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#djikota-cap)" />
  </svg>
);

/* ===== Seed SVG (a small colored bean / seed) ===== */
const SeedSVG = ({ color = "#8B6914" }: { color?: string }) => (
  <svg viewBox="0 0 20 22" className="w-full h-full">
    <ellipse cx="10" cy="12" rx="6.5" ry="8" fill={color} />
    <ellipse cx="7.4" cy="8" rx="2.1" ry="2.8" fill="rgba(255,255,255,0.32)" />
    <ellipse
      cx="10"
      cy="12"
      rx="6.5"
      ry="8"
      fill="none"
      stroke="rgba(0,0,0,0.25)"
      strokeWidth="0.6"
    />
  </svg>
);

const SEED_COLORS = [
  "#8B6914",
  "#A0522D",
  "#6B4423",
  "#C19A6B",
  "#704214",
  "#556B2F",
];

/* ===== Board layout & game helpers ===== */
/*
 * Pit indices (0..11):
 *   - Bottom row (player / p1): pits 0..5 going LEFT to RIGHT
 *   - Top row (bot / p2):       pits 6..11 (where pit 6 is above pit 5, pit 11 above pit 0)
 *
 * Counter-clockwise sowing order (as the player views the board):
 *   0 -> 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8 -> 9 -> 10 -> 11 -> 0 ...
 *
 * Display layout (top row shown right-to-left so the loop is continuous):
 *   [P2 store]   11 10  9  8  7  6
 *                 0  1  2  3  4  5   [P1 store]
 */
const getPitOwner = (pit: number): "p1" | "p2" =>
  pit < 6 ? "p1" : "p2";

const opponentRange = (player: "p1" | "p2"): [number, number] =>
  player === "p1" ? [6, 11] : [0, 5];

const ownRange = (player: "p1" | "p2"): [number, number] =>
  player === "p1" ? [0, 5] : [6, 11];

const initialBoard = (): number[] => Array(TOTAL_PITS).fill(SEEDS_PER_PIT);

interface SimResult {
  newBoard: number[];
  captured: number;
  capturedPits: { pit: number; count: number }[];
  lastPit: number;
  sowPath: number[];
}

/* Simulate sowing + capture for a move (pure function) */
function simulateMove(
  board: number[],
  fromPit: number,
  player: "p1" | "p2"
): SimResult {
  const newBoard = [...board];
  let seeds = newBoard[fromPit];
  newBoard[fromPit] = 0;
  let currentPit = fromPit;
  const sowPath: number[] = [];

  while (seeds > 0) {
    currentPit = (currentPit + 1) % TOTAL_PITS;
    newBoard[currentPit] += 1;
    seeds -= 1;
    sowPath.push(currentPit);
  }

  const [oppStart, oppEnd] = opponentRange(player);
  const capturedPits: { pit: number; count: number }[] = [];
  let captured = 0;

  /* Capture: if the LAST seed landed in an opponent's pit with 2 or 3 seeds
     (now, after sowing), capture it. Then walk backwards while previous
     opponent pits also have 2 or 3. */
  if (currentPit >= oppStart && currentPit <= oppEnd) {
    let pitToCheck = currentPit;
    while (pitToCheck >= oppStart && pitToCheck <= oppEnd) {
      if (newBoard[pitToCheck] === 2 || newBoard[pitToCheck] === 3) {
        capturedPits.push({
          pit: pitToCheck,
          count: newBoard[pitToCheck],
        });
        captured += newBoard[pitToCheck];
        newBoard[pitToCheck] = 0;
        pitToCheck -= 1;
      } else {
        break;
      }
    }
  }

  /* Oware rule: it is forbidden to capture ALL of the opponent's seeds
     (this would leave them with no moves). If that would happen, skip
     the capture entirely. */
  if (captured > 0) {
    let oppRemaining = 0;
    for (let i = oppStart; i <= oppEnd; i++) oppRemaining += newBoard[i];
    if (oppRemaining === 0) {
      // Re-run sowing without applying captures
      const redo: number[] = [...board];
      let s = redo[fromPit];
      redo[fromPit] = 0;
      let p = fromPit;
      const path: number[] = [];
      while (s > 0) {
        p = (p + 1) % TOTAL_PITS;
        redo[p] += 1;
        s -= 1;
        path.push(p);
      }
      return {
        newBoard: redo,
        captured: 0,
        capturedPits: [],
        lastPit: p,
        sowPath: path,
      };
    }
  }

  return {
    newBoard,
    captured,
    capturedPits,
    lastPit: currentPit,
    sowPath,
  };
}

function getValidMoves(board: number[], player: "p1" | "p2"): number[] {
  const [start, end] = ownRange(player);
  const moves: number[] = [];
  for (let i = start; i <= end; i++) {
    if (board[i] > 0) moves.push(i);
  }
  return moves;
}

/* Bot AI: pick the best move based on difficulty.
   - Dificil: always pick the move with the best net score
   - Medio: 70% best, 30% random from the top half
   - Facil: mostly random, occasionally greedy */
function pickBotMove(
  board: number[],
  difficulty: "Facil" | "Medio" | "Dificil"
): number {
  const validMoves = getValidMoves(board, "p2");
  if (validMoves.length === 0) return -1;

  if (difficulty === "Facil") {
    if (Math.random() < 0.2) {
      const evals = validMoves.map((m) => ({
        m,
        c: simulateMove(board, m, "p2").captured,
      }));
      evals.sort((a, b) => b.c - a.c);
      return evals[0].m;
    }
    return validMoves[Math.floor(Math.random() * validMoves.length)];
  }

  const evaluations = validMoves.map((move) => {
    const result = simulateMove(board, move, "p2");
    let moveScore = result.captured * 10;

    /* Penalty: don't leave opponent an easy capture */
    const opponentMoves = getValidMoves(result.newBoard, "p1");
    let maxOpponentCapture = 0;
    for (const om of opponentMoves) {
      const oppResult = simulateMove(result.newBoard, om, "p1");
      if (oppResult.captured > maxOpponentCapture)
        maxOpponentCapture = oppResult.captured;
    }
    moveScore -= maxOpponentCapture * 6;

    /* Bonus: keep more seeds on our own side (mobility) */
    let ownSeeds = 0;
    for (let i = 6; i <= 11; i++) ownSeeds += result.newBoard[i];
    moveScore += ownSeeds * 0.2;

    return { move, score: moveScore, captured: result.captured };
  });

  evaluations.sort((a, b) => b.score - a.score);

  if (difficulty === "Dificil") {
    return evaluations[0].move;
  }

  // Medio
  if (Math.random() < 0.7) {
    return evaluations[0].move;
  }
  const topHalf = evaluations.slice(
    0,
    Math.max(1, Math.floor(evaluations.length / 2))
  );
  return topHalf[Math.floor(Math.random() * topHalf.length)].move;
}

function checkGameOver(board: number[]): "p1" | "p2" | null {
  const p1Seeds = board.slice(0, 6).reduce((a, b) => a + b, 0);
  const p2Seeds = board.slice(6, 12).reduce((a, b) => a + b, 0);
  if (p1Seeds === 0) return "p2"; // player 1 side empty -> bot wins
  if (p2Seeds === 0) return "p1"; // bot side empty -> player wins
  return null;
}

const MOZ_PHRASES = [
  "Boa!",
  "Kupa!",
  "Forte!",
  "Aye!",
  "Pega!",
  "Limpo!",
  "Quente!",
  "Manhoso!",
];

/* Pre-computed seed positions for cluster display (percentages inside a pit) */
function getSeedPositions(count: number): { x: number; y: number }[] {
  const cx = 50;
  const cy = 50;
  if (count === 1) return [{ x: cx, y: cy }];
  if (count === 2)
    return [
      { x: 36, y: 50 },
      { x: 64, y: 50 },
    ];
  if (count === 3)
    return [
      { x: 50, y: 32 },
      { x: 34, y: 64 },
      { x: 66, y: 64 },
    ];
  if (count === 4)
    return [
      { x: 35, y: 35 },
      { x: 65, y: 35 },
      { x: 35, y: 65 },
      { x: 65, y: 65 },
    ];
  // phyllotaxis (sunflower) for >=5
  const positions: { x: number; y: number }[] = [];
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  const maxR = 36;
  for (let i = 0; i < count; i++) {
    const radius = Math.sqrt(i / count) * maxR;
    const angle = i * goldenAngle;
    positions.push({
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
    });
  }
  return positions;
}

export default function DjikotaGame({ onScore, liveCode }: DjikotaProps) {
  const [mode, setMode] = useState<"bot" | "pvp">("bot");
  const [difficulty, setDifficulty] = useState<"Facil" | "Medio" | "Dificil">(
    "Medio"
  );
  const [phase, setPhase] = useState<"menu" | "countdown" | "playing" | "result">(
    "menu"
  );
  const [countdown, setCountdown] = useState(3);
  const [board, setBoard] = useState<number[]>(initialBoard);
  const [score, setScore] = useState<{ p1: number; p2: number }>({
    p1: 0,
    p2: 0,
  });
  const [currentPlayer, setCurrentPlayer] = useState<"p1" | "p2">("p1");
  const [isAnimating, setIsAnimating] = useState(false);
  const [highlightPit, setHighlightPit] = useState<number | null>(null);
  const [lastSourcePit, setLastSourcePit] = useState<number | null>(null);
  const [lastLandedPit, setLastLandedPit] = useState<number | null>(null);
  const [captureFlash, setCaptureFlash] = useState<{
    pit: number;
    id: number;
    player: "p1" | "p2";
  } | null>(null);
  const [winner, setWinner] = useState<"p1" | "p2" | null>(null);
  const [phrase, setPhrase] = useState("");

  /* Refs to read latest values inside callbacks / timers */
  const boardRef = useRef(board);
  const scoreRef = useRef(score);
  const isAnimatingRef = useRef(isAnimating);
  const phaseRef = useRef(phase);
  const currentPlayerRef = useRef(currentPlayer);
  const onScoreRef = useRef(onScore);

  useEffect(() => {
    boardRef.current = board;
  }, [board]);
  useEffect(() => {
    scoreRef.current = score;
  }, [score]);
  useEffect(() => {
    isAnimatingRef.current = isAnimating;
  }, [isAnimating]);
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);
  useEffect(() => {
    currentPlayerRef.current = currentPlayer;
  }, [currentPlayer]);
  useEffect(() => {
    onScoreRef.current = onScore;
  }, [onScore]);

  /* Animation step state — the effect below advances it one step at a time */
  const [anim, setAnim] = useState<{
    sourcePit: number;
    sowPath: number[];
    sowStep: number;
    captures: { pit: number; count: number }[];
    captureStep: number;
    player: "p1" | "p2";
    finalBoard: number[];
    finalScore: { p1: number; p2: number };
  } | null>(null);

  const showPhrase = useCallback((text: string) => {
    setPhrase(text);
    setTimeout(() => setPhrase(""), 850);
  }, []);

  const startGame = useCallback(() => {
    const freshBoard = initialBoard();
    setBoard(freshBoard);
    boardRef.current = freshBoard;
    const freshScore = { p1: 0, p2: 0 };
    setScore(freshScore);
    scoreRef.current = freshScore;
    setCurrentPlayer("p1");
    currentPlayerRef.current = "p1";
    setWinner(null);
    setIsAnimating(false);
    isAnimatingRef.current = false;
    setHighlightPit(null);
    setLastSourcePit(null);
    setLastLandedPit(null);
    setCaptureFlash(null);
    setPhrase("");
    setAnim(null);
    setPhase("countdown");
    phaseRef.current = "countdown";
    setCountdown(3);
  }, []);

  /* Countdown effect */
  useEffect(() => {
    if (phase !== "countdown") return;
    if (countdown <= 0) {
      setPhase("playing");
      phaseRef.current = "playing";
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 800);
    return () => clearTimeout(t);
  }, [phase, countdown]);

  /* Start a move from a given pit */
  const startMove = useCallback(
    (fromPit: number, player: "p1" | "p2") => {
      if (isAnimatingRef.current) return;
      if (phaseRef.current !== "playing") return;
      const currentBoard = boardRef.current;
      if (currentBoard[fromPit] === 0) return;
      if (getPitOwner(fromPit) !== player) return;

      const result = simulateMove(currentBoard, fromPit, player);
      const currentScore = scoreRef.current;
      const finalScore: { p1: number; p2: number } = {
        ...currentScore,
        [player]: currentScore[player] + result.captured,
      };

      setIsAnimating(true);
      isAnimatingRef.current = true;
      setHighlightPit(fromPit);
      setLastSourcePit(fromPit);
      setLastLandedPit(result.lastPit);

      /* Empty the source pit immediately */
      setBoard((prev) => {
        const b = [...prev];
        b[fromPit] = 0;
        return b;
      });

      setAnim({
        sourcePit: fromPit,
        sowPath: result.sowPath,
        sowStep: 0,
        captures: result.capturedPits,
        captureStep: 0,
        player,
        finalBoard: result.newBoard,
        finalScore,
      });
    },
    []
  );

  /* Animation effect — advances one step per render */
  useEffect(() => {
    if (!anim) return;

    /* Sowing phase */
    if (anim.sowStep < anim.sowPath.length) {
      const targetPit = anim.sowPath[anim.sowStep];
      const t = setTimeout(() => {
        setBoard((prev) => {
          const b = [...prev];
          b[targetPit] += 1;
          return b;
        });
        setHighlightPit(targetPit);
        setLastLandedPit(targetPit);
        setAnim((a) => (a ? { ...a, sowStep: a.sowStep + 1 } : null));
      }, SOW_DELAY);
      return () => clearTimeout(t);
    }

    /* Capture phase */
    if (anim.captureStep < anim.captures.length) {
      const capData = anim.captures[anim.captureStep];
      const t = setTimeout(() => {
        setBoard((prev) => {
          const b = [...prev];
          b[capData.pit] = 0;
          return b;
        });
        setScore((prev) => ({
          ...prev,
          [anim.player]: prev[anim.player] + capData.count,
        }));
        scoreRef.current = {
          ...scoreRef.current,
          [anim.player]: scoreRef.current[anim.player] + capData.count,
        };
        setCaptureFlash({
          pit: capData.pit,
          id: Date.now(),
          player: anim.player,
        });
        setTimeout(() => setCaptureFlash(null), 520);
        if (Math.random() > 0.45) {
          showPhrase(
            MOZ_PHRASES[Math.floor(Math.random() * MOZ_PHRASES.length)]
          );
        }
        setAnim((a) => (a ? { ...a, captureStep: a.captureStep + 1 } : null));
      }, CAPTURE_DELAY);
      return () => clearTimeout(t);
    }

    /* Animation complete — finalize state */
    setHighlightPit(null);
    setBoard(anim.finalBoard);
    boardRef.current = anim.finalBoard;
    setScore(anim.finalScore);
    scoreRef.current = anim.finalScore;
    setIsAnimating(false);
    isAnimatingRef.current = false;
    setAnim(null);

    /* Check game over */
    const winnerCheck = checkGameOver(anim.finalBoard);
    if (winnerCheck) {
      setWinner(winnerCheck);
      if (winnerCheck === "p1") {
        confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
      }
      setTimeout(() => {
        setPhase("result");
        phaseRef.current = "result";
        if (onScoreRef.current)
          onScoreRef.current("Djikota", anim.finalScore.p1);
      }, 700);
    } else {
      const nextPlayer: "p1" | "p2" = anim.player === "p1" ? "p2" : "p1";
      setCurrentPlayer(nextPlayer);
      currentPlayerRef.current = nextPlayer;
    }
    // We intentionally only depend on `anim` so this effect re-runs each step
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anim]);

  /* Bot move effect */
  useEffect(() => {
    if (phase !== "playing") return;
    if (mode !== "bot") return;
    if (currentPlayer !== "p2") return;
    if (isAnimating) return;

    const t = setTimeout(() => {
      const botPit = pickBotMove(boardRef.current, difficulty);
      if (botPit === -1) {
        // Bot has no moves — player wins by default
        setWinner("p1");
        confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
        setPhase("result");
        phaseRef.current = "result";
        if (onScoreRef.current)
          onScoreRef.current("Djikota", scoreRef.current.p1);
        return;
      }
      startMove(botPit, "p2");
    }, BOT_THINK_DELAY);

    return () => clearTimeout(t);
  }, [phase, mode, currentPlayer, isAnimating, difficulty, startMove]);

  /* Handle pit click from the UI */
  const handlePitClick = useCallback(
    (pit: number) => {
      if (phase !== "playing") return;
      if (isAnimating) return;
      if (mode === "bot") {
        if (currentPlayer !== "p1") return;
        if (pit >= 6) return; // can't click bot's pits
      } else {
        // pvp — only the active player can click their own pits
        if (getPitOwner(pit) !== currentPlayer) return;
      }
      startMove(pit, currentPlayer);
    },
    [phase, isAnimating, mode, currentPlayer, startMove]
  );

  /* Computed labels */
  const p1Label = mode === "bot" ? "Voce" : "Jogador 1";
  const p2Label = mode === "bot" ? "Bot" : "Jogador 2";
  const isWin = winner === "p1";
  const isDraw = score.p1 === score.p2 && phase === "result";

  /* ===== Render helpers ===== */

  const renderSeeds = (pit: number, count: number) => {
    if (count === 0) return null;
    const displayCount = Math.min(count, 14);
    const positions = getSeedPositions(displayCount);
    const seeds = [];
    for (let i = 0; i < displayCount; i++) {
      const color = SEED_COLORS[(pit * 7 + i * 3) % SEED_COLORS.length];
      seeds.push(
        <div
          key={`seed-${i}`}
          className="absolute"
          style={{
            left: `${positions[i].x}%`,
            top: `${positions[i].y}%`,
            width: "34%",
            height: "34%",
            transform: "translate(-50%, -50%)",
          }}
        >
          <SeedSVG color={color} />
        </div>
      );
    }
    if (count > 14) {
      seeds.push(
        <div
          key="overflow"
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
        >
          <span
            className="text-[10px] font-black px-1 rounded"
            style={{
              color: "#fff",
              background: "rgba(0,0,0,0.55)",
              textShadow: "0 1px 2px rgba(0,0,0,0.6)",
            }}
          >
            {count}
          </span>
        </div>
      );
    }
    return seeds;
  };

  /* A single pit (cell) on the board */
  const renderPit = (pit: number) => {
    const owner = getPitOwner(pit);
    const count = board[pit];
    const isOwn =
      mode === "pvp"
        ? owner === currentPlayer
        : owner === "p1";
    const canClick =
      phase === "playing" &&
      !isAnimating &&
      isOwn &&
      count > 0 &&
      (mode === "bot" ? currentPlayer === "p1" : true);
    const isHighlighted = highlightPit === pit;
    const isLastSource = lastSourcePit === pit;
    const isCaptureFlashing = captureFlash?.pit === pit;
    const ownerColor = owner === "p1" ? MOZ_GREEN : MOZ_ORANGE;

    return (
      <motion.button
        key={pit}
        type="button"
        onClick={() => handlePitClick(pit)}
        disabled={!canClick}
        whileHover={canClick ? { scale: 1.06, y: -2 } : undefined}
        whileTap={canClick ? { scale: 0.92 } : undefined}
        animate={
          isCaptureFlashing
            ? { scale: [1, 1.18, 0.9, 1], boxShadow: `0 0 22px ${MOZ_GOLD}` }
            : isHighlighted
              ? { scale: [1, 1.08, 1] }
              : { scale: 1 }
        }
        transition={{ duration: 0.3 }}
        className="relative rounded-full select-none"
        style={{
          width: "100%",
          aspectRatio: "1 / 1",
          background: isLastSource
            ? `radial-gradient(circle at 50% 40%, rgba(255,215,0,0.25), rgba(40,25,10,0.85) 70%)`
            : `radial-gradient(circle at 50% 40%, rgba(255,255,255,0.08), rgba(40,25,10,0.85) 70%)`,
          border: `2px solid ${isHighlighted ? MOZ_GOLD : isOwn ? `${ownerColor}88` : "rgba(205,133,63,0.25)"}`,
          boxShadow: isHighlighted
            ? `0 0 14px ${MOZ_GOLD}66, inset 0 2px 4px rgba(0,0,0,0.4)`
            : "inset 0 2px 6px rgba(0,0,0,0.5)",
          cursor: canClick ? "pointer" : "default",
        }}
      >

        <span
          className="absolute top-0.5 left-1 text-[8px] font-bold opacity-50"
          style={{ color: owner === "p1" ? MOZ_GREEN : MOZ_ORANGE }}
        >
          {pit}
        </span>

        <div className="absolute inset-1">{renderSeeds(pit, count)}</div>

        <AnimatePresence>
          {isCaptureFlashing && (
            <motion.div
              key={`flash-${captureFlash?.id}`}
              initial={{ opacity: 0.8, scale: 0.5 }}
              animate={{ opacity: 0, scale: 1.6 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="absolute inset-0 rounded-full pointer-events-none"
              style={{
                background: `radial-gradient(circle, ${MOZ_GOLD}cc 0%, transparent 70%)`,
              }}
            />
          )}
        </AnimatePresence>
      </motion.button>
    );
  };

  /* A store (casa de captura) showing captured seeds */
  const renderStore = (player: "p1" | "p2", value: number) => {
    const color = player === "p1" ? MOZ_GREEN : MOZ_ORANGE;
    const isBotStore = player === "p2";
    return (
      <div
        className="flex flex-col items-center justify-between rounded-2xl py-2 px-1"
        style={{
          width: "12%",
          minWidth: "44px",
          background: `linear-gradient(160deg, ${color}22, ${color}08)`,
          border: `2px solid ${color}88`,
          boxShadow: `inset 0 2px 6px rgba(0,0,0,0.35), 0 0 12px ${color}33`,
        }}
      >
        <div className="text-center">
          <p
            className="text-[8px] sm:text-[9px] font-bold uppercase tracking-tight"
            style={{ color }}
          >
            {isBotStore ? p2Label : p1Label}
          </p>
          <p
            className="text-[7px] sm:text-[8px]"
            style={{ color: "#CD853F" }}
          >
            Capturadas
          </p>
        </div>
        <motion.div
          key={value}
          initial={{ scale: 1.6, rotate: -8 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", damping: 9 }}
          className="text-2xl sm:text-3xl font-black"
          style={{ color: MOZ_GOLD, textShadow: "0 2px 4px rgba(0,0,0,0.6)" }}
        >
          {value}
        </motion.div>

        <div className="flex flex-wrap justify-center gap-0.5 max-w-[44px]">
          {Array.from({ length: Math.min(value, 12) }).map((_, i) => (
            <div
              key={i}
              style={{ width: 8, height: 8 }}
              className="rounded-full"
            >
              <SeedSVG color={SEED_COLORS[i % SEED_COLORS.length]} />
            </div>
          ))}
        </div>
      </div>
    );
  };

  /* Preview pits for the menu */
  const previewTopPits = [11, 10, 9, 8, 7, 6];
  const previewBottomPits = [0, 1, 2, 3, 4, 5];

  return (
    <div
      className="relative w-full max-w-2xl mx-auto rounded-2xl border-2 border-amber-700/40 overflow-hidden"
      style={{
        background:
          "linear-gradient(145deg, #1a1207 0%, #2d1f0e 50%, #1a1207 100%)",
      }}
    >
      <CapulanaPattern />

      <AnimatePresence>
        {phrase && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5, y: 20 }}
            animate={{ opacity: 1, scale: 1.25, y: 0 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute top-1/3 left-1/2 -translate-x-1/2 z-50 pointer-events-none text-3xl sm:text-4xl font-black"
            style={{
              color: MOZ_GOLD,
              textShadow: "0 2px 8px rgba(0,0,0,0.85)",
            }}
          >
            {phrase}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative z-10 p-4 md:p-6">

        <div className="flex items-center gap-3 mb-4">
          <div
            className="h-10 w-10 rounded-xl flex items-center justify-center"
            style={{
              background:
                "linear-gradient(135deg, #009140 0%, #009140 33%, #FF0000 33%, #FF0000 66%, #FFD700 66%, #FFD700 100%)",
            }}
          >
            <span className="text-lg">🫘</span>
          </div>
          <div className="flex-1">
            <h2 className="font-bold text-lg" style={{ color: MOZ_GOLD }}>
              Djikota
            </h2>
            <p className="text-[11px]" style={{ color: "#CD853F" }}>
              Sementeira — Jogo Tradicional Mocambicano
            </p>
          </div>
          {liveCode && (
            <span
              className="text-[9px] px-2 py-0.5 rounded-full font-bold"
              style={{
                background: "rgba(255,215,0,0.1)",
                color: MOZ_GOLD,
              }}
            >
              LIVE: {liveCode}
            </span>
          )}
        </div>

        {phase === "menu" && (
          <div className="space-y-4">
            <p className="text-sm text-center" style={{ color: "#DEB887" }}>
              Semeie as sementes em sentido anti-horario. Capture as sementes
              do adversario quando a ultima semente cair num buraco com 2 ou 3
              sementes. Vence quem capturar mais sementes!
            </p>

            <div className="flex justify-center py-2">
              <div
                className="flex items-stretch gap-1.5 sm:gap-2 p-2 rounded-2xl"
                style={{
                  background:
                    "radial-gradient(ellipse at center, rgba(139,69,19,0.18) 0%, transparent 70%)",
                }}
              >

                <div
                  className="flex items-center justify-center rounded-lg px-1"
                  style={{
                    width: 20,
                    background: "rgba(255,107,53,0.12)",
                    border: "1px solid rgba(255,107,53,0.3)",
                  }}
                >
                  <span
                    className="text-[9px] font-bold"
                    style={{ color: MOZ_ORANGE }}
                  >
                    0
                  </span>
                </div>

                <div className="flex flex-col gap-1">

                  <div className="flex gap-1">
                    {previewTopPits.map((p) => (
                      <div
                        key={p}
                        className="rounded-full flex items-center justify-center"
                        style={{
                          width: 26,
                          height: 26,
                          background:
                            "radial-gradient(circle at 50% 40%, rgba(255,255,255,0.08), rgba(40,25,10,0.85) 70%)",
                          border: "1px solid rgba(205,133,63,0.3)",
                        }}
                      >
                        <span
                          className="text-[8px] font-bold"
                          style={{ color: MOZ_ORANGE }}
                        >
                          4
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-1">
                    {previewBottomPits.map((p) => (
                      <div
                        key={p}
                        className="rounded-full flex items-center justify-center"
                        style={{
                          width: 26,
                          height: 26,
                          background:
                            "radial-gradient(circle at 50% 40%, rgba(255,255,255,0.08), rgba(40,25,10,0.85) 70%)",
                          border: "1px solid rgba(0,145,64,0.4)",
                        }}
                      >
                        <span
                          className="text-[8px] font-bold"
                          style={{ color: MOZ_GREEN }}
                        >
                          4
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div
                  className="flex items-center justify-center rounded-lg px-1"
                  style={{
                    width: 20,
                    background: "rgba(0,145,64,0.12)",
                    border: "1px solid rgba(0,145,64,0.3)",
                  }}
                >
                  <span
                    className="text-[9px] font-bold"
                    style={{ color: MOZ_GREEN }}
                  >
                    0
                  </span>
                </div>
              </div>
            </div>

            <div
              className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-[10px]"
              style={{ color: "#CD853F" }}
            >
              <span>
                <span style={{ color: MOZ_GREEN }}>48</span> Sementes
              </span>
              <span>
                <span style={{ color: MOZ_GOLD }}>2 ou 3</span> Captura
              </span>
              <span>
                <span style={{ color: MOZ_ORANGE }}>Anti-horario</span> Semeacao
              </span>
            </div>

            <div className="flex justify-center gap-2">
              {_MODES.map((m) => (
                <motion.button
                  key={m}
                  whileHover={{ scale: 1.03 }}
                  onClick={() => setMode(m)}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                    mode === m ? "text-black" : "text-amber-200/60"
                  }`}
                  style={
                    mode === m
                      ? {
                          background:
                            "linear-gradient(135deg, #FFD700, #FF6B35)",
                          boxShadow: "0 0 15px rgba(255,215,0,0.3)",
                        }
                      : {
                          background: "rgba(255,215,0,0.1)",
                          border: "1px solid rgba(255,215,0,0.2)",
                        }
                  }
                >
                  {m === "bot" ? "vs Computador" : "vs Jogador"}
                </motion.button>
              ))}
            </div>

            {mode === "bot" && (
              <div className="flex justify-center gap-2">
                {_DIFFS.map((d) => (
                  <button
                    key={d}
                    onClick={() => setDifficulty(d)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      difficulty === d
                        ? "text-white"
                        : "text-amber-200/60"
                    }`}
                    style={
                      difficulty === d
                        ? {
                            background:
                              d === "Facil"
                                ? MOZ_GREEN
                                : d === "Medio"
                                  ? MOZ_ORANGE
                                  : MOZ_RED,
                          }
                        : { background: "rgba(255,255,255,0.05)" }
                    }
                  >
                    {d}
                  </button>
                ))}
              </div>
            )}

            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={startGame}
              className="w-full py-3 rounded-xl text-black font-black text-lg transition-all"
              style={{
                background: "linear-gradient(135deg, #FFD700, #FF6B35)",
                boxShadow: "0 0 25px rgba(255,215,0,0.3)",
              }}
            >
              Comecar Jogo
            </motion.button>
          </div>
        )}

        {phase === "countdown" && (
          <div className="flex items-center justify-center py-20">
            <AnimatePresence mode="wait">
              <motion.div
                key={countdown}
                initial={{ scale: 2, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                className="text-8xl font-black"
                style={{
                  color: MOZ_GOLD,
                  textShadow: "0 0 40px rgba(255,215,0,0.5)",
                }}
              >
                {countdown > 0 ? countdown : "VAI!"}
              </motion.div>
            </AnimatePresence>
          </div>
        )}

        {phase === "playing" && (
          <>

            <div className="flex items-center justify-between mb-3">

              <div className="flex items-center gap-1.5">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ background: MOZ_GREEN }}
                />
                <span
                  className="text-xs font-bold"
                  style={{ color: "#DEB887" }}
                >
                  {p1Label}
                </span>
                <span
                  className="text-xl font-black"
                  style={{ color: MOZ_GOLD }}
                >
                  {score.p1}
                </span>
              </div>

              <div className="text-center">
                <p
                  className="text-[9px] font-medium mb-0.5"
                  style={{ color: "#CD853F" }}
                >
                  Vez de
                </p>
                <motion.div
                  key={currentPlayer}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-sm font-black px-3 py-0.5 rounded-full"
                  style={{
                    background:
                      currentPlayer === "p1"
                        ? "rgba(0,145,64,0.18)"
                        : "rgba(255,107,53,0.18)",
                    color: currentPlayer === "p1" ? MOZ_GREEN : MOZ_ORANGE,
                  }}
                >
                  {currentPlayer === "p1"
                    ? mode === "bot"
                      ? "Sua Vez"
                      : "Jogador 1"
                    : mode === "bot"
                      ? "Vez do Bot"
                      : "Jogador 2"}
                </motion.div>
              </div>

              <div className="flex items-center gap-1.5">
                <span
                  className="text-xl font-black"
                  style={{ color: MOZ_ORANGE }}
                >
                  {score.p2}
                </span>
                <span
                  className="text-xs font-bold"
                  style={{ color: "#CD853F" }}
                >
                  {p2Label}
                </span>
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ background: MOZ_ORANGE }}
                />
              </div>
            </div>

            <div className="flex items-stretch gap-2 sm:gap-3">

              {renderStore("p2", score.p2)}

              <div
                className="flex-1 rounded-2xl p-2 sm:p-3 relative"
                style={{
                  background:
                    "radial-gradient(ellipse at center, rgba(139,69,19,0.18) 0%, rgba(60,40,20,0.5) 80%)",
                  border: "1.5px solid rgba(205,133,63,0.3)",
                }}
              >
                <CapulanaPattern />
                <div className="relative z-10 flex flex-col gap-2">

                  <div className="grid grid-cols-6 gap-1.5 sm:gap-2">
                    {previewTopPits.map((p) => renderPit(p))}
                  </div>

                  <div className="grid grid-cols-6 gap-1.5 sm:gap-2">
                    {previewBottomPits.map((p) => renderPit(p))}
                  </div>
                </div>
              </div>

              {renderStore("p1", score.p1)}
            </div>

            <div className="mt-3 text-center space-y-1">
              <p className="text-[10px]" style={{ color: "#CD853F" }}>
                {mode === "bot" && currentPlayer === "p2" && !isAnimating
                  ? "Bot a pensar a melhor jogada..."
                  : isAnimating
                    ? "A semear sementes..."
                    : currentPlayer === "p1"
                      ? "Toque num dos seus buracos (linha de baixo) para semear"
                      : "Aguarde a sua vez..."}
              </p>
              <p className="text-[10px]" style={{ color: "#CD853F" }}>
                Sementes no tabuleiro:{" "}
                <span style={{ color: MOZ_GOLD }}>
                  {board.reduce((a, b) => a + b, 0)}
                </span>{" "}
                / 48 — Capturadas:{" "}
                <span style={{ color: MOZ_GREEN }}>{p1Label}</span>{" "}
                {score.p1} •{" "}
                <span style={{ color: MOZ_ORANGE }}>{p2Label}</span> {score.p2}
              </p>
            </div>
          </>
        )}

        {phase === "result" && (
          <div className="text-center py-8 space-y-4">
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", damping: 12 }}
              className="text-6xl"
            >
              {isWin ? "🏆" : isDraw ? "🤝" : "😤"}
            </motion.div>
            <h3
              className="text-2xl font-black"
              style={{ color: isWin ? MOZ_GOLD : "#DEB887" }}
            >
              {isDraw
                ? "Empate!"
                : `Vencedor: ${isWin ? p1Label : p2Label}`}
            </h3>
            <p className="text-xs" style={{ color: "#CD853F" }}>
              {isWin
                ? "Mestre da sementeira! Parabens!"
                : isDraw
                  ? "Jogo equilibrado, ambos jogaram bem!"
                  : "O adversario foi mais esperto desta vez!"}
            </p>
            <div className="flex justify-center gap-8">
              <div>
                <p className="text-xs" style={{ color: "#CD853F" }}>
                  {p1Label}
                </p>
                <p
                  className="text-3xl font-black"
                  style={{ color: MOZ_GREEN }}
                >
                  {score.p1}
                </p>
                <p className="text-[9px]" style={{ color: "#CD853F" }}>
                  Sementes Capturadas
                </p>
              </div>
              <div
                className="text-xl font-bold self-center"
                style={{ color: MOZ_GOLD }}
              >
                vs
              </div>
              <div>
                <p className="text-xs" style={{ color: "#CD853F" }}>
                  {p2Label}
                </p>
                <p
                  className="text-3xl font-black"
                  style={{ color: MOZ_ORANGE }}
                >
                  {score.p2}
                </p>
                <p className="text-[9px]" style={{ color: "#CD853F" }}>
                  Sementes Capturadas
                </p>
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={startGame}
              className="px-8 py-2.5 rounded-xl text-black font-bold transition-all"
              style={{
                background: "linear-gradient(135deg, #FFD700, #FF6B35)",
                boxShadow: "0 0 25px rgba(255,215,0,0.3)",
              }}
            >
              Jogar Novamente
            </motion.button>
          </div>
        )}
      </div>
    </div>
  );
}
