import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Ticket, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const fallbackNames = ["João S.", "Maria L.", "Carlos R.", "Ana P.", "Pedro M.", "Luísa F.", "Bruno G.", "Camila T."];
const fallbackPrizes = ["Porsche 911 GT3", "iPhone 16 Pro Max", "Villa em Bali", "Setup Gamer"];
const fallbackActions = ["comprou 3 bilhetes", "comprou 1 bilhete", "comprou 5 bilhetes", "entrou no bolão", "comprou 2 bilhetes"];

interface FeedItem {
  id: number;
  name: string;
  action: string;
  prize: string;
  isWinner: boolean;
}

const LiveFeed = () => {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [realData, setRealData] = useState<{ name: string; action: string; prize: string; isWinner: boolean }[]>([]);

  useEffect(() => {
    // Fetch recent activity from DB
    const fetchActivity = async () => {
      const { data: recentParticipants } = await supabase
        .from("participants")
        .select("ticket_number, status, raffle_id, created_at")
        .order("created_at", { ascending: false })
        .limit(20);

      if (recentParticipants && recentParticipants.length > 0) {
        const raffleIds = [...new Set(recentParticipants.map((p) => p.raffle_id))];
        const { data: raffles } = await supabase
          .from("raffles")
          .select("id, title")
          .in("id", raffleIds);
        
        const raffleMap = new Map(raffles?.map((r) => [r.id, r.title]) || []);
        
        const mapped = recentParticipants.map((p) => ({
          name: `Participante #${p.ticket_number}`,
          action: p.status === "winner" ? "ganhou" : "comprou bilhete",
          prize: raffleMap.get(p.raffle_id) || "Sorteio",
          isWinner: p.status === "winner",
        }));
        setRealData(mapped);
      }
    };
    fetchActivity();
  }, []);

  useEffect(() => {
    let idx = 0;
    const addItem = () => {
      const useReal = realData.length > 0 && idx < realData.length;
      const data = useReal
        ? realData[idx++]
        : {
            name: fallbackNames[Math.floor(Math.random() * fallbackNames.length)],
            action: Math.random() > 0.85 ? "ganhou" : fallbackActions[Math.floor(Math.random() * fallbackActions.length)],
            prize: fallbackPrizes[Math.floor(Math.random() * fallbackPrizes.length)],
            isWinner: Math.random() > 0.85,
          };
      
      setItems((prev) => [{ id: Date.now(), ...data }, ...prev.slice(0, 4)]);
    };
    addItem();
    const interval = setInterval(addItem, 3500);
    return () => clearInterval(interval);
  }, [realData]);

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
                {item.isWinner ? <Trophy className="h-4 w-4 text-accent" /> : <Ticket className="h-4 w-4 text-primary" />}
              </div>
              <div className="min-w-0">
                <span className="font-medium text-foreground">{item.name}</span>{" "}
                <span className="text-muted-foreground">{item.action} — {item.prize}</span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default LiveFeed;
