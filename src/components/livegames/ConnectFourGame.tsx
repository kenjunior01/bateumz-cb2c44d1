import { useState, useCallback, useEffect, useRef } from "react";
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

// ─── Minimax AI with Alpha-Beta Pruning ─────────────────────────
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

// ─── Component ──────────────────────────────────────────────────
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

  const applyMove = useCallback((col: number, player: 1 | 2) => {
    const b = boardRef.current;
    const row = b.findIndex(r => r[col] === 0);
    if (row === -1) return null;
    const newBoard = b.map(r => [...r]) as Board;
    newBoard[row][col] = player;
    setBoard(newBoard);
    setLastCol(col);
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
    setDraw(false); setMoves(0); setLastCol(null); setBotThinking(false); movesRef.current = 0;
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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-center gap-2">
        <div className="flex rounded-xl bg-white/5 p-0.5">
          <button onClick={() => switchMode("pvp")} className={cn(
            "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5",
            gameMode === "pvp" ? "bg-blue-500 text-white shadow-lg" : "text-gray-400 hover:text-white"
          )}>
            <User className="h-3.5 w-3.5" /> vs Jogador
          </button>
          <button onClick={() => switchMode("bot")} className={cn(
            "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5",
            gameMode === "bot" ? "bg-purple-500 text-white shadow-lg" : "text-gray-400 hover:text-white"
          )}>
            <Bot className="h-3.5 w-3.5" /> vs Computador
          </button>
        </div>
        {gameMode === "bot" && (
          <div className="flex rounded-xl bg-white/5 p-0.5">
            {(["easy", "medium", "hard"] as Difficulty[]).map(d => (
              <button key={d} onClick={() => { setDifficulty(d); reset(); }} className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                difficulty === d ? "bg-amber-500 text-white shadow-lg" : "text-gray-400 hover:text-white"
              )}>
                {{ easy: "Fácil", medium: "Médio", hard: "Difícil" }[d]}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-blue-900/30 to-yellow-900/30 border border-blue-500/20">
        <div className="text-center flex-1">
          <div className="w-5 h-5 rounded-full bg-red-500 mx-auto mb-1 shadow-lg shadow-red-500/50" />
          <span className={cn("text-sm font-black", current === 1 && !gameOver && "text-red-400")}>Jogador 1</span>
          <p className="text-xl font-black text-white">{scores.p1}</p>
        </div>
        <div className="text-center px-4">
          <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">LIGAR 4</Badge>
          {bet > 0 && <p className="text-[10px] text-amber-400 mt-1 flex items-center justify-center gap-1"><Coins className="h-3 w-3" />{bet}</p>}
        </div>
        <div className="text-center flex-1">
          <div className="w-5 h-5 rounded-full bg-yellow-400 mx-auto mb-1 shadow-lg shadow-yellow-400/50 flex items-center justify-center">
            {gameMode === "bot" && <Bot className="h-3 w-3 text-yellow-900" />}
          </div>
          <span className={cn("text-sm font-black", current === 2 && !gameOver && "text-yellow-400")}>{p2Name}</span>
          <p className="text-xl font-black text-white">{scores.p2}</p>
        </div>
      </div>

      {!gameOver && (
        <div className="text-center">
          {botThinking ? (
            <motion.div
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="flex items-center justify-center gap-2"
            >
              <Bot className="h-4 w-4 text-purple-400" />
              <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                Computador pensando...
              </Badge>
            </motion.div>
          ) : (
            <Badge className={current === 1 ? "bg-red-500/20 text-red-400" : "bg-yellow-500/20 text-yellow-400"}>
              {currentName === "Computador" && <Bot className="h-3 w-3 mr-1 inline" />}
              Vez de {currentName}
            </Badge>
          )}
        </div>
      )}

      <div className="flex justify-center">
        <div className={cn("rounded-2xl bg-blue-800 p-2 shadow-2xl shadow-blue-900/50", botThinking && "ring-2 ring-purple-500/40")}>
          <div className="flex gap-1.5 mb-1 px-0.5">
            {Array.from({ length: COLS }).map((_, c) => (
              <button key={c} onClick={() => dropPiece(c)}
                className={cn("flex-1 h-6 rounded-t-lg transition-all flex items-center justify-center",
                  !gameOver && !botThinking && current === 1 ? "hover:bg-red-500/30 bg-red-500/10" :
                  !gameOver && !botThinking && current === 2 && gameMode === "pvp" ? "hover:bg-yellow-500/30 bg-yellow-500/10" :
                  "bg-white/5 cursor-default",
                  (gameOver || botThinking || (gameMode === "bot" && current === 2)) && "opacity-40"
                )}>
                <span className="text-[10px]">▼</span>
              </button>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {board.flatMap((row, r) =>
              row.map((cell, c) => (
                <motion.div
                  key={`${r}-${c}`}
                  className={cn(
                    "w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center",
                    "bg-blue-950/80 shadow-inner",
                    isWinCell(r, c) && "ring-2 ring-white animate-pulse"
                  )}
                  layout
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                >
                  {cell !== 0 && (
                    <motion.div
                      initial={{ y: -200, opacity: 0, scale: 0.5 }}
                      animate={{ y: 0, opacity: 1, scale: 1 }}
                      transition={{ type: "spring", stiffness: 400, damping: 20 }}
                      className={cn(
                        "w-8 h-8 sm:w-10 sm:h-10 rounded-full shadow-lg",
                        cell === 1
                          ? "bg-gradient-to-br from-red-400 to-red-600 shadow-red-500/50"
                          : "bg-gradient-to-br from-yellow-300 to-yellow-500 shadow-yellow-400/50"
                      )}
                    />
                  )}
                </motion.div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 justify-center">
        {[10, 25, 50, 100].map(v => (
          <Button key={v} size="sm" variant={bet === v ? "default" : "outline"}
            className={cn("rounded-xl text-xs", bet === v && "bg-amber-500")}
            onClick={() => setBet(v)}><Coins className="h-3 w-3 mr-1" />{v}</Button>
        ))}
        <Button size="sm" variant="outline" className="rounded-xl" onClick={reset}><RotateCcw className="h-3.5 w-3.5" /></Button>
      </div>

      {gameOver && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-3">
          <div className="text-5xl">{draw ? "🤝" : (gameMode === "bot" && winner === 2 ? "🤖" : "🏆")}</div>
          <h3 className="text-xl font-black text-white">
            {draw ? "Empate!" : (gameMode === "bot" && winner === 2 ? "Computador Venceu!" : `${winner === 1 ? "Jogador 1" : p2Name} Venceu!`)}
          </h3>
          <Button onClick={reset} className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl"><RotateCcw className="h-4 w-4 mr-2" />Jogar Novamente</Button>
        </motion.div>
      )}
    </div>
  );
};

export default ConnectFourGame;
