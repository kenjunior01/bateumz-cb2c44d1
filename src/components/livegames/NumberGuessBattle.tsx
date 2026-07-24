import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Hash, Swords, Trophy, ArrowUp, ArrowDown, Equal, RotateCcw, Target, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

interface NumberGuessBattleProps { onScore?: (name: string, score: number) => void; liveCode?: string; }

export default function NumberGuessBattle({ onScore, liveCode }: NumberGuessBattleProps) {
  const [phase, setPhase] = useState<'setup' | 'playing' | 'done'>('setup');
  const [p1Name, setP1Name] = useState('Jogador 1');
  const [p2Name, setP2Name] = useState('Jogador 2');
  const [secret, setSecret] = useState(0);
  const [p1Guesses, setP1Guesses] = useState<number[]>([]);
  const [p2Guesses, setP2Guesses] = useState<number[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState(1);
  const [p1Input, setP1Input] = useState('');
  const [p2Input, setP2Input] = useState('');
  const [lastHint1, setLastHint1] = useState<'up' | 'down' | 'exact' | null>(null);
  const [lastHint2, setLastHint2] = useState<'up' | 'down' | 'exact' | null>(null);
  const [winner, setWinner] = useState('');
  const [range, setRange] = useState<'1-50' | '1-100' | '1-200'>('1-100');
  const RANGE_MAP: Record<string, [number, number]> = { '1-50': [1, 50], '1-100': [1, 100], '1-200': [1, 200] };

  const startGame = useCallback(() => {
    const [min, max] = RANGE_MAP[range];
    setSecret(Math.floor(Math.random() * (max - min + 1)) + min);
    setP1Guesses([]); setP2Guesses([]); setCurrentPlayer(1);
    setP1Input(''); setP2Input(''); setLastHint1(null); setLastHint2(null);
    setWinner(''); setPhase('playing');
  }, [range]);

  const getHint = (guess: number): 'up' | 'down' | 'exact' => {
    if (guess === secret) return 'exact';
    return guess < secret ? 'up' : 'down';
  };

  const handleGuess = (player: 1 | 2, val: string) => {
    const num = parseInt(val);
    if (isNaN(num)) return;
    const hint = getHint(num);
    if (player === 1) {
      setP1Guesses(g => [...g, num]); setLastHint1(hint); setP1Input('');
    } else {
      setP2Guesses(g => [...g, num]); setLastHint2(hint); setP2Input('');
    }
    if (hint === 'exact') {
      const name = player === 1 ? p1Name : p2Name;
      setWinner(name); setPhase('done');
      onScore?.(name, 100 - (player === 1 ? p1Guesses : p2Guesses).length * 10);
    } else {
      setCurrentPlayer(p => p === 1 ? 2 : 1);
    }
  };

  const HintIcon = ({ hint }: { hint: 'up' | 'down' | 'exact' | null }) => {
    if (!hint) return null;
    if (hint === 'up') return <ArrowUp className="h-4 w-4 text-cyan-400" />;
    if (hint === 'down') return <ArrowDown className="h-4 w-4 text-orange-400" />;
    return <Target className="h-4 w-4 text-emerald-400" />;
  };

  if (phase === 'setup') {
    return (
      <Card className="border-2 border-dashed border-violet-500/30 bg-gradient-to-br from-violet-500/5 to-fuchsia-500/5">
        <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-lg"><Hash className="h-5 w-5 text-violet-400" /> Adivinhe o Número VS</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-muted-foreground mb-1 block">Jogador 1</label><input value={p1Name} onChange={e => setP1Name(e.target.value)} className="w-full rounded-lg border border-cyan-500/30 bg-cyan-500/5 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50" /></div>
            <div><label className="text-xs text-muted-foreground mb-1 block">Jogador 2</label><input value={p2Name} onChange={e => setP2Name(e.target.value)} className="w-full rounded-lg border border-fuchsia-500/30 bg-fuchsia-500/5 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500/50" /></div>
          </div>
          <div><label className="text-xs text-muted-foreground mb-2 block">Faixa do número secreto</label>
            <div className="flex gap-2">
              {(['1-50','1-100','1-200'] as const).map(r => (
                <button key={r} onClick={() => setRange(r)} className={`flex-1 rounded-xl px-3 py-2 text-xs font-bold border-2 transition-all ${range === r ? 'bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white border-transparent' : 'border-border bg-card text-muted-foreground'}`}>{r}</button>
              ))}
            </div>
          </div>
          <Button onClick={startGame} className="w-full bg-gradient-to-r from-violet-500 to-fuchsia-600"><Swords className="h-4 w-4 mr-2" /> Iniciar Duelo</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Turn indicator */}
      <div className="text-center">
        <AnimatePresence mode="wait">
          <motion.div key={currentPlayer} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold ${currentPlayer === 1 ? 'bg-cyan-500/10 text-cyan-400' : 'bg-fuchsia-500/10 text-fuchsia-400'}`}>
            Vez de {currentPlayer === 1 ? p1Name : p2Name}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Player 1 */}
        <div className={`rounded-2xl border-2 p-4 space-y-3 transition-all ${currentPlayer === 1 ? 'border-cyan-500/50 bg-cyan-500/5' : 'border-border bg-card opacity-60'}`}>
          <div className="flex items-center justify-between">
            <span className="font-bold text-sm">{p1Name}</span>
            <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30">{p1Guesses.length} tentativas</Badge>
          </div>
          <div className="flex gap-2">
            <input value={currentPlayer === 1 ? p1Input : ''} onChange={e => setP1Input(e.target.value)} onKeyDown={e => e.key === 'Enter' && currentPlayer === 1 && handleGuess(1, p1Input)} placeholder="Número..." disabled={currentPlayer !== 1} className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 disabled:opacity-50" />
            <Button onClick={() => handleGuess(1, p1Input)} disabled={currentPlayer !== 1} size="sm" className="bg-cyan-500 hover:bg-cyan-600">OK</Button>
          </div>
          {lastHint1 && <div className="flex items-center gap-1 text-xs"><HintIcon hint={lastHint1} /><span>{lastHint1 === 'up' ? 'É MAIOR ↑' : lastHint1 === 'down' ? 'É MENOR ↓' : 'ACERTOU!'}</span></div>}
          {p1Guesses.length > 0 && <div className="flex flex-wrap gap-1">{p1Guesses.map((g, i) => <Badge key={i} variant="outline" className="text-[10px]">{g}</Badge>)}</div>}
        </div>

        {/* Player 2 */}
        <div className={`rounded-2xl border-2 p-4 space-y-3 transition-all ${currentPlayer === 2 ? 'border-fuchsia-500/50 bg-fuchsia-500/5' : 'border-border bg-card opacity-60'}`}>
          <div className="flex items-center justify-between">
            <span className="font-bold text-sm">{p2Name}</span>
            <Badge className="bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/30">{p2Guesses.length} tentativas</Badge>
          </div>
          <div className="flex gap-2">
            <input value={currentPlayer === 2 ? p2Input : ''} onChange={e => setP2Input(e.target.value)} onKeyDown={e => e.key === 'Enter' && currentPlayer === 2 && handleGuess(2, p2Input)} placeholder="Número..." disabled={currentPlayer !== 2} className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500/50 disabled:opacity-50" />
            <Button onClick={() => handleGuess(2, p2Input)} disabled={currentPlayer !== 2} size="sm" className="bg-fuchsia-500 hover:bg-fuchsia-600">OK</Button>
          </div>
          {lastHint2 && <div className="flex items-center gap-1 text-xs"><HintIcon hint={lastHint2} /><span>{lastHint2 === 'up' ? 'É MAIOR ↑' : lastHint2 === 'down' ? 'É MENOR ↓' : 'ACERTOU!'}</span></div>}
          {p2Guesses.length > 0 && <div className="flex flex-wrap gap-1">{p2Guesses.map((g, i) => <Badge key={i} variant="outline" className="text-[10px]">{g}</Badge>)}</div>}
        </div>
      </div>

      {/* Winner */}
      <AnimatePresence>
        {phase === 'done' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 bg-black/70 backdrop-blur flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.8, y: 30 }} animate={{ scale: 1, y: 0 }} className="w-full max-w-sm rounded-3xl bg-gradient-to-br from-violet-900 to-fuchsia-900 border border-white/10 p-6 text-center text-white">
              <Trophy className="h-12 w-12 text-yellow-400 mx-auto mb-3" />
              <h2 className="text-2xl font-bold mb-2">{winner} Acertou!</h2>
              <p className="text-4xl font-bold text-white mb-1">O número era {secret}</p>
              <p className="text-sm opacity-70 mb-4">{p1Name}: {p1Guesses.length} vs {p2Name}: {p2Guesses.length} tentativas</p>
              <div className="flex gap-2"><Button onClick={() => setPhase('setup')} variant="outline" className="flex-1 border-white/20 text-white">Sair</Button><Button onClick={startGame} className="flex-1 bg-gradient-to-r from-violet-500 to-fuchsia-600">Revanche</Button></div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}