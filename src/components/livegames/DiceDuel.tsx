"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { RotateCcw, Dices, Shield, Zap, Trophy, Flame, Crown, Star } from 'lucide-react';

type GameMode = 'race100' | 'bestOf10' | 'blitz';
type GamePhase = 'setup' | 'rolling' | 'deciding' | 'turnResult' | 'gameOver';
type RoundEffect = 'none' | 'bank' | 'bust' | 'megaBust';

interface Props {
  onScore?: (name: string, score: number) => void;
  liveCode?: string;
}

interface PlayerState {
  name: string;
  banked: number;
  turnPoints: number;
  rolls: number;
  streak: number;
  bestStreak: number;
}

interface DiceState {
  value: number;
  rolling: boolean;
  busted: boolean;
}

const DOT_POSITIONS: Record<number, [number, number][]> = {
  1: [[2, 2]],
  2: [[1, 3], [3, 1]],
  3: [[1, 3], [2, 2], [3, 1]],
  4: [[1, 1], [1, 3], [3, 1], [3, 3]],
  5: [[1, 1], [1, 3], [2, 2], [3, 1], [3, 3]],
  6: [[1, 1], [1, 2], [1, 3], [3, 1], [3, 2], [3, 3]],
};

/* ---------- Confetti Particle ---------- */
function ConfettiParticle({ index, color }: { index: number; color: string }) {
  const x = useMemo(() => Math.random() * 200 - 100, []);
  const y = useMemo(() => -(Math.random() * 200 + 60), []);
  const rot = useMemo(() => Math.random() * 720 - 360, []);
  const delay = useMemo(() => index * 0.04 + Math.random() * 0.15, [index]);
  const size = useMemo(() => 6 + Math.random() * 6, []);

  return (
    <motion.div
      className="absolute left-1/2 top-1/2 rounded-sm pointer-events-none"
      style={{ width: size, height: size * 0.6, backgroundColor: color }}
      initial={{ x: 0, y: 0, rotate: 0, opacity: 1 }}
      animate={{ x, y, rotate: rot, opacity: 0 }}
      transition={{ duration: 1.8 + Math.random() * 0.8, delay, ease: 'easeOut' }}
    />
  );
}

