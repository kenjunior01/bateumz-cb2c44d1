import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RotateCcw, ArrowDown, ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface NumberTetrisProps {
  onScore?: (name: string, score: number) => void;
  liveCode?: string;
}

const ROWS = 10;
const COLS = 5;

type Board = number[][];

interface FallingPiece {
  value: number;
  col: number;
  row: number;
}

interface ScorePopup {
  id: number;
  value: number;
  row: number;
  col: number;
}

interface PlayerState {
  board: Board;
  piece: FallingPiece | null;
  score: number;
  gameOver: boolean;
  mergedCells: Set<string>;
  popups: ScorePopup[];
  accum: number;
}

const CELL_COLORS: Record<number, string> = {
  2: "bg-slate-600 text-white",
  4: "bg-slate-500 text-white",
  8: "bg-orange-700 text-white",
  16: "bg-orange-600 text-white",
  32: "bg-orange-500 text-white",
  64: "bg-red-600 text-white",
  128: "bg-red-500 text-white",
  256: "bg-yellow-600 text-white",
  512: "bg-yellow-500 text-white",
  1024: "bg-emerald-600 text-white",
  2048: "bg-emerald-500 text-white",
};

function getCellColor(value: number): string {
  return CELL_COLORS[value] || "bg-purple-600 text-white";
}

function getCellTextClass(value: number): string {
  if (value >= 1024) return "text-[8px] sm:text-[10px]";
  if (value >= 128) return "text-[9px] sm:text-xs";
  return "text-xs sm:text-sm";
}

function createBoard(): Board {
  return Array.from({ length: ROWS }, () => Array<number>(COLS).fill(0));
}

function spawnPiece(board: Board): FallingPiece | null {
  const available: number[] = [];
  for (let c = 0; c < COLS; c++) {
    if (board[0][c] === 0) available.push(c);
  }
  if (available.length === 0) return null;
  const col = available[Math.floor(Math.random() * available.length)];
  const values = [2, 2, 2, 4, 4, 8];
  const value = values[Math.floor(Math.random() * values.length)];
  return { value, col, row: 0 };
}

function createInitialState(): PlayerState {
  const board = createBoard();
  const piece = spawnPiece(board);
  return {
    board,
    piece,
    score: 0,
    gameOver: piece === null,
    mergedCells: new Set(),
    popups: [],
    accum: 0,
  };
}

function canPlace(board: Board, row: number, col: number): boolean {
  return (
    row >= 0 && row < ROWS && col >= 0 && col < COLS && board[row][col] === 0
  );
}

function processMerges(board: Board): {
  board: Board;
  scoreGain: number;
  mergedCells: Set<string>;
} {
  const b = board.map((r) => [...r]);
  let scoreGain = 0;
  const mergedCells = new Set<string>();
  let changed = true;

  while (changed) {
    changed = false;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS - 1; c++) {
        if (b[r][c] !== 0 && b[r][c] === b[r][c + 1]) {
          const newVal = b[r][c] * 2;
          b[r][c] = newVal;
          b[r][c + 1] = 0;
          scoreGain += newVal;
          mergedCells.add(`${r}-${c}`);
          changed = true;
        }
      }
    }
  }

  return { board: b, scoreGain, mergedCells };
}

function getSpeed(score: number): number {
  return Math.max(180, 750 - score * 0.3);
}

function landPiece(player: PlayerState): PlayerState {
  if (!player.piece) return player;

  const newBoard = player.board.map((r) => [...r]);
  newBoard[player.piece.row][player.piece.col] = player.piece.value;

  const { board: mergedBoard, scoreGain, mergedCells } = processMerges(newBoard);

  const newPiece = spawnPiece(mergedBoard);
  const isGameOver = newPiece === null;

  const newPopups: ScorePopup[] =
    scoreGain > 0
      ? [
          ...player.popups,
          {
            id: Date.now() + Math.random(),
            value: scoreGain,
            row: player.piece.row,
            col: player.piece.col,
          },
        ]
      : player.popups;

  return {
    board: mergedBoard,
    piece: newPiece,
    score: player.score + scoreGain,
    gameOver: isGameOver,
    mergedCells,
    popups: newPopups,
    accum: 0,
  };
}

