import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, RotateCcw, Trophy, Clock, Star, Swords, Grid3X3, LayoutGrid } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface MemoryChallengeProps { onScore?: (name: string, score: number) => void; liveCode?: string; }

type Difficulty = 'easy' | 'medium' | 'hard';
const GRID: Record<Difficulty, { cols: number; rows: number; pairs: number }> = {
  easy: { cols: 4, rows: 3, pairs: 6 }, medium: { cols: 4, rows: 4, pairs: 8 }, hard: { cols: 6, rows: 4, pairs: 12 },
};
const EMOJIS = ['🌟','🔥','💎','🎯','🎨','🎭','🎬','🎵','🏆','⚽','🏀','🎲','🃏','🧩','🪄','🎪'];

interface CardType { id: number; emoji: string; flipped: boolean; matched: boolean; }

export default function MemoryChallenge({ onScore, liveCode }: MemoryChallengeProps) {
  const [phase, setPhase] = useState<'setup' | 'playing' | 'done'>('setup');
  const [p1Name, setP1Name] = useState('Jogador 1');
  const [p2Name, setP2Name] = useState('Jogador 2');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [cards, setCards] = useState<CardType[]>([]);
  const [flipped, setFlipped] = useState<number[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState(1);
  const [scores, setScores] = useState([0, 0]);
  const [moves, setMoves] = useState([0, 0]);
  const [elapsed, setElapsed] = useState(0);
  const [canFlip, setCanFlip] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  const initGame = useCallback(() => {
    const g = GRID[difficulty];
    const selected = EMOJIS.slice(0, g.pairs);
    const deck = [...selected, ...selected].map((emoji, i) => ({ id: i, emoji, flipped: false, matched: false }));
    for (let i = deck.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [deck[i], deck[j]] = [deck[j], deck[i]]; }
    setCards(deck); setFlipped([]); setCurrentPlayer(1); setScores([0, 0]); setMoves([0, 0]);
    setElapsed(0); setCanFlip(true); setPhase('playing');
  }, [difficulty]);

  useEffect(() => {
    if (phase === 'playing') {
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
      return () => clearInterval(timerRef.current);
    }
  }, [phase]);

  const handleFlip = (id: number) => {
    if (!canFlip || cards[id].flipped || cards[id].matched || flipped.length >= 2) return;
    const newFlipped = [...flipped, id];
    const updated = cards.map(c => c.id === id ? { ...c, flipped: true } : c);
    setCards(updated); setFlipped(newFlipped);
    if (newFlipped.length === 2) {
      setCanFlip(false);
      const pi = currentPlayer - 1;
      setMoves(m => { const n = [...m]; n[pi]++; return n; });
      const [a, b] = newFlipped;
      if (updated[a].emoji === updated[b].emoji) {
        setTimeout(() => {
          setCards(prev => prev.map(c => (c.id === a || c.id === b) ? { ...c, matched: true } : c));
          setScores(s => { const n = [...s]; n[pi]++; return n; });
          setFlipped([]); setCanFlip(true);
        }, 500);
      } else {
        setTimeout(() => {
          setCards(prev => prev.map(c => (c.id === a || c.id === b) ? { ...c, flipped: false } : c));
          setFlipped([]); setCurrentPlayer(p => p === 1 ? 2 : 1); setCanFlip(true);
        }, 900);
      }
    }
  };

  useEffect(() => {
    if (phase !== 'playing') return;
    const totalPairs = GRID[difficulty].pairs;
    if (scores[0] + scores[1] >= totalPairs) {
      clearInterval(timerRef.current);
      setPhase('done');
      const winner = scores[0] > scores[1] ? p1Name : scores[1] > scores[0] ? p2Name : 'Empate';
      onScore?.(winner, Math.max(scores[0], scores[1]) * 100 - elapsed);
    }
  }, [scores, phase, difficulty, elapsed, onScore, p1Name, p2Name]);

  const fmt = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
  const g = GRID[difficulty];
  const winner = scores[0] > scores[1] ? p1Name : scores[1] > scores[0] ? p2Name : 'Empate';

  if (phase === 'setup') {
    return (
      <Card className="border-2 border-dashed border-primary/30 bg-gradient-to-br from-indigo-500/5 to-purple-500/5">
        <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-lg"><Brain className="h-5 w-5 text-indigo-400" /> Jogo da Memória VS</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-muted-foreground mb-1 block">Jogador 1 (Azul)</label><input value={p1Name} onChange={e => setP1Name(e.target.value)} className="w-full rounded-lg border border-blue-500/30 bg-blue-500/5 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50" /></div>
            <div><label className="text-xs text-muted-foreground mb-1 block">Jogador 2 (Rosa)</label><input value={p2Name} onChange={e => setP2Name(e.target.value)} className="w-full rounded-lg border border-pink-500/30 bg-pink-500/5 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/50" /></div>
          </div>
          <div><label className="text-xs text-muted-foreground mb-2 block">Dificuldade</label>
            <div className="flex gap-2">
              {([['easy','Fácil','Grid3X3','from-green-500 to-emerald-500'],['medium','Médio','LayoutGrid','from-amber-500 to-orange-500'],['hard','Difícil','LayoutGrid','from-red-500 to-rose-500']]).map(([k,l,ic,gr]) => (
                <button key={k} onClick={() => setDifficulty(k as Difficulty)} className={`flex-1 rounded-xl px-3 py-2 text-xs font-bold transition-all border-2 ${difficulty === k ? `bg-gradient-to-r ${gr} text-white border-transparent` : 'border-border bg-card text-muted-foreground hover:border-primary/40'}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          <Button onClick={initGame} className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"><Swords className="h-4 w-4 mr-2" /> Iniciar Duelo</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-2xl bg-card border border-border p-3">
        <div className={`flex items-center gap-2 ${currentPlayer === 1 ? 'scale-105' : 'opacity-70'} transition-transform`}>
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-xs font-bold text-white">{p1Name[0]}</div>
          <div><p className="text-sm font-bold">{p1Name}</p><p className="text-[10px] text-muted-foreground">{moves[0]} jogadas</p></div>
          <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">{scores[0]} pares</Badge>
        </div>
        <div className="flex flex-col items-center">
          <Clock className="h-4 w-4 text-muted-foreground" /><span className="font-mono text-sm font-bold">{fmt(elapsed)}</span>
        </div>
        <div className={`flex items-center gap-2 ${currentPlayer === 2 ? 'scale-105' : 'opacity-70'} transition-transform`}>
          <Badge className="bg-pink-500/20 text-pink-400 border-pink-500/30">{scores[1]} pares</Badge>
          <div className="text-right"><p className="text-sm font-bold">{p2Name}</p><p className="text-[10px] text-muted-foreground">{moves[1]} jogadas</p></div>
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center text-xs font-bold text-white">{p2Name[0]}</div>
        </div>
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={currentPlayer} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className={`text-center text-sm font-bold py-1 rounded-full ${currentPlayer === 1 ? 'bg-blue-500/10 text-blue-400' : 'bg-pink-500/10 text-pink-400'}`}>
          Vez de {currentPlayer === 1 ? p1Name : p2Name}
        </motion.div>
      </AnimatePresence>
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${g.cols}, 1fr)` }}>
        {cards.map((card) => (
          <motion.div key={card.id} whileTap={{ scale: 0.95 }} className={`aspect-square cursor-pointer perspective-500 ${card.matched ? 'opacity-60' : ''}`} onClick={() => handleFlip(card.id)}>
            <motion.div animate={{ rotateY: card.flipped || card.matched ? 180 : 0 }} transition={{ duration: 0.3 }} className="w-full h-full" style={{ transformStyle: 'preserve-3d' }}>
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-indigo-600/80 to-purple-600/80 border border-white/10 flex items-center justify-center backface-hidden">
                <Star className="h-5 w-5 text-white/40" />
              </div>
              <div className="absolute inset-0 rounded-xl bg-card border-2 border-primary/30 flex items-center justify-center text-2xl" style={{ transform: 'rotateY(180deg)', backfaceVisibility: 'hidden' }}>
                {card.emoji}
              </div>
            </motion.div>
          </motion.div>
        ))}
      </div>
      <AnimatePresence>
        {phase === 'done' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 bg-black/70 backdrop-blur flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.8, y: 30 }} animate={{ scale: 1, y: 0 }} className="w-full max-w-sm rounded-3xl bg-gradient-to-br from-indigo-900 to-purple-900 border border-white/10 p-6 text-center">
              <Trophy className="h-12 w-12 text-yellow-400 mx-auto mb-3" />
              <h2 className="text-2xl font-bold text-white mb-2">{winner === 'Empate' ? 'Empate!' : `${winner} Venceu!`}</h2>
              <p className="text-indigo-200 text-sm mb-1">{scores[0]} - {scores[1]} pares · {fmt(elapsed)}</p>
              <p className="text-indigo-300/60 text-xs mb-4">{moves[0]} vs {moves[1]} jogadas</p>
              <div className="flex gap-2">
                <Button onClick={() => setPhase('setup')} variant="outline" className="flex-1 border-white/20 text-white">Novo Jogo</Button>
                <Button onClick={initGame} className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-600">Revanche</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
