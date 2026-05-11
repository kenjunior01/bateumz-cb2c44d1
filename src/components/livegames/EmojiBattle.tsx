import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Vote, Plus, Trash2, Play, Square, Settings2, Trophy } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

type Option = { id: string; emoji: string; label: string; votes: number };

interface Props {
  onScore?: (name: string, score: number) => void;
  onWinner?: (label: string, votes: number) => void;
}

const SIM_USERS = ["Zito", "Inês", "Mauro", "Carla", "Bento", "Júlia", "Tó", "Nina", "Rico", "Sami", "Edu", "Lía"];

const DEFAULTS: Option[] = [
  { id: "a", emoji: "🔥", label: "Opção A", votes: 0 },
  { id: "b", emoji: "❤️", label: "Opção B", votes: 0 },
  { id: "c", emoji: "⭐", label: "Opção C", votes: 0 },
];

const EmojiBattle = ({ onScore, onWinner }: Props) => {
  const [options, setOptions] = useState<Option[]>(() => {
    try {
      const s = localStorage.getItem("liveEmojiOptions");
      if (s) {
        const arr = JSON.parse(s) as Array<{ id: string; emoji: string; label: string }>;
        if (Array.isArray(arr) && arr.length) return arr.map((o) => ({ ...o, votes: 0 }));
      }
    } catch { /* noop */ }
    return DEFAULTS;
  });
  const [duration, setDuration] = useState(15); // seconds
  const [running, setRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [voters, setVoters] = useState<Record<string, string>>({}); // user -> optionId
  const [winner, setWinner] = useState<Option | null>(null);
  const startedRef = useRef(false);

  const total = options.reduce((s, o) => s + o.votes, 0);

  useEffect(() => {
    if (!running) return;
    const tickerId = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(tickerId);
          finish();
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    const voteId = setInterval(() => {
      const u = SIM_USERS[Math.floor(Math.random() * SIM_USERS.length)] + Math.floor(Math.random() * 99);
      setVoters((prev) => {
        if (prev[u]) return prev;
        const opt = options[Math.floor(Math.random() * options.length)];
        setOptions((prevOpts) => prevOpts.map((o) => (o.id === opt.id ? { ...o, votes: o.votes + 1 } : o)));
        return { ...prev, [u]: opt.id };
      });
    }, 350);

    return () => { clearInterval(tickerId); clearInterval(voteId); };
  }, [running]);

  const start = () => {
    setOptions((prev) => prev.map((o) => ({ ...o, votes: 0 })));
    setVoters({});
    setWinner(null);
    setTimeLeft(duration);
    setRunning(true);
    startedRef.current = true;
  };

  const stop = () => { setRunning(false); finish(); };

  const finish = () => {
    setRunning(false);
    setOptions((prev) => {
      const w = [...prev].sort((a, b) => b.votes - a.votes)[0];
      if (w) {
        setWinner(w);
        onWinner?.(w.label, w.votes);
        // award engagement points to a sample of voters
        setVoters((curr) => {
          const winners = Object.entries(curr).filter(([, oid]) => oid === w.id).slice(0, 3);
          winners.forEach(([name]) => onScore?.(name, 50));
          return curr;
        });
      }
      return prev;
    });
  };

  const addOption = () => {
    if (options.length >= 6) return;
    setOptions((prev) => [...prev, { id: Math.random().toString(36).slice(2, 6), emoji: "✨", label: `Opção ${String.fromCharCode(65 + prev.length)}`, votes: 0 }]);
  };
  const removeOption = (id: string) => setOptions((prev) => prev.filter((o) => o.id !== id));
  const update = (id: string, patch: Partial<Option>) => setOptions((prev) => prev.map((o) => (o.id === id ? { ...o, ...patch } : o)));

  return (
    <div className="rounded-3xl border border-border bg-card overflow-hidden">
      <div className="px-4 py-3 bg-gradient-to-r from-pink-500/15 to-rose-500/10 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Vote className="h-4 w-4 text-pink-500" />
          <h3 className="font-display text-sm font-bold">Batalha de Emojis</h3>
        </div>
        <Sheet>
          <SheetTrigger asChild>
            <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card border border-border text-[11px] font-medium hover:bg-secondary">
              <Settings2 className="h-3 w-3" /> Configurar
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto">
            <SheetHeader className="mb-3"><SheetTitle>Configurar Batalha</SheetTitle></SheetHeader>
            <div className="space-y-4 pb-6">
              <div>
                <Label className="text-xs">Duração: {duration}s</Label>
                <Slider min={5} max={60} step={5} value={[duration]} onValueChange={([v]) => setDuration(v)} className="mt-2" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Opções</Label>
                {options.map((o) => (
                  <div key={o.id} className="flex items-center gap-2">
                    <Input value={o.emoji} onChange={(e) => update(o.id, { emoji: e.target.value })} className="w-14 text-center" />
                    <Input value={o.label} onChange={(e) => update(o.id, { label: e.target.value })} className="flex-1" />
                    <button onClick={() => removeOption(o.id)} className="p-2 rounded-md hover:bg-destructive/10 text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <button onClick={addOption} className="inline-flex items-center gap-1.5 text-xs text-primary font-medium">
                  <Plus className="h-3.5 w-3.5" /> Adicionar opção
                </button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Total de votos: <span className="font-bold text-foreground">{total}</span></span>
          {running && <span className="font-bold text-pink-500">⏱ {timeLeft}s</span>}
        </div>

        <div className="space-y-2">
          {options.map((o) => {
            const pct = total ? (o.votes / total) * 100 : 0;
            const isWin = winner?.id === o.id;
            return (
              <motion.div key={o.id} layout className={`relative rounded-xl border p-3 overflow-hidden ${isWin ? "border-emerald-500 bg-emerald-500/5" : "border-border bg-background/50"}`}>
                <motion.div className="absolute inset-y-0 left-0 bg-gradient-to-r from-pink-500/20 to-rose-500/10" animate={{ width: `${pct}%` }} transition={{ type: "spring", stiffness: 80, damping: 18 }} />
                <div className="relative flex items-center gap-3">
                  <span className="text-2xl">{o.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">{o.label}</p>
                    <p className="text-[10px] text-muted-foreground">{o.votes} votos · {pct.toFixed(0)}%</p>
                  </div>
                  {isWin && <Trophy className="h-4 w-4 text-emerald-500" />}
                </div>
              </motion.div>
            );
          })}
        </div>

        <AnimatePresence>
          {winner && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3 text-center text-sm">
              <span className="font-bold text-emerald-500">{winner.emoji} {winner.label}</span> venceu com {winner.votes} votos! Os votantes entram no sorteio.
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex gap-2">
          {!running ? (
            <button onClick={start} className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-bold">
              <Play className="h-4 w-4" /> Abrir votação
            </button>
          ) : (
            <button onClick={stop} className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-full bg-destructive text-destructive-foreground text-sm font-bold">
              <Square className="h-4 w-4" /> Encerrar agora
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmojiBattle;
