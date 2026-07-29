import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shuffle, Zap, Trophy, RotateCcw, Timer, AlertTriangle, Star } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface ChaosChallengeProps { onScore?: (name: string, score: number) => void; liveCode?: string; }

const CHALLENGES = [
  { text: 'Fale o nome de 5 capitais em 10s!', time: 10, type: 'mental' as const },
  { text: 'Fale 3 cores em inglês!', time: 8, type: 'mental' as const },
  { text: 'Conte de 10 a 1 de trás pra frente!', time: 8, type: 'mental' as const },
  { text: 'Nomeie 4 animais que voam!', time: 8, type: 'mental' as const },
  { text: 'Diga 5 frutas em 10 segundos!', time: 10, type: 'mental' as const },
  { text: 'Faça 5 polichinelos!', time: 15, type: 'fisico' as const },
  { text: 'Fique numa perna só por 10s!', time: 12, type: 'fisico' as const },
  { text: 'Gire 3 vezes rápido e tente andar reto!', time: 15, type: 'fisico' as const },
  { text: 'Faça 10 agachamentos!', time: 20, type: 'fisico' as const },
  { text: 'Mantenha os olhos fechados por 15s!', time: 15, type: 'fisico' as const },
  { text: 'Cante o refrão de uma música!', time: 15, type: 'talento' as const },
  { text: 'Fale rápido "o rato roeu a roupa do rei de Roma" 3x!', time: 12, type: 'talento' as const },
  { text: 'Faça uma careta engraçada e segure por 10s!', time: 10, type: 'talento' as const },
  { text: 'Imite um apresentador de TV!', time: 15, type: 'talento' as const },
  { text: 'Fale em sotaque estrangeiro por 15s!', time: 15, type: 'talento' as const },
  { text: 'Faça mímica de um filme para o público adivinhar!', time: 30, type: 'talento' as const },
  { text: 'Crie uma rima improvisada agora!', time: 10, type: 'talento' as const },
  { text: 'Resolva: 15 x 7 sem calculadora!', time: 12, type: 'mental' as const },
  { text: 'Diga o alfabeto de trás pra frente!', time: 20, type: 'mental' as const },
  { text: 'Conte até 50 em 15 segundos!', time: 15, type: 'mental' as const },
];

const ROUNDS = 8;

