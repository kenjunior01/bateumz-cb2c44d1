import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw, Timer, Grid3X3, Bot } from 'lucide-react';
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
type BotDifficulty = 'Fácil' | 'Médio' | 'Difícil';

interface CardData {
  id: number;
  pairId: number;
  shape: ShapeName;
  color: string;
  status: CardStatus;
}

/* ------------------------------------------------------------------ */
/*  Shape definitions – SVG path-based geometric patterns              */
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
  circle:    { color: '#06b6d4', label: 'Círculo' },
  star:      { color: '#eab308', label: 'Estrela' },
  diamond:   { color: '#ec4899', label: 'Diamante' },
  heart:     { color: '#ef4444', label: 'Coração' },
  triangle:  { color: '#22c55e', label: 'Triângulo' },
  square:    { color: '#3b82f6', label: 'Quadrado' },
  hexagon:   { color: '#a855f7', label: 'Hexágono' },
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
/*  Single Card component                                              */
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
      style={{ perspective: 600 }}
      layout
    >
      <AnimatePresence>
        {isMatched && (
          <motion.div
            key={`glow-${card.id}`}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: [0, 1, 0.6], scale: [0.8, 1.15, 1] }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="absolute inset-0 rounded-xl z-10 pointer-events-none"
            style={{
              boxShadow: `0 0 20px 4px ${shapeDef.color}66, 0 0 40px 8px ${shapeDef.color}33`,
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
            ? { x: [0, -6, 6, -6, 6, -3, 3, 0] }
            : isMatched
              ? { scale: [1, 1.12, 1] }
              : {}
        }
        transition={
          isShaking
            ? { duration: 0.5, ease: 'easeInOut' }
            : isMatched
              ? { duration: 0.4, ease: 'easeOut' }
              : {}
        }
        className={cn(
          'relative w-16 h-20 sm:w-20 sm:h-24 rounded-xl cursor-pointer focus:outline-none transition-shadow',
          isMatched && 'cursor-default',
          disabled && !isFlipped && !isMatched && 'cursor-not-allowed opacity-60',
        )}
        style={{
          transformStyle: 'preserve-3d',
        }}
        aria-label={`Carta ${index + 1}`}
      >
        <motion.div
          className={cn(
            'absolute inset-0 rounded-xl border bg-slate-800 border-slate-700 flex items-center justify-center',
          )}
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
          }}
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
        >
          <div className="text-slate-500 flex flex-col items-center justify-center">
            <CardBackPattern />
            <span className="text-slate-500 text-lg font-bold mt-0.5">?</span>
          </div>
          <span className="absolute bottom-0.5 right-1 text-[9px] text-slate-600 font-mono">
            {index + 1 <= 9 ? index + 1 : ''}
          </span>
        </motion.div>

        <motion.div
          className={cn(
            'absolute inset-0 rounded-xl border border-slate-300 dark:border-slate-400 bg-white dark:bg-slate-100 flex items-center justify-center',
            isMatched && 'border-green-400',
          )}
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
          }}
          animate={{ rotateY: isFlipped ? 0 : -180 }}
          transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
        >
          <ShapeSVG shape={card.shape} color={shapeDef.color} />
          {isMatched && (
            <motion.span
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, duration: 0.25 }}
              className="absolute top-0.5 right-0.5 text-green-500 text-xs"
            >
              ✓
            </motion.span>
          )}
        </motion.div>
      </motion.button>
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
  const [botDifficulty, setBotDifficulty] = useState<BotDifficulty>('Médio');
  const [gridSize, setGridSize] = useState<GridSize>('4x4');
  const [timerOption, setTimerOption] = useState<TimerOption>(90);
  const [cards, setCards] = useState<CardData[]>([]);
  const [flippedIndices, setFlippedIndices] = useState<number[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState<1 | 2>(1);
  const [scores, setScores] = useState<[number, number]>([0, 0]);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [canFlip, setCanFlip] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; color: string; id: number } | null>(null);
  const [winner, setWinner] = useState<1 | 2 | 'draw' | null>(null);
  const [botThinking, setBotThinking] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const feedbackIdRef = useRef(0);
  const botTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const botMemoryRef = useRef<Map<number, number>>(new Map()); // index -> pairId
  const isProcessingRef = useRef(false);

  const config = GRID_CONFIG[gridSize];
  const totalPairs = config.pairs;
  const matchedCount = cards.filter(c => c.status === 'matched').length / 2;
  const pairsLeft = totalPairs - matchedCount;

  const getP2Name = () => mode === 'bot' ? 'Computador' : 'Jogador 2';

  /* ---- Derived ---- */
  const activeGlow =
    currentPlayer === 1
      ? 'shadow-[0_0_20px_4px_rgba(6,182,212,0.35)] border-cyan-500/50'
      : 'shadow-[0_0_20px_4px_rgba(236,72,153,0.35)] border-pink-500/50';

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
    setCanFlip(true);
    setFeedback(null);
    setWinner(null);
    setTimeRemaining(timerOption);
    setBotThinking(false);
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

    // Remember revealed cards for bot
    if (player === 1 || mode === 'bot') {
      botMemoryRef.current.set(index, updated[index].pairId);
    }

    if (newFlipped.length === 2) {
      setCanFlip(false);
      const [a, b] = newFlipped;
      if (updated[a].pairId === updated[b].pairId) {
        setTimeout(() => {
          setCards(prev =>
            prev.map((c, i) => (i === a || i === b ? { ...c, status: 'matched' as CardStatus } : c)),
          );
          setScores(prev => {
            const next = [...prev] as [number, number];
            next[player - 1] += 1;
            return next;
          });
          showFeedback('Par!', 'bg-green-600 text-white');
          setFlippedIndices([]);
          setCanFlip(true);
          isProcessingRef.current = false;
        }, 500);
        return true;
      } else {
        showFeedback('Não é par', 'bg-red-600 text-white');
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
  }, [gameState, mode, showFeedback]);

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
      'Fácil': 0.3,
      'Médio': 0.6,
      'Difícil': 0.9,
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

      // First flip
      let firstPick: number;
      let secondPick: number | null = null;

      // Check if bot remembers a matching pair
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

      // Check if bot remembers one card of a pair and another is available
      if (!foundMatch) {
        for (const [pairId, indices] of rememberedPairs) {
          if (indices.length === 1 && Math.random() < memoryChance) {
            firstPick = indices[0];
            // Find the other card of this pair
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

      // Flip first card
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

      // After 800ms, flip second card
      botTimeoutRef.current = setTimeout(() => {
        if (gameState !== 'playing' || currentPlayer !== 2) {
          setBotThinking(false);
          return;
        }

        const freshCards = cards; // re-read latest
        const freshAvailable = freshCards
          .map((c, i) => ({ index: i, pairId: c.pairId, status: c.status }))
          .filter(c => c.status === 'hidden');

        let actualSecond: number;

        if (secondPick !== null && freshCards[secondPick]?.status === 'hidden') {
          actualSecond = secondPick;
        } else {
          // Try to find a match with the first card
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
          setTimeout(() => {
            setCards(prev =>
              prev.map((c, i) => (i === a || i === b ? { ...c, status: 'matched' as CardStatus } : c)),
            );
            setScores(prev => {
              const next = [...prev] as [number, number];
              next[1] += 1;
              return next;
            });
            showFeedback('Par!', 'bg-green-600 text-white');
            setFlippedIndices([]);
            setCanFlip(true);
            setBotThinking(false);
          }, 500);
        } else {
          showFeedback('Não é par', 'bg-red-600 text-white');
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

    // Bot thinks for 800ms before first flip
    botTimeoutRef.current = setTimeout(doBotTurn, 800);

    return () => {
      if (botTimeoutRef.current) {
        clearTimeout(botTimeoutRef.current);
        botTimeoutRef.current = null;
      }
      setBotThinking(false);
    };
  }, [gameState, mode, currentPlayer, canFlip, cards, flippedIndices, botDifficulty, showFeedback]);

  /* ---- Reset to idle ---- */
  const resetAll = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (botTimeoutRef.current) clearTimeout(botTimeoutRef.current);
    setGameState('idle');
    setCards([]);
    setFlippedIndices([]);
    setScores([0, 0]);
    setCurrentPlayer(1);
    setTimeRemaining(0);
    setCanFlip(false);
    setFeedback(null);
    setWinner(null);
    setBotThinking(false);
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
      <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-cyan-400 to-pink-400 bg-clip-text text-transparent">
        MEMÓRIA VS CARTAS
      </h2>

      <div className="w-full rounded-xl bg-gradient-to-r from-cyan-900/30 to-pink-900/30 border border-cyan-500/20 p-3 flex items-center justify-between">
        <div
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all',
            currentPlayer === 1 && gameState === 'playing'
              ? 'bg-cyan-500/20 ring-1 ring-cyan-400'
              : 'opacity-70',
          )}
        >
          <div className="w-3 h-3 rounded-full bg-cyan-400" />
          <span className="text-cyan-300 font-semibold text-sm">Jogador 1</span>
          <motion.span
            key={`s1-${scores[0]}`}
            initial={{ scale: 0.5, y: -8 }}
            animate={{ scale: 1, y: 0 }}
            className="text-white font-bold text-lg"
          >
            {scores[0]}
          </motion.span>
          <span className="text-cyan-400/60 text-xs">pares</span>
        </div>

        <div className="flex flex-col items-center gap-1">
          {gameState === 'playing' && (
            <AnimatePresence mode="wait">
              <motion.span
                key={currentPlayer}
                initial={{ opacity: 0, x: currentPlayer === 1 ? -10 : 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className={cn(
                  'text-xs font-semibold px-2 py-0.5 rounded-full',
                  currentPlayer === 1
                    ? 'text-cyan-300 bg-cyan-500/10'
                    : 'text-pink-300 bg-pink-500/10',
                )}
              >
                {currentPlayer === 2 && mode === 'bot' && botThinking ? 'Computador pensando...' : 'Sua vez'}
              </motion.span>
            </AnimatePresence>
          )}
          {gameState === 'idle' && (
            <span className="text-slate-400 text-xs">Pronto para jogar</span>
          )}
          {gameState === 'ended' && winner && winner !== 'draw' && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className={cn(
                'text-sm font-bold',
                winner === 1 ? 'text-cyan-300' : 'text-pink-300',
              )}
            >
              {winner === 1 ? 'Jogador 1' : getP2Name()} Venceu!
            </motion.span>
          )}
          {gameState === 'ended' && winner === 'draw' && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="text-sm font-bold text-yellow-300"
            >
              Empate!
            </motion.span>
          )}
        </div>

        <div
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all',
            currentPlayer === 2 && gameState === 'playing'
              ? 'bg-pink-500/20 ring-1 ring-pink-400'
              : 'opacity-70',
          )}
        >
          <span className="text-pink-400/60 text-xs">pares</span>
          <motion.span
            key={`s2-${scores[1]}`}
            initial={{ scale: 0.5, y: -8 }}
            animate={{ scale: 1, y: 0 }}
            className="text-white font-bold text-lg"
          >
            {scores[1]}
          </motion.span>
          {mode === 'bot' ? (
            <span className="text-pink-300 font-semibold text-sm flex items-center gap-1">
              <Bot className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Computador</span>
            </span>
          ) : (
            <span className="text-pink-300 font-semibold text-sm">Jogador 2</span>
          )}
          <div className="w-3 h-3 rounded-full bg-pink-400" />
        </div>
      </div>

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
            👤 Jogador
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
            {(['Fácil', 'Médio', 'Difícil'] as BotDifficulty[]).map(d => (
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

      {timerOption > 0 && gameState === 'playing' && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2"
        >
          <Badge
            variant="outline"
            className={cn(
              'font-mono text-sm px-3 py-0.5',
              timeRemaining <= 10
                ? 'border-red-500 text-red-400 bg-red-500/10'
                : timeRemaining <= 30
                  ? 'border-yellow-500 text-yellow-400 bg-yellow-500/10'
                  : 'border-slate-500 text-slate-300',
            )}
          >
            {fmt(timeRemaining)}
          </Badge>
        </motion.div>
      )}

      {gameState === 'idle' && (
        <div className="flex flex-col items-center gap-4 py-8">
          <div className="text-slate-400 text-sm text-center max-w-xs">
            Jogo de memória competitivo. {mode === 'bot' ? 'Desafie o computador!' : 'Dois jogadores revezam turnos no mesmo tabuleiro.'}
            Encontre os pares para marcar pontos!
          </div>
          <Button
            onClick={initGame}
            className="bg-gradient-to-r from-cyan-600 to-pink-600 hover:from-cyan-500 hover:to-pink-500 text-white px-6"
          >
            Iniciar Jogo
          </Button>
        </div>
      )}

      {(gameState === 'playing' || gameState === 'ended') && (
        <div
          className={cn(
            'relative rounded-xl p-3 transition-all duration-500 border-2',
            gameState === 'playing' && activeGlow,
            gameState === 'ended' && 'border-slate-700',
          )}
        >
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
        </div>
      )}

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
