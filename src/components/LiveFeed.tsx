import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Ticket, Trophy } from "lucide-react";

const names = ["João S.", "Maria L.", "Carlos R.", "Ana P.", "Pedro M.", "Luísa F.", "Bruno G.", "Camila T.", "Rafael N.", "Juliana A."];
const prizes = ["Porsche 911 GT3", "iPhone 16 Pro Max", "Villa em Bali", "Setup Gamer", "MacBook Pro", "PS5 Pro"];
const actions = ["comprou 3 bilhetes", "comprou 1 bilhete", "comprou 5 bilhetes", "entrou no bolão", "comprou 2 bilhetes"];

interface FeedItem {
  id: number;
  name: string;
  action: string;
  prize: string;
  isWinner: boolean;
}

const LiveFeed = () => {
  const [items, setItems] = useState<FeedItem[]>([]);

  useEffect(() => {
    const addItem = () => {
      const isWinner = Math.random() > 0.85;
      setItems((prev) => [
        {
          id: Date.now(),
          name: names[Math.floor(Math.random() * names.length)],
          action: isWinner ? "ganhou" : actions[Math.floor(Math.random() * actions.length)],
          prize: prizes[Math.floor(Math.random() * prizes.length)],
          isWinner,
        },
        ...prev.slice(0, 4),
      ]);
    };
    addItem();
    const interval = setInterval(addItem, 3500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="glass rounded-2xl p-5">
      <div className="mb-4 flex items-center gap-2">
        <span className="h-2 w-2 animate-pulse-glow rounded-full bg-primary" />
        <span className="text-sm font-semibold text-foreground">Atividade ao Vivo</span>
      </div>
      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {items.map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -20, height: 0 }}
              animate={{ opacity: 1, x: 0, height: "auto" }}
              exit={{ opacity: 0, x: 20, height: 0 }}
              className={`flex items-center gap-3 rounded-xl p-3 text-sm ${
                item.isWinner ? "bg-accent/10 border border-accent/20" : "bg-secondary/50"
              }`}
            >
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                item.isWinner ? "bg-accent/20" : "bg-primary/10"
              }`}>
                {item.isWinner ? (
                  <Trophy className="h-4 w-4 text-accent" />
                ) : (
                  <Ticket className="h-4 w-4 text-primary" />
                )}
              </div>
              <div className="min-w-0">
                <span className="font-medium text-foreground">{item.name}</span>{" "}
                <span className="text-muted-foreground">
                  {item.action} — {item.prize}
                </span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default LiveFeed;