/* ---------- Screen Shake Wrapper ---------- */
function ShakeWrapper({ shaking, children }: { shaking: boolean; children: React.ReactNode }) {
  return (
    <motion.div
      animate={shaking ? { x: [0, -6, 6, -4, 4, -2, 2, 0], y: [0, 2, -2, 1, -1, 0] } : { x: 0, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {children}
    </motion.div>
  );
}

/* ---------- 3D Dice Face ---------- */
function DiceFace({ value, borderColor, busted, rolling }: { value: number; borderColor: string; busted: boolean; rolling: boolean }) {
  const dots = DOT_POSITIONS[value] || [];
  const shadowY = useMotionValue(8);
  const shadowBlur = useMotionValue(12);
  const shadowOpacity = useMotionValue(0.35);

  useEffect(() => {
    if (rolling) {
      shadowY.set(20);
      shadowBlur.set(24);
      shadowOpacity.set(0.15);
    } else {
      shadowY.set(8);
      shadowBlur.set(12);
      shadowOpacity.set(0.35);
    }
  }, [rolling, shadowY, shadowBlur, shadowOpacity]);

  const boxShadow = useTransform(
    [shadowY, shadowBlur, shadowOpacity],
    ([sy, sb, so]) => `0 ${sy}px ${sb}px rgba(0,0,0,${so})`
  );

  return (
    <div className="relative" style={{ perspective: '600px' }}>
      <motion.div
        style={{ boxShadow, transformStyle: 'preserve-3d' }}
        animate={
          rolling
            ? {
                rotateX: [0, 180, 360, 540, 720],
                rotateY: [0, -90, 90, -45, 0],
                rotateZ: [0, 45, -45, 20, 0],
                scale: [1, 1.15, 0.95, 1.1, 1.05],
                y: [0, -30, -10, -25, -8, 0],
              }
            : busted
            ? { x: [0, -8, 8, -6, 6, -3, 3, 0], rotate: [0, -5, 5, -3, 3, -1, 1, 0] }
            : { rotateX: 0, rotateY: 0, rotateZ: 0, scale: 1, x: 0, y: 0 }
        }
        transition={
          rolling
            ? { duration: 0.9, ease: 'easeInOut' }
            : busted
            ? { duration: 0.5 }
            : { type: 'spring', stiffness: 400, damping: 15 }
        }
      >
        <div
          className={cn(
            'w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white dark:bg-slate-100 p-2 sm:p-3 grid grid-cols-3 grid-rows-3 gap-1 transition-colors duration-200',
            borderColor,
            busted && 'bg-red-200 dark:bg-red-900/60',
            rolling && 'brightness-110'
          )}
          style={{
            backfaceVisibility: 'hidden',
            background: busted
              ? undefined
              : 'linear-gradient(135deg, #ffffff 0%, #f1f5f9 50%, #e2e8f0 100%)',
          }}
        >
          {Array.from({ length: 9 }).map((_, i) => {
            const row = Math.floor(i / 3) + 1;
            const col = (i % 3) + 1;
            const isDot = dots.some(([r, c]) => r === row && c === col);
            return (
              <div key={i} className="flex items-center justify-center">
                {isDot && (
                  <motion.div
                    initial={rolling ? { scale: 0 } : { scale: 1 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                    className={cn(
                      'w-3 h-3 sm:w-4 sm:h-4 rounded-full transition-colors duration-200',
                      busted
                        ? 'bg-red-600'
                        : 'bg-gradient-to-br from-gray-800 to-gray-950 dark:from-gray-700 dark:to-gray-900'
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>
      </motion.div>
      <AnimatePresence>
        {busted && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: [0, 0.6, 0.3, 0.6, 0], scale: [0.8, 1.1, 1] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
            className="absolute inset-0 rounded-2xl bg-red-500/50 pointer-events-none"
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ---------- Streak Badge ---------- */
function StreakBadge({ streak }: { streak: number; bestStreak: number }) {
  if (streak < 2) return null;

  const tier = streak >= 6 ? 'legendary' : streak >= 4 ? 'hot' : 'warm';
  const colors = {
    warm: 'from-amber-500/20 to-orange-500/20 border-amber-500/40 text-amber-400',
    hot: 'from-orange-500/20 to-red-500/20 border-orange-500/40 text-orange-400',
    legendary: 'from-red-500/20 to-pink-500/20 border-red-400/40 text-red-400',
  }[tier];

  const flameCount = Math.min(streak, 5);

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      className={cn('inline-flex items-center gap-1 px-2.5 py-1 rounded-full border bg-gradient-to-r text-xs font-bold', colors)}
    >
      <div className="flex items-center -space-x-1">
        {Array.from({ length: flameCount }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ scale: 0, x: -10 }}
            animate={{ scale: 1, x: 0 }}
            transition={{ delay: i * 0.05, type: 'spring', stiffness: 500 }}
          >
            <Flame className="w-3 h-3" />
          </motion.div>
        ))}
      </div>
      <span className="ml-1">{streak}x</span>
    </motion.div>
  );
}

/* ---------- Progress Bar ---------- */
function ScoreBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="w-full h-1.5 rounded-full bg-slate-700/50 overflow-hidden mt-1.5">
      <motion.div
        className={cn('h-full rounded-full', color)}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      />
    </div>
  );
}

/* ---------- Main Component ---------- */
export default function DiceDuel({ onScore, liveCode }: Props) {
  const [gameMode, setGameMode] = useState<GameMode>('race100');
  const [diceCount, setDiceCount] = useState<1 | 2>(1);
  const [phase, setPhase] = useState<GamePhase>('setup');
  const [currentPlayer, setCurrentPlayer] = useState<0 | 1>(0);
  const [round, setRound] = useState(1);
  const [maxRounds, setMaxRounds] = useState(10);
  const [players, setPlayers] = useState<PlayerState[]>([
    { name: 'Jogador 1', banked: 0, turnPoints: 0, rolls: 0, streak: 0, bestStreak: 0 },
    { name: 'Jogador 2', banked: 0, turnPoints: 0, rolls: 0, streak: 0, bestStreak: 0 },
  ]);
  const [dice, setDice] = useState<DiceState[]>([
    { value: 1, rolling: false, busted: false },
    { value: 1, rolling: false, busted: false },
  ]);
  const [turnResultMsg, setTurnResultMsg] = useState('');
  const [isBust, setIsBust] = useState(false);
  const [bankedAnim, setBankedAnim] = useState(false);
  const [winner, setWinner] = useState<number | null>(null);
  const [roundEffect, setRoundEffect] = useState<RoundEffect>('none');
  const [showConfetti, setShowConfetti] = useState(false);
  const rollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (rollTimerRef.current) clearTimeout(rollTimerRef.current);
    };
  }, []);

  const flashEffect = useCallback((effect: RoundEffect) => {
    setRoundEffect(effect);
    setTimeout(() => setRoundEffect('none'), 800);
  }, []);

  const resetGame = useCallback(() => {
    if (rollTimerRef.current) clearTimeout(rollTimerRef.current);
    setPhase('setup');
    setCurrentPlayer(0);
    setRound(1);
    setMaxRounds(gameMode === 'blitz' ? 3 : 10);
    setPlayers([
      { name: 'Jogador 1', banked: 0, turnPoints: 0, rolls: 0, streak: 0, bestStreak: 0 },
      { name: 'Jogador 2', banked: 0, turnPoints: 0, rolls: 0, streak: 0, bestStreak: 0 },
    ]);
    setDice([
      { value: 1, rolling: false, busted: false },
      { value: 1, rolling: false, busted: false },
    ]);
    setTurnResultMsg('');
    setIsBust(false);
    setBankedAnim(false);
    setWinner(null);
    setRoundEffect('none');
    setShowConfetti(false);
  }, [gameMode]);

  const startGame = useCallback(() => {
    const mr = gameMode === 'blitz' ? 3 : 10;
    setMaxRounds(mr);
    setPhase('rolling');
    setCurrentPlayer(0);
    setRound(1);
    setPlayers([
      { name: 'Jogador 1', banked: 0, turnPoints: 0, rolls: 0, streak: 0, bestStreak: 0 },
      { name: 'Jogador 2', banked: 0, turnPoints: 0, rolls: 0, streak: 0, bestStreak: 0 },
    ]);
    setDice([
      { value: 1, rolling: false, busted: false },
      { value: 1, rolling: false, busted: false },
    ]);
    setTurnResultMsg('');
    setIsBust(false);
    setBankedAnim(false);
    setWinner(null);
    setRoundEffect('none');
    setShowConfetti(false);
  }, [gameMode]);

  const advanceTurn = useCallback(() => {
    setPlayers(prev => {
      const next = [...prev];
      const p = { ...next[currentPlayer] };
      p.turnPoints = 0;
      p.rolls = 0;
      next[currentPlayer] = p;
      return next;
    });

    const nextPlayer: 0 | 1 = currentPlayer === 0 ? 1 : 0;
    let newRound = round;
    if (nextPlayer === 0) {
      newRound = round + 1;
    }

    if (gameMode !== 'race100' && newRound > maxRounds) {
      const p0 = players[0];
      const p1 = players[1];
      if (p0.banked >= p1.banked) {
        setWinner(0);
        onScore?.(p0.name, p0.banked);
      } else {
        setWinner(1);
        onScore?.(p1.name, p1.banked);
      }
      setPhase('gameOver');
      setShowConfetti(true);
      return;
    }

    setRound(newRound);
    setCurrentPlayer(nextPlayer);
    setPhase('rolling');
    setTurnResultMsg('');
    setIsBust(false);
    setDice(prev => prev.map(d => ({ ...d, busted: false, rolling: false })));
  }, [currentPlayer, round, gameMode, maxRounds, players, onScore]);

  const evaluateRoll = useCallback((values: number[]) => {
    const hasOne = values.some(v => v === 1);
    const hasDoubleOnes = values.length === 2 && values[0] === 1 && values[1] === 1;

    if (hasOne) {
      setIsBust(true);
      setDice(prev => prev.map(d => ({ ...d, busted: true })));
      flashEffect(hasDoubleOnes ? 'megaBust' : 'bust');

      setPlayers(prev => {
        const next = [...prev];
        const p = { ...next[currentPlayer] };
        if (hasDoubleOnes) {
          p.banked = 0;
          p.turnPoints = 0;
        } else {
          p.turnPoints = 0;
        }
        p.rolls += 1;
        p.streak = 0;
        next[currentPlayer] = p;
        return next;
      });

      setTurnResultMsg(hasDoubleOnes ? 'Bombeou! Perdeu TUDO!' : 'Perdeu tudo!');
      setPhase('turnResult');

      setTimeout(() => {
        advanceTurn();
      }, 2000);
    } else {
      const sum = values.reduce((a, b) => a + b, 0);
      setPlayers(prev => {
        const next = [...prev];
        const p = { ...next[currentPlayer] };
        p.turnPoints += sum;
        p.rolls += 1;
        p.streak += 1;
        if (p.streak > p.bestStreak) p.bestStreak = p.streak;
        next[currentPlayer] = p;
        return next;
      });
      setPhase('deciding');
    }
  }, [currentPlayer, advanceTurn, flashEffect]);

  const rollDice = useCallback(() => {
    if (phase !== 'rolling' && phase !== 'deciding') return;
    setPhase('rolling');
    setIsBust(false);
    setTurnResultMsg('');
    setRoundEffect('none');

    let tickCount = 0;
    const totalTicks = 12;

    const tick = () => {
      tickCount++;
      setDice(prev =>
        prev.map(d => ({
          ...d,
          value: Math.floor(Math.random() * 6) + 1,
          rolling: true,
          busted: false,
        }))
      );

      if (tickCount < totalTicks) {
        rollTimerRef.current = setTimeout(tick, 80 + tickCount * 15);
      } else {
        const finalValues: number[] = [];
        for (let i = 0; i < diceCount; i++) {
          finalValues.push(Math.floor(Math.random() * 6) + 1);
        }
        setDice(prev =>
          prev.map((d, i) => ({
            ...d,
            value: i < finalValues.length ? finalValues[i] : d.value,
            rolling: false,
            busted: false,
          }))
        );
        setTimeout(() => {
          evaluateRoll(finalValues);
        }, 200);
      }
    };

    tick();
  }, [phase, diceCount, evaluateRoll]);

  const bankPoints = useCallback(() => {
    setPhase('turnResult');
    setBankedAnim(true);
    setTurnResultMsg('Banco!');
    flashEffect('bank');

    const cp = currentPlayer;
    const currentBanked = players[cp].banked;
    const turnPts = players[cp].turnPoints;
    const newTotal = currentBanked + turnPts;

    setPlayers(prev => {
      const next = [...prev];
      const p = { ...next[cp] };
      p.banked += p.turnPoints;
      p.turnPoints = 0;
      p.rolls = 0;
      next[cp] = p;
      return next;
    });

    setTimeout(() => {
      setBankedAnim(false);
      if (gameMode === 'race100' && newTotal >= 100) {
        setWinner(cp);
        setPhase('gameOver');
        setShowConfetti(true);
        onScore?.(players[cp].name, newTotal);
        return;
      }
      advanceTurn();
    }, 1000);
  }, [currentPlayer, players, gameMode, advanceTurn, onScore, flashEffect]);

  const handleModeSelect = useCallback((mode: GameMode) => {
    setGameMode(mode);
    setMaxRounds(mode === 'blitz' ? 3 : 10);
  }, []);

  const getRiskLevel = (turnPoints: number) => {
    if (turnPoints === 0) return { label: 'Baixo', color: 'text-emerald-400', barColor: 'bg-emerald-400' };
    if (turnPoints < 10) return { label: 'Baixo', color: 'text-emerald-400', barColor: 'bg-emerald-400' };
    if (turnPoints < 20) return { label: 'Medio', color: 'text-amber-400', barColor: 'bg-amber-400' };
    if (turnPoints < 35) return { label: 'Alto', color: 'text-orange-400', barColor: 'bg-orange-400' };
    return { label: 'Extremo', color: 'text-red-400', barColor: 'bg-red-400' };
  };

  const currentPlayerData = players[currentPlayer];
  const risk = getRiskLevel(currentPlayerData.turnPoints);
  const activeDice = dice.slice(0, diceCount);
  const borderColorClass = currentPlayer === 0 ? 'border-2 border-cyan-400' : 'border-2 border-pink-400';
  const isShaking = roundEffect === 'bust' || roundEffect === 'megaBust';
  const confettiColors = ['#06b6d4', '#ec4899', '#f59e0b', '#10b981', '#8b5cf6', '#ef4444'];

  return (
    <div className="w-full max-w-lg mx-auto space-y-4 relative">
      {/* Round effect flash overlay */}
      <AnimatePresence>
        {roundEffect === 'bank' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.25, 0.15, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="absolute inset-0 rounded-3xl bg-emerald-400 pointer-events-none z-20"
          />
        )}
        {roundEffect === 'bust' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.3, 0.15, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="absolute inset-0 rounded-3xl bg-red-500 pointer-events-none z-20"
          />
        )}
        {roundEffect === 'megaBust' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.5, 0.3, 0.5, 0.3, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
            className="absolute inset-0 rounded-3xl bg-red-600 pointer-events-none z-20"
          />
        )}
      </AnimatePresence>

      {/* SETUP SCREEN */}
      {phase === 'setup' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="text-center space-y-2">
            <motion.div
              animate={{ rotate: [0, 10, -10, 10, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              className="inline-block"
            >
              <Dices className="w-16 h-16 text-cyan-400 mx-auto" />
            </motion.div>
            <h2 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-cyan-400 to-pink-400 bg-clip-text text-transparent">
              Duelo de Dados
            </h2>
            <p className="text-slate-400 text-sm">Risque, role e banque - mas cuidado com o 1!</p>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium text-slate-300">Modo de Jogo</p>
            <div className="grid grid-cols-3 gap-2">
              {([['race100', 'Corrida a 100', 'Primeiro a 100 vence'], ['bestOf10', 'Melhor de 10', '10 rounds, maior pontuacao'], ['blitz', 'Blitz', '3 rounds, alta pressao']] as const).map(([mode, title, desc]) => (
                <button
                  key={mode}
                  onClick={() => handleModeSelect(mode)}
                  className={cn(
                    'p-3 rounded-xl border text-center transition-all',
                    gameMode === mode
                      ? 'border-cyan-400 bg-cyan-400/10 text-cyan-300'
                      : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-500'
                  )}
                >
                  <div className="font-semibold text-sm">{title}</div>
                  <div className="text-xs mt-1 opacity-70">{desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium text-slate-300">Numero de Dados</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setDiceCount(1)}
                className={cn(
                  'p-3 rounded-xl border text-center transition-all',
                  diceCount === 1
                    ? 'border-pink-400 bg-pink-400/10 text-pink-300'
                    : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-500'
                )}
              >
                <div className="font-semibold">1 Dado</div>
                <div className="text-xs mt-1 opacity-70">Simples</div>
              </button>
              <button
                onClick={() => setDiceCount(2)}
                className={cn(
                  'p-3 rounded-xl border text-center transition-all',
                  diceCount === 2
                    ? 'border-pink-400 bg-pink-400/10 text-pink-300'
                    : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-500'
                )}
              >
                <div className="font-semibold">2 Dados</div>
                <div className="text-xs mt-1 opacity-70">Duplo 1s = perde tudo!</div>
              </button>
            </div>
          </div>

          <Button
            onClick={startGame}
            className="w-full h-14 text-lg font-bold bg-gradient-to-r from-cyan-500 to-pink-500 hover:from-cyan-600 hover:to-pink-600"
          >
            <Dices className="w-5 h-5 mr-2" />
            Comecar Jogo
          </Button>
        </motion.div>
      )}

      {/* GAME SCREEN */}
      {phase !== 'setup' && (
        <>
          <ShakeWrapper shaking={isShaking}>
            {/* Score Header */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-r from-cyan-900/30 to-pink-900/30 border border-cyan-500/20 rounded-2xl p-4 relative overflow-hidden"
            >
              <div className="absolute inset-0 pointer-events-none opacity-[0.03]">
                <motion.div
                  className="absolute top-0 left-0 w-full h-full"
                  style={{
                    backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 49px, currentColor 49px, currentColor 50px)',
                    backgroundSize: '50px 100%',
                  }}
                  animate={{ x: [0, 50] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                />
              </div>

              <div className="flex items-center justify-between relative z-10">
                {/* Player 1 Score */}
                <div className="text-center flex-1">
                  <div className={cn('text-xs font-medium uppercase tracking-wider transition-colors', currentPlayer === 0 ? 'text-cyan-400' : 'text-slate-500')}>
                    Jogador 1
                  </div>
                  <motion.div
                    key={'p1-' + players[0].banked}
                    initial={{ scale: 1.3, y: -5 }}
                    animate={{ scale: 1, y: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                    className="text-3xl sm:text-4xl font-black text-cyan-400 tabular-nums"
                  >
                    {players[0].banked}
                  </motion.div>
                  {gameMode === 'race100' && (
                    <ScoreBar value={players[0].banked} max={100} color="bg-cyan-400" />
                  )}
                  <AnimatePresence>
                    {currentPlayer === 0 && players[0].turnPoints > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="text-xs text-amber-400 font-semibold mt-0.5"
                      >
                        +{players[0].turnPoints}
                      </motion.div>
                    )}
                  </AnimatePresence>
                  {currentPlayer === 0 && (
                    <motion.div
                      layoutId="turnIndicator"
                      className="w-2 h-2 rounded-full bg-cyan-400 mx-auto mt-1"
                      style={{ boxShadow: '0 0 8px rgba(6,182,212,0.6)' }}
                    />
                  )}
                </div>

                {/* Center Info */}
                <div className="text-center px-3 sm:px-6">
                  <div className="text-[10px] sm:text-xs font-bold text-slate-400 tracking-widest">DUELO DE DADOS</div>
                  <Badge variant="outline" className="mt-1 border-slate-600 text-slate-300">
                    Round {round}{gameMode !== 'race100' && ' / ' + maxRounds}
                  </Badge>
                  {gameMode !== 'race100' && (
                    <div className="mt-1 w-16 mx-auto">
                      <ScoreBar value={round} max={maxRounds} color="bg-slate-400" />
                    </div>
                  )}
                </div>

                {/* Player 2 Score */}
                <div className="text-center flex-1">
                  <div className={cn('text-xs font-medium uppercase tracking-wider transition-colors', currentPlayer === 1 ? 'text-pink-400' : 'text-slate-500')}>
                    Jogador 2
                  </div>
                  <motion.div
                    key={'p2-' + players[1].banked}
                    initial={{ scale: 1.3, y: -5 }}
                    animate={{ scale: 1, y: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                    className="text-3xl sm:text-4xl font-black text-pink-400 tabular-nums"
                  >
                    {players[1].banked}
                  </motion.div>
                  {gameMode === 'race100' && (
                    <ScoreBar value={players[1].banked} max={100} color="bg-pink-400" />
                  )}
                  <AnimatePresence>
                    {currentPlayer === 1 && players[1].turnPoints > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="text-xs text-amber-400 font-semibold mt-0.5"
                      >
                        +{players[1].turnPoints}
                      </motion.div>
                    )}
                  </AnimatePresence>
                  {currentPlayer === 1 && (
                    <motion.div
                      layoutId="turnIndicator"
                      className="w-2 h-2 rounded-full bg-pink-400 mx-auto mt-1"
                      style={{ boxShadow: '0 0 8px rgba(236,72,153,0.6)' }}
                    />
                  )}
                </div>
              </div>
            </motion.div>
          </ShakeWrapper>

          {/* Current Turn Info + Streak */}
          <div className="text-center space-y-1">
            <div className="flex items-center justify-center gap-2">
              <div className={cn('text-sm font-semibold', currentPlayer === 0 ? 'text-cyan-400' : 'text-pink-400')}>
                Vez de {currentPlayerData.name}
              </div>
              <AnimatePresence>
                {currentPlayerData.streak >= 2 && (
                  <StreakBadge streak={currentPlayerData.streak} bestStreak={currentPlayerData.bestStreak} />
                )}
              </AnimatePresence>
            </div>
            <div className="text-slate-500 text-xs">
              {currentPlayerData.rolls === 0
                ? 'Role os dados para comecar'
                : currentPlayerData.rolls + ' rolo' + (currentPlayerData.rolls === 1 ? '' : 's') + ' neste turno'}
            </div>
          </div>

          {/* Stats Row: Banked / Turn / Risk */}
          <div className="flex justify-center gap-3 sm:gap-4 text-center">
            <div className={cn('rounded-xl px-4 py-2.5 min-w-[85px] border transition-colors duration-300', bankedAnim ? 'bg-emerald-500/15 border-emerald-500/40' : 'bg-slate-800/60 border-slate-700/50')}>
              <div className="text-[10px] uppercase tracking-wider text-slate-500 flex items-center justify-center gap-1">
                <Shield className="w-3 h-3" />
                Banco
              </div>
              <motion.div
                key={'bank-' + currentPlayerData.banked}
                initial={bankedAnim ? { y: -20, opacity: 0, scale: 1.2 } : { y: 0, opacity: 1 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                className="text-xl font-bold text-emerald-400 tabular-nums"
              >
                {currentPlayerData.banked}
              </motion.div>
            </div>
            <div className="bg-slate-800/60 rounded-xl px-4 py-2.5 min-w-[85px] border border-slate-700/50">
              <div className="text-[10px] uppercase tracking-wider text-slate-500 flex items-center justify-center gap-1">
                <Zap className="w-3 h-3" />
                Turno
              </div>
              <motion.div
                key={'turn-' + currentPlayerData.turnPoints}
                initial={{ scale: 1.5, y: -5 }}
                animate={{ scale: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 12 }}
                className="text-xl font-bold text-amber-400 tabular-nums"
              >
                {currentPlayerData.turnPoints}
              </motion.div>
            </div>
            <div className="bg-slate-800/60 rounded-xl px-4 py-2.5 min-w-[85px] border border-slate-700/50">
              <div className="text-[10px] uppercase tracking-wider text-slate-500">Risco</div>
              <motion.div
                key={risk.label}
                initial={{ y: 5, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className={cn('text-base font-bold mt-0.5', risk.color)}
              >
                {risk.label}
              </motion.div>
              <div className="w-full h-1 rounded-full bg-slate-700/50 mt-1.5 overflow-hidden">
                <motion.div
                  className={cn('h-full rounded-full', risk.barColor)}
                  animate={{ width: currentPlayerData.turnPoints === 0 ? '10%' : currentPlayerData.turnPoints < 10 ? '25%' : currentPlayerData.turnPoints < 20 ? '50%' : currentPlayerData.turnPoints < 35 ? '75%' : '100%' }}
                  transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                />
              </div>
            </div>
          </div>

          {/* Dice Area with 3D perspective */}
          <div className="flex justify-center gap-4 sm:gap-8 py-4 relative" style={{ perspective: '800px' }}>
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-48 h-4 rounded-[50%] bg-black/10 blur-md pointer-events-none">
              <motion.div
                animate={activeDice.some(d => d.rolling) ? { scaleX: [1, 0.7, 1.2, 0.8, 1], opacity: [0.15, 0.08, 0.15, 0.1, 0.15] } : { scaleX: 1, opacity: 0.15 }}
                transition={activeDice.some(d => d.rolling) ? { duration: 0.9 } : { duration: 0.3 }}
                className="w-full h-full rounded-[50%] bg-black"
              />
            </div>

            {activeDice.map((d, i) => (
              <motion.div key={i} initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="relative z-10">
                <DiceFace value={d.value} borderColor={borderColorClass} busted={d.busted} rolling={d.rolling} />
              </motion.div>
            ))}
          </div>

          {/* Turn Result Message */}
          <AnimatePresence mode="wait">
            {turnResultMsg && (
              <motion.div
                key={turnResultMsg}
                initial={{ opacity: 0, scale: 0.8, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: -10 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className={cn('text-center text-lg font-bold py-2.5 px-4 rounded-xl border', isBust ? 'text-red-400 bg-red-900/20 border-red-500/30' : 'text-emerald-400 bg-emerald-900/20 border-emerald-500/30')}
              >
                {turnResultMsg}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Roll Button */}
          {phase === 'rolling' && !isBust && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="flex justify-center">
              <motion.div whileTap={{ scale: 0.95 }} whileHover={{ scale: 1.03 }}>
                <Button
                  onClick={rollDice}
                  size="lg"
                  className={cn('h-14 sm:h-16 text-lg font-bold min-w-[200px] rounded-2xl', currentPlayer === 0 ? 'bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white' : 'bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white')}
                >
                  <Dices className="w-5 h-5 mr-2" />
                  Rolar
                </Button>
              </motion.div>
            </motion.div>
          )}

          {/* Decide Buttons */}
          {phase === 'deciding' && !isBust && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="flex gap-3 justify-center">
              <motion.div whileTap={{ scale: 0.95 }} whileHover={{ scale: 1.03 }}>
                <Button
                  onClick={bankPoints}
                  size="lg"
                  className="h-14 sm:h-16 text-base font-bold min-w-[140px] rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white"
                >
                  <Shield className="w-5 h-5 mr-2" />
                  Banco
                </Button>
              </motion.div>
              <motion.div whileTap={{ scale: 0.95 }} whileHover={{ scale: 1.03 }}>
                <Button
                  onClick={rollDice}
                  size="lg"
                  className="h-14 sm:h-16 text-base font-bold min-w-[140px] rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white"
                >
                  <Zap className="w-5 h-5 mr-2" />
                  Arriscar
                </Button>
              </motion.div>
            </motion.div>
          )}

          {/* Turn Result Waiting */}
          {phase === 'turnResult' && (
            <div className="flex justify-center text-slate-500 text-sm py-2">A passar o turno...</div>
          )}

          {/* GAME OVER SCREEN */}
          {phase === 'gameOver' && winner !== null && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center space-y-5 py-6 relative"
            >
              {/* Confetti */}
              {showConfetti && (
                <div className="absolute inset-0 overflow-hidden pointer-events-none z-30">
                  {Array.from({ length: 40 }).map((_, i) => (
                    <ConfettiParticle key={i} index={i} color={confettiColors[i % confettiColors.length]} />
                  ))}
                </div>
              )}

              {/* Trophy with glow */}
              <motion.div
                initial={{ scale: 0, rotate: -30 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 200, damping: 12, delay: 0.1 }}
                className="relative inline-block"
              >
                <div className={cn('absolute inset-0 rounded-full blur-2xl opacity-30', winner === 0 ? 'bg-cyan-400' : 'bg-pink-400')} style={{ transform: 'scale(1.5)' }} />
                <Trophy className={cn('w-20 h-20 relative z-10', winner === 0 ? 'text-cyan-400' : 'text-pink-400')} strokeWidth={1.5} />
              </motion.div>

              {/* Winner Crown + Name */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <Crown className={cn('w-6 h-6 mx-auto mb-1', winner === 0 ? 'text-amber-400' : 'text-amber-400')} />
                <div className={cn('text-3xl sm:text-4xl font-black', winner === 0 ? 'text-cyan-400' : 'text-pink-400')}>
                  {players[winner].name}
                </div>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300, delay: 0.5 }}
                  className="text-xl font-bold text-amber-400 mt-1"
                >
                  Venceu!
                </motion.div>
              </motion.div>

              {/* Score Comparison */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="flex justify-center items-end gap-6 py-3"
              >
                <div className="text-center">
                  <div className={cn('text-2xl font-black tabular-nums', winner === 0 ? 'text-cyan-400' : 'text-slate-500')}>
                    {players[0].banked}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">Jogador 1</div>
                  {players[0].bestStreak >= 2 && (
                    <div className="flex items-center justify-center gap-0.5 mt-1 text-amber-400">
                      <Flame className="w-3 h-3" />
                      <span className="text-[10px] font-semibold">{players[0].bestStreak}x</span>
                    </div>
                  )}
                </div>
                <div className="text-slate-600 self-center text-sm font-bold">vs</div>
                <div className="text-center">
                  <div className={cn('text-2xl font-black tabular-nums', winner === 1 ? 'text-pink-400' : 'text-slate-500')}>
                    {players[1].banked}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">Jogador 2</div>
                  {players[1].bestStreak >= 2 && (
                    <div className="flex items-center justify-center gap-0.5 mt-1 text-amber-400">
                      <Flame className="w-3 h-3" />
                      <span className="text-[10px] font-semibold">{players[1].bestStreak}x</span>
                    </div>
                  )}
                </div>
              </motion.div>

              {/* Winner Stars */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="flex justify-center gap-1"
              >
                {Array.from({ length: 3 }).map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.9 + i * 0.15 }}
                  >
                    <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                  </motion.div>
                ))}
              </motion.div>

              {/* Play Again Button */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 1.2 }}
              >
                <Button
                  onClick={resetGame}
                  className={cn('h-14 text-lg font-bold rounded-2xl bg-gradient-to-r text-white', winner === 0 ? 'from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700' : 'from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700')}
                >
                  <RotateCcw className="w-5 h-5 mr-2" />
                  Jogar Novamente
                </Button>
              </motion.div>
            </motion.div>
          )}

          {/* Reset Button (during game) */}
          {phase !== 'gameOver' && (
            <div className="flex justify-center pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={resetGame}
                className="text-slate-500 hover:text-slate-300"
              >
                <RotateCcw className="w-4 h-4 mr-1" />
                Reiniciar Tudo
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
