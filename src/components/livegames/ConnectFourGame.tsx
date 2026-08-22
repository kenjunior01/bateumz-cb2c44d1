import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RotateCcw, Coins, Bot, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  onScore?: (name: string, score: number) => void;
  liveCode?: string;
}

type GameMode = "pvp" | "bot";
type Difficulty = "easy" | "medium" | "hard";

const ROWS = 6;
const COLS = 7;
type Board = (0 | 1 | 2)[][];

// ─── Minimax AI with Alpha-Beta Pruning ──────────────────────────
const WIN_SCORE = 100000;

const getValidCols = (b: Board): number[] => {
  const cols: number[] = [];
  for (let c = 0; c < COLS; c++) {
    if (b[0][c] === 0) cols.push(c);
  }
  return cols;
};

const simulateDrop = (b: Board, col: number, player: 1 | 2): [Board, number] | null => {
  const row = b.findIndex(r => r[col] === 0);
  if (row === -1) return null;
  const nb = b.map(r => [...r]) as Board;
  nb[row][col] = player;
  return [nb, row];
};

const checkWinSimple = (b: Board, player: 1 | 2): boolean => {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (b[r][c] !== player) continue;
      const dirs = [[0,1],[1,0],[1,1],[1,-1]];
      for (const [dr, dc] of dirs) {
        let count = 1;
        for (let i = 1; i < 4; i++) {
          const nr = r + dr * i, nc = c + dc * i;
          if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && b[nr][nc] === player) count++;
          else break;
        }
        if (count >= 4) return true;
      }
    }
  }
  return false;
};

const evaluateWindow = (w: number[], player: 1 | 2): number => {
  const opp = player === 1 ? 2 : 1;
  const pCount = w.filter(c => c === player).length;
  const oCount = w.filter(c => c === opp).length;
  const eCount = w.filter(c => c === 0).length;
  if (pCount === 4) return 100;
  if (pCount === 3 && eCount === 1) return 5;
  if (pCount === 2 && eCount === 2) return 2;
  if (oCount === 3 && eCount === 1) return -4;
  return 0;
};

const evaluateBoard = (b: Board, player: 1 | 2): number => {
  let score = 0;
  const centerCol = Math.floor(COLS / 2);
  const centerCount = b.filter(row => row[centerCol] === player).length;
  score += centerCount * 3;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c <= COLS - 4; c++) {
      score += evaluateWindow([b[r][c], b[r][c+1], b[r][c+2], b[r][c+3]], player);
    }
  }
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r <= ROWS - 4; r++) {
      score += evaluateWindow([b[r][c], b[r+1][c], b[r+2][c], b[r+3][c]], player);
    }
  }
  for (let r = 3; r < ROWS; r++) {
    for (let c = 0; c <= COLS - 4; c++) {
      score += evaluateWindow([b[r][c], b[r-1][c+1], b[r-2][c+2], b[r-3][c+3]], player);
    }
  }
  for (let r = 0; r <= ROWS - 4; r++) {
    for (let c = 0; c <= COLS - 4; c++) {
      score += evaluateWindow([b[r][c], b[r+1][c+1], b[r+2][c+2], b[r+3][c+3]], player);
    }
  }
  return score;
};

const isTerminal = (b: Board): boolean => {
  return checkWinSimple(b, 1) || checkWinSimple(b, 2) || getValidCols(b).length === 0;
};

