import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Skull, RotateCcw, Plus, Trash2, Laugh, Volume2, VolumeX, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

interface PunishmentWheelProps { onScore?: (name: string, score: number) => void; liveCode?: string; }

const DEFAULT_PUNISHMENTS = [
  'Fazer 10 flexões na live', 'Cantar uma música inteira', 'Falar em idioma inventado por 30s', 'Dançar TikTok viral', 'Chorar de falso por 15s',
  'Ligar para alguém e dizer "te amo"', 'Imitar um animal por 20s', 'Contar uma piada péssima', 'Fazer careta por foto do público', 'Declarar amor ao chat',
  'Comer algo picante na live', 'Fazer tutorial de maquiagem masculino', 'Rezar pelo chat em voz alta', 'Falar de trás pra frente 30s', 'Fazer rap improvisado',
  'Pedir desculpas ao microondas', 'Fazer entrevista com objeto', 'Abraçar um travesseiro como se fosse pessoa', 'Falar no sotaque de outra região', 'Fazer cover de música infantil',
];

const COLORS = ['#ef4444','#f97316','#eab308','#22c55e','#06b6d4','#3b82f6','#8b5cf6','#ec4899'];

type Seg = { label: string; color: string; };

export default function PunishmentWheel({ onScore, liveCode }: PunishmentWheelProps) {
  const [segments, setSegments] = useState<Seg[]>(DEFAULT_PUNISHMENTS.map((l, i) => ({ label: l, color: COLORS[i % COLORS.length] })));
  const [newPun, setNewPun] = useState('');
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const drawWheel = useCallback((rot: number) => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    const size = 400; canvas.width = size; canvas.height = size;
    const cx = size / 2, r = size / 2 - 10, n = segments.length;
    if (n === 0) return;
    const angle = (2 * Math.PI) / n;
    ctx.save(); ctx.translate(cx, cx); ctx.rotate((rot * Math.PI) / 180);
    segments.forEach((seg, i) => {
      ctx.beginPath(); ctx.moveTo(0, 0);
      ctx.arc(0, 0, r, i * angle, (i + 1) * angle); ctx.closePath();
      ctx.fillStyle = seg.color; ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 2; ctx.stroke();
      ctx.save(); ctx.rotate(i * angle + angle / 2);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 3;
      const txt = seg.label.length > 22 ? seg.label.slice(0, 20) + '...' : seg.label;
      ctx.fillText(txt, r * 0.55, 4);
      ctx.restore();
    });
    // Center circle
    ctx.beginPath(); ctx.arc(0, 0, 28, 0, 2 * Math.PI);
    ctx.fillStyle = '#1e1b4b'; ctx.fill(); ctx.strokeStyle = '#a78bfa'; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('GIRAR', 0, 0);
    ctx.restore();
  }, [segments]);

  useEffect(() => { drawWheel(rotation); }, [drawWheel, rotation]);

  const spin = () => {
    if (spinning || segments.length < 2) return;
    setSpinning(true); setShowResult(false); setResult(null);
    const extra = 1800 + Math.random() * 1800;
    const target = rotation + extra;
    const duration = 4000;
    const start = performance.now();
    const startRot = rotation;
    const animate = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 4);
      setRotation(startRot + (target - startRot) * ease);
      if (p < 1) requestAnimationFrame(animate);
      else {
        setSpinning(false);
        const n = segments.length;
        const angle = (2 * Math.PI) / n;
        const norm = ((target % 360) + 360) % 360;
        const idx = Math.floor(((360 - norm + 90) % 360) / (360 / n)) % n;
        setResult(segments[idx].label);
        setShowResult(true);
        setHistory(h => [segments[idx].label, ...h.slice(0, 9)]);
      }
    };
    requestAnimationFrame(animate);
  };

  const addPunishment = () => {
    if (!newPun.trim()) return;
    setSegments(s => [...s, { label: newPun.trim(), color: COLORS[s.length % COLORS.length] }]);
    setNewPun('');
  };

  const removePunishment = (idx: number) => {
    if (segments.length <= 2) return;
    setSegments(s => s.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-4">
      <Card className="border-2 border-dashed border-red-500/30 bg-gradient-to-br from-red-500/5 to-orange-500/5">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg"><Skull className="h-5 w-5 text-red-400" /> Roleta de Castigos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-center relative">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 z-10 text-2xl drop-shadow-lg">▼</div>
            <canvas ref={canvasRef} className="max-w-[320px] w-full rounded-full shadow-2xl" />
          </div>
          <Button onClick={spin} disabled={spinning} className={`w-full text-base font-bold py-6 ${spinning ? '' : 'bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 animate-pulse'}`}>
            {spinning ? <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.5 }}><Zap className="h-5 w-5" /></motion.div> : <><Laugh className="h-5 w-5 mr-2" /> GIRAR A ROLETA!</>}
          </Button>
          <AnimatePresence>
            {showResult && result && (
              <motion.div initial={{ opacity: 0, scale: 0.8, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0 }} className="rounded-2xl bg-gradient-to-r from-red-600 to-orange-600 p-4 text-center text-white">
                <p className="text-xs uppercase tracking-wider opacity-80 mb-1">Castigo Sorteado</p>
                <p className="text-lg font-bold">{result}</p>
              </motion.div>
            )}
          </AnimatePresence>
          <div className="flex gap-2">
            <Input value={newPun} onChange={e => setNewPun(e.target.value)} onKeyDown={e => e.key === 'Enter' && addPunishment()} placeholder="Adicionar castigo customizado..." className="flex-1" />
            <Button onClick={addPunishment} size="icon" variant="outline"><Plus className="h-4 w-4" /></Button>
          </div>
          {history.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-2 font-bold">Últimos castigos</p>
              <div className="space-y-1">
                {history.map((h, i) => <div key={i} className="flex items-center gap-2 text-xs rounded-lg bg-muted/50 px-3 py-1.5"><Badge variant="outline" className="text-[10px]">#{i + 1}</Badge><span className="truncate">{h}</span></div>)}
              </div>
            </div>
          )}
          <details className="group">
            <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors">Gerenciar castigos ({segments.length})</summary>
            <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
              {segments.map((s, i) => (
                <div key={i} className="flex items-center gap-2 text-xs rounded-lg bg-muted/30 px-3 py-1.5">
                  <div className="h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                  <span className="truncate flex-1">{s.label}</span>
                  <button onClick={() => removePunishment(i)} className="text-muted-foreground hover:text-red-400"><Trash2 className="h-3 w-3" /></button>
                </div>
              ))}
            </div>
          </details>
        </CardContent>
      </Card>
    </div>
  );
}
