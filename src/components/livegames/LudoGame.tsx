import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dice1, Dice2, Dice3, Dice4, Dice5, Dice6, RotateCcw, Trophy, Coins, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  onScore?: (name: string, score: number) => void;
  liveCode?: string;
}

const COLORS = ["#EF4444", "#22C55E", "#3B82F6", "#F59E0B"];
const COLOR_NAMES = ["Vermelho", "Verde", "Azul", "Amarelo"];
const EMOJIS = ["🔴", "🟢", "🔵", "🟡"];
const HOME_POSITIONS = 57;

const START_POS: Record<number, number> = { 0: 0, 1: 13, 2: 26, 3: 39 };

// Simplified Ludo path positions (shared track)
const TRACK = Array.from({ length: 52 }, (_, i) => i);

const DICE_ICONS = [Dice1, Dice2, Dice3, Dice4, Dice5, Dice6];

type PiecePos = number; // -1 = base, 0-51 = track, 52-57 = home stretch

const LudoGame = ({ onScore, liveCode }: Props) => {
  const [pieces, setPieces] = useState<PiecePos[][]>([
    [-1, -1, -1, -1],
    [-1, -1, -1, -1],
    [-1, -1, -1, -1],
    [-1, -1, -1, -1],
  ]);
  const [current, setCurrent] = useState(0);
  const [dice, setDice] = useState(1);
  const [rolled, setRolled] = useState(false);
  const [scores, setScores] = useState([0, 0, 0, 0]);
  const [bet, setBet] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState<number | null>(null);
  const [sixCount, setSixCount] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [playerMode, setPlayerMode] = useState<"2p" | "4p">("2p");

  const canMove = (player: number, pieceIdx: number, diceVal: number): PiecePos | null => {
    const pos = pieces[player][pieceIdx];
    if (pos === -1) {
      if (diceVal !== 6) return null;
      return START_POS[player];
    }
    const newPos = pos + diceVal;
    if (pos >= 52 && pos < HOME_POSITIONS) {
      // In home stretch
      if (newPos > HOME_POSITIONS) return null;
      return newPos;
    }
    if (pos >= HOME_POSITIONS) return null; // already home
    // Wrap around track
    const trackPos = (pos + diceVal) % 52;
    // Check if entering home stretch
    const homeEntry = START_POS[player] === 0 ? 50 : START_POS[player] - 2;
    if (pos <= homeEntry && (pos + diceVal) > homeEntry) {
      const homeStretchPos = 52 + ((pos + diceVal) - homeEntry - 1);
      if (homeStretchPos > HOME_POSITIONS) return null;
      return homeStretchPos;
    }
    return trackPos;
  };

  const rollDice = () => {
    if (rolled || gameOver || animating) return;
    const val = Math.floor(Math.random() * 6) + 1;
    setDice(val);
    setRolled(true);
    if (val === 6) {
      setSixCount(s => s + 1);
    } else {
      setSixCount(0);
    }
  };

  const movePiece = (pieceIdx: number) => {
    if (!rolled || gameOver || animating) return;
    const newPos = canMove(current, pieceIdx, dice);
    if (newPos === null) {
      toast.error("Movimento inválido!");
      return;
    }

    setAnimating(true);
    const newPieces = pieces.map(p => [...p]);
    const oldPos = newPieces[current][pieceIdx];
    newPieces[current][pieceIdx] = newPos;

    // Check capture (only on main track 0-51)
    if (newPos >= 0 && newPos <= 51 && oldPos !== -1) {
      for (let p = 0; p < 4; p++) {
        if (p === current) continue;
        for (let i = 0; i < 4; i++) {
          if (newPieces[p][i] === newPos && newPieces[p][i] >= 0 && newPieces[p][i] <= 51) {
            newPieces[p][i] = -1; // send back to base
            toast.success(`${EMOJIS[current]} Capturou ${EMOJIS[p]}!`);
          }
        }
      }
    }

    setPieces(newPieces);
    setRolled(false);
    setAnimating(false);

    // Check win
    if (newPieces[current].every(p => p >= HOME_POSITIONS)) {
      setGameOver(true);
      setWinner(current);
      const winScore = 200 + (bet || 0);
      onScore?.(COLOR_NAMES[current], winScore);
      setScores(s => { const ns = [...s]; ns[current] += winScore; return ns; });
      return;
    }

    // Extra turn on 6 (max 3 in a row)
    if (dice === 6 && sixCount < 3) {
      return; // same player rolls again
    }

    // Next player
    setSixCount(0);
    const nextPlayers = playerMode === "2p" ? [0, 2] : [0, 1, 2, 3];
    const idx = nextPlayers.indexOf(current);
    setCurrent(nextPlayers[(idx + 1) % nextPlayers.length]);
  };

  const hasAnyMove = () => {
    for (let i = 0; i < 4; i++) {
      if (canMove(current, i, dice) !== null) return true;
    }
    return false;
  };

  const reset = () => {
    setPieces([[-1, -1, -1, -1], [-1, -1, -1, -1], [-1, -1, -1, -1], [-1, -1, -1, -1]]);
    setCurrent(0); setDice(1); setRolled(false);
    setGameOver(false); setWinner(null); setSixCount(0); setBet(0); setAnimating(false);
  };

  // Auto-skip if no moves
  useEffect(() => {
    if (rolled && !hasAnyMove() && !animating) {
      const timer = setTimeout(() => {
        setRolled(false);
        setSixCount(0);
        const nextPlayers = playerMode === "2p" ? [0, 2] : [0, 1, 2, 3];
        const idx = nextPlayers.indexOf(current);
        setCurrent(nextPlayers[(idx + 1) % nextPlayers.length]);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [rolled, dice, current, pieces]);

  const DiceIcon = DICE_ICONS[dice - 1];
  const activePlayers = playerMode === "2p" ? [0, 2] : [0, 1, 2, 3];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        {activePlayers.map(p => (
          <div key={p} className={cn("p-3 rounded-2xl border-2 transition-all", current === p && !gameOver && "border-white/30 bg-white/5 scale-[1.02]")}
            style={{ borderColor: current === p && !gameOver ? COLORS[p] + "60" : "transparent", background: current === p && !gameOver ? COLORS[p] + "10" : "" }}
          >
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full" style={{ background: COLORS[p] }} />
              <span className="text-sm font-bold text-white">{COLOR_NAMES[p]}</span>
              <span className="ml-auto text-lg font-black text-white">{scores[p]}</span>
            </div>
            <div className="flex gap-1 mt-1.5">
              {[0, 1, 2, 3].map(i => (
                <div key={i} className={cn("w-3 h-3 rounded-full", pieces[p][i] >= HOME_POSITIONS ? "" : "opacity-40")}
                  style={{ background: COLORS[p] }}
                />
              ))}
              <span className="text-[9px] text-slate-500 ml-1">{pieces[p].filter(p => p >= HOME_POSITIONS).length}/4</span>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-center gap-2">
        <Button size="sm" variant={playerMode === "2p" ? "default" : "outline"} className={cn("rounded-xl text-xs", playerMode === "2p" && "bg-gradient-to-r from-red-500 to-blue-500")}
          onClick={() => { setPlayerMode("2p"); reset(); }}>2 Jogadores</Button>
        <Button size="sm" variant={playerMode === "4p" ? "default" : "outline"} className={cn("rounded-xl text-xs", playerMode === "4p" && "bg-gradient-to-r from-red-500 via-green-500 via-blue-500 to-amber-500")}
          onClick={() => { setPlayerMode("4p"); reset(); }}>4 Jogadores</Button>
      </div>

      <div className="flex justify-center">
        <div className="relative w-72 h-72 sm:w-80 sm:h-80 rounded-2xl bg-gradient-to-br from-emerald-800 to-emerald-950 border-2 border-emerald-600/30 shadow-2xl overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-[30%] h-full bg-amber-100/90" />
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-[30%] w-full bg-amber-100/90" />
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white/90 border-4 border-emerald-700 flex items-center justify-center shadow-inner">
              <Home className="h-5 w-5 text-emerald-700" />
            </div>
          </div>
          {[0, 1, 2, 3].map(p => {
            const positions = p === 0 ? "top-0 left-0" : p === 1 ? "top-0 right-0" : p === 2 ? "bottom-0 left-0" : "bottom-0 right-0";
            return (
              <div key={p} className={cn("absolute w-[35%] h-[35%] flex flex-wrap items-center justify-center gap-2 p-2 rounded-xl", positions)}
                style={{ background: COLORS[p] + "25" }}
              >
                {pieces[p].map((pos, i) => (
                  <motion.div
                    key={i}
                    className={cn(
                      "w-7 h-7 sm:w-8 sm:h-8 rounded-full shadow-lg flex items-center justify-center text-xs font-bold text-white cursor-pointer border-2",
                      pos === -1 && current === p && !rolled && "ring-2 ring-white animate-pulse",
                      pos >= 0 && "opacity-90"
                    )}
                    style={{ background: COLORS[p], borderColor: COLORS[p] }}
                    onClick={() => pos === -1 && current === p && !rolled && dice === 6 ? movePiece(i) : null}
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    {pos >= HOME_POSITIONS ? "✓" : pos === -1 ? "" : i + 1}
                  </motion.div>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col items-center gap-3">
        <motion.div
          key={dice}
          initial={{ rotate: 0, scale: 0.8 }}
          animate={{ rotate: [0, 180, 360], scale: 1 }}
          transition={{ duration: 0.3 }}
          className={cn(
            "w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center shadow-xl",
            rolled ? "bg-white" : "bg-white/50"
          )}
          style={{ boxShadow: rolled ? `0 0 30px ${COLORS[current]}40` : "none" }}
        >
          <DiceIcon className="h-8 w-8 sm:h-10 sm:w-10" style={{ color: COLORS[current] }} />
        </motion.div>

        {!rolled ? (
          <Button onClick={rollDice} disabled={gameOver || animating}
            className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl px-8 text-lg font-bold shadow-lg shadow-amber-500/30">
            🎲 Rolar Dado
          </Button>
        ) : (
          <div className="text-sm text-slate-400">Escolha uma peça para mover</div>
        )}

        {rolled && pieces[current].map((pos, i) => pos >= 0 && pos < HOME_POSITIONS && (
          <Button key={i} size="sm" variant="outline" className="rounded-xl"
            onClick={() => movePiece(i)}>
            {EMOJIS[current]} Peça {i + 1} ({pos})
          </Button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 justify-center">
        <span className="text-xs text-slate-500 flex items-center"><Coins className="h-3 w-3 mr-1" />Aposta:</span>
        {[10, 25, 50, 100].map(v => (
          <Button key={v} size="sm" variant={bet === v ? "default" : "outline"} className={cn("rounded-xl text-xs", bet === v && "bg-amber-500")}
            onClick={() => setBet(v)}>{v}</Button>
        ))}
        <Button size="sm" variant="outline" className="rounded-xl" onClick={reset}><RotateCcw className="h-3.5 w-3.5" /></Button>
      </div>

      {gameOver && (
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-3">
          <div className="text-5xl">🏆</div>
          <h3 className="text-xl font-black" style={{ color: COLORS[winner!] }}>{COLOR_NAMES[winner!]} Venceu!</h3>
          <Button onClick={reset} className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl"><RotateCcw className="h-4 w-4 mr-2" />Jogar Novamente</Button>
        </motion.div>
      )}
    </div>
  );
};

export default LudoGame;
