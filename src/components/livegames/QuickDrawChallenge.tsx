import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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

  const startDraw = (e: React.TouchEvent | React.MouseEvent) => { setDrawing(true); const p = getPos(e); ctxRef.current?.beginPath(); ctxRef.current?.moveTo(p.x, p.y); };
  const draw = (e: React.TouchEvent | React.MouseEvent) => { if (!drawing) return; const p = getPos(e); ctxRef.current?.lineTo(p.x, p.y); ctxRef.current?.strokeStyle = color; ctxRef.current?.lineWidth = brushSize; ctxRef.current?.stroke(); };
  const stopDraw = () => setDrawing(false);

  const submitGuess = () => {
    if (!guessInput.trim()) return;
    if (guessInput.trim().toLowerCase() === word.toLowerCase()) {
      const pts = Math.max(5, timeLeft);
      const name = 'Jogador';
      setScores(s => ({ ...s, [name]: (s[name] || 0) + pts }));
      setGuessed(g => [...g, name]); onScore?.(name, pts);
      setGuessInput('');
    }
  };

  const clearCanvas = () => { const ctx = ctxRef.current; if (!ctx) return; const c = canvasRef.current; if (!c) return; ctx.fillStyle = '#1a1a2e'; ctx.fillRect(0, 0, c.width, c.height); };

  if (phase === 'setup') {
    return (
      <Card className="border-2 border-dashed border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 to-teal-500/5">
        <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-lg"><Pencil className="h-5 w-5 text-emerald-400" /> Desenho Rápido</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-center">
          <p className="text-sm text-muted-foreground">Desenhe a palavra e deixe o público adivinhar! {DRAW_TIME}s por desenho.</p>
          <Button onClick={startRound} className="w-full bg-gradient-to-r from-emerald-500 to-teal-600"><Pencil className="h-4 w-4 mr-2" /> Iniciar Rodada</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {/* Top bar */}
      <div className="flex items-center justify-between rounded-2xl bg-card border border-border p-3">
        <div><Badge variant="outline">Rodada {round}</Badge></div>
        <div className={`font-mono text-lg font-bold ${timeLeft <= 10 ? 'text-red-400 animate-pulse' : 'text-foreground'}`}><Timer className="h-4 w-4 inline mr-1" />{timeLeft}s</div>
        {phase === 'drawing' && <div className="bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full text-xs font-bold">A DIVINHAR: {word.toUpperCase()}</div>}
      </div>

      {/* Canvas */}
      <div className="rounded-2xl overflow-hidden border-2 border-border bg-[#1a1a2e]">
        <canvas ref={canvasRef} width={600} height={400} className="w-full touch-none cursor-crosshair"
          onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
          onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw}
        />
      </div>

      {/* Tools */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex gap-1">{['#ffffff','#ef4444','#f97316','#eab308','#22c55e','#3b82f6','#8b5cf6','#ec4899'].map(c => (
          <button key={c} onClick={() => setColor(c)} className={`h-7 w-7 rounded-full border-2 transition-transform ${color === c ? 'border-white scale-110' : 'border-transparent'}`} style={{ backgroundColor: c }} />
        ))}</div>
        <div className="flex gap-1 ml-auto">
          {[2, 4, 8, 16].map(s => (
            <button key={s} onClick={() => setBrushSize(s)} className={`h-7 w-7 rounded-lg border text-xs font-bold ${brushSize === s ? 'border-primary bg-primary/20' : 'border-border bg-card'}`}>{s}</button>
          ))}
          <button onClick={clearCanvas} className="h-7 px-2 rounded-lg border border-border bg-card text-xs hover:bg-red-500/10 hover:border-red-500/30"><Eraser className="h-3 w-3" /></button>
        </div>
      </div>

      {/* Guess area */}
      {phase === 'drawing' && (
        <div className="flex gap-2">
          <input value={guessInput} onChange={e => setGuessInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && submitGuess()} placeholder="Digite seu palpite..." className="flex-1 rounded-xl border border-border bg-card px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50" />
          <Button onClick={submitGuess} className="bg-gradient-to-r from-emerald-500 to-teal-600">Enviar</Button>
        </div>
      )}

      {/* Guessed players */}
      {guessed.length > 0 && (
        <div className="flex gap-2 flex-wrap">{guessed.map((g, i) => <Badge key={i} className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">✅ {g}</Badge>)}</div>
      )}

      {/* Result */}
      {phase === 'result' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl bg-card border border-border p-4 text-center space-y-3">
          <p className="text-sm text-muted-foreground">A palavra era:</p>
          <p className="text-2xl font-bold text-primary">{word}</p>
          <p className="text-sm">{guessed.length > 0 ? `${guessed.length} pessoa(s) acertaram!` : 'Ninguém acertou 😅'}</p>
          <Button onClick={startRound} className="bg-gradient-to-r from-emerald-500 to-teal-600"><RotateCcw className="h-4 w-4 mr-2" /> Próxima Rodada</Button>
        </motion.div>
      )}
    </div>
  );
}
