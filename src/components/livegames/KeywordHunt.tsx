import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Sparkles, Send, Trophy, Settings2, Play, Square } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type ChatMsg = { id: string; user: string; text: string; at: number; correct?: boolean };

interface Props {
  onScore?: (name: string, score: number) => void;
  onWinner?: (name: string, keyword: string) => void;
}

const SIM_USERS = ["Zito", "Inês", "Mauro", "Carla", "Bento", "Júlia", "Tó", "Nina", "Rico", "Sami"];
const NOISE = ["belo!", "boa live", "vamooo", "🔥🔥", "salve a empresa", "qual é a palavra?", "vou ganhar", "que prémio?", "👀", "manda mais dica"];

const KeywordHunt = ({ onScore, onWinner }: Props) => {
  const [keyword, setKeyword] = useState("BATEU");
  const [clue, setClue] = useState("Sinónimo de 'acertou' em moçambicano 😉");
  const [running, setRunning] = useState(false);
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [winner, setWinner] = useState<string | null>(null);
  const [myName, setMyName] = useState("");
  const [myMsg, setMyMsg] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const norm = (s: string) => s.trim().toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
  const target = useMemo(() => norm(keyword), [keyword]);

  // Simulated chat stream
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      const u = SIM_USERS[Math.floor(Math.random() * SIM_USERS.length)];
      // 18% chance of correct guess
      const correct = Math.random() < 0.18;
      const text = correct ? keyword : NOISE[Math.floor(Math.random() * NOISE.length)];
      pushMsg(u, text);
    }, 1100);
    return () => clearInterval(id);
  }, [running, keyword]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [chat]);

  const pushMsg = (user: string, text: string) => {
    const isCorrect = norm(text) === target && target.length > 0;
    setChat((prev) => [...prev.slice(-49), { id: `${Date.now()}-${Math.random()}`, user, text, at: Date.now(), correct: isCorrect }]);
    if (isCorrect && !winner) {
      setWinner(user);
      setRunning(false);
      onScore?.(user, 100);
      onWinner?.(user, keyword);
    }
  };

  const start = () => {
    if (!keyword.trim()) return;
    setChat([]);
    setWinner(null);
    setRunning(true);
  };
  const stop = () => setRunning(false);

  const sendMine = (e: React.FormEvent) => {
    e.preventDefault();
    if (!myMsg.trim()) return;
    pushMsg(myName.trim() || "Eu", myMsg);
    setMyMsg("");
  };

  return (
    <div className="rounded-3xl border border-border bg-card overflow-hidden">
      <div className="px-4 py-3 bg-gradient-to-r from-amber-500/15 to-orange-500/10 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-amber-500" />
          <h3 className="font-display text-sm font-bold">Caça à Palavra-Chave</h3>
        </div>
        <Sheet>
          <SheetTrigger asChild>
            <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card border border-border text-[11px] font-medium hover:bg-secondary">
              <Settings2 className="h-3 w-3" /> Configurar
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-3xl">
            <SheetHeader className="mb-3"><SheetTitle>Configurar Caça à Palavra</SheetTitle></SheetHeader>
            <div className="space-y-3 pb-6">
              <div>
                <Label className="text-xs">Palavra-chave secreta</Label>
                <Input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="Ex: BATEU" className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Pista para a audiência</Label>
                <Textarea value={clue} onChange={(e) => setClue(e.target.value)} rows={3} className="mt-1" />
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <div className="p-4 space-y-3">
        <div className="rounded-2xl bg-gradient-to-br from-amber-500/10 to-orange-500/5 border border-amber-500/20 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            <span className="text-[11px] font-bold uppercase tracking-wide text-amber-500">Pista</span>
          </div>
          <p className="text-sm text-foreground">{clue || "Sem pista definida."}</p>
          {winner && (
            <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/15 text-emerald-500 text-xs font-bold">
              <Trophy className="h-3.5 w-3.5" /> {winner} venceu! Palavra: {keyword}
            </div>
          )}
        </div>

        <div className="flex gap-2">
          {!running ? (
            <button onClick={start} className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-bold">
              <Play className="h-4 w-4" /> Iniciar caça
            </button>
          ) : (
            <button onClick={stop} className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-full bg-destructive text-destructive-foreground text-sm font-bold">
              <Square className="h-4 w-4" /> Parar
            </button>
          )}
        </div>

        <div ref={scrollRef} className="h-56 rounded-2xl border border-border bg-background/50 p-3 overflow-y-auto space-y-1.5">
          <AnimatePresence initial={false}>
            {chat.map((m) => (
              <motion.div key={m.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={`text-xs ${m.correct ? "font-bold text-emerald-500" : "text-foreground"}`}>
                <span className="text-muted-foreground mr-1">{m.user}:</span>
                {m.text}{m.correct && " ✅"}
              </motion.div>
            ))}
          </AnimatePresence>
          {chat.length === 0 && <p className="text-center text-[11px] text-muted-foreground py-8">O chat simulado começa quando iniciares a caça.</p>}
        </div>

        <form onSubmit={sendMine} className="flex gap-2">
          <Input value={myName} onChange={(e) => setMyName(e.target.value)} placeholder="Teu nome" className="w-28 h-9 text-xs" />
          <Input value={myMsg} onChange={(e) => setMyMsg(e.target.value)} placeholder="Escreve no chat..." className="flex-1 h-9 text-xs" />
          <button type="submit" className="px-3 rounded-md bg-primary text-primary-foreground"><Send className="h-4 w-4" /></button>
        </form>
      </div>
    </div>
  );
};

export default KeywordHunt;
