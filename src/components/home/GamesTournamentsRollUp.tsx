import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Trophy, Users, Gamepad2, Crown, Clock, LayoutGrid } from "lucide-react";
import RollUp from "./RollUp";
import GameArt from "@/components/games/GameArt";
import { getTournaments, type Tournament } from "@/lib/tournaments";
import { supabase } from "@/integrations/supabase/client";

/**
 * GamesTournamentsRollUp — Jogos populares + Torneios reais num só roll-up.
 * Dados reais do Supabase; se não houver torneios, mostra só os jogos (honesto).
 */

const ACCENT = { cyan: "#00d4ff", purple: "#a855f7", green: "#2ea043", gold: "#fbbf24" };

/** jogos mais jogados — curadoria fixa, links reais do catálogo */
const POPULAR_GAMES = [
  { id: "ludo", label: "Ludo", emoji: "🎲", desc: "O clássico de 4 jogadores", grad: "linear-gradient(140deg,#065f46,#0d9488)" },
  { id: "dominoes", label: "Domino", emoji: "🁫", desc: "Encaixa as peças e esvazia a mão", grad: "linear-gradient(140deg,#3f3f46,#18181b)" },
  { id: "chess", label: "Xadrez", emoji: "♚", desc: "Roque, en passant e checkmate", grad: "linear-gradient(140deg,#334155,#0f172a)" },
  { id: "uno", label: "UNO Cartas", emoji: "🃏", desc: "Cores, especiais e grita UNO!", grad: "linear-gradient(140deg,#4c1d95,#7c3aed)" },
  { id: "battleroyale", label: "Battle Royale", emoji: "🎯", desc: "40 jogadores, zona a fechar", grad: "linear-gradient(140deg,#b45309,#dc2626)" },
  { id: "millionaire", label: "Quem Quer Ser Milionário?", emoji: "💰", desc: "Chega ao prémio máximo", grad: "linear-gradient(140deg,#6d28d9,#8b5cf6)" },
  { id: "checkers", label: "Damas", emoji: "♟️", desc: "Capturas e promoção a rei", grad: "linear-gradient(140deg,#92400e,#c2410c)" },
  { id: "bingo", label: "Bingo ao Vivo", emoji: "🎱", desc: "Números sorteados em tempo real", grad: "linear-gradient(140deg,#047857,#10b981)" },
  { id: "rpgarena", label: "RPG Arena", emoji: "⚔️", desc: "Guerreiro, Mago, Arqueiro, Ladino", grad: "linear-gradient(140deg,#7f1d1d,#6b21a8)" },
  { id: "quiz", label: "Quiz Battle", emoji: "🧠", desc: "Trivia ao vivo com amigos", grad: "linear-gradient(140deg,#0369a1,#0ea5e9)" },
  { id: "mmorpg", label: "Bateu World 3D", emoji: "🌍", desc: "O MMO oficial da Bateu", grad: "linear-gradient(140deg,#9f1239,#f59e0b)" },
];

interface TourCard {
  id: string;
  name: string;
  prize: string;
  end: string;
  players: number | null;
}

