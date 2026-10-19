// ═══════════════════════════════════════════════════════════════
//  PÁGINA DE DETALHE DO JOGO — /jogo/:id
//
//  Padrão REA (Reverse Engineer Anything): a página de detalhe dos
//  líderes (Steam/Poki/CrazyGames) apresenta ARTE grande, estatísticas
//  reais, "como jogar" e jogos relacionados. Reconstruído do zero
//  sobre o catálogo da plataforma e o progresso local (Bateu Pro Kit).
//  Zero dados inventados — se o jogador nunca jogou, o valor é honesto.
// ═══════════════════════════════════════════════════════════════
import { useMemo, useState } from "react";
import { Link, useNavigate, useParams, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Helmet } from "react-helmet-async";
import {
  Play, Users, Bot, Flame, Trophy, TrendingUp,
  ChevronRight, Swords, Info, ArrowLeft, Lightbulb,
} from "lucide-react";
import { ALL_GAMES, popularityScore, playsOf, bestOf, weeklyPopular, LIVE_GAME_MODES } from "@/lib/gamesCatalog";
import GameArt, { GameArtChip } from "@/components/games/GameArt";
import ChallengeModal from "@/components/games/ChallengeModal";
import { getPlayerIdentity } from "@/lib/challenges";
import { useSoundEffects } from "@/hooks/useSoundEffects";
import { useSEO } from "@/hooks/useSEO";

/* Como jogar — dicas reais por jogo (nenhuma dica inventada sobre
   funcionalidades que não existem; fala do modo, do objetivo e do bot). */
const TIPS: Record<string, string[]> = {
  mmorpg: [
    "Explora o mundo 3D ao lado de outros jogadores reais em tempo real.",
    "Sobe de nível, desbloqueia poderes e melhora o teu Power Level.",
    "Vence duelos 1v1 para roubar cupões e troca pontos por moeda da plataforma.",
  ],
  bounce: [
    "Salta de plataforma em plataforma e apanha todos os anéis dourados.",
    "Evita os espinhos — um toque errado manda-te de volta ao início.",
    "Vai direto ao nível final: cada anel conta para o teu recorde.",
  ],
  spaceshooter: [
    "Desvia-te das formações inimigas e dispara sem parar.",
    "Cada nave abatida soma pontos — compara com o teu adversário.",
    "Modo 1v1 ou contra o bot: quem faz mais pontos vence.",
  ],
  flappybird: [
    "Um toque por vez: mantém o ritmo entre os canos.",
    "O bot joga contra ti — a consistência vence a sorte.",
    "Cada ponto é precioso: respira e foca-te no próximo vão.",
  ],
  snakebattle: [
    "Duas cobras, um tabuleiro: cresce mais que o adversário.",
    "Fechar o caminho do oponente é a jogada de mestre.",
    "Não te esqueças: bater na parede ou no adversário custa caro.",
  ],
  numbertetris: [
    "Junta números iguais para dobrar o valor — até fazer 2048!",
    "Planeia duas peças à frente para não encher a grelha.",
    "Fusões em cadeia valem pontuações enormes.",
  ],
  pongvs: [
    "O primeiro a chegar a 5 pontos vence a partida.",
    "Ângulo é tudo: acerta a bola com as pontas da raquete.",
    "Clássico de 1972, adrenalina de sempre.",
  ],
  tictactoepro: [
    "9 mini-tabuleiros num só: ganha a casa para jogar onde quiseres.",
    "Pensa no tabuleiro grande — força o adversário para casas ruins.",
    "Três em linha no macro vence o duelo PRO.",
  ],
  connect4: [
    "Liga 4 peças em linha — na horizontal, vertical ou diagonal.",
    "Controla o centro: a coluna do meio serve quase todas as linhas.",
    "Bloqueia o adversário antes de ele montar a armadilha.",
  ],
  checkers: [
    "Capturas obrigatórias: usa-as a teu favor.",
    "Chega ao fundo para coroar a tua peça de rei.",
    "Troca peças quando estiveres à frente no material.",
  ],
  chess: [
    "Xadrez completo: roque, en passant e promoção.",
    "Desenvolve as peças cedo e protege o teu rei.",
    "O bot tem 3 níveis — começa fácil e sobe o degrau.",
  ],
  dominoes: [
    "Encaixa peças com números iguais nas pontas.",
    "Esvazia a mão primeiro para ganhar a rodada.",
    "Conta as peças jogadas: sabes o que ainda está em jogo.",
  ],
  snakesladders: [
    "Lança o dado e sobe até à casa 100.",
    "As escadas aceleram-te; as cobras mandam-te para trás.",
    "Modo 1v1 ou contra o bot — sorte e paciência.",
  ],
  memory: [
    "Vira duas cartas e encontra os pares.",
    "Memoriza posições: quem lembra mais, ganha.",
    "Modo VS: cada par te aproxima da vitória.",
  ],
  urusse: [
    "Mancala moçambicano: semeia sementes casa a casa.",
    "A última semente dita a captura — conta sempre.",
    "Quem capturar mais sementes vence a partida.",
  ],
  mexerica: [
    "Reflexos puros: bate a mão no momento certo.",
    "O sinal muda a cada rodada — não caias no engano.",
    "Modo 1v1 ou bot: reação vence antecipação.",
  ],
};

