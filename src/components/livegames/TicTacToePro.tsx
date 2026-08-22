import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RotateCcw, Grid3X3, HelpCircle, Trophy, Clock, Bot, Users, Zap, Target, Timer } from "lucide-react";
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

type Player = "X" | "O";
type Cell = null | Player;
type MiniResult = null | Player | "draw";
type GameMode = "menu" | "pvp" | "bot";
type Difficulty = "facil" | "medio" | "dificil";
type AIMove = { boardIdx: number; cellIdx: number };

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const WIN_LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

const BOARD_NAMES: Record<number, string> = {
  0: "superior esquerdo",
  1: "superior central",
  2: "superior direito",
  3: "centro esquerdo",
  4: "centro",
  5: "centro direito",
  6: "inferior esquerdo",
  7: "inferior central",
  8: "inferior direito",
};

// Strategic weight of each big-board position (center = most valuable)
const BOARD_WEIGHTS = [1, 2, 1, 2, 3, 2, 1, 2, 1];

const DIFFICULTY_CONFIG: Record<Difficulty, { label: string; randomChance: number; depth: number; desc: string }> = {
  facil:  { label: "Fácil",   randomChance: 0.3, depth: 2, desc: "30% jogadas aleatórias" },
  medio:  { label: "Médio",   randomChance: 0.1, depth: 3, desc: "10% jogadas aleatórias" },
  dificil: { label: "Difícil", randomChance: 0,   depth: 4, desc: "Minimax puro — imbatível" },
};

/* ------------------------------------------------------------------ */
/*  SVG Mark Components (animated draw effect)                         */
/* ------------------------------------------------------------------ */

