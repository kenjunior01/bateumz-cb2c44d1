import { useState, useCallback, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RotateCcw, Grid3X3, HelpCircle, Trophy, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Props {
  onScore?: (name: string, score: number) => void;
  liveCode?: string;
}

type Player = "X" | "O";
type Cell = null | Player;
type MiniResult = null | Player | "draw";

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

const checkWin = (b: (Cell | MiniResult)[]): { winner: Player | null; line: number[] | null } => {
  for (const line of WIN_LINES) {
    const [a, bb, c] = line;
    if (
      b[a] &&
      b[a] !== "draw" &&
      b[a] === b[bb] &&
      b[a] === b[c]
    ) {
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

const playerName = (p: Player) => (p === "X" ? "Jogador 1" : "Jogador 2");
const playerColor = (p: Player) => (p === "X" ? "text-cyan-400" : "text-pink-400");
const playerMark = (p: Player) => (p === "X" ? "✕" : "○");
const playerBorderHighlight = (p: Player) =>
  p === "X" ? "border-cyan-500/40" : "border-pink-500/40";
const playerGlowColor = (p: Player) =>
  p === "X" ? "rgba(34,211,238,0.15)" : "rgba(244,114,182,0.15)";

const TicTacToePro = ({ onScore, liveCode }: Props) => {
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

  const startTimeRef = useRef<number>(Date.now());

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
      const globalIdx = boardIdx * 9 + cellIdx;
      if (cells[globalIdx] !== null) return false;
      if (miniResults[boardIdx] !== null) return false;
      if (targetBoard !== null && targetBoard !== boardIdx) return false;
      return true;
    },
    [cells, gameOver, miniResults, targetBoard]
  );

  const activeTarget = useMemo(() => {
    if (targetBoard !== null && isValidTarget(targetBoard)) {
      return targetBoard;
    }
    return null;
  }, [isValidTarget, targetBoard]);

  const playCell = useCallback(
    (boardIdx: number, cellIdx: number) => {
      if (!canPlayCell(boardIdx, cellIdx)) return;

      const globalIdx = boardIdx * 9 + cellIdx;
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
          onScore?.(playerName(bigResult.winner), winScore);
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
      if (
        newMiniResults[nextTarget] !== null ||
        isBoardFull(newCells, nextTarget)
      ) {
        setTargetBoard(null);
      } else {
        setTargetBoard(nextTarget);
      }

      setCurrentPlayer(currentPlayer === "X" ? "O" : "X");
    },
    [canPlayCell, cells, currentPlayer, miniResults, moveCount, onScore]
  );

  const reset = () => {
    setCells(createEmptyCells());
    setMiniResults(createEmptyMiniResults());
    setCurrentPlayer(round % 2 === 0 ? "O" : "X");
    setTargetBoard(null);
    setGameOver(false);
    setBigWinner(null);
    setBigWinLine(null);
    setIsDraw(false);
    setLastMiniWinBoard(null);
    setMoveCount(0);
    startTimeRef.current = Date.now();
    setRound((r) => r + 1);
  };

  const fullReset = () => {
    setScores({ x: 0, o: 0 });
    setRound(1);
    reset();
  };

  const turnText = useMemo(() => {
    if (gameOver) return "";
    const name = playerName(currentPlayer);
    if (activeTarget !== null) {
      return `— Sua vez no tabuleiro ${BOARD_NAMES[activeTarget]}`;
    }
    return `— Jogue em qualquer tabuleiro`;
  }, [activeTarget, currentPlayer, gameOver]);

  return (
    <div className="space-y-3">
      {/* Scoreboard */}
      <div className="flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-cyan-900/30 to-pink-900/30 border border-cyan-500/20">
        <div className="text-center flex-1">
          <span
            className={cn(
              "text-xl font-black transition-colors duration-300",
              currentPlayer === "X" && !gameOver
                ? "text-cyan-400"
                : "text-slate-500"
            )}
          >
            ✕
          </span>
          <p className="text-xs font-bold text-white">Jogador 1</p>
          <p className="text-lg font-black text-white">{scores.x}</p>
        </div>
        <div className="text-center px-3">
          <Badge className="bg-gradient-to-r from-cyan-500/20 to-pink-500/20 text-white border-cyan-500/30 text-[10px] sm:text-xs">
            <Grid3X3 className="h-3 w-3 mr-1" />
            GALO PRO
          </Badge>
          <p className="text-[10px] text-slate-500 mt-1">Round {round}</p>
          <div className="flex items-center justify-center gap-1 mt-0.5">
            <Clock className="h-2.5 w-2.5 text-slate-500" />
            <span className="text-[10px] text-slate-500">
              {moveCount} jogadas
            </span>
          </div>
        </div>
        <div className="text-center flex-1">
          <span
            className={cn(
              "text-xl font-black transition-colors duration-300",
              currentPlayer === "O" && !gameOver
                ? "text-pink-400"
                : "text-slate-500"
            )}
          >
            ○
          </span>
          <p className="text-xs font-bold text-white">Jogador 2</p>
          <p className="text-lg font-black text-white">{scores.o}</p>
        </div>
      </div>

      {/* Turn indicator */}
      <AnimatePresence mode="wait">
        {!gameOver && (
          <motion.div
            key={`${currentPlayer}-${activeTarget ?? "any"}`}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2 }}
            className="text-center py-1.5 px-3 rounded-xl bg-slate-800/60 border border-slate-700/50"
          >
            <p className="text-xs font-medium">
              <span
                className={cn("font-bold", playerColor(currentPlayer))}
              >
                {playerMark(currentPlayer)}
              </span>{" "}
              <span className={cn(playerColor(currentPlayer))}>
                {playerName(currentPlayer)} {turnText}
              </span>
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Big Board (3x3 of small boards) */}
      <div className="flex justify-center">
        <div className="grid grid-cols-3 gap-1.5 sm:gap-2 p-2 sm:p-3 rounded-2xl bg-slate-900/60 border border-slate-800">
          {([0, 1, 2, 3, 4, 5, 6, 7, 8] as const).map((boardIdx) => {
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
                  // Active (playable) board
                  miniResult === null &&
                    !boardIsFull &&
                    "bg-slate-900/50 border border-slate-700",
                  // Full but not resolved (shouldn't happen often, but defensive)
                  miniResult === null &&
                    boardIsFull &&
                    "bg-slate-900/30 border border-slate-800 opacity-40",
                  // Drawn board
                  boardIsDraw &&
                    "bg-slate-900/30 border border-slate-800 opacity-40",
                  // Won board
                  miniResult === "X" &&
                    "bg-cyan-500/10 border border-cyan-500/30",
                  miniResult === "O" &&
                    "bg-pink-500/10 border border-pink-500/30",
                  // Active target highlight
                  isActiveTarget &&
                    miniResult === null &&
                    "ring-2 ring-yellow-400/60 ring-offset-1 ring-offset-slate-950",
                  // Big win line highlight
                  bigWinLine?.includes(boardIdx) &&
                    boardIsWon &&
                    "ring-2 ring-yellow-400 shadow-lg shadow-yellow-400/20"
                )}
              >
                {/* Won board overlay */}
                {boardIsWon && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className="absolute inset-0 flex items-center justify-center z-10 rounded-lg"
                  >
                    <span
                      className={cn(
                        "text-2xl sm:text-3xl font-black drop-shadow-lg",
                        miniResult === "X"
                          ? "text-cyan-400"
                          : "text-pink-400"
                      )}
                    >
                      {playerMark(miniResult as Player)}
                    </span>
                  </motion.div>
                )}

                {/* Drawn board overlay */}
                {boardIsDraw && (
                  <div className="absolute inset-0 flex items-center justify-center z-10 rounded-lg">
                    <span className="text-lg text-slate-600 font-bold">—</span>
                  </div>
                )}

                {/* Small board grid */}
                <div className="grid grid-cols-3 gap-px sm:gap-0.5">
                  {([0, 1, 2, 3, 4, 5, 6, 7, 8] as const).map((cellIdx) => {
                    const globalIdx = boardIdx * 9 + cellIdx;
                    const cellValue = cells[globalIdx];
                    const isValid = canPlayCell(boardIdx, cellIdx);
                    const isInTargetBoard = activeTarget === boardIdx;

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
                          <motion.span
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{
                              type: "spring",
                              stiffness: 500,
                              damping: 20,
                            }}
                          >
                            {cellValue}
                          </motion.span>
                        )}

                        {/* Valid target cell glow */}
                        {isValid && !cellValue && isInTargetBoard && (
                          <motion.div
                            className="absolute inset-0 rounded-md pointer-events-none"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            style={{
                              boxShadow: `inset 0 0 8px ${playerGlowColor(currentPlayer)}`,
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

      {/* Controls */}
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
          className="rounded-xl gap-1"
          onClick={gameOver ? fullReset : reset}
        >
          <RotateCcw className="h-3.5 w-3.5" />
          {gameOver ? "Reiniciar Tudo" : "Novo Round"}
        </Button>
      </div>

      {/* Help / Rules */}
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
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Game Over */}
      <AnimatePresence>
        {gameOver && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            className="text-center space-y-3 py-2"
          >
            <div className="text-4xl">
              {isDraw ? (
                "🤝"
              ) : (
                <motion.div
                  initial={{ scale: 0, rotate: -30 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 15 }}
                >
                  <Trophy className="h-10 w-10 inline text-yellow-400" />
                </motion.div>
              )}
            </div>
            {bigWinner && (
              <motion.h3
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className={cn("text-lg font-black", playerColor(bigWinner))}
              >
                {playerName(bigWinner)} Venceu o jogo!
              </motion.h3>
            )}
            {isDraw && (
              <h3 className="text-lg font-black text-slate-400">Empate!</h3>
            )}
            {bigWinner && (
              <p className="text-xs text-slate-500">
                +100 pontos base • {moveCount} jogadas
              </p>
            )}
            <div className="flex gap-2 justify-center">
              <Button
                onClick={reset}
                className="bg-gradient-to-r from-cyan-500 to-pink-500 text-white rounded-xl text-xs"
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
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TicTacToePro;
