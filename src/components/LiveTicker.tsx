import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Trophy, Ticket } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";

interface TickerItem {
  id: string;
  text: string;
  kind: "buy" | "win";
}

const LiveTicker = () => {
  const [items, setItems] = useState<TickerItem[]>([]);
  const { t } = useLanguage();
  useEffect(() => {
    const load = async () => {
      const { data: parts } = await supabase
        .from("participants")
        .select("id, ticket_number, status, raffle_id, created_at")
        .order("created_at", { ascending: false })
        .limit(15);
      if (!parts || parts.length === 0) return;

      const ids = [...new Set(parts.map((p) => p.raffle_id))];
      const { data: raffles } = await supabase
        .from("raffles")
        .select("id, title")
        .in("id", ids);
      const map = new Map(raffles?.map((r) => [r.id, r.title]) || []);

      const mapped: TickerItem[] = parts.map((p) => ({
        id: p.id,
        kind: p.status === "winner" ? "win" : "buy",
        text:
          p.status === "winner"
            ? `🏆 Ticket #${p.ticket_number} won in "${map.get(p.raffle_id) ?? "raffle"}"`
            : `🎟️ Someone bought ticket #${p.ticket_number} in "${map.get(p.raffle_id) ?? "raffle"}"`,
      }));
      setItems(mapped);
    };
    load();
  }, []);

  if (items.length === 0) return null;

  // duplicate to create seamless loop
  const loop = [...items, ...items];

  return (
    <div className="w-full bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 border-y border-border/60 overflow-hidden">
      <div className="container mx-auto px-3 py-1.5 flex items-center gap-3">
        <div className="flex items-center gap-1.5 shrink-0 text-[10px] font-bold uppercase tracking-wider text-primary">
          <span className="relative inline-flex h-2 w-2 rounded-full bg-primary shadow-[0_0_6px_hsl(var(--primary)/0.5)]" />
          {t("ticker.live")}
        </div>
        <div className="flex-1 overflow-hidden relative">
          <motion.div
            className="flex gap-8 whitespace-nowrap text-xs text-foreground/80 motion-reduce:!transform-none"
            animate={{ x: ["0%", "-50%"] }}
            transition={{ duration: items.length * 8, ease: "linear", repeat: Infinity }}
          >
            {loop.map((it, i) => (
              <span key={`${it.id}-${i}`} className="flex items-center gap-1.5">
                {it.kind === "win" ? (
                  <Trophy className="h-3 w-3 text-accent" />
                ) : (
                  <Ticket className="h-3 w-3 text-primary" />
                )}
                {it.text}
              </span>
            ))}
          </motion.div>
        </div>
        <Sparkles className="h-3 w-3 text-accent shrink-0 hidden sm:block" />
      </div>
    </div>
  );
};

export default LiveTicker;
