import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Bomb, Users, Trophy, RotateCcw, Flame, Zap, Skull, Timer } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

interface HotPotatoGameProps { onScore?: (name: string, score: number) => void; liveCode?: string; }

export default function HotPotatoGame({ onScore, liveCode }: HotPotatoGameProps) {
  const [phase, setPhase] = useState<'setup' | 'playing' | 'boom' | 'done'>('setup');
  const [players, setPlayers] = useState<string[]>(['Jogador 1', 'Jogador 2', 'Jogador 3', 'Jogador 4']);
  const [newPlayer, setNewPlayer] = useState('');
  const [currentIdx, setCurrentIdx] = useState(0);
  const [bombTimer, setBombTimer] = useState(100);
  const [speed, setSpeed] = useState(1);
  const [eliminated, setEliminated] = useState<Set<number>>(new Set());
  const [round, setRound] = useState(1);
  const [boomPlayer, setBoomPlayer] = useState<string>('');
  const [pulse, setPulse] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();
  const bombTimerRef = useRef<ReturnType<typeof setInterval>>();

  const addPlayer = () => {
    if (!newPlayer.trim() || players.length >= 12) return;
    setPlayers(p => [...p, newPlayer.trim()]); setNewPlayer('');
  };

  const startGame = () => {
    if (players.length < 3) return;
    setPhase('playing'); setCurrentIdx(0); setEliminated(new Set());
    setBombTimer(100); setSpeed(1); setRound(1);
  };

  useEffect(() => {
    if (phase !== 'playing') return;
    const alive = players.filter((_, i) => !eliminated.has(i));
    if (alive.length <= 1) {
      clearInterval(intervalRef.current); clearInterval(bombTimerRef.current);
      onScore?.(alive[0] || 'Ninguém', round * 50);
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 }, colors: ['#f97316', '#ef4444', '#fbbf24'] });
      setPhase('done'); return;
    }
    // Move potato
    intervalRef.current = setInterval(() => {
      setCurrentIdx(prev => {
        let next = (prev + 1) % players.length;
        while (eliminated.has(next)) next = (next + 1) % players.length;
        return next;
      });
      setPulse(p => !p);
    }, Math.max(200, 1000 / speed));
    // Bomb countdown
    bombTimerRef.current = setInterval(() => {
      setBombTimer(t => {
        if (t <= 0) {
          clearInterval(intervalRef.current); clearInterval(bombTimerRef.current);
          return 0;
        }
        return t - 1;
      });
    }, 100);
    return () => { clearInterval(intervalRef.current); clearInterval(bombTimerRef.current); };
  }, [phase, speed, eliminated, players, round, onScore]);

  useEffect(() => {
    if (bombTimer <= 0 && phase === 'playing') {
      setBoomPlayer(players[currentIdx]);
      setEliminated(e => new Set([...e, currentIdx]));
      setPhase('boom');
    }
  }, [bombTimer, phase, currentIdx, players]);

  const nextRound = () => {
    const alive = players.filter((_, i) => !eliminated.has(i));
    if (alive.length <= 1) { setPhase('done'); return; }
    setPhase('playing'); setBombTimer(100); setSpeed(s => s + 0.5); setRound(r => r + 1);
  };

  const alivePlayers = players.filter((_, i) => !eliminated.has(i));
  const winner = alivePlayers.length === 1 ? alivePlayers[0] : '';
  const dangerLevel = bombTimer < 30 ? 'critical' : bombTimer < 60 ? 'warning' : 'safe';

  if (phase === 'setup') {
    return (
      <Card className="border-2 border-dashed border-orange-500/30 bg-gradient-to-br from-orange-500/5 to-red-500/5">
        <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-lg"><Bomb className="h-5 w-5 text-orange-400" /> Batata Quente</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">A batata passa de jogador em jogador — quem estiver com ela quando explodir é eliminado!</p>
          <div className="space-y-2">
            <div className="flex gap-2"><Input value={newPlayer} onChange={e => setNewPlayer(e.target.value)} onKeyDown={e => e.key === 'Enter' && addPlayer()} placeholder="Nome do jogador..." /><Button onClick={addPlayer} variant="outline" size="icon">+</Button></div>
            <div className="flex flex-wrap gap-2">{players.map((p, i) => (
              <Badge key={i} variant="outline" className="gap-1">{p}<button onClick={() => setPlayers(pl => pl.filter((_, j) => j !== i))} className="ml-1 text-muted-foreground hover:text-red-400">×</button></Badge>
            ))}</div>
          </div>
          <Button onClick={startGame} disabled={players.length < 3} className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700" style={{ boxShadow: '0 0 16px rgba(249,115,22,0.4)' }}><Flame className="h-4 w-4 mr-2" /> Iniciar ({players.length} jogadores)</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-2xl bg-card border border-border p-3">
        <Badge variant="outline">Rodada {round}</Badge>
        <div className="flex items-center gap-2">
          <div className={`h-3 w-3 rounded-full ${dangerLevel === 'critical' ? 'bg-red-500 animate-pulse' : dangerLevel === 'warning' ? 'bg-orange-500' : 'bg-emerald-500'}`} />
          <span className={`font-mono text-sm font-bold ${dangerLevel === 'critical' ? 'text-red-400' : ''}`}>{bombTimer}%</span>
        </div>
        <Badge variant="outline">Velocidade {speed.toFixed(1)}x</Badge>
      </div>

      <div className="h-2 rounded-full bg-muted overflow-hidden"><motion.div className={`h-full transition-colors ${dangerLevel === 'critical' ? 'bg-red-500' : dangerLevel === 'warning' ? 'bg-orange-500' : 'bg-emerald-500'}`} animate={{ width: `${bombTimer}%` }} /></div>

      <div className="relative py-8">
        <div className="flex justify-center items-center gap-3 flex-wrap">
          {players.map((p, i) => {
            const isEliminated = eliminated.has(i);
            const isCurrent = i === currentIdx && phase === 'playing';
            return (
              <motion.div key={i} animate={isCurrent ? { scale: [1, 1.1, 1], rotate: [0, pulse ? 5 : -5, 0] } : {}} transition={{ duration: 0.2 }}
                className={`flex flex-col items-center gap-1 ${isEliminated ? 'opacity-30 line-through' : ''}`}>
                <div className={`h-14 w-14 rounded-full flex items-center justify-center text-lg font-bold transition-all ${isCurrent ? 'bg-gradient-to-br from-orange-500 to-red-600 text-white shadow-lg shadow-red-500/30' : 'bg-muted text-muted-foreground border border-border'}`}>
                  {isCurrent ? <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ repeat: Infinity, duration: 0.3 }}><Bomb className="h-6 w-6" /></motion.div> : p[0]}
                </div>
                <span className="text-[10px] font-bold max-w-[60px] truncate">{p}</span>
                {isEliminated && <span className="text-[8px] text-red-400">ELIMINADO</span>}
              </motion.div>
            );
          })}
        </div>
      </div>

      <p className="text-center text-sm text-muted-foreground">{alivePlayers.length} jogador(es) restantes</p>

      <AnimatePresence>
        {phase === 'boom' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/80 backdrop-blur flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 8 }} className="text-center">
              <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ repeat: 2, duration: 0.3 }}><span className="text-8xl">💥</span></motion.div>
              <h2 className="text-3xl font-bold text-red-400 mt-4">BOOM!</h2>
              <p className="text-xl text-white mt-2">{boomPlayer} foi eliminado!</p>
              <Button onClick={nextRound} className="mt-6 bg-gradient-to-r from-orange-500 to-red-600">{alivePlayers.length <= 1 ? 'Ver Resultado' : 'Próxima Rodada'}</Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {phase === 'done' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 bg-black/70 backdrop-blur flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.8, y: 30 }} animate={{ scale: 1, y: 0 }} className="w-full max-w-sm rounded-3xl bg-gradient-to-br from-orange-900 to-red-900 border border-white/10 p-6 text-center text-white">
              <Trophy className="h-12 w-12 text-yellow-400 mx-auto mb-3" />
              <h2 className="text-2xl font-bold mb-2">{winner} Sobreviveu!</h2>
              <p className="text-sm opacity-70 mb-4">Venceu após {round} rodada(s)</p>
              <div className="flex gap-2"><motion.div whileHover={{ scale: 1.03 }}><Button onClick={() => setPhase('setup')} variant="outline" className="flex-1 border-white/20 text-white">Novo Jogo</Button></motion.div><motion.div whileHover={{ scale: 1.03 }}><Button onClick={startGame} className="flex-1 bg-gradient-to-r from-orange-500 to-red-600" style={{ boxShadow: '0 0 16px rgba(249,115,22,0.4)' }}>Revanche</Button></motion.div></div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
