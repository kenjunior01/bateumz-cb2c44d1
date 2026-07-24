import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Crown, RotateCcw, Trophy, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  onScore?: (name: string, score: number) => void;
  liveCode?: string;
}

type Cell = null | { player: 1 | 2; king: boolean };
type Board = Cell[][];

const BOARD_SIZE = 8;

const createEmptyBoard = (): Board =>
  Array.from({ length: 8 }, () => Array(8).fill(null));

const initBoard = (): Board => {
  const b = createEmptyBoard();
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 8; c++)
      if ((r + c) % 2 === 1) b[r][c] = { player: 1, king: false };
  for (let r = 5; r < 8; r++)
    for (let c = 0; c < 8; c++)
      if ((r + c) % 2 === 1) b[r][c] = { player: 2, king: false };
  return b;
};

const getValidMoves = (board: Board, row: number, col: number): { toR: number; toC: number; jumped?: [number, number] }[] => {
  const cell = board[row][col];
  if (!cell) return [];
  const moves: { toR: number; toC: number; jumped?: [number, number] }[] = [];
  const dirs = cell.king
    ? [[-1, -1], [-1, 1], [1, -1], [1, 1]]
    : cell.player === 1
      ? [[1, -1], [1, 1]]
      : [[-1, -1], [-1, 1]];

  for (const [dr, dc] of dirs) {
    const nr = row + dr, nc = col + dc;
    if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && !board[nr][nc]) {
      moves.push({ toR: nr, toC: nc });
    }
    const jr = row + 2 * dr, jc = col + 2 * dc;
    if (
      jr >= 0 && jr < 8 && jc >= 0 && jc < 8 &&
      board[nr]?.[nc] && board[nr][nc]?.player !== cell.player &&
      !board[jr][jc]
    ) {
      moves.push({ toR: jr, toC: jc, jumped: [nr, nc] });
    }
  }
  return moves;
};

const CheckersGame = ({ onScore, liveCode }: Props) => {
  const [board, setBoard] = useState<Board>(initBoard);
  const [current, setCurrent] = useState<1 | 2>(1);
  const [selected, setSelected] = useState<[number, number] | null>(null);
  const [validMoves, setValidMoves] = useState<{ toR: number; toC: number; jumped?: [number, number] }[]>([]);
  const [scores, setScores] = useState({ p1: 0, p2: 0 });
  const [captured, setCaptured] = useState({ p1: 0, p2: 0 });
  const [bet, setBet] = useState(0);
  const [betPlaced, setBetPlaced] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState<1 | 2 | null>(null);
  const [mustJump, setMustJump] = useState(false);
  const [moveHistory, setMoveHistory] = useState<string[]>([]);

  const countPieces = (b: Board) => {
    let p1 = 0, p2 = 0;
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
      if (b[r][c]?.player === 1) p1++;
      if (b[r][c]?.player === 2) p2++;
    }
    return { p1, p2 };
  };

  const checkGameOver = useCallback((b: Board) => {
    const { p1, p2 } = countPieces(b);
    if (p1 === 0) { setGameOver(true); setWinner(2); return true; }
    if (p2 === 0) { setGameOver(true); setWinner(1); return true; }
    return false;
  }, []);

  const handleSelect = (row: number, col: number) => {
    if (gameOver) return;
    const cell = board[row][col];

    if (selected) {
      const move = validMoves.find(m => m.toR === row && m.toC === col);
      if (move) {
        makeMove(selected[0], selected[1], move);
        return;
      }
    }

    if (cell && cell.player === current) {
      const moves = getValidMoves(board, row, col);
      const jumps = moves.filter(m => m.jumped);
      if (jumps.length > 0) {
        setMustJump(true);
        setValidMoves(jumps);
      } else if (mustJump) {
        toast.error("Deve capturar uma peça!");
        return;
      } else {
        setMustJump(false);
        setValidMoves(moves);
      }
      setSelected([row, col]);
    }
  };

  const makeMove = (fromR: number, fromC: number, move: { toR: number; toC: number; jumped?: [number, number] }) => {
    const newBoard = board.map(r => [...r]) as Board;
    const piece = newBoard[fromR][fromC]!;
    newBoard[fromR][fromC] = null;
    newBoard[move.toR][move.toC] = piece;

    let capturedPiece = false;
    if (move.jumped) {
      newBoard[move.jumped[0]][move.jumped[1]] = null;
      capturedPiece = true;
      if (current === 1) setCaptured(p => ({ ...p, p1: p.p1 + 1 }));
      else setCaptured(p => ({ ...p, p2: p.p2 + 1 }));
    }

    // King promotion
    if (piece.player === 1 && move.toR === 7) newBoard[move.toR][move.toC] = { ...piece, king: true };
    if (piece.player === 2 && move.toR === 0) newBoard[move.toR][move.toC] = { ...piece, king: true };

    setBoard(newBoard);
    setSelected(null);
    setValidMoves([]);
    setMustJump(false);

    setMoveHistory(h => [...h, `${current === 1 ? "🔴" : "⚫"} ${String.fromCharCode(97 + fromC)}${8 - fromR}→${String.fromCharCode(97 + move.toC)}${8 - move.toR}${capturedPiece ? " ✕" : ""}`]);

    if (!checkGameOver(newBoard)) {
 setCurrent(current === 1 ? 2 : 1);
    }
  };

  const reset = () => {
    setBoard(initBoard());
    setCurrent(1); setSelected(null); setValidMoves([]);
    setCaptured({ p1: 0, p2: 0 });
    setGameOver(false); setWinner(null); setMustJump(false);
    setMoveHistory([]); setBetPlaced(false);
  };

  const handleBet = (amount: number) => {
    setBet(amount);
    setBetPlaced(true);
    toast.success(`Aposta de ${amount} moedas colocada!`);
  };

  useEffect(() => {
    if (gameOver && winner) {
      const winScore = 100 + captured[winner === 1 ? "p1" : "p2"] * 20 + (bet || 0);
      onScore?.(winner === 1 ? "Jogador 1" : "Jogador 2", winScore);
      setScores(s => winner === 1 ? { ...s, p1: s.p1 + winScore } : { ...s, p2: s.p2 + winScore });
    }
  }, [gameOver, winner]);

  const pieces = countPieces(board);

  return (
    <div className="space-y-4">
      {/* Scoreboard */}
      <div className="flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-amber-900/30 to-red-900/30 border border-amber-500/20">
        <div className="text-center flex-1">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <div className="w-4 h-4 rounded-full bg-red-500 shadow-lg shadow-red-500/50" />
            <span className={cn("text-sm font-black", current === 1 && "text-red-400")}>Jogador 1</span>
          </div>
          <p className="text-2xl font-black text-white">{scores.p1}</p>
          <p className="text-[10px] text-slate-500">{pieces.p1} peças · {captured.p1} capturas</p>
        </div>
        <div className="text-center px-4">
          <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs">DAMAS</Badge>
          {betPlaced && <p className="text-[10px] text-amber-400 mt-1 flex items-center justify-center gap-1"><Coins className="h-3 w-3" /> Aposta: {bet}</p>}
        </div>
        <div className="text-center flex-1">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <div className="w-4 h-4 rounded-full bg-slate-800 shadow-lg shadow-slate-500/50 border border-slate-600" />
            <span className={cn("text-sm font-black", current === 2 && "text-slate-300")}>Jogador 2</span>
          </div>
          <p className="text-2xl font-black text-white">{scores.p2}</p>
          <p className="text-[10px] text-slate-500">{pieces.p2} peças · {captured.p2} capturas</p>
        </div>
      </div>

      {/* Turn indicator */}
      {!gameOver && (
        <div className="text-center">
          <Badge className={cn("text-sm", current === 1 ? "bg-red-500/20 text-red-400" : "bg-slate-700 text-slate-300")}>
            Vez de Jogador {current} {mustJump && "· Deve capturar!"}
          </Badge>
        </div>
      )}

      {/* Board */}
      <div className="flex justify-center">
        <div className="rounded-2xl overflow-hidden shadow-2xl shadow-black/50 border-2 border-amber-700/30">
          {board.map((row, r) => (
            <div key={r} className="flex">
              {row.map((cell, c) => {
                const isDark = (r + c) % 2 === 1;
                const isSelected = selected?.[0] === r && selected?.[1] === c;
                const isValidTarget = validMoves.some(m => m.toR === r && m.toC === c);
                return (
                  <div
                    key={c}
                    onClick={() => handleSelect(r, c)}
                    className={cn(
                      "w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center cursor-pointer transition-all relative",
                      isDark ? "bg-amber-800/60" : "bg-amber-100/80",
                      isSelected && "ring-2 ring-cyan-400 ring-inset bg-amber-700/60",
                      isValidTarget && "after:absolute after:inset-0 after:bg-green-400/30 after:rounded-sm"
                    )}
                  >
                    {cell && (
                      <motion.div
                        layoutId={`piece-${r}-${c}`}
                        className={cn(
                          "w-7 h-7 sm:w-9 sm:h-9 rounded-full shadow-lg flex items-center justify-center transition-all",
                          cell.player === 1
                            ? "bg-gradient-to-br from-red-400 to-red-600 shadow-red-500/50"
                            : "bg-gradient-to-br from-slate-600 to-slate-900 shadow-slate-500/50 border border-slate-500"
                        )}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        {cell.king && <Crown className="h-3.5 w-3.5 text-yellow-300" />}
                      </motion.div>
                    )}
                    {isValidTarget && !cell && (
                      <div className="w-3 h-3 rounded-full bg-green-400/40" />
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Betting panel (when not in live) */}
      {gameOver ? (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-3">
          <div className="text-5xl">🏆</div>
          <h3 className="text-xl font-black text-white">Jogador {winner} Venceu!</h3>
          <div className="flex gap-2 justify-center">
            <Button onClick={reset} className="bg-gradient-to-r from-amber-500 to-red-500 text-white rounded-xl"><RotateCcw className="h-4 w-4 mr-2" />Jogar Novamente</Button>
          </div>
        </motion.div>
      ) : (
        <div className="flex flex-wrap gap-2 justify-center">
          {[10, 25, 50, 100].map(v => (
            <Button key={v} size="sm" variant={bet === v && betPlaced ? "default" : "outline"} className={cn("rounded-xl", bet === v && betPlaced ? "bg-amber-500 hover:bg-amber-600" : "")} onClick={() => handleBet(v)}>
              <Coins className="h-3 w-3 mr-1" />{v}
            </Button>
          ))}
          <Button size="sm" variant="outline" className="rounded-xl" onClick={reset}><RotateCcw className="h-3.5 w-3.5" /></Button>
        </div>
      )}
    </div>
  );
};

export default CheckersGame;
