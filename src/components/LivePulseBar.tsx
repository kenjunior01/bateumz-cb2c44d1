// =============================================================
// LivePulseBar — Floating live activity ticker
// Shows simulated platform activity in a horizontal ticker bar
// Fixed above the bottom tab bar with glass morphism styling
// =============================================================

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy,
  Ticket,
  Radio,
  Swords,
  Award,
  Zap,
  X,
} from 'lucide-react';
import { useSoundEffects } from '@/hooks/useSoundEffects';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ActivityEvent {
  id: string;
  type: 'win' | 'raffle' | 'live' | 'tournament' | 'achievement' | 'challenge';
  icon: typeof Trophy;
  playerName: string;
  targetName: string;
  template: string;
}

// ---------------------------------------------------------------------------
// Icon & style mappings per event type
// ---------------------------------------------------------------------------

const EVENT_META: Record<
  ActivityEvent['type'],
  { icon: typeof Trophy; iconColor: string }
> = {
  win:        { icon: Trophy,  iconColor: 'text-amber-400' },
  raffle:     { icon: Ticket,  iconColor: 'text-emerald-400' },
  live:       { icon: Radio,   iconColor: 'text-rose-400' },
  tournament: { icon: Swords,  iconColor: 'text-violet-400' },
  achievement:{ icon: Award,   iconColor: 'text-cyan-400' },
  challenge:  { icon: Zap,     iconColor: 'text-orange-400' },
};

// ---------------------------------------------------------------------------
// Portuguese name & game pools
// ---------------------------------------------------------------------------

const FIRST_NAMES = [
  'Joao', 'Maria', 'Carlos', 'Ana', 'Pedro', 'Fatima', 'Ricardo', 'Beatriz',
  'Fernando', 'Teresa', 'Miguel', 'Luisa', 'Andre', 'Cristina', 'Hugo',
  'Natasha', 'Diogo', 'Sofia', 'Rui', 'Isabel', 'Nelson', 'Lucia', 'Manuel',
  'Patricia', 'Goncalo', 'Daniela', 'Eduardo', 'Leonor', 'Bruno', 'Marta',
  'Tomas', 'Filipa', 'Jorge', 'Clara',
];

const LAST_INITIALS = [
  'M.', 'S.', 'T.', 'L.', 'N.', 'K.', 'D.', 'F.', 'A.', 'C.', 'R.', 'B.',
  'P.', 'V.', 'J.', 'G.', 'Q.', 'O.', 'H.', 'Z.', 'W.',
];

const GAME_NAMES = [
  'Galo PRO', 'Pong VS', 'Bingo LIVE', 'Quiz Battle', 'Roleta', 'RPS Arena',
  'Ligar 4', 'Damas PRO', 'Xadrez', 'Milionario', 'Flappy Race', 'Snake Battle',
  '2048', 'Memory Cards', 'Dominoes', 'Tic-Tac-Toe PRO', 'Word Scramble',
  'Color Match', 'Space Shooter', 'Speed Reaction', 'Quick Math',
  'Tower Stack', 'Whack-a-Mole', 'Carrom Board', 'Checkers',
  'Rock Paper Scissors', 'Uno Cards', 'Dice Duel', 'Cannon Battle',
  'Maze Race', 'Chess Master', 'Battleship', 'Connect 4', 'Bingo Clash',
];

const RAFFLE_NAMES = [
  'Sorteio iPhone 15', 'Sorteio Capulana', 'Sorteio Samsung Galaxy',
  'Sorteio PS5', 'Sorteio AirPods', 'Sorteio Notebook',
  'Sorteio Smart TV', 'Sorteio Tablet', 'Sorteio Fone BT',
  'Sorteio Voucher 500', 'Sorteio Mochila', 'Sorteio Tênis',
  'Sorteio Relogio', 'Sorteio Carrinho', 'Sorteio Kit Escolar',
  'Sorteio Camisola Oficial',
];

const CREATOR_HANDLES = [
  '@criador', '@gamerpro', '@raffleking', '@quizmaster', '@liveday',
  '@bingo_star', '@pongfury', '@chessmoz', '@sorteirao', '@batalhando',
  '@fliperama_live', '@quizzeiro', '@sortemega', '@galo_master', '@damas_king',
];

const TOURNAMENT_NAMES = [
  'Torneio Semanal', 'Torneio Blitz', 'Torneio Galo', 'Torneio Quiz',
  'Torneio Pong', 'Torneio Cassino', 'Torneio Damas', 'Torneio Lideres',
  'Torneio da Semana', 'Torneio Flash', 'Torneio Noite', 'Torneio VIP',
];