/* ── fim das dicas ── */

export default function GameDetail() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { sfx } = useSoundEffects();
  const game = useMemo(() => ALL_GAMES.find((g) => g.id === id), [id]);

  const plays = playsOf(id);
  const best = bestOf(id);
  const pop = popularityScore(id);
  const rank = useMemo(() => {
    const sorted = [...ALL_GAMES].sort((a, b) => popularityScore(b.id) - popularityScore(a.id));
    return sorted.findIndex((g) => g.id === id) + 1;
  }, [id]);
  const related = useMemo(
    () => ALL_GAMES.filter((g) => g.category === game?.category && g.id !== id).slice(0, 6),
    [game, id]
  );
  const hot = useMemo(() => new Set(weeklyPopular(4).map((g) => g.id)), []);

  const challengeGame = id ? { id, label: game?.label ?? id } : null;
  const [challengeOpen, setChallengeOpen] = useState(false);

  if (!game) return <Navigate to="/jogos" replace />;

  return (
    <div className="min-h-screen pb-24 lg:pb-0" style={{ background: "var(--area-bg, #0d1117)", color: "var(--area-text, #e6edf3)" }}>
      <Helmet>
        <title>{game.label} — Jogar Online Grátis | Bateu</title>
        <meta name="description" content={game.desc} />
        <meta property="og:title" content={`${game.label} — Bateu`} />
        <meta property="og:description" content={game.desc} />
      </Helmet>

      {/* ── HEROI COM ARTE ── */}
      <section className="relative overflow-hidden" data-testid="detalhe-hero" style={{ minHeight: 300 }}>
        <div className="absolute inset-0">
          <GameArt id={game.id} className="w-full h-full" style={{ minHeight: 300 }} />
        </div>
        <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(13,17,23,0.25) 0%, rgba(13,17,23,0.55) 55%, #0d1117 100%)" }} />

        <div className="relative z-10 container mx-auto px-4 pt-6 pb-8 flex flex-col min-h-[300px] justify-end">
          <Link
            to="/jogos"
            className="mb-auto inline-flex items-center gap-1.5 self-start rounded-full px-3 py-1.5 text-xs font-bold backdrop-blur transition-colors"
            style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.14)", color: "#e6edf3" }}
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Todos os jogos
          </Link>

          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="rounded-full px-2.5 py-0.5 text-[10px] font-black tracking-wider" style={{ background: "rgba(46,160,67,0.2)", color: "#3fb950", border: "1px solid rgba(46,160,67,0.35)" }}>
                {game.category.toUpperCase()}
              </span>
              {hot.has(game.id) && (
                <span className="rounded-full px-2.5 py-0.5 text-[10px] font-black tracking-wider" style={{ background: "rgba(247,129,102,0.16)", color: "#f78166", border: "1px solid rgba(247,129,102,0.35)" }}>
                  EM ALTA ESTA SEMANA
                </span>
              )}
            </div>
            <h1 className="text-3xl sm:text-5xl font-black font-display tracking-tight text-white drop-shadow-lg">{game.label}</h1>
            <p className="mt-2 max-w-2xl text-sm sm:text-base" style={{ color: "#c9d1d9" }}>{game.desc}</p>
          </motion.div>
        </div>
      </section>

      {/* ── AÇÃO + STATS ── */}
      <section className="container mx-auto px-4 -mt-4 relative z-10">
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <button
            data-testid="detalhe-jogar"
            onClick={() => { sfx.whoosh(); navigate(`/lives?game=${game.id}`); }}
            className="btn-press flex-1 inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-4 text-base font-black text-white transition-transform hover:scale-[1.02] active:scale-95"
            style={{ background: "linear-gradient(90deg, #2ea043, #1a7f37)", boxShadow: "0 8px 30px rgba(46,160,67,0.35)" }}
          >
            <Play className="h-5 w-5" /> JOGAR AGORA — GRÁTIS
          </button>
          <button
            data-testid="detalhe-desafiar"
            onClick={() => { sfx.click(); setChallengeOpen(true); }}
            className="btn-press inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-4 text-sm font-bold transition-transform hover:scale-[1.02] active:scale-95"
            style={{ background: "rgba(247,129,102,0.12)", color: "#f78166", border: "1px solid rgba(247,129,102,0.3)" }}
          >
            <Swords className="h-4 w-4" /> Desafiar um amigo
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" data-testid="detalhe-stats">
          {[
            { label: "Jogadas tuas", value: String(plays), icon: Flame, color: "#f78166", testid: "detalhe-stat-jogadas" },
            { label: "Melhor pontuação", value: best > 0 ? best.toLocaleString("pt-PT") : "—", icon: Trophy, color: "#fbbf24", testid: "detalhe-stat-recorde" },
            { label: "Popularidade (0-99)", value: String(Math.min(99, pop)), icon: TrendingUp, color: "#3fb950", testid: "detalhe-stat-pop" },
            { label: "# da semana", value: rank > 0 ? `#${rank}` : "—", icon: Users, color: "#58a6ff", testid: "detalhe-stat-rank" },
          ].map((s) => (
            <div key={s.label} data-testid={s.testid} className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <s.icon className="h-4 w-4 mb-2" style={{ color: s.color }} />
              <p className="text-xl sm:text-2xl font-black font-display leading-none">{s.value}</p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-wider" style={{ color: "#7d8590" }}>{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── COMO JOGAR ── */}
      <section className="container mx-auto px-4 pt-8">
        <div className="flex items-center gap-2 mb-3">
          <span className="h-8 w-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(88,166,255,0.12)", border: "1px solid rgba(88,166,255,0.25)" }}>
            <Lightbulb className="h-4 w-4" style={{ color: "#58a6ff" }} />
          </span>
          <h2 className="text-lg font-black font-display tracking-tight">Como jogar</h2>
        </div>
        <div className="grid sm:grid-cols-3 gap-3">
          {(TIPS[game.id] ?? [game.desc]).map((tip, i) => (
            <div key={i} className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <span className="mb-2 inline-flex h-6 w-6 items-center justify-center rounded-lg text-[11px] font-black" style={{ background: "rgba(46,160,67,0.15)", color: "#3fb950" }}>{i + 1}</span>
              <p className="text-sm leading-relaxed" style={{ color: "#c9d1d9" }}>{tip}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]" style={{ color: "#7d8590" }}>
          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <Users className="h-3 w-3" /> {game.players}
          </span>
          {game.hasBot && (
            <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1" style={{ background: "rgba(88,166,255,0.1)", border: "1px solid rgba(88,166,255,0.22)", color: "#58a6ff" }}>
              <Bot className="h-3 w-3" /> Bot IA integrado
            </span>
          )}
          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <Info className="h-3 w-3" /> +{LIVE_GAME_MODES} modos ao vivo no hub
          </span>
        </div>
      </section>

      {/* ── RELACIONADOS ── */}
      {related.length > 0 && (
        <section className="container mx-auto px-4 pt-8 pb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-black font-display tracking-tight">Da mesma categoria</h2>
            <Link to="/jogos" className="flex items-center gap-0.5 text-xs font-bold" style={{ color: "#3fb950" }}>
              Ver todos <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none" style={{ scrollbarWidth: "none" }}>
            {related.map((g) => (
              <Link
                key={g.id}
                to={`/jogo/${g.id}`}
                data-testid={`relacionado-${g.id}`}
                className="group shrink-0 w-[168px] overflow-hidden rounded-2xl transition-transform hover:-translate-y-0.5"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
              >
                <div className="h-[86px] overflow-hidden">
                  <GameArt id={g.id} className="w-full h-full transition-transform duration-300 group-hover:scale-105" />
                </div>
                <div className="p-2.5">
                  <p className="text-xs font-bold truncate">{g.label}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: "#7d8590" }}>{g.category}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Modal de desafio */}
      {challengeGame && (
        <ChallengeModal
          open={challengeOpen}
          onClose={() => setChallengeOpen(false)}
          gameId={challengeGame.id}
          gameLabel={challengeGame.label}
          onCreated={() => sfx.click()}
        />
      )}
    </div>
  );
}