function tickPlayer(player: PlayerState): PlayerState {
  if (player.gameOver || !player.piece) return player;

  const newRow = player.piece.row + 1;
  if (canPlace(player.board, newRow, player.piece.col)) {
    return {
      ...player,
      piece: { ...player.piece, row: newRow },
      accum: 0,
    };
  }

  return landPiece(player);
}

function movePlayer(player: PlayerState, dir: -1 | 1): PlayerState {
  if (player.gameOver || !player.piece) return player;
  const newCol = player.piece.col + dir;
  if (newCol < 0 || newCol >= COLS) return player;
  if (!canPlace(player.board, player.piece.row, newCol)) return player;
  return { ...player, piece: { ...player.piece, col: newCol } };
}

function fastDropPlayer(player: PlayerState): PlayerState {
  if (player.gameOver || !player.piece) return player;
  let row = player.piece.row;
  while (canPlace(player.board, row + 1, player.piece.col)) {
    row++;
  }
  if (row === player.piece.row) {
    return landPiece(player);
  }
  return landPiece({ ...player, piece: { ...player.piece, row } });
}

function PlayerBoard({
  player,
  label,
  accent,
  borderAccent,
  glowAccent,
  onMoveLeft,
  onMoveRight,
  onFastDrop,
}: {
  player: PlayerState;
  label: string;
  accent: string;
  borderAccent: string;
  glowAccent: string;
  onMoveLeft: () => void;
  onMoveRight: () => void;
  onFastDrop: () => void;
}) {
  const popupMap = new Map<string, ScorePopup>();
  for (const p of player.popups) {
    popupMap.set(`${p.row}-${p.col}`, p);
  }

  return (
    <div className={cn("rounded-xl p-2 sm:p-3 border bg-black/30", borderAccent)}>
      <div className={cn("text-xs sm:text-sm font-bold mb-1.5 text-center", accent)}>
        {label}
      </div>

      <div className={cn("text-center mb-2", accent)}>
        <span className="text-[10px] sm:text-xs opacity-70">Pontos: </span>
        <span className={cn("text-lg sm:text-xl font-black tabular-nums", glowAccent)}>
          {player.score}
        </span>
      </div>

      <div className="relative overflow-visible">
        <div
          className="grid gap-[2px]"
          style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }}
        >
          {Array.from({ length: ROWS }, (_, r) =>
            Array.from({ length: COLS }, (_, c) => {
              const isFalling =
                player.piece &&
                player.piece.row === r &&
                player.piece.col === c;
              const cellValue = isFalling
                ? player.piece!.value
                : player.board[r][c];
              const isMerged = player.mergedCells.has(`${r}-${c}`);
              const popup = popupMap.get(`${r}-${c}`);

              return (
                <div key={`${r}-${c}`} className="relative">
                  <motion.div
                    animate={
                      isMerged
                        ? { scale: [1, 1.35, 1] }
                        : { scale: 1 }
                    }
                    transition={{
                      duration: 0.3,
                      ease: "easeOut",
                    }}
                    className={cn(
                      "w-10 h-10 sm:w-12 sm:h-12 rounded-md flex items-center justify-center font-bold border transition-colors duration-150",
                      cellValue === 0
                        ? "bg-white/[0.04] border-white/[0.06]"
                        : cn(
                            getCellColor(cellValue),
                            "border-white/20 shadow-sm"
                          ),
                      getCellTextClass(cellValue)
                    )}
                  >
                    {cellValue > 0 ? cellValue : ""}
                  </motion.div>

                  <AnimatePresence>
                    {popup && (
                      <motion.div
                        key={popup.id}
                        initial={{
                          opacity: 1,
                          y: 4,
                          scale: 0.7,
                        }}
                        animate={{
                          opacity: 0,
                          y: -18,
                          scale: 1.15,
                        }}
                        exit={{ opacity: 0 }}
                        transition={{
                          duration: 0.9,
                          ease: "easeOut",
                        }}
                        className="absolute inset-x-0 top-0 flex justify-center pointer-events-none z-20"
                      >
                        <span className="text-yellow-400 font-extrabold text-[10px] sm:text-xs drop-shadow-[0_0_6px_rgba(0,0,0,0.9)]">
                          +{popup.value}
                        </span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })
          )}
        </div>

        <AnimatePresence>
          {player.popups.length > 0 && (
            <motion.div
              key={player.popups[player.popups.length - 1].id}
              initial={{ opacity: 0, scale: 0.4, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.7, y: -8 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none"
            >
              <span
                className={cn(
                  "text-base sm:text-lg font-black tracking-wide",
                  accent,
                  "drop-shadow-[0_0_12px_rgba(255,255,255,0.25)]"
                )}
              >
                Combinacao!
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {player.gameOver && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0 bg-black/75 rounded-md flex flex-col items-center justify-center z-40 backdrop-blur-[2px]"
          >
            <span className="text-red-400 font-black text-lg sm:text-xl">
              Game Over
            </span>
            <span className="text-white/50 text-xs sm:text-sm mt-1">
              Pontos: {player.score}
            </span>
          </motion.div>
        )}
      </div>

      <div className="flex items-center justify-center gap-1.5 mt-2.5 sm:mt-3">
        <Button
          variant="outline"
          size="icon"
          className={cn(
            "h-9 w-9 sm:h-10 sm:w-10",
            borderAccent,
            accent
          )}
          onTouchStart={(e) => {
            e.preventDefault();
            onMoveLeft();
          }}
          onMouseDown={onMoveLeft}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className={cn(
            "h-9 w-9 sm:h-10 sm:w-10",
            borderAccent,
            accent
          )}
          onTouchStart={(e) => {
            e.preventDefault();
            onFastDrop();
          }}
          onMouseDown={onFastDrop}
        >
          <ArrowDown className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className={cn(
            "h-9 w-9 sm:h-10 sm:w-10",
            borderAccent,
            accent
          )}
          onTouchStart={(e) => {
            e.preventDefault();
            onMoveRight();
          }}
          onMouseDown={onMoveRight}
        >
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

export default function NumberTetris({
  onScore,
  liveCode: _liveCode,
}: NumberTetrisProps) {
  const [p1, setP1] = useState<PlayerState>(createInitialState);
  const [p2, setP2] = useState<PlayerState>(createInitialState);
  const lastTimeRef = useRef(Date.now());
  const scoreCalledRef = useRef({ p1: false, p2: false });

  const resetAll = useCallback(() => {
    scoreCalledRef.current = { p1: false, p2: false };
    lastTimeRef.current = Date.now();
    setP1(createInitialState());
    setP2(createInitialState());
  }, []);

  const p1Left = useCallback(() => setP1((p) => movePlayer(p, -1)), []);
  const p1Right = useCallback(() => setP1((p) => movePlayer(p, 1)), []);
  const p1Drop = useCallback(() => setP1((p) => fastDropPlayer(p)), []);
  const p2Left = useCallback(() => setP2((p) => movePlayer(p, -1)), []);
  const p2Right = useCallback(() => setP2((p) => movePlayer(p, 1)), []);
  const p2Drop = useCallback(() => setP2((p) => fastDropPlayer(p)), []);

  useEffect(() => {
    if (p1.popups.length > 0) {
      const t = setTimeout(() => {
        setP1((prev) => ({
          ...prev,
          popups: [],
          mergedCells: new Set(),
        }));
      }, 900);
      return () => clearTimeout(t);
    }
  }, [p1.popups.length]);

  useEffect(() => {
    if (p2.popups.length > 0) {
      const t = setTimeout(() => {
        setP2((prev) => ({
          ...prev,
          popups: [],
          mergedCells: new Set(),
        }));
      }, 900);
      return () => clearTimeout(t);
    }
  }, [p2.popups.length]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const dt = now - lastTimeRef.current;
      lastTimeRef.current = now;

      setP1((prev) => {
        if (prev.gameOver || !prev.piece) return prev;
        const speed = getSpeed(prev.score);
        const newAccum = prev.accum + dt;
        if (newAccum >= speed) {
          return tickPlayer(prev);
        }
        return { ...prev, accum: newAccum };
      });

      setP2((prev) => {
        if (prev.gameOver || !prev.piece) return prev;
        const speed = getSpeed(prev.score);
        const newAccum = prev.accum + dt;
        if (newAccum >= speed) {
          return tickPlayer(prev);
        }
        return { ...prev, accum: newAccum };
      });
    }, 50);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
 const key = e.key;
      switch (key.toLowerCase()) {
        case "a":
          setP1((p) => movePlayer(p, -1));
          break;
        case "d":
          setP1((p) => movePlayer(p, 1));
          break;
        case "s":
          setP1((p) => fastDropPlayer(p));
          break;
        case "arrowleft":
          e.preventDefault();
          setP2((p) => movePlayer(p, -1));
          break;
        case "arrowright":
          e.preventDefault();
          setP2((p) => movePlayer(p, 1));
          break;
        case "arrowdown":
          e.preventDefault();
          setP2((p) => fastDropPlayer(p));
          break;
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  useEffect(() => {
    if (p1.gameOver && !scoreCalledRef.current.p1) {
      scoreCalledRef.current.p1 = true;
      onScore?.("Jogador 1", p1.score);
    }
  }, [p1.gameOver, p1.score, onScore]);

  useEffect(() => {
    if (p2.gameOver && !scoreCalledRef.current.p2) {
      scoreCalledRef.current.p2 = true;
      onScore?.("Jogador 2", p2.score);
    }
  }, [p2.gameOver, p2.score, onScore]);

  const bothOut = p1.gameOver && p2.gameOver;
  const winner = bothOut
    ? p1.score > p2.score
      ? "Jogador 1"
      : p2.score > p1.score
      ? "Jogador 2"
      : "Empate"
    : null;

  return (
    <div className="w-full max-w-2xl mx-auto px-1 sm:px-2">
      <div className="text-center mb-3">
        <h2 className="text-xl sm:text-2xl font-black bg-gradient-to-r from-cyan-400 to-pink-400 bg-clip-text text-transparent">
          Numeros Caindo
        </h2>
        <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
          Mova e solte!
        </p>
      </div>

      <div className="bg-gradient-to-r from-cyan-900/30 to-pink-900/30 border border-cyan-500/20 rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 mb-3 flex justify-between items-center">
        <div className="text-cyan-400 font-bold">
          <span className="text-[10px] sm:text-xs opacity-70">P1 </span>
          <span className="text-base sm:text-lg tabular-nums">{p1.score}</span>
          {p1.gameOver && (
            <Badge
              variant="destructive"
              className="ml-1.5 text-[9px] sm:text-[10px] px-1.5 py-0"
            >
              Game Over
            </Badge>
          )}
        </div>
        <div className="text-xs text-white/30 font-medium tracking-wider">VS</div>
        <div className="text-pink-400 font-bold text-right">
          <span className="text-base sm:text-lg tabular-nums">{p2.score}</span>
          <span className="text-[10px] sm:text-xs opacity-70 ml-1.5">
            P2
          </span>
          {p2.gameOver && (
            <Badge
              variant="destructive"
              className="ml-1.5 text-[9px] sm:text-[10px] px-1.5 py-0"
            >
              Game Over
            </Badge>
          )}
        </div>
      </div>

      <div className="flex gap-2 sm:gap-3 justify-center items-start">
        <PlayerBoard
          player={p1}
          label="Jogador 1 (A / D / S)"
          accent="text-cyan-400"
          borderAccent="border-cyan-500/30"
          glowAccent="drop-shadow-[0_0_8px_rgba(34,211,238,0.3)]"
          onMoveLeft={p1Left}
          onMoveRight={p1Right}
          onFastDrop={p1Drop}
        />
        <PlayerBoard
          player={p2}
          label="Jogador 2 (← / → / ↓)"
          accent="text-pink-400"
          borderAccent="border-pink-500/30"
          glowAccent="drop-shadow-[0_0_8px_rgba(244,114,182,0.3)]"
          onMoveLeft={p2Left}
          onMoveRight={p2Right}
          onFastDrop={p2Drop}
        />
      </div>

      <div className="flex justify-center mt-3">
        <Button
          variant="outline"
          size="sm"
          onClick={resetAll}
          className="gap-1.5 text-[11px] sm:text-xs border-white/10 hover:bg-white/5"
        >
          <RotateCcw className="h-3 w-3" />
          Reiniciar Tudo
        </Button>
      </div>

      <AnimatePresence>
        {winner && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="mt-4 text-center"
          >
            <div className="inline-flex flex-col items-center bg-gradient-to-r from-cyan-900/50 to-pink-900/50 border border-white/15 rounded-xl px-6 py-3 backdrop-blur-sm">
              <p className="text-lg sm:text-xl font-black text-yellow-400">
                {winner === "Empate"
                  ? "Empate!"
                  : `${winner} Venceu!`}
              </p>
              <p className="text-xs sm:text-sm text-white/50 mt-1 tabular-nums">
                {p1.score} × {p2.score}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
