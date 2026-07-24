import { useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { RotateCcw, Crosshair, Ship, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  onScore?: (name: string, score: number) => void;
  liveCode?: string;
}

const GRID = 8;
type Cell = "empty" | "ship" | "hit" | "miss";
type Board = Cell[][];

const SHIPS = [
  { name: "Porta-aviões", size: 5 },
  { name: "Couraçado", size: 4 },
  { name: "Cruzador", size: 3 },
  { name: "Submarino", size: 3 },
  { name: "Destrutor", size: 2 },
];

const emptyBoard = (): Board =>
  Array.from({ length: GRID }, () => Array(GRID).fill("empty") as Cell[]);

const placeShipsRandom = (b: Board): Board => {
  const board = b.map(r => [...r]);
  for (const ship of SHIPS) {
    let placed = false;
    let attempts = 0;
    while (!placed && attempts < 200) {
      attempts++;
      const horizontal = Math.random() > 0.5;
      const row = Math.floor(Math.random() * GRID);
      const col = Math.floor(Math.random() * GRID);
      let fits = true;
      for (let i = 0; i < ship.size; i++) {
        const r = horizontal ? row : row + i;
        const c = horizontal ? col + i : col;
        if (r >= GRID || c >= GRID || board[r][c] !== "empty") { fits = false; break; }
      }
      if (fits) {
        for (let i = 0; i < ship.size; i++) {
          const r = horizontal ? row : row + i;
          const c = horizontal ? col + i : col;
          board[r][c] = "ship";
        }
        placed = true;
      }
    }
  }
  return board;
};

const BattleshipGame = ({ onScore, liveCode }: Props) => {
  const [p1Board, setP1Board] = useState<Board>(() => placeShipsRandom(emptyBoard()));
  const [p2Board, setP2Board] = useState<Board>(() => placeShipsRandom(emptyBoard()));
  const [p1Attack, setP1Attack] = useState<Board>(emptyBoard());
  const [p2Attack, setP2Attack] = useState<Board>(emptyBoard());
  const [current, setCurrent] = useState<1 | 2>(1);
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState<1 | 2 | null>(null);
  const [scores, setScores] = useState({ p1: 0, p2: 0 });
  const [bet, setBet] = useState(0);
  const [turnCount, setTurnCount] = useState(0);
  const [showEnemy, setShowEnemy] = useState(false);

  const countShips = (b: Board) => {
    let total = 0, hits = 0;
    for (let r = 0; r < GRID; r++) for (let c = 0; c < GRID; c++) {
      if (b[r][c] === "ship") total++;
      if (b[r][c] === "hit") hits++;
    }
    return { total, hits, remaining: total - hits };
  };

  const fire = (row: number, col: number) => {
    if (gameOver) return;
    const attackBoard = current === 1 ? p1Attack : p2Attack;
    if (attackBoard[row][col] !== "empty") { toast.error("Já atacou aqui!"); return; }

    const enemyBoard = current === 1 ? p2Board : p1Board;
    const newAttack = attackBoard.map(r => [...r]) as Board;
    const newEnemy = enemyBoard.map(r => [...r]) as Board;

    if (enemyBoard[row][col] === "ship") {
      newAttack[row][col] = "hit";
      newEnemy[row][col] = "hit";
      toast.success("💥 Acertou!");
    } else {
      newAttack[row][col] = "miss";
      toast.info("💧 Água!");
    }

    if (current === 1) { setP1Attack(newAttack); setP2Board(newEnemy); }
    else { setP2Attack(newAttack); setP1Board(newEnemy); }

    const remaining = countShips(newEnemy).remaining;
    if (remaining === 0) {
      setGameOver(true);
      setWinner(current);
      const winScore = 200 + (bet || 0);
      onScore?.(current === 1 ? "Jogador 1" : "Jogador 2", winScore);
      setScores(s => current === 1 ? { ...s, p1: s.p1 + winScore } : { ...s, p2: s.p2 + winScore });
      setShowEnemy(true);
      return;
    }

    setCurrent(current === 1 ? 2 : 1);
    setTurnCount(t => t + 1);
  };

  const reset = () => {
    setP1Board(placeShipsRandom(emptyBoard()));
    setP2Board(placeShipsRandom(emptyBoard()));
    setP1Attack(emptyBoard()); setP2Attack(emptyBoard());
    setCurrent(1); setGameOver(false); setWinner(null);
    setTurnCount(0); setShowEnemy(false);
  };

  const myAttack = current === 1 ? p1Attack : p2Attack;
  const myBoard = current === 1 ? p1Board : p2Board;
  const enemyShips = countShips(current === 1 ? p2Board : p1Board);
  const myShips = countShips(myBoard);

  return (
    <div className="space-y-4">
      {/* Scoreboard */}
      <div className="flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-slate-800 to-blue-900/30 border border-blue-500/20">
        <div className="text-center flex-1">
          <span className={cn("text-sm font-black", current === 1 && !gameOver && "text-cyan-400")}>🚢 Jogador 1</span>
          <p className="text-xl font-black text-white">{scores.p1}</p>
        </div>
        <div className="text-center px-3">
          <Badge className="bg-slate-700 text-slate-300">BATALHA NAVAL</Badge>
          <p className="text-[10px] text-slate-500 mt-1">Turno {turnCount + 1}</p>
          {bet > 0 && <p className="text-[10px] text-amber-400"><Coins className="h-3 w-3 inline mr-1" />{bet}</p>}
        </div>
        <div className="text-center flex-1">
          <span className={cn("text-sm font-black", current === 2 && !gameOver && "text-rose-400")}>🚢 Jogador 2</span>
          <p className="text-xl font-black text-white">{scores.p2}</p>
        </div>
      </div>

      {!gameOver && (
        <div className="flex justify-center gap-4">
          <Badge className="bg-cyan-500/20 text-cyan-400">Vez de Jogador {current}</Badge>
          <Badge className="bg-slate-700 text-slate-400">Inimigo: {enemyShips.remaining} navios</Badge>
          <Badge className="bg-slate-700 text-amber-400">Meus: {myShips.remaining} navios</Badge>
        </div>
      )}

      {/* Boards side by side on desktop, stacked on mobile */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* My board (show ships) */}
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-2 text-center">Meu Tabuleiro ({myShips.remaining} restantes)</p>
          <div className="grid grid-cols-8 gap-0.5 mx-auto w-fit rounded-xl overflow-hidden shadow-lg border border-slate-700">
            {myBoard.flatMap((row, r) =>
              row.map((cell, c) => (
                <div key={`${r}-${c}`} className={cn(
                  "w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center text-xs",
                  cell === "ship" && "bg-slate-600",
                  cell === "hit" && "bg-red-500/60",
                  cell === "empty" && "bg-slate-800/80"
                )}>
                  {cell === "ship" && <Ship className="h-3.5 w-3.5 text-slate-300" />}
                  {cell === "hit" && <span className="text-red-200">✕</span>}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Enemy board (attack grid) */}
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-2 text-center flex items-center justify-center gap-1">
            <Crosshair className="h-3 w-3" /> Ataque ao Inimigo
          </p>
          <div className="grid grid-cols-8 gap-0.5 mx-auto w-fit rounded-xl overflow-hidden shadow-lg border border-slate-700">
            {(gameOver && showEnemy ? (current === 1 ? p2Board : p1Board) : myAttack).flatMap((row, r) =>
              row.map((cell, c) => (
                <motion.button
                  key={`${r}-${c}`}
                  onClick={() => fire(r, c)}
                  disabled={gameOver || cell !== "empty"}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className={cn(
                    "w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center text-xs transition-all",
                    cell === "empty" && "bg-slate-800/80 hover:bg-cyan-900/50 cursor-crosshair",
                    cell === "hit" && "bg-red-500/60",
                    cell === "miss" && "bg-blue-900/40",
                    cell === "ship" && gameOver && "bg-slate-600",
                  )}
                >
                  {cell === "hit" && <span>💥</span>}
                  {cell === "miss" && <span className="text-blue-400/50">·</span>}
                  {cell === "ship" && gameOver && <Ship className="h-3 w-3 text-slate-300" />}
                </motion.button>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-2 justify-center">
        {[10, 25, 50, 100].map(v => (
          <Button key={v} size="sm" variant={bet === v ? "default" : "outline"} className={cn("rounded-xl text-xs", bet === v && "bg-amber-500")}
            onClick={() => setBet(v)}><Coins className="h-3 w-3 mr-1" />{v}</Button>
        ))}
        <Button size="sm" variant="outline" className="rounded-xl" onClick={reset}><RotateCcw className="h-3.5 w-3.5" /></Button>
      </div>

      {gameOver && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-3">
          <div className="text-5xl">🏆</div>
          <h3 className="text-xl font-black text-white">Jogador {winner} Afundou Toda a Frota!</h3>
          <Button onClick={reset} className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl"><RotateCcw className="h-4 w-4 mr-2" />Nova Batalha</Button>
        </motion.div>
      )}
    </div>
  );
};

export default BattleshipGame;
