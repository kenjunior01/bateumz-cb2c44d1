import { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { publish, subscribe } from '@/lib/liveBus';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import {
  Swords,
  Trophy,
  Zap,
  Calculator,
  Type,
  Palette,
  Timer,
  RotateCcw,
  Play,
  ChevronRight,
  Heart,
  Sparkles,
  Crown,
  Volume2,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface VSDuelArenaProps {
  onScore?: (name: string, score: number) => void;
  liveCode?: string;
}

type RoundType = 'reaction' | 'math' | 'scramble' | 'color';
type Phase =
  | 'setup'
  | 'vsIntro'
  | 'roundIntro'
  | 'playing'
  | 'roundResult'
  | 'gameOver';

interface Player {
  name: string;
  score: number; // rounds won
  health: number; // 0-100 visual
  reactionTime: number | null;
}

interface RoundConfig {
  type: RoundType;
  label: string;
  icon: React.ReactNode;
  description: string;
}

/* ------------------------------------------------------------------ */
/*  Constants & helpers                                                 */
/* ------------------------------------------------------------------ */

const TOTAL_ROUNDS = 5;
const WINNING_ROUNDS = 3;

const ROUND_CONFIGS: Record<RoundType, RoundConfig> = {
  reaction: {
    type: 'reaction',
    label: 'Teste de Reação',
    icon: <Zap className="h-5 w-5" />,
    description: 'Toque o mais rápido quando o sinal aparecer!',
  },
  math: {
    type: 'math',
    label: 'Matemática Veloz',
    icon: <Calculator className="h-5 w-5" />,
    description: 'Resolva a conta o mais rápido possível!',
  },
  scramble: {
    type: 'scramble',
    label: 'Desembaralhe a Palavra',
    icon: <Type className="h-5 w-5" />,
    description: 'Descubra a palavra embaralhada!',
  },
  color: {
    type: 'color',
    label: 'Correspondência de Cores',
    icon: <Palette className="h-5 w-5" />,
    description: 'A cor da palavra bate com o que está escrito?',
  },
};

const ROUND_TYPES: RoundType[] = ['reaction', 'math', 'scramble', 'color'];

const WORD_LIST = [
  'BRASIL', 'FUTEBOL', 'CAMPEAO', 'BATALHA', 'INCRIVEL', 'VELOCIDADE',
  'TORCEDOR', 'VENCEDOR', 'DESAFIO', 'GUERREIRO', 'POTENCIA', 'ESTRELAS',
  'TRIUNFO', 'DOMINIO', 'ENERGIA', 'EXPLOSAO', 'DESTRUIDOR', 'RAIO',
  'TROVÃO', 'FOGO', 'CHUVA', 'TERRA', 'VENTO', 'AGUA', 'LARANJA',
];

const MATH_OPS = ['+', '-', '×'] as const;

const COLORS_MAP: Record<string, string> = {
  VERMELHO: '#ef4444',
  AZUL: '#3b82f6',
  VERDE: '#22c55e',
  AMARELO: '#eab308',
  ROXO: '#a855f7',
  LARANJA: '#f97316',
  ROSA: '#ec4899',
  BRANCO: '#f8fafc',
};

const COLOR_NAMES = Object.keys(COLORS_MAP);

function generateMathProblem(): { question: string; answer: number } {
  const op = MATH_OPS[Math.floor(Math.random() * MATH_OPS.length)];
  let a: number, b: number, answer: number;

  switch (op) {
    case '+':
      a = Math.floor(Math.random() * 50) + 5;
      b = Math.floor(Math.random() * 50) + 5;
      answer = a + b;
      break;
    case '-':
      a = Math.floor(Math.random() * 50) + 20;
      b = Math.floor(Math.random() * (a - 1)) + 1;
      answer = a - b;
      break;
    case '×':
      a = Math.floor(Math.random() * 12) + 2;
      b = Math.floor(Math.random() * 12) + 2;
      answer = a * b;
      break;
    default:
      a = 5; b = 3; answer = 8;
  }

  return { question: `${a} ${op} ${b}`, answer };
}

function shuffleLetters(word: string): string {
  const arr = word.split('');
  let scrambled = [...arr];
  for (let attempts = 0; attempts < 20; attempts++) {
    scrambled = [...arr];
    for (let i = scrambled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [scrambled[i], scrambled[j]] = [scrambled[j], scrambled[i]];
    }
    if (scrambled.join('') !== word) return scrambled.join('');
  }
  return scrambled.join('');
}

function generateColorChallenge(): {
  displayWord: string;
  textColor: string;
  correctAnswer: 'sim' | 'nao';
} {
  const word = COLOR_NAMES[Math.floor(Math.random() * COLOR_NAMES.length)];
  const colorName = COLOR_NAMES[Math.floor(Math.random() * COLOR_NAMES.length)];
  const textColor = COLORS_MAP[colorName];
  const correctAnswer: 'sim' | 'nao' = word === colorName ? 'sim' : 'nao';

  return { displayWord: word, textColor, correctAnswer };
}

function getRandomRoundType(exclude?: RoundType): RoundType {
  const available = exclude ? ROUND_TYPES.filter((r) => r !== exclude) : ROUND_TYPES;
  return available[Math.floor(Math.random() * available.length)];
}

function healthFromScore(score: number): number {
  return Math.max(0, 100 - (WINNING_ROUNDS - score) * (100 / WINNING_ROUNDS));
}

/* ------------------------------------------------------------------ */
/*  Confetti particles                                                 */
/* ------------------------------------------------------------------ */

function ConfettiParticle({ index }: { index: number }) {
  const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7', '#ec4899'];
  const color = colors[index % colors.length];
  const startX = Math.random() * 100;
  const drift = (Math.random() - 0.5) * 200;
  const rotation = Math.random() * 720 - 360;
  const duration = 2 + Math.random() * 2;
  const delay = Math.random() * 0.5;
  const size = 6 + Math.random() * 8;

  return (
    <motion.div
      initial={{ opacity: 1, y: -20, x: `${startX}vw`, rotate: 0 }}
      animate={{
        opacity: [1, 1, 0],
        y: '110vh',
        x: `${startX}vw`,
        rotate: rotation,
      }}
      transition={{ duration, delay, ease: 'easeOut' }}
      style={{
        position: 'absolute',
        top: 0,
        left: `${startX + drift / 10}vw`,
        width: size,
        height: size * (0.6 + Math.random() * 0.8),
        backgroundColor: color,
        borderRadius: Math.random() > 0.5 ? '50%' : '2px',
      }}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Health Bar                                                         */
/* ------------------------------------------------------------------ */

function HealthBar({ health, side }: { health: number; side: 'left' | 'right' }) {
  const hue = side === 'left' ? 0 : 220;
  const color = health > 60
    ? `hsl(${hue}, 85%, 55%)`
    : health > 30
      ? `hsl(${hue === 0 ? 40 : 200}, 90%, 50%)`
      : `hsl(0, 85%, 50%)`;

  return (
    <div className="w-full h-3 rounded-full overflow-hidden bg-black/40 border border-white/10">
      <motion.div
        className="h-full rounded-full"
        style={{
          background: `linear-gradient(90deg, ${color}, ${color}dd)`,
          boxShadow: `0 0 8px ${color}66`,
        }}
        initial={{ width: '100%' }}
        animate={{ width: `${health}%` }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export default function VSDuelArena({ onScore, liveCode }: VSDuelArenaProps) {
  /* ---------- State ---------- */
  const [phase, setPhase] = useState<Phase>('setup');
  const [players, setPlayers] = useState<[Player, Player]>([
    { name: '', score: 0, health: 100, reactionTime: null },
    { name: '', score: 0, health: 100, reactionTime: null },
  ]);
  const [currentRound, setCurrentRound] = useState(0);
  const [roundType, setRoundType] = useState<RoundType>('reaction');
  const [roundWinner, setRoundWinner] = useState<0 | 1 | null>(null);
  const [roundDraw, setRoundDraw] = useState(false);

  // Reaction test
  const [reactionActive, setReactionActive] = useState(false);
  const [reactionSignalShown, setReactionSignalShown] = useState(false);
  const [reactionLocked, setReactionLocked] = useState<0 | 1 | null>(null);

  // Math speed
  const [mathProblem, setMathProblem] = useState<{ question: string; answer: number } | null>(null);
  const [mathInputs, setMathInputs] = useState(['', '']);
  const [mathLocked, setMathLocked] = useState<0 | 1 | null>(null);

  // Word scramble
  const [scrambleWord, setScrambleWord] = useState('');
  const [scrambleAnswer, setScrambleAnswer] = useState('');
  const [scrambleInputs, setScrambleInputs] = useState(['', '']);
  const [scrambleLocked, setScrambleLocked] = useState<0 | 1 | null>(null);

  // Color match
  const [colorChallenge, setColorChallenge] = useState<{
    displayWord: string;
    textColor: string;
    correctAnswer: 'sim' | 'nao';
  } | null>(null);
  const [colorLocked, setColorLocked] = useState<0 | 1 | null>(null);

  // Timers
  const [countdown, setCountdown] = useState(0);
  const [roundTimer, setRoundTimer] = useState(0);

  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const inputRef1 = useRef<HTMLInputElement>(null);
  const inputRef2 = useRef<HTMLInputElement>(null);

  /* ---------- Cleanup ---------- */
  useEffect(() => {
    return () => timersRef.current.forEach(clearTimeout);
  }, []);

  /* ---------- LiveBus subscribe ---------- */
  useEffect(() => {
    if (!liveCode) return;
    const unsub = subscribe((evt) => {
      if (evt.type === 'activeGame' && evt.payload === 'vsDuelArena') {
        // could react to external start signals
      }
    });
    return unsub;
  }, [liveCode]);

  /* ---------- Helpers ---------- */
  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current.length = 0;
  }, []);

  const updatePlayer = useCallback((index: 0 | 1, patch: Partial<Player>) => {
    setPlayers((prev) => {
      const next = [...prev] as [Player, Player];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  }, []);

  const resetForNewGame = useCallback(() => {
    setPlayers([
      { name: '', score: 0, health: 100, reactionTime: null },
      { name: '', score: 0, health: 100, reactionTime: null },
    ]);
    setCurrentRound(0);
    setRoundWinner(null);
    setRoundDraw(false);
    setPhase('setup');
    clearTimers();
  }, [clearTimers]);

  const reportScore = useCallback(
    (name: string, score: number) => {
      onScore?.(name, score);
      publish({
        type: 'winner',
        payload: { name, meta: 'vsDuelArena', at: Date.now() },
      });
    },
    [onScore],
  );

  /* ---------- Start game ---------- */
  const startGame = useCallback(() => {
    if (!players[0].name.trim() || !players[1].name.trim()) return;
    setPhase('vsIntro');

    const t1 = setTimeout(() => {
      setPhase('roundIntro');
      const t2 = setTimeout(() => {
        startRound(1);
      }, 2500);
      timersRef.current.push(t2);
    }, 3000);
    timersRef.current.push(t1);
  }, [players]);

  /* ---------- Start round ---------- */
  const startRound = useCallback(
    (roundNum: number) => {
      setCurrentRound(roundNum);
      const type = getRandomRoundType(roundNum > 1 ? roundType : undefined);
      setRoundType(type);
      setRoundWinner(null);
      setRoundDraw(false);
      setReactionActive(false);
      setReactionSignalShown(false);
      setReactionLocked(null);
      setMathLocked(null);
      setScrambleLocked(null);
      setColorLocked(null);

      setPhase('roundIntro');

      const t1 = setTimeout(() => {
        setPhase('playing');
        setRoundTimer(15);

        switch (type) {
          case 'reaction':
            startReactionRound();
            break;
          case 'math': {
            const problem = generateMathProblem();
            setMathProblem(problem);
            setMathInputs(['', '']);
            break;
          }
          case 'scramble': {
            const word = WORD_LIST[Math.floor(Math.random() * WORD_LIST.length)];
            setScrambleAnswer(word);
            setScrambleWord(shuffleLetters(word));
            setScrambleInputs(['', '']);
            break;
          }
          case 'color': {
            setColorChallenge(generateColorChallenge());
            break;
          }
        }
      }, 2500);
      timersRef.current.push(t1);
    },
    [roundType],
  );

  /* ---------- Reaction round ---------- */
  const startReactionRound = useCallback(() => {
    setReactionActive(true);
    setReactionSignalShown(false);
    setReactionLocked(null);

    const delay = 2000 + Math.random() * 4000;
    const t1 = setTimeout(() => {
      setReactionSignalShown(true);
    }, delay);
    timersRef.current.push(t1);
  }, []);

  const handleReactionTap = useCallback(
    (playerIndex: 0 | 1) => {
      if (!reactionActive || !reactionSignalShown || reactionLocked !== null) return;
      setReactionLocked(playerIndex);
      setReactionActive(false);

      const winnerIdx = playerIndex;
      awardRound(winnerIdx);
    },
    [reactionActive, reactionSignalShown, reactionLocked],
  );

  /* ---------- Math round ---------- */
  const handleMathSubmit = useCallback(
    (playerIndex: 0 | 1) => {
      if (!mathProblem || mathLocked !== null) return;
      const val = parseInt(mathInputs[playerIndex], 10);
      if (isNaN(val)) return;

      if (val === mathProblem.answer) {
        setMathLocked(playerIndex);
        awardRound(playerIndex);
      } else {
        // Wrong answer: clear and let them retry
        const next = [...mathInputs] as [string, string];
        next[playerIndex] = '';
        setMathInputs(next);
      }
    },
    [mathProblem, mathInputs, mathLocked],
  );

  /* ---------- Scramble round ---------- */
  const handleScrambleSubmit = useCallback(
    (playerIndex: 0 | 1) => {
      if (!scrambleAnswer || scrambleLocked !== null) return;
      if (scrambleInputs[playerIndex].toUpperCase().trim() === scrambleAnswer) {
        setScrambleLocked(playerIndex);
        awardRound(playerIndex);
      } else {
        const next = [...scrambleInputs] as [string, string];
        next[playerIndex] = '';
        setScrambleInputs(next);
      }
    },
    [scrambleAnswer, scrambleInputs, scrambleLocked],
  );

  /* ---------- Color round ---------- */
  const handleColorAnswer = useCallback(
    (playerIndex: 0 | 1, answer: 'sim' | 'nao') => {
      if (!colorChallenge || colorLocked !== null) return;
      if (answer === colorChallenge.correctAnswer) {
        setColorLocked(playerIndex);
        awardRound(playerIndex);
      }
      // If wrong, they can try again since there are only 2 options
    },
    [colorChallenge, colorLocked],
  );

  /* ---------- Award round ---------- */
  const awardRound = useCallback(
    (winnerIndex: 0 | 1) => {
      const loserIndex = winnerIndex === 0 ? 1 : 0;
      const newScores = [...players] as [Player, Player];

      newScores[winnerIndex].score += 1;
      newScores[loserIndex].health = healthFromScore(newScores[loserIndex].score);
      newScores[winnerIndex].health = 100;

      setPlayers(newScores);
      setRoundWinner(winnerIndex);
      setPhase('roundResult');

      publish({
        type: 'roundState',
        payload: {
          game: 'vsDuelArena',
          phase: 'ended',
          timeLeft: 0,
          meta: { round: currentRound, winner: players[winnerIndex].name },
          at: Date.now(),
        },
      });

      // Check for game over
      if (newScores[winnerIndex].score >= WINNING_ROUNDS) {
        const t1 = setTimeout(() => {
          setPhase('gameOver');
          reportScore(players[winnerIndex].name, newScores[winnerIndex].score * 100);
        }, 2500);
        timersRef.current.push(t1);
      } else if (currentRound >= TOTAL_ROUNDS) {
        // All rounds played, determine winner by score
        const t1 = setTimeout(() => {
          setPhase('gameOver');
          if (newScores[0].score > newScores[1].score) {
            reportScore(players[0].name, newScores[0].score * 100);
          } else {
            reportScore(players[1].name, newScores[1].score * 100);
          }
        }, 2500);
        timersRef.current.push(t1);
      } else {
        const t1 = setTimeout(() => {
          startRound(currentRound + 1);
        }, 2500);
        timersRef.current.push(t1);
      }
    },
    [players, currentRound, reportScore, startRound],
  );

  /* ---------- Round timer ---------- */
  useEffect(() => {
    if (phase !== 'playing') return;
    const interval = setInterval(() => {
      setRoundTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          // Time's up — draw
          setRoundDraw(true);
          setPhase('roundResult');
          if (currentRound >= TOTAL_ROUNDS) {
            const t1 = setTimeout(() => setPhase('gameOver'), 2500);
            timersRef.current.push(t1);
          } else {
            const t1 = setTimeout(() => startRound(currentRound + 1), 2500);
            timersRef.current.push(t1);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [phase, currentRound, startRound]);

  /* ---------- Derived ---------- */
  const [p1, p2] = players;
  const finalWinner =
    p1.score > p2.score ? 0 : p2.score > p1.score ? 1 : null;
  const roundConfig = ROUND_CONFIGS[roundType];

  /* ================================================================ */
  /*  RENDER                                                           */
  /* ================================================================ */

  return (
    <div className="relative w-full max-w-2xl mx-auto overflow-hidden rounded-3xl border border-border bg-card">
      <AnimatePresence>
        {phase === 'gameOver' && (
          <motion.div
            className="absolute inset-0 z-50 pointer-events-none overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {Array.from({ length: 80 }).map((_, i) => (
              <ConfettiParticle key={i} index={i} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {phase === 'setup' && (
          <motion.div
            key="setup"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
          >
            <CardHeader className="text-center pb-2">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Swords className="h-5 w-5 text-red-500" />
                <CardTitle className="text-xl font-bold bg-gradient-to-r from-red-500 via-yellow-400 to-blue-500 bg-clip-text text-transparent">
                  Arena de Duelo VS
                </CardTitle>
                <Swords className="h-5 w-5 text-blue-500" />
              </div>
              <p className="text-xs text-muted-foreground">
                Melhor de {TOTAL_ROUNDS} rodadas • {WINNING_ROUNDS} vitórias para vencer
              </p>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-white font-bold text-sm shadow-lg">
                    1
                  </div>
                  <Badge className="bg-red-500/15 text-red-400 border-red-500/30 hover:bg-red-500/20">
                    Jogador 1
                  </Badge>
                </div>
                <Input
                  placeholder="Nome do jogador 1..."
                  value={p1.name}
                  onChange={(e) => updatePlayer(0, { name: e.target.value })}
                  className="rounded-xl border-red-500/30 focus:border-red-500 focus:ring-red-500/20"
                />
              </div>

              <div className="flex items-center justify-center">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-red-500/30 to-transparent" />
                <motion.div
                  className="mx-3 px-4 py-1 rounded-full bg-gradient-to-r from-red-500 via-purple-500 to-blue-500 text-white font-black text-lg shadow-xl"
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                >
                  VS
                </motion.div>
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold text-sm shadow-lg">
                    2
                  </div>
                  <Badge className="bg-blue-500/15 text-blue-400 border-blue-500/30 hover:bg-blue-500/20">
                    Jogador 2
                  </Badge>
                </div>
                <Input
                  placeholder="Nome do jogador 2..."
                  value={p2.name}
                  onChange={(e) => updatePlayer(1, { name: e.target.value })}
                  className="rounded-xl border-blue-500/30 focus:border-blue-500 focus:ring-blue-500/20"
                />
              </div>

              <Button
                onClick={startGame}
                disabled={!p1.name.trim() || !p2.name.trim()}
                className="w-full py-5 rounded-xl text-base font-bold bg-gradient-to-r from-red-500 via-purple-600 to-blue-500 hover:opacity-90 transition-opacity shadow-lg"
              >
                <Play className="h-5 w-5 mr-2" />
                Iniciar Duelo
              </Button>
            </CardContent>
          </motion.div>
        )}

        {phase === 'vsIntro' && (
          <motion.div
            key="vsIntro"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative flex items-center justify-center min-h-[420px]"
          >
            <div className="absolute inset-0 flex">
              <motion.div
                className="w-1/2 bg-gradient-to-r from-red-600/30 to-red-600/10"
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              />
              <motion.div
                className="w-1/2 bg-gradient-to-l from-blue-600/30 to-blue-600/10"
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              />
            </div>

            <motion.div
              className="absolute left-4 flex flex-col items-center gap-2"
              initial={{ x: -80, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5, ease: 'backOut' }}
            >
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-white font-black text-2xl md:text-3xl shadow-2xl border-4 border-white/20">
                {p1.name.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm md:text-base font-bold text-red-400 truncate max-w-[120px]">
                {p1.name}
              </span>
            </motion.div>

            <motion.div
              className="relative z-10 flex flex-col items-center"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.8, duration: 0.6, type: 'spring', stiffness: 200 }}
            >
              <motion.div
                className="text-7xl md:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-yellow-300 to-red-500 drop-shadow-[0_0_30px_rgba(255,200,0,0.5)] select-none"
                animate={{
                  scale: [1, 1.05, 1],
                  textShadow: [
                    '0 0 20px rgba(255,200,0,0.5)',
                    '0 0 40px rgba(255,200,0,0.8)',
                    '0 0 20px rgba(255,200,0,0.5)',
                  ],
                }}
                transition={{ repeat: Infinity, duration: 1 }}
              >
                VS
              </motion.div>
              <motion.p
                className="text-xs text-white/60 mt-1 tracking-widest uppercase"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.5 }}
              >
                Preparem-se!
              </motion.p>
            </motion.div>

            <motion.div
              className="absolute right-4 flex flex-col items-center gap-2"
              initial={{ x: 80, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5, ease: 'backOut' }}
            >
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-black text-2xl md:text-3xl shadow-2xl border-4 border-white/20">
                {p2.name.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm md:text-base font-bold text-blue-400 truncate max-w-[120px]">
                {p2.name}
              </span>
            </motion.div>
          </motion.div>
        )}

        {phase === 'roundIntro' && (
          <motion.div
            key={`roundIntro-${currentRound}`}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.2 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col items-center justify-center min-h-[320px] text-center px-6"
          >
            <Badge
              variant="outline"
              className="mb-4 text-xs border-yellow-500/40 text-yellow-400 bg-yellow-500/10"
            >
              Rodada {currentRound} de {TOTAL_ROUNDS}
            </Badge>

            <motion.div
              className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-4"
              animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
              transition={{ repeat: Infinity, duration: 0.8 }}
            >
              {roundConfig.icon}
            </motion.div>

            <motion.h2
              className="text-2xl md:text-3xl font-black bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-2"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              {roundConfig.label}
            </motion.h2>

            <motion.p
              className="text-sm text-muted-foreground"
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              {roundConfig.description}
            </motion.p>

            <div className="flex items-center gap-6 mt-8">
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-white font-bold text-sm">
                  {p1.name.charAt(0).toUpperCase()}
                </div>
                <span className="text-lg font-bold text-red-400 mt-1">{p1.score}</span>
              </div>
              <span className="text-muted-foreground text-sm font-medium">—</span>
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold text-sm">
                  {p2.name.charAt(0).toUpperCase()}
                </div>
                <span className="text-lg font-bold text-blue-400 mt-1">{p2.score}</span>
              </div>
            </div>
          </motion.div>
        )}

        {phase === 'playing' && (
          <motion.div
            key={`playing-${currentRound}-${roundType}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-[480px] flex flex-col"
          >
            <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-black/20">
              <Badge variant="outline" className="text-[10px] border-white/10 text-white/60">
                {roundConfig.label}
              </Badge>
              <div className="flex items-center gap-1.5">
                <Timer className="h-3.5 w-3.5 text-yellow-400" />
                <motion.span
                  className={`font-mono text-sm font-bold ${roundTimer <= 5 ? 'text-red-400' : 'text-yellow-400'}`}
                  animate={roundTimer <= 5 ? { scale: [1, 1.2, 1] } : {}}
                  transition={{ repeat: Infinity, duration: 0.5 }}
                >
                  {roundTimer}s
                </motion.span>
              </div>
              <Badge variant="outline" className="text-[10px] border-white/10 text-white/60">
                Rodada {currentRound}/{TOTAL_ROUNDS}
              </Badge>
            </div>

            <div className="flex-1 grid grid-cols-2 divide-x divide-white/10">
              <div className="flex flex-col items-center p-3 bg-gradient-to-b from-red-600/10 to-transparent relative">
                <span className="text-xs font-bold text-red-400 truncate w-full text-center mb-1">
                  {p1.name}
                </span>
                <HealthBar health={p1.health} side="left" />
                <div className="flex items-center gap-1 mt-1">
                  <Heart className="h-3 w-3 text-red-500" />
                  <span className="text-[10px] text-red-400 font-medium">{p1.score} vitória(s)</span>
                </div>

                <div className="flex-1 w-full flex items-center justify-center mt-3">
                  {renderPlayerAction(0)}
                </div>
              </div>

              <div className="flex flex-col items-center p-3 bg-gradient-to-b from-blue-600/10 to-transparent relative">
                <span className="text-xs font-bold text-blue-400 truncate w-full text-center mb-1">
                  {p2.name}
                </span>
                <HealthBar health={p2.health} side="right" />
                <div className="flex items-center gap-1 mt-1">
                  <Heart className="h-3 w-3 text-blue-500" />
                  <span className="text-[10px] text-blue-400 font-medium">{p2.score} vitória(s)</span>
                </div>

                <div className="flex-1 w-full flex items-center justify-center mt-3">
                  {renderPlayerAction(1)}
                </div>
              </div>
            </div>

            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none">
              <span className="text-3xl md:text-5xl font-black text-white/10 select-none">VS</span>
            </div>
          </motion.div>
        )}

        {phase === 'roundResult' && (
          <motion.div
            key={`roundResult-${currentRound}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center min-h-[320px] px-6 text-center"
          >
            {roundDraw ? (
              <>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1, rotate: [0, 360] }}
                  transition={{ type: 'spring', stiffness: 200 }}
                  className="w-20 h-20 rounded-full bg-gradient-to-br from-gray-500 to-gray-600 flex items-center justify-center mb-4"
                >
                  <Volume2 className="h-8 w-8 text-white" />
                </motion.div>
                <h2 className="text-2xl font-black text-gray-400 mb-1">Tempo Esgotado!</h2>
                <p className="text-sm text-muted-foreground">Ninguém respondeu a tempo</p>
              </>
            ) : roundWinner !== null ? (
              <>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 12 }}
                  className="w-20 h-20 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center mb-4 shadow-xl"
                >
                  <Crown className="h-10 w-10 text-white" />
                </motion.div>
                <h2 className="text-2xl font-black mb-1">
                  <span className={roundWinner === 0 ? 'text-red-400' : 'text-blue-400'}>
                    {players[roundWinner].name}
                  </span>{' '}
                  venceu a rodada!
                </h2>
                <p className="text-sm text-muted-foreground">
                  Placar: {p1.score} × {p2.score}
                </p>
              </>
            ) : null}
          </motion.div>
        )}

        {phase === 'gameOver' && (
          <motion.div
            key="gameOver"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center min-h-[480px] px-6 text-center relative"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 via-purple-500/10 to-pink-500/10" />

            <motion.div
              className="relative z-10"
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <motion.div
                className="text-5xl mb-3"
                animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
              >
                🏆
              </motion.div>

              <h2 className="text-3xl md:text-4xl font-black bg-gradient-to-r from-yellow-300 via-orange-400 to-red-500 bg-clip-text text-transparent mb-2">
                Vencedor!
              </h2>

              {finalWinner !== null ? (
                <>
                  <motion.div
                    className="w-24 h-24 rounded-full mx-auto mb-3 flex items-center justify-center text-white font-black text-4xl shadow-2xl border-4 border-yellow-400/50"
                    style={{
                      background:
                        finalWinner === 0
                          ? 'linear-gradient(135deg, #ef4444, #f97316)'
                          : 'linear-gradient(135deg, #3b82f6, #06b6d4)',
                    }}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.6, type: 'spring', stiffness: 200 }}
                  >
                    {players[finalWinner].name.charAt(0).toUpperCase()}
                  </motion.div>
                  <p
                    className={`text-xl font-bold ${
                      finalWinner === 0 ? 'text-red-400' : 'text-blue-400'
                    }`}
                  >
                    {players[finalWinner].name}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {players[finalWinner].score} × {players[finalWinner === 0 ? 1 : 0].score} —{' '}
                    {players[finalWinner].score} vitórias
                  </p>
                </>
              ) : (
                <>
                  <p className="text-xl font-bold text-yellow-400">Empate!</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {p1.score} × {p2.score}
                  </p>
                </>
              )}

              <div className="flex items-center justify-center gap-2 mt-2">
                <Sparkles className="h-4 w-4 text-yellow-400" />
                <span className="text-xs text-yellow-400 font-medium">Duelo concluído</span>
                <Sparkles className="h-4 w-4 text-yellow-400" />
              </div>
            </motion.div>

            <motion.div
              className="relative z-10 flex gap-3 mt-6"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 1 }}
            >
              <Button
                onClick={resetForNewGame}
                variant="outline"
                className="rounded-xl gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Novo Duelo
              </Button>
              <Button
                onClick={() => {
                  if (finalWinner !== null) {
                    reportScore(players[finalWinner].name, players[finalWinner].score * 100);
                  }
                }}
                className="rounded-xl gap-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white hover:opacity-90"
              >
                <Trophy className="h-4 w-4" />
                Registrar Resultado
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  /* ------------------------------------------------------------------ */
  /*  Player action renderer (used in playing phase)                    */
  /* ------------------------------------------------------------------ */

  function renderPlayerAction(playerIndex: 0 | 1) {
    const isLocked =
      (roundType === 'reaction' && reactionLocked !== null) ||
      (roundType === 'math' && mathLocked !== null) ||
      (roundType === 'scramble' && scrambleLocked !== null) ||
      (roundType === 'color' && colorLocked !== null);

    const isWinner =
      (roundType === 'reaction' && reactionLocked === playerIndex) ||
      (roundType === 'math' && mathLocked === playerIndex) ||
      (roundType === 'scramble' && scrambleLocked === playerIndex) ||
      (roundType === 'color' && colorLocked === playerIndex);

    const gradient =
      playerIndex === 0
        ? 'from-red-500/30 to-red-600/10 border-red-500/30'
        : 'from-blue-500/30 to-blue-600/10 border-blue-500/30';

    if (isWinner) {
      return (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="flex flex-col items-center gap-2 p-3 rounded-xl bg-green-500/10 border border-green-500/30"
        >
          <Crown className="h-6 w-6 text-yellow-400" />
          <span className="text-xs font-bold text-green-400">Primeiro!</span>
        </motion.div>
      );
    }

    if (isLocked) {
      return (
        <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-center">
          <span className="text-xs text-muted-foreground">Tarde demais...</span>
        </div>
      );
    }

    switch (roundType) {
      /* ------ REACTION ------ */
      case 'reaction':
        return (
          <div className="w-full flex flex-col items-center gap-3">
            {!reactionSignalShown ? (
              <motion.div
                className="w-full aspect-square max-w-[140px] rounded-2xl bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center cursor-pointer select-none touch-none"
                animate={{ scale: [1, 1.02, 1] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                style={{ boxShadow: '0 0 30px rgba(239,68,68,0.4)' }}
                onClick={() => handleReactionTap(playerIndex)}
              >
                <div className="text-center text-white">
                  <Volume2 className="h-6 w-6 mx-auto mb-1 animate-pulse" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">
                    Aguarde...
                  </span>
                </div>
              </motion.div>
            ) : (
              <motion.button
                whileTap={{ scale: 0.9 }}
                className={`w-full aspect-square max-w-[140px] rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center cursor-pointer select-none touch-none border`}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                onClick={() => handleReactionTap(playerIndex)}
                style={{
                  boxShadow:
                    playerIndex === 0
                      ? '0 0 40px rgba(239,68,68,0.5)'
                      : '0 0 40px rgba(59,130,246,0.5)',
                }}
              >
                <div className="text-center text-white">
                  <motion.div
                    animate={{ scale: [1, 1.3, 1] }}
                    transition={{ repeat: Infinity, duration: 0.3 }}
                  >
                    <Zap className="h-8 w-8 mx-auto mb-1" />
                  </motion.div>
                  <span className="text-xs font-black uppercase tracking-wider">
                    TOQUE!
                  </span>
                </div>
              </motion.button>
            )}
          </div>
        );

      /* ------ MATH ------ */
      case 'math':
        return (
          <div className="w-full flex flex-col items-center gap-2 px-1">
            <div className="w-full text-center p-2 rounded-xl bg-black/30 border border-white/10">
              <span className="text-2xl md:text-3xl font-black text-yellow-400">
                {mathProblem?.question} = ?
              </span>
            </div>
            <div className="flex gap-1 w-full">
              <Input
                ref={playerIndex === 0 ? inputRef1 : inputRef2}
                type="number"
                placeholder="Resposta"
                value={mathInputs[playerIndex]}
                onChange={(e) => {
                  const next = [...mathInputs] as [string, string];
                  next[playerIndex] = e.target.value;
                  setMathInputs(next);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleMathSubmit(playerIndex);
                }}
                className={`rounded-lg text-center font-bold text-lg border ${
                  playerIndex === 0 ? 'border-red-500/30' : 'border-blue-500/30'
                }`}
                disabled={mathLocked !== null}
              />
              <Button
                size="sm"
                onClick={() => handleMathSubmit(playerIndex)}
                disabled={mathLocked !== null || !mathInputs[playerIndex]}
                className={`rounded-lg font-bold text-xs ${
                  playerIndex === 0
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                }`}
              >
                <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          </div>
        );

      /* ------ SCRAMBLE ------ */
      case 'scramble':
        return (
          <div className="w-full flex flex-col items-center gap-2 px-1">
            <div className="w-full text-center p-2 rounded-xl bg-black/30 border border-white/10">
              <span className="text-xl md:text-2xl font-black text-purple-400 tracking-[0.2em]">
                {scrambleWord}
              </span>
            </div>
            <div className="flex gap-1 w-full">
              <Input
                type="text"
                placeholder="Palavra..."
                value={scrambleInputs[playerIndex]}
                onChange={(e) => {
                  const next = [...scrambleInputs] as [string, string];
                  next[playerIndex] = e.target.value;
                  setScrambleInputs(next);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleScrambleSubmit(playerIndex);
                }}
                className={`rounded-lg text-center font-bold text-sm uppercase border ${
                  playerIndex === 0 ? 'border-red-500/30' : 'border-blue-500/30'
                }`}
                disabled={scrambleLocked !== null}
              />
              <Button
                size="sm"
                onClick={() => handleScrambleSubmit(playerIndex)}
                disabled={scrambleLocked !== null || !scrambleInputs[playerIndex]}
                className={`rounded-lg font-bold text-xs ${
                  playerIndex === 0
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                }`}
              >
                <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          </div>
        );

      /* ------ COLOR ------ */
      case 'color':
        return (
          <div className="w-full flex flex-col items-center gap-2 px-1">
            {colorChallenge && (
              <>
                <div className="w-full text-center p-2 rounded-xl bg-black/30 border border-white/10">
                  <span
                    className="text-2xl md:text-3xl font-black"
                    style={{ color: colorChallenge.textColor }}
                  >
                    {colorChallenge.displayWord}
                  </span>
                  <p className="text-[10px] text-white/40 mt-1">
                    A cor da palavra é a mesma que o texto?
                  </p>
                </div>
                <div className="flex gap-2 w-full">
                  <Button
                    size="sm"
                    onClick={() => handleColorAnswer(playerIndex, 'sim')}
                    disabled={colorLocked !== null}
                    className="flex-1 rounded-lg bg-green-600 hover:bg-green-700 text-white font-bold text-xs"
                  >
                    Sim ✓
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleColorAnswer(playerIndex, 'nao')}
                    disabled={colorLocked !== null}
                    className="flex-1 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-xs"
                  >
                    Não ✗
                  </Button>
                </div>
              </>
            )}
          </div>
        );

      default:
        return null;
    }
  }
}
