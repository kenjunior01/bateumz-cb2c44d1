import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Zap, Trophy, RotateCcw, User, Timer, AlertTriangle, Target, TrendingUp, TrendingDown, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

interface SpeedReactionProps {
  onScore?: (name: string, score: number) => void;
  liveCode?: string;
}

type Phase = 'setup' | 'waiting' | 'go' | 'hit' | 'roundResult' | 'gameOver';
type RoundWinner = 1 | 2 | 'false1' | 'false2' | null;

const WINS_NEEDED = 3;

function formatMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const s = (ms / 1000).toFixed(2);
  return `${s}s`;
}

function msToBarWidth(ms: number, maxMs = 800): number {
  return Math.min(100, Math.max(4, (ms / maxMs) * 100));
}

function msToColor(ms: number): string {
  if (ms < 200) return 'text-emerald-400';
  if (ms < 350) return 'text-cyan-400';
  if (ms < 500) return 'text-yellow-400';
  return 'text-red-400';
}

function msToGlow(ms: number): string {
  if (ms < 200) return 'shadow-emerald-500/60';
  if (ms < 350) return 'shadow-cyan-500/60';
  if (ms < 500) return 'shadow-yellow-500/60';
  return 'shadow-red-500/60';
}

export default function SpeedReaction({ onScore, liveCode }: SpeedReactionProps) {
  const [phase, setPhase] = useState<Phase>('setup');
  const [p1Name, setP1Name] = useState('Jogador 1');
  const [p2Name, setP2Name] = useState('Jogador 2');
  const [p1Score, setP1Score] = useState(0);
  const [p2Score, setP2Score] = useState(0);
  const [p1Time, setP1Time] = useState<number | null>(null);
  const [p2Time, setP2Time] = useState<number | null>(null);
  const [roundWinner, setRoundWinner] = useState<RoundWinner>(null);
  const [currentRound, setCurrentRound] = useState(1);
  const [falseStart, setFalseStart] = useState<1 | 2 | null>(null);
  const [p1History, setP1History] = useState<number[]>([]);
  const [p2History, setP2History] = useState<number[]>([]);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [hitPlayer, setHitPlayer] = useState<1 | 2 | null>(null);

  const goTsRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lockedRef = useRef(false);
  const elapsedRafRef = useRef(0);

  const cleanup = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    if (elapsedRafRef.current) cancelAnimationFrame(elapsedRafRef.current);
    elapsedRafRef.current = 0;
    lockedRef.current = false;
    setElapsedMs(0);
  }, []);

  useEffect(() => cleanup, [cleanup]);

  const startElapsed = useCallback(() => {
    const tick = () => {
      setElapsedMs(Math.round(performance.now() - goTsRef.current));
      elapsedRafRef.current = requestAnimationFrame(tick);
    };
    elapsedRafRef.current = requestAnimationFrame(tick);
  }, []);

  const finishRound = useCallback((w: 1 | 2, isFalse: 1 | 2 | null) => {
    if (elapsedRafRef.current) cancelAnimationFrame(elapsedRafRef.current);
    elapsedRafRef.current = 0;
    const name = w === 1 ? p1Name : p2Name;
    const setter = w === 1 ? setP1Score : setP2Score;
    setter(s => {
      const ns = s + 1;
      if (ns >= WINS_NEEDED) { setPhase('gameOver'); onScore?.(name, ns); confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } }); setTimeout(() => confetti({ particleCount: 60, angle: 60, spread: 55, origin: { x: 0 } }), 250); setTimeout(() => confetti({ particleCount: 60, angle: 120, spread: 55, origin: { x: 1 } }), 500); }
      else setPhase('roundResult');
      return ns;
    });
  }, [p1Name, p2Name, onScore]);

  const handleTap = useCallback((player: 1 | 2) => {
    if (lockedRef.current) return;
    if (phase === 'waiting') {
      lockedRef.current = true;
      cleanup();
      setFalseStart(player);
      setRoundWinner(player === 1 ? 'false1' : 'false2');
      finishRound(player === 1 ? 2 : 1, player);
      return;
    }
    if (phase === 'go') {
      const ms = Math.round(performance.now() - goTsRef.current);
      if (player === 1) {
        setP1Time(ms);
        setP1History(h => [...h, ms]);
      } else {
        setP2Time(ms);
        setP2History(h => [...h, ms]);
      }
      if (lockedRef.current) return;
      lockedRef.current = true;
      setHitPlayer(player);
      setRoundWinner(player);
      setFalseStart(null);
      if (elapsedRafRef.current) cancelAnimationFrame(elapsedRafRef.current);
      elapsedRafRef.current = 0;
      setPhase('hit');
      setTimeout(() => finishRound(player, null), 600);
    }
  }, [phase, cleanup, finishRound]);

  const startRound = useCallback(() => {
    cleanup();
    setP1Time(null); setP2Time(null);
    setRoundWinner(null); setFalseStart(null);
    setHitPlayer(null);
    setPhase('waiting');
    timerRef.current = setTimeout(() => {
      goTsRef.current = performance.now();
      setPhase('go');
      startElapsed();
    }, 2000 + Math.random() * 4000);
  }, [cleanup, startElapsed]);

  const nextRound = () => { setCurrentRound(r => r + 1); setTimeout(startRound, 150); };
  const resetGame = () => { cleanup(); setP1Score(0); setP2Score(0); setCurrentRound(1); setP1History([]); setP2History([]); setPhase('setup'); };

  const isGreen = phase === 'go' || phase === 'hit';
  const isWaiting = phase === 'waiting';
  const active = isGreen || isWaiting;
  const gameWinner = p1Score >= WINS_NEEDED ? p1Name : p2Name;
  const winnerIsP1 = p1Score >= WINS_NEEDED;

  const p1Best = p1History.length ? Math.min(...p1History) : null;
  const p1Worst = p1History.length ? Math.max(...p1History) : null;
  const p1Avg = p1History.length ? Math.round(p1History.reduce((a, b) => a + b, 0) / p1History.length) : null;
  const p2Best = p2History.length ? Math.min(...p2History) : null;
  const p2Worst = p2History.length ? Math.max(...p2History) : null;
  const p2Avg = p2History.length ? Math.round(p2History.reduce((a, b) => a + b, 0) / p2History.length) : null;

  const ringVariants = {
    initial: { scale: 0.3, opacity: 0.7 },
    animate: { scale: 2.2, opacity: 0 },
  };

  return (
    <Card className="w-full max-w-2xl mx-auto overflow-hidden border-0 shadow-2xl shadow-purple-500/10">
      <CardHeader className="bg-gradient-to-r from-violet-600/20 via-fuchsia-600/20 to-cyan-600/20 pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg font-bold">
            <Zap className="h-5 w-5 text-yellow-400" />
            <span className="bg-gradient-to-r from-cyan-300 to-fuchsia-400 bg-clip-text text-transparent">Velocidade de Reac\u00e7\u00e3o VS</span>
          </CardTitle>
          {phase !== 'setup' && (
            <Badge variant="outline" className="border-cyan-500/50 text-cyan-300 text-xs">
              <Timer className="h-3 w-3 mr-1" /> Rodada {currentRound}
            </Badge>
          )}
        </div>
        {phase !== 'setup' && (
          <div className="flex items-center justify-between mt-2 px-1">
            <span className={`font-bold text-sm ${winnerIsP1 ? 'text-cyan-400' : 'text-muted-foreground'}`}>{p1Name}</span>
            <span className="text-2xl font-black text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]">{p1Score}</span>
            <span className="text-muted-foreground text-xs font-bold">VS</span>
            <span className="text-2xl font-black text-fuchsia-400 drop-shadow-[0_0_8px_rgba(217,70,239,0.6)]">{p2Score}</span>
            <span className={`font-bold text-sm ${!winnerIsP1 && p2Score > 0 ? 'text-fuchsia-400' : 'text-muted-foreground'}`}>{p2Name}</span>
          </div>
        )}
      </CardHeader>
      <CardContent className="p-0">
        <AnimatePresence mode="wait">
          {phase === 'setup' && (
            <motion.div key="setup" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="p-6 space-y-4">
              <p className="text-center text-sm text-muted-foreground">Digite os nomes e inicie a batalha de reac\u00e7\u00e3o!</p>
              <div className="flex gap-3">
                <div className="flex-1 space-y-1.5">
                  <label className="text-xs font-medium text-cyan-400 flex items-center gap-1"><User className="h-3 w-3" /> Jogador 1</label>
                  <Input value={p1Name} onChange={e => setP1Name(e.target.value || 'Jogador 1')} className="border-cyan-500/30 focus:border-cyan-400" />
                </div>
                <div className="flex-1 space-y-1.5">
                  <label className="text-xs font-medium text-fuchsia-400 flex items-center gap-1"><User className="h-3 w-3" /> Jogador 2</label>
                  <Input value={p2Name} onChange={e => setP2Name(e.target.value || 'Jogador 2')} className="border-fuchsia-500/30 focus:border-fuchsia-400" />
                </div>
              </div>
              <motion.div whileHover={{ scale: 1.03 }}>
              <Button onClick={startRound} className="w-full bg-gradient-to-r from-cyan-500 to-fuchsia-500 hover:from-cyan-400 hover:to-fuchsia-400 text-white font-bold py-6 text-base shadow-lg shadow-cyan-500/25 shadow-[0_0_25px_rgba(34,211,238,0.3)]">
                <Zap className="h-5 w-5 mr-2" /> Iniciar Batalha
              </Button>
              </motion.div>
            </motion.div>
          )}

          {active && (
            <motion.div key={phase} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid grid-cols-2 divide-x divide-white/10">
              {([1, 2] as const).map((p) => {
                const name = p === 1 ? p1Name : p2Name;
                const time = p === 1 ? p1Time : p2Time;
                const isHit = phase === 'hit' && hitPlayer === p;
                const isOtherHit = phase === 'hit' && hitPlayer !== p;
                const color = p === 1 ? 'cyan' : 'fuchsia';

                return (
                  <motion.button key={p} onClick={() => handleTap(p)} disabled={(phase === 'go' || phase === 'hit') && lockedRef.current}
                    className={`relative min-h-[55vh] flex flex-col items-center justify-center gap-3 select-none active:scale-[0.98] transition-all duration-100 overflow-hidden
                      ${isWaiting ? 'bg-gradient-to-b from-red-950/80 to-red-900/60' : 'bg-gradient-to-b from-emerald-950/90 to-emerald-800/70'}
                      ${isOtherHit ? 'opacity-30 pointer-events-none' : ''}
                      ${(phase === 'go' || phase === 'hit') && lockedRef.current && !isHit ? 'opacity-40 pointer-events-none' : ''}`}>

                    {/* Background pulse layers */}
                    {isWaiting && <div className="absolute inset-0 bg-red-500/5 animate-pulse" />}
                    {phase === 'go' && <div className="absolute inset-0 shadow-[inset_0_0_80px_rgba(16,185,129,0.15)]" />}

                    {/* Expanding concentric rings for the target */}
                    {phase === 'go' && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        {[0, 1, 2].map((i) => (
                          <motion.div
                            key={i}
                            variants={ringVariants}
                            initial="initial"
                            animate="animate"
                            transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.5, ease: 'easeOut' }}
                            className={`absolute w-32 h-32 rounded-full border-2 ${p === 1 ? 'border-cyan-400/40' : 'border-fuchsia-400/40'}`}
                          />
                        ))}
                        {/* Static crosshair ring */}
                        <div className={`absolute w-28 h-28 rounded-full border ${p === 1 ? 'border-cyan-400/30' : 'border-fuchsia-400/30'} shadow-[0_0_20px_rgba(16,185,129,0.2)]`} />
                        <div className={`absolute w-16 h-16 rounded-full border ${p === 1 ? 'border-cyan-400/50' : 'border-fuchsia-400/50'} shadow-[0_0_12px_rgba(16,185,129,0.25)]`} />
                      </div>
                    )}

                    {/* Hit flash + glow effect */}
                    {isHit && (
                      <>
                        <motion.div
                          initial={{ opacity: 0.7, scale: 0.5 }}
                          animate={{ opacity: 0, scale: 3 }}
                          transition={{ duration: 0.5, ease: 'easeOut' }}
                          className="absolute inset-0 bg-emerald-400/30 pointer-events-none"
                        />
                        <motion.div
                          initial={{ opacity: 0.9 }}
                          animate={{ opacity: 0 }}
                          transition={{ duration: 0.6 }}
                          className="absolute inset-0 pointer-events-none"
                          style={{ boxShadow: 'inset 0 0 120px rgba(52,211,153,0.5)' }}
                        />
                      </>
                    )}

                    <span className={`relative z-10 text-sm font-semibold ${phase === 'go' || phase === 'hit' ? 'text-emerald-300' : 'text-red-300/60'}`}>{name}</span>

                    {isWaiting && (
                      <motion.span animate={{ scale: [1, 1.12, 1] }} transition={{ repeat: Infinity, duration: 1.5 }}
                        className="relative z-10 text-3xl sm:text-4xl font-black text-red-400/80 drop-shadow-[0_0_24px_rgba(239,68,68,0.5)]">
                        AGUARDE...
                      </motion.span>
                    )}

                    {phase === 'go' && (
                      <>
                        <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                          className="relative z-10 text-4xl sm:text-5xl font-black text-emerald-300 drop-shadow-[0_0_30px_rgba(52,211,153,0.8)]">
                          AGORA!
                        </motion.span>
                        {/* Live timer counting up */}
                        <motion.span
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.15 }}
                          className="relative z-10 font-mono text-xl font-bold text-emerald-200/70 tabular-nums"
                        >
                          {formatMs(elapsedMs)}
                        </motion.span>
                      </>
                    )}

                    {/* Hit time display with glow */}
                    {isHit && time !== null && (
                      <motion.div
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 12 }}
                        className={`relative z-10 flex flex-col items-center gap-1`}
                      >
                        <Target className={`h-8 w-8 ${msToColor(time)} drop-shadow-[0_0_12px_currentColor]`} />
                        <span className={`text-3xl font-black ${msToColor(time)} drop-shadow-[0_0_16px_currentColor]`}>
                          {time}ms
                        </span>
                      </motion.div>
                    )}

                    {phase === 'go' && time !== null && (
                      <span className="relative z-10 text-sm font-mono text-white/70">{time}ms</span>
                    )}
                  </motion.button>
                );
              })}
            </motion.div>
          )}

          {phase === 'roundResult' && (
            <motion.div key="rr" initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="p-6 space-y-4 text-center">
              {falseStart ? (
                <>
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300 }}>
                    <AlertTriangle className="h-12 w-12 text-yellow-400 mx-auto drop-shadow-[0_0_14px_rgba(250,204,21,0.6)]" />
                  </motion.div>
                  <p className="text-yellow-400 font-bold text-xl">Largada Antecipada!</p>
                  <p className="text-sm text-muted-foreground">{falseStart === 1 ? p1Name : p2Name} tocou antes do sinal verde!</p>
                  <p className={`text-base font-semibold ${falseStart === 1 ? 'text-fuchsia-400' : 'text-cyan-400'}`}>
                    {falseStart === 1 ? p2Name : p1Name} pontuou!
                  </p>
                </>
              ) : roundWinner === 1 || roundWinner === 2 ? (
                <>
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300 }}>
                    <Zap className={`h-12 w-12 mx-auto drop-shadow-[0_0_14px_rgba(250,204,21,0.6)] ${roundWinner === 1 ? 'text-cyan-400' : 'text-fuchsia-400'}`} />
                  </motion.div>
                  <p className={`font-bold text-xl ${roundWinner === 1 ? 'text-cyan-400' : 'text-fuchsia-400'}`}>
                    {roundWinner === 1 ? p1Name : p2Name} venceu!
                  </p>
                  {p1Time !== null && p2Time !== null && (
                    <div className="flex justify-center gap-6 text-sm">
                      <span className={roundWinner === 1 ? 'text-cyan-300 font-bold' : 'text-muted-foreground'}>{p1Name}: {p1Time}ms</span>
                      <span className={roundWinner === 2 ? 'text-fuchsia-300 font-bold' : 'text-muted-foreground'}>{p2Name}: {p2Time}ms</span>
                    </div>
                  )}
                  {p1Time !== null && p2Time === null && (
                    <p className="text-sm text-muted-foreground">Tempo de reac\u00e7\u00e3o: {p1Time}ms</p>
                  )}
                  {p2Time !== null && p1Time === null && (
                    <p className="text-sm text-muted-foreground">Tempo de reac\u00e7\u00e3o: {p2Time}ms</p>
                  )}

                  {/* Running average display */}
                  {(p1Avg !== null || p2Avg !== null) && (
                    <div className="flex justify-center gap-6 pt-1">
                      {p1Avg !== null && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <TrendingUp className="h-3 w-3 text-cyan-400" />
                          <span>{p1Name} m\u00e9dia: <span className="text-cyan-300 font-semibold">{p1Avg}ms</span></span>
                        </div>
                      )}
                      {p2Avg !== null && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <TrendingUp className="h-3 w-3 text-fuchsia-400" />
                          <span>{p2Name} m\u00e9dia: <span className="text-fuchsia-300 font-semibold">{p2Avg}ms</span></span>
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : null}
              <motion.div whileHover={{ scale: 1.03 }}><Button onClick={nextRound} className="w-full bg-gradient-to-r from-cyan-500 to-fuchsia-500 hover:from-cyan-400 hover:to-fuchsia-400 text-white font-bold py-5 shadow-[0_0_20px_rgba(34,211,238,0.25)]">
                <Zap className="h-4 w-4 mr-2" /> Pr\u00f3xima Rodada
              </Button>
            </motion.div>
            </motion.div>
          )}

          {phase === 'gameOver' && (
            <motion.div key="go" initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="p-6 pb-8 space-y-5 text-center">
              <motion.div initial={{ rotate: -10, scale: 0 }} animate={{ rotate: 0, scale: 1 }} transition={{ type: 'spring', delay: 0.15 }}>
                <Trophy className={`h-16 w-16 mx-auto drop-shadow-[0_0_20px_rgba(250,204,21,0.7)] ${winnerIsP1 ? 'text-cyan-400' : 'text-fuchsia-400'}`} />
              </motion.div>
              <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                className={`text-2xl font-black ${winnerIsP1 ? 'text-cyan-400' : 'text-fuchsia-400'} drop-shadow-[0_0_16px_rgba(250,204,21,0.4)]`}>
                {gameWinner} venceu!
              </motion.p>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }} className="flex justify-center gap-4 text-lg font-bold">
                <span className="text-cyan-400">{p1Score}</span>
                <span className="text-muted-foreground">×</span>
                <span className="text-fuchsia-400">{p2Score}</span>
              </motion.div>

              {/* Stats panel */}
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
                className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
                <div className="flex items-center justify-center gap-2 text-sm font-semibold text-white/80">
                  <BarChart3 className="h-4 w-4" /> Estat\u00edsticas da Partida
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Player 1 stats */}
                  <div className="rounded-lg bg-cyan-500/10 border border-cyan-500/20 p-3 space-y-2">
                    <p className="text-xs font-bold text-cyan-400 truncate">{p1Name}</p>
                    {p1History.length > 0 ? (
                      <>
                        <div className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-1 text-emerald-400"><TrendingUp className="h-3 w-3" /> Melhor</span>
                          <span className="font-mono font-bold text-emerald-400">{p1Best}ms</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-1 text-red-400"><TrendingDown className="h-3 w-3" /> Pior</span>
                          <span className="font-mono font-bold text-red-400">{p1Worst}ms</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-1 text-cyan-300"><Timer className="h-3 w-3" /> M\u00e9dia</span>
                          <span className="font-mono font-bold text-cyan-300">{p1Avg}ms</span>
                        </div>
                        {/* Average time bar */}
                        <div className="space-y-1 pt-1">
                          <div className="flex justify-between text-[10px] text-muted-foreground">
                            <span>Reac\u00e7\u00f5es</span>
                            <span>{p1History.length}x</span>
                          </div>
                          {p1History.map((t, i) => (
                            <div key={i} className="flex items-center gap-1.5">
                              <span className="text-[10px] text-muted-foreground w-4 text-right">R{i + 1}</span>
                              <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${msToBarWidth(t)}%` }}
                                  transition={{ duration: 0.6, delay: 0.7 + i * 0.12, ease: 'easeOut' }}
                                  className={`h-full rounded-full ${t === p1Best ? 'bg-emerald-400' : t === p1Worst ? 'bg-red-400/70' : 'bg-cyan-400/60'}`}
                                />
                              </div>
                              <span className={`text-[10px] font-mono w-10 text-right ${msToColor(t)}`}>{t}ms</span>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <p className="text-[11px] text-muted-foreground">Sem tempos registrados</p>
                    )}
                  </div>

                  {/* Player 2 stats */}
                  <div className="rounded-lg bg-fuchsia-500/10 border border-fuchsia-500/20 p-3 space-y-2">
                    <p className="text-xs font-bold text-fuchsia-400 truncate">{p2Name}</p>
                    {p2History.length > 0 ? (
                      <>
                        <div className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-1 text-emerald-400"><TrendingUp className="h-3 w-3" /> Melhor</span>
                          <span className="font-mono font-bold text-emerald-400">{p2Best}ms</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-1 text-red-400"><TrendingDown className="h-3 w-3" /> Pior</span>
                          <span className="font-mono font-bold text-red-400">{p2Worst}ms</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-1 text-fuchsia-300"><Timer className="h-3 w-3" /> M\u00e9dia</span>
                          <span className="font-mono font-bold text-fuchsia-300">{p2Avg}ms</span>
                        </div>
                        <div className="space-y-1 pt-1">
                          <div className="flex justify-between text-[10px] text-muted-foreground">
                            <span>Reac\u00e7\u00f5es</span>
                            <span>{p2History.length}x</span>
                          </div>
                          {p2History.map((t, i) => (
                            <div key={i} className="flex items-center gap-1.5">
                              <span className="text-[10px] text-muted-foreground w-4 text-right">R{i + 1}</span>
                              <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${msToBarWidth(t)}%` }}
                                  transition={{ duration: 0.6, delay: 0.7 + i * 0.12, ease: 'easeOut' }}
                                  className={`h-full rounded-full ${t === p2Best ? 'bg-emerald-400' : t === p2Worst ? 'bg-red-400/70' : 'bg-fuchsia-400/60'}`}
                                />
                              </div>
                              <span className={`text-[10px] font-mono w-10 text-right ${msToColor(t)}`}>{t}ms</span>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <p className="text-[11px] text-muted-foreground">Sem tempos registrados</p>
                    )}
                  </div>
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }} className="flex gap-3 pt-1">
                <motion.div whileHover={{ scale: 1.03 }}>
                <Button onClick={resetGame} variant="outline" className="flex-1 border-white/10 shadow-[0_0_15px_rgba(161,161,170,0.15)]">
                  <RotateCcw className="h-4 w-4 mr-2" /> Novo Jogo
                </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.03 }}>
                <Button onClick={() => { resetGame(); setTimeout(startRound, 200); }}
                  className="flex-1 bg-gradient-to-r from-cyan-500 to-fuchsia-500 hover:from-cyan-400 hover:to-fuchsia-400 text-white font-bold shadow-[0_0_20px_rgba(34,211,238,0.3)]">
                  <Zap className="h-4 w-4 mr-2" /> Revanche
                </Button>
                </motion.div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}