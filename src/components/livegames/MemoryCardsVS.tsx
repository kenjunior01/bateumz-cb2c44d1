import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw, Timer, Grid3X3, Bot, Trophy, Zap, Sparkles, ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Props {
  onScore?: (name: string, score: number) => void;
  liveCode?: string;
}

type GridSize = '4x4' | '4x5';
type TimerOption = 0 | 60 | 90 | 120;
type GameState = 'idle' | 'playing' | 'ended';
type CardStatus = 'hidden' | 'flipping' | 'matched' | 'shaking';
type GameMode = 'player' | 'bot';
type BotDifficulty = 'F\u00e1cil' | 'M\u00e9dio' | 'Dif\u00edcil';

interface CardData {
  id: number;
  pairId: number;
  shape: ShapeName;
  color: string;
  status: CardStatus;
}

interface BurstParticle {
  id: number;
  x: number;
  y: number;
  color: string;
  angle: number;
  speed: number;
  size: number;
}

interface Confetto {
  id: number;
  x: number;
  delay: number;
  color: string;
  duration: number;
  rotation: number;
}

/* ------------------------------------------------------------------ */
/*  Shape definitions \u2013 SVG path-based geometric patterns              */
/* ------------------------------------------------------------------ */

type ShapeName =
  | 'circle'
  | 'star'
  | 'diamond'
  | 'heart'
  | 'triangle'
  | 'square'
  | 'hexagon'
  | 'cross'
  | 'moon'
  | 'lightning';

const SHAPE_DEFS: Record<ShapeName, { color: string; label: string }> = {
  circle:    { color: '#06b6d4', label: 'C\u00edrculo' },
  star:      { color: '#eab308', label: 'Estrela' },
  diamond:   { color: '#ec4899', label: 'Diamante' },
  heart:     { color: '#ef4444', label: 'Cora\u00e7\u00e3o' },
  triangle:  { color: '#22c55e', label: 'Tri\u00e2ngulo' },
  square:    { color: '#3b82f6', label: 'Quadrado' },
  hexagon:   { color: '#a855f7', label: 'Hex\u00e1gono' },
  cross:     { color: '#f97316', label: 'Cruz' },
  moon:      { color: '#6366f1', label: 'Lua' },
  lightning: { color: '#f59e0b', label: 'Raio' },
};

const ALL_SHAPES: ShapeName[] = [
  'circle', 'star', 'diamond', 'heart', 'triangle',
  'square', 'hexagon', 'cross', 'moon', 'lightning',
];

/* ------------------------------------------------------------------ */
/*  SVG shape renderer                                                 */
/* ------------------------------------------------------------------ */