const ACHIEVEMENT_NAMES = [
  'Velocista', 'Vencedor', 'Sequencia Perfeita', 'Mestre do Quiz',
  'Rei do Galo', 'Lenda do Pong', 'Sortudo', 'Invencivel',
  'Explorador', 'Bingo Mania', 'Cerebro', 'Reflexo Ninja',
  'Duelista', 'Milionario', 'Top Gamer', 'Social Star',
];

const OPPONENT_NAMES = [
  'alguem', 'um rival', 'o amigo', 'o campeao', 'um desconhecido',
  'o lider', 'o rival', 'um mestre', 'o desafiante',
];

// ---------------------------------------------------------------------------
// Template builders per event type
// ---------------------------------------------------------------------------

const TEMPLATES: Record<
  ActivityEvent['type'],
  (player: string, target: string) => string
> = {
  win:         (p, g) => `${p} venceu no ${g}`,
  raffle:      (p, r) => `${p} entrou no ${r}`,
  live:        (p, c) => `Live iniciada por ${c}`,
  tournament:  (p, t) => `${p} entrou no ${t}`,
  achievement: (p, a) => `${p} desbloqueou a conquista ${a}`,
  challenge:   (p, o) => `${p} desafiou ${o}`,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

let _counter = 0;
function uid(): string {
  return `lpb-${Date.now()}-${_counter++}`;
}

function generateEvent(): ActivityEvent {
  const type = pick<ActivityEvent['type']>([
    'win', 'raffle', 'live', 'tournament', 'achievement', 'challenge',
  ]);

  const playerName = `${pick(FIRST_NAMES)} ${pick(LAST_INITIALS)}`;
  let targetName = '';

  switch (type) {
    case 'win':        targetName = pick(GAME_NAMES);       break;
    case 'raffle':     targetName = pick(RAFFLE_NAMES);     break;
    case 'live':       targetName = pick(CREATOR_HANDLES);  break;
    case 'tournament': targetName = pick(TOURNAMENT_NAMES); break;
    case 'achievement':targetName = pick(ACHIEVEMENT_NAMES);break;
    case 'challenge':  targetName = pick(OPPONENT_NAMES);   break;
  }

  const template = TEMPLATES[type](playerName, targetName);

  return {
    id: uid(),
    type,
    icon: EVENT_META[type].icon,
    playerName,
    targetName,
    template,
  };
}

/** Pre-generate a pool of 30 unique events to draw from */
function buildPool(size = 30): ActivityEvent[] {
  const seen = new Set<string>();
  const pool: ActivityEvent[] = [];
  let attempts = 0;
  while (pool.length < size && attempts < size * 3) {
    const ev = generateEvent();
    if (!seen.has(ev.template)) {
      seen.add(ev.template);
      pool.push(ev);
    }
    attempts++;
  }
  return pool;
}

// ---------------------------------------------------------------------------
// Interval helper — random between min and max ms
// ---------------------------------------------------------------------------

function randomInterval(min = 3000, max = 5000): number {
  return min + Math.floor(Math.random() * (max - min));
}

// ---------------------------------------------------------------------------
// Dismiss cooldown key for localStorage
// ---------------------------------------------------------------------------

const DISMISS_STORAGE_KEY = 'bateu_livepulse_dismissed_until';

function getDismissUntil(): number {
  try {
    return Number(localStorage.getItem(DISMISS_STORAGE_KEY)) || 0;
  } catch {
    return 0;
  }
}

function setDismissUntil(ts: number): void {
  try {
    localStorage.setItem(DISMISS_STORAGE_KEY, String(ts));
  } catch {
    /* noop */
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function LivePulseBar() {
  const { sfx } = useSoundEffects();
  const pool = useMemo(() => buildPool(30), []);
  const [currentEvent, setCurrentEvent] = useState<ActivityEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastIdx = useRef(-1);

  // Check dismiss state on mount and periodically
  const checkDismiss = useCallback(() => {
    const until = getDismissUntil();
    if (Date.now() < until) {
      setIsVisible(false);
    } else {
      setIsVisible(true);
    }
  }, []);

  useEffect(() => {
    checkDismiss();
    const interval = window.setInterval(checkDismiss, 5000);
    return () => window.clearInterval(interval);
  }, [checkDismiss]);

  // Cycle events
  useEffect(() => {
    if (!isVisible) return;

    const scheduleNext = () => {
      const delay = randomInterval(3000, 5000);
      timeoutRef.current = setTimeout(() => {
        let idx: number;
        do {
          idx = Math.floor(Math.random() * pool.length);
        } while (idx === lastIdx.current && pool.length > 1);
        lastIdx.current = idx;
        setCurrentEvent(pool[idx]);
        scheduleNext();
      }, delay);
    };

    // Show first event immediately
    const firstIdx = Math.floor(Math.random() * pool.length);
    lastIdx.current = firstIdx;
    setCurrentEvent(pool[firstIdx]);
    scheduleNext();

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [isVisible, pool]);

  // Dismiss handler
  const handleDismiss = useCallback(() => {
    sfx?.click?.();
    const until = Date.now() + 30_000;
    setDismissUntil(until);
    setIsVisible(false);
  }, [sfx]);

  if (!currentEvent || !isVisible) return null;

  const meta = EVENT_META[currentEvent.type];
  const Icon = meta.icon;

  // Build rich text segments: playerName in accent, rest in foreground
  const { playerName, template } = currentEvent;
  const parts = template.split(new RegExp(`(${playerName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'g'));
  // Also highlight the target name if present
  const { targetName: target } = currentEvent;
  const richParts = parts.flatMap((segment) => {
    if (segment === playerName) {
      return { text: segment, className: 'text-[hsl(var(--accent))] font-semibold' };
    }
    // Try to highlight target within this segment
    const escapedTarget = target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const subParts = segment.split(new RegExp(`(${escapedTarget})`, 'g'));
    return subParts.map((sub) => {
      if (sub === target) {
        return { text: sub, className: 'text-[hsl(var(--primary))] font-semibold' };
      }
      return { text: sub, className: 'text-foreground/70' };
    });
  });

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-x-0 z-40 flex justify-center pointer-events-none"
        style={{ bottom: 'max(env(safe-area-inset-bottom, 0px) + 70px, 70px)' }}
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 20, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      >
        {/* Desktop responsive positioning: override bottom on md+ */}
        <div className="w-full px-3 md:absolute md:left-1/2 md:-translate-x-1/2 md:w-auto md:max-w-md md:px-0 md:bottom-4 md:top-auto md:translate-y-0">
          <div
            className="relative pointer-events-auto group"
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
          >
            {/* Close button — visible on hover */}
            <button
              onClick={handleDismiss}
              className={`
                absolute -top-1.5 -right-1.5 z-10
                h-5 w-5 rounded-full
                bg-black/70 backdrop-blur-sm
                text-white/50 hover:text-white
                flex items-center justify-center
                transition-opacity duration-200
                ${isHovering ? 'opacity-100' : 'opacity-0'}
              `}
              aria-label="Dispensar notificacoes por 30 segundos"
            >
              <X className="h-3 w-3" />
            </button>

            {/* Bar container — glass morphism */}
            <div className="
              bg-background/80 backdrop-blur-xl
              border border-white/[0.06]
              rounded-full
              shadow-lg shadow-black/20
              overflow-hidden
              cursor-pointer
              select-none
            ">
              <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-2.5">
                {/* Pulsing LIVE indicator */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className="relative flex h-2 w-2">
                    <motion.span
                      className="absolute inline-flex h-full w-full rounded-full bg-emerald-400/70"
                      animate={{ opacity: [1, 0.3, 1], scale: [1, 1.4, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                    />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 hidden sm:inline">
                    LIVE
                  </span>
                </div>

                {/* Divider */}
                <div className="w-px h-4 bg-white/[0.08] flex-shrink-0" />

                {/* Ticker content */}
                <div className="flex-1 min-w-0 h-5 flex items-center overflow-hidden">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentEvent.id}
                      className="flex items-center gap-1.5 sm:gap-2 whitespace-nowrap min-w-0 w-full"
                      initial={{ x: 40, opacity: 0, filter: 'blur(4px)' }}
                      animate={{ x: 0, opacity: 1, filter: 'blur(0px)' }}
                      exit={{ x: -40, opacity: 0, filter: 'blur(4px)' }}
                      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
                    >
                      {/* Event icon */}
                      <span className={`flex-shrink-0 ${meta.iconColor}`}>
                        <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      </span>

                      {/* Rich text */}
                      <span className="text-[11px] sm:text-xs font-medium truncate">
                        {richParts.map((part, i) => (
                          <span key={i} className={part.className}>
                            {part.text}
                          </span>
                        ))}
                      </span>
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
