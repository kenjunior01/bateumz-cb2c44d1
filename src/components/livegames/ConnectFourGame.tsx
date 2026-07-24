import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RotateCcw, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  onScore?: (name: string, score: number) => void;
  liveCode?: string;
}

const ROWS = 6;
const COLS = 7;
type Board = (0 | 1 | 2)[][];

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

  const dropPiece = (col: number) => {
    if (gameOver) return;
    const row = board.findIndex(r => r[col] === 0);
    if (row === -1) { toast.error("Coluna cheia!"); return; }

    const newBoard = board.map(r => [...r]) as Board;
    newBoard[row][col] = current;
    setBoard(newBoard);
    setLastCol(col);
    setMoves(m => m + 1);

    const win = checkWin(newBoard, row, col, current);
    if (win) {
      setGameOver(true);
      setWinner(current);
      setWinCells(win);
      const winScore = 100 + (bet || 0);
      onScore?.(current === 1 ? "Jogador 1" : "Jogador 2", winScore);
      setScores(s => current === 1 ? { ...s, p1: s.p1 + winScore } : { ...s, p2: s.p2 + winScore });
      return;
    }

    if (moves + 1 >= ROWS * COLS) {
      setGameOver(true);
      setDraw(true);
      return;
    }

    setCurrent(current === 1 ? 2 : 1);
  };

  const reset = () => {
    setBoard(Array.from({ length: ROWS }, () => Array(COLS).fill(0)));
    setCurrent(1); setGameOver(false); setWinner(null); setWinCells([]);
    setDraw(false); setMoves(0); setLastCol(null);
  };

  const isWinCell = (r: number, c: number) => winCells.some(([wr, wc]) => wr === r && wc === c);

  return (
    <div className="space-y-4">
      {/* Scoreboard */}
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
          <div className="w-5 h-5 rounded-full bg-yellow-400 mx-auto mb-1 shadow-lg shadow-yellow-400/50" />
          <span className={cn("text-sm font-black", current === 2 && !gameOver && "text-yellow-400")}>Jogador 2</span>
          <p className="text-xl font-black text-white">{scores.p2}</p>
        </div>
      </div>

      {!gameOver && (
        <div className="text-center">
          <Badge className={current === 1 ? "bg-red-500/20 text-red-400" : "bg-yellow-500/20 text-yellow-400"}>
            Vez de Jogador {current}
          </Badge>
        </div>
      )}

      {/* Board */}
      <div className="flex justify-center">
        <div className="rounded-2xl bg-blue-800 p-2 shadow-2xl shadow-blue-900/50">
          {/* Column selectors */}
          <div className="flex gap-1.5 mb-1 px-0.5">
            {Array.from({ length: COLS }).map((_, c) => (
              <button key={c} onClick={() => dropPiece(c)}
                className={cn("flex-1 h-6 rounded-t-lg transition-all flex items-center justify-center",
                  !gameOver && current === 1 ? "hover:bg-red-500/30 bg-red-500/10" : "hover:bg-yellow-500/30 bg-yellow-500/10",
                  gameOver && "opacity-50"
                )}>
                <span className="text-[10px]">▼</span>
              </button>
            ))}
          </div>
          {/* Grid */}
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

      {/* Controls */}
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
          <div className="text-5xl">{draw ? "🤝" : "🏆"}</div>
          <h3 className="text-xl font-black text-white">{draw ? "Empate!" : `Jogador ${winner} Venceu!`}</h3>
          <Button onClick={reset} className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl"><RotateCcw className="h-4 w-4 mr-2" />Jogar Novamente</Button>
        </motion.div>
      )}
    </div>
  );
};

export default ConnectFourGame;
