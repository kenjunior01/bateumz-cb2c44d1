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

type Cell = null | "X" | "O";
type Board = Cell[];

const WIN_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
  [0, 4, 8], [2, 4, 6], // diags
];

const checkWinner = (b: Board): { winner: "X" | "O" | null; line: number[] | null } => {
  for (const line of WIN_LINES) {
    const [a, bb, c] = line;
    if (b[a] && b[a] === b[bb] && b[a] === b[c]) {
      return { winner: b[a] as "X" | "O", line };
    }
  }
  return { winner: null, line: null };
};

const COMBO_NAMES = ["Sequência Dupla", "Canto Duplo", "Centro + Canto", "Trinca Lateral"];
const COMBO_BONUS = [30, 50, 40, 60];

const TicTacToeVS = ({ onScore, liveCode }: Props) => {
  const [board, setBoard] = useState<Board>(Array(9).fill(null));
  const [current, setCurrent] = useState<"X" | "O">("X");
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState<"X" | "O" | null>(null);
  const [winLine, setWinLine] = useState<number[] | null>(null);
  const [scores, setScores] = useState({ x: 0, o: 0 });
  const [bet, setBet] = useState(0);
  const [round, setRound] = useState(1);
  const [draw, setDraw] = useState(false);
  const [streak, setStreak] = useState({ x: 0, o: 0 });
  const [lastWinTime, setLastWinTime] = useState(0);
  const [isSpeedMode, setIsSpeedMode] = useState(false);
  const [timer, setTimer] = useState(10);

  // Speed mode timer
  useEffect(() => {
    if (!isSpeedMode || gameOver) return;
    if (timer <= 0) {
      // Time out - other player wins
      const loser = current;
      setGameOver(true);
      setWinner(loser === "X" ? "O" : "X");
      onScore?.(loser === "X" ? "Jogador O" : "Jogador X", 50 + (bet || 0));
      return;
    }
    const t = setTimeout(() => setTimer(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [timer, isSpeedMode, gameOver, current]);

  // Reset timer on move
  useEffect(() => {
    if (isSpeedMode) setTimer(10);
  }, [current]);

  const play = (idx: number) => {
    if (gameOver || board[idx]) return;
    const newBoard = [...board];
    newBoard[idx] = current;
    setBoard(newBoard);

    const result = checkWinner(newBoard);
    if (result.winner) {
      setGameOver(true);
      setWinner(result.winner);
      setWinLine(result.line);
      const streakBonus = Math.min(streak[result.winner.toLowerCase() as "x" | "o"] * 10, 50);
      const winScore = 50 + streakBonus + (bet || 0);
      onScore?.(result.winner === "X" ? "Jogador X" : "Jogador O", winScore);
      setScores(s => result.winner === "X" ? { ...s, x: s.x + winScore } : { ...s, o: s.o + winScore });
      setStreak(s => ({ ...s, [result.winner.toLowerCase()]: s[result.winner.toLowerCase() as "x" | "o"] + 1, [current.toLowerCase()]: 0 }));
      setLastWinTime(Date.now());
      return;
    }

    if (newBoard.every(c => c !== null)) {
      setGameOver(true);
      setDraw(true);
      return;
    }

    setCurrent(current === "X" ? "O" : "X");
  };

  const reset = () => {
    setBoard(Array(9).fill(null));
    setCurrent(round % 2 === 0 ? "O" : "X");
    setGameOver(false); setWinner(null); setWinLine(null);
    setDraw(false); setRound(r => r + 1); setTimer(10);
  };

  const fullReset = () => {
    reset();
    setScores({ x: 0, o: 0 }); setStreak({ x: 0, o: 0 }); setRound(1); setBet(0);
  };

  return (
    <div className="space-y-4">
      {/* Scoreboard */}
      <div className="flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-violet-900/30 to-pink-900/30 border border-violet-500/20">
        <div className="text-center flex-1">
          <span className={cn("text-2xl font-black", current === "X" && !gameOver ? "text-cyan-400" : "text-slate-500")}>✕</span>
          <p className="text-sm font-bold text-white">Jogador X</p>
          <p className="text-xl font-black text-white">{scores.x}</p>
          {streak.x > 1 && <Badge className="bg-amber-500/20 text-amber-400 text-[9px]">🔥 {streak.x} streak</Badge>}
        </div>
        <div className="text-center px-3">
          <Badge className="bg-violet-500/20 text-violet-400 border-violet-500/30">GALO VS</Badge>
          <p className="text-[10px] text-slate-500 mt-1">Round {round}</p>
          {bet > 0 && <p className="text-[10px] text-amber-400"><Coins className="h-3 w-3 inline mr-1" />{bet}</p>}
          {isSpeedMode && !gameOver && (
            <Badge className={cn("mt-1", timer <= 3 ? "bg-red-500/20 text-red-400" : "bg-slate-700 text-slate-300")}>{timer}s</Badge>
          )}
        </div>
        <div className="text-center flex-1">
          <span className={cn("text-2xl font-black", current === "O" && !gameOver ? "text-pink-400" : "text-slate-500")}>○</span>
          <p className="text-sm font-bold text-white">Jogador O</p>
          <p className="text-xl font-black text-white">{scores.o}</p>
          {streak.o > 1 && <Badge className="bg-amber-500/20 text-amber-400 text-[9px]">🔥 {streak.o} streak</Badge>}
        </div>
      </div>

      {/* Board */}
      <div className="flex justify-center">
        <div className="grid grid-cols-3 gap-2 p-3 rounded-2xl bg-slate-900/50 border border-slate-800">
          {board.map((cell, i) => (
            <motion.button
              key={i}
              onClick={() => play(i)}
              disabled={gameOver || !!cell}
              whileHover={!gameOver && !cell ? { scale: 1.05, backgroundColor: "rgba(139,92,246,0.1)" } : {}}
              whileTap={!gameOver && !cell ? { scale: 0.95 } : {}}
              className={cn(
                "w-20 h-20 sm:w-24 sm:h-24 rounded-2xl flex items-center justify-center text-4xl sm:text-5xl font-black transition-all border",
                !cell && "bg-slate-800/50 border-slate-700 hover:border-violet-500/50 cursor-pointer",
                cell === "X" && "bg-cyan-500/10 border-cyan-500/30 text-cyan-400",
                cell === "O" && "bg-pink-500/10 border-pink-500/30 text-pink-400",
                winLine?.includes(i) && "ring-2 ring-yellow-400 bg-yellow-400/10"
              )}
            >
              {cell && (
                <motion.span
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 15 }}
                >{cell}</motion.span>
              )}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-2 justify-center">
        <Button size="sm" variant={isSpeedMode ? "default" : "outline"}
          className={cn("rounded-xl text-xs", isSpeedMode && "bg-red-500")}
          onClick={() => setIsSpeedMode(!isSpeedMode)}>
          ⚡ {isSpeedMode ? "Velocidade ON" : "Modo Velocidade"}
        </Button>
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
          <h3 className="text-xl font-black text-white">{draw ? "Empate!" : `${winner} Venceu!`}</h3>
          <div className="flex gap-2 justify-center">
            <Button onClick={reset} className="bg-gradient-to-r from-violet-500 to-pink-500 text-white rounded-xl">Próximo Round</Button>
            <Button onClick={fullReset} variant="outline" className="rounded-xl">Reiniciar Tudo</Button>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default TicTacToeVS;