export default function ChaosChallenge({ onScore, liveCode }: ChaosChallengeProps) {
  const [phase, setPhase] = useState<'setup' | 'playing' | 'roundResult' | 'done'>('setup');
  const [playerName, setPlayerName] = useState('Jogador');
  const [challenges, setChallenges] = useState<typeof CHALLENGES>([]);
  const [qIdx, setQIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [score, setScore] = useState(0);
  const [results, setResults] = useState<{ challenge: string; completed: boolean; time: number }[]>([]);
  const [succeeded, setSucceeded] = useState<boolean | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  const initGame = useCallback(() => {
    const shuffled = [...CHALLENGES].sort(() => Math.random() - 0.5).slice(0, ROUNDS);
    setChallenges(shuffled); setQIdx(0); setScore(0); setResults([]);
    setTimeLeft(shuffled[0].time); setPhase('playing'); setSucceeded(null);
  }, []);

  useEffect(() => {
    if (phase !== 'playing' || succeeded !== null) return;
    if (timeLeft <= 0) {
      clearInterval(timerRef.current);
      setSucceeded(false);
      setResults(r => [...r, { challenge: challenges[qIdx].text, completed: false, time: challenges[qIdx].time }]);
      return;
    }
    timerRef.current = setInterval(() => setTimeLeft(t => t - 1), 1000);
    return () => clearInterval(timerRef.current);
  }, [phase, timeLeft, succeeded, challenges, qIdx]);

  const markSuccess = () => {
    if (succeeded !== null) return;
    clearInterval(timerRef.current);
    const c = challenges[qIdx];
    const pts = 10 + timeLeft * 2;
    setScore(s => s + pts); setSucceeded(true);
    setResults(r => [...r, { challenge: c.text, completed: true, time: c.time - timeLeft }]);
  };

  const markFail = () => {
    if (succeeded !== null) return;
    clearInterval(timerRef.current);
    setSucceeded(false);
    setResults(r => [...r, { challenge: challenges[qIdx].text, completed: false, time: challenges[qIdx].time }]);
  };

  const nextRound = () => {
    if (qIdx + 1 >= challenges.length) { setPhase('done'); onScore?.(playerName, score); return; }
    setQIdx(i => i + 1); setTimeLeft(challenges[qIdx + 1].time); setSucceeded(null);
  };

  const typeColor: Record<string, string> = { mental: 'from-blue-500 to-cyan-500', fisico: 'from-orange-500 to-red-500', talento: 'from-purple-500 to-pink-500' };
  const typeLabel: Record<string, string> = { mental: 'Mental', fisico: 'Físico', talento: 'Talento' };

  if (phase === 'setup') {
    return (
      <Card className="border-2 border-dashed border-rose-500/30 bg-gradient-to-br from-rose-500/5 to-pink-500/5">
        <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-lg"><Shuffle className="h-5 w-5 text-rose-400" /> Desafio Caótico</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">Desafios aleatórios contra o relógio! Complete o máximo possível em {ROUNDS} rodadas. Tipos: mental, físico e talento.</p>
          <div><label className="text-xs text-muted-foreground mb-1 block">Nome do Jogador</label><input value={playerName} onChange={e => setPlayerName(e.target.value)} className="w-full rounded-lg border border-rose-500/30 bg-rose-500/5 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/50" /></div>
          <Button onClick={initGame} className="w-full bg-gradient-to-r from-rose-500 to-pink-600"><Zap className="h-4 w-4 mr-2" /> Iniciar Caos!</Button>
        </CardContent>
      </Card>
    );
  }

  const c = challenges[qIdx];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-2xl bg-card border border-border p-3">
        <div className="flex items-center gap-2"><Star className="h-4 w-4 text-yellow-400" /><span className="font-bold">{score} pts</span></div>
        <span className="text-xs text-muted-foreground">{qIdx + 1}/{challenges.length}</span>
      </div>

      <AnimatePresence mode="wait">
        {c && succeeded === null && (
          <motion.div key={qIdx} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            <Badge className={`bg-gradient-to-r ${typeColor[c.type]} text-white border-0`}>{typeLabel[c.type]}</Badge>
            <div className={`rounded-2xl p-6 text-center bg-gradient-to-br ${typeColor[c.type]}/10 border-2 border-current/20`}>
              <p className="text-xl font-bold mb-4">{c.text}</p>
              <div className={`inline-flex items-center gap-2 px-6 py-3 rounded-full text-2xl font-mono font-bold ${timeLeft <= 5 ? 'bg-red-500/20 text-red-400 animate-pulse' : 'bg-white/10 text-white'}`}>
                <Timer className="h-6 w-6" />{timeLeft}s
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Button onClick={markSuccess} className="bg-gradient-to-r from-emerald-500 to-green-600 py-6 text-lg font-bold">Conseguiu!</Button>
              <Button onClick={markFail} variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-500/10 py-6 text-lg font-bold">Falhou!</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {succeeded !== null && (
          <motion.div key="result" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className={`rounded-2xl p-4 text-center ${succeeded ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-red-500/10 border border-red-500/30'}`}>
              <p className="text-2xl mb-1">{succeeded ? '✅' : '❌'}</p>
              <p className="font-bold">{succeeded ? `+${10 + (c.time - timeLeft) * 2} pontos!` : 'Sem pontos nesta rodada'}</p>
            </div>
            <Button onClick={nextRound} className="w-full bg-gradient-to-r from-rose-500 to-pink-600">{qIdx + 1 >= challenges.length ? 'Ver Resultado' : 'Próximo Desafio'}</Button>
          </motion.div>
        )}
      </AnimatePresence>

      {results.length > 0 && succeeded !== null && (
        <div className="flex gap-1 flex-wrap justify-center">
          {results.map((r, i) => <div key={i} className={`h-2.5 w-2.5 rounded-full ${r.completed ? 'bg-emerald-500' : 'bg-red-500'}`} />)}
        </div>
      )}

      <AnimatePresence>
        {phase === 'done' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 bg-black/70 backdrop-blur flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.8, y: 30 }} animate={{ scale: 1, y: 0 }} className="w-full max-w-sm rounded-3xl bg-gradient-to-br from-rose-900 to-pink-900 border border-white/10 p-6 text-center text-white">
              <Trophy className="h-12 w-12 text-yellow-400 mx-auto mb-3" />
              <h2 className="text-2xl font-bold mb-1">Resultado Final</h2>
              <p className="text-4xl font-bold text-yellow-400 mb-1">{score} pts</p>
              <p className="text-sm opacity-70 mb-4">{results.filter(r => r.completed).length}/{results.length} desafios completados</p>
              <div className="flex gap-2"><Button onClick={() => setPhase('setup')} variant="outline" className="flex-1 border-white/20 text-white">Sair</Button><Button onClick={initGame} className="flex-1 bg-gradient-to-r from-rose-500 to-pink-600">Jogar Novamente</Button></div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}