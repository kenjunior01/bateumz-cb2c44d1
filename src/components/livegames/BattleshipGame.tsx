import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RotateCcw, Crosshair, Ship, Coins, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  onScore?: (name: string, score: number) => void;
  liveCode?: string;
}

type Difficulty = "facil" | "medio" | "dificil";
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

/* ===== AI Helpers ===== */

const getEmptyCells = (attack: Board): [number, number][] => {
  const cells: [number, number][] = [];
  for (let r = 0; r < GRID; r++)
    for (let c = 0; c < GRID; c++)
      if (attack[r][c] === "empty") cells.push([r, c]);
  return cells;
};

const getAdjacentEmpty = (attack: Board, r: number, c: number): [number, number][] => {
  const result: [number, number][] = [];
  for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as const) {
    const nr = r + dr, nc = c + dc;
    if (nr >= 0 && nr < GRID && nc >= 0 && nc < GRID && attack[nr][nc] === "empty") {
      result.push([nr, nc]);
    }
  }
  return result;
};

const computeProbMap = (attack: Board): number[][] => {
  const prob: number[][] = Array.from({ length: GRID }, () => Array(GRID).fill(0));

  for (const ship of SHIPS) {
    /* Horizontal placements */
    for (let r = 0; r < GRID; r++) {
      for (let c = 0; c <= GRID - ship.size; c++) {
        let valid = true;
        let hasEmpty = false;
        for (let i = 0; i < ship.size; i++) {
          const cell = attack[r][c + i];
          if (cell === "miss") { valid = false; break; }
          if (cell === "empty") hasEmpty = true;
        }
        if (valid && hasEmpty) {
          for (let i = 0; i < ship.size; i++) {
            if (attack[r][c + i] === "empty") prob[r][c + i]++;
          }
        }
      }
    }
    /* Vertical placements */
    for (let r = 0; r <= GRID - ship.size; r++) {
      for (let c = 0; c < GRID; c++) {
        let valid = true;
        let hasEmpty = false;
        for (let i = 0; i < ship.size; i++) {
          const cell = attack[r + i][c];
          if (cell === "miss") { valid = false; break; }
          if (cell === "empty") hasEmpty = true;
        }
        if (valid && hasEmpty) {
          for (let i = 0; i < ship.size; i++) {
            if (attack[r + i][c] === "empty") prob[r + i][c]++;
          }
        }
      }
    }
  }

  /* Boost cells adjacent to existing hits (targeting focus) */
  for (let r = 0; r < GRID; r++) {
    for (let c = 0; c < GRID; c++) {
      if (attack[r][c] === "hit") {
        for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as const) {
          const nr = r + dr, nc = c + dc;
          if (nr >= 0 && nr < GRID && nc >= 0 && nc < GRID && attack[nr][nc] === "empty") {
            prob[nr][nc] += 10;
          }
        }
      }
    }
  }

  return prob;
};

const pickHighestProb = (prob: number[][], attack: Board): [number, number] | undefined => {
  let maxVal = -1;
  let bestCells: [number, number][] = [];
  for (let r = 0; r < GRID; r++) {
    for (let c = 0; c < GRID; c++) {
      if (prob[r][c] > maxVal) {
        maxVal = prob[r][c];
        bestCells = [[r, c]];
      } else if (prob[r][c] === maxVal && maxVal > 0) {
        bestCells.push([r, c]);
      }
    }
  }
  if (bestCells.length > 0) {
    return bestCells[Math.floor(Math.random() * bestCells.length)];
  }
  // Fallback: pick a random empty cell
  const empty = getEmptyCells(attack);
  return empty.length > 0 ? empty[Math.floor(Math.random() * empty.length)] : undefined;
};

/* ===== End AI Helpers ===== */

