import { useState, useMemo, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Helmet } from "react-helmet-async";
import { Search, Gamepad2, Users, Brain, Zap, Swords, Grid3X3, Sparkles, LayoutGrid, Radio, ChevronRight, Globe, Crown, CircleDot } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { COUNTRIES } from "@/lib/regions";
import { useSoundEffects } from '@/hooks/useSoundEffects';
import ShimmerText from '@/components/ui/ShimmerText';
import AnimatedNumber from '@/components/ui/AnimatedNumber';
import HolographicCard from '@/components/ui/HolographicCard';
import ChallengeModal from '@/components/games/ChallengeModal';
import { getPlayerIdentity } from '@/lib/challenges';

interface GameDef {
  id: string;
  label: string;
  emoji: string;
  desc: string;
  grad: string;
  category: string;
  players: string;
  icon: any;
  hasBot: boolean;
  regions?: string[];
}

// CATÁLOGO CURADO: apenas os clássicos famosos de qualquer dispositivo + o MMO da plataforma
const ALL_GAMES: GameDef[] = [
  { id: "mmorpg", label: "Bateu World 3D", emoji: "🌍", desc: "O MMO oficial da Bateu — combate em tempo real, níveis e poderes, rouba cupões a outros jogadores e troca pontos por moeda da plataforma!", grad: "from-rose-600 via-orange-500 to-amber-500", category: "Mundo Aberto", players: "Multiplayer", icon: Globe, hasBot: false },
  { id: "bounce", label: "Bounce", emoji: "⚽", desc: "O clássico da bola quicando! Salte plataformas, junte anéis e evite os espinhos — direto ao nível final!", grad: "from-sky-500 to-indigo-600", category: "Arcade", players: "Solo", icon: CircleDot, hasBot: false },
  { id: "spaceshooter", label: "Guerra Espacial", emoji: "🚀", desc: "Destrua naves inimigas no espaço — quem faz mais pontos!", grad: "from-slate-500 to-blue-700", category: "Arcade", players: "1v1 / Bot", icon: Zap, hasBot: false },
  { id: "flappybird", label: "Flappy Bird", emoji: "🐦", desc: "Desvie dos canos! O clássico viciante de qualquer dispositivo!", grad: "from-sky-400 to-green-500", category: "Arcade", players: "Solo / Bot", icon: Gamepad2, hasBot: true },
  { id: "snakebattle", label: "Batalha de Cobras", emoji: "🐍", desc: "A cobra famosa de sempre — duas cobras, um tabuleiro, quem cresce mais ganha!", grad: "from-emerald-500 to-teal-600", category: "Arcade", players: "1v1 / Bot", icon: Gamepad2, hasBot: true },
  { id: "numbertetris", label: "Números Caindo", emoji: "🔢", desc: "Estilo Tetris 2048 — números caem e combinam até fazer 2048!", grad: "from-orange-600 to-red-700", category: "Puzzle", players: "Solo", icon: LayoutGrid, hasBot: false },
  { id: "pongvs", label: "Pong VS", emoji: "🏓", desc: "O primeiro clássico da história — primeiro a 5 pontos!", grad: "from-blue-600 to-indigo-700", category: "Arcade", players: "1v1 / Bot", icon: Gamepad2, hasBot: false },
  { id: "tictactoepro", label: "Galo PRO", emoji: "✕", desc: "O famoso jogo do galo a nível PRO — 9 mini-tabuleiros, estratégia avançada!", grad: "from-violet-600 to-indigo-700", category: "Estratégia", players: "1v1 / Bot", icon: Grid3X3, hasBot: true },
  { id: "connect4", label: "Ligar 4", emoji: "🔴", desc: "Estratégia pura: ligue 4 peças em linha para vencer!", grad: "from-blue-500 to-yellow-500", category: "Estratégia", players: "1v1 / Bot", icon: LayoutGrid, hasBot: true },
  { id: "checkers", label: "Damas", emoji: "♟️", desc: "O clássico mundial das damas com capturas e promoção a rei!", grad: "from-amber-700 to-red-800", category: "Estratégia", players: "1v1 / Bot", icon: Grid3X3, hasBot: false },
  { id: "chess", label: "Xadrez", emoji: "♚", desc: "Xadrez completo: roque, en passant, promoção e checkmate!", grad: "from-slate-700 to-zinc-900", category: "Estratégia", players: "1v1 / Bot", icon: Crown, hasBot: true },
  { id: "dominoes", label: "Dominó", emoji: "🎲", desc: "O clássico das mesas de Moçambique — encaixe as peças e esvazie a mão!", grad: "from-slate-600 to-zinc-700", category: "Estratégia", players: "1v1 / Bot", icon: LayoutGrid, hasBot: false },
  { id: "snakesladders", label: "Cobras e Escadas", emoji: "🪜", desc: "O clássico mundial! Suba escadas, fuja das cobras e chegue primeiro ao 100!", grad: "from-lime-600 to-emerald-700", category: "Arcade", players: "1v1 / Bot", icon: Sparkles, hasBot: true },
  { id: "memory", label: "Jogo da Memória VS", emoji: "🧠", desc: "O clássico dos pares — quem tem melhor memória?", grad: "from-indigo-500 to-purple-600", category: "Puzzle", players: "1v1 / Bot", icon: Brain, hasBot: false },
  { id: "urusse", label: "Urusse", emoji: "🧴", desc: "Mancala moçambicano — semeie, capture e vença!", grad: "from-green-700 to-amber-900", category: "Moçambicano", players: "1v1 / Bot", icon: Gamepad2, hasBot: true },
  { id: "mexerica", label: "Mexerica", emoji: "✋", desc: "Bate a Mão — jogo moçambicano de reflexos!", grad: "from-amber-600 to-red-700", category: "Moçambicano", players: "1v1 / Bot", icon: Zap, hasBot: true },
];