function ShapeSVG({ shape, color }: { shape: ShapeName; color: string }) {
  const c = color;
  switch (shape) {
    case 'circle':
      return (
        <svg viewBox="0 0 40 40" className="w-8 h-8 sm:w-10 sm:h-10">
          <circle cx="20" cy="20" r="16" fill={c} />
        </svg>
      );
    case 'star':
      return (
        <svg viewBox="0 0 40 40" className="w-8 h-8 sm:w-10 sm:h-10">
          <polygon
            points="20,2 25.09,14.59 38.18,15.78 28.5,24.39 31.18,37.22 20,30.5 8.82,37.22 11.5,24.39 1.82,15.78 14.91,14.59"
            fill={c}
          />
        </svg>
      );
    case 'diamond':
      return (
        <svg viewBox="0 0 40 40" className="w-8 h-8 sm:w-10 sm:h-10">
          <polygon points="20,2 38,20 20,38 2,20" fill={c} />
        </svg>
      );
    case 'heart':
      return (
        <svg viewBox="0 0 40 40" className="w-8 h-8 sm:w-10 sm:h-10">
          <path
            d="M20 35 C10 27, 0 20, 0 13 A8 8 0 0 1 20 8 A8 8 0 0 1 40 13 C40 20, 30 27, 20 35Z"
            fill={c}
          />
        </svg>
      );
    case 'triangle':
      return (
        <svg viewBox="0 0 40 40" className="w-8 h-8 sm:w-10 sm:h-10">
          <polygon points="20,3 38,37 2,37" fill={c} />
        </svg>
      );
    case 'square':
      return (
        <svg viewBox="0 0 40 40" className="w-8 h-8 sm:w-10 sm:h-10">
          <rect x="5" y="5" width="30" height="30" rx="3" fill={c} />
        </svg>
      );
    case 'hexagon':
      return (
        <svg viewBox="0 0 40 40" className="w-8 h-8 sm:w-10 sm:h-10">
          <polygon
            points="20,2 36.66,11 36.66,29 20,38 3.34,29 3.34,11"
            fill={c}
          />
        </svg>
      );
    case 'cross':
      return (
        <svg viewBox="0 0 40 40" className="w-8 h-8 sm:w-10 sm:h-10">
          <path d="M14,2 H26 V14 H38 V26 H26 V38 H14 V26 H2 V14 H14Z" fill={c} />
        </svg>
      );
    case 'moon':
      return (
        <svg viewBox="0 0 40 40" className="w-8 h-8 sm:w-10 sm:h-10">
          <path
            d="M28 20 A12 12 0 1 1 20 4 A9 9 0 0 0 28 20Z"
            fill={c}
          />
        </svg>
      );
    case 'lightning':
      return (
        <svg viewBox="0 0 40 40" className="w-8 h-8 sm:w-10 sm:h-10">
          <polygon
            points="22,2 8,22 17,22 14,38 32,16 23,16"
            fill={c}
          />
        </svg>
      );
    default:
      return null;
  }
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const GRID_CONFIG: Record<GridSize, { cols: number; rows: number; pairs: number }> = {
  '4x4': { cols: 4, rows: 4, pairs: 8 },
  '4x5': { cols: 5, rows: 4, pairs: 10 },
};

/* ------------------------------------------------------------------ */
/*  Face-down pattern SVG (decorative back of card)                    */
/* ------------------------------------------------------------------ */

function CardBackPattern() {
  return (
    <svg
      viewBox="0 0 40 50"
      className="w-full h-full opacity-20"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="40" height="50" rx="4" fill="none" stroke="currentColor" strokeWidth="0.8" />
      <line x1="0" y1="25" x2="40" y2="25" stroke="currentColor" strokeWidth="0.4" />
      <line x1="20" y1="0" x2="20" y2="50" stroke="currentColor" strokeWidth="0.4" />
      <line x1="0" y1="0" x2="40" y2="50" stroke="currentColor" strokeWidth="0.3" />
      <line x1="40" y1="0" x2="0" y2="50" stroke="currentColor" strokeWidth="0.3" />
      <circle cx="20" cy="25" r="6" fill="none" stroke="currentColor" strokeWidth="0.5" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Match Burst Particles                                              */
/* ------------------------------------------------------------------ */

let particleIdCounter = 0;

function MatchBurstParticles({ color, onDone }: { color: string; onDone: () => void }) {
  const particles = useMemo<BurstParticle[]>(() => {
    const count = 14;
    return Array.from({ length: count }, (_, i) => ({
      id: ++particleIdCounter,
      x: 0,
      y: 0,
      color,
      angle: (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4,
      speed: 40 + Math.random() * 50,
      size: 3 + Math.random() * 4,
    }));
  }, [color]);

  useEffect(() => {
    const t = setTimeout(onDone, 900);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div className="absolute inset-0 pointer-events-none z-20 overflow-visible">
      {particles.map(p => {
        const dx = Math.cos(p.angle) * p.speed;
        const dy = Math.sin(p.angle) * p.speed;
        return (
          <motion.div
            key={p.id}
            className="absolute rounded-full"
            style={{
              left: '50%',
              top: '50%',
              width: p.size,
              height: p.size,
              backgroundColor: p.color,
              boxShadow: `0 0 6px 2px ${p.color}88`,
            }}
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            animate={{
              x: dx,
              y: dy,
              opacity: 0,
              scale: 0.2,
            }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
          />
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Match / Mismatch toast                                             */
/* ------------------------------------------------------------------ */

function FeedbackToast({ message, color }: { message: string; color: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.8 }}
      transition={{ duration: 0.3 }}
      className={cn(
        'absolute -top-8 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold z-30 whitespace-nowrap pointer-events-none',
        color,
      )}
    >
      {message}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Single Card component \u2013 Enhanced 3D flip, shake, glow             */
/* ------------------------------------------------------------------ */

interface CardProps {
  card: CardData;
  index: number;
  disabled: boolean;
  onClick: (index: number) => void;
}

function GameCard({ card, index, disabled, onClick }: CardProps) {
  const isFlipped = card.status === 'flipping' || card.status === 'matched';
  const isShaking = card.status === 'shaking';
  const isMatched = card.status === 'matched';
  const shapeDef = SHAPE_DEFS[card.shape];

  return (
    <motion.div
      className="relative"
      style={{ perspective: 1000 }}
      layout
    >
      <AnimatePresence>
        {isMatched && (
          <motion.div
            key={`glow-${card.id}`}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{
              opacity: [0, 1, 0.7, 1],
              scale: [0.6, 1.2, 1.05, 1.1],
            }}
            transition={{ duration: 0.8, ease: 'easeOut', times: [0, 0.3, 0.6, 1] }}
            className="absolute -inset-1 rounded-2xl z-0 pointer-events-none"
            style={{
              background: `radial-gradient(ellipse at center, ${shapeDef.color}44 0%, transparent 70%)`,
              boxShadow: `0 0 24px 6px ${shapeDef.color}55, 0 0 48px 12px ${shapeDef.color}22`,
            }}
          />
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        disabled={disabled || isFlipped || isMatched}
        onClick={() => onClick(index)}
        animate={
          isShaking
            ? {
                x: [0, -8, 8, -6, 6, -3, 3, 0],
                rotate: [0, -3, 3, -2, 2, -1, 1, 0],
              }
            : isMatched
              ? { scale: [1, 1.15, 0.95, 1.08, 1] }
              : {}
        }
        transition={
          isShaking
            ? { duration: 0.55, ease: 'easeInOut' }
            : isMatched
              ? { duration: 0.6, ease: 'easeOut', times: [0, 0.2, 0.5, 0.7, 1] }
              : {}
        }
        className={cn(
          'relative w-16 h-20 sm:w-20 sm:h-24 rounded-xl cursor-pointer focus:outline-none',
          isMatched && 'cursor-default',
          disabled && !isFlipped && !isMatched && 'cursor-not-allowed opacity-60',
          !disabled && !isFlipped && !isMatched && 'hover:brightness-125 active:scale-95',
        )}
        style={{
          transformStyle: 'preserve-3d',
          transform: isFlipped ? 'translateZ(20px)' : undefined,
        }}
        aria-label={`Carta ${index + 1}`}
      >
        {/* Red flash overlay for shaking */}
        <AnimatePresence>
          {isShaking && (
            <motion.div
              key={`redflash-${card.id}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.35, 0.25, 0] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.55 }}
              className="absolute inset-0 rounded-xl bg-red-500 z-20 pointer-events-none"
            />
          )}
        </AnimatePresence>

        {/* Card back (face-down) */}
        <motion.div
          className={cn(
            'absolute inset-0 rounded-xl border bg-slate-800 border-slate-700 flex items-center justify-center',
            'backface-hidden shadow-lg shadow-black/30',
          )}
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
          }}
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{
            duration: 0.5,
            ease: [0.4, 0.0, 0.2, 1],
          }}
        >
          <div className="text-slate-500 flex flex-col items-center justify-center">
            <CardBackPattern />
            <span className="text-slate-500 text-lg font-bold mt-0.5">?</span>
          </div>
          <span className="absolute bottom-0.5 right-1 text-[9px] text-slate-600 font-mono">
            {index + 1 <= 9 ? index + 1 : ''}
          </span>
        </motion.div>

        {/* Card front (face-up) */}
        <motion.div
          className={cn(
            'absolute inset-0 rounded-xl border border-slate-300 dark:border-slate-400 bg-white dark:bg-slate-100 flex items-center justify-center',
            'backface-hidden',
            isMatched
              ? 'border-green-400 shadow-lg shadow-green-500/20'
              : 'shadow-lg shadow-black/20',
          )}
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
          }}
          animate={{ rotateY: isFlipped ? 0 : -180 }}
          transition={{
            duration: 0.5,
            ease: [0.4, 0.0, 0.2, 1],
          }}
        >
          <ShapeSVG shape={card.shape} color={shapeDef.color} />
          {isMatched && (
            <motion.div
              initial={{ opacity: 0, scale: 0, rotate: -90 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ delay: 0.3, duration: 0.3, type: 'spring', stiffness: 200 }}
              className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center shadow-md"
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M1.5 5.5L3.5 7.5L8.5 2.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </motion.div>
          )}
        </motion.div>
      </motion.button>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Combo Badge                                                        */
/* ------------------------------------------------------------------ */

function ComboBadge({ combo, color }: { combo: number; color: string }) {
  if (combo < 2) return null;
  return (
    <motion.div
      key={`combo-${combo}`}
      initial={{ scale: 0, y: -6 }}
      animate={{ scale: 1, y: 0 }}
      exit={{ scale: 0, opacity: 0 }}
      className={cn(
        'flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold',
        'bg-amber-500/20 text-amber-300 border border-amber-500/40',
      )}
    >
      <Zap className="w-2.5 h-2.5" />
      <span>x{combo}</span>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Game Over Overlay with Confetti                                     */
/* ------------------------------------------------------------------ */

function GameOverOverlay({
  winner,
  p2Name,
  scores,
  combos,
  totalPairs,
  onPlayAgain,
  onReset,
}: {
  winner: 1 | 2 | 'draw';
  p2Name: string;
  scores: [number, number];
  combos: [number, number];
  totalPairs: number;
  onPlayAgain: () => void;
  onReset: () => void;
}) {
  const confetti = useMemo<Confetto[]>(() => {
    const colors = ['#06b6d4', '#ec4899', '#eab308', '#22c55e', '#a855f7', '#f97316', '#ef4444', '#3b82f6'];
    return Array.from({ length: 40 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 1.2,
      color: colors[Math.floor(Math.random() * colors.length)],
      duration: 2.5 + Math.random() * 2,
      rotation: Math.random() * 360,
    }));
  }, []);

  const winnerColor = winner === 1 ? 'from-cyan-400 to-cyan-600' : 'from-pink-400 to-pink-600';
  const winnerName = winner === 'draw' ? 'Empate' : winner === 1 ? 'Jogador 1' : p2Name;
  const winnerIcon = winner === 'draw' ? <Sparkles className="w-8 h-8 text-yellow-400" /> : <Trophy className="w-8 h-8 text-yellow-400" />;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="absolute inset-0 z-50 flex items-center justify-center"
    >
      {/* Confetti */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {confetti.map(c => (
          <motion.div
            key={c.id}
            className="absolute w-2 h-2 rounded-sm"
            style={{
              left: `${c.x}%`,
              top: -10,
              backgroundColor: c.color,
              rotate: c.rotation,
            }}
            initial={{ y: -20, opacity: 1, rotate: 0 }}
            animate={{
              y: ['0vh', '105vh'],
              x: [0, (Math.random() - 0.5) * 80],
              rotate: [0, 360 + Math.random() * 360],
              opacity: [1, 1, 0.5],
            }}
            transition={{
              duration: c.duration,
              delay: c.delay,
              ease: 'linear',
            }}
          />
        ))}
      </div>

      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Content card */}
      <motion.div
        initial={{ scale: 0.7, y: 30, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.15 }}
        className="relative z-10 w-[90%] max-w-sm rounded-2xl border border-slate-600/50 bg-slate-900/95 backdrop-blur-md p-6 shadow-2xl"
      >
        {/* Trophy + winner */}
        <div className="flex flex-col items-center gap-2 mb-5">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 180, damping: 12, delay: 0.3 }}
          >
            {winnerIcon}
          </motion.div>
          <motion.h3
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className={cn(
              'text-2xl font-extrabold bg-clip-text text-transparent',
              winner === 'draw' ? 'bg-gradient-to-r from-cyan-400 to-pink-400' : `bg-gradient-to-r ${winnerColor}`,
            )}
          >
            {winner === 'draw' ? 'Empate!' : `${winnerName} Venceu!`}
          </motion.h3>
        </div>

        {/* Score comparison */}
        <div className="flex items-center justify-between gap-3 mb-5">
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.6 }}
            className={cn(
              'flex-1 rounded-xl p-3 text-center border',
              winner === 1
                ? 'border-cyan-500/50 bg-cyan-500/10'
                : 'border-slate-700 bg-slate-800/50',
            )}
          >
            <div className="text-cyan-300 text-xs font-semibold mb-1">Jogador 1</div>
            <div className="text-3xl font-black text-white">{scores[0]}</div>
            <div className="text-slate-400 text-[10px] mt-1">de {totalPairs} pares</div>
            {combos[0] >= 2 && (
              <div className="flex items-center justify-center gap-0.5 text-amber-400 text-[10px] mt-1">
                <Zap className="w-2.5 h-2.5" /> Melhor combo: x{combos[0]}
              </div>
            )}
          </motion.div>

          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.7, type: 'spring' }}
            className="text-slate-500 font-bold text-sm"
          >
            VS
          </motion.div>

          <motion.div
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.6 }}
            className={cn(
              'flex-1 rounded-xl p-3 text-center border',
              winner === 2
                ? 'border-pink-500/50 bg-pink-500/10'
                : 'border-slate-700 bg-slate-800/50',
            )}
          >
            <div className="text-pink-300 text-xs font-semibold mb-1">{p2Name}</div>
            <div className="text-3xl font-black text-white">{scores[1]}</div>
            <div className="text-slate-400 text-[10px] mt-1">de {totalPairs} pares</div>
            {combos[1] >= 2 && (
              <div className="flex items-center justify-center gap-0.5 text-amber-400 text-[10px] mt-1">
                <Zap className="w-2.5 h-2.5" /> Melhor combo: x{combos[1]}
              </div>
            )}
          </motion.div>
        </div>

        {/* Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={onReset}
            variant="outline"
            className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-800"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1" />
            Menu
          </Button>
          <Button
            onClick={onPlayAgain}
            className="flex-1 bg-gradient-to-r from-cyan-600 to-pink-600 hover:from-cyan-500 hover:to-pink-500 text-white"
          >
            <Sparkles className="w-3.5 h-3.5 mr-1" />
            Jogar Novamente
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ================================================================== */
/*  Main component                                                     */
/* ================================================================== */

export default function MemoryCardsVS({ onScore, liveCode: _liveCode }: Props) {
  /* ---- State ---- */
  const [gameState, setGameState] = useState<GameState>('idle');
  const [mode, setMode] = useState<GameMode>('player');
  const [botDifficulty, setBotDifficulty] = useState<BotDifficulty>('M\u00e9dio');
  const [gridSize, setGridSize] = useState<GridSize>('4x4');
  const [timerOption, setTimerOption] = useState<TimerOption>(90);
  const [cards, setCards] = useState<CardData[]>([]);
  const [flippedIndices, setFlippedIndices] = useState<number[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState<1 | 2>(1);
  const [scores, setScores] = useState<[number, number]>([0, 0]);
  const [combos, setCombos] = useState<[number, number]>([0, 0]);
  const [bestCombos, setBestCombos] = useState<[number, number]>([0, 0]);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [canFlip, setCanFlip] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; color: string; id: number } | null>(null);
  const [winner, setWinner] = useState<1 | 2 | 'draw' | null>(null);
  const [botThinking, setBotThinking] = useState(false);
  const [burstParticles, setBurstParticles] = useState<{ color: string; key: number } | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const feedbackIdRef = useRef(0);
  const botTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const botMemoryRef = useRef<Map<number, number>>(new Map());
  const isProcessingRef = useRef(false);
  const burstKeyRef = useRef(0);

  const config = GRID_CONFIG[gridSize];
  const totalPairs = config.pairs;
  const matchedCount = cards.filter(c => c.status === 'matched').length / 2;
  const pairsLeft = totalPairs - matchedCount;

  const getP2Name = () => mode === 'bot' ? 'Computador' : 'Jogador 2';

  /* ---- Derived ---- */
  const activeGlow =
    currentPlayer === 1
      ? 'shadow-[0_0_24px_6px_rgba(6,182,212,0.3)] border-cyan-500/50'
      : 'shadow-[0_0_24px_6px_rgba(236,72,153,0.3)] border-pink-500/50';

  const activeTurnColor = currentPlayer === 1 ? 'text-cyan-300' : 'text-pink-300';

  /* ---- Spawn burst particles ---- */
  const spawnBurst = useCallback((color: string) => {
    const key = ++burstKeyRef.current;
    setBurstParticles({ color, key });
    setTimeout(() => setBurstParticles(prev => prev && prev.key === key ? null : prev), 900);
  }, []);

  /* ---- Update combo ---- */
  const updateCombo = useCallback((player: 1 | 2, isMatch: boolean) => {
    if (isMatch) {
      setCombos(prev => {
        const next = [...prev] as [number, number];
        next[player - 1] += 1;
        return next;
      });
      setBestCombos(prev => {
        const next = [...prev] as [number, number];
        const currentCombo = (player === 1 ? combos[0] : combos[1]) + 1;
        if (currentCombo > next[player - 1]) {
          next[player - 1] = currentCombo;
        }
        return next;
      });
    } else {
      setCombos(prev => {
        const next = [...prev] as [number, number];
        next[player - 1] = 0;
        return next;
      });
    }
  }, [combos]);

  /* ---- Init game ---- */
  const initGame = useCallback(() => {
    if (botTimeoutRef.current) clearTimeout(botTimeoutRef.current);
    botMemoryRef.current = new Map();
    const shapes = shuffle(ALL_SHAPES).slice(0, totalPairs);
    const deck: CardData[] = [];
    shapes.forEach((shape, pairIdx) => {
      const color = SHAPE_DEFS[shape].color;
      deck.push({ id: deck.length, pairId: pairIdx, shape, color, status: 'hidden' });
      deck.push({ id: deck.length, pairId: pairIdx, shape, color, status: 'hidden' });
    });
    const shuffled = shuffle(deck);
    setCards(shuffled);
    setFlippedIndices([]);
    setCurrentPlayer(1);
    setScores([0, 0]);
    setCombos([0, 0]);
    setBestCombos([0, 0]);
    setCanFlip(true);
    setFeedback(null);
    setWinner(null);
    setTimeRemaining(timerOption);
    setBotThinking(false);
    setBurstParticles(null);
    isProcessingRef.current = false;
    setGameState('playing');
  }, [totalPairs, timerOption]);

  /* ---- Timer effect ---- */
  useEffect(() => {
    if (gameState !== 'playing' || timerOption === 0) return;
    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState, timerOption]);

  /* ---- End game when timer hits 0 ---- */
  const endGame = useCallback(() => {
    setGameState('ended');
    setCanFlip(false);
    setBotThinking(false);
    if (botTimeoutRef.current) clearTimeout(botTimeoutRef.current);
    if (timerRef.current) clearInterval(timerRef.current);

    const timeBonus = timerOption > 0 ? timeRemaining : 0;

    if (scores[0] > scores[1]) {
      setWinner(1);
      onScore?.('Jogador 1', scores[0] * 10 + timeBonus);
    } else if (scores[1] > scores[0]) {
      setWinner(2);
      onScore?.(getP2Name(), scores[1] * 10 + timeBonus);
    } else {
      setWinner('draw');
    }
  }, [scores, timerOption, timeRemaining, onScore, mode]);

  useEffect(() => {
    if (gameState === 'playing' && timerOption > 0 && timeRemaining === 0) {
      endGame();
    }
  }, [timeRemaining, gameState, timerOption, endGame]);

  /* ---- Show feedback toast ---- */
  const showFeedback = useCallback((message: string, color: string) => {
    const id = ++feedbackIdRef.current;
    setFeedback({ message, color, id });
    setTimeout(() => setFeedback(prev => (prev && prev.id === id ? null : prev)), 900);
  }, []);

  /* ---- Core card click handler (shared by player and bot) ---- */
  const processFlip = useCallback((
    index: number,
    player: 1 | 2,
    currentCards: CardData[],
    currentFlipped: number[],
    currentCanFlip: boolean,
  ) => {
    if (!currentCanFlip || gameState !== 'playing' || isProcessingRef.current) return false;
    const card = currentCards[index];
    if (card.status !== 'hidden') return false;
    if (currentFlipped.includes(index)) return false;

    isProcessingRef.current = true;
    const newFlipped = [...currentFlipped, index];
    const updated = currentCards.map((c, i) => (i === index ? { ...c, status: 'flipping' as CardStatus } : c));
    setCards(updated);
    setFlippedIndices(newFlipped);

    if (player === 1 || mode === 'bot') {
      botMemoryRef.current.set(index, updated[index].pairId);
    }

    if (newFlipped.length === 2) {
      setCanFlip(false);
      const [a, b] = newFlipped;
      if (updated[a].pairId === updated[b].pairId) {
        const matchColor = updated[a].color;
        setTimeout(() => {
          setCards(prev =>
            prev.map((c, i) => (i === a || i === b ? { ...c, status: 'matched' as CardStatus } : c)),
          );
          setScores(prev => {
            const next = [...prev] as [number, number];
            next[player - 1] += 1;
            return next;
          });
          updateCombo(player, true);
          spawnBurst(matchColor);
          const comboVal = (player === 1 ? combos[0] : combos[1]) + 1;
          if (comboVal >= 2) {
            showFeedback(`Par! Combo x${comboVal}`, 'bg-green-600 text-white');
          } else {
            showFeedback('Par!', 'bg-green-600 text-white');
          }
          setFlippedIndices([]);
          setCanFlip(true);
          isProcessingRef.current = false;
        }, 500);
        return true;
      } else {
        updateCombo(player, false);
        showFeedback('N\u00e3o \u00e9 par', 'bg-red-600 text-white');
        setTimeout(() => {
          setCards(prev =>
            prev.map((c, i) =>
              i === a || i === b ? { ...c, status: 'shaking' as CardStatus } : c,
            ),
          );
        }, 400);
        setTimeout(() => {
          setCards(prev =>
            prev.map((c, i) =>
              i === a || i === b ? { ...c, status: 'hidden' as CardStatus } : c,
            ),
          );
          setFlippedIndices([]);
          setCurrentPlayer(prev => (prev === 1 ? 2 : 1));
          setCanFlip(true);
          isProcessingRef.current = false;
        }, 1000);
        return true;
      }
    }
    isProcessingRef.current = false;
    return true;
  }, [gameState, mode, showFeedback, updateCombo, spawnBurst, combos]);

  /* ---- Player card click ---- */
  const handleCardClick = useCallback(
    (index: number) => {
      if (mode === 'bot' && currentPlayer === 2) return;
      processFlip(index, 1, cards, flippedIndices, canFlip);
    },
    [mode, currentPlayer, cards, flippedIndices, canFlip, processFlip],
  );

  /* ---- Keyboard support ---- */
  useEffect(() => {
    if (gameState !== 'playing' || !canFlip) return;
    function handleKey(e: KeyboardEvent) {
      if (mode === 'bot' && currentPlayer === 2) return;
      let idx = -1;
      if (e.key >= '1' && e.key <= '9') idx = parseInt(e.key) - 1;
      else if (e.key === '0' && cards.length >= 10) idx = 9;
      else return;
      if (idx >= 0 && idx < cards.length) {
        handleCardClick(idx);
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [gameState, canFlip, cards, handleCardClick, mode, currentPlayer]);

  /* ---- Check if all matched ---- */
  useEffect(() => {
    if (gameState !== 'playing') return;
    if (matchedCount === totalPairs) {
      endGame();
    }
  }, [matchedCount, totalPairs, gameState, endGame]);

  /* ---- Bot AI effect ---- */
  useEffect(() => {
    if (gameState !== 'playing' || mode !== 'bot' || currentPlayer !== 2 || !canFlip) return;

    setBotThinking(true);

    const botMemoryPct: Record<BotDifficulty, number> = {
      'F\u00e1cil': 0.3,
      'M\u00e9dio': 0.6,
      'Dif\u00edcil': 0.9,
    };
    const memoryChance = botMemoryPct[botDifficulty];
    const memory = botMemoryRef.current;

    const getAvailableCards = () => {
      return cards
        .map((c, i) => ({ index: i, pairId: c.pairId, status: c.status }))
        .filter(c => c.status === 'hidden');
    };

    const doBotTurn = () => {
      if (gameState !== 'playing' || currentPlayer !== 2 || !canFlip) {
        setBotThinking(false);
        return;
      }

      const available = getAvailableCards();
      if (available.length < 2) {
        setBotThinking(false);
        return;
      }

      let firstPick: number;
      let secondPick: number | null = null;

      const rememberedPairs = new Map<number, number[]>();
      for (const [idx, pairId] of memory) {
        if (cards[idx]?.status === 'hidden') {
          if (!rememberedPairs.has(pairId)) rememberedPairs.set(pairId, []);
          rememberedPairs.get(pairId)!.push(idx);
        }
      }

      let foundMatch = false;
      for (const [, indices] of rememberedPairs) {
        if (indices.length >= 2) {
          if (Math.random() < memoryChance) {
            firstPick = indices[0];
            secondPick = indices[1];
            foundMatch = true;
            break;
          }
        }
      }

      if (!foundMatch) {
        for (const [pairId, indices] of rememberedPairs) {
          if (indices.length === 1 && Math.random() < memoryChance) {
            firstPick = indices[0];
            const otherIdx = available.find(
              c => c.pairId === pairId && c.index !== firstPick
            );
            if (otherIdx) {
              secondPick = otherIdx.index;
              foundMatch = true;
              break;
            }
          }
        }
      }

      if (!foundMatch) {
        firstPick = available[Math.floor(Math.random() * available.length)].index;
      }

      const currentCards = cards;
      const currentFlipped = flippedIndices;

      if (currentCards[firstPick]?.status !== 'hidden') {
        setBotThinking(false);
        return;
      }

      const newFlipped = [...currentFlipped, firstPick];
      const updated = currentCards.map((c, i) =>
        i === firstPick ? { ...c, status: 'flipping' as CardStatus } : c
      );
      setCards(updated);
      setFlippedIndices(newFlipped);
      memory.set(firstPick, updated[firstPick].pairId);

      botTimeoutRef.current = setTimeout(() => {
        if (gameState !== 'playing' || currentPlayer !== 2) {
          setBotThinking(false);
          return;
        }

        const freshCards = cards;
        const freshAvailable = freshCards
          .map((c, i) => ({ index: i, pairId: c.pairId, status: c.status }))
          .filter(c => c.status === 'hidden');

        let actualSecond: number;

        if (secondPick !== null && freshCards[secondPick]?.status === 'hidden') {
          actualSecond = secondPick;
        } else {
          const firstPairId = updated[firstPick].pairId;
          const matchIdx = freshAvailable.find(c => c.pairId === firstPairId && c.index !== firstPick);
          if (matchIdx && Math.random() < memoryChance) {
            actualSecond = matchIdx.index;
          } else {
            actualSecond = freshAvailable[Math.floor(Math.random() * freshAvailable.length)].index;
          }
        }

        const finalFlipped = [firstPick, actualSecond];
        const finalUpdated = freshCards.map((c, i) =>
          i === actualSecond ? { ...c, status: 'flipping' as CardStatus } : c
        );
        setCards(finalUpdated);
        setFlippedIndices(finalFlipped);
        memory.set(actualSecond, finalUpdated[actualSecond].pairId);

        setCanFlip(false);
        const [a, b] = finalFlipped;
        if (finalUpdated[a].pairId === finalUpdated[b].pairId) {
          const matchColor = finalUpdated[a].color;
          setTimeout(() => {
            setCards(prev =>
              prev.map((c, i) => (i === a || i === b ? { ...c, status: 'matched' as CardStatus } : c)),
            );
            setScores(prev => {
              const next = [...prev] as [number, number];
              next[1] += 1;
              return next;
            });
            updateCombo(2, true);
            spawnBurst(matchColor);
            const comboVal = combos[1] + 1;
            if (comboVal >= 2) {
              showFeedback(`Par! Combo x${comboVal}`, 'bg-green-600 text-white');
            } else {
              showFeedback('Par!', 'bg-green-600 text-white');
            }
            setFlippedIndices([]);
            setCanFlip(true);
            setBotThinking(false);
          }, 500);
        } else {
          updateCombo(2, false);
          showFeedback('N\u00e3o \u00e9 par', 'bg-red-600 text-white');
          setTimeout(() => {
            setCards(prev =>
              prev.map((c, i) =>
                i === a || i === b ? { ...c, status: 'shaking' as CardStatus } : c,
              ),
            );
          }, 400);
          setTimeout(() => {
            setCards(prev =>
              prev.map((c, i) =>
                i === a || i === b ? { ...c, status: 'hidden' as CardStatus } : c,
              ),
            );
            setFlippedIndices([]);
            setCurrentPlayer(1);
            setCanFlip(true);
            setBotThinking(false);
          }, 1000);
        }
      }, 800);
    };

    botTimeoutRef.current = setTimeout(doBotTurn, 800);

    return () => {
      if (botTimeoutRef.current) {
        clearTimeout(botTimeoutRef.current);
        botTimeoutRef.current = null;
      }
      setBotThinking(false);
    };
  }, [gameState, mode, currentPlayer, canFlip, cards, flippedIndices, botDifficulty, showFeedback, updateCombo, spawnBurst, combos]);

  /* ---- Reset to idle ---- */
  const resetAll = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (botTimeoutRef.current) clearTimeout(botTimeoutRef.current);
    setGameState('idle');
    setCards([]);
    setFlippedIndices([]);
    setScores([0, 0]);
    setCombos([0, 0]);
    setBestCombos([0, 0]);
    setCurrentPlayer(1);
    setTimeRemaining(0);
    setCanFlip(false);
    setFeedback(null);
    setWinner(null);
    setBotThinking(false);
    setBurstParticles(null);
    botMemoryRef.current = new Map();
    isProcessingRef.current = false;
  };

  /* ---- Format timer ---- */
  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  /* ================================================================== */
  /*  Render                                                            */
  /* ================================================================== */

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-lg mx-auto select-none">
      <h2 className="text-xl sm:text-2xl font-extrabold bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent tracking-tight">
        MEM\u00d3RIA VS CARTAS
      </h2>

      {/* ---- Score / Turn Bar ---- */}
      <div className="w-full rounded-xl bg-gradient-to-r from-cyan-900/30 to-pink-900/30 border border-slate-700/50 p-3">
        <div className="flex items-center justify-between">
          {/* Player 1 panel */}
          <div
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-300',
              currentPlayer === 1 && gameState === 'playing'
                ? 'bg-cyan-500/15 ring-1 ring-cyan-400/70 shadow-[0_0_12px_2px_rgba(6,182,212,0.2)]'
                : 'opacity-60',
            )}
          >
            <motion.div
              className="w-3 h-3 rounded-full bg-cyan-400"
              animate={
                currentPlayer === 1 && gameState === 'playing'
                  ? { scale: [1, 1.4, 1], boxShadow: ['0 0 0 0 rgba(6,182,212,0.5)', '0 0 0 6px rgba(6,182,212,0)', '0 0 0 0 rgba(6,182,212,0.5)'] }
                  : {}
              }
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            />
            <div className="flex flex-col">
              <span className="text-cyan-300 font-semibold text-xs leading-tight">Jogador 1</span>
              <AnimatePresence>
                {combos[0] >= 2 && (
                  <ComboBadge combo={combos[0]} color="cyan" />
                )}
              </AnimatePresence>
            </div>
            <motion.span
              key={`s1-${scores[0]}`}
              initial={{ scale: 0.5, y: -10 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 15 }}
              className="text-white font-black text-2xl tabular-nums"
            >
              {scores[0]}
            </motion.span>
            <span className="text-cyan-400/50 text-[10px] leading-none">pares</span>
          </div>

          {/* Center turn indicator */}
          <div className="flex flex-col items-center gap-1 min-w-[90px]">
            {gameState === 'playing' && (
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentPlayer}
                  initial={{ opacity: 0, x: currentPlayer === 1 ? -12 : 12, scale: 0.8 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: currentPlayer === 1 ? 12 : -12, scale: 0.8 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                  className="flex flex-col items-center gap-0.5"
                >
                  {currentPlayer === 2 && mode === 'bot' && botThinking ? (
                    <div className="flex items-center gap-1">
                      <motion.div
                        className="flex gap-0.5"
                        animate={{ opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 1.2, repeat: Infinity }}
                      >
                        <span className={cn('text-[10px] font-semibold', activeTurnColor)}>Pensando</span>
                        <motion.span
                          animate={{ opacity: [0, 1, 0] }}
                          transition={{ duration: 1.2, repeat: Infinity, delay: 0 }}
                          className={cn('text-[10px]', activeTurnColor)}
                        >.</motion.span>
                        <motion.span
                          animate={{ opacity: [0, 1, 0] }}
                          transition={{ duration: 1.2, repeat: Infinity, delay: 0.2 }}
                          className={cn('text-[10px]', activeTurnColor)}
                        >.</motion.span>
                        <motion.span
                          animate={{ opacity: [0, 1, 0] }}
                          transition={{ duration: 1.2, repeat: Infinity, delay: 0.4 }}
                          className={cn('text-[10px]', activeTurnColor)}
                        >.</motion.span>
                      </motion.div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      {currentPlayer === 1 ? (
                        <ArrowRight className={cn('w-3 h-3', activeTurnColor)} />
                      ) : (
                        <ArrowLeft className={cn('w-3 h-3', activeTurnColor)} />
                      )}
                      <span className={cn('text-[10px] font-bold', activeTurnColor)}>SUA VEZ</span>
                    </div>
                  )}
                  <div
                    className={cn(
                      'w-6 h-0.5 rounded-full',
                      currentPlayer === 1 ? 'bg-cyan-400' : 'bg-pink-400',
                    )}
                  />
                </motion.div>
              </AnimatePresence>
            )}
            {gameState === 'idle' && (
              <span className="text-slate-500 text-[10px]">Pronto para jogar</span>
            )}
            {gameState === 'ended' && winner && winner !== 'draw' && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 250 }}
                className="flex flex-col items-center"
              >
                <Trophy className={cn('w-4 h-4', winner === 1 ? 'text-cyan-400' : 'text-pink-400')} />
                <span className={cn('text-[10px] font-bold mt-0.5', winner === 1 ? 'text-cyan-300' : 'text-pink-300')}>
                  {winner === 1 ? 'Jogador 1' : getP2Name()}
                </span>
              </motion.div>
            )}
            {gameState === 'ended' && winner === 'draw' && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="flex flex-col items-center"
              >
                <Sparkles className="w-4 h-4 text-yellow-400" />
                <span className="text-[10px] font-bold text-yellow-300 mt-0.5">Empate</span>
              </motion.div>
            )}
          </div>

          {/* Player 2 panel */}
          <div
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-300',
              currentPlayer === 2 && gameState === 'playing'
                ? 'bg-pink-500/15 ring-1 ring-pink-400/70 shadow-[0_0_12px_2px_rgba(236,72,153,0.2)]'
                : 'opacity-60',
            )}
          >
            <span className="text-pink-400/50 text-[10px] leading-none">pares</span>
            <motion.span
              key={`s2-${scores[1]}`}
              initial={{ scale: 0.5, y: -10 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 15 }}
              className="text-white font-black text-2xl tabular-nums"
            >
              {scores[1]}
            </motion.span>
            <div className="flex flex-col items-end">
              <span className="text-pink-300 font-semibold text-xs leading-tight flex items-center gap-1">
                {mode === 'bot' ? (
                  <>
                    <Bot className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Computador</span>
                    <span className="sm:hidden">CPU</span>
                  </>
                ) : (
                  'Jogador 2'
                )}
              </span>
              <AnimatePresence>
                {combos[1] >= 2 && (
                  <ComboBadge combo={combos[1]} color="pink" />
                )}
              </AnimatePresence>
            </div>
            <motion.div
              className="w-3 h-3 rounded-full bg-pink-400"
              animate={
                currentPlayer === 2 && gameState === 'playing'
                  ? { scale: [1, 1.4, 1], boxShadow: ['0 0 0 0 rgba(236,72,153,0.5)', '0 0 0 6px rgba(236,72,153,0)', '0 0 0 0 rgba(236,72,153,0.5)'] }
                  : {}
              }
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            />
          </div>
        </div>
      </div>

      {/* ---- Settings bar ---- */}
      <div className="w-full flex flex-wrap items-center justify-center gap-2">
        <div className="flex items-center gap-1">
          <span className="text-xs text-slate-400 mr-1">Modo:</span>
          <Button
            size="sm"
            variant={mode === 'player' ? 'default' : 'outline'}
            className={cn(
              'h-7 px-2.5 text-xs',
              mode === 'player' && 'bg-slate-700 hover:bg-slate-600',
            )}
            disabled={gameState === 'playing'}
            onClick={() => setMode('player')}
          >
            <span className="mr-1 text-[10px]">⛹</span> Jogador
          </Button>
          <Button
            size="sm"
            variant={mode === 'bot' ? 'default' : 'outline'}
            className={cn(
              'h-7 px-2.5 text-xs gap-1',
              mode === 'bot' && 'bg-slate-700 hover:bg-slate-600',
            )}
            disabled={gameState === 'playing'}
            onClick={() => setMode('bot')}
          >
            <Bot className="w-3 h-3" />
            Computador
          </Button>
        </div>

        {mode === 'bot' && (
          <div className="flex items-center gap-1">
            <span className="text-xs text-slate-400 mr-1">IA:</span>
            {(['F\u00e1cil', 'M\u00e9dio', 'Dif\u00edcil'] as BotDifficulty[]).map(d => (
              <Button
                key={d}
                size="sm"
                variant={botDifficulty === d ? 'default' : 'outline'}
                className={cn(
                  'h-7 px-2.5 text-xs',
                  botDifficulty === d && 'bg-slate-700 hover:bg-slate-600',
                )}
                disabled={gameState === 'playing'}
                onClick={() => setBotDifficulty(d)}
              >
                {d}
              </Button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-1">
          <Grid3X3 className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-xs text-slate-400 mr-1">Tabuleiro</span>
          {(['4x4', '4x5'] as GridSize[]).map(g => (
            <Button
              key={g}
              size="sm"
              variant={gridSize === g ? 'default' : 'outline'}
              className={cn(
                'h-7 px-2.5 text-xs',
                gridSize === g && 'bg-slate-700 hover:bg-slate-600',
              )}
              disabled={gameState === 'playing'}
              onClick={() => setGridSize(g)}
            >
              {g}
            </Button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          <Timer className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-xs text-slate-400 mr-1">Tempo</span>
          {([0, 60, 90, 120] as TimerOption[]).map(t => (
            <Button
              key={t}
              size="sm"
              variant={timerOption === t ? 'default' : 'outline'}
              className={cn(
                'h-7 px-2.5 text-xs',
                timerOption === t && 'bg-slate-700 hover:bg-slate-600',
              )}
              disabled={gameState === 'playing'}
              onClick={() => setTimerOption(t)}
            >
              {t === 0 ? 'Sem timer' : `${t}s`}
            </Button>
          ))}
        </div>
      </div>

      {/* ---- Timer bar ---- */}
      {timerOption > 0 && gameState === 'playing' && (
        <div className="w-full flex items-center gap-2">
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex-1"
          >
            <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
              <motion.div
                className={cn(
                  'h-full rounded-full transition-colors duration-300',
                  timeRemaining <= 10
                    ? 'bg-red-500'
                    : timeRemaining <= 30
                      ? 'bg-yellow-500'
                      : 'bg-cyan-500',
                )}
                animate={{ width: `${(timeRemaining / timerOption) * 100}%` }}
                transition={{ duration: 0.5, ease: 'linear' }}
              />
            </div>
          </motion.div>
          <Badge
            variant="outline"
            className={cn(
              'font-mono text-sm px-3 py-0.5 tabular-nums',
              timeRemaining <= 10
                ? 'border-red-500 text-red-400 bg-red-500/10 animate-pulse'
                : timeRemaining <= 30
                  ? 'border-yellow-500 text-yellow-400 bg-yellow-500/10'
                  : 'border-slate-500 text-slate-300',
            )}
          >
            {fmt(timeRemaining)}
          </Badge>
        </div>
      )}

      {/* ---- Idle screen ---- */}
      {gameState === 'idle' && (
        <div className="flex flex-col items-center gap-4 py-8">
          <div className="text-slate-400 text-sm text-center max-w-xs">
            Jogo de mem\u00f3ria competitivo. {mode === 'bot' ? 'Desafie o computador!' : 'Dois jogadores revezam turnos no mesmo tabuleiro.'}
            Encontre os pares para marcar pontos!
          </div>
          <Button
            onClick={initGame}
            className="bg-gradient-to-r from-cyan-600 to-pink-600 hover:from-cyan-500 hover:to-pink-500 text-white px-8 py-2 text-sm font-semibold shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30 transition-shadow"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Iniciar Jogo
          </Button>
        </div>
      )}

      {/* ---- Game board ---- */}
      {(gameState === 'playing' || gameState === 'ended') && (
        <div
          className={cn(
            'relative rounded-xl p-3 transition-all duration-500 border-2',
            gameState === 'playing' && activeGlow,
            gameState === 'ended' && 'border-slate-700',
          )}
        >
          {/* Burst particles overlay */}
          <AnimatePresence>
            {burstParticles && (
              <MatchBurstParticles
                key={burstParticles.key}
                color={burstParticles.color}
                onDone={() => {}}
              />
            )}
          </AnimatePresence>

          <AnimatePresence>
            {feedback && (
              <FeedbackToast
                key={feedback.id}
                message={feedback.message}
                color={feedback.color}
              />
            )}
          </AnimatePresence>

          <div
            className="grid gap-2"
            style={{
              gridTemplateColumns: `repeat(${config.cols}, minmax(0, 1fr))`,
            }}
          >
            {cards.map((card, idx) => (
              <GameCard
                key={card.id}
                card={card}
                index={idx}
                disabled={!canFlip || (mode === 'bot' && currentPlayer === 2)}
                onClick={handleCardClick}
              />
            ))}
          </div>

          {/* Game over overlay */}
          <AnimatePresence>
            {gameState === 'ended' && winner && (
              <GameOverOverlay
                winner={winner}
                p2Name={getP2Name()}
                scores={scores}
                combos={bestCombos}
                totalPairs={totalPairs}
                onPlayAgain={initGame}
                onReset={resetAll}
              />
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ---- Bottom bar ---- */}
      {(gameState === 'playing' || gameState === 'ended') && (
        <div className="flex items-center gap-4 mt-1">
          <Button
            variant="outline"
            size="sm"
            onClick={resetAll}
            className="gap-1.5 text-slate-300 border-slate-600 hover:bg-slate-800"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reiniciar Tudo
          </Button>
          <Badge
            variant="secondary"
            className="bg-slate-800 text-slate-300 border border-slate-700"
          >
            Pares restantes: {pairsLeft}
          </Badge>
        </div>
      )}
    </div>
  );
}
