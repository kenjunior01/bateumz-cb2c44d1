import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Star, Zap, Gift, Users, Flame } from "lucide-react";

interface ProofItem {
  id: number;
  icon: typeof Trophy;
  color: string;
  bg: string;
  message: string;
  time: string;
}

const NAMES = [
  "Joao M.", "Maria S.", "Carlos T.", "Ana L.", "Pedro N.", "Fatima K.",
  "Ricardo D.", "Beatriz F.", "Fernando A.", "Teresa C.", "Miguel R.", "Luisa B.",
  "Andre P.", "Cristina V.", "Hugo J.", "Natasha M.", "Diogo Q.", "Sofia G.",
];

const TEMPLATES = [
  { tpl: "{name} ganhou {amount} no {game}", icon: Trophy, color: "text-amber-400", bg: "from-amber-500/20 to-yellow-600/10 border-amber-500/30" },
  { tpl: "{name} entrou numa batalha de {game}", icon: Zap, color: "text-purple-400", bg: "from-purple-500/20 to-indigo-600/10 border-purple-500/30" },
  { tpl: "{name} completou o streak de {days} dias", icon: Flame, color: "text-orange-400", bg: "from-orange-500/20 to-red-600/10 border-orange-500/30" },
  { tpl: "{name} comprou {tickets} bilhetes no sorteio {game}", icon: Star, color: "text-pink-400", bg: "from-pink-500/20 to-rose-600/10 border-pink-500/30" },
  { tpl: "{name} fez um deposito de {amount}", icon: Gift, color: "text-emerald-400", bg: "from-emerald-500/20 to-teal-600/10 border-emerald-500/30" },
  { tpl: "{name} subiu para o nivel {level}", icon: Users, color: "text-cyan-400", bg: "from-cyan-500/20 to-blue-600/10 border-cyan-500/30" },
];

const GAMES = ["Galo VS", "Pong", "Bingo", "Milionario", "Roleta", "RPS", "Ligar 4", "Damas", "Quiz", "Xadrez"];
const AMOUNTS = ["25 MZN", "50 MZN", "100 MZN", "200 MZN", "500 MZN", "1.000 MZN", "2.500 MZN", "5.000 MZN"];
const TIMES = ["agora mesmo", "1 min atras", "2 min atras", "3 min atras", "5 min atras"];

let counter = 0;
function generateItem(): ProofItem {
  const t = TEMPLATES[Math.floor(Math.random() * TEMPLATES.length)];
  const name = NAMES[Math.floor(Math.random() * NAMES.length)];
  const game = GAMES[Math.floor(Math.random() * GAMES.length)];
  const amount = AMOUNTS[Math.floor(Math.random() * AMOUNTS.length)];
  const days = String(Math.floor(Math.random() * 25) + 3);
  const tickets = String(Math.floor(Math.random() * 10) + 1);
  const level = String(Math.floor(Math.random() * 7) + 3);
  const time = TIMES[Math.floor(Math.random() * TIMES.length)];

  const message = t.tpl
    .replace("{name}", name)
    .replace("{amount}", amount)
    .replace("{game}", game)
    .replace("{days}", days)
    .replace("{tickets}", tickets)
    .replace("{level}", level);

  return { id: counter++, icon: t.icon, color: t.color, bg: t.bg, message, time };
}

export default function SocialProofToasts() {
  const [items, setItems] = useState<ProofItem[]>([]);
  const [visible, setVisible] = useState(true);

  const dismiss = useCallback((id: number) => {
    setItems(prev => prev.filter(i => i.id !== id));
  }, []);

  useEffect(() => {
    const show = () => {
      const item = generateItem();
      setItems(prev => {
        const next = [...prev, item];
        if (next.length > 3) return next.slice(-3);
        return next;
      });
      const tid = window.setTimeout(() => {
        dismiss(item.id);
      }, 4500);
      return tid;
    };

    const first = window.setTimeout(show, 2000);
    const interval = window.setInterval(show, 8000 + Math.random() * 7000);

    return () => {
      window.clearTimeout(first);
      window.clearInterval(interval);
    };
  }, [dismiss]);

  if (!visible) return null;

  return (
    <div className="fixed bottom-20 lg:bottom-6 left-4 z-40 flex flex-col-reverse gap-2 max-w-xs pointer-events-none">
      <button
        onClick={() => setVisible(false)}
        className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-black/60 text-white/50 hover:text-white text-[10px] flex items-center justify-center pointer-events-auto"
        aria-label="Fechar"
      >
        x
      </button>
      <AnimatePresence>
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -80, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -80, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className={"pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl border backdrop-blur-xl bg-gradient-to-r " + item.bg + " shadow-lg cursor-pointer hover:scale-[1.02] transition-transform"}
              onClick={() => dismiss(item.id)}
            >
              <div className={"flex-shrink-0 h-8 w-8 rounded-lg bg-black/30 flex items-center justify-center " + item.color}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-foreground truncate leading-tight">{item.message}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{item.time}</p>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