const BattleshipGame = ({ onScore, liveCode }: Props) => {
  const [gameStarted, setGameStarted] = useState(false);
  const [vsComputer, setVsComputer] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty>("medio");
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
  const [botThinking, setBotThinking] = useState(false);
  const botTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const botTargetRef = useRef<{ stack: [number, number][] }>({ stack: [] });
  const botActiveRef = useRef(false);

  const countShips = (b: Board) => {
    let total = 0, hits = 0;
    for (let r = 0; r < GRID; r++) for (let c = 0; c < GRID; c++) {
      if (b[r][c] === "ship") total++;
      if (b[r][c] === "hit") hits++;
    }
    return { total, hits, remaining: total - hits };
  };

  const fire = (row: number, col: number) => {
    if (gameOver || (vsComputer && current === 2)) return;
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
      const winnerName = current === 1 ? "Jogador 1" : (vsComputer ? "Computador" : "Jogador 2");
      onScore?.(winnerName, winScore);
      setScores(s => current === 1 ? { ...s, p1: s.p1 + winScore } : { ...s, p2: s.p2 + winScore });
      setShowEnemy(true);
      return;
    }

    setCurrent(current === 1 ? 2 : 1);
    setTurnCount(t => t + 1);
  };

  /* Bot AI effect */
  useEffect(() => {
    if (!vsComputer || current !== 2 || gameOver || !gameStarted || botActiveRef.current) return;
    botActiveRef.current = true;
    setBotThinking(true);
    botTimeoutRef.current = setTimeout(() => {
      try {
        const attack = p2Attack.map(r => [...r]) as Board;
        const enemy = p1Board.map(r => [...r]) as Board;
        const target = botTargetRef.current;

        let targetR: number, targetC: number;

        if (difficulty === "facil") {
          /* Random shot */
          const empty = getEmptyCells(attack);
          if (empty.length === 0) { botActiveRef.current = false; setBotThinking(false); return; }
          const pick = empty[Math.floor(Math.random() * empty.length)];
          targetR = pick[0];
          targetC = pick[1];
        } else if (difficulty === "medio") {
          /* Hunt / Target mode */
          let found = false;
          /* Try targets from stack first */
          while (target.stack.length > 0) {
            const [sr, sc] = target.stack[target.stack.length - 1];
            if (attack[sr][sc] === "empty") {
              targetR = sr;
              targetC = sc;
              found = true;
              break;
            }
            target.stack.pop();
          }
          if (!found) {
            /* Hunt mode: checkerboard parity */
            const empty = getEmptyCells(attack);
            if (empty.length === 0) { botActiveRef.current = false; setBotThinking(false); return; }
            const checker = empty.filter(([r, c]) => (r + c) % 2 === 0);
            const pool = checker.length > 0 ? checker : empty;
            const pick = pool[Math.floor(Math.random() * pool.length)];
            targetR = pick[0];
            targetC = pick[1];
          }
        } else {
          /* Difícil: probability density map */
          const prob = computeProbMap(attack);
          const pick = pickHighestProb(prob, attack);
          if (!pick) { botActiveRef.current = false; setBotThinking(false); return; }
          targetR = pick[0];
          targetC = pick[1];
        }

        /* Resolve the shot */
        const isHit = enemy[targetR][targetC] === "ship";
        attack[targetR][targetC] = isHit ? "hit" : "miss";
        if (isHit) enemy[targetR][targetC] = "hit";

        setP2Attack(attack);
        setP1Board(enemy);

        /* Update targeting for Médio */
        if (difficulty === "medio" && isHit) {
          const adj = getAdjacentEmpty(attack, targetR, targetC);
          for (const cell of adj) {
            target.stack.push(cell);
          }
        }

        /* Check game over */
        const remaining = countShips(enemy).remaining;
        if (remaining === 0) {
          setGameOver(true);
          setWinner(2);
          botActiveRef.current = false;
          setBotThinking(false);
          setShowEnemy(true);
          const winScore = 200 + (bet || 0);
          onScore?.("Computador", winScore);
          setScores(s => ({ ...s, p2: s.p2 + winScore }));
          return;
        }

        setCurrent(1);
        setTurnCount(t => t + 1);
      } catch {
        // Safety fallback: if AI throws, end turn
        console.warn("Battleship bot error");
      }
      botActiveRef.current = false;
      setBotThinking(false);
    }, 500);
    return () => {
      if (botTimeoutRef.current) clearTimeout(botTimeoutRef.current);
    };
  }, [vsComputer, current, gameOver, gameStarted, p1Board, p2Attack, difficulty, bet, onScore]);

  const reset = () => {
    if (botTimeoutRef.current) clearTimeout(botTimeoutRef.current);
    setP1Board(placeShipsRandom(emptyBoard()));
    setP2Board(placeShipsRandom(emptyBoard()));
    setP1Attack(emptyBoard()); setP2Attack(emptyBoard());
    setCurrent(1); setGameOver(false); setWinner(null);
    setTurnCount(0); setShowEnemy(false); setBet(0);
    setBotThinking(false);
    botActiveRef.current = false;
    botTargetRef.current = { stack: [] };
  };

  const startGame = () => {
    reset();
    setGameStarted(true);
  };

  const myAttack = current === 1 ? p1Attack : p2Attack;
  const myBoard = current === 1 ? p1Board : p2Board;
  const enemyShips = countShips(current === 1 ? p2Board : p1Board);
  const myShips = countShips(myBoard);

  const diffLabel = difficulty === "facil" ? "Fácil" : difficulty === "medio" ? "Médio" : "Difícil";

  /* Start Screen */
  if (!gameStarted) {
    return (
      <div className="flex flex-col items-center gap-6 py-10">
        <div className="text-6xl">🚢</div>
        <h2 className="text-3xl font-black text-white">Batalha Naval</h2>
        <div className="flex gap-3">
          <Button
            onClick={() => setVsComputer(false)}
            className={cn(
              "rounded-xl px-6",
              !vsComputer
                ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white"
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
                        ? "bg-blue-500 hover:bg-blue-600 text-white"
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
          className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl px-10 text-lg font-bold"
        >
          Iniciar Batalha
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-slate-800 to-blue-900/30 border border-blue-500/20">
        <div className="text-center flex-1">
          <span className={cn("text-sm font-black", current === 1 && !gameOver && "text-cyan-400")}>
            🚢 Jogador 1
          </span>
          <p className="text-xl font-black text-white">{scores.p1}</p>
        </div>
        <div className="text-center px-3">
          <Badge className="bg-slate-700 text-slate-300">BATALHA NAVAL</Badge>
          <p className="text-[10px] text-slate-500 mt-1">Turno {turnCount + 1}</p>
          {bet > 0 && <p className="text-[10px] text-amber-400"><Coins className="h-3 w-3 inline mr-1" />{bet}</p>}
          {vsComputer && (
            <p className="text-[10px] text-violet-400 mt-0.5 flex items-center justify-center gap-1">
              <Bot className="h-3 w-3" /> {diffLabel}
            </p>
          )}
        </div>
        <div className="text-center flex-1">
          <span className={cn("text-sm font-black", current === 2 && !gameOver && "text-rose-400")}>
            {vsComputer ? (
              <span className="flex items-center justify-center gap-1">
                <Bot className="h-4 w-4 text-violet-400" />Computador
              </span>
            ) : (
              <span>🚢 Jogador 2</span>
            )}
          </span>
          <p className="text-xl font-black text-white">{scores.p2}</p>
        </div>
      </div>

      {!gameOver && (
        <div className="flex justify-center gap-4">
          {botThinking ? (
            <Badge className="bg-violet-500/20 text-violet-400 animate-pulse">
              <Bot className="h-3.5 w-3.5 mr-1" />Computador atacando...
            </Badge>
          ) : (
            <>
              <Badge className="bg-cyan-500/20 text-cyan-400">
                Vez de {current === 1 ? "Jogador 1" : (vsComputer ? "Computador" : "Jogador 2")}
              </Badge>
              <Badge className="bg-slate-700 text-slate-400">Inimigo: {enemyShips.remaining} navios</Badge>
              <Badge className="bg-slate-700 text-amber-400">Meus: {myShips.remaining} navios</Badge>
            </>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-2 text-center">
            Meu Tabuleiro ({myShips.remaining} restantes)
          </p>
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
                  disabled={gameOver || cell !== "empty" || (vsComputer && current === 2)}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className={cn(
                    "w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center text-xs transition-all",
                    cell === "empty" && !gameOver && !(vsComputer && current === 2) && "bg-slate-800/80 hover:bg-cyan-900/50 cursor-crosshair",
                    cell === "empty" && (gameOver || (vsComputer && current === 2)) && "bg-slate-800/80",
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

      <div className="flex flex-wrap gap-2 justify-center">
        {[10, 25, 50, 100].map(v => (
          <Button
            key={v}
            size="sm"
            variant={bet === v ? "default" : "outline"}
            className={cn("rounded-xl text-xs", bet === v && "bg-amber-500")}
            onClick={() => setBet(v)}
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

      {gameOver && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-3">
          <div className="text-5xl">🏆</div>
          <h3 className="text-xl font-black text-white">
            {winner === 1 ? "Jogador 1" : (vsComputer ? "Computador" : "Jogador 2")} Afundou Toda a Frota!
          </h3>
          <div className="flex gap-2 justify-center">
            <Button
              onClick={reset}
              className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl"
            >
              <RotateCcw className="h-4 w-4 mr-2" />Nova Batalha
            </Button>
            <Button onClick={() => { reset(); setGameStarted(false); }} variant="outline" className="rounded-xl">
              Menu
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default BattleshipGame;
