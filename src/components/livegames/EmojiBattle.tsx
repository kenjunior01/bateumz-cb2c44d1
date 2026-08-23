import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Vote, Plus, Trash2, Play, Square, Settings2, Trophy } from "lucide-react";
import confetti from "canvas-confetti";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

type Option = { id: string; emoji: string; label: string; votes: number };

interface Props {
  onScore?: (name: string, score: number) => void;
  onWinner?: (label: string, votes: number) => void;
}

const SIM_USERS = ["Zito", "In\u00eas", "Mauro", "Carla", "Bento", "J\u00falia", "T\u00f3", "Nina", "Rico", "Sami", "Edu", "L\u00eda"];

const DEFAULTS: Option[] = [
  { id: "a", emoji: "\ud83d\udd25", label: "Op\u00e7\u00e3o A", votes: 0 },
  { id: "b", emoji: "\u2764\ufe0f", label: "Op\u00e7\u00e3o B", votes: 0 },
  { id: "c", emoji: "\u2b50", label: "Op\u00e7\u00e3o C", votes: 0 },
];

const SPARKLE_ANGLES = Array.from({ length: 6 }, (_, i) => (i * Math.PI * 2) / 6);

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
  const [duration, setDuration] = useState(15);
  const [running, setRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [voters, setVoters] = useState<Record<string, string>>({});
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

  useEffect(() => {
    if (winner) {
      confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
    }
  }, [winner]);

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
    setOptions((prev) => [...prev, { id: Math.random().toString(36).slice(2, 6), emoji: "\u2728", label: `Op\u00e7\u00e3o ${String.fromCharCode(65 + prev.length)}`, votes: 0 }]);
  };
  const removeOption = (id: string) => setOptions((prev) => prev.filter((o) => o.id !== id));
  const update = (id: string, patch: Partial<Option>) => setOptions((prev) => prev.map((o) => (o.id === id ? { ...o, ...patch } : o)));

  return (
    <div className="relative rounded-3xl border border-border bg-card overflow-hidden shadow-[0_0_20px_rgba(236,72,153,0.1)]">
      {/* Enhancement 9: Animated gradient background */}
      <motion.div
        className="absolute inset-0 pointer-events-none z-0"
        animate={{ backgroundPosition: ["0% 0%", "100% 100%", "0% 0%"] }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        style={{
          background: "linear-gradient(135deg, rgba(236,72,153,0.06), transparent 40%, rgba(244,63,94,0.06))",
          backgroundSize: "200% 200%",
        }}
      />

      {/* Enhancement 10: Header with pink glow border */}
      <div className="relative z-10 px-4 py-3 bg-gradient-to-r from-pink-500/15 to-rose-500/10 border-b border-pink-500/20 flex items-center justify-between shadow-[0_1px_12px_rgba(236,72,153,0.15)]">
        <div className="flex items-center gap-2">
          <Vote className="h-4 w-4 text-pink-500" />
          <h3 className="font-display text-sm font-bold">{"Batalha de Emojis"}</h3>
        </div>
        <Sheet>
          {/* Enhancement 7: whileHover on config button */}
          <SheetTrigger asChild>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card border border-border text-[11px] font-medium"
            >
              <Settings2 className="h-3 w-3" /> {"Configurar"}
            </motion.button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto">
            <SheetHeader className="mb-3"><SheetTitle>{"Configurar Batalha"}</SheetTitle></SheetHeader>
            <div className="space-y-4 pb-6">
              <div>
                <Label className="text-xs">{`Dura\u00e7\u00e3o: ${duration}s`}</Label>
                <Slider min={5} max={60} step={5} value={[duration]} onValueChange={([v]) => setDuration(v)} className="mt-2" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">{"Op\u00e7\u00f5es"}</Label>
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
                  <Plus className="h-3.5 w-3.5" /> {"Adicionar op\u00e7\u00e3o"}
                </button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <div className="relative z-10 p-4 space-y-3">
        <div className="flex items-center justify-between text-xs">
          {/* Enhancement 8: Animate total votes counter */}
          <span className="text-muted-foreground">
            {"Total de votos: "}
            <motion.span
              key={total}
              initial={{ scale: 1.4, color: "rgb(236, 72, 153)" }}
              animate={{ scale: 1, color: "var(--foreground)" }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="font-bold inline-block"
            >
              {total}
            </motion.span>
          </span>
          {running && <span className="font-bold text-pink-500">{"\u23f1 "}{timeLeft}s</span>}
        </div>

        <div className="space-y-2">
          {options.map((o, index) => {
            const pct = total ? (o.votes / total) * 100 : 0;
            const isWin = winner?.id === o.id;
            return (
              <motion.div
                key={o.id}
                layout
                whileHover={{ scale: 1.02 }}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1, duration: 0.4 }}
                className={`relative rounded-xl border p-3 overflow-hidden ${isWin ? "border-emerald-500 bg-emerald-500/5" : "border-border bg-background/50"}`}
              >
                {/* Enhancement 4: Pulsing glow overlay on winner card */}
                {isWin && (
                  <motion.div
                    className="absolute inset-0 rounded-xl pointer-events-none z-0"
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    style={{ boxShadow: "0 0 18px rgba(16,185,129,0.35), inset 0 0 12px rgba(16,185,129,0.06)" }}
                  />
                )}
                <motion.div className="absolute inset-y-0 left-0 bg-gradient-to-r from-pink-500/20 to-rose-500/10" animate={{ width: `${pct}%` }} transition={{ type: "spring", stiffness: 80, damping: 18 }} />
                <div className="relative z-10 flex items-center gap-3">
                  <span className="text-2xl">{o.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">{o.label}</p>
                    <p className="text-[10px] text-muted-foreground">{o.votes} votos {"\u00b7"} {pct.toFixed(0)}%</p>
                  </div>
                  {isWin && <Trophy className="h-4 w-4 text-emerald-500" />}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Enhancement 6: Floating sparkles around trophy in winner announcement */}
        <AnimatePresence>
          {winner && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3 text-center text-sm"
            >
              <div className="flex flex-col items-center gap-1">
                <div className="relative inline-flex items-center justify-center w-8 h-8">
                  <Trophy className="h-5 w-5 text-emerald-500" />
                  {SPARKLE_ANGLES.map((angle, i) => (
                    <motion.span
                      key={i}
                      className="absolute h-1 w-1 rounded-full bg-yellow-400"
                      animate={{
                        x: [0, Math.cos(angle) * 16, 0],
                        y: [0, Math.sin(angle) * 16, 0],
                        opacity: [0, 1, 0],
                        scale: [0.5, 1.3, 0.5],
                      }}
                      transition={{
                        duration: 1.8,
                        repeat: Infinity,
                        delay: i * 0.3,
                        ease: "easeInOut",
                      }}
                    />
                  ))}
                </div>
                <span className="font-bold text-emerald-500">{winner.emoji} {winner.label}</span>{" "}
                venceu com {winner.votes} votos! Os votantes entram no sorteio.
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Enhancement 5: motion.button for action buttons */}
        <div className="flex gap-2">
          {!running ? (
            <motion.button
              onClick={start}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-bold"
            >
              <Play className="h-4 w-4" /> {"Abrir vota\u00e7\u00e3o"}
            </motion.button>
          ) : (
            <motion.button
              onClick={stop}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-full bg-destructive text-destructive-foreground text-sm font-bold"
            >
              <Square className="h-4 w-4" /> Encerrar agora
            </motion.button>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmojiBattle;
