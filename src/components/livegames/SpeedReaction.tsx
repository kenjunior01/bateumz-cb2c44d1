import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Trophy, RotateCcw, User, Timer, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

interface SpeedReactionProps {
  onScore?: (name: string, score: number) => void;
  liveCode?: string;
}

type Phase = 'setup' | 'waiting' | 'go' | 'roundResult' | 'gameOver';
type RoundWinner = 1 | 2 | 'false1' | 'false2' | null;

const WINS_NEEDED = 3;

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

  const goTsRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lockedRef = useRef(false);

  const cleanup = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    lockedRef.current = false;
  }, []);

  useEffect(() => cleanup, [cleanup]);

  const finishRound = useCallback((w: 1 | 2, isFalse: 1 | 2 | null) => {
    const name = w === 1 ? p1Name : p2Name;
    const setter = w === 1 ? setP1Score : setP2Score;
    setter(s => {
      const ns = s + 1;
      if (ns >= WINS_NEEDED) { setPhase('gameOver'); onScore?.(name, ns); }
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
      if (player === 1) setP1Time(ms); else setP2Time(ms);
      if (lockedRef.current) return;
      lockedRef.current = true;
      setRoundWinner(player);
      setFalseStart(null);
      finishRound(player, null);
    }
  }, [phase, cleanup, finishRound]);

  const startRound = useCallback(() => {
    cleanup();
    setP1Time(null); setP2Time(null);
    setRoundWinner(null); setFalseStart(null);
    setPhase('waiting');
    timerRef.current = setTimeout(() => {
      goTsRef.current = performance.now();
      setPhase('go');
    }, 2000 + Math.random() * 4000);
  }, [cleanup]);

  const nextRound = () => { setCurrentRound(r => r + 1); setTimeout(startRound, 150); };
  const resetGame = () => { cleanup(); setP1Score(0); setP2Score(0); setCurrentRound(1); setPhase('setup'); };

  const isGreen = phase === 'go';
  const isWaiting = phase === 'waiting';
  const active = isGreen || isWaiting;
  const gameWinner = p1Score >= WINS_NEEDED ? p1Name : p2Name;
  const winnerIsP1 = p1Score >= WINS_NEEDED;

  return (
    <Card className="w-full max-w-2xl mx-auto overflow-hidden border-0 shadow-2xl shadow-purple-500/10">
      <CardHeader className="bg-gradient-to-r from-violet-600/20 via-fuchsia-600/20 to-cyan-600/20 pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg font-bold">
            <Zap className="h-5 w-5 text-yellow-400" />
            <span className="bg-gradient-to-r from-cyan-300 to-fuchsia-400 bg-clip-text text-transparent">Velocidade de Reação VS</span>
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
              <p className="text-center text-sm text-muted-foreground">Digite os nomes e inicie a batalha de reação!</p>
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
              <Button onClick={startRound} className="w-full bg-gradient-to-r from-cyan-500 to-fuchsia-500 hover:from-cyan-400 hover:to-fuchsia-400 text-white font-bold py-6 text-base shadow-lg shadow-cyan-500/25">
                <Zap className="h-5 w-5 mr-2" /> Iniciar Batalha
              </Button>
            </motion.div>
          )}

          {active && (
            <motion.div key={phase} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid grid-cols-2 divide-x divide-white/10">
              {([1, 2]).map((p) => {
                const name = p === 1 ? p1Name : p2Name;
                const time = p === 1 ? p1Time : p2Time;
                return (
                  <motion.button key={p} onClick={() => handleTap(p as any)} disabled={isGreen && lockedRef.current}
                    className={`relative min-h-[55vh] flex flex-col items-center justify-center gap-3 select-none active:scale-[0.98] transition-all duration-100
                      ${isWaiting ? 'bg-gradient-to-b from-red-950/80 to-red-900/60' : 'bg-gradient-to-b from-emerald-950/90 to-emerald-800/70'}
                      ${isGreen && lockedRef.current ? 'opacity-40 pointer-events-none' : ''}`}>
                    {isWaiting && <div className="absolute inset-0 bg-red-500/5 animate-pulse" />}
                    {isGreen && <div className="absolute inset-0 shadow-[inset_0_0_80px_rgba(16,185,129,0.15)]" />}
                    <span className={`text-sm font-semibold ${isGreen ? 'text-emerald-300' : 'text-red-300/60'}`}>{name}</span>
                    {isWaiting && (
                      <motion.span animate={{ scale: [1, 1.12, 1] }} transition={{ repeat: Infinity, duration: 1.5 }}
                        className="text-3xl sm:text-4xl font-black text-red-400/80 drop-shadow-[0_0_24px_rgba(239,68,68,0.5)]">
                        AGUARDE...
                      </motion.span>
                    )}
                    {isGreen && (
                      <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-4xl sm:text-5xl font-black text-emerald-300 drop-shadow-[0_0_30px_rgba(52,211,153,0.8)]">
                        AGORA!
                      </motion.span>
                    )}
                    {time !== null && <span className="text-sm font-mono text-white/70">{time}ms</span>}
                  </motion.button>
                );
              })}
            </motion.div>
          )}

          {phase === 'roundResult' && (
            <motion.div key="rr" initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="p-6 space-y-4 text-center">
              {falseStart ? (
                <>
                  <AlertTriangle className="h-12 w-12 text-yellow-400 mx-auto drop-shadow-[0_0_14px_rgba(250,204,21,0.6)]" />
                  <p className="text-yellow-400 font-bold text-xl">Largada Antecipada!</p>
                  <p className="text-sm text-muted-foreground">{falseStart === 1 ? p1Name : p2Name} tocou antes do sinal verde!</p>
                  <p className={`text-base font-semibold ${falseStart === 1 ? 'text-fuchsia-400' : 'text-cyan-400'}`}>
                    {falseStart === 1 ? p2Name : p1Name} pontuou!
                  </p>
                </>
              ) : roundWinner === 1 || roundWinner === 2 ? (
                <>
                  <Zap className={`h-12 w-12 mx-auto drop-shadow-[0_0_14px_rgba(250,204,21,0.6)] ${roundWinner === 1 ? 'text-cyan-400' : 'text-fuchsia-400'}`} />
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
                    <p className="text-sm text-muted-foreground">Tempo de reação: {p1Time}ms</p>
                  )}
                  {p2Time !== null && p1Time === null && (
                    <p className="text-sm text-muted-foreground">Tempo de reação: {p2Time}ms</p>
                  )}
                </>
              ) : null}
              <Button onClick={nextRound} className="w-full bg-gradient-to-r from-cyan-500 to-fuchsia-500 hover:from-cyan-400 hover:to-fuchsia-400 text-white font-bold py-5">
                <Zap className="h-4 w-4 mr-2" /> Próxima Rodada
              </Button>
            </motion.div>
          )}

          {phase === 'gameOver' && (
            <motion.div key="go" initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="p-8 space-y-4 text-center">
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
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="flex gap-3 pt-2">
                <Button onClick={resetGame} variant="outline" className="flex-1 border-white/10">
                  <RotateCcw className="h-4 w-4 mr-2" /> Novo Jogo
                </Button>
                <Button onClick={() => { resetGame(); setTimeout(startRound, 200); }}
                  className="flex-1 bg-gradient-to-r from-cyan-500 to-fuchsia-500 hover:from-cyan-400 hover:to-fuchsia-400 text-white font-bold">
                  <Zap className="h-4 w-4 mr-2" /> Revanche
                </Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}