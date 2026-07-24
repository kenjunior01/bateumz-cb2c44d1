import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SmilePlus, Lightbulb, RotateCcw, Trophy, Clock, Star, Eye, EyeOff } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface GuessTheEmojiProps { onScore?: (name: string, score: number) => void; liveCode?: string; }

interface EmojiPuzzle {
  emojis: string;
  answer: string;
  hint: string;
  category: string;
}

const PUZZLES: EmojiPuzzle[] = [
  { emojis: '🇧🇷⚽🏆', answer: 'Seleção Brasileira', hint: 'Time nacional de futebol', category: 'Esporte' },
  { emojis: '📱💬📱', answer: 'WhatsApp', hint: 'App de mensagens', category: 'Tecnologia' },
  { emojis: '🍎💻', answer: 'Apple', hint: 'Empresa de tecnologia', category: 'Tecnologia' },
  { emojis: '🎸🎤🇧🇷', answer: 'Rock in Rio', hint: 'Festival de música', category: 'Música' },
  { emojis: '☕🇧🇷', answer: 'Cafezinho', hint: 'Bebida brasileira', category: 'Cultura' },
  { emojis: '🏖️🌊☀️', answer: 'Praia', hint: 'Lugar de férias', category: 'Lazer' },
  { emojis: '🍕🇮🇹', answer: 'Pizza Italiana', hint: 'Comida italiana', category: 'Comida' },
  { emojis: '🎬🍿', answer: 'Cinema', hint: 'Lugar para ver filmes', category: 'Lazer' },
  { emojis: '🏋️💪', answer: 'Academia', hint: 'Lugar de treino', category: 'Esporte' },
  { emojis: '🎮🕹️', answer: 'Videogame', hint: 'Entretenimento eletrônico', category: 'Tecnologia' },
  { emojis: '🐶🏠', answer: 'Cachorro', hint: 'Melhor amigo do homem', category: 'Animais' },
  { emojis: '✈️🌍', answer: 'Viagem', hint: 'Conhecer novos lugares', category: 'Lazer' },
  { emojis: '🌙⭐😴', answer: 'Dormir', hint: 'Descansar à noite', category: 'Vida' },
  { emojis: '🎂🎉', answer: 'Aniversário', hint: 'Comemoração especial', category: 'Vida' },
  { emojis: '❤️💕💘', answer: 'Amor', hint: 'Sentimento bonito', category: 'Vida' },
  { emojis: '📱📸✨', answer: 'Instagram', hint: 'Rede social de fotos', category: 'Tecnologia' },
  { emojis: '🚗🏎️💨', answer: 'Corrida', hint: 'Competição de velocidade', category: 'Esporte' },
  { emojis: '📚🎓', answer: 'Faculdade', hint: 'Ensino superior', category: 'Educação' },
  { emojis: '🎵🎶🎤', answer: 'Cantar', hint: 'Expressão musical', category: 'Música' },
  { emojis: '🍢🇯🇵', answer: 'Sushi', hint: 'Comida japonesa', category: 'Comida' },
  { emojis: '🎄🎁🎅', answer: 'Natal', hint: 'Festa de fim de ano', category: 'Cultura' },
  { emojis: '💀👻🎃', answer: 'Halloween', hint: 'Dia das bruxas', category: 'Cultura' },
  { emojis: '⚽🥅🇦🇷', answer: 'Messi', hint: 'Jogador argentino', category: 'Esporte' },
  { emojis: '🎶💃🕺', answer: 'Dançar', hint: 'Movimento com música', category: 'Arte' },
];

const ROUNDS = 10;
const TIME_HINT = 8;

