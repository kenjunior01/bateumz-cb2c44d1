import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw, Bot, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface Props {
  onScore?: (name: string, score: number) => void;
  liveCode?: string;
}

type GameMode = '1v1' | 'bot';
type GameState = 'idle' | 'showing' | 'input' | 'roundResult' | 'gameOver';
type GameSpeed = 'normal' | 'fast';

const COLORS = [
  { name: 'Vermelho', base: 'bg-red-500', flash: 'bg-red-300 shadow-red-400 shadow-lg', dimBase: 'bg-red-500/50', border: 'border-red-400/30' },
  { name: 'Azul', base: 'bg-blue-500', flash: 'bg-blue-300 shadow-blue-400 shadow-lg', dimBase: 'bg-blue-500/50', border: 'border-blue-400/30' },
  { name: 'Verde', base: 'bg-emerald-500', flash: 'bg-emerald-300 shadow-emerald-400 shadow-lg', dimBase: 'bg-emerald-500/50', border: 'border-emerald-400/30' },
  { name: 'Amarelo', base: 'bg-yellow-500', flash: 'bg-yellow-300 shadow-yellow-400 shadow-lg', dimBase: 'bg-yellow-500/50', border: 'border-yellow-400/30' },
];

const SPEED_MS: Record<GameSpeed, number> = { normal: 800, fast: 400 };
const GAP_MS: Record<GameSpeed, number> = { normal: 300, fast: 150 };

function randomColor(): number {
  return Math.floor(Math.random() * 4);
}

