"use client";

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { RotateCcw, Dices, Shield, Zap } from 'lucide-react';

type GameMode = 'race100' | 'bestOf10' | 'blitz';
type GamePhase = 'setup' | 'rolling' | 'deciding' | 'turnResult' | 'gameOver';

interface Props {
  onScore?: (name: string, score: number) => void;
  liveCode?: string;
}

interface PlayerState {
  name: string;
  banked: number;
  turnPoints: number;
  rolls: number;
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

function DiceFace({ value, borderColor, busted }: { value: number; borderColor: string; busted: boolean }) {
  const dots = DOT_POSITIONS[value] || [];
  return (
    <div className="relative">
      <div
        className={cn(
          'w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white dark:bg-slate-100 p-2 sm:p-3 grid grid-cols-3 grid-rows-3 gap-1 transition-colors duration-200',
          borderColor,
          busted && 'bg-red-200 dark:bg-red-900/60'
        )}
      >
        {Array.from({ length: 9 }).map((_, i) => {
          const row = Math.floor(i / 3) + 1;
          const col = (i % 3) + 1;
          const isDot = dots.some(([r, c]) => r === row && c === col);
          return (
            <div key={i} className="flex items-center justify-center">
              {isDot && (
                <div
                  className={cn(
                    'w-3 h-3 sm:w-4 sm:h-4 rounded-full transition-colors duration-200',
                    busted ? 'bg-red-600' : 'bg-gray-900 dark:bg-gray-800'
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
      <AnimatePresence>
        {busted && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0.6, 1, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="absolute inset-0 rounded-2xl bg-red-500/50 pointer-events-none"
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default function DiceDuel({ onScore, liveCode }: Props) {
  const [gameMode, setGameMode] = useState<GameMode>('race100');
  const [diceCount, setDiceCount] = useState<1 | 2>(1);
  const [phase, setPhase] = useState<GamePhase>('setup');
  const [currentPlayer, setCurrentPlayer] = useState<0 | 1>(0);
  const [round, setRound] = useState(1);
  const [maxRounds, setMaxRounds] = useState(10);
  const [players, setPlayers] = useState<PlayerState[]>([
    { name: 'Jogador 1', banked: 0, turnPoints: 0, rolls: 0 },
    { name: 'Jogador 2', banked: 0, turnPoints: 0, rolls: 0 },
  ]);
  const [dice, setDice] = useState<DiceState[]>([
    { value: 1, rolling: false, busted: false },
    { value: 1, rolling: false, busted: false },
  ]);
  const [turnResultMsg, setTurnResultMsg] = useState('');
  const [isBust, setIsBust] = useState(false);
  const [bankedAnim, setBankedAnim] = useState(false);
  const [winner, setWinner] = useState<number | null>(null);
  const rollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (rollTimerRef.current) clearTimeout(rollTimerRef.current);
    };
  }, []);

  const resetGame = useCallback(() => {
    if (rollTimerRef.current) clearTimeout(rollTimerRef.current);
    setPhase('setup');
    setCurrentPlayer(0);
    setRound(1);
    setMaxRounds(gameMode === 'blitz' ? 3 : 10);
    setPlayers([
      { name: 'Jogador 1', banked: 0, turnPoints: 0, rolls: 0 },
      { name: 'Jogador 2', banked: 0, turnPoints: 0, rolls: 0 },
    ]);
    setDice([
      { value: 1, rolling: false, busted: false },
      { value: 1, rolling: false, busted: false },
    ]);
    setTurnResultMsg('');
    setIsBust(false);
    setBankedAnim(false);
    setWinner(null);
  }, [gameMode]);

  const startGame = useCallback(() => {
    const mr = gameMode === 'blitz' ? 3 : 10;
    setMaxRounds(mr);
    setPhase('rolling');
    setCurrentPlayer(0);
    setRound(1);
    setPlayers([
      { name: 'Jogador 1', banked: 0, turnPoints: 0, rolls: 0 },
      { name: 'Jogador 2', banked: 0, turnPoints: 0, rolls: 0 },
    ]);
    setDice([
      { value: 1, rolling: false, busted: false },
      { value: 1, rolling: false, busted: false },
    ]);
    setTurnResultMsg('');
    setIsBust(false);
    setBankedAnim(false);
    setWinner(null);
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
        next[currentPlayer] = p;
        return next;
      });
      setPhase('deciding');
    }
  }, [currentPlayer, advanceTurn]);

  const rollDice = useCallback(() => {
    if (phase !== 'rolling' && phase !== 'deciding') return;
    setPhase('rolling');
    setIsBust(false);
    setTurnResultMsg('');

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
        onScore?.(players[cp].name, newTotal);
        return;
      }
      advanceTurn();
    }, 1000);
  }, [currentPlayer, players, gameMode, advanceTurn, onScore]);

  const handleModeSelect = useCallback((mode: GameMode) => {
    setGameMode(mode);
    setMaxRounds(mode === 'blitz' ? 3 : 10);
  }, []);

  const getRiskLevel = (turnPoints: number) => {
    if (turnPoints === 0) return { label: 'Baixo', color: 'text-emerald-400' };
    if (turnPoints < 10) return { label: 'Baixo', color: 'text-emerald-400' };
    if (turnPoints < 20) return { label: 'Médio', color: 'text-amber-400' };
    if (turnPoints < 35) return { label: 'Alto', color: 'text-orange-400' };
    return { label: 'Extremo', color: 'text-red-400' };
  };

  const currentPlayerData = players[currentPlayer];
  const risk = getRiskLevel(currentPlayerData.turnPoints);
  const activeDice = dice.slice(0, diceCount);
  const borderColorClass = currentPlayer === 0 ? 'border-2 border-cyan-400' : 'border-2 border-pink-400';

  return (
    <div className="w-full max-w-lg mx-auto space-y-4">
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
              <button
                onClick={() => handleModeSelect('race100')}
                className={cn(
                  'p-3 rounded-xl border text-center transition-all',
                  gameMode === 'race100'
                    ? 'border-cyan-400 bg-cyan-400/10 text-cyan-300'
                    : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-500'
                )}
              >
                <div className="font-semibold text-sm">Corrida a 100</div>
                <div className="text-xs mt-1 opacity-70">Primeiro a 100 vence</div>
              </button>
              <button
                onClick={() => handleModeSelect('bestOf10')}
                className={cn(
                  'p-3 rounded-xl border text-center transition-all',
                  gameMode === 'bestOf10'
                    ? 'border-cyan-400 bg-cyan-400/10 text-cyan-300'
                    : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-500'
                )}
              >
                <div className="font-semibold text-sm">Melhor de 10</div>
                <div className="text-xs mt-1 opacity-70">10 rounds, maior pontuação</div>
              </button>
              <button
                onClick={() => handleModeSelect('blitz')}
                className={cn(
                  'p-3 rounded-xl border text-center transition-all',
                  gameMode === 'blitz'
                    ? 'border-cyan-400 bg-cyan-400/10 text-cyan-300'
                    : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-500'
                )}
              >
                <div className="font-semibold text-sm">Blitz</div>
                <div className="text-xs mt-1 opacity-70">3 rounds, alta pressão</div>
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium text-slate-300">Número de Dados</p>
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
            Começar Jogo
          </Button>
        </motion.div>
      )}

      {phase !== 'setup' && (
        <>
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-cyan-900/30 to-pink-900/30 border border-cyan-500/20 rounded-2xl p-4"
          >
            <div className="flex items-center justify-between">
              <div className="text-center flex-1">
                <div
                  className={cn(
                    'text-xs font-medium uppercase tracking-wider',
                    currentPlayer === 0 ? 'text-cyan-400' : 'text-slate-500'
                  )}
                >
                  Jogador 1
                </div>
                <motion.div
                  key={'p1-' + players[0].banked}
                  initial={{ scale: 1.3 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                  className="text-2xl sm:text-3xl font-bold text-cyan-400"
                >
                  {players[0].banked}
                </motion.div>
                {currentPlayer === 0 && (
                  <motion.div
                    layoutId="turnIndicator"
                    className="w-2 h-2 rounded-full bg-cyan-400 mx-auto mt-1"
                  />
                )}
              </div>

              <div className="text-center px-3 sm:px-6">
                <div className="text-[10px] sm:text-xs font-bold text-slate-400 tracking-widest">
                  DUELO DE DADOS
                </div>
                <Badge variant="outline" className="mt-1 border-slate-600 text-slate-300">
                  Round {round}{gameMode !== 'race100' && ' / ' + maxRounds}
                </Badge>
              </div>

              <div className="text-center flex-1">
                <div
                  className={cn(
                    'text-xs font-medium uppercase tracking-wider',
                    currentPlayer === 1 ? 'text-pink-400' : 'text-slate-500'
                  )}
                >
                  Jogador 2
                </div>
                <motion.div
                  key={'p2-' + players[1].banked}
                  initial={{ scale: 1.3 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                  className="text-2xl sm:text-3xl font-bold text-pink-400"
                >
                  {players[1].banked}
                </motion.div>
                {currentPlayer === 1 && (
                  <motion.div
                    layoutId="turnIndicator"
                    className="w-2 h-2 rounded-full bg-pink-400 mx-auto mt-1"
                  />
                )}
              </div>
            </div>
          </motion.div>

          <div className="text-center space-y-1">
            <div
              className={cn(
                'text-sm font-medium',
                currentPlayer === 0 ? 'text-cyan-400' : 'text-pink-400'
              )}
            >
              Vez de {currentPlayerData.name}
            </div>
            <div className="text-slate-500 text-xs">
              {currentPlayerData.rolls === 0
                ? 'Role os dados para começar'
                : currentPlayerData.rolls + ' rolo' + (currentPlayerData.rolls === 1 ? '' : 's') + ' neste turno'}
            </div>
          </div>

          <div className="flex justify-center gap-4 sm:gap-8 text-center">
            <div className="bg-slate-800/60 rounded-xl px-4 py-2 min-w-[80px]">
              <div className="text-[10px] uppercase tracking-wider text-slate-500">Banco</div>
              <motion.div
                key={'bank-' + currentPlayerData.banked}
                initial={bankedAnim ? { y: -20, opacity: 0 } : { y: 0, opacity: 1 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 400 }}
                className="text-lg font-bold text-emerald-400"
              >
                {currentPlayerData.banked}
              </motion.div>
            </div>
            <div className="bg-slate-800/60 rounded-xl px-4 py-2 min-w-[80px]">
              <div className="text-[10px] uppercase tracking-wider text-slate-500">Turno</div>
              <motion.div
                key={'turn-' + currentPlayerData.turnPoints}
                initial={{ scale: 1.4 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300 }}
                className="text-lg font-bold text-amber-400"
              >
                {currentPlayerData.turnPoints}
              </motion.div>
            </div>
            <div className="bg-slate-800/60 rounded-xl px-4 py-2 min-w-[80px]">
              <div className="text-[10px] uppercase tracking-wider text-slate-500">Risco</div>
              <div className={cn('text-sm font-semibold mt-0.5', risk.color)}>
                {risk.label}
              </div>
            </div>
          </div>

          <div className="flex justify-center gap-4 py-4">
            {activeDice.map((d, i) => (
              <motion.div
                key={i}
                animate={
                  d.rolling
                    ? { rotate: [0, 180, 360, 540, 720], scale: [1, 1.1, 1, 1.1, 1] }
                    : isBust
                    ? { x: [0, -8, 8, -8, 8, -4, 4, 0], rotate: [0, -3, 3, -3, 3, -1, 1, 0] }
                    : { rotate: 0, scale: 1, x: 0 }
                }
                transition={d.rolling ? { duration: 0.8, ease: 'easeInOut' } : isBust ? { duration: 0.5 } : { duration: 0.3 }}
              >
                <DiceFace value={d.value} borderColor={borderColorClass} busted={d.busted} />
              </motion.div>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {turnResultMsg && (
              <motion.div
                key={turnResultMsg}
                initial={{ opacity: 0, scale: 0.8, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className={cn(
                  'text-center text-lg font-bold py-2 rounded-xl',
                  isBust ? 'text-red-400 bg-red-900/20' : 'text-emerald-400 bg-emerald-900/20'
                )}
              >
                {turnResultMsg}
              </motion.div>
            )}
          </AnimatePresence>

          {phase === 'rolling' && !isBust && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="flex justify-center">
              <Button
                onClick={rollDice}
                size="lg"
                className={cn(
                  'h-14 sm:h-16 text-lg font-bold min-w-[200px] rounded-2xl',
                  currentPlayer === 0 ? 'bg-cyan-500 hover:bg-cyan-600 text-white' : 'bg-pink-500 hover:bg-pink-600 text-white'
                )}
              >
                <Dices className="w-5 h-5 mr-2" />
                Rolar
              </Button>
            </motion.div>
          )}

          {phase === 'deciding' && !isBust && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="flex gap-3 justify-center">
              <Button
                onClick={bankPoints}
                size="lg"
                className="h-14 sm:h-16 text-base font-bold min-w-[140px] rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white"
              >
                <Shield className="w-5 h-5 mr-2" />
                Banco
              </Button>
              <Button
                onClick={rollDice}
                size="lg"
                className="h-14 sm:h-16 text-base font-bold min-w-[140px] rounded-2xl bg-amber-500 hover:bg-amber-600 text-white"
              >
                <Zap className="w-5 h-5 mr-2" />
                Arriscar
              </Button>
            </motion.div>
          )}

          {phase === 'turnResult' && (
            <div className="flex justify-center text-slate-500 text-sm py-2">
              A passar o turno...
            </div>
          )}

          {phase === 'gameOver' && winner !== null && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              className="text-center space-y-4 py-4"
            >
              <div className={cn('text-3xl sm:text-4xl font-black', winner === 0 ? 'text-cyan-400' : 'text-pink-400')}>
                {players[winner].name}
              </div>
              <div className="text-2xl font-bold text-amber-400">Venceu!</div>
              <div className="flex justify-center gap-6 text-slate-400">
                <div>
                  <div className="text-cyan-400 font-bold text-xl">{players[0].banked}</div>
                  <div className="text-xs">Jogador 1</div>
                </div>
                <div className="text-slate-600 self-end text-sm font-medium">vs</div>
                <div>
                  <div className="text-pink-400 font-bold text-xl">{players[1].banked}</div>
                  <div className="text-xs">Jogador 2</div>
                </div>
              </div>
            </motion.div>
          )}

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
        </>
      )}
    </div>
  );
}
