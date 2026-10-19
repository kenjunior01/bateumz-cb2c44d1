// ═══════════════════════════════════════════════════════════════
//  RAIL "CONTINUAR A JOGAR" — quem volta, retoma onde ficou.
//
//  Padrão REA (Reverse Engineer Anything): o "Continue Playing"
//  de Steam/Roblox, reconstruído do zero sobre o registo local de
//  progressão (Bateu Pro Kit) — só aparece quando o jogador já
//  jogou pelo menos uma vez. Zero falsos dados.
// ═══════════════════════════════════════════════════════════════
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { History, ChevronRight, Flame } from "lucide-react";
import { ALL_GAMES, recentGames, playsOf, bestOf, weeklyPopular } from "@/lib/gamesCatalog";
import GameArt from "@/components/games/GameArt";

const GRADS: Record<string, string> = ALL_GAMES.reduce((m, g) => { m[g.id] = g.grad; return m; }, {} as Record<string, string>);

export default function ContinuePlayRail() {
  const [games, setGames] = useState<typeof ALL_GAMES>(() => recentGames(8));

  useEffect(() => {
    setGames(recentGames(8));
  }, []);

  if (games.length === 0) return null;

  const hot = new Set(weeklyPopular(4).map((g) => g.id));

  return (
    <section
      data-testid="home-continuar-jogar"
      className="relative w-full max-w-6xl mx-auto px-4 sm:px-6 py-6"
      aria-label="Continuar a jogar"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="h-8 w-8 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, rgba(46,160,67,0.2), rgba(88,166,255,0.12))", border: "1px solid rgba(46,160,67,0.3)" }}>
            <History className="h-4 w-4" style={{ color: "#2ea043" }} />
          </span>
          <div>
            <h2 className="text-sm font-black text-white tracking-tight leading-none">Continuar a Jogar</h2>
            <p className="text-[10px] text-zinc-500 mt-1">Retoma onde ficaste — o teu progresso fica guardado</p>
          </div>
        </div>
        <Link to="/jogos" className="flex items-center gap-0.5 text-[11px] font-bold text-zinc-400 hover:text-white transition-colors">
          Ver todos <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none" style={{ scrollbarWidth: "none" }}>
        {games.map((g, i) => {
          const plays = playsOf(g.id);
          const best = bestOf(g.id);
          return (
            <motion.div
              key={g.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="shrink-0 w-[150px] sm:w-[170px]"
            >
              <Link
                to={`/lives?game=${g.id}`}
                data-testid={`continuar-card-${g.id}`}
                className="group block rounded-2xl overflow-hidden transition-transform hover:-translate-y-0.5"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
              >
                <div className={`relative h-[74px] overflow-hidden bg-gradient-to-br ${GRADS[g.id] || "from-zinc-700 to-zinc-900"}`}>
                  <GameArt id={g.id} className="w-full h-full transition-transform duration-300 group-hover:scale-105" animate={false} />
                  {hot.has(g.id) && (
                    <span className="absolute top-1.5 right-1.5 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-black/55 backdrop-blur text-[8px] font-black text-orange-300">
                      <Flame className="h-2.5 w-2.5" /> EM ALTA
                    </span>
                  )}
                </div>
                <div className="p-2.5">
                  <p className="text-xs font-bold text-white truncate">{g.label}</p>
                  <p className="text-[10px] text-zinc-500 mt-0.5">
                    {best > 0 ? <>Melhor: <span className="text-amber-400 font-bold">{best.toLocaleString("pt-PT")}</span></> : "Primeira partida"}
                    {plays > 0 && <span className="text-zinc-600"> · {plays}×</span>}
                  </p>
                  <div className="mt-2 flex items-center justify-center gap-1 rounded-lg py-1.5 text-[10px] font-black text-white transition-opacity group-hover:opacity-90" style={{ background: "linear-gradient(90deg, #2ea043, #1a7f37)" }}>
                    CONTINUAR ▶
                  </div>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