export default function ColorSequence({ onScore, liveCode }: Props) {
  const [mode, setMode] = useState<GameMode>('1v1');
  const [speed, setSpeed] = useState<GameSpeed>('normal');
  const [gameState, setGameState] = useState<GameState>('idle');
  const [sequence, setSequence] = useState<number[]>([]);
  const [activeFlash, setActiveFlash] = useState<number | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<1 | 2>(1);
  const [playerInput, setPlayerInput] = useState<number[]>([]);
  const [playerScores, setPlayerScores] = useState([0, 0]);
  const [round, setRound] = useState(1);
  const [shakeButton, setShakeButton] = useState<number | null>(null);
  const [playerTap, setPlayerTap] = useState<number | null>(null);
  const [wrongIndex, setWrongIndex] = useState<number | null>(null);
  const [roundWinner, setRoundWinner] = useState<1 | 2 | null>(null);

  const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const botTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showIndexRef = useRef(0);
  const isShowingRef = useRef(false);

  const clearAllTimers = useCallback(() => {
    if (showTimerRef.current) clearTimeout(showTimerRef.current);
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    if (botTimerRef.current) clearTimeout(botTimerRef.current);
  }, []);

  const playerName = (p: 1 | 2) => (mode === 'bot' && p === 2) ? 'Bot' : `Jogador ${p}`;

  const startNewGame = useCallback(() => {
    clearAllTimers();
    setSequence([]);
    setActiveFlash(null);
    setCurrentPlayer(1);
    setPlayerInput([]);
    setPlayerScores([0, 0]);
    setRound(1);
    setShakeButton(null);
    setPlayerTap(null);
    setWrongIndex(null);
    setRoundWinner(null);
    setGameState('idle');
  }, [clearAllTimers]);

  const addRandomStep = useCallback((prev: number[]) => {
    const newSeq = [...prev, randomColor()];
    return newSeq;
  }, []);

  const showSequence = useCallback((seq: number[], spd: GameSpeed) => {
    isShowingRef.current = true;
    setGameState('showing');
    showIndexRef.current = 0;
    setPlayerInput([]);

    const flashDuration = SPEED_MS[spd];
    const gapDuration = GAP_MS[spd];

    const showNext = (index: number) => {
      if (index >= seq.length) {
        isShowingRef.current = false;
        setActiveFlash(null);
        setGameState('input');
        return;
      }

      setActiveFlash(seq[index]);
      showTimerRef.current = setTimeout(() => {
        setActiveFlash(null);
        flashTimerRef.current = setTimeout(() => {
          showNext(index + 1);
        }, gapDuration);
      }, flashDuration);
    };

    setTimeout(() => showNext(0), 500);
  }, []);

  const startRound = useCallback(() => {
    clearAllTimers();
    setPlayerTap(null);
    setShakeButton(null);
    setWrongIndex(null);
    setRoundWinner(null);

    const newSeq = addRandomStep(sequence);
    setSequence(newSeq);

    if (mode === 'bot' && currentPlayer === 2) {
      setGameState('showing');
      setTimeout(() => {
        botSimulateRound(newSeq);
      }, 800);
    } else {
      showSequence(newSeq, speed);
    }
  }, [sequence, speed, mode, currentPlayer, addRandomStep, showSequence, clearAllTimers]);

  const botSimulateRound = useCallback((seq: number[]) => {
    setGameState('input');

    let stepIndex = 0;
    const seqLen = seq.length;

    const botStep = () => {
      if (stepIndex >= seqLen) {
        handlePlayerFinished(currentPlayer, seqLen);
        return;
      }

      const expectedColor = seq[stepIndex];
      const mistakeChance = seqLen > 3 ? Math.min(0.05 + (seqLen - 3) * 0.04, 0.35) : 0.02;
      const makeMistake = Math.random() < mistakeChance;

      setActiveFlash(expectedColor);

      botTimerRef.current = setTimeout(() => {
        setActiveFlash(null);

        if (makeMistake) {
          const wrongColor = (expectedColor + 1 + Math.floor(Math.random() * 3)) % 4;
          setShakeButton(wrongColor);
          setWrongIndex(stepIndex);

          setTimeout(() => {
            handlePlayerMistake(currentPlayer as 1 | 2, wrongColor, stepIndex);
          }, 600);
          return;
        }

        stepIndex++;
        botTimerRef.current = setTimeout(botStep, 300 + Math.random() * 200);
      }, 300 + Math.random() * 200);
    };

    setTimeout(botStep, 600);
  }, [currentPlayer]);

  const handlePlayerFinished = useCallback((player: 1 | 2, seqLen: number) => {
    setPlayerScores(prev => {
      const next = [...prev];
      next[player - 1] = Math.max(next[player - 1], seqLen);
      return next;
    });

    if (mode === 'bot' && player === 2) {
      setRoundWinner(2);
      setGameState('roundResult');
    } else {
      setRoundWinner(player);
      setGameState('roundResult');
    }
  }, [mode]);

  const handlePlayerMistake = useCallback((player: 1 | 2, _wrongColor: number, _stepIndex: number) => {
    const otherPlayer = player === 1 ? 2 : 1;

    setPlayerScores(prev => {
      const next = [...prev];
      next[otherPlayer - 1] = Math.max(next[otherPlayer - 1], sequence.length);
      return next;
    });

    onScore?.(playerName(otherPlayer), sequence.length);

    setGameState('gameOver');
  }, [sequence, onScore, playerName]);

  const handleColorPress = useCallback((colorIndex: number) => {
    if (gameState !== 'input') return;
    if (mode === 'bot' && currentPlayer === 2) return;

    setPlayerTap(colorIndex);
    setTimeout(() => setPlayerTap(null), 200);

    const expected = sequence[playerInput.length];

    if (colorIndex !== expected) {
      setShakeButton(colorIndex);
      setWrongIndex(playerInput.length);

      const otherPlayer = currentPlayer === 1 ? 2 : 1;

      setPlayerScores(prev => {
        const next = [...prev];
        next[otherPlayer - 1] = Math.max(next[otherPlayer - 1], sequence.length);
        return next;
      });

      onScore?.(playerName(otherPlayer as 1 | 2), sequence.length);

      setGameState('gameOver');
      return;
    }

    const newInput = [...playerInput, colorIndex];
    setPlayerInput(newInput);

    if (newInput.length === sequence.length) {
      setGameState('input');
      setTimeout(() => {
        handlePlayerFinished(currentPlayer, sequence.length);
      }, 400);
    }
  }, [gameState, mode, currentPlayer, sequence, playerInput, handlePlayerFinished, onScore, playerName]);

  const nextRound = useCallback(() => {
    const nextPlayer = (currentPlayer === 1 ? 2 : 1) as 1 | 2;
    setCurrentPlayer(nextPlayer);
    setRound(prev => prev + 1);
    setPlayerInput([]);
  }, [currentPlayer]);

  useEffect(() => {
    if (gameState === 'idle' || gameState === 'gameOver') return;

    if (gameState === 'roundResult') {
      const timer = setTimeout(() => {
        nextRound();
      }, mode === 'bot' && currentPlayer === 2 ? 1500 : 2000);
      return () => clearTimeout(timer);
    }

    if (gameState === 'input' && roundWinner !== null) {
      return;
    }
  }, [gameState, nextRound, roundWinner, currentPlayer, mode]);

  useEffect(() => {
    return () => clearAllTimers();
  }, [clearAllTimers]);

  const progressPercent = sequence.length > 0
    ? Math.min((playerInput.length / sequence.length) * 100, 100)
    : 0;

  const statusText = (() => {
    switch (gameState) {
      case 'idle': return 'Clique em "Iniciar" para começar';
      case 'showing': return 'Assista...';
      case 'input': return `${playerName(currentPlayer)} — Sua vez!`;
      case 'roundResult': return roundWinner
        ? `${playerName(roundWinner)} acertou! — Nível ${sequence.length}`
        : 'Próximo Round';
      case 'gameOver': {
        const winner = playerScores[0] > playerScores[1] ? 1
          : playerScores[1] > playerScores[0] ? 2 : 0;
        return winner === 0
          ? 'Empate!'
          : `${playerName(winner as 1 | 2)} venceu!`;
      }
      default: return '';
    }
  })();

  return (
    <div className="min-w-[340px] max-w-lg mx-auto">
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 space-y-5">

        <div className="bg-gradient-to-r from-violet-900/30 to-fuchsia-900/30 border border-violet-500/20 rounded-xl px-4 py-3 flex items-center justify-between">
          <div className="flex flex-col items-center gap-1 min-w-[70px]">
            <div className={cn(
              'text-xs font-medium',
              currentPlayer === 1 && gameState === 'input' && !(mode === 'bot' && (currentPlayer as number) === 2)
                ? 'text-cyan-400'
                : 'text-slate-400'
            )}>
              {playerName(1)}
            </div>
            <motion.div
              key={`p1-${playerScores[0]}`}
              initial={{ scale: 1.4, color: '#22d3ee' }}
              animate={{ scale: 1, color: '#e2e8f0' }}
              transition={{ duration: 0.5 }}
              className="text-2xl font-bold text-slate-100"
            >
              {playerScores[0]}
            </motion.div>
            {currentPlayer === 1 && gameState === 'input' && !(mode === 'bot' && (currentPlayer as number) === 2) && (
              <motion.div
                layoutId="turn-indicator"
                className="w-2 h-2 rounded-full bg-cyan-400"
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ repeat: Infinity, duration: 1 }}
              />
            )}
          </div>

          <div className="flex flex-col items-center gap-0.5">
            <Eye className="w-4 h-4 text-violet-400 mb-0.5" />
            <span className="text-sm font-bold text-violet-300 tracking-wide">
              SEQUÊNCIA DE CORES
            </span>
            {mode === 'bot' && (
              <Bot className="w-3 h-3 text-fuchsia-400 mt-0.5" />
            )}
          </div>

          <div className="flex flex-col items-center gap-1 min-w-[70px]">
            <div className={cn(
              'text-xs font-medium',
              currentPlayer === 2 && gameState === 'input' && !(mode === 'bot' && (currentPlayer as number) === 2)
                ? 'text-pink-400'
                : mode === 'bot'
                  ? 'text-slate-500'
                  : 'text-slate-400'
            )}>
              {playerName(2)}
            </div>
            <motion.div
              key={`p2-${playerScores[1]}`}
              initial={{ scale: 1.4, color: '#f472b6' }}
              animate={{ scale: 1, color: '#e2e8f0' }}
              transition={{ duration: 0.5 }}
              className="text-2xl font-bold text-slate-100"
            >
              {playerScores[1]}
            </motion.div>
            {currentPlayer === 2 && gameState === 'input' && !(mode === 'bot' && (currentPlayer as number) === 2) && (
              <motion.div
                layoutId="turn-indicator"
                className="w-2 h-2 rounded-full bg-pink-400"
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ repeat: Infinity, duration: 1 }}
              />
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={mode === '1v1' ? 'default' : 'outline'}
              onClick={() => { if (gameState !== 'showing') { startNewGame(); setMode('1v1'); } }}
              disabled={gameState === 'showing'}
              className={cn(
                'text-xs px-3 py-1 h-7',
                mode === '1v1' && 'bg-cyan-600 hover:bg-cyan-700 text-white'
              )}
            >
              1v1 Local
            </Button>
            <Button
              size="sm"
              variant={mode === 'bot' ? 'default' : 'outline'}
              onClick={() => { if (gameState !== 'showing') { startNewGame(); setMode('bot'); } }}
              disabled={gameState === 'showing'}
              className={cn(
                'text-xs px-3 py-1 h-7',
                mode === 'bot' && 'bg-fuchsia-600 hover:bg-fuchsia-700 text-white'
              )}
            >
              <Bot className="w-3 h-3 mr-1" />
              VS Bot
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={speed === 'normal' ? 'secondary' : 'ghost'}
              onClick={() => setSpeed('normal')}
              disabled={gameState === 'showing'}
              className="text-xs px-3 py-1 h-7"
            >
              Normal
            </Button>
            <Button
              size="sm"
              variant={speed === 'fast' ? 'secondary' : 'ghost'}
              onClick={() => setSpeed('fast')}
              disabled={gameState === 'showing'}
              className="text-xs px-3 py-1 h-7"
            >
              ⚡ Modo Rápido
            </Button>
          </div>
        </div>

        <div className="flex flex-col items-center gap-2">
          <AnimatePresence mode="wait">
            <motion.div
              key={statusText}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.25 }}
              className="text-center"
            >
              <div className="flex items-center gap-2 justify-center">
                {gameState === 'showing' && <Eye className="w-4 h-4 text-violet-400" />}
                {gameState === 'input' && (
                  <motion.div
                    className={cn(
                      'w-2.5 h-2.5 rounded-full',
                      currentPlayer === 1 ? 'bg-cyan-400' : 'bg-pink-400'
                    )}
                    animate={{ scale: [1, 1.4, 1] }}
                    transition={{ repeat: Infinity, duration: 0.8 }}
                  />
                )}
                <span className={cn(
                  'text-sm font-medium',
                  gameState === 'showing' && 'text-violet-300',
                  gameState === 'input' && (currentPlayer === 1 ? 'text-cyan-300' : 'text-pink-300'),
                  gameState === 'gameOver' && 'text-red-400',
                  gameState === 'roundResult' && 'text-emerald-400',
                  gameState === 'idle' && 'text-slate-400',
                )}>
                  {statusText}
                </span>
              </div>
            </motion.div>
          </AnimatePresence>

          {gameState !== 'idle' && (
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="text-xs border-slate-600 text-slate-300">
                Round {round}
              </Badge>
              <Badge variant="outline" className="text-xs border-slate-600 text-slate-300">
                Nível {sequence.length}
              </Badge>
            </div>
          )}

          {gameState === 'input' && sequence.length > 0 && !(mode === 'bot' && (currentPlayer as number) === 2) && (
            <div className="w-full max-w-xs h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <motion.div
                className={cn(
                  'h-full rounded-full',
                  currentPlayer === 1 ? 'bg-cyan-500' : 'bg-pink-500'
                )}
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.2 }}
              />
            </div>
          )}
        </div>

        <div className="flex items-center justify-center">
          <AnimatePresence>
            {gameState === 'gameOver' && (
              <motion.div
                key="game-over-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-20 flex items-center justify-center rounded-2xl bg-black/60 backdrop-blur-sm"
              >
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  className="text-center space-y-3 px-6"
                >
                  <div className="text-3xl font-bold text-slate-100">
                    Errou!
                  </div>
                  <div className="text-slate-300 text-sm">
                    Sequência: {sequence.length} {sequence.length === 1 ? 'cor' : 'cores'}
                  </div>
                  <div className="flex items-center justify-center gap-4 text-sm">
                    <span className={cn(
                      'font-semibold',
                      playerScores[0] > playerScores[1] ? 'text-cyan-400' : 'text-slate-400'
                    )}>
                      {playerName(1)}: {playerScores[0]}
                    </span>
                    <span className="text-slate-600">vs</span>
                    <span className={cn(
                      'font-semibold',
                      playerScores[1] > playerScores[0] ? 'text-pink-400' : 'text-slate-400'
                    )}>
                      {playerName(2)}: {playerScores[1]}
                    </span>
                  </div>
                  <Button
                    onClick={startNewGame}
                    className="bg-violet-600 hover:bg-violet-700 text-white mt-2"
                  >
                    <RotateCcw className="w-4 h-4 mr-1" />
                    Reiniciar Tudo
                  </Button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid grid-cols-2 gap-4 relative">
            {COLORS.map((color, index) => {
              const isFlashing = activeFlash === index;
              const isTapping = playerTap === index;
              const isShaking = shakeButton === index;
              const isWrong = wrongIndex !== null && gameState === 'gameOver';
              const isInputActive = gameState === 'input' && !(mode === 'bot' && (currentPlayer as number) === 2);
              const isDimmed = gameState === 'showing' && !isFlashing;

              return (
                <motion.button
                  key={index}
                  onClick={() => handleColorPress(index)}
                  disabled={gameState === 'showing' || gameState === 'gameOver' || gameState === 'roundResult' || gameState === 'idle'}
                  animate={
                    isShaking
                      ? {
                          x: [-6, 6, -5, 5, -3, 3, 0],
                          transition: { duration: 0.5 },
                        }
                      : isFlashing
                        ? { scale: 1.05 }
                        : isTapping
                          ? { scale: 0.95 }
                          : { scale: 1 }
                  }
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  className={cn(
                    'w-28 h-28 sm:w-36 sm:h-36 rounded-3xl transition-colors duration-150 relative overflow-hidden cursor-pointer',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30',
                    'border-2',
                    isFlashing && color.flash,
                    isFlashing && color.border,
                    !isFlashing && !isDimmed && color.base,
                    isDimmed && color.dimBase,
                    isInputActive && !isFlashing && 'hover:brightness-110',
                    isWrong && isShaking && 'ring-2 ring-red-400',
                  )}
                  style={{
                    boxShadow: isFlashing
                      ? `0 0 30px ${index === 0 ? '#ef4444' : index === 1 ? '#3b82f6' : index === 2 ? '#10b981' : '#eab308'}88`
                      : 'none',
                  }}
                >
                  <AnimatePresence>
                    {isTapping && (
                      <motion.div
                        className="absolute inset-0 rounded-3xl"
                        initial={{ opacity: 0.5 }}
                        animate={{ opacity: 0, scale: 1.5 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.4 }}
                        style={{
                          background: `radial-gradient(circle, white 0%, transparent 70%)`,
                        }}
                      />
                    )}
                  </AnimatePresence>

                  {isFlashing && (
                    <motion.div
                      className="absolute inset-0 rounded-3xl"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.1 }}
                      style={{
                        background: `radial-gradient(circle at center, rgba(255,255,255,0.4) 0%, transparent 70%)`,
                      }}
                    />
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-xs text-slate-500">
            {gameState !== 'idle' && (
              <span>
                {playerInput.length} / {sequence.length}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {gameState === 'idle' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
              >
                <Button
                  onClick={startRound}
                  className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white font-semibold"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Iniciar
                </Button>
              </motion.div>
            )}

            {gameState === 'roundResult' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <Button
                  onClick={nextRound}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  Próximo Round
                </Button>
              </motion.div>
            )}

            {gameState !== 'idle' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={startNewGame}
                className="text-slate-400 hover:text-slate-200 text-xs"
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                Reiniciar Tudo
              </Button>
            )}
          </div>
        </div>

        {sequence.length > 0 && gameState !== 'idle' && (
          <div className="flex items-center justify-center gap-1 flex-wrap">
            {sequence.map((colorIdx, i) => (
              <motion.div
                key={`seq-${round}-${i}`}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: i * 0.03 }}
                className={cn(
                  'w-3 h-3 rounded-full',
                  i < playerInput.length
                    ? COLORS[colorIdx].base
                    : gameState === 'gameOver' && i === wrongIndex
                      ? 'bg-red-400'
                      : 'bg-slate-700',
                )}
                style={{
                  boxShadow: i < playerInput.length
                    ? `0 0 6px ${colorIdx === 0 ? '#ef4444' : colorIdx === 1 ? '#3b82f6' : colorIdx === 2 ? '#10b981' : '#eab308'}66`
                    : 'none',
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
