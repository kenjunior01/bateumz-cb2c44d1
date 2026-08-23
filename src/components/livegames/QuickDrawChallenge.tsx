import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Pencil, Timer, Users, Trophy, RotateCcw, Palette, Eraser } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface QuickDrawChallengeProps { onScore?: (name: string, score: number) => void; liveCode?: string; }

const WORDS = [
  'Gato', 'Sol', 'Casa', 'Árvore', 'Carro', 'Flor', 'Coração', 'Estrela', 'Peixe', 'Lua',
  'Bola', 'Livro', 'Mão', 'Olho', 'Boca', 'Fogo', 'Chuva', 'Nuvem', 'Montanha', 'Rio',
  'Cachorro', 'Pássaro', 'Borboleta', 'Tartaruga', 'Elefante', 'Girafa', 'Pinguim', 'Cobra',
  'Pizza', 'Hambúrguer', 'Bolo', 'Sorvete', 'Espada', 'Coroa', 'Avião', 'Foguete',
  'Robô', 'Astronauta', 'Dinossauro', 'Fantasma', 'Vampiro', 'Pirata', 'Ninja',
  'Cadeira', 'Mesa', 'Relógio', 'Óculos', 'Guarda-chuva', 'Bicicleta', 'Trem',
];

const DRAW_TIME = 60;

