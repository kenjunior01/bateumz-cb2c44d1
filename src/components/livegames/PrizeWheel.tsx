import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { Plus, Trash2, Settings2 } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type WheelPrize = {
  id: string;
  label: string;
  color: string;
  weight: number; // relative probability
};

export const DEFAULT_WHEEL_PRIZES: WheelPrize[] = [
  { id: "p1", label: "10% OFF", color: "#22c55e", weight: 25 },
  { id: "p2", label: "Tenta Outra", color: "#334155", weight: 35 },
  { id: "p3", label: "Brinde", color: "#eab308", weight: 15 },
  { id: "p4", label: "Tenta Outra", color: "#1e293b", weight: 15 },
  { id: "p5", label: "PRÉMIO!", color: "#8b5cf6", weight: 5 },
  { id: "p6", label: "5% OFF", color: "#ef4444", weight: 5 },
];

const palette = ["#22c55e", "#eab308", "#8b5cf6", "#ef4444", "#0ea5e9", "#f97316", "#ec4899", "#14b8a6"];

interface Props {
  prizes: WheelPrize[];
  onChange?: (prizes: WheelPrize[]) => void;
  onWin?: (prize: WheelPrize) => void;
  editable?: boolean;
}

const pickWeighted = (prizes: WheelPrize[]) => {
  const total = prizes.reduce((s, p) => s + Math.max(0, p.weight), 0) || 1;
  let r = Math.random() * total;
  for (let i = 0; i < prizes.length; i++) {
    r -= Math.max(0, prizes[i].weight);
    if (r <= 0) return i;
  }
  return prizes.length - 1;
};

