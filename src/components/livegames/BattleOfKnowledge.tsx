import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Swords, Trophy, Clock, Zap, Check, X, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

interface BattleOfKnowledgeProps { onScore?: (name: string, score: number) => void; liveCode?: string; }

interface Question {
  q: string;
  options: string[];
  correct: number;
  category: string;
}

const QUESTIONS: Question[] = [
  { q: 'Qual é o maior país do mundo em área territorial?', options: ['Canadá', 'Rússia', 'China', 'EUA'], correct: 1, category: 'Geografia' },
  { q: 'Quantos ossos tem o corpo humano adulto?', options: ['186', '206', '226', '256'], correct: 1, category: 'Ciência' },
  { q: 'Quem pintou a Mona Lisa?', options: ['Michelangelo', 'Da Vinci', 'Rafael', 'Picasso'], correct: 1, category: 'Arte' },
  { q: 'Qual é o rio mais longo do mundo?', options: ['Amazonas', 'Nilo', 'Mississipi', 'Yangtzé'], correct: 1, category: 'Geografia' },
  { q: 'Em que ano o Brasil foi descoberto?', options: ['1492', '1500', '1498', '1510'], correct: 1, category: 'História' },
  { q: 'Qual o elemento químico com símbolo O?', options: ['Ouro', 'Oxigênio', 'Ósmio', 'Oligofrênio'], correct: 1, category: 'Ciência' },
  { q: 'Quantos estados tem o Brasil?', options: ['24', '26', '27', '28'], correct: 1, category: 'Geografia' },
  { q: 'Quem escreveu "Dom Casmurro"?', options: ['José de Alencar', 'Machado de Assis', 'Guimarães Rosa', 'Clarice Lispector'], correct: 1, category: 'Literatura' },
  { q: 'Qual é o planeta mais próximo do Sol?', options: ['Vênus', 'Mercúrio', 'Marte', 'Terra'], correct: 1, category: 'Ciência' },
  { q: 'Qual a capital da França?', options: ['Londres', 'Berlim', 'Paris', 'Madri'], correct: 2, category: 'Geografia' },
  { q: 'Quem descobriu o Brasil?', options: ['Colombo', 'Pedro Álvares Cabral', 'Vasco da Gama', 'Américo Vespúcio'], correct: 1, category: 'História' },
  { q: 'Qual o maior oceano do mundo?', options: ['Atlântico', 'Índico', 'Pacífico', 'Ártico'], correct: 2, category: 'Geografia' },
  { q: 'Em que ano caiu o Muro de Berlim?', options: ['1987', '1989', '1991', '1985'], correct: 1, category: 'História' },
  { q: 'Quantos jogadores tem um time de futebol em campo?', options: ['9', '10', '11', '12'], correct: 2, category: 'Esporte' },
  { q: 'Qual é a língua mais falada no mundo?', options: ['Inglês', 'Espanhol', 'Mandarim', 'Hindi'], correct: 2, category: 'Cultura' },
  { q: 'Quem cantou "Billie Jean"?', options: ['Prince', 'Michael Jackson', 'Stevie Wonder', 'James Brown'], correct: 1, category: 'Música' },
  { q: 'Qual o metal mais caro do mundo?', options: ['Ouro', 'Platina', 'Ródio', 'Irídio'], correct: 2, category: 'Ciência' },
  { q: 'Quantos continentes existem?', options: ['5', '6', '7', '8'], correct: 2, category: 'Geografia' },
  { q: 'Qual filme ganhou o Oscar de melhor filme em 1994?', options: ['Pulp Fiction', 'Forrest Gump', 'O Rei Leão', 'A Lista de Schindler'], correct: 1, category: 'Cinema' },
  { q: 'Qual animal é o mais rápido do mundo?', options: ['Leão', 'Falcão-peregrino', 'Guepardo', 'Tubarão'], correct: 1, category: 'Ciência' },
];

const ROUNDS = 10;
const TIME_PER_Q = 15;

