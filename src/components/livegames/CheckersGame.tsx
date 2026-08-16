import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Crown, RotateCcw, Trophy, Coins, Bot } from "lucide-react";
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
type Difficulty = "facil" | "medio" | "dificil";

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

/* ===== AI Helpers ===== */
type FullMove = { fromR: number; fromC: number; toR: number; toC: number; jumped?: [number, number] };

const getAllMovesForPlayer = (b: Board, player: 1 | 2): FullMove[] => {
  const allMoves: FullMove[] = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (b[r][c]?.player === player) {
        const moves = getValidMoves(b, r, c);
        for (const m of moves) {
          allMoves.push({ fromR: r, fromC: c, ...m });
        }
      }
    }
  }
  const jumps = allMoves.filter(m => m.jumped);
  return jumps.length > 0 ? jumps : allMoves;
};

const simulateMove = (b: Board, move: FullMove): Board => {
  const nb = b.map(r => [...r]) as Board;
  const piece = nb[move.fromR][move.fromC]!;
  nb[move.fromR][move.fromC] = null;
  nb[move.toR][move.toC] = piece;
  if (move.jumped) nb[move.jumped[0]][move.jumped[1]] = null;
  if (piece.player === 1 && move.toR === 7) nb[move.toR][move.toC] = { ...piece, king: true };
  if (piece.player === 2 && move.toR === 0) nb[move.toR][move.toC] = { ...piece, king: true };
  return nb;
};

const evaluateSingleMove = (b: Board, move: FullMove): number => {
  let score = 0;
  const piece = b[move.fromR][move.fromC]!;
  if (move.jumped) score += 100;
  if (piece.player === 2 && move.toR === 0) score += 60;
  if (piece.player === 1 && move.toR === 7) score += 60;
  if (!piece.king) {
    if (piece.player === 2 && move.toR < move.fromR) score += 10;
    else if (piece.player === 1 && move.toR > move.fromR) score += 10;
    else score += 3;
  } else {
    score += 15;
  }
  if (move.toC === 0 || move.toC === 7) score += 5;
  return score;
};

const evaluateBoardFor = (b: Board, player: 1 | 2): number => {
  let score = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const cell = b[r][c];
      if (!cell) continue;
      const val = cell.king ? 7 : 3;
      if (cell.player === player) {
        score += val;
        if (c >= 2 && c <= 5 && r >= 2 && r <= 5) score += 1;
      } else {
        score -= val;
      }
    }
  }
  return score;
};

const chooseBotMove = (b: Board, difficulty: Difficulty): FullMove => {
  const allMoves = getAllMovesForPlayer(b, 2);
  if (allMoves.length === 0) throw new Error("no_moves");

  // Validate that the board state is sane (has bot pieces)
  let hasBotPieces = false;
  for (let r = 0; r < 8 && !hasBotPieces; r++)
    for (let c = 0; c < 8 && !hasBotPieces; c++)
      if (b[r]?.[c]?.player === 2) hasBotPieces = true;
  if (!hasBotPieces) throw new Error("no_pieces");

  try {
    if (difficulty === "facil" && Math.random() < 0.3) {
      return allMoves[Math.floor(Math.random() * allMoves.length)];
    }

    if (difficulty === "dificil") {
      /* Look-ahead 1 move with positional evaluation */
      const scored = allMoves.map(move => {
        try {
          const b1 = simulateMove(b, move);
          const oppMoves = getAllMovesForPlayer(b1, 1);
          if (oppMoves.length === 0) return { move, score: 10000 };
          const oppMobility = oppMoves.length;
          const boardScore = evaluateBoardFor(b1, 2);
          const mobilityBonus = Math.max(0, 12 - oppMobility) * 3;
          return { move, score: boardScore + mobilityBonus };
        } catch {
          return { move, score: 0 };
        }
      });
      scored.sort((a, b) => b.score - a.score);
      return scored[0].move;
    }

    /* Médio (or Fácil 70% of time): basic evaluation */
    const scored = allMoves.map(move => ({ move, score: evaluateSingleMove(b, move) }));
    scored.sort((a, b) => b.score - a.score);
    if (difficulty === "facil") {
      const top = scored.slice(0, Math.min(3, scored.length));
      return top[Math.floor(Math.random() * top.length)].move;
    }
    return scored[0].move;
  } catch {
    // Fallback: return a random valid move if anything goes wrong
    return allMoves[Math.floor(Math.random() * allMoves.length)];
  }
};
/* ===== End AI Helpers ===== */