const PrizeWheel = ({ prizes, onChange, onWin, editable = true }: Props) => {
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState<WheelPrize | null>(null);

  const segmentAngle = 360 / Math.max(1, prizes.length);

  const spin = () => {
    if (spinning || prizes.length < 2) return;
    setSpinning(true);
    setResult(null);
    const idx = pickWeighted(prizes);
    const targetCenter = idx * segmentAngle + segmentAngle / 2;
    const extra = 5 * 360 + Math.random() * 360;
    const final = extra + (360 - targetCenter);
    const next = rotation + final;
    setRotation(next);
    setTimeout(() => {
      const won = prizes[idx];
      setResult(won);
      setSpinning(false);
      onWin?.(won);
      if (!/tenta|nada|outra/i.test(won.label)) {
        confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });
      }
    }, 4200);
  };

  const update = (next: WheelPrize[]) => onChange?.(next);
  const addPrize = () =>
    update([
      ...prizes,
      { id: `p${Date.now()}`, label: "Novo Prémio", color: palette[prizes.length % palette.length], weight: 10 },
    ]);
  const removePrize = (id: string) => update(prizes.filter((p) => p.id !== id));
  const patchPrize = (id: string, patch: Partial<WheelPrize>) =>
    update(prizes.map((p) => (p.id === id ? { ...p, ...patch } : p)));

  const totalWeight = prizes.reduce((s, p) => s + Math.max(0, p.weight), 0) || 1;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10 w-0 h-0 border-l-[10px] border-r-[10px] border-t-[16px] border-l-transparent border-r-transparent border-t-primary" />
        <motion.svg
          width="280"
          height="280"
          viewBox="0 0 280 280"
          animate={{ rotate: rotation }}
          transition={{ duration: 4, ease: [0.17, 0.67, 0.12, 0.99] }}
          className="drop-shadow-lg"
        >
          {prizes.map((seg, i) => {
            const start = (i * segmentAngle - 90) * (Math.PI / 180);
            const end = ((i + 1) * segmentAngle - 90) * (Math.PI / 180);
            const x1 = 140 + 130 * Math.cos(start);
            const y1 = 140 + 130 * Math.sin(start);
            const x2 = 140 + 130 * Math.cos(end);
            const y2 = 140 + 130 * Math.sin(end);
            const largeArc = segmentAngle > 180 ? 1 : 0;
            const mid = ((i + 0.5) * segmentAngle - 90) * (Math.PI / 180);
            const tx = 140 + 80 * Math.cos(mid);
            const ty = 140 + 80 * Math.sin(mid);
            const textRotation = (i + 0.5) * segmentAngle;
            return (
              <g key={seg.id}>
                <path
                  d={`M140,140 L${x1},${y1} A130,130 0 ${largeArc},1 ${x2},${y2} Z`}
                  fill={seg.color}
                  stroke="rgba(255,255,255,0.15)"
                  strokeWidth="1"
                />
                <text
                  x={tx}
                  y={ty}
                  fill="#fff"
                  fontSize="11"
                  fontWeight="bold"
                  textAnchor="middle"
                  dominantBaseline="central"
                  transform={`rotate(${textRotation}, ${tx}, ${ty})`}
                  style={{ textShadow: "0 1px 2px rgba(0,0,0,0.4)" }}
                >
                  {seg.label.length > 12 ? seg.label.slice(0, 11) + "…" : seg.label}
                </text>
              </g>
            );
          })}
          <circle cx="140" cy="140" r="20" fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth="2" />
          <text x="140" y="140" fontSize="14" textAnchor="middle" dominantBaseline="central">
            🎯
          </text>
        </motion.svg>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={spin}
          disabled={spinning || prizes.length < 2}
          className="px-8 py-3 rounded-full bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 disabled:opacity-50 transition-all"
        >
          {spinning ? "A girar..." : "Girar a Roda 🎰"}
        </button>

        {editable && onChange && (
          <Sheet>
            <SheetTrigger asChild>
              <button className="inline-flex items-center gap-2 px-4 py-3 rounded-full bg-card border border-border text-xs font-medium hover:bg-secondary">
                <Settings2 className="h-3.5 w-3.5" /> Prémios
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto">
              <SheetHeader className="mb-4">
                <SheetTitle>Configurar Roda de Prémios</SheetTitle>
              </SheetHeader>
              <div className="space-y-3 pb-6">
                {prizes.map((p) => {
                  const pct = ((Math.max(0, p.weight) / totalWeight) * 100).toFixed(1);
                  return (
                    <div key={p.id} className="rounded-2xl border border-border p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={p.color}
                          onChange={(e) => patchPrize(p.id, { color: e.target.value })}
                          className="h-9 w-9 rounded-lg border border-border bg-transparent cursor-pointer"
                        />
                        <Input
                          value={p.label}
                          onChange={(e) => patchPrize(p.id, { label: e.target.value })}
                          placeholder="Nome do prémio"
                          className="flex-1"
                        />
                        <button
                          onClick={() => removePrize(p.id)}
                          className="p-2 rounded-lg text-destructive hover:bg-destructive/10"
                          aria-label="Remover"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="text-[11px] text-muted-foreground w-20">Peso ({pct}%)</Label>
                        <Input
                          type="number"
                          min={0}
                          max={1000}
                          value={p.weight}
                          onChange={(e) => patchPrize(p.id, { weight: Math.max(0, Number(e.target.value) || 0) })}
                          className="w-24"
                        />
                      </div>
                    </div>
                  );
                })}
                <button
                  onClick={addPrize}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed border-border text-sm text-muted-foreground hover:bg-secondary"
                >
                  <Plus className="h-4 w-4" /> Adicionar prémio
                </button>
                <p className="text-[11px] text-muted-foreground text-center">
                  As percentagens são calculadas a partir dos pesos relativos.
                </p>
              </div>
            </SheetContent>
          </Sheet>
        )}
      </div>

      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className={`text-center px-6 py-3 rounded-2xl ${
              /tenta|nada|outra/i.test(result.label)
                ? "bg-secondary text-muted-foreground"
                : "bg-primary/10 text-primary"
            }`}
          >
            <p className="font-bold text-lg">
              {/tenta|nada|outra/i.test(result.label) ? "😅 " : "🎉 Ganhou: "}
              {result.label}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PrizeWheel;