export default function QuickDrawChallenge({ onScore, liveCode }: QuickDrawChallengeProps) {
  const [phase, setPhase] = useState<'setup' | 'drawing' | 'guessing' | 'result'>('setup');
  const [word, setWord] = useState('');
  const [guessInput, setGuessInput] = useState('');
  const [timeLeft, setTimeLeft] = useState(DRAW_TIME);
  const [guessed, setGuessed] = useState<string[]>([]);
  const [round, setRound] = useState(0);
  const [scores, setScores] = useState<Record<string, number>>({});
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [color, setColor] = useState('#ffffff');
  const [brushSize, setBrushSize] = useState(4);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    ctx.fillStyle = '#1a1a2e'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctxRef.current = ctx;
  }, []);

  const startRound = useCallback(() => {
    const w = WORDS[Math.floor(Math.random() * WORDS.length)];
    setWord(w); setTimeLeft(DRAW_TIME); setGuessInput(''); setGuessed([]);
    setPhase('drawing'); setRound(r => r + 1);
    setTimeout(initCanvas, 100);
  }, [initCanvas]);

  useEffect(() => {
    if (phase !== 'drawing' && phase !== 'guessing') return;
    if (timeLeft <= 0) {
      clearInterval(timerRef.current); setPhase('result'); return;
    }
    timerRef.current = setInterval(() => setTimeLeft(t => t - 1), 1000);
    return () => clearInterval(timerRef.current);
  }, [phase, timeLeft]);

  const getPos = (e: React.TouchEvent | React.MouseEvent) => {
    const canvas = canvasRef.current; if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    return { x: (clientX - rect.left) * (canvas.width / rect.width), y: (clientY - rect.top) * (canvas.height / rect.height) };
  };

  const startDraw = (e: React.TouchEvent | React.MouseEvent) => {
    setDrawing(true);
    const p = getPos(e);
    const ctx = ctxRef.current;
    if (ctx) { ctx.beginPath(); ctx.moveTo(p.x, p.y); }
  };
  const draw = (e: React.TouchEvent | React.MouseEvent) => {
    if (!drawing) return;
    const p = getPos(e);
    const ctx = ctxRef.current;
    if (ctx) {
      ctx.lineTo(p.x, p.y);
      ctx.strokeStyle = color;
      ctx.lineWidth = brushSize;
      ctx.stroke();
    }
  };
  const stopDraw = () => setDrawing(false);

  const submitGuess = () => {
    if (!guessInput.trim()) return;
    if (guessInput.trim().toLowerCase() === word.toLowerCase()) {
      const pts = Math.max(5, timeLeft);
      const name = 'Jogador';
      setScores(s => ({ ...s, [name]: (s[name] || 0) + pts }));
      setGuessed(g => [...g, name]); onScore?.(name, pts);
      setGuessInput('');
      // Fire confetti on correct guess
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 }, colors: ['#10b981', '#14b8a6', '#06b6d4'] });
    }
  };

  const clearCanvas = () => { const ctx = ctxRef.current; if (!ctx) return; const c = canvasRef.current; if (!c) return; ctx.fillStyle = '#1a1a2e'; ctx.fillRect(0, 0, c.width, c.height); };

  if (phase === 'setup') {
    return (
      // Enhancement 3: Convert setup Card to motion.div with fade-in animation
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <Card className="border-2 border-dashed border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 to-teal-500/5">
          <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-lg"><Pencil className="h-5 w-5 text-emerald-400" /> Desenho Rápido</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-center">
            <p className="text-sm text-muted-foreground">Desenhe a palavra e deixe o público adivinhar! {DRAW_TIME}s por desenho.</p>
            {/* Enhancement 11: Convert start button to motion.button with whileHover and whileTap */}
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.95 }}
              onClick={startRound}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-md px-4 py-2 text-sm font-medium cursor-pointer"
            >
              <Pencil className="h-4 w-4 mr-2 inline" /> Iniciar Rodada
            </motion.button>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Enhancement 12: Top bar wrapped in motion.div with slide-down animation on phase change */}
      <motion.div
        key={phase}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="flex items-center justify-between rounded-2xl bg-card border border-border p-3"
      >
        <div><Badge variant="outline">Rodada {round}</Badge></div>
        {/* Enhancement 8: Pulsing glow on timer when timeLeft <= 10 */}
        <div
          className={`font-mono text-lg font-bold ${timeLeft <= 10 ? 'text-red-400' : 'text-foreground'}`}
          style={timeLeft <= 10 ? {
            textShadow: '0 0 8px rgba(248,113,113,0.6), 0 0 20px rgba(248,113,113,0.3)',
            animation: 'pulse 1s ease-in-out infinite',
          } : undefined}
        >
          <Timer className="h-4 w-4 inline mr-1" />{timeLeft}s
        </div>
        {phase === 'drawing' && <div className="bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full text-xs font-bold">A DIVINHAR: {word.toUpperCase()}</div>}
      </motion.div>

      {/* Enhancement 10: Subtle animated border/glow on canvas container when in drawing phase */}
      <motion.div
        className="rounded-2xl overflow-hidden bg-[#1a1a2e]"
        animate={phase === 'drawing' ? {
          boxShadow: [
            '0 0 5px rgba(16,185,129,0.1), 0 0 20px rgba(16,185,129,0.05)',
            '0 0 15px rgba(16,185,129,0.3), 0 0 40px rgba(16,185,129,0.15)',
            '0 0 5px rgba(16,185,129,0.1), 0 0 20px rgba(16,185,129,0.05)',
          ],
          borderColor: [
            'rgba(16,185,129,0.3)',
            'rgba(16,185,129,0.7)',
            'rgba(16,185,129,0.3)',
          ],
        } : { boxShadow: '0 0 0px rgba(16,185,129,0)', borderColor: 'hsl(var(--border))' }}
        transition={phase === 'drawing' ? { duration: 2.5, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.3 }}
        style={{ border: '2px solid hsl(var(--border))' }}
      >
        <canvas ref={canvasRef} width={600} height={400} className="w-full touch-none cursor-crosshair"
          onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
          onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw}
        />
      </motion.div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex gap-1">{['#ffffff','#ef4444','#f97316','#eab308','#22c55e','#3b82f6','#8b5cf6','#ec4899'].map(c => (
          // Enhancement 4: whileHover on color palette buttons
          <motion.button
            key={c}
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setColor(c)}
            className={`h-7 w-7 rounded-full border-2 transition-transform cursor-pointer ${color === c ? 'border-white scale-110' : 'border-transparent'}`}
            style={{ backgroundColor: c }}
          />
        ))}</div>
        <div className="flex gap-1 ml-auto">
          {[2, 4, 8, 16].map(s => (
            // Enhancement 5: whileTap={{scale:0.9}} on brush size buttons
            <motion.button
              key={s}
              whileTap={{ scale: 0.9 }}
              onClick={() => setBrushSize(s)}
              className={`h-7 w-7 rounded-lg border text-xs font-bold cursor-pointer ${brushSize === s ? 'border-primary bg-primary/20' : 'border-border bg-card'}`}
            >{s}</motion.button>
          ))}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={clearCanvas}
            className="h-7 px-2 rounded-lg border border-border bg-card text-xs hover:bg-red-500/10 hover:border-red-500/30 cursor-pointer"
          ><Eraser className="h-3 w-3" /></motion.button>
        </div>
      </div>

      {/* Enhancement 6: Guess input area wrapped in motion.div with slide-up animation */}
      <AnimatePresence>
        {phase === 'drawing' && (
          <motion.div
            key="guess-input"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="flex gap-2"
          >
            <input value={guessInput} onChange={e => setGuessInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && submitGuess()} placeholder="Digite seu palpite..." className="flex-1 rounded-xl border border-border bg-card px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50" />
            <Button onClick={submitGuess} className="bg-gradient-to-r from-emerald-500 to-teal-600">Enviar</Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Enhancement 7: Staggered animation on guessed player badges */}
      <div className="flex gap-2 flex-wrap">
        <AnimatePresence>
          {guessed.map((g, i) => (
            <motion.div
              key={`${g}-${i}`}
              initial={{ opacity: 0, scale: 0.8, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.35, delay: i * 0.1, ease: 'easeOut' }}
            >
              <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                ✅ {g}
              </Badge>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Enhancement 2: AnimatePresence around the result phase */}
      <AnimatePresence mode="wait">
        {phase === 'result' && (
          <motion.div
            key="result-phase"
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="rounded-2xl bg-card border border-border p-4 text-center space-y-3"
          >
            <p className="text-sm text-muted-foreground">A palavra era:</p>
            <p className="text-2xl font-bold text-primary">{word}</p>
            <p className="text-sm">{guessed.length > 0 ? `${guessed.length} pessoa(s) acertaram!` : 'Ninguém acertou 😅'}</p>
            {/* Enhancement 9: whileHover={{scale:1.02}} on Próxima Rodada button */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              className="inline-block"
            >
              <Button onClick={startRound} className="bg-gradient-to-r from-emerald-500 to-teal-600">
                <RotateCcw className="h-4 w-4 mr-2" /> Próxima Rodada
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