const CheckersGame = ({ onScore, liveCode }: Props) => {
  const [gameStarted, setGameStarted] = useState(false);
  const [vsComputer, setVsComputer] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty>("medio");
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
  const [botThinking, setBotThinking] = useState(false);
  const botTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const countPieces = (b: Board) => {
    let p1 = 0, p2 = 0;
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
      if (b[r][c]?.player === 1) p1++;
      if (b[r][c]?.player === 2) p2++;
    }
    return { p1, p2 };
  };

  const checkGameOver = useCallback((b: Board, nextPlayer: 1 | 2) => {
    const { p1, p2 } = countPieces(b);
    if (p1 === 0) { setGameOver(true); setWinner(2); return true; }
    if (p2 === 0) { setGameOver(true); setWinner(1); return true; }
    if (getAllMovesForPlayer(b, nextPlayer).length === 0) {
      setGameOver(true);
      setWinner(nextPlayer === 1 ? 2 : 1);
      return true;
    }
    return false;
  }, []);

  const handleSelect = (row: number, col: number) => {
    if (gameOver || (vsComputer && current === 2)) return;
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

    if (piece.player === 1 && move.toR === 7) newBoard[move.toR][move.toC] = { ...piece, king: true };
    if (piece.player === 2 && move.toR === 0) newBoard[move.toR][move.toC] = { ...piece, king: true };

    setBoard(newBoard);
    setSelected(null);
    setValidMoves([]);
    setMustJump(false);

    setMoveHistory(h => [...h, `${current === 1 ? "🔴" : "⚫"} ${String.fromCharCode(97 + fromC)}${8 - fromR}→${String.fromCharCode(97 + move.toC)}${8 - move.toR}${capturedPiece ? " ✕" : ""}`]);

    const next = current === 1 ? 2 : 1;
    if (!checkGameOver(newBoard, next)) {
      setCurrent(next);
    }
  };

  /* Bot AI effect */
  useEffect(() => {
    if (!vsComputer || current !== 2 || gameOver || !gameStarted || botThinking) return;
    setBotThinking(true);
    botTimeoutRef.current = setTimeout(() => {
      try {
        const move = chooseBotMove(board, difficulty);
        const newBoard = board.map(r => [...r]) as Board;
        const piece = newBoard[move.fromR][move.fromC]!;
        newBoard[move.fromR][move.fromC] = null;
        newBoard[move.toR][move.toC] = piece;
        let capturedPiece = false;
        if (move.jumped) {
          newBoard[move.jumped[0]][move.jumped[1]] = null;
          capturedPiece = true;
          setCaptured(p => ({ ...p, p2: p.p2 + 1 }));
        }
        if (piece.player === 2 && move.toR === 0) newBoard[move.toR][move.toC] = { ...piece, king: true };
        setBoard(newBoard);
        setSelected(null);
        setValidMoves([]);
        setMustJump(false);
        setBotThinking(false);
        setMoveHistory(h => [...h, `⚫ ${String.fromCharCode(97 + move.fromC)}${8 - move.fromR}→${String.fromCharCode(97 + move.toC)}${8 - move.toR}${capturedPiece ? " ✕" : ""}`]);
        if (!checkGameOver(newBoard, 1)) {
          setCurrent(1);
        }
      } catch (err) {
        // Bot has no valid moves or encountered an error — player wins
        console.warn("Bot move error:", err);
        setBotThinking(false);
        setGameOver(true);
        setWinner(1);
      }
    }, 350);
    return () => {
      if (botTimeoutRef.current) clearTimeout(botTimeoutRef.current);
    };
  }, [vsComputer, current, gameOver, gameStarted, botThinking, board, difficulty, checkGameOver]);

  const reset = () => {
    if (botTimeoutRef.current) clearTimeout(botTimeoutRef.current);
    setBoard(initBoard());
    setCurrent(1); setSelected(null); setValidMoves([]);
    setCaptured({ p1: 0, p2: 0 });
    setGameOver(false); setWinner(null); setMustJump(false);
    setMoveHistory([]); setBetPlaced(false); setBet(0);
    setBotThinking(false);
  };

  const startGame = () => {
    reset();
    setGameStarted(true);
  };

  const handleBet = (amount: number) => {
    setBet(amount);
    setBetPlaced(true);
    toast.success(`Aposta de ${amount} moedas colocada!`);
  };

  useEffect(() => {
    if (gameOver && winner && gameStarted) {
      const winScore = 100 + captured[winner === 1 ? "p1" : "p2"] * 20 + (bet || 0);
      const winnerName = winner === 1 ? "Jogador 1" : (vsComputer ? "Computador" : "Jogador 2");
      onScore?.(winnerName, winScore);
      setScores(s => winner === 1 ? { ...s, p1: s.p1 + winScore } : { ...s, p2: s.p2 + winScore });
    }
  }, [gameOver, winner, gameStarted, vsComputer, captured, bet, onScore]);

  const pieces = countPieces(board);

  const diffLabel = difficulty === "facil" ? "Fácil" : difficulty === "medio" ? "Médio" : "Difícil";

  /* Start Screen */
  if (!gameStarted) {
    return (
      <div className="flex flex-col items-center gap-6 py-10">
        <div className="text-6xl">♟️</div>
        <h2 className="text-3xl font-black text-white">Damas</h2>
        <div className="flex gap-3">
          <Button
            onClick={() => setVsComputer(false)}
            className={cn(
              "rounded-xl px-6",
              !vsComputer
                ? "bg-gradient-to-r from-amber-500 to-red-500 text-white"
                : "bg-slate-700 text-slate-300 hover:bg-slate-600"
            )}
          >
            👤 vs Jogador
          </Button>
          <Button
            onClick={() => setVsComputer(true)}
            className={cn(
              "rounded-xl px-6",
              vsComputer
                ? "bg-gradient-to-r from-violet-500 to-purple-600 text-white"
                : "bg-slate-700 text-slate-300 hover:bg-slate-600"
            )}
          >
            <Bot className="h-4 w-4 mr-2" />vs Computador
          </Button>
        </div>
        <AnimatePresence>
          {vsComputer && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="flex flex-col items-center gap-2"
            >
              <p className="text-sm text-slate-400">Dificuldade:</p>
              <div className="flex gap-2">
                {(["facil", "medio", "dificil"] as Difficulty[]).map(d => (
                  <Button
                    key={d}
                    size="sm"
                    onClick={() => setDifficulty(d)}
                    className={cn(
                      "rounded-xl",
                      difficulty === d
                        ? "bg-amber-500 hover:bg-amber-600 text-white"
                        : "bg-slate-700 text-slate-400 hover:bg-slate-600"
                    )}
                  >
                    {d === "facil" ? "Fácil" : d === "medio" ? "Médio" : "Difícil"}
                  </Button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <Button
          onClick={startGame}
          className="bg-gradient-to-r from-amber-500 to-red-500 text-white rounded-xl px-10 text-lg font-bold"
        >
          Iniciar Jogo
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-amber-900/30 to-red-900/30 border border-amber-500/20">
        <div className="text-center flex-1">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <div className="w-4 h-4 rounded-full bg-red-500 shadow-lg shadow-red-500/50" />
            <span className={cn("text-sm font-black", current === 1 && !gameOver && "text-red-400")}>Jogador 1</span>
          </div>
          <p className="text-2xl font-black text-white">{scores.p1}</p>
          <p className="text-[10px] text-slate-500">{pieces.p1} peças · {captured.p1} capturas</p>
        </div>
        <div className="text-center px-4">
          <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs">DAMAS</Badge>
          {betPlaced && (
            <p className="text-[10px] text-amber-400 mt-1 flex items-center justify-center gap-1">
              <Coins className="h-3 w-3" /> Aposta: {bet}
            </p>
          )}
          {vsComputer && (
            <p className="text-[10px] text-violet-400 mt-1 flex items-center justify-center gap-1">
              <Bot className="h-3 w-3" /> {diffLabel}
            </p>
          )}
        </div>
        <div className="text-center flex-1">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            {vsComputer ? (
              <Bot className="h-4 w-4 text-violet-400" />
            ) : (
              <div className="w-4 h-4 rounded-full bg-slate-800 shadow-lg shadow-slate-500/50 border border-slate-600" />
            )}
            <span className={cn("text-sm font-black", current === 2 && !gameOver && "text-slate-300")}>
              {vsComputer ? "Computador" : "Jogador 2"}
            </span>
          </div>
          <p className="text-2xl font-black text-white">{scores.p2}</p>
          <p className="text-[10px] text-slate-500">{pieces.p2} peças · {captured.p2} capturas</p>
        </div>
      </div>

      {!gameOver && (
        <div className="text-center">
          {botThinking ? (
            <Badge className="bg-violet-500/20 text-violet-400 text-sm animate-pulse">
              <Bot className="h-3.5 w-3.5 mr-1" />Computador pensando...
            </Badge>
          ) : (
            <Badge className={cn("text-sm", current === 1 ? "bg-red-500/20 text-red-400" : "bg-slate-700 text-slate-300")}>
              Vez de {current === 1 ? "Jogador 1" : (vsComputer ? "Computador" : "Jogador 2")} {mustJump && "· Deve capturar!"}
            </Badge>
          )}
        </div>
      )}

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

      {gameOver ? (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-3">
          <div className="text-5xl">🏆</div>
          <h3 className="text-xl font-black text-white">
            {winner === 1 ? "Jogador 1" : (vsComputer ? "Computador" : "Jogador 2")} Venceu!
          </h3>
          <div className="flex gap-2 justify-center">
            <Button
              onClick={reset}
              className="bg-gradient-to-r from-amber-500 to-red-500 text-white rounded-xl"
            >
              <RotateCcw className="h-4 w-4 mr-2" />Jogar Novamente
            </Button>
            <Button onClick={() => { reset(); setGameStarted(false); }} variant="outline" className="rounded-xl">
              Menu
            </Button>
          </div>
        </motion.div>
      ) : (
        <div className="flex flex-wrap gap-2 justify-center">
          {[10, 25, 50, 100].map(v => (
            <Button
              key={v}
              size="sm"
              variant={bet === v && betPlaced ? "default" : "outline"}
              className={cn("rounded-xl", bet === v && betPlaced ? "bg-amber-500 hover:bg-amber-600" : "")}
              onClick={() => handleBet(v)}
            >
              <Coins className="h-3 w-3 mr-1" />{v}
            </Button>
          ))}
          <Button
            size="sm"
            variant="outline"
            className="rounded-xl"
            onClick={() => { reset(); setGameStarted(false); }}
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default CheckersGame;
