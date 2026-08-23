import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RotateCcw, Trophy, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import confetti from "canvas-confetti";

interface Props { onScore?: (name: string, score: number) => void; liveCode?: string; }

type CoinColor = "white" | "black" | "queen";

interface Coin {
  id: string;
  x: number;
  y: number;
  color: CoinColor;
  vx: number;
  vy: number;
  pocketed: boolean;
  radius: number;
}

interface PocketFlash {
  id: string;
  x: number;
  y: number;
  color: CoinColor;
}

const BOARD_SIZE = 400;
const HALF = BOARD_SIZE / 2;
const POCKET_R = 18;
const POCKET_POS = [
  { x: 0, y: 0 }, { x: BOARD_SIZE, y: 0 },
  { x: 0, y: BOARD_SIZE }, { x: BOARD_SIZE, y: BOARD_SIZE },
];
const FRICTION = 0.985;
const MIN_SPEED = 0.15;
const STRIKER_R = 14;
const COIN_R = 10;

function dist(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function initCoins(): Coin[] {
  const coins: Coin[] = [];
  const cx = HALF, cy = HALF;
  coins.push({ id: "queen", x: cx, y: cy, color: "queen", vx: 0, vy: 0, pocketed: false, radius: COIN_R });
  const ring1 = 6;
  for (let i = 0; i < ring1; i++) {
    const angle = (Math.PI * 2 * i) / ring1 + Math.PI / 6;
    const r = 28;
    coins.push({
      id: `w${i}`, x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r,
      color: i < 3 ? "white" : "black", vx: 0, vy: 0, pocketed: false, radius: COIN_R,
    });
  }
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI * 2 * i) / 6;
    const r = 55;
    coins.push({
      id: `o${i}`, x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r,
      color: i % 2 === 0 ? "white" : "black", vx: 0, vy: 0, pocketed: false, radius: COIN_R,
    });
  }
  return coins;
}