const XMarkSvg = ({ size = 16, color = "currentColor" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.8} strokeLinecap="round">
    <motion.path
      d="M5 5L19 19"
      initial={{ pathLength: 0, opacity: 0 }}
      animate={{ pathLength: 1, opacity: 1 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    />
    <motion.path
      d="M19 5L5 19"
      initial={{ pathLength: 0, opacity: 0 }}
      animate={{ pathLength: 1, opacity: 1 }}
      transition={{ duration: 0.25, ease: "easeOut", delay: 0.12 }}
    />
  </svg>
);

const OMarkSvg = ({ size = 16, color = "currentColor" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.8} strokeLinecap="round">
    <motion.circle
      cx={12} cy={12} r={8}
      initial={{ pathLength: 0, opacity: 0 }}
      animate={{ pathLength: 1, opacity: 1 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
    />
  </svg>
);

const MiniMarkSvg = ({ player, size = 28 }: { player: Player; size?: number }) => {
  const color = player === "X" ? "rgba(34,211,238,0.9)" : "rgba(244,114,182,0.9)";
  return player === "X" ? <XMarkSvg size={size} color={color} /> : <OMarkSvg size={size} color={color} />;
};

const boardToPercent = (idx: number): { x: number; y: number } => {
  const col = idx % 3;
  const row = Math.floor(idx / 3);
  return { x: (col * 2 + 1) / 6 * 100, y: (row * 2 + 1) / 6 * 100 };
};

const formatTime = (seconds: number): string => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}:${s.toString().padStart(2, "0")}` : `${s}s`;
};

/* ------------------------------------------------------------------ */
/*  Utility helpers                                                    */
/* ------------------------------------------------------------------ */

const checkWin = (b: (Cell | MiniResult)[]): { winner: Player | null; line: number[] | null } => {
  for (const line of WIN_LINES) {
    const [a, bb, c] = line;
    if (b[a] && b[a] !== "draw" && b[a] === b[bb] && b[a] === b[c]) {
      return { winner: b[a] as Player, line };
    }
  }
  return { winner: null, line: null };
};

const createEmptyCells = (): Cell[] => Array(81).fill(null) as Cell[];
const createEmptyMiniResults = (): MiniResult[] => Array(9).fill(null) as MiniResult[];

const getSmallBoardCells = (cells: Cell[], boardIdx: number): Cell[] =>
  cells.slice(boardIdx * 9, boardIdx * 9 + 9);

const isBoardFull = (cells: Cell[], boardIdx: number): boolean =>
  getSmallBoardCells(cells, boardIdx).every((c) => c !== null);

const playerNameBase = (p: Player) => (p === "X" ? "Jogador 1" : "Jogador 2");
const playerColor = (p: Player) => (p === "X" ? "text-cyan-400" : "text-pink-400");
const playerMark = (p: Player) => (p === "X" ? "✕" : "○");
const playerBorderHighlight = (p: Player) =>
  p === "X" ? "border-cyan-500/40" : "border-pink-500/40";
const playerGlowColor = (p: Player) =>
  p === "X" ? "rgba(34,211,238,0.15)" : "rgba(244,114,182,0.15)";

/* ------------------------------------------------------------------ */
/*  AI — Minimax with alpha-beta pruning                              */
/* ------------------------------------------------------------------ */

/** Return every legal (board, cell) pair for the given game state. */
const getValidMoves = (cells: Cell[], miniResults: MiniResult[], targetBoard: number | null): AIMove[] => {
  const moves: AIMove[] = [];

  // If target board is playable, restrict to it
  const candidateBoards =
    targetBoard !== null &&
    miniResults[targetBoard] === null &&
    !isBoardFull(cells, targetBoard)
      ? [targetBoard]
      : [0, 1, 2, 3, 4, 5, 6, 7, 8];

  for (const bi of candidateBoards) {
    if (miniResults[bi] !== null) continue;
    const small = getSmallBoardCells(cells, bi);
    for (let ci = 0; ci < 9; ci++) {
      if (small[ci] === null) moves.push({ boardIdx: bi, cellIdx: ci });
    }
  }
  return moves;
};

/** After a move at `cellIdx`, compute the next target board. */
const getNextTarget = (miniResults: MiniResult[], cells: Cell[], cellIdx: number): number | null => {
  if (miniResults[cellIdx] !== null) return null;
  if (isBoardFull(cells, cellIdx)) return null;
  return cellIdx;
};

/** Heuristic evaluation of a single unresolved mini-board for a given player. */
const evaluateOpenBoard = (smallBoard: Cell[], player: Player): number => {
  let score = 0;
  for (const line of WIN_LINES) {
    const [a, b, c] = line;
    const vals = [smallBoard[a], smallBoard[b], smallBoard[c]];
    const pCount = vals.filter((v) => v === player).length;
    const eCount = vals.filter((v) => v === null).length;
    const oppCount = vals.filter((v) => v !== null && v !== player).length;

    if (oppCount === 0) {
      // line is still alive for `player`
      if (pCount === 3) score += 100;
      else if (pCount === 2 && eCount === 1) score += 10;
      else if (pCount === 1 && eCount === 2) score += 1;
    } else {
      // line is partially blocked
      if (pCount === 2 && oppCount === 1) score += 3; // already blocked, low value
    }
  }
  return score;
};

/** Heuristic evaluation of the overall position (from Bot's "O" perspective). */
const evaluatePosition = (cells: Cell[], miniResults: MiniResult[]): number => {
  // Terminal checks
  const bigResult = checkWin(miniResults);
  if (bigResult.winner === "O") return 100_000;
  if (bigResult.winner === "X") return -100_000;
  if (miniResults.every((r) => r !== null)) return 0; // full draw

  let score = 0;

  // 1. Resolved mini-boards
  for (let i = 0; i < 9; i++) {
    const w = BOARD_WEIGHTS[i];
    if (miniResults[i] === "O") score += 1000 * w;
    else if (miniResults[i] === "X") score -= 1000 * w;
    else if (miniResults[i] === "draw") score += 5 * w;
  }

  // 2. Open mini-boards — evaluate potential
  for (let i = 0; i < 9; i++) {
    if (miniResults[i] !== null) continue;
    const w = BOARD_WEIGHTS[i];
    const small = getSmallBoardCells(cells, i);
    score += evaluateOpenBoard(small, "O") * w;
    score -= evaluateOpenBoard(small, "X") * w;
  }

  // 3. Big-board line potential
  for (const line of WIN_LINES) {
    const vals = line.map((i) => miniResults[i]);
    const oWon = vals.filter((v) => v === "O").length;
    const xWon = vals.filter((v) => v === "X").length;
    const nulls = vals.filter((v) => v === null).length;
    const draws = vals.filter((v) => v === "draw").length;

    if (oWon === 2 && draws === 1) score += 200; // X can't block anymore
    if (xWon === 2 && draws === 1) score -= 200;
    if (xWon === 0) score += nulls * 15; // line still open for O
    if (oWon === 0) score -= nulls * 15;
  }

  return score;
};

/**
 * Minimax with alpha-beta pruning.
 * `maximizing = true` → it's Bot's turn (O).
 */
const minimaxMove = (
  cells: Cell[],
  miniResults: MiniResult[],
  targetBoard: number | null,
  depth: number,
  alpha: number,
  beta: number,
  maximizing: boolean
): number => {
  const moves = getValidMoves(cells, miniResults, targetBoard);

  if (moves.length === 0 || depth <= 0) {
    return evaluatePosition(cells, miniResults);
  }

  const mark: Player = maximizing ? "O" : "X";

  if (maximizing) {
    let best = -Infinity;
    for (const move of moves) {
      const nc = [...cells];
      const nm = [...miniResults];
      nc[move.boardIdx * 9 + move.cellIdx] = mark;

      // resolve mini-board
      const sb = getSmallBoardCells(nc, move.boardIdx);
      const sr = checkWin(sb);
      if (sr.winner) nm[move.boardIdx] = sr.winner;
      else if (isBoardFull(nc, move.boardIdx)) nm[move.boardIdx] = "draw";

      // resolve big board
      const br = checkWin(nm);
      if (br.winner === "O") return 100_000 + depth;
      if (br.winner === "X") return -100_000 - depth;
      if (nm.every((r) => r !== null)) return 0;

      const nt = getNextTarget(nm, nc, move.cellIdx);
      const val = minimaxMove(nc, nm, nt, depth - 1, alpha, beta, false);
      best = Math.max(best, val);
      alpha = Math.max(alpha, val);
      if (beta <= alpha) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const move of moves) {
      const nc = [...cells];
      const nm = [...miniResults];
      nc[move.boardIdx * 9 + move.cellIdx] = mark;

      const sb = getSmallBoardCells(nc, move.boardIdx);
      const sr = checkWin(sb);
      if (sr.winner) nm[move.boardIdx] = sr.winner;
      else if (isBoardFull(nc, move.boardIdx)) nm[move.boardIdx] = "draw";

      const br = checkWin(nm);
      if (br.winner === "O") return 100_000 + depth;
      if (br.winner === "X") return -100_000 - depth;
      if (nm.every((r) => r !== null)) return 0;

      const nt = getNextTarget(nm, nc, move.cellIdx);
      const val = minimaxMove(nc, nm, nt, depth - 1, alpha, beta, true);
      best = Math.min(best, val);
      beta = Math.min(beta, val);
      if (beta <= alpha) break;
    }
    return best;
  }
};

/** Top-level entry: pick the best move for the Bot according to difficulty. */
const getBotMove = (
  cells: Cell[],
  miniResults: MiniResult[],
  targetBoard: number | null,
  difficulty: Difficulty
): AIMove | null => {
  const moves = getValidMoves(cells, miniResults, targetBoard);
  if (moves.length === 0) return null;
  if (moves.length === 1) return moves[0];

  const cfg = DIFFICULTY_CONFIG[difficulty];

  // Random move based on difficulty
  if (Math.random() < cfg.randomChance) {
    return moves[Math.floor(Math.random() * moves.length)];
  }

  let bestMove = moves[0];
  let bestScore = -Infinity;

  for (const move of moves) {
    const nc = [...cells];
    const nm = [...miniResults];
    nc[move.boardIdx * 9 + move.cellIdx] = "O";

    const sb = getSmallBoardCells(nc, move.boardIdx);
    const sr = checkWin(sb);
    if (sr.winner) nm[move.boardIdx] = sr.winner;
    else if (isBoardFull(nc, move.boardIdx)) nm[move.boardIdx] = "draw";

    // Immediate big-board win → take it
    const br = checkWin(nm);
    if (br.winner === "O") return move;

    const nt = getNextTarget(nm, nc, move.cellIdx);
    const score = minimaxMove(nc, nm, nt, cfg.depth - 1, -Infinity, Infinity, false);

    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }

  return bestMove;
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

const TicTacToePro = ({ onScore, liveCode }: Props) => {
  /* ---- State ---- */
  const [gameMode, setGameMode] = useState<GameMode>("menu");
  const [selectedMode, setSelectedMode] = useState<"pvp" | "bot">("pvp");
  const [difficulty, setDifficulty] = useState<Difficulty>("medio");
  const [isBotThinking, setIsBotThinking] = useState(false);

  const [cells, setCells] = useState<Cell[]>(createEmptyCells);
  const [miniResults, setMiniResults] = useState<MiniResult[]>(createEmptyMiniResults);
  const [currentPlayer, setCurrentPlayer] = useState<Player>("X");
  const [targetBoard, setTargetBoard] = useState<number | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [bigWinner, setBigWinner] = useState<Player | null>(null);
  const [bigWinLine, setBigWinLine] = useState<number[] | null>(null);
  const [isDraw, setIsDraw] = useState(false);
  const [scores, setScores] = useState({ x: 0, o: 0 });
  const [round, setRound] = useState(1);
  const [lastMiniWinBoard, setLastMiniWinBoard] = useState<number | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [moveCount, setMoveCount] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);

  const startTimeRef = useRef<number>(Date.now());

  /* ---- Derived player name ---- */
  const getPlayerName = useCallback(
    (p: Player): string => {
      if (gameMode === "bot" && p === "O") return "Bot";
      return playerNameBase(p);
    },
    [gameMode]
  );

  /* ---- Helpers ---- */
  const isValidTarget = useCallback(
    (boardIdx: number): boolean => {
      if (miniResults[boardIdx] !== null) return false;
      return !isBoardFull(cells, boardIdx);
    },
    [cells, miniResults]
  );

  const canPlayCell = useCallback(
    (boardIdx: number, cellIdx: number): boolean => {
      if (gameOver) return false;
      if (gameMode === "bot" && currentPlayer === "O") return false; // block during bot turn
      const globalIdx = boardIdx * 9 + cellIdx;
      if (cells[globalIdx] !== null) return false;
      if (miniResults[boardIdx] !== null) return false;
      if (targetBoard !== null && targetBoard !== boardIdx) return false;
      return true;
    },
    [cells, gameOver, miniResults, targetBoard, gameMode, currentPlayer]
  );

  const activeTarget = useMemo(() => {
    if (targetBoard !== null && isValidTarget(targetBoard)) return targetBoard;
    return null;
  }, [isValidTarget, targetBoard]);

  /* ---- Core play logic ---- */
  const playCell = useCallback(
    (boardIdx: number, cellIdx: number) => {
      if (gameOver) return;
      const globalIdx = boardIdx * 9 + cellIdx;
      if (cells[globalIdx] !== null) return;
      if (miniResults[boardIdx] !== null) return;
      if (targetBoard !== null && targetBoard !== boardIdx) return;
      if (gameMode === "bot" && currentPlayer === "O") return;

      const newCells = [...cells];
      newCells[globalIdx] = currentPlayer;
      setCells(newCells);
      const newMoveCount = moveCount + 1;
      setMoveCount(newMoveCount);

      const smallBoard = getSmallBoardCells(newCells, boardIdx);
      const smallResult = checkWin(smallBoard);

      const newMiniResults = [...miniResults];

      if (smallResult.winner) {
        newMiniResults[boardIdx] = smallResult.winner;
        setMiniResults(newMiniResults);
        setLastMiniWinBoard(boardIdx);

        const bigResult = checkWin(newMiniResults);
        if (bigResult.winner) {
          setGameOver(true);
          setBigWinner(bigResult.winner);
          setBigWinLine(bigResult.line);
          const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
          const timeBonus = Math.max(0, 50 - elapsed);
          const moveBonus = Math.max(0, 200 - newMoveCount * 2);
          const winScore = 100 + timeBonus + moveBonus;
          const winnerName =
            gameMode === "bot" && bigResult.winner === "O"
              ? "Bot"
              : playerNameBase(bigResult.winner);
          onScore?.(winnerName, winScore);
          setScores((s) =>
            bigResult.winner === "X"
              ? { ...s, x: s.x + winScore }
              : { ...s, o: s.o + winScore }
          );
          return;
        }

        const allDone = newMiniResults.every((r) => r !== null);
        if (allDone) {
          setGameOver(true);
          setIsDraw(true);
          return;
        }
      } else if (isBoardFull(newCells, boardIdx)) {
        newMiniResults[boardIdx] = "draw";
        setMiniResults(newMiniResults);
        setLastMiniWinBoard(null);

        const allDone = newMiniResults.every((r) => r !== null);
        if (allDone) {
          setGameOver(true);
          setIsDraw(true);
          return;
        }
      } else {
        setLastMiniWinBoard(null);
      }

      const nextTarget = cellIdx;
      if (newMiniResults[nextTarget] !== null || isBoardFull(newCells, nextTarget)) {
        setTargetBoard(null);
      } else {
        setTargetBoard(nextTarget);
      }

      setCurrentPlayer(currentPlayer === "X" ? "O" : "X");
    },
    [canPlayCell, cells, currentPlayer, miniResults, moveCount, onScore, gameOver, targetBoard, gameMode]
  );

  /* ---- Elapsed time timer ---- */
  useEffect(() => {
    if (gameOver || gameMode === "menu") {
      return;
    }
    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [gameOver, gameMode]);

  /* ---- Computed stats ---- */
  const boardsWonX = useMemo(() => miniResults.filter((r) => r === "X").length, [miniResults]);
  const boardsWonO = useMemo(() => miniResults.filter((r) => r === "O").length, [miniResults]);
  const boardsDrawn = useMemo(() => miniResults.filter((r) => r === "draw").length, [miniResults]);

  /* ---- Bot AI effect ---- */
  useEffect(() => {
    if (gameMode !== "bot" || currentPlayer !== "O" || gameOver) {
      setIsBotThinking(false);
      return;
    }

    setIsBotThinking(true);
    const timer = setTimeout(() => {
      const move = getBotMove(cells, miniResults, targetBoard, difficulty);
      if (move) {
        playCell(move.boardIdx, move.cellIdx);
      }
      setIsBotThinking(false);
    }, 450);

    return () => {
      clearTimeout(timer);
      setIsBotThinking(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameMode, currentPlayer, gameOver, cells, miniResults, targetBoard, difficulty]);

  /* ---- Reset helpers ---- */
  const initGame = useCallback(() => {
    setCells(createEmptyCells());
    setMiniResults(createEmptyMiniResults());
    setCurrentPlayer("X");
    setTargetBoard(null);
    setGameOver(false);
    setBigWinner(null);
    setBigWinLine(null);
    setIsDraw(false);
    setLastMiniWinBoard(null);
    setMoveCount(0);
    setElapsedTime(0);
    setIsBotThinking(false);
    startTimeRef.current = Date.now();
  }, []);

  const startGame = useCallback(
    (mode: "pvp" | "bot") => {
      setGameMode(mode);
      setScores({ x: 0, o: 0 });
      setRound(1);
      initGame();
    },
    [initGame]
  );

  const reset = useCallback(() => {
    initGame();
    if (gameMode === "pvp") {
      setCurrentPlayer(round % 2 === 0 ? "O" : "X");
    }
    // In bot mode, human (X) always starts
    setRound((r) => r + 1);
  }, [initGame, gameMode, round]);

  const fullReset = useCallback(() => {
    setScores({ x: 0, o: 0 });
    setRound(1);
    initGame();
  }, [initGame]);

  const goToMenu = useCallback(() => {
    setGameMode("menu");
  }, []);

  /* ---- Turn indicator text ---- */
  const turnText = useMemo(() => {
    if (gameOver) return "";
    if (gameMode === "bot" && currentPlayer === "O") {
      return isBotThinking ? "está a pensar…" : "Vez do Bot";
    }
    if (activeTarget !== null) {
      return `— Tabuleiro ${BOARD_NAMES[activeTarget]}`;
    }
    return "— Jogue em qualquer tabuleiro";
  }, [activeTarget, currentPlayer, gameOver, gameMode, isBotThinking]);

  /* ================================================================ */
  /*  START SCREEN                                                      */
  /* ================================================================ */
  if (gameMode === "menu") {
    return (
      <div className="flex flex-col items-center gap-5 p-4">
        <div className="text-center space-y-2">
          <Badge className="bg-gradient-to-r from-cyan-500/20 to-pink-500/20 text-white border-cyan-500/30 text-xs px-3 py-1">
            <Grid3X3 className="h-4 w-4 mr-1.5" />
            GALO PRO
          </Badge>
          <h2 className="text-xl sm:text-2xl font-black text-white">
            Jogo da Velha Ultimate
          </h2>
          <p className="text-xs text-slate-400">
            9 tabuleiros · 1 campeonato
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 w-full max-w-xs">
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => setSelectedMode("pvp")}
            className={cn(
              "p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all duration-200",
              selectedMode === "pvp"
                ? "border-cyan-500 bg-cyan-500/10 shadow-lg shadow-cyan-500/10"
                : "border-slate-700 bg-slate-800/50 hover:border-slate-600"
            )}
          >
            <Users
              className={cn(
                "h-7 w-7",
                selectedMode === "pvp" ? "text-cyan-400" : "text-slate-500"
              )}
            />
            <span
              className={cn(
                "text-sm font-bold",
                selectedMode === "pvp" ? "text-cyan-400" : "text-slate-400"
              )}
            >
              vs Jogador
            </span>
            <span className="text-[10px] text-slate-500">Dois jogadores</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => setSelectedMode("bot")}
            className={cn(
              "p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all duration-200",
              selectedMode === "bot"
                ? "border-pink-500 bg-pink-500/10 shadow-lg shadow-pink-500/10"
                : "border-slate-700 bg-slate-800/50 hover:border-slate-600"
            )}
          >
            <Bot
              className={cn(
                "h-7 w-7",
                selectedMode === "bot" ? "text-pink-400" : "text-slate-500"
              )}
            />
            <span
              className={cn(
                "text-sm font-bold",
                selectedMode === "bot" ? "text-pink-400" : "text-slate-400"
              )}
            >
              vs Computador
            </span>
            <span className="text-[10px] text-slate-500">Joga contra o Bot</span>
          </motion.button>
        </div>

        <AnimatePresence>
          {selectedMode === "bot" && (
            <motion.div
              key="difficulty"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden w-full max-w-xs"
            >
              <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider text-center mb-2">
                Dificuldade
              </p>
              <div className="grid grid-cols-3 gap-2">
                {(["facil", "medio", "dificil"]).map((d) => {
                  const cfg = DIFFICULTY_CONFIG[d];
                  const active = difficulty === d;
                  return (
                    <motion.button
                      key={d}
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => setDifficulty(d as any)}
                      className={cn(
                        "rounded-xl border-2 py-2.5 px-2 flex flex-col items-center gap-1 transition-all duration-200",
                        active
                          ? d === "facil"
                            ? "border-green-500 bg-green-500/10"
                            : d === "medio"
                              ? "border-yellow-500 bg-yellow-500/10"
                              : "border-red-500 bg-red-500/10"
                          : "border-slate-700 bg-slate-800/40"
                      )}
                    >
                      <span
                        className={cn(
                          "text-xs font-bold",
                          active
                            ? d === "facil"
                              ? "text-green-400"
                              : d === "medio"
                                ? "text-yellow-400"
                                : "text-red-400"
                            : "text-slate-400"
                        )}
                      >
                        {cfg.label}
                      </span>
                      <span className="text-[9px] text-slate-500 leading-tight text-center">
                        {cfg.desc}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="w-full max-w-xs">
          <Button
            onClick={() => startGame(selectedMode)}
            className={cn(
              "w-full rounded-2xl font-bold text-sm py-5 shadow-lg transition-all",
              selectedMode === "pvp"
                ? "bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white shadow-cyan-500/20"
                : "bg-gradient-to-r from-pink-600 to-pink-500 hover:from-pink-500 hover:to-pink-400 text-white shadow-pink-500/20"
            )}
          >
            <Grid3X3 className="h-4 w-4 mr-2" />
            JOGAR
          </Button>
        </motion.div>
      </div>
    );
  }

  /* ================================================================ */
  /*  GAME SCREEN                                                       */
  /* ================================================================ */
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-cyan-900/30 to-pink-900/30 border border-cyan-500/20">
        <div className="text-center flex-1">
          <div
            className={cn(
              "inline-flex transition-all duration-300",
              currentPlayer === "X" && !gameOver && "drop-shadow-[0_0_6px_rgba(34,211,238,0.5)]"
            )}
          >
            <XMarkSvg
              size={26}
              color={currentPlayer === "X" && !gameOver ? "#22d3ee" : "#64748b"}
            />
          </div>
          <p className="text-xs font-bold text-white">
            {gameMode === "bot" ? "Jogador" : "Jogador 1"}
          </p>
          <p className="text-lg font-black text-white">{scores.x}</p>
        </div>

        <div className="text-center px-3">
          <Badge className="bg-gradient-to-r from-cyan-500/20 to-pink-500/20 text-white border-cyan-500/30 text-[10px] sm:text-xs">
            <Grid3X3 className="h-3 w-3 mr-1" />
            GALO PRO
            {gameMode === "bot" && (
              <Bot className="h-3 w-3 ml-1 text-pink-400" />
            )}
          </Badge>
          <p className="text-[10px] text-slate-500 mt-1">Round {round}</p>
          <div className="flex items-center justify-center gap-2 mt-0.5">
            <div className="flex items-center gap-0.5">
              <Clock className="h-2.5 w-2.5 text-slate-500" />
              <span className="text-[10px] text-slate-500">{moveCount}</span>
            </div>
            <div className="flex items-center gap-0.5">
              <Timer className="h-2.5 w-2.5 text-slate-500" />
              <span className="text-[10px] text-slate-500">{formatTime(elapsedTime)}</span>
            </div>
          </div>
        </div>

        <div className="text-center flex-1">
          <div
            className={cn(
              "inline-flex transition-all duration-300",
              currentPlayer === "O" && !gameOver && "drop-shadow-[0_0_6px_rgba(244,114,182,0.5)]"
            )}
          >
            <OMarkSvg
              size={26}
              color={currentPlayer === "O" && !gameOver ? "#f472b6" : "#64748b"}
            />
          </div>
          <div className="flex items-center justify-center gap-1">
            <p className="text-xs font-bold text-white">
              {gameMode === "bot" ? "Bot" : "Jogador 2"}
            </p>
            {gameMode === "bot" && (
              <Bot className="h-3.5 w-3.5 text-pink-400" />
            )}
          </div>
          <p className="text-lg font-black text-white">{scores.o}</p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {!gameOver && (
          <motion.div
            key={`${currentPlayer}-${activeTarget ?? "any"}-${isBotThinking}`}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2 }}
            className="relative text-center py-2 px-4 rounded-xl border overflow-hidden"
            style={{
              background: currentPlayer === "X"
                ? "linear-gradient(135deg, rgba(8,145,178,0.12), rgba(15,23,42,0.6))"
                : "linear-gradient(135deg, rgba(190,18,60,0.12), rgba(15,23,42,0.6))",
              borderColor: currentPlayer === "X" ? "rgba(34,211,238,0.25)" : "rgba(244,114,182,0.25)",
            }}
          >
            <motion.div
              className="absolute inset-0 pointer-events-none"
              animate={{
                background: currentPlayer === "X"
                  ? "radial-gradient(ellipse at center, rgba(34,211,238,0.08) 0%, transparent 70%)"
                  : "radial-gradient(ellipse at center, rgba(244,114,182,0.08) 0%, transparent 70%)",
              }}
              transition={{ duration: 0.4 }}
            />
            <div className="relative flex items-center justify-center gap-2">
              <motion.div
                className="flex-shrink-0"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
              >
                {currentPlayer === "X"
                  ? <XMarkSvg size={18} color="#22d3ee" />
                  : <OMarkSvg size={18} color="#f472b6" />
                }
              </motion.div>
              <p className="text-xs font-medium">
                <span className={cn("font-bold", playerColor(currentPlayer))}>
                  {getPlayerName(currentPlayer)}
                </span>
                <span className={cn("ml-1 text-slate-400", playerColor(currentPlayer))}>
                  {turnText}
                </span>
              </p>
              {isBotThinking && (
                <motion.div
                  className="flex gap-0.5"
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ repeat: Infinity, duration: 1.2 }}
                >
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="w-1 h-1 rounded-full bg-pink-400"
                      animate={{ y: [0, -3, 0] }}
                      transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.15 }}
                    />
                  ))}
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex justify-center">
        <div
          className={cn(
            "relative grid grid-cols-3 gap-1.5 sm:gap-2 p-2 sm:p-3 rounded-2xl border transition-all duration-500",
            "bg-slate-900/70 border-slate-700/50",
            gameOver && bigWinLine
              ? "shadow-[0_0_30px_rgba(250,204,21,0.15),0_0_60px_rgba(250,204,21,0.05)] border-yellow-500/30"
              : gameOver && isDraw
                ? "shadow-[0_0_20px_rgba(100,116,139,0.15)]"
                : activeTarget !== null
                  ? currentPlayer === "X"
                    ? "shadow-[0_0_25px_rgba(34,211,238,0.08)] border-cyan-500/20"
                    : "shadow-[0_0_25px_rgba(244,114,182,0.08)] border-pink-500/20"
                  : "shadow-[0_0_15px_rgba(15,23,42,0.3)]"
          )}
        >
          {bigWinLine && (
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-20" viewBox="0 0 100 100" preserveAspectRatio="none">
              <defs>
                <linearGradient id="winLineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#facc15" stopOpacity="0.9" />
                  <stop offset="50%" stopColor="#fde68a" stopOpacity="1" />
                  <stop offset="100%" stopColor="#facc15" stopOpacity="0.9" />
                </linearGradient>
                <filter id="winGlow">
                  <feGaussianBlur stdDeviation="1.5" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              {(() => {
                const start = boardToPercent(bigWinLine[0]);
                const end = boardToPercent(bigWinLine[2]);
                return (
                  <motion.line
                    x1={start.x} y1={start.y}
                    initial={{ x2: start.x, y2: start.y, opacity: 0 }}
                    animate={{ x2: end.x, y2: end.y, opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.15, ease: "easeOut" }}
                    stroke="url(#winLineGrad)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    filter="url(#winGlow)"
                  />
                );
              })()}
            </svg>
          )}
          {([0, 1, 2, 3, 4, 5, 6, 7, 8]).map((boardIdx) => {
            const miniResult = miniResults[boardIdx];
            const isActiveTarget = activeTarget === boardIdx;
            const isLastWin = lastMiniWinBoard === boardIdx;
            const boardIsFull = isBoardFull(cells, boardIdx);
            const boardIsDraw = miniResult === "draw";
            const boardIsWon =
              miniResult === "X" || miniResult === "O";

            return (
              <motion.div
                key={boardIdx}
                initial={false}
                animate={
                  isLastWin && boardIsWon
                    ? {
                        scale: [1, 1.06, 1],
                        transition: { duration: 0.4 },
                      }
                    : {}
                }
                className={cn(
                  "relative rounded-xl p-1 sm:p-1.5 transition-all duration-300",
                  miniResult === null &&
                    !boardIsFull &&
                    "bg-slate-900/50 border border-slate-700",
                  miniResult === null &&
                    boardIsFull &&
                    "bg-slate-900/30 border border-slate-800 opacity-40",
                  boardIsDraw &&
                    "bg-slate-900/30 border border-slate-800 opacity-40",
                  miniResult === "X" &&
                    "bg-cyan-500/10 border border-cyan-500/30",
                  miniResult === "O" &&
                    "bg-pink-500/10 border border-pink-500/30",
                  isActiveTarget &&
                    miniResult === null &&
                    currentPlayer === "X" &&
                    "ring-2 ring-cyan-400/60 ring-offset-1 ring-offset-slate-950 shadow-[0_0_12px_rgba(34,211,238,0.15)]",
                  isActiveTarget &&
                    miniResult === null &&
                    currentPlayer === "O" &&
                    "ring-2 ring-pink-400/60 ring-offset-1 ring-offset-slate-950 shadow-[0_0_12px_rgba(244,114,182,0.15)]",
                  bigWinLine?.includes(boardIdx) &&
                    boardIsWon &&
                    "ring-2 ring-yellow-400 shadow-[0_0_16px_rgba(250,204,21,0.3)]"
                )}
              >
                {boardIsWon && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.4 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: "spring", stiffness: 350, damping: 22 }}
                    className="absolute inset-0 flex items-center justify-center z-10 rounded-lg"
                    style={{
                      background: miniResult === "X"
                        ? "radial-gradient(circle, rgba(34,211,238,0.1) 0%, transparent 70%)"
                        : "radial-gradient(circle, rgba(244,114,182,0.1) 0%, transparent 70%)",
                    }}
                  >
                    <MiniMarkSvg player={miniResult as Player} size={30} />
                  </motion.div>
                )}

                {boardIsDraw && (
                  <div className="absolute inset-0 flex items-center justify-center z-10 rounded-lg">
                    <span className="text-lg text-slate-600 font-bold">—</span>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-px sm:gap-0.5">
                  {([0, 1, 2, 3, 4, 5, 6, 7, 8]).map((cellIdx) => {
                    const globalIdx = boardIdx * 9 + cellIdx;
                    const cellValue = cells[globalIdx];
                    const isValid = canPlayCell(boardIdx, cellIdx);
                    const isInTargetBoard = activeTarget === boardIdx;
                    const cellSize = 14;

                    let cellClasses = "w-7 h-7 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-md flex items-center justify-center text-xs sm:text-sm md:text-base font-black transition-all border relative ";

                    if (cellValue === "X") {
                      cellClasses += "bg-cyan-500/10 border-cyan-500/20 text-cyan-400 ";
                    } else if (cellValue === "O") {
                      cellClasses += "bg-pink-500/10 border-pink-500/20 text-pink-400 ";
                    } else if (isValid && isInTargetBoard) {
                      cellClasses += "bg-slate-800/60 cursor-pointer hover:bg-slate-700/60 ";
                      cellClasses += playerBorderHighlight(currentPlayer) + " ";
                    } else if (isValid) {
                      cellClasses += "bg-slate-800/60 cursor-pointer hover:bg-slate-700/60 border-slate-700/50 ";
                    } else {
                      cellClasses += "bg-slate-800/30 border-slate-700/30 cursor-default ";
                    }

                    if (miniResult !== null) {
                      cellClasses += "opacity-20 pointer-events-none ";
                    }

                    return (
                      <motion.button
                        key={cellIdx}
                        onClick={() => playCell(boardIdx, cellIdx)}
                        disabled={!isValid}
                        whileHover={
                          isValid
                            ? {
                                scale: 1.08,
                                backgroundColor: "rgba(100,116,139,0.25)",
                              }
                            : {}
                        }
                        whileTap={isValid ? { scale: 0.9 } : {}}
                        className={cn(cellClasses)}
                      >
                        {cellValue && (
                          <motion.div
                            initial={{ scale: 0.2, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{
                              type: "spring",
                              stiffness: 500,
                              damping: 18,
                            }}
                          >
                            {cellValue === "X"
                              ? <XMarkSvg size={cellSize} color="#22d3ee" />
                              : <OMarkSvg size={cellSize} color="#f472b6" />
                            }
                          </motion.div>
                        )}

                        {isValid && !cellValue && isInTargetBoard && (
                          <motion.div
                            className="absolute inset-0 rounded-md pointer-events-none"
                            animate={{ opacity: [0.5, 1, 0.5] }}
                            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                            style={{
                              boxShadow: `inset 0 0 10px ${playerGlowColor(currentPlayer)}, 0 0 4px ${playerGlowColor(currentPlayer)}`,
                            }}
                          />
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-center gap-2">
        <Button
          size="sm"
          variant="outline"
          className="rounded-xl text-xs gap-1"
          onClick={() => setShowHelp((h) => !h)}
        >
          <HelpCircle className="h-3.5 w-3.5" />
          {showHelp ? "Ocultar" : "Regras"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="rounded-xl text-xs gap-1"
          onClick={gameOver ? fullReset : reset}
        >
          <RotateCcw className="h-3.5 w-3.5" />
          {gameOver ? "Reiniciar Tudo" : "Novo Round"}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="rounded-xl text-xs gap-1 text-slate-500 hover:text-slate-300"
          onClick={goToMenu}
        >
          ← Menu
        </Button>
      </div>

      <AnimatePresence>
        {showHelp && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/50 text-xs text-slate-400 space-y-1.5">
              <p className="font-bold text-slate-300 text-sm">
                <Grid3X3 className="h-3.5 w-3.5 inline mr-1" />
                Como funciona o Galo PRO
              </p>
              <p>
                • Há{" "}
                <span className="text-white font-medium">
                  9 tabuleiros pequenos
                </span>{" "}
                dispostos num tabuleiro 3×3.
              </p>
              <p>
                • Quando joga numa célula de um tabuleiro pequeno, o seu
                oponente{" "}
                <span className="text-white font-medium">
                  deve jogar no tabuleiro correspondente
                </span>{" "}
                à posição dessa célula.
              </p>
              <p>
                • Exemplo: se jogar na célula superior direita, o oponente
                joga no tabuleiro superior direito.
              </p>
              <p>
                • Se o tabuleiro destino já estiver ganho ou cheio, o oponente{" "}
                <span className="text-white font-medium">
                  pode jogar em qualquer
                </span>{" "}
                tabuleiro.
              </p>
              <p>
                • Ganhar um tabuleiro pequeno conquista essa posição no
                tabuleiro grande. Ganhe{" "}
                <span className="text-white font-medium">
                  3 tabuleiros em linha
                </span>{" "}
                para vencer!
              </p>
              <p>
                • Vencedor:{" "}
                <span className="text-cyan-400 font-medium">
                  100 pontos
                </span>{" "}
                + bónus de tempo e eficiência.
              </p>
              {gameMode === "bot" && (
                <>
                  <p className="font-bold text-slate-300 text-sm mt-2">
                    <Bot className="h-3.5 w-3.5 inline mr-1" />
                    Modo vs Computador
                  </p>
                  <p>
                    • Você joga como <span className="text-cyan-400 font-medium">✕</span>, o Bot
                    joga como <span className="text-pink-400 font-medium">○</span>.
                  </p>
                  <p>
                    • Dificuldade:{" "}
                    <span className="text-white font-medium">
                      {DIFFICULTY_CONFIG[difficulty].label}
                    </span>{" "}
                    — {DIFFICULTY_CONFIG[difficulty].desc}.
                  </p>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {gameOver && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="text-center space-y-3 py-3"
          >
            <motion.div
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 15 }}
            >
              {isDraw ? (
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-slate-800/80 border border-slate-700">
                  <Users className="h-7 w-7 text-slate-400" />
                </div>
              ) : (
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-yellow-500/10 border border-yellow-500/30 shadow-[0_0_20px_rgba(250,204,21,0.2)]">
                  <Trophy className="h-7 w-7 text-yellow-400" />
                </div>
              )}
            </motion.div>

            {bigWinner && (
              <motion.h3
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.15 }}
                className={cn("text-lg font-black", playerColor(bigWinner))}
              >
                {getPlayerName(bigWinner)} Venceu o jogo!
              </motion.h3>
            )}
            {isDraw && (
              <motion.h3
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.15 }}
                className="text-lg font-black text-slate-400"
              >
                Empate!
              </motion.h3>
            )}

            {/* Stats panel */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.3 }}
              className="grid grid-cols-4 gap-1.5 max-w-xs mx-auto"
            >
              <div className="rounded-lg bg-slate-800/60 border border-slate-700/50 p-2 text-center">
                <Timer className="h-3.5 w-3.5 text-slate-500 mx-auto mb-0.5" />
                <p className="text-xs font-bold text-white">{formatTime(elapsedTime)}</p>
                <p className="text-[9px] text-slate-500">Tempo</p>
              </div>
              <div className="rounded-lg bg-slate-800/60 border border-slate-700/50 p-2 text-center">
                <Target className="h-3.5 w-3.5 text-slate-500 mx-auto mb-0.5" />
                <p className="text-xs font-bold text-white">{moveCount}</p>
                <p className="text-[9px] text-slate-500">Jogadas</p>
              </div>
              <div className="rounded-lg bg-cyan-500/5 border border-cyan-500/20 p-2 text-center">
                <XMarkSvg size={14} color="#22d3ee" />
                <p className="text-xs font-bold text-cyan-400 mt-0.5">{boardsWonX}</p>
                <p className="text-[9px] text-slate-500">Tab. X</p>
              </div>
              <div className="rounded-lg bg-pink-500/5 border border-pink-500/20 p-2 text-center">
                <OMarkSvg size={14} color="#f472b6" />
                <p className="text-xs font-bold text-pink-400 mt-0.5">{boardsWonO}</p>
                <p className="text-[9px] text-slate-500">Tab. O</p>
              </div>
            </motion.div>

            {/* Score breakdown */}
            {bigWinner && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="flex items-center justify-center gap-1.5 text-xs text-slate-500"
              >
                <Zap className="h-3 w-3 text-yellow-400" />
                <span>
                  100 base
                  {elapsedTime < 50 && <span className="text-green-400"> +{50 - elapsedTime} tempo</span>}
                  {moveCount < 50 && <span className="text-green-400"> +{Math.max(0, 200 - moveCount * 2)} eficiencia</span>}
                </span>
              </motion.div>
            )}

            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.25 }}
              className="flex gap-2 justify-center pt-1"
            >
              <Button
                onClick={reset}
                className="bg-gradient-to-r from-cyan-500 to-pink-500 text-white rounded-xl text-xs shadow-lg shadow-pink-500/10"
              >
                Próximo Round
              </Button>
              <Button
                onClick={fullReset}
                variant="outline"
                className="rounded-xl text-xs"
              >
                Reiniciar Tudo
              </Button>
              <Button
                onClick={goToMenu}
                variant="ghost"
                className="rounded-xl text-xs text-slate-500 hover:text-slate-300"
              >
                Menu
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TicTacToePro;