export default function GuessTheEmoji({ onScore, liveCode }: GuessTheEmojiProps) {
  const [phase, setPhase] = useState<'setup' | 'playing' | 'done'>('setup');
  const [puzzles, setPuzzles] = useState<EmojiPuzzle[]>([]);
  const [qIdx, setQIdx] = useState(0);
  const [guess, setGuess] = useState('');
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [results, setResults] = useState<{ puzzle: EmojiPuzzle; correct: boolean }[]>([]);
  const [timeLeft, setTimeLeft] = useState(TIME_HINT);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  const initGame = useCallback((playerName: string) => {
    const shuffled = [...PUZZLES].sort(() => Math.random() - 0.5).slice(0, ROUNDS);
    setPuzzles(shuffled); setQIdx(0); setScore(0); setStreak(0);
    setResults([]); setPhase('playing');
  }, []);

  useEffect(() => {
    if (phase !== 'playing' || revealed) return;
    if (!showHint) return;
    if (timeLeft <= 0) { setRevealed(true); clearInterval(timerRef.current); setTimeout(() => advance(), 2000); return; }
    timerRef.current = setInterval(() => setTimeLeft(t => t - 1), 1000);
    return () => clearInterval(timerRef.current);
  }, [phase, showHint, timeLeft, revealed, qIdx]);

  const advance = () => {
    if (qIdx + 1 >= puzzles.length) { setPhase('done'); return; }
    setQIdx(i => i + 1); setGuess(''); setShowHint(false); setRevealed(false); setTimeLeft(TIME_HINT);
  };

  const submitGuess = () => {
    if (!guess.trim() || revealed) return;
    const p = puzzles[qIdx];
    const correct = guess.trim().toLowerCase() === p.answer.toLowerCase();
    if (correct) { const pts = 10 + streak * 3; setScore(s => s + pts); setStreak(s => s + 1); }
    else setStreak(0);
    setResults(r => [...r, { puzzle: p, correct }]);
    setRevealed(true);
    onScore?.(correct ? 'Jogador' : '', correct ? 10 : 0);
    setTimeout(() => advance(), 2500);
  };

  if (phase === 'setup') {
    return (
      <Card className="border-2 border-dashed border-yellow-500/30 bg-gradient-to-br from-yellow-500/5 to-amber-500/5">
        <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-lg"><SmilePlus className="h-5 w-5 text-yellow-400" /> Adivinhe o Emoji</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-center">
          <p className="text-sm text-muted-foreground">Decifre a frase a partir dos emojis! {ROUNDS} rodadas com bônus de streak.</p>
          <Button onClick={() => initGame('Player')} className="w-full bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-600 hover:to-amber-700"><Lightbulb className="h-4 w-4 mr-2" /> Jogar</Button>
        </CardContent>
      </Card>
    );
  }

  const p = puzzles[qIdx];

  return (
    <div className="space-y-4">
      {/* Score bar */}
      <div className="flex items-center justify-between rounded-2xl bg-card border border-border p-3">
        <div className="flex items-center gap-2"><Star className="h-4 w-4 text-yellow-400" /><span className="font-bold">{score} pts</span></div>
        {streak >= 2 && <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">🔥 {streak}x streak</Badge>}
        <span className="text-xs text-muted-foreground">{qIdx + 1}/{puzzles.length}</span>
      </div>

      <AnimatePresence mode="wait">
        {p && (
          <motion.div key={qIdx} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-4">
            <div className="text-center py-6">
              <Badge variant="outline" className="mb-3">{p.category}</Badge>
              <p className="text-6xl mb-2 tracking-wider">{p.emojis}</p>
            </div>
            {!revealed && (
              <div className="flex gap-2">
                <input value={guess} onChange={e => setGuess(e.target.value)} onKeyDown={e => e.key === 'Enter' && submitGuess()} placeholder="Qual é a resposta?" className="flex-1 rounded-xl border border-border bg-card px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500/50" autoFocus />
                <Button onClick={submitGuess} className="bg-gradient-to-r from-yellow-500 to-amber-600">Enviar</Button>
              </div>
            )}
            {!revealed && !showHint && (
              <button onClick={() => { setShowHint(true); }} className="w-full text-xs text-muted-foreground hover:text-yellow-400 transition-colors py-2 flex items-center justify-center gap-1"><Lightbulb className="h-3 w-3" /> Pedir dica (-5 pts)</button>
            )}
            {showHint && !revealed && (
              <div className="rounded-xl bg-yellow-500/10 border border-yellow-500/20 p-3 text-center">
                <p className="text-sm text-yellow-300">💡 {p.hint}</p>
                <p className="text-xs text-muted-foreground mt-1"><Clock className="h-3 w-3 inline" /> {timeLeft}s</p>
              </div>
            )}
            {revealed && (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className={`rounded-2xl p-4 text-center ${results[results.length - 1]?.correct ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-red-500/10 border border-red-500/30'}`}>
                <p className="text-xs uppercase tracking-wider mb-1">Resposta</p>
                <p className="text-lg font-bold">{p.answer}</p>
                <p className="text-sm mt-1">{results[results.length - 1]?.correct ? '✅ Correto!' : '❌ Errado!'}</p>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results */}
      {results.length > 0 && !revealed && (
        <div className="flex gap-1 flex-wrap">
          {results.map((r, i) => (
            <div key={i} className={`h-2 w-2 rounded-full ${r.correct ? 'bg-emerald-500' : 'bg-red-500'}`} />
          ))}
        </div>
      )}

      <AnimatePresence>
        {phase === 'done' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 bg-black/70 backdrop-blur flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="w-full max-w-sm rounded-3xl bg-gradient-to-br from-yellow-900 to-amber-900 border border-white/10 p-6 text-center text-white">
              <Trophy className="h-12 w-12 text-yellow-400 mx-auto mb-3" />
              <h2 className="text-2xl font-bold mb-2">Resultado Final</h2>
              <p className="text-4xl font-bold text-yellow-400 mb-1">{score} pts</p>
              <p className="text-sm opacity-70 mb-4">{results.filter(r => r.correct).length}/{results.length} acertos</p>
              <div className="flex gap-2"><Button onClick={() => setPhase('setup')} variant="outline" className="flex-1 border-white/20 text-white">Sair</Button><Button onClick={() => initGame('Player')} className="flex-1 bg-gradient-to-r from-yellow-500 to-amber-600">Jogar Novamente</Button></div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