const minimax = (
  b: Board, depth: number, alpha: number, beta: number, maximizing: boolean, aiPlayer: 1 | 2
): [number, number] => {
  const opp: 1 | 2 = aiPlayer === 1 ? 2 : 1;
  if (depth === 0 || isTerminal(b)) {
    if (checkWinSimple(b, aiPlayer)) return [WIN_SCORE + depth, -1];
    if (checkWinSimple(b, opp)) return [-WIN_SCORE - depth, -1];
    if (getValidCols(b).length === 0) return [0, -1];
    return [evaluateBoard(b, aiPlayer), -1];
  }
  const validCols = getValidCols(b);
  validCols.sort((a, c2) => Math.abs(a - 3) - Math.abs(c2 - 3));
  if (maximizing) {
    let maxEval = -Infinity;
    let bestCol = validCols[0];
    for (const col of validCols) {
      const result = simulateDrop(b, col, aiPlayer);
      if (!result) continue;
      const [nb] = result;
      const [ev] = minimax(nb, depth - 1, alpha, beta, false, aiPlayer);
      if (ev > maxEval) { maxEval = ev; bestCol = col; }
      alpha = Math.max(alpha, ev);
      if (beta <= alpha) break;
    }
    return [maxEval, bestCol];
  } else {
    let minEval = Infinity;
    let bestCol = validCols[0];
    for (const col of validCols) {
      const result = simulateDrop(b, col, opp);
      if (!result) continue;
      const [nb] = result;
      const [ev] = minimax(nb, depth - 1, alpha, beta, true, aiPlayer);
      if (ev < minEval) { minEval = ev; bestCol = col; }
      beta = Math.min(beta, ev);
      if (beta <= alpha) break;
    }
    return [minEval, bestCol];
  }
};

const getAIMove = (b: Board, difficulty: Difficulty): number => {
  const validCols = getValidCols(b);
  if (validCols.length === 0) return -1;
  const depthMap = { easy: 2, medium: 4, hard: 6 };
  const randomChance = { easy: 0.25, medium: 0.1, hard: 0 };
  const depth = depthMap[difficulty];
  if (Math.random() < randomChance[difficulty]) {
    return validCols[Math.floor(Math.random() * validCols.length)];
  }
  const [, bestCol] = minimax(b, depth, -Infinity, Infinity, true, 2);
  return bestCol >= 0 ? bestCol : validCols[Math.floor(Math.random() * validCols.length)];
};

// ─── Component ───────────────────────────────

interface ConfettiParticle {
  id: number;
  x: number;
  endY: number;
  rotate: number;
  color: string;
  delay: number;
  size: number;
}

