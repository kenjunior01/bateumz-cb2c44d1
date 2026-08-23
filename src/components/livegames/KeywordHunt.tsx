import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { Search, Sparkles, Send, Trophy, Settings2, Play, Square, KeyRound, CheckCircle2, AlertCircle } from "lucide-react";
import { z } from "zod";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type ChatMsg = { id: string; user: string; text: string; at: number; correct?: boolean };

interface Props {
  liveCode: string;
  onScore?: (name: string, score: number) => void;
  onWinner?: (name: string, keyword: string) => void;
}

const SIM_USERS = ["Zito", "Inês", "Mauro", "Carla", "Bento", "Júlia", "Tó", "Nina", "Rico", "Sami"];
const NOISE = ["belo!", "boa live", "vamooo", "🔥🔥", "salve a empresa", "qual é a palavra?", "vou ganhar", "que prémio?", "👀", "manda mais dica"];

const guessSchema = z.object({
  name: z.string().trim().min(2, "Nome muito curto").max(40, "Nome muito longo"),
  code: z.string().trim().min(3, "Código inválido").max(10, "Código inválido"),
  guess: z.string().trim().min(1, "Escreve a tua tentativa").max(60, "Tentativa muito longa"),
});

const norm = (s: string) => s.trim().toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");

const KeywordHunt = ({ liveCode, onScore, onWinner }: Props) => {
  const initial = (() => {
    try { const s = localStorage.getItem("liveKeywordConfig"); return s ? JSON.parse(s) : null; } catch { return null; }
  })();
  const [keyword, setKeyword] = useState<string>(initial?.keyword || "BATEU");
  const [clue, setClue] = useState<string>(initial?.clue || "Sinónimo de 'acertou' em moçambicano 😉");
  const [points, setPoints] = useState<number>(initial?.points || 100);
  const [running, setRunning] = useState(false);
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [winner, setWinner] = useState<string | null>(null);

  // Participant form state
  const [pName, setPName] = useState("");
  const [pCode, setPCode] = useState("");
  const [pGuess, setPGuess] = useState("");
  const [errors, setErrors] = useState<{ name?: string; code?: string; guess?: string; submit?: string }>({});
  const [feedback, setFeedback] = useState<{ tone: "ok" | "warn" | "err"; msg: string } | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const target = useMemo(() => norm(keyword), [keyword]);

  // Simulated chat stream
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      const u = SIM_USERS[Math.floor(Math.random() * SIM_USERS.length)];
      const correct = Math.random() < 0.12;
      const text = correct ? keyword : NOISE[Math.floor(Math.random() * NOISE.length)];
      pushSimMsg(u, text);
    }, 1200);
    return () => clearInterval(id);
  }, [running, keyword]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [chat]);

  const declareWinner = (user: string) => {
    setWinner(user);
    setRunning(false);
    onScore?.(user, points);
    onWinner?.(user, keyword);
    confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 }, colors: ["#f59e0b", "#f97316", "#10b981", "#6366f1"] });
    setTimeout(() => confetti({ particleCount: 60, angle: 60, spread: 55, origin: { x: 0 } }), 250);
    setTimeout(() => confetti({ particleCount: 60, angle: 120, spread: 55, origin: { x: 1 } }), 400);
  };

  const pushSimMsg = (user: string, text: string) => {
    const isCorrect = norm(text) === target && target.length > 0;
    setChat((prev) => [...prev.slice(-49), { id: `${Date.now()}-${Math.random()}`, user, text, at: Date.now(), correct: isCorrect }]);
    if (isCorrect && !winner) declareWinner(user);
  };

  const start = () => {
    if (!keyword.trim()) return;
    setChat([]);
    setWinner(null);
    setFeedback(null);
    setRunning(true);
  };
  const stop = () => setRunning(false);

  const submitGuess = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setFeedback(null);

    const parsed = guessSchema.safeParse({ name: pName, code: pCode, guess: pGuess });
    if (!parsed.success) {
      const fe: any = {};
      parsed.error.issues.forEach((i) => { fe[i.path[0]] = i.message; });
      setErrors(fe);
      return;
    }
    if (!running) {
      setFeedback({ tone: "warn", msg: "A caça ainda não começou. Aguarda o anfitrião." });
      return;
    }
    if (parsed.data.code.toUpperCase() !== liveCode.toUpperCase()) {
      setErrors({ code: "Código da live incorreto" });
      return;
    }
    if (winner) {
      setFeedback({ tone: "warn", msg: `Já há vencedor: ${winner}.` });
      return;
    }

    const isCorrect = norm(parsed.data.guess) === target;
    setChat((prev) => [...prev.slice(-49), {
      id: `${Date.now()}-me`, user: parsed.data.name, text: parsed.data.guess, at: Date.now(), correct: isCorrect,
    }]);
    if (isCorrect) {
      declareWinner(parsed.data.name);
      setFeedback({ tone: "ok", msg: `🎉 Acertaste! Recebeste ${points} pts no leaderboard.` });
    } else {
      onScore?.(parsed.data.name, 5); // small participation bonus
      setFeedback({ tone: "err", msg: "Não foi dessa vez — tenta outra palavra." });
    }
    setPGuess("");
  };

  const inputErrCls = "border-destructive focus-visible:ring-destructive";

  return (
    <div className="rounded-3xl border border-border bg-card overflow-hidden">
      <div className="px-4 py-3 bg-gradient-to-r from-amber-500/15 to-orange-500/10 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-amber-500" />
          <h3 className="font-display text-sm font-bold">Caça à Palavra-Chave</h3>
        </div>
        <Sheet>
          <SheetTrigger asChild>
            <motion.button whileHover={{ scale: 1.05 }} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card border border-border text-[11px] font-medium hover:bg-secondary">
              <Settings2 className="h-3 w-3" /> Anfitrião
            </motion.button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto">
            <SheetHeader className="mb-3"><SheetTitle>Configurar Caça à Palavra</SheetTitle></SheetHeader>
            <div className="space-y-3 pb-6">
              <div>
                <Label className="text-xs">Palavra-chave secreta</Label>
                <Input value={keyword} onChange={(e) => setKeyword(e.target.value.slice(0, 40))} placeholder="Ex: BATEU" className="mt-1" maxLength={40} />
              </div>
              <div>
                <Label className="text-xs">Pista para a audiência</Label>
                <Textarea value={clue} onChange={(e) => setClue(e.target.value.slice(0, 240))} rows={3} className="mt-1" maxLength={240} />
              </div>
              <div>
                <Label className="text-xs">Pontos para o vencedor: {points}</Label>
                <Input type="number" min={10} max={500} step={10} value={points}
                  onChange={(e) => setPoints(Math.max(10, Math.min(500, Number(e.target.value) || 100)))}
                  className="mt-1" />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Código da live atual: <span className="font-mono font-bold text-primary">{liveCode}</span>
              </p>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <div className="p-4 space-y-3">
        <motion.div
          className="rounded-2xl bg-gradient-to-br from-amber-500/10 to-orange-500/5 border border-amber-500/20 p-4"
          animate={running ? {
            boxShadow: [
              "0 0 0px rgba(245,158,11,0), 0 0 12px rgba(245,158,11,0.25), 0 0 0px rgba(245,158,11,0)",
            ],
          } : { boxShadow: "0 0 0px rgba(245,158,11,0)" }}
          transition={running ? { repeat: Infinity, duration: 2, ease: "easeInOut" } : { duration: 0.3 }}
        >
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              <span className="text-[11px] font-bold uppercase tracking-wide text-amber-500">Pista</span>
            </div>
            <span className="text-[10px] text-muted-foreground">Vencedor: {points} pts</span>
          </div>
          <p className="text-sm text-foreground">{clue || "Sem pista definida."}</p>
          <AnimatePresence>
            {winner && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/15 text-emerald-500 text-xs font-bold shadow-[0_0_18px_rgba(16,185,129,0.35)]"
              >
                <Trophy className="h-3.5 w-3.5" /> {winner} venceu! Palavra: {keyword}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <div className="flex gap-2">
          {!running ? (
            <motion.button whileHover={{ scale: 1.03 }} onClick={start} className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-bold">
              <Play className="h-4 w-4" /> Iniciar caça
            </motion.button>
          ) : (
            <motion.button whileHover={{ scale: 1.03 }} onClick={stop} className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-full bg-destructive text-destructive-foreground text-sm font-bold">
              <Square className="h-4 w-4" /> Parar
            </motion.button>
          )}
        </div>

        <motion.form
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15, ease: "easeOut" }}
          onSubmit={submitGuess} className="rounded-2xl border border-border bg-background/50 p-3 space-y-2"
        >
          <div className="flex items-center gap-2 mb-1">
            <KeyRound className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-bold">Participar</span>
            <span className="ml-auto text-[10px] text-muted-foreground">
              Live: <span className="font-mono font-bold text-primary">{liveCode}</span>
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Input value={pName} onChange={(e) => setPName(e.target.value.slice(0, 40))} placeholder="Teu nome"
                className={`h-9 text-xs ${errors.name ? inputErrCls : ""}`} maxLength={40} />
              {errors.name && <p className="text-[10px] text-destructive mt-1">{errors.name}</p>}
            </div>
            <div>
              <Input value={pCode} onChange={(e) => setPCode(e.target.value.toUpperCase().slice(0, 10))} placeholder="Código da live"
                className={`h-9 text-xs font-mono ${errors.code ? inputErrCls : ""}`} maxLength={10} />
              {errors.code && <p className="text-[10px] text-destructive mt-1">{errors.code}</p>}
            </div>
          </div>
          <div className="flex gap-2">
            <Input value={pGuess} onChange={(e) => setPGuess(e.target.value.slice(0, 60))} placeholder="Escreve a palavra-chave..."
              className={`flex-1 h-9 text-xs ${errors.guess ? inputErrCls : ""}`} maxLength={60} />
            <motion.button whileHover={{ scale: 1.05 }} type="submit" className="px-4 rounded-md bg-primary text-primary-foreground inline-flex items-center gap-1.5 text-xs font-bold">
              <Send className="h-3.5 w-3.5" /> Enviar
            </motion.button>
          </div>
          {errors.guess && <p className="text-[10px] text-destructive">{errors.guess}</p>}
          <AnimatePresence>
            {feedback && (
              <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className={`flex items-center gap-1.5 text-[11px] px-2 py-1.5 rounded-md ${
                  feedback.tone === "ok" ? "bg-emerald-500/10 text-emerald-500" :
                  feedback.tone === "warn" ? "bg-amber-500/10 text-amber-600" :
                  "bg-destructive/10 text-destructive"
                }`}>
                {feedback.tone === "ok" ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
                {feedback.msg}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.form>

        <motion.div
          ref={scrollRef}
          className="h-48 rounded-2xl border border-border bg-background/50 p-3 overflow-y-auto space-y-1.5"
          animate={running ? {
            borderColor: [
              "hsl(var(--border))",
              "rgba(245,158,11,0.4)",
              "hsl(var(--border))",
            ],
          } : {}}
          transition={running ? { repeat: Infinity, duration: 3, ease: "easeInOut" } : { duration: 0.3 }}
        >
          <AnimatePresence initial={false}>
            {chat.map((m, index) => (
              <motion.div key={m.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: Math.min(index * 0.015, 0.12) }}
                className={`text-xs ${m.correct ? "font-bold text-emerald-500" : "text-foreground"}`}>
                <span className="text-muted-foreground mr-1">{m.user}:</span>
                {m.text}{m.correct && " ✅"}
              </motion.div>
            ))}
          </AnimatePresence>
          {chat.length === 0 && <p className="text-center text-[11px] text-muted-foreground py-8">O chat ao vivo aparecerá aqui quando a caça começar.</p>}
        </motion.div>
      </div>
    </div>
  );
};

export default KeywordHunt;