export default function BattleOfKnowledge({ onScore, liveCode }: BattleOfKnowledgeProps) {
  const [phase, setPhase] = useState<'setup' | 'countdown' | 'playing' | 'result' | 'done'>('setup');
  const [p1Name, setP1Name] = useState('Jogador 1');
  const [p2Name, setP2Name] = useState('Jogador 2');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [qIdx, setQIdx] = useState(0);
  const [p1Answer, setP1Answer] = useState<number | null>(null);
  const [p2Answer, setP2Answer] = useState<number | null>(null);
  const [scores, setScores] = useState([0, 0]);
  const [streaks, setStreaks] = useState([0, 0]);
  const [timeLeft, setTimeLeft] = useState(TIME_PER_Q);
  const [countdown, setCountdown] = useState(3);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const [showAnswer, setShowAnswer] = useState(false);

  const initGame = useCallback(() => {
    const shuffled = [...QUESTIONS].sort(() => Math.random() - 0.5).slice(0, ROUNDS);
    setQuestions(shuffled); setQIdx(0); setP1Answer(null); setP2Answer(null);
    setScores([0, 0]); setStreaks([0, 0]); setTimeLeft(TIME_PER_Q); setShowAnswer(false);
    setPhase('countdown'); setCountdown(3);
  }, []);

  useEffect(() => {
    if (phase === 'countdown') {
      if (countdown <= 0) { setPhase('playing'); return; }
      const t = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [phase, countdown]);

  useEffect(() => {
    if (phase !== 'playing' || showAnswer) return;
    if (timeLeft <= 0) {
      setShowAnswer(true);
      clearInterval(timerRef.current);
      setTimeout(() => nextQuestion(), 2000);
      return;
    }
    timerRef.current = setInterval(() => setTimeLeft(t => t - 1), 1000);
    return () => clearInterval(timerRef.current);
  }, [phase, timeLeft, showAnswer, qIdx]);

  const answer = (player: 1 | 2, idx: number) => {
    if (showAnswer) return;
    if (player === 1 && p1Answer === null) setP1Answer(idx);
    if (player === 2 && p2Answer === null) setP2Answer(idx);
    if ((player === 1 || p1Answer !== null) && (player === 2 || p2Answer !== null) && p1Answer !== null && p2Answer !== null) {
      setShowAnswer(true);
      clearInterval(timerRef.current);
      setTimeout(() => nextQuestion(), 2000);
    }
  };

  const nextQuestion = () => {
    const q = questions[qIdx];
    let s = [...scores], st = [...streaks];
    if (p1Answer === q.correct) { s[0] += 10 + st[0] * 2; st[0]++; }
    else { st[0] = 0; }
    if (p2Answer === q.correct) { s[1] += 10 + st[1] * 2; st[1]++; }
    else { st[1] = 0; }
    setScores(s); setStreaks(st);
    if (qIdx + 1 >= questions.length) {
      setPhase('done');
      const winner = s[0] > s[1] ? p1Name : s[1] > s[0] ? p2Name : 'Empate';
      onScore?.(winner, Math.max(s[0], s[1]));
    } else {
      setQIdx(i => i + 1); setP1Answer(null); setP2Answer(null); setTimeLeft(TIME_PER_Q); setShowAnswer(false);
    }
  };

  const winner = scores[0] > scores[1] ? p1Name : scores[1] > scores[0] ? p2Name : 'Empate';

  if (phase === 'setup') {
    return (
      <Card className="border-2 border-dashed border-cyan-500/30 bg-gradient-to-br from-cyan-500/5 to-blue-500/5">
        <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-lg"><Brain className="h-5 w-5 text-cyan-400" /> Batalha de Conhecimentos VS</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-muted-foreground mb-1 block">Jogador 1</label><input value={p1Name} onChange={e => setP1Name(e.target.value)} className="w-full rounded-lg border border-cyan-500/30 bg-cyan-500/5 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50" /></div>
            <div><label className="text-xs text-muted-foreground mb-1 block">Jogador 2</label><input value={p2Name} onChange={e => setP2Name(e.target.value)} className="w-full rounded-lg border border-purple-500/30 bg-purple-500/5 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50" /></div>
          </div>
          <p className="text-xs text-muted-foreground">{ROUNDS} perguntas · {TIME_PER_Q}s cada · Bônus de streak!</p>
          <Button onClick={initGame} className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700"><Swords className="h-4 w-4 mr-2" /> Iniciar Batalha</Button>
        </CardContent>
      </Card>
    );
  }

  const q = questions[qIdx];

  return (
    <div className="space-y-4">
      {/* Score bar */}
      <div className="flex items-center justify-between rounded-2xl bg-card border border-border p-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-xs font-bold text-white">{p1Name[0]}</div>
          <div><p className="text-sm font-bold">{p1Name}</p>{streaks[0] >= 2 && <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-[10px]">🔥 {streaks[0]}x</Badge>}</div>
        </div>
        <div className="text-center"><span className="font-mono text-lg font-bold text-primary">{scores[0]}</span><span className="text-muted-foreground mx-2">vs</span><span className="font-mono text-lg font-bold text-purple-400">{scores[1]}</span></div>
        <div className="flex items-center gap-2">
          {streaks[1] >= 2 && <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-[10px]">🔥 {streaks[1]}x</Badge>}
          <div><p className="text-sm font-bold">{p2Name}</p></div>
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-xs font-bold text-white">{p2Name[0]}</div>
        </div>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-2"><span className="text-xs text-muted-foreground">Pergunta {qIdx + 1}/{questions.length}</span><div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden"><motion.div className="h-full bg-gradient-to-r from-cyan-500 to-purple-500" animate={{ width: `${((qIdx + 1) / questions.length) * 100}%` }} /></div></div>

      {/* Timer */}
      <div className="flex justify-center"><div className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-bold ${timeLeft <= 5 ? 'bg-red-500/20 text-red-400 animate-pulse' : 'bg-muted text-foreground'}`}><Clock className="h-4 w-4" />{timeLeft}s</div></div>

      <AnimatePresence mode="wait">
        {phase === 'countdown' ? (
          <motion.div key="cd" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="text-center py-12">
            <motion.p key={countdown} initial={{ scale: 2, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-7xl font-bold text-primary">{countdown > 0 ? countdown : 'GO!'}</motion.p>
          </motion.div>
        ) : q ? (
          <motion.div key={qIdx} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="space-y-4">
            <Badge variant="outline" className="text-xs">{q.category}</Badge>
            <h3 className="text-lg font-bold">{q.q}</h3>
            {/* P1 options (top) */}
            <div className="space-y-2">
              <p className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider">{p1Name}</p>
              <div className="grid grid-cols-2 gap-2">
                {q.options.map((opt, i) => {
                  let cls = 'border-border bg-card hover:border-cyan-500/40';
                  if (showAnswer && i === q.correct) cls = 'border-emerald-500 bg-emerald-500/10';
                  else if (showAnswer && p1Answer === i && i !== q.correct) cls = 'border-red-500 bg-red-500/10';
                  else if (p1Answer === i) cls = 'border-cyan-500 bg-cyan-500/10';
                  return (<button key={i} onClick={() => answer(1, i)} disabled={p1Answer !== null} className={`rounded-xl border-2 px-3 py-2.5 text-sm text-left transition-all flex items-center gap-2 ${cls} ${p1Answer !== null ? 'cursor-default' : ''}`}>
                    {showAnswer && i === q.correct && <Check className="h-4 w-4 text-emerald-400 flex-shrink-0" />}
                    {showAnswer && p1Answer === i && i !== q.correct && <X className="h-4 w-4 text-red-400 flex-shrink-0" />}
                    <span className="truncate">{opt}</span>
                  </button>);
                })}
              </div>
            </div>
            <div className="border-t border-border" />
            {/* P2 options (bottom) */}
            <div className="space-y-2">
              <p className="text-[10px] text-purple-400 font-bold uppercase tracking-wider">{p2Name}</p>
              <div className="grid grid-cols-2 gap-2">
                {q.options.map((opt, i) => {
                  let cls = 'border-border bg-card hover:border-purple-500/40';
                  if (showAnswer && i === q.correct) cls = 'border-emerald-500 bg-emerald-500/10';
                  else if (showAnswer && p2Answer === i && i !== q.correct) cls = 'border-red-500 bg-red-500/10';
                  else if (p2Answer === i) cls = 'border-purple-500 bg-purple-500/10';
                  return (<button key={i} onClick={() => answer(2, i)} disabled={p2Answer !== null} className={`rounded-xl border-2 px-3 py-2.5 text-sm text-left transition-all flex items-center gap-2 ${cls} ${p2Answer !== null ? 'cursor-default' : ''}`}>
                    {showAnswer && i === q.correct && <Check className="h-4 w-4 text-emerald-400 flex-shrink-0" />}
                    {showAnswer && p2Answer === i && i !== q.correct && <X className="h-4 w-4 text-red-400 flex-shrink-0" />}
                    <span className="truncate">{opt}</span>
                  </button>);
                })}
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Winner */}
      <AnimatePresence>
        {phase === 'done' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 bg-black/70 backdrop-blur flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.8, y: 30 }} animate={{ scale: 1, y: 0 }} className="w-full max-w-sm rounded-3xl bg-gradient-to-br from-cyan-900 to-purple-900 border border-white/10 p-6 text-center">
              <Trophy className="h-12 w-12 text-yellow-400 mx-auto mb-3" />
              <h2 className="text-2xl font-bold text-white mb-1">{winner === 'Empate' ? 'Empate!' : `${winner} Venceu!`}</h2>
              <p className="text-3xl font-bold text-white mb-1">{scores[0]} <span className="text-sm opacity-60">vs</span> {scores[1]}</p>
              <p className="text-cyan-200/60 text-xs mb-4">{ROUNDS} perguntas respondidas</p>
              <div className="flex gap-2"><Button onClick={() => setPhase('setup')} variant="outline" className="flex-1 border-white/20 text-white">Sair</Button><Button onClick={initGame} className="flex-1 bg-gradient-to-r from-cyan-500 to-purple-600">Revanche</Button></div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
