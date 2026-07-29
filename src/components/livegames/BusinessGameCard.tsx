import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Clock, Play } from "lucide-react";

interface Game {
  id: string;
  title: string;
  type: string;
  is_active: boolean;
  created_at: string;
  description: string | null;
  cover_image_url: string | null;
  player_count?: number;
  total_plays?: number;
}

const GAME_META: Record<string, { emoji: string; label: string; grad: string; route: string }> = {
  spin: { emoji: "\u{1F3B2}", label: "Roleta", grad: "from-amber-500 to-orange-600", route: "spin-wheel" },
  millionaire: { emoji: "\u{1F4B0}", label: "Million\u00E1rio", grad: "from-violet-500 to-purple-600", route: "millionaire" },
  roulette: { emoji: "\u{1F3AF}", label: "Desafios", grad: "from-pink-500 to-rose-600", route: "roulette" },
  bingo: { emoji: "\u{1F3B0}", label: "Bingo", grad: "from-emerald-500 to-teal-600", route: "bingo" },
  quiz: { emoji: "\u{1F9E0}", label: "Quiz", grad: "from-blue-500 to-indigo-600", route: "quiz" },
};

export default function BusinessGameCard({ game, index, onClick }: { game: Game; index: number; onClick: () => void }) {
  const meta = GAME_META[game.type] || { emoji: "\u{1F3AE}", label: "Jogo", grad: "from-primary to-accent", route: "spin-wheel" };
  const dateStr = new Date(game.created_at).toLocaleDateString("pt-MZ", { day: "2-digit", month: "short" });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.06, type: "spring", stiffness: 280, damping: 24 }}
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className="cursor-pointer"
    >
      <Card className="h-full overflow-hidden transition-all duration-300 hover:border-primary/40 hover:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3),0_0_30px_rgba(251,191,36,0.1)] hover:-translate-y-1 game-card-3d game-shimmer border-morph">
        <div className={`h-1.5 bg-gradient-to-r ${meta.grad}`} />
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${meta.grad} flex items-center justify-center text-2xl shrink-0 shadow-lg`}>
              {meta.emoji}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold line-clamp-1">{game.title}</h3>
              <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{game.description || "Jogo interativo ao vivo"}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant={game.is_active ? "default" : "secondary"} className={`text-[9px] h-5 px-1.5 ${game.is_active ? "bg-emerald-500 text-white" : ""}`}>
                  {game.is_active ? "Ativo" : "Inativo"}
                </Badge>
                <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                  <Clock className="h-3 w-3" /> {dateStr}
                </span>
              </div>
              {game.total_plays !== undefined && game.total_plays > 0 && (
                <div className="flex items-center gap-1 mt-1.5 text-[10px] text-muted-foreground">
                  <Users className="h-3 w-3" /> {game.total_plays} jogadas
                </div>
              )}
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{meta.label}</span>
            <div className={`h-8 w-8 rounded-full bg-gradient-to-br ${meta.grad} flex items-center justify-center shadow-md`}>
              <Play className="h-3.5 w-3.5 text-white ml-0.5" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