const ConnectFourGame = ({ onScore, liveCode }: Props) => {
  const [board, setBoard] = useState<Board>(
    Array.from({ length: ROWS }, () => Array(COLS).fill(0))
  );
  const [current, setCurrent] = useState<1 | 2>(1);
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState<1 | 2 | null>(null);
  const [winCells, setWinCells] = useState<[number, number][]>([]);
  const [scores, setScores] = useState({ p1: 0, p2: 0 });
  const [bet, setBet] = useState(0);
  const [lastCol, setLastCol] = useState<number | null>(null);
  const [draw, setDraw] = useState(false);
  const [moves, setMoves] = useState(0);
  const [gameMode, setGameMode] = useState<GameMode>("pvp");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [botThinking, setBotThinking] = useState(false);
  const [hoveredCol, setHoveredCol] = useState<number | null>(null);
  const [lastMove, setLastMove] = useState<{ row: number; col: number } | null>(null);
  const boardRef = useRef(board);
  boardRef.current = board;
  const movesRef = useRef(0);

  const checkWin = (b: Board, row: number, col: number, player: 1 | 2): [number, number][] | null => {
    const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
    for (const [dr, dc] of directions) {
      let cells: [number, number][] = [[row, col]];
      for (let dir = -1; dir <= 1; dir += 2) {
        for (let i = 1; i < 4; i++) {
          const r = row + dr * i * dir, c = col + dc * i * dir;
          if (r >= 0 && r < ROWS && c >= 0 && c < COLS && b[r][c] === player) {
            cells.push([r, c]);
          } else break;
        }
      }
      if (cells.length >= 4) return cells;
    }
    return null;
  };

  const getLandingRow = useCallback((col: number): number => {
    for (let r = ROWS - 1; r >= 0; r--) {
      if (board[r][col] === 0) return r;
    }
    return -1;
  }, [board]);

  const hoveredLandingRow = hoveredCol !== null ? getLandingRow(hoveredCol) : -1;

  const applyMove = useCallback((col: number, player: 1 | 2) => {
    const b = boardRef.current;
    const row = b.findIndex(r => r[col] === 0);
    if (row === -1) return null;
    const newBoard = b.map(r => [...r]) as Board;
    newBoard[row][col] = player;
    setBoard(newBoard);
    setLastCol(col);
    setLastMove({ row, col });
    const newMoves = movesRef.current + 1;
    movesRef.current = newMoves;
    setMoves(newMoves);
    const win = checkWin(newBoard, row, col, player);
    if (win) {
      setGameOver(true);
      setWinner(player);
      setWinCells(win);
      const name = gameMode === "bot"
        ? (player === 1 ? "Jogador" : "Computador")
        : `Jogador ${player}`;
      const winScore = 100 + (bet || 0);
      onScore?.(name, winScore);
      setScores(s => player === 1 ? { ...s, p1: s.p1 + winScore } : { ...s, p2: s.p2 + winScore });
      return newBoard;
    }
    if (newMoves >= ROWS * COLS) {
      setGameOver(true);
      setDraw(true);
      return newBoard;
    }
    setCurrent(player === 1 ? 2 : 1);
    return newBoard;
  }, [gameMode, bet, onScore]);

  const dropPiece = (col: number) => {
    if (gameOver || botThinking) return;
    if (gameMode === "bot" && current === 2) return;
    const row = board.findIndex(r => r[col] === 0);
    if (row === -1) { toast.error("Coluna cheia!"); return; }
    applyMove(col, current);
  };

  useEffect(() => {
    if (gameMode !== "bot" || current !== 2 || gameOver || botThinking) return;
    setBotThinking(true);
    const timer = setTimeout(() => {
      const col = getAIMove(board, difficulty);
      if (col >= 0) {
        const b = boardRef.current;
        const row = b.findIndex(r => r[col] === 0);
        if (row !== -1) applyMove(col, 2);
      }
      setBotThinking(false);
    }, 600);
    return () => clearTimeout(timer);
  }, [gameMode, current, gameOver, botThinking, difficulty, board, applyMove]);

  const reset = () => {
    setBoard(Array.from({ length: ROWS }, () => Array(COLS).fill(0)));
    setCurrent(1); setGameOver(false); setWinner(null); setWinCells([]);
    setDraw(false); setMoves(0); setLastCol(null); setBotThinking(false);
    setLastMove(null); setHoveredCol(null);
    movesRef.current = 0;
  };

  const switchMode = (mode: GameMode) => {
    setGameMode(mode);
    setScores({ p1: 0, p2: 0 });
    setBet(0);
    reset();
  };

  const isWinCell = (r: number, c: number) => winCells.some(([wr, wc]) => wr === r && wc === c);
  const p2Name = gameMode === "bot" ? "Computador" : "Jogador 2";
  const currentName = gameMode === "bot" && current === 2 ? "Computador" : `Jogador ${current}`;
  const canInteract = !gameOver && !botThinking && !(gameMode === "bot" && current === 2);
  const winGlowBase = winner === 1 ? "rgba(239,68,68," : "rgba(234,179,8,";

  const confettiParticles = useMemo((): ConfettiParticle[] => {
    if (!gameOver || draw) return [];
    return Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: (Math.random() - 0.5) * 500,
      endY: Math.random() * 250 + 80,
      rotate: Math.random() * 1080 - 540,
      color: ["#ef4444", "#eab308", "#3b82f6", "#22c55e", "#a855f7", "#f97316", "#ec4899"][Math.floor(Math.random() * 7)],
      delay: Math.random() * 0.6,
      size: Math.random() * 6 + 3,
    }));
  }, [gameOver, draw]);

  return (
    <div className="space-y-4">
      {/* Mode Selector */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        <div className="flex rounded-xl bg-white/5 p-0.5">
          <button onClick={() => switchMode("pvp")} className={cn(
            "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5",
            gameMode === "pvp" ? "bg-blue-500 text-white shadow-lg shadow-blue-500/30" : "text-gray-400 hover:text-white"
          )}>
            <User className="h-3.5 w-3.5" /> vs Jogador
          </button>
          <button onClick={() => switchMode("bot")} className={cn(
            "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5",
            gameMode === "bot" ? "bg-purple-500 text-white shadow-lg shadow-purple-500/30" : "text-gray-400 hover:text-white"
          )}>
            <Bot className="h-3.5 w-3.5" /> vs Computador
          </button>
        </div>
        {gameMode === "bot" && (
          <div className="flex rounded-xl bg-white/5 p-0.5">
            {(["easy", "medium", "hard"] as Difficulty[]).map(d => (
              <button key={d} onClick={() => { setDifficulty(d); reset(); }} className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                difficulty === d ? "bg-amber-500 text-white shadow-lg shadow-amber-500/30" : "text-gray-400 hover:text-white"
              )}>
                {{ easy: "F\u00e1cil", medium: "M\u00e9dio", hard: "Dif\u00edcil" }[d]}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Score Display */}
      <div className="flex items-center gap-2 p-2 rounded-2xl bg-black/30 border border-white/5">
        {/* Player 1 Card */}
        <div className={cn(
          "flex-1 p-2.5 rounded-xl text-center transition-all duration-500",
          current === 1 && !gameOver && "bg-red-500/10 shadow-lg shadow-red-500/5"
        )}>
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <motion.div
              className={cn(
                "w-5 h-5 rounded-full bg-gradient-to-br from-red-400 to-red-600 shadow-md",
                current === 1 && !gameOver && "shadow-red-500/60"
              )}
              animate={current === 1 && !gameOver ? { scale: [1, 1.2, 1] } : {}}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
            <span className={cn(
              "text-xs font-bold transition-colors duration-300",
              current === 1 && !gameOver ? "text-red-300" : "text-gray-400"
            )}>Jogador 1</span>
          </div>
          <AnimatePresence mode="popLayout">
            <motion.span
              key={scores.p1}
              initial={{ y: -15, opacity: 0, scale: 0.5 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 15, opacity: 0, scale: 0.5 }}
              transition={{ type: "spring", stiffness: 500, damping: 25 }}
              className="text-2xl font-black text-white block"
            >
              {scores.p1}
            </motion.span>
          </AnimatePresence>
        </div>

        {/* Center Badge */}
        <div className="text-center px-3 shrink-0">
          <Badge className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-blue-300 border-blue-500/20 font-black text-[10px]">
            LIGAR 4
          </Badge>
          {bet > 0 && (
            <motion.p
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="text-[10px] text-amber-400 mt-1 flex items-center justify-center gap-1"
            >
              <Coins className="h-3 w-3" />{bet}
            </motion.p>
          )}
        </div>

        {/* Player 2 Card */}
        <div className={cn(
          "flex-1 p-2.5 rounded-xl text-center transition-all duration-500",
          current === 2 && !gameOver && "bg-yellow-500/10 shadow-lg shadow-yellow-500/5"
        )}>
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <motion.div
              className={cn(
                "w-5 h-5 rounded-full bg-gradient-to-br from-yellow-300 to-yellow-500 shadow-md flex items-center justify-center",
                current === 2 && !gameOver && "shadow-yellow-400/60"
              )}
              animate={current === 2 && !gameOver ? { scale: [1, 1.2, 1] } : {}}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              {gameMode === "bot" && <Bot className="h-3 w-3 text-yellow-900" />}
            </motion.div>
            <span className={cn(
              "text-xs font-bold transition-colors duration-300",
              current === 2 && !gameOver ? "text-yellow-300" : "text-gray-400"
            )}>{p2Name}</span>
          </div>
          <AnimatePresence mode="popLayout">
            <motion.span
              key={scores.p2}
              initial={{ y: -15, opacity: 0, scale: 0.5 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 15, opacity: 0, scale: 0.5 }}
              transition={{ type: "spring", stiffness: 500, damping: 25 }}
              className="text-2xl font-black text-white block"
            >
              {scores.p2}
            </motion.span>
          </AnimatePresence>
        </div>
      </div>

      {/* Turn Indicator */}
      {!gameOver && (
        <div className="text-center">
          {botThinking ? (
            <motion.div
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20"
            >
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}>
                <Bot className="h-4 w-4 text-purple-400" />
              </motion.div>
              <span className="text-xs font-bold text-purple-300">Computador pensando...</span>
            </motion.div>
          ) : (
            <motion.div
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2 rounded-full border transition-colors duration-300",
                current === 1
                  ? "bg-red-500/10 border-red-500/20"
                  : "bg-yellow-500/10 border-yellow-500/20"
              )}
              animate={{ scale: [0.98, 1.02, 0.98] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              {currentName === "Computador" && <Bot className="h-3.5 w-3.5 text-yellow-400" />}
              <span className={cn("text-xs font-bold", current === 1 ? "text-red-300" : "text-yellow-300")}>
                Vez de {currentName}
              </span>
              <motion.div
                className={cn("w-3 h-3 rounded-full", current === 1 ? "bg-red-500" : "bg-yellow-400")}
                animate={{ y: [0, -3, 0] }}
                transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
              />
            </motion.div>
          )}
        </div>
      )}

      {/* Board Area */}
      <div className="flex justify-center">
        <div className="relative" style={{ perspective: "800px" }}>
          {/* Main Board */}
          <div
            className={cn(
              "relative overflow-hidden rounded-2xl p-2.5 sm:p-3 transition-all duration-300",
              botThinking && "ring-2 ring-purple-500/30"
            )}
            style={{
              background: "linear-gradient(180deg, #2563eb 0%, #1e40af 40%, #1e3a8a 100%)",
              transform: "rotateX(2deg)",
              transformOrigin: "center 30%",
              boxShadow: `
                0 25px 60px -15px rgba(0, 0, 0, 0.6),
                0 0 0 1px rgba(59, 130, 246, 0.15),
                0 0 80px -20px rgba(59, 130, 246, 0.25),
                inset 0 1px 0 rgba(255, 255, 255, 0.12),
                inset 0 -2px 0 rgba(0, 0, 0, 0.2)
              `,
            }}
            onMouseLeave={() => setHoveredCol(null)}
          >
            {/* Board top highlight for 3D depth */}
            <div
              className="absolute top-0 left-0 right-0 h-1/3 rounded-t-2xl pointer-events-none z-30"
              style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.06) 0%, transparent 100%)" }}
            />

            {/* Column Hover Indicators */}
            <div className="relative z-10 flex gap-1.5 mb-1.5 px-0.5">
              {Array.from({ length: COLS }).map((_, c) => (
                <button
                  key={c}
                  onClick={() => dropPiece(c)}
                  onMouseEnter={() => canInteract && setHoveredCol(c)}
                  onMouseLeave={() => setHoveredCol(null)}
                  className={cn(
                    "flex-1 h-8 sm:h-9 rounded-t-lg transition-all duration-200 flex items-center justify-center",
                    canInteract && hoveredCol === c
                      ? current === 1
                        ? "bg-red-500/20"
                        : "bg-yellow-500/20"
                      : "bg-white/[0.03]",
                    !canInteract && "opacity-30 cursor-default",
                    canInteract && "cursor-pointer"
                  )}
                >
                  {canInteract && hoveredCol === c ? (
                    <motion.div
                      initial={{ y: -8, opacity: 0, scale: 0.5 }}
                      animate={{ y: [0, 3, 0], opacity: 0.7, scale: 1 }}
                      transition={{
                        y: { duration: 0.8, repeat: Infinity, ease: "easeInOut" },
                        opacity: { duration: 0.15 },
                        scale: { duration: 0.15 },
                      }}
                      className={cn(
                        "w-5 h-5 sm:w-6 sm:h-6 rounded-full shadow-lg",
                        current === 1
                          ? "bg-gradient-to-br from-red-400 to-red-600 shadow-red-500/40"
                          : "bg-gradient-to-br from-yellow-300 to-yellow-500 shadow-yellow-400/40"
                      )}
                    />
                  ) : canInteract ? (
                    <span className="text-[10px] text-white/20">&#9660;</span>
                  ) : null}
                </button>
              ))}
            </div>

            {/* Grid */}
            <div className="relative z-10 grid grid-cols-7 gap-1.5">
              {board.flatMap((row, r) =>
                row.map((cell, c) => {
                  const isWin = isWinCell(r, c);
                  const isLanding = hoveredCol === c && r === hoveredLandingRow && canInteract && cell === 0;
                  const isLast = lastMove?.row === r && lastMove?.col === c;
                  const isHoveredColCell = hoveredCol === c && canInteract;

                  return (
                    <motion.div
                      key={`${r}-${c}`}
                      className={cn(
                        "w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center relative",
                        isHoveredColCell && !isWin && "bg-blue-950/60",
                        !isHoveredColCell && "bg-blue-950/90"
                      )}
                      style={{
                        boxShadow: isWin
                          ? `0 0 15px 3px ${winGlowBase}0.4), 0 0 30px 5px ${winGlowBase}0.2)`
                          : `inset 0 4px 8px rgba(0, 0, 0, 0.6), inset 0 -2px 4px rgba(59, 130, 246, 0.08), inset 2px 0 4px rgba(0, 0, 0, 0.15), inset -2px 0 4px rgba(0, 0, 0, 0.15)`,
                      }}
                      layout
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    >
                      {/* Ghost piece preview at landing position */}
                      {isLanding && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.5 }}
                          animate={{ opacity: 0.25, scale: 1 }}
                          className={cn(
                            "w-8 h-8 sm:w-10 sm:h-10 rounded-full absolute",
                            current === 1
                              ? "bg-gradient-to-br from-red-400 to-red-600"
                              : "bg-gradient-to-br from-yellow-300 to-yellow-500"
                          )}
                        />
                      )}

                      {/* Actual piece */}
                      {cell !== 0 && (
                        <motion.div
                          key={`piece-${r}-${c}-${cell}`}
                          initial={{
                            y: -(r + 2) * 52,
                            opacity: 0.3,
                            scale: 0.85,
                          }}
                          animate={{
                            y: 0,
                            opacity: 1,
                            scale: isWin ? [1, 1.1, 1] : 1,
                          }}
                          transition={
                            isWin
                              ? {
                                  scale: { duration: 0.8, repeat: Infinity, ease: "easeInOut" },
                                  y: { type: "spring", stiffness: 500, damping: 14 },
                                  opacity: { duration: 0.2 },
                                }
                              : {
                                  type: "spring",
                                  stiffness: 500,
                                  damping: 14,
                                  mass: 0.7,
                                }
                          }
                          className={cn(
                            "w-8 h-8 sm:w-10 sm:h-10 rounded-full relative z-10",
                            cell === 1
                              ? "bg-gradient-to-br from-red-300 via-red-500 to-red-700"
                              : "bg-gradient-to-br from-yellow-200 via-yellow-400 to-yellow-600"
                          )}
                          style={{
                            boxShadow: isWin
                              ? `0 0 12px 2px ${winGlowBase}0.5), 0 2px 4px rgba(0,0,0,0.3)`
                              : cell === 1
                                ? "0 2px 8px rgba(239,68,68,0.4), inset 0 -2px 4px rgba(0,0,0,0.2), inset 0 2px 4px rgba(255,255,255,0.2)"
                                : "0 2px 8px rgba(234,179,8,0.4), inset 0 -2px 4px rgba(0,0,0,0.15), inset 0 2px 4px rgba(255,255,255,0.3)",
                          }}
                        >
                          {/* Shine highlight on piece */}
                          <div className="absolute top-1 left-1.5 w-3 h-2 sm:w-4 sm:h-2.5 rounded-full bg-white/25 blur-[1px]" />
                        </motion.div>
                      )}

                      {/* Last move ring indicator */}
                      {isLast && !isWin && cell !== 0 && (
                        <motion.div
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1.1, opacity: [0.6, 0.2, 0.6] }}
                          transition={{ opacity: { duration: 2, repeat: Infinity }, scale: { duration: 0.3 } }}
                          className="absolute inset-0.5 rounded-full border-2 border-white/40 z-20 pointer-events-none"
                        />
                      )}
                    </motion.div>
                  );
                })
              )}
            </div>

            {/* Board bottom bevel for 3D depth */}
            <div
              className="relative z-10 h-1.5 rounded-b-2xl mt-0.5"
              style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.3), rgba(0,0,0,0.05))" }}
            />
          </div>

          {/* Game Over Overlay */}
          <AnimatePresence>
            {gameOver && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-20 flex items-center justify-center"
                style={{ transform: "rotateX(-2deg)" }}
              >
                {/* Backdrop */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 rounded-2xl bg-black/60 backdrop-blur-sm"
                />

                {/* Confetti */}
                {!draw && (
                  <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
                    {confettiParticles.map((p) => (
                      <motion.div
                        key={p.id}
                        className="absolute rounded-sm"
                        style={{
                          width: p.size,
                          height: p.size * 1.6,
                          backgroundColor: p.color,
                          left: "50%",
                          top: "35%",
                        }}
                        initial={{ x: 0, y: 0, rotate: 0, opacity: 1 }}
                        animate={{
                          x: p.x,
                          y: p.endY,
                          rotate: p.rotate,
                          opacity: 0,
                        }}
                        transition={{
                          duration: 2.5,
                          delay: p.delay,
                          ease: [0.25, 0.46, 0.45, 0.94],
                        }}
                      />
                    ))}
                  </div>
                )}

                {/* Content */}
                <motion.div
                  initial={{ scale: 0.5, opacity: 0, y: 20 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.8, opacity: 0, y: 10 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20, delay: 0.15 }}
                  className="relative z-10 text-center px-6 py-5 rounded-2xl bg-gray-900/90 border border-white/10 backdrop-blur-md shadow-2xl"
                >
                  <motion.div
                    className="text-5xl mb-2"
                    initial={{ scale: 0, rotate: -20 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.3, type: "spring", stiffness: 500, damping: 12 }}
                  >
                    {draw ? "\ud83e\udd1d" : (gameMode === "bot" && winner === 2 ? "\ud83e\udd16" : "\ud83c\udfc6")}
                  </motion.div>

                  <motion.h3
                    className={cn(
                      "text-lg sm:text-xl font-black",
                      draw ? "text-gray-300" : winner === 1 ? "text-red-400" : "text-yellow-400"
                    )}
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.45 }}
                  >
                    {draw
                      ? "Empate!"
                      : gameMode === "bot" && winner === 2
                        ? "Computador Venceu!"
                        : `${winner === 1 ? "Jogador 1" : p2Name} Venceu!`}
                  </motion.h3>

                  {!draw && (
                    <motion.p
                      className="text-sm text-white/50 mt-1"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.6 }}
                    >
                      +{100 + (bet || 0)} pontos
                    </motion.p>
                  )}

                  <motion.div
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.7 }}
                  >
                    <Button
                      onClick={reset}
                      className="mt-3 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white rounded-xl font-bold shadow-lg shadow-blue-500/25 transition-all hover:shadow-blue-500/40 hover:scale-105 active:scale-95"
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />Jogar Novamente
                    </Button>
                  </motion.div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-2 justify-center">
        {[10, 25, 50, 100].map(v => (
          <Button key={v} size="sm" variant={bet === v ? "default" : "outline"}
            className={cn(
              "rounded-xl text-xs font-bold transition-all",
              bet === v && "bg-amber-500 hover:bg-amber-600 shadow-lg shadow-amber-500/25"
            )}
            onClick={() => setBet(v)}
          >
            <Coins className="h-3 w-3 mr-1" />{v}
          </Button>
        ))}
        <Button
          size="sm" variant="outline"
          className="rounded-xl hover:bg-white/10 transition-all hover:scale-105 active:scale-95"
          onClick={reset}
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
};

export default ConnectFourGame;