const CarromBoard = ({ onScore, liveCode }: Props) => {
  const [coins, setCoins] = useState<Coin[]>(initCoins);
  const [striker, setStriker] = useState({ x: HALF, y: HALF + 130, vx: 0, vy: 0, active: false });
  const [turn, setTurn] = useState<"player" | "bot">("player");
  const [playerScore, setPlayerScore] = useState(0);
  const [botScore, setBotScore] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragEnd, setDragEnd] = useState({ x: 0, y: 0 });
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState("");
  const [message, setMessage] = useState("Arraste o striker para mirar e atirar!");
  const [pocketedCoins, setPocketedCoins] = useState<string[]>([]);
  const [pocketFlashes, setPocketFlashes] = useState<PocketFlash[]>([]);
  const [scoreBounceKey, setScoreBounceKey] = useState({ player: 0, bot: 0 });
  const animRef = useRef<number>(0);
  const boardRef = useRef<HTMLDivElement>(null);

  const playerColor: CoinColor = "white";
  const botColor: CoinColor = "black";

  const checkPockets = useCallback((c: Coin) => {
    for (const p of POCKET_POS) {
      if (dist(c, p) < POCKET_R + c.radius) return true;
    }
    return false;
  }, []);

  const simulate = useCallback(() => {
    setCoins(prev => {
      const next = prev.map(c => {
        if (c.pocketed) return c;
        let { x, y, vx, vy } = c;
        x += vx;
        y += vy;
        vx *= FRICTION;
        vy *= FRICTION;
        if (x - c.radius < 0) { x = c.radius; vx = -vx * 0.7; }
        if (x + c.radius > BOARD_SIZE) { x = BOARD_SIZE - c.radius; vx = -vx * 0.7; }
        if (y - c.radius < 0) { y = c.radius; vy = -vy * 0.7; }
        if (y + c.radius > BOARD_SIZE) { y = BOARD_SIZE - c.radius; vy = -vy * 0.7; }
        if (checkPockets({ ...c, x, y })) return { ...c, x, y, vx: 0, vy: 0, pocketed: true };
        if (Math.abs(vx) < MIN_SPEED) vx = 0;
        if (Math.abs(vy) < MIN_SPEED) vy = 0;
        return { ...c, x, y, vx, vy };
      });
      for (let i = 0; i < next.length; i++) {
        if (next[i].pocketed) continue;
        for (let j = i + 1; j < next.length; j++) {
          if (next[j].pocketed) continue;
          const a = next[i], b = next[j];
          const d = dist(a, b);
          const minD = a.radius + b.radius;
          if (d < minD && d > 0) {
            const nx = (b.x - a.x) / d;
            const ny = (b.y - a.y) / d;
            const dvx = a.vx - b.vx;
            const dvy = a.vy - b.vy;
            const dvn = dvx * nx + dvy * ny;
            if (dvn > 0) {
              next[i] = { ...a, vx: a.vx - dvn * nx * 0.8, vy: a.vy - dvn * ny * 0.8 };
              next[j] = { ...b, vx: b.vx + dvn * nx * 0.8, vy: b.vy + dvn * ny * 0.8 };
            }
            const overlap = minD - d;
            next[i] = { ...next[i], x: next[i].x - nx * overlap / 2, y: next[i].y - ny * overlap / 2 };
            next[j] = { ...next[j], x: next[j].x + nx * overlap / 2, y: next[j].y + ny * overlap / 2 };
          }
        }
      }
      return next;
    });

    setStriker(prev => {
      if (!prev.active) return prev;
      let { x, y, vx, vy } = prev;
      x += vx;
      y += vy;
      vx *= FRICTION;
      vy *= FRICTION;
      if (x - STRIKER_R < 0) { x = STRIKER_R; vx = -vx * 0.7; }
      if (x + STRIKER_R > BOARD_SIZE) { x = BOARD_SIZE - STRIKER_R; vx = -vx * 0.7; }
      if (y - STRIKER_R < 0) { y = STRIKER_R; vy = -vy * 0.7; }
      if (y + STRIKER_R > BOARD_SIZE) { y = BOARD_SIZE - STRIKER_R; vy = -vy * 0.7; }
      const moving = Math.abs(vx) > MIN_SPEED || Math.abs(vy) > MIN_SPEED;
      return { x, y, vx: moving ? vx : 0, vy: moving ? vy : 0, active: moving };
    });
  }, [checkPockets]);

  useEffect(() => {
    const loop = () => {
      simulate();
      animRef.current = requestAnimationFrame(loop);
    };
    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, [simulate]);

  // Auto-clear pocket flash effects after a short delay
  useEffect(() => {
    if (pocketFlashes.length === 0) return;
    const timer = setTimeout(() => setPocketFlashes([]), 600);
    return () => clearTimeout(timer);
  }, [pocketFlashes]);

  useEffect(() => {
    if (striker.active) return;
    const movingCoins = coins.filter(c => !c.pocketed && (Math.abs(c.vx) > 0 || Math.abs(c.vy) > 0));
    if (movingCoins.length > 0) return;
    if (gameOver) return;

    const justPocketed = coins.filter(c => c.pocketed && !pocketedCoins.includes(c.id));
    if (justPocketed.length > 0) {
      const newPocketed = [...pocketedCoins, ...justPocketed.map(c => c.id)];
      setPocketedCoins(newPocketed);

      // Trigger pocket flash effects at coin positions
      setPocketFlashes(justPocketed.map(c => ({ id: c.id, x: c.x, y: c.y, color: c.color })));

      if (turn === "player") {
        const pts = justPocketed.filter(c => c.color === playerColor).length * 1 + justPocketed.filter(c => c.color === "queen").length * 2;
        setPlayerScore(p => p + pts);
        if (pts > 0) {
          setMessage(`Voce encaçou ${pts} ponto(s)!`);
          setScoreBounceKey(prev => ({ ...prev, player: prev.player + 1 }));
        } else {
          setMessage("Voce encaçou peça do adversario - turno passa!");
        }
      } else {
        const pts = justPocketed.filter(c => c.color === botColor).length * 1 + justPocketed.filter(c => c.color === "queen").length * 2;
        setBotScore(b => b + pts);
        if (pts > 0) {
          setMessage(`Bot encaçou ${pts} ponto(s)!`);
          setScoreBounceKey(prev => ({ ...prev, bot: prev.bot + 1 }));
        }
      }
    }

    const whiteLeft = coins.filter(c => c.color === "white" && !c.pocketed).length;
    const blackLeft = coins.filter(c => c.color === "black" && !c.pocketed).length;
    if (whiteLeft === 0 && blackLeft === 0) {
      setGameOver(true);
      if (playerScore > botScore) { setWinner("Voce venceu!"); onScore?.("Carrom", playerScore); }
      else if (botScore > playerScore) setWinner("Bot venceu!");
      else setWinner("Empate!");
      return;
    }

    const nextTurn = turn === "player" ? "bot" : "player";
    setTurn(nextTurn);
    if (nextTurn === "player") {
      setStriker({ x: HALF, y: HALF + 130, vx: 0, vy: 0, active: false });
      setMessage("Sua vez! Arraste o striker.");
    } else {
      setMessage("Bot esta a jogar...");
    }
  }, [striker.active, coins, pocketedCoins, turn, gameOver, playerScore, botScore, onScore]);

  // Fire confetti when player wins
  useEffect(() => {
    if (gameOver && winner === "Voce venceu!") {
      const duration = 2000;
      const end = Date.now() + duration;
      const frame = () => {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.7 },
          colors: ["#F59E0B", "#10B981", "#3B82F6", "#EF4444"],
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.7 },
          colors: ["#F59E0B", "#10B981", "#3B82F6", "#EF4444"],
        });
        if (Date.now() < end) requestAnimationFrame(frame);
      };
      frame();
    }
  }, [gameOver, winner]);

  useEffect(() => {
    if (turn !== "bot" || gameOver) return;
    const timer = setTimeout(() => {
      // Bot aiming: pick the best target coin
      const availableCoins = coins.filter(c => !c.pocketed);
      if (availableCoins.length === 0) return;

      // Prefer queen first (high value), then own color
      const queen = availableCoins.find(c => c.color === "queen");
      const ownCoins = availableCoins.filter(c => c.color === botColor);
      const targetCoin = queen || ownCoins[0] || availableCoins[0];

      // Pick striker position: aim for a line from striker through target toward nearest pocket
      const sx = HALF + (Math.random() - 0.5) * 40;
      const strikerY = HALF + 130;

      // Find the nearest pocket to the target coin for aiming through
      let nearestPocket = POCKET_POS[0];
      let minDist = Infinity;
      for (const p of POCKET_POS) {
        const d = dist(targetCoin, p);
        if (d < minDist) { minDist = d; nearestPocket = p; }
      }

      // Calculate aim direction: toward a point slightly past the target in the pocket direction
      const toPocketX = nearestPocket.x - targetCoin.x;
      const toPocketY = nearestPocket.y - targetCoin.y;
      const toPocketLen = Math.sqrt(toPocketX * toPocketX + toPocketY * toPocketY) || 1;
      const aimX = targetCoin.x + (toPocketX / toPocketLen) * 15;
      const aimY = targetCoin.y + (toPocketY / toPocketLen) * 15;

      const dx = aimX - sx;
      const dy = aimY - strikerY;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d === 0) return;

      // Power based on distance (closer = less power needed)
      const distToTarget = dist({ x: sx, y: strikerY }, targetCoin);
      const power = Math.min(Math.max(distToTarget / 40, 3), 7);
      const jitter = 0.08;
      setStriker({ x: sx, y: strikerY, vx: (dx / d) * power * (1 + (Math.random() - 0.5) * jitter), vy: (dy / d) * power * (1 + (Math.random() - 0.5) * jitter), active: true });
    }, 800);
    return () => clearTimeout(timer);
  }, [turn, gameOver, coins]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (turn !== "player" || striker.active || gameOver) return;
    const rect = boardRef.current?.getBoundingClientRect();
    if (!rect) return;
    const scale = BOARD_SIZE / rect.width;
    const cx = (e.clientX - rect.left) * scale;
    const cy = (e.clientY - rect.top) * scale;
    if (dist({ x: cx, y: cy }, striker) < STRIKER_R + 20) {
      setDragging(true);
      setDragStart({ x: striker.x, y: striker.y });
      setDragEnd({ x: cx, y: cy });
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    const rect = boardRef.current?.getBoundingClientRect();
    if (!rect) return;
    const scale = BOARD_SIZE / rect.width;
    setDragEnd({ x: (e.clientX - rect.left) * scale, y: (e.clientY - rect.top) * scale });
  };

  const handlePointerUp = () => {
    if (!dragging) return;
    setDragging(false);
    const dx = dragStart.x - dragEnd.x;
    const dy = dragStart.y - dragEnd.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d < 10) return;
    const power = Math.min(d / 15, 8);
    setStriker(prev => ({ ...prev, vx: (dx / d) * power, vy: (dy / d) * power, active: true }));
  };

  const restart = () => {
    setCoins(initCoins());
    setStriker({ x: HALF, y: HALF + 130, vx: 0, vy: 0, active: false });
    setTurn("player");
    setPlayerScore(0);
    setBotScore(0);
    setGameOver(false);
    setWinner("");
    setMessage("Arraste o striker para mirar e atirar!");
    setPocketedCoins([]);
    setPocketFlashes([]);
    setScoreBounceKey({ player: 0, bot: 0 });
  };

  const boardBg = "linear-gradient(135deg, #8B5E3C 0%, #A0714F 30%, #8B5E3C 60%, #7A5232 100%)";
  const coinColorMap: Record<CoinColor, string> = { white: "#FAFAFA", black: "#1a1a1a", queen: "#DC2626" };
  const coinBorderMap: Record<CoinColor, string> = { white: "#D4D4D4", black: "#444", queen: "#991B1B" };

  const isPocketMsg = message.includes("encaçou");

  return (
    <div className="w-full max-w-lg mx-auto">
      {/* Score displays with bounce animation on change */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <motion.div
            key={scoreBounceKey.player}
            className="text-xs font-bold px-3 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200"
            initial={{ scale: 1.35 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 15 }}
          >
            Voce (Branco): {playerScore}
          </motion.div>
          <motion.div
            key={scoreBounceKey.bot}
            className="text-xs font-bold px-3 py-1 rounded-full bg-slate-200 text-slate-800 border border-slate-300"
            initial={{ scale: 1.35 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 15 }}
          >
            Bot (Preto): {botScore}
          </motion.div>
        </div>
        {/* Turn indicator with whileHover */}
        <motion.div
          whileHover={{ scale: 1.08 }}
          className={"text-xs font-bold px-3 py-1 rounded-full cursor-default " + (turn === "player" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700")}
        >
          {turn === "player" ? "Sua vez" : "Bot..."}
        </motion.div>
      </div>

      {/* Board with animated glow shadow */}
      <motion.div
        ref={boardRef}
        className="relative w-full aspect-square rounded-2xl overflow-hidden cursor-crosshair select-none"
        style={{ background: boardBg, border: "6px solid #5C3A1E" }}
        animate={{
          boxShadow: turn === "player" && !gameOver && !striker.active
            ? "0 8px 32px rgba(0,0,0,0.5), 0 0 30px rgba(16,185,129,0.25), 0 0 60px rgba(16,185,129,0.1), inset 0 0 60px rgba(0,0,0,0.15)"
            : "0 8px 40px rgba(0,0,0,0.5), 0 12px 48px rgba(0,0,0,0.3), inset 0 0 60px rgba(0,0,0,0.15)",
        }}
        transition={{ duration: 0.6 }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <svg viewBox={"0 0 " + BOARD_SIZE + " " + BOARD_SIZE} className="absolute inset-0 w-full h-full">
          <line x1={HALF} y1={40} x2={HALF} y2={BOARD_SIZE - 40} stroke="#6B4226" strokeWidth="1.5" opacity="0.5" />
          <line x1={40} y1={HALF} x2={BOARD_SIZE - 40} y2={HALF} stroke="#6B4226" strokeWidth="1.5" opacity="0.5" />
          <circle cx={HALF} cy={HALF} r={70} fill="none" stroke="#6B4226" strokeWidth="1.5" opacity="0.4" />
          <circle cx={HALF} cy={HALF} r={35} fill="none" stroke="#6B4226" strokeWidth="1.5" opacity="0.4" />
          <circle cx={HALF} cy={HALF} r={4} fill="#6B4226" opacity="0.5" />
          {POCKET_POS.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={POCKET_R} fill="#1a0f08" stroke="#3D2512" strokeWidth="2" />
          ))}
          <rect x={80} y={HALF - 15} width={HALF - 80 - 15} height={30} rx={2} fill="none" stroke="#6B4226" strokeWidth="1" opacity="0.3" />
          <rect x={HALF + 15} y={HALF - 15} width={HALF - 80 - 15} height={30} rx={2} fill="none" stroke="#6B4226" strokeWidth="1" opacity="0.3" />
          <rect x={HALF - 15} y={80} width={30} height={HALF - 80 - 15} rx={2} fill="none" stroke="#6B4226" strokeWidth="1" opacity="0.3" />
          <rect x={HALF - 15} y={HALF + 15} width={30} height={HALF - 80 - 15} rx={2} fill="none" stroke="#6B4226" strokeWidth="1" opacity="0.3" />
          {coins.filter(c => !c.pocketed).map(c => (
            <g key={c.id}>
              <circle cx={c.x} cy={c.y} r={c.radius + 1} fill={coinBorderMap[c.color]} opacity="0.5" />
              <circle cx={c.x} cy={c.y} r={c.radius} fill={coinColorMap[c.color]} stroke={coinBorderMap[c.color]} strokeWidth="1.5" />
              {c.color === "queen" && <circle cx={c.x} cy={c.y} r={c.radius * 0.4} fill="#FCD34D" />}
              <circle cx={c.x - 2} cy={c.y - 2} r={c.radius * 0.3} fill="white" opacity="0.3" />
            </g>
          ))}
          {/* Pocket flash glow effects */}
          <AnimatePresence>
            {pocketFlashes.map(flash => (
              <motion.circle
                key={flash.id}
                cx={flash.x}
                cy={flash.y}
                r={COIN_R}
                fill={flash.color === "queen" ? "rgba(220,38,38,0.6)" : flash.color === "white" ? "rgba(252,211,77,0.6)" : "rgba(96,165,250,0.6)"}
                initial={{ r: COIN_R, opacity: 0.9 }}
                animate={{ r: COIN_R + 28, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            ))}
          </AnimatePresence>
          {/* Striker pulsing glow when player's turn */}
          {!striker.active && turn === "player" && !gameOver ? (
            <motion.circle
              cx={striker.x}
              cy={striker.y}
              r={STRIKER_R + 2}
              fill="none"
              stroke="#F59E0B"
              strokeWidth="2"
              strokeDasharray="4 3"
              animate={{
                opacity: [0.3, 1, 0.3],
                strokeWidth: [1.5, 3.5, 1.5],
              }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          ) : !striker.active ? (
            <circle cx={striker.x} cy={striker.y} r={STRIKER_R + 2} fill="none" stroke="#F59E0B" strokeWidth="2" strokeDasharray="4 3" opacity="0.4" />
          ) : null}
          <circle cx={striker.x} cy={striker.y} r={STRIKER_R} fill="#F59E0B" stroke="#B45309" strokeWidth="2" />
          <circle cx={striker.x - 3} cy={striker.y - 3} r={STRIKER_R * 0.3} fill="white" opacity="0.35" />
          {dragging && (
            <line x1={striker.x} y1={striker.y} x2={striker.x + (striker.x - dragEnd.x)} y2={striker.y + (striker.y - dragEnd.y)} stroke="#FCD34D" strokeWidth="2" opacity="0.7" />
          )}
        </svg>
      </motion.div>

      {/* Message with scale bounce for pocket messages */}
      <AnimatePresence mode="wait">
        <motion.p
          key={message}
          initial={isPocketMsg ? { opacity: 0, y: 4, scale: 0.7 } : { opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={isPocketMsg
            ? { type: "spring", stiffness: 500, damping: 15, mass: 0.8 }
            : { duration: 0.2 }
          }
          className={"text-center text-xs mt-2 h-5 " + (isPocketMsg && message.includes("Voce") ? "text-amber-600 font-bold" : "text-muted-foreground")}
        >
          {message}
        </motion.p>
      </AnimatePresence>

      {/* Game over panel with richer animations */}
      <AnimatePresence>
        {gameOver && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="mt-4 rounded-2xl bg-card border p-6 text-center"
          >
            <motion.div
              animate={winner === "Voce venceu!" ? {
                filter: [
                  "drop-shadow(0 0 4px rgba(245,158,11,0.3))",
                  "drop-shadow(0 0 18px rgba(245,158,11,0.9))",
                  "drop-shadow(0 0 4px rgba(245,158,11,0.3))",
                ],
                scale: [1, 1.12, 1],
              } : {}}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            >
              <Trophy className={"h-10 w-10 mx-auto mb-3 " + (winner.includes("Voce") ? "text-amber-500" : "text-slate-400")} />
            </motion.div>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 400, damping: 20 }}
              className="text-xl font-black mb-1"
            >
              {winner}
            </motion.p>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35 }}
              className="text-sm text-muted-foreground mb-4"
            >
              Voce: {playerScore} | Bot: {botScore}
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, type: "spring", stiffness: 400, damping: 20 }}
            >
              <Button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }} onClick={restart} className="gap-2">
                <RotateCcw className="h-4 w-4" /> Jogar Novamente
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CarromBoard;
