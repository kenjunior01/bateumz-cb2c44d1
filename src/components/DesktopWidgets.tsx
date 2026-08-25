import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { TrendingUp, Trophy, Flame, Timer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import LiveFeed from "./LiveFeed";
import BlogNewsWidget from "./BlogNewsWidget";

interface TopRaffle {
  id: string;
  title: string;
  sold_tickets: number;
  total_tickets: number;
}

const DesktopWidgets = () => {
  const [topRaffles, setTopRaffles] = useState<TopRaffle[]>([]);
  const [stats, setStats] = useState({ totalPrizes: 0, totalWinners: 0 });

  useEffect(() => {
    const fetchData = async () => {
      const [rafflesRes, winnersRes] = await Promise.all([
        supabase.from("raffles").select("id, title, sold_tickets, total_tickets").eq("status", "active").order("sold_tickets", { ascending: false }).limit(3),
        supabase.from("participants").select("id", { count: "exact", head: true }).eq("status", "winner"),
      ]);
      if (rafflesRes.data) setTopRaffles(rafflesRes.data);
      setStats({
        totalPrizes: rafflesRes.data?.length || 0,
        totalWinners: winnersRes.count || 0,
      });
    };
    fetchData();
  }, []);

  return (
    <div className="space-y-4">
      <LiveFeed />

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="glass rounded-2xl p-5 shadow-[0_0_10px_hsl(var(--primary)/0.08)]">
        <div className="mb-4 flex items-center gap-2">
          <Flame className="h-4 w-4 text-accent" />
          <span className="text-sm font-semibold text-foreground">Em Alta</span>
        </div>
        <div className="space-y-3">
          {topRaffles.map((r, i) => {
            const pct = r.total_tickets > 0 ? (r.sold_tickets / r.total_tickets) * 100 : 0;
            return (
              <div key={r.id} className="flex items-center gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/10 text-[10px] font-bold text-accent">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{r.title}</p>
                  <div className="mt-1 h-1.5 w-full rounded-full bg-secondary">
                    <div className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
                <span className="text-xs font-mono text-muted-foreground">{pct.toFixed(0)}%</span>
              </div>
            );
          })}
          {topRaffles.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-2">Nenhum sorteio ativo</p>
          )}
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <BlogNewsWidget />
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="glass rounded-2xl p-5 shadow-[0_0_10px_hsl(var(--primary)/0.08)]">
        <div className="mb-3 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Estatísticas</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-primary/10 p-3 text-center">
            <Trophy className="h-4 w-4 text-accent mx-auto mb-1" />
            <p className="font-display text-lg font-bold text-foreground">{stats.totalWinners}</p>
            <p className="text-[10px] text-muted-foreground">Vencedores</p>
          </div>
          <div className="rounded-xl bg-accent/10 p-3 text-center">
            <Timer className="h-4 w-4 text-primary mx-auto mb-1" />
            <p className="font-display text-lg font-bold text-foreground">{topRaffles.length}</p>
            <p className="text-[10px] text-muted-foreground">Sorteios Ativos</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default DesktopWidgets;