export default function GamesTournamentsRollUp() {
  const navigate = useNavigate();
  const [tours, setTours] = useState<TourCard[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const ts: Tournament[] = await getTournaments("active");
        if (!alive || !ts || ts.length === 0) return;
        const cards: TourCard[] = await Promise.all(
          ts.slice(0, 5).map(async (t) => {
            let players: number | null = null;
            try {
              const { count } = await (supabase as any)
                .from("tournament_standings")
                .select("id", { count: "exact", head: true })
                .eq("tournament_id", t.id);
              if (typeof count === "number") players = count;
            } catch { /* opcional */ }
            return {
              id: t.id,
              name: t.name,
              prize: t.prize_description || (t.prize_value ? `${t.prize_value} ${t.currency || "MT"}` : "Prémio a definir"),
              end: t.end_date ? new Date(t.end_date).toLocaleDateString("pt-PT", { day: "2-digit", month: "short" }) : "",
              players,
            };
          })
        );
        if (alive && cards.length) setTours(cards);
      } catch { /* sem torneios → fica só jogos */ }
    })();
    return () => { alive = false; };
  }, []);

  return (
    <RollUp
      kicker="Jogos & Torneios"
      title="Joga agora ou entra num torneio"
      subtitle={tours.length > 0 ? `${POPULAR_GAMES.length} jogos em destaque · ${tours.length} torneio(s) ativo(s)` : `${POPULAR_GAMES.length} jogos em destaque · 80+ no catálogo`}
      accent={ACCENT.purple}
      viewAllHref="/jogos"
      viewAllLabel="Ver os 80+ jogos"
    >
      {/* ── Torneios reais primeiro ── */}
      {tours.map((t, i) => (
        <motion.article
          key={t.id}
          initial={{ opacity: 0, scale: 0.96 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ delay: Math.min(i * 0.04, 0.2), duration: 0.4 }}
          className="relative shrink-0 snap-start w-[70vw] max-w-[290px] sm:w-[30%] md:w-[24%] lg:w-[21%] rounded-3xl overflow-hidden cursor-pointer group p-5"
          style={{
            background: "linear-gradient(145deg, #1a0526 0%, #2b0a42 60%, #35104f 100%)",
            border: `1px solid ${ACCENT.gold}30`,
            minHeight: 230,
            boxShadow: "0 12px 40px rgba(0,0,0,0.45)",
          }}
          onClick={() => navigate("/esports")}
          role="link"
          aria-label={`Torneio ${t.name}`}
        >
          <div className="absolute -top-8 -right-8 h-28 w-28 rounded-full blur-3xl opacity-60" style={{ background: "rgba(251,191,36,0.25)" }} />

          <div className="relative flex flex-col h-full" style={{ minHeight: 190 }}>
            <div className="flex items-center justify-between mb-3">
              <span className="inline-flex items-center gap-1.5 text-[9px] font-black tracking-[0.14em] px-2.5 py-1 rounded-full" style={{ color: ACCENT.gold, background: `${ACCENT.gold}14`, border: `1px solid ${ACCENT.gold}33` }}>
                <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: ACCENT.gold }} />
                TORNEIO ATIVO
              </span>
              <Trophy className="h-5 w-5" style={{ color: ACCENT.gold }} />
            </div>

            <h3 className="text-lg font-black text-white leading-snug line-clamp-2">{t.name}</h3>

            <div className="mt-2 flex items-center gap-1.5 text-sm font-bold" style={{ color: ACCENT.gold }}>
              <Crown className="h-4 w-4" />
              <span className="truncate">{t.prize}</span>
            </div>

            <div className="mt-auto pt-3 flex items-center gap-3 text-[11px] text-zinc-400">
              {t.players !== null && (
                <span className="inline-flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" /> {t.players} participante{t.players === 1 ? "" : "s"}
                </span>
              )}
              {t.end && (
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" /> até {t.end}
                </span>
              )}
            </div>
          </div>
          <div className="absolute bottom-0 inset-x-0 h-[3px]" style={{ background: `linear-gradient(90deg, ${ACCENT.gold}, transparent 70%)` }} />
        </motion.article>
      ))}

      {/* ── Jogos populares ── */}
      {POPULAR_GAMES.map((g, i) => (
        <motion.article
          key={g.id}
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ delay: Math.min(i * 0.03, 0.2), duration: 0.35 }}
          className="relative shrink-0 snap-start w-[42vw] max-w-[185px] sm:w-[23%] md:w-[18%] lg:w-[15.5%] rounded-3xl overflow-hidden cursor-pointer group"
          style={{ background: g.grad, border: "1px solid rgba(255,255,255,0.09)", minHeight: 230, boxShadow: "0 10px 32px rgba(0,0,0,0.4)" }}
          onClick={() => navigate(`/lives?game=${g.id}`)}
          role="link"
          aria-label={`Jogar ${g.label}`}
        >
          <div className="relative flex flex-col" style={{ minHeight: 230 }}>
            {/* ARTE do jogo — padrão CrazyGames, sem emojis soltos */}
            <div className="relative h-[108px] -mx-px -mt-px overflow-hidden" style={{ borderRadius: "23px 23px 0 0" }}>
              <GameArt id={g.id} className="w-full h-full transition-transform duration-300 group-hover:scale-105" animate={false} />
              <div className="absolute inset-x-0 bottom-0 h-8" style={{ background: "linear-gradient(180deg, transparent, rgba(0,0,0,0.35))" }} />
            </div>
            <h3 className="text-[15px] font-black text-white leading-tight mt-3 px-4 line-clamp-2">{g.label}</h3>
            <p className="text-[11px] text-white/60 mt-1 px-4 line-clamp-2">{g.desc}</p>
            <span className="mt-auto mb-4 mx-4 inline-flex items-center gap-1 text-[11px] font-bold text-white/90">
              <Gamepad2 className="h-3.5 w-3.5" /> Jogar
            </span>
          </div>
        </motion.article>
      ))}

      {/* ── Cartão final: ver catálogo ── */}
      <article
        className="relative shrink-0 snap-start w-[42vw] max-w-[185px] sm:w-[23%] md:w-[18%] lg:w-[15.5%] rounded-3xl overflow-hidden cursor-pointer group flex flex-col items-center justify-center p-4"
        style={{
          background: "linear-gradient(145deg, #0a0a12, #101020)",
          border: `1px dashed ${ACCENT.purple}55`,
          minHeight: 230,
        }}
        onClick={() => navigate("/jogos")}
        role="link"
        aria-label="Ver todos os jogos"
      >
        <div className="h-12 w-12 rounded-2xl flex items-center justify-center mb-3 transition-transform duration-300 group-hover:scale-110" style={{ background: `${ACCENT.purple}14`, border: `1px solid ${ACCENT.purple}30` }}>
          <LayoutGrid className="h-6 w-6" style={{ color: ACCENT.purple }} />
        </div>
        <h3 className="text-[15px] font-black text-white text-center leading-tight">80+ jogos<br />no catálogo</h3>
        <p className="text-[11px] text-zinc-500 text-center mt-1">Multiplayer, bots e solo</p>
        <span className="mt-3 text-[11px] font-bold" style={{ color: ACCENT.purple }}>Explorar →</span>
      </article>
    </RollUp>
  );
}
