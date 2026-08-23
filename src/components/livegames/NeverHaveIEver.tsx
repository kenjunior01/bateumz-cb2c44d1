import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Hand, ThumbsUp, ThumbsDown, Shuffle, Plus, X, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  isHost?: boolean;
  onPublishStatement?: (statement: string) => void;
}

const DEFAULT_STATEMENTS = [
  "Já chorei assistindo um filme",
  "Já mandei mensagem errada pra pessoa errada",
  "Já falei sozinho na rua",
  "Já finji estar doente para não ir a algum lugar",
  "Já olhou no celular de alguém sem permissão",
  "Já comeu algo que caiu no chão (regra dos 5 segundos)",
  "Já fingiu que não viu alguém na rua",
  "Já deu bronca no cachorro do vizinho",
  "Já levou um susto com a própria sombra",
  "Já tentou cantar uma música alta e errou feio",
  "Já postou algo no Story e arrependeu 1 minuto depois",
  "Já dormiu e perdeu a parada do ônibus",
  'Já mandou "te amo" por acidente no grupo de trabalho',
  "Já foi a uma festa só pela comida",
  "Já chorou com um comercial de TV",
  "Já usou a mesma roupa 3 dias seguidos",
  "Já falou que ia dormir e ficou no celular até 4h",
  "Já deu uma desculpa ridícula para chegar atrasado",
  "Já esqueceu o nome de alguém no meio da conversa",
  "Já se perdeu num lugar que já tinha ido antes",
];

const COLORS = ["from-rose-500 to-pink-600", "from-violet-500 to-purple-600", "from-blue-500 to-indigo-600", "from-emerald-500 to-teal-600", "from-amber-500 to-orange-600"];

const NeverHaveIEver = ({ isHost = false, onPublishStatement }: Props) => {
  const [statements, setStatements] = useState<string[]>(DEFAULT_STATEMENTS);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [customInput, setCustomInput] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [votes, setVotes] = useState<Record<number, { yes: number; no: number }>>({});
  const [hasVoted, setHasVoted] = useState<Set<number>>(new Set());
  const [revealed, setRevealed] = useState(false);

  const current = statements[currentIndex];
  const currentVotes = votes[currentIndex] || { yes: 0, no: 0 };
  const totalVotes = currentVotes.yes + currentVotes.no;
  const yesPercent = totalVotes > 0 ? Math.round((currentVotes.yes / totalVotes) * 100) : 50;

  const nextStatement = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % statements.length);
    setRevealed(false);
  }, [statements.length]);

  const randomStatement = useCallback(() => {
    let next: number;
    do { next = Math.floor(Math.random() * statements.length); } while (next === currentIndex && statements.length > 1);
    setCurrentIndex(next);
    setRevealed(false);
  }, [statements.length, currentIndex]);

  const addCustom = () => {
    if (!customInput.trim()) return;
    const newStatements = [...statements, customInput.trim()];
    setStatements(newStatements);
    setCurrentIndex(newStatements.length - 1);
    setCustomInput("");
    setShowAdd(false);
    toast.success("Afirmação adicionada!");
    onPublishStatement?.(customInput.trim());
  };

  const handleVote = (vote: "yes" | "no") => {
    if (hasVoted.has(currentIndex)) return;
    const newHasVoted = new Set(hasVoted);
    newHasVoted.add(currentIndex);
    setHasVoted(newHasVoted);
    setRevealed(true);
    setVotes((prev) => ({
      ...prev,
      [currentIndex]: {
        yes: (prev[currentIndex]?.yes || 0) + (vote === "yes" ? 1 : 0),
        no: (prev[currentIndex]?.no || 0) + (vote === "no" ? 1 : 0),
      },
    }));
  };

  return (
    <div className="space-y-4">
      <div className={cn("relative rounded-3xl p-8 text-center text-white overflow-hidden", COLORS[currentIndex % COLORS.length])}>
        <div className="absolute inset-0 bg-black/10" />
        <div className="relative z-10">
          <Badge className="bg-white/20 backdrop-blur text-white border-0 text-[10px] mb-4">
            <Hand className="h-3 w-3 mr-1" /> Nunca Nunca
          </Badge>
          <AnimatePresence mode="wait">
            <motion.p
              key={currentIndex}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="text-xl md:text-2xl font-black leading-snug max-w-md mx-auto"
            >
              {current}
            </motion.p>
          </AnimatePresence>
          <p className="text-xs opacity-60 mt-4">
            {currentIndex + 1} de {statements.length}
          </p>
        </div>
      </div>

      {!revealed ? (
        <div className="grid grid-cols-2 gap-3">
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleVote("yes")}
            className="flex flex-col items-center gap-2 py-6 rounded-2xl bg-rose-500/10 border-2 border-rose-500/20 hover:border-rose-500/50 hover:bg-rose-500/20 transition-all"
            style={{ boxShadow: "0 0 15px rgba(244,63,94,0.15)" }}
          >
            <ThumbsUp className="h-8 w-8 text-rose-500" />
            <span className="text-sm font-bold text-rose-500">Já fiz!</span>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleVote("no")}
            className="flex flex-col items-center gap-2 py-6 rounded-2xl bg-blue-500/10 border-2 border-blue-500/20 hover:border-blue-500/50 hover:bg-blue-500/20 transition-all"
            style={{ boxShadow: "0 0 15px rgba(59,130,246,0.15)" }}
          >
            <ThumbsDown className="h-8 w-8 text-blue-500" />
            <span className="text-sm font-bold text-blue-500">Nunca!</span>
          </motion.button>
        </div>
      ) : (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            <div className="relative h-12 rounded-2xl overflow-hidden bg-blue-500/10">
              <div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-rose-500 to-pink-500 rounded-2xl transition-all duration-700 ease-out"
                style={{ width: `${yesPercent}%` }}
              />
              <div className="absolute inset-0 flex items-center justify-between px-4 text-sm font-bold">
                <span className="text-white drop-shadow">{yesPercent}%</span>
                <span className="text-white/80 drop-shadow">{totalVotes} votos</span>
              </div>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground px-1">
              <span className="text-rose-500 font-medium">❤️ Já fiz ({currentVotes.yes})</span>
              <span className="text-blue-500 font-medium">
                👎 Nunca ({currentVotes.no})</span>
            </div>
          </motion.div>
        </AnimatePresence>
      )}

      <div className="flex gap-2">
        <Button onClick={nextStatement} variant="outline" className="flex-1 rounded-xl">
          Próximo <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
        <Button onClick={randomStatement} variant="outline" className="rounded-xl gap-1">
          <Shuffle className="h-4 w-4" /> Aleatório
        </Button>
        {isHost && (
          <Button onClick={() => setShowAdd(!showAdd)} variant="outline" size="icon" className="rounded-xl">
            <Plus className="h-4 w-4" />
          </Button>
        )}
      </div>

      <AnimatePresence>
        {showAdd && isHost && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
          >
            <Card>
              <CardContent className="pt-4 space-y-2">
                <Input
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addCustom()}
                  placeholder="Escreva uma afirmação..."
                  maxLength={200}
                />
                <Button onClick={addCustom} size="sm" className="w-full rounded-xl">
                  <Sparkles className="h-4 w-4 mr-1" /> Adicionar
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NeverHaveIEver;