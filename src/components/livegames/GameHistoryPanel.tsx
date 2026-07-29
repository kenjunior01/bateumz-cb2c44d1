import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Clock, Users, ChevronDown, ChevronUp, Gamepad2, RotateCcw, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface HistoryEntry {
  id: string;
  game_type: string;
  game_title: string;
  played_at: string;
  player_name: string;
  result: string;
  score?: number;
  details?: string;
}

interface GameHistoryPanelProps {
  businessId: string;
}

const TYPE_META: Record<string, { emoji: string; label: string; color: string }> = {
  spin: { emoji: "\u{1F3B2}", label: "Roleta", color: "text-amber-500" },
  millionaire: { emoji: "\u{1F4B0}", label: "Million\u00E1rio", color: "text-violet-500" },
  roulette: { emoji: "\u{1F3AF}", label: "Desafio", color: "text-pink-500" },
  bingo: { emoji: "\u{1F3B0}", label: "Bingo", color: "text-emerald-500" },
  quiz: { emoji: "\u{1F9E0}", label: "Quiz", color: "text-blue-500" },
  tap: { emoji: "\u{1F4AA}", label: "Tap Battle", color: "text-orange-500" },
};

export default function GameHistoryPanel({ businessId }: GameHistoryPanelProps) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const loadHistory = async () => {
    if (loaded) return;
    setLoading(true);

    const { data: spinHistory } = await supabase
      .from("spin_wheel_plays")
      .select("id, created_at, player_name, result_segment_label, spin_wheel_game_id")
      .eq("business_user_id", businessId)
      .order("created_at", { ascending: false })
      .limit(50);

    const { data: millHistory } = await supabase
      .from("millionaire_game_plays")
      .select("id, created_at, player_name, prize_won, final_prize_level, millionaire_game_id")
      .eq("business_user_id", businessId)
      .order("created_at", { ascending: false })
      .limit(50);

    const entries: HistoryEntry[] = [];

    if (spinHistory) {
      for (const p of spinHistory) {
        entries.push({
          id: p.id,
          game_type: "spin",
          game_title: "Roleta Premiada",
          played_at: p.created_at,
          player_name: p.player_name || "An\u00F3nimo",
          result: p.result_segment_label || "Sem resultado",
          score: undefined,
          details: p.result_segment_label,
        });
      }
    }

    if (millHistory) {
      for (const p of millHistory) {
        entries.push({
          id: p.id,
          game_type: "millionaire",
          game_title: "Million\u00E1rio",
          played_at: p.created_at,
          player_name: p.player_name || "An\u00F3nimo",
          result: p.prize_won ? "Ganhou!" : "Perdeu",
          score: p.final_prize_level || 0,
          details: p.prize_won ? `N\u00EDvel ${p.final_prize_level || 0}` : undefined,
        });
      }
    }

    entries.sort((a, b) => new Date(b.played_at).getTime() - new Date(a.played_at).getTime());
    setHistory(entries);
    setLoading(false);
    setLoaded(true);
  };

  const toggleExpand = (id: string) => {
    if (!loaded) loadHistory();
    setExpanded((prev) => (prev === id ? null : id));
  };

  const stats = {
    totalPlays: history.length,
    wins: history.filter((h) => h.result === "Ganhou!" || h.result !== "Sem resultado").length,
    uniquePlayers: new Set(history.map((h) => h.player_name)).size,
  };

  return (
    <div className="space-y-3">
      <button
        onClick={() => toggleExpand("history")}
        className="w-full flex items-center justify-between p-4 rounded-2xl border border-border hover:border-primary/30 transition-all bg-card"
      >
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
            <RotateCcw className="h-5 w-5 text-primary" />
          </div>
          <div className="text-left">
            <h3 className="text-sm font-bold">Hist\u00F3rico de Jogos</h3>
            <p className="text-[11px] text-muted-foreground">Todas as jogadas e resultados</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-[10px]">
            <Zap className="h-3 w-3 mr-0.5" /> {stats.totalPlays} jogadas
          </Badge>
          {expanded === "history" ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
      </button>

      <AnimatePresence>
        {expanded === "history" && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : history.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-8 text-center">
                  <Gamepad2 className="h-10 w-10 mx-auto text-muted-foreground/30 mb-2" />
                  <p className="text-sm text-muted-foreground">Nenhum jogo registrado ainda</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="text-center p-2.5 rounded-xl bg-primary/5 border border-primary/10">
                    <p className="text-lg font-black text-primary">{stats.totalPlays}</p>
                    <p className="text-[10px] text-muted-foreground">Jogadas</p>
                  </div>
                  <div className="text-center p-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                    <p className="text-lg font-black text-emerald-500">{stats.wins}</p>
                    <p className="text-[10px] text-muted-foreground">Vit\u00F3rias</p>
                  </div>
                  <div className="text-center p-2.5 rounded-xl bg-blue-500/5 border border-blue-500/10">
                    <p className="text-lg font-black text-blue-500">{stats.uniquePlayers}</p>
                    <p className="text-[10px] text-muted-foreground">Jogadores</p>
                  </div>
                </div>
                <div className="max-h-80 overflow-y-auto space-y-1.5 pr-1">
                  {history.map((entry, i) => {
                    const meta = TYPE_META[entry.game_type] || TYPE_META.spin;
                    const isWin = entry.result === "Ganhou!" || entry.details;
                    return (
                      <motion.div
                        key={entry.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className={`flex items-center gap-2.5 p-2.5 rounded-xl border transition-all ${
                          isWin ? "border-emerald-500/20 bg-emerald-500/5" : "border-border bg-card"
                        }`}
                      >
                        <span className="text-lg shrink-0">{meta.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold truncate">{entry.player_name}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{entry.details || entry.result}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <Badge variant={isWin ? "default" : "secondary"} className={`text-[9px] h-5 ${isWin ? "bg-emerald-500 text-white" : ""}`}>
                            {isWin ? entry.result : "-"}
                          </Badge>
                          <p className="text-[9px] text-muted-foreground mt-0.5 flex items-center justify-end gap-0.5">
                            <Clock className="h-2.5 w-2.5" /> {new Date(entry.played_at).toLocaleDateString("pt-MZ", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