const CATEGORIES = [
  { id: "todos", label: "Todos", emoji: "🎮" },
  { id: "Mundo Aberto", label: "Mundo Aberto", emoji: "🗺️" },
  { id: "Arcade", label: "Arcade", emoji: "👾" },
  { id: "Estratégia", label: "Estratégia", emoji: "♟️" },
  { id: "Puzzle", label: "Puzzle", emoji: "🧩" },
  { id: "Moçambicano", label: "Moçambicano", emoji: "🇲🇿" },
];

const SPRING = { type: "spring" as const, stiffness: 300, damping: 25 };
// Steam/CrazyGames inspired green theme
const THEME_P = "#2ea043";
const THEME_S = "#58a6ff";
const THEME_A = "#f78166";

const AllGames = () => {
  const { sfx } = useSoundEffects();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("todos");
  const [regionFilter, setRegionFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"name" | "category">("name");
  const heroRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [challengeGame, setChallengeGame] = useState<{ id: string; label: string } | null>(null);
  const [challengeToast, setChallengeToast] = useState<string | null>(null);
  const meName = getPlayerIdentity().name;

  const filtered = useMemo(() => {
    let list = ALL_GAMES;
    if (category !== "todos") list = list.filter((g) => g.category === category);
    if (regionFilter !== "all") list = list.filter((g) => !g.regions || g.regions.includes(regionFilter));
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((g) => g.label.toLowerCase().includes(q) || g.desc.toLowerCase().includes(q) || g.category.toLowerCase().includes(q));
    }
    if (sortBy === "name") list = [...list].sort((a, b) => a.label.localeCompare(b.label));
    else list = [...list].sort((a, b) => a.category.localeCompare(b.category) || a.label.localeCompare(b.label));
    return list;
  }, [search, category, sortBy, regionFilter]);

  const botGames = useMemo(() => ALL_GAMES.filter((g) => g.hasBot), []);
  const categoryCounts = useMemo(() => {
    const m: Record<string, number> = { todos: ALL_GAMES.length };
    ALL_GAMES.forEach((g) => { m[g.category] = (m[g.category] || 0) + 1; });
    return m;
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!heroRef.current) return;
    const rect = heroRef.current.getBoundingClientRect();
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <div className="min-h-screen pb-20 lg:pb-0" style={{ background: 'var(--area-bg, #0d1117)', color: 'var(--area-text, #e6edf3)' }}>
      <Helmet>
        <title>Jogos Clássicos Online Grátis — Bateu</title>
        <meta name="description" content="Joga os melhores clássicos de sempre: Bounce, Guerra Espacial, Flappy Bird, Xadrez, Damas, Dominó e o MMO Bateu World 3D. Grátis, direto no navegador!" />
        <meta property="og:title" content="Jogos Clássicos Online Grátis — Bateu" />
        <meta property="og:description" content="Bounce, Guerra Espacial, Flappy Bird, Xadrez, Damas e o MMO Bateu World 3D — grátis e direto no navegador!" />
        <meta property="og:type" content="website" />
        <link rel="canonical" href={`${window.location.origin}/jogos`} />
      </Helmet>
      {/* Grid pattern background - Steam feel */}
      <div
        className="fixed inset-0 pointer-events-none z-0 opacity-[0.015]"
        style={{
          backgroundImage: `linear-gradient(${THEME_P} 1px, transparent 1px),
                            linear-gradient(90deg, ${THEME_P} 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }}
      />

      <div
        ref={heroRef}
        onMouseMove={handleMouseMove}
        className="dir-hero-bg relative overflow-hidden hidden md:block"
        style={{ minHeight: "380px" }}
      >
        <div className="aurora-hero">
          <div className="aurora-blob aurora-blob-1" style={{ background: 'rgba(46, 160, 67, 0.2)' }} />
          <div className="aurora-blob aurora-blob-2" style={{ background: 'rgba(88, 166, 255, 0.12)' }} />
          <div className="aurora-blob aurora-blob-3" style={{ background: 'rgba(247, 129, 102, 0.1)' }} />
        </div>
        <div className="hero-grid-overlay" style={{ "--grid-color": "rgba(255,255,255,0.5)" } as any} />
        <div
          className="hero-mouse-light"
          style={{ background: `radial-gradient(600px circle at ${mousePos.x}px ${mousePos.y}px, rgba(46,160,67,0.06), transparent 40%)` }}
        />
        <div className="hero-bottom-fade" />

        <div className="relative z-10 container mx-auto px-4 py-14">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ ...SPRING, delay: 0.1 }} className="max-w-2xl">
            <motion.div
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-4"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ ...SPRING, delay: 0.15 }}
            >
              <Gamepad2 className="h-4 w-4" style={{ color: THEME_P }} />
              <span className="text-xs font-bold" style={{ color: '#7d8590' }}><AnimatedNumber value={ALL_GAMES.length} /> JOGOS DISPONIVEIS</span>
            </motion.div>

            <h1 className="text-4xl md:text-6xl font-black font-display tracking-tight mb-3 jogos-glow-green">
              <ShimmerText colors={['#2ea043', '#58a6ff', '#f78166', '#2ea043']} speed={5}>Jogos Clássicos</ShimmerText>
            </h1>
            <p className="text-base mb-6 max-w-xl" style={{ color: '#7d8590' }}>
              Os clássicos famosos de qualquer dispositivo — Bounce, Guerra Espacial, Flappy Bird, Xadrez, Damas — e o nosso MMO Bateu World 3D. Grátis, direto no navegador!
            </p>

            <div className="flex flex-wrap gap-3 mb-6">
              <span className="jogos-badge inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold">
                <Users className="h-3.5 w-3.5" /> <AnimatedNumber value={botGames.length} /> jogos com Bot IA
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold" style={{ background: 'rgba(247,129,102,0.1)', color: '#f78166', border: '1px solid rgba(247,129,102,0.15)' }}>
                <Zap className="h-3.5 w-3.5" /> Jogo instantaneo
              </span>
              <span className="jogos-badge-players inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold">
                <Radio className="h-3.5 w-3.5" /> Modo Live
              </span>
            </div>

            <div className="dir-search-wrap max-w-md">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Procurar jogo..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onFocus={() => sfx.inputFocus()}
                  className="w-full pl-11 pr-4 py-3 rounded-full bg-white/[0.03] border-white/[0.06] text-sm focus:outline-none focus:border-hsl(220 70% 18% / 0.4) transition-all input-focus-glow"
                />
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="container mx-auto px-4 pt-4 pb-2 relative z-20">
        {/* ⭐ Bateu World — destaque permanente no topo da página de jogos */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
          onClick={() => { sfx.whoosh(); navigate("/lives?game=mmorpg"); }}
          data-testid="jogos-destaque-bateu-world"
          className="relative overflow-hidden rounded-2xl mb-5 cursor-pointer"
          style={{ background: "linear-gradient(120deg, #4c0519 0%, #7c2d12 45%, #713f12 100%)", border: "1px solid rgba(251,113,133,0.45)", boxShadow: "0 0 40px rgba(244,63,94,0.3), 0 12px 32px rgba(0,0,0,0.4)" }}
        >
          <motion.div
            className="absolute inset-0 pointer-events-none"
            style={{ background: "radial-gradient(circle at 15% 20%, rgba(255,255,255,0.18), transparent 50%), radial-gradient(circle at 90% 85%, rgba(250,204,21,0.25), transparent 45%)" }}
            animate={{ opacity: [0.5, 0.85, 0.5] }}
            transition={{ duration: 4, repeat: Infinity }}
          />
          <div className="relative z-10 p-4 sm:p-5 flex items-center gap-4">
            <motion.div
              className="h-14 w-14 sm:h-16 sm:w-16 shrink-0 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center text-3xl sm:text-4xl"
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
            >
              🌍
            </motion.div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-display text-lg sm:text-xl font-black text-white leading-none">🌍 BATEU WORLD 3D</span>
                <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-rose-500 to-amber-400 text-white text-[9px] font-black animate-pulse">MMO DA PLATAFORMA · JOGO EM DESTAQUE</span>
              </div>
              <p className="text-[11px] sm:text-xs font-semibold text-white/80 mt-1 leading-snug">
                Níveis, poderes, missões e exploração num mundo 3D ao vivo — derrota jogadores e rouba os cupões deles, troca pontos por moeda da plataforma e ganha prémios reais.
              </p>
            </div>
            <div className="shrink-0 px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-amber-400 text-white font-black text-[11px] sm:text-xs shadow-lg">
              JOGAR AGORA ▶
            </div>
          </div>
        </motion.div>

        <motion.div
          className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide custom-scrollbar"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {CATEGORIES.map((c, i) => {
            const isActive = category === c.id;
            return (
              <motion.button
                key={c.id}
                onClick={() => { sfx.tabClick(); setCategory(c.id); }}
                className={"section-tab-v2 relative flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap " + (isActive ? "active" : "")}
                style={{
                  backgroundColor: isActive ? "hsl(220 70% 18% / 0.12)" : "rgba(255,255,255,0.03)",
                  color: isActive ? THEME_P : "hsl(var(--muted-foreground))",
                  border: isActive ? "1px solid hsl(220 70% 18% / 0.25)" : "1px solid rgba(255,255,255,0.05)",
                }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...SPRING, delay: 0.35 + i * 0.03 }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.95 }}
              >
                <div className="tab-glow rounded-full" style={{ background: "radial-gradient(ellipse at center, hsl(220 70% 18% / 0.08), transparent 70%)" }} />
                <span className="relative z-10">{c.emoji}</span>
                <span className="relative z-10">{c.label}</span>
                <span className="relative z-10 text-[10px] opacity-50 ml-0.5">(<AnimatedNumber value={categoryCounts[c.id] || 0} />)</span>
              </motion.button>
            );
          })}
        </motion.div>

        <div className="flex flex-wrap items-center gap-2 mt-3">
          <span className="text-xs text-muted-foreground">Ordenar:</span>
          {(["name", "category"] as const).map((s) => (
            <motion.button
              key={s}
              onClick={() => { sfx.click(); setSortBy(s); }}
              className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-all"
              style={{
                backgroundColor: sortBy === s ? "hsl(220 70% 18% / 0.1)" : "transparent",
                color: sortBy === s ? THEME_P : "hsl(var(--muted-foreground))",
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {s === "name" ? "Nome" : "Categoria"}
            </motion.button>
          ))}
          <span className="text-xs text-muted-foreground mx-1">|</span>
          <Globe className="w-3.5 h-3.5 text-muted-foreground" />
          <select
            value={regionFilter}
            onChange={(e) => setRegionFilter(e.target.value)}
            className="text-xs px-2.5 py-1.5 rounded-lg border border-border/60 bg-background/50 font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
          >
            <option value="all">Todos os paises</option>
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>{c.flag} {c.label}</option>
            ))}
          </select>
          <span className="text-xs text-muted-foreground ml-auto"><AnimatedNumber value={filtered.length} /> jogo{filtered.length !== 1 ? "s" : ""}</span>
        </div>
      </div>

      <section className="container mx-auto px-4 pb-8 relative z-20">
        <AnimatePresence mode="wait">
          <motion.div
            key={category + search + sortBy}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4 card-appear"
          >
            {filtered.map((game, i) => (
              <motion.div
                key={game.id}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ ...SPRING, delay: Math.min(i, 18) * 0.03 }}
              >
                <HolographicCard
                  glowColor="#2ea043"
                  intensity="medium"
                  className="block"
                >
                  <Link
                    to={`/lives?game=${game.id}`}
                    className="game-card-v2 block cursor-pointer card-hover-lift btn-press btn-glow rounded-xl"
                    style={{ border: "1px solid rgba(255,255,255,0.05)", "--glow-color": "#2ea043" } as React.CSSProperties}
                    onClick={() => sfx.click()}
                  >
                    <div className={`h-1.5 bg-gradient-to-r ${game.grad} rounded-t-xl`} />
                    <div className="p-3 md:p-4">
                      <div className={`game-visual inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${game.grad} mb-3 text-xl shadow-lg`}>
                        {game.emoji}
                      </div>
                      <h3 className="text-sm font-bold leading-tight mb-1 line-clamp-1">{game.label}</h3>
                      <p className="text-[11px] text-muted-foreground line-clamp-2 mb-3">{game.desc}</p>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold" style={{ background: "rgba(255,255,255,0.05)", color: "hsl(var(--muted-foreground))" }}>
                          {game.players}
                        </span>
                        {game.hasBot && (
                          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[10px] font-bold" style={{ background: "hsl(220 60% 40% / 0.15)", color: "hsl(220 60% 40%)" }}>
                            Bot IA
                          </span>
                        )}
                      </div>
                      <div className="mt-3 pt-2 flex items-center justify-between" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                        <span className="text-[10px] text-muted-foreground/50">{game.category}</span>
                        <span className="flex items-center gap-2">
                          <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setChallengeGame({ id: game.id, label: game.label }); sfx.click(); }}
                            title={`Desafiar amigo no ${game.label}`}
                            className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-md"
                            style={{ color: THEME_A, background: "rgba(247,129,102,0.1)" }}
                          >
                            <Swords className="h-3 w-3" /> Desafiar
                          </motion.button>
                          <motion.span className="text-[10px] font-semibold flex items-center gap-0.5" style={{ color: THEME_P }}>
                            Jogar <ChevronRight className="h-3 w-3" />
                          </motion.span>
                        </span>
                      </div>
                    </div>
                  </Link>
                </HolographicCard>
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>

        {filtered.length === 0 && (
          <div className="empty-state-v2 text-center py-20">
            <div className="empty-orb" style={{ backgroundColor: THEME_P, width: 120, height: 120, top: "20%", left: "40%" }} />
            <motion.div className="empty-float inline-block relative">
              <div className="w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-6" style={{ background: "linear-gradient(135deg, hsl(220 70% 18% / 0.1), hsl(352 73% 50% / 0.05))", border: "1px dashed hsl(220 70% 18% / 0.2)" }}>
                <Gamepad2 className="h-11 w-11 text-muted-foreground/20" />
              </div>
            </motion.div>
            <p className="text-lg font-bold text-muted-foreground">Nenhum jogo encontrado</p>
            <p className="text-sm text-muted-foreground/50 mt-1">Tenta outro termo de pesquisa ou categoria</p>
          </div>
        )}
      </section>

      {category === "todos" && !search && (
        <section className="container mx-auto px-4 pb-12 relative z-20">
          <motion.div
            className="dir-cta-banner"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <div className="p-7 md:p-8 rounded-[1.25rem]" style={{ background: "linear-gradient(135deg, hsl(220 70% 18% / 0.06), hsl(352 73% 50% / 0.03))" }}>
              <div className="flex items-start gap-4">
                <motion.div
                  className="h-14 w-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-2xl shrink-0"
                  animate={{ y: [0, -4, 0] }}
                  transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                >
                  <span>🤖</span>
                </motion.div>
                <div className="flex-1">
                  <h2 className="text-xl font-black font-display mb-1">Jogue contra o Computador</h2>
                  <p className="text-sm text-muted-foreground mb-4">
                    <AnimatedNumber value={botGames.length} /> jogos tem inteligencia artificial integrada com 3 niveis de dificuldade. Nao precisa de parceiro — jogue quando quiser!
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {botGames.slice(0, 8).map((g) => (
                      <Link
                        key={g.id}
                        to={`/lives?game=${g.id}`}
                        className="game-card-v2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
                        style={{ border: "1px solid rgba(255,255,255,0.05)" }}
                        onClick={() => sfx.click()}
                      >
                        <span>{g.emoji}</span> <span>{g.label}</span>
                      </Link>
                    ))}
                    {botGames.length > 8 && (
                      <span className="inline-flex items-center px-3 py-1.5 text-xs text-muted-foreground">
                        <span>+{botGames.length - 8} mais</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </section>
      )}

      <ChallengeModal
        open={challengeGame !== null}
        onClose={() => setChallengeGame(null)}
        gameId={challengeGame?.id ?? ""}
        gameLabel={challengeGame?.label ?? ""}
        onCreated={(msg) => { setChallengeToast(msg); window.setTimeout(() => setChallengeToast(null), 4000); }}
      />

      <AnimatePresence>
        {challengeToast && (
          <motion.div
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 30 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[95] px-4 py-2.5 rounded-xl bg-card border border-orange-500/40 shadow-2xl text-xs font-bold"
          >
            {challengeToast}
          </motion.div>
        )}
      </AnimatePresence>

      <Footer />
    </div>
  );
};

export default AllGames;
