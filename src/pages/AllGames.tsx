import { useState, useMemo, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Helmet } from "react-helmet-async";
import { Search, Gamepad2, Users, Zap, Swords, Radio, Flame, ChevronRight, TrendingUp, Globe, Info } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { COUNTRIES } from "@/lib/regions";
import { useSoundEffects } from '@/hooks/useSoundEffects';
import ShimmerText from '@/components/ui/ShimmerText';
import AnimatedNumber from '@/components/ui/AnimatedNumber';
import HolographicCard from '@/components/ui/HolographicCard';
import ChallengeModal from '@/components/games/ChallengeModal';
import GameArt, { GameArtChip } from '@/components/games/GameArt';
import { getPlayerIdentity } from '@/lib/challenges';
import { ALL_GAMES, CATEGORIES, weeklyPopular, popularityScore, playsOf, bestOf } from '@/lib/gamesCatalog';

const SPRING = { type: "spring" as const, stiffness: 300, damping: 25 };
// Steam/CrazyGames inspired green theme
const THEME_P = "#2ea043";
const THEME_S = "#58a6ff";
const THEME_A = "#f78166";

const AllGames = () => {
  const { sfx } = useSoundEffects();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState(() => searchParams.get("cat") || "todos");
  const [regionFilter, setRegionFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"populares" | "name" | "category">("populares");

  /* chips da homepage (hero) chegam por /jogos?cat=X — mantém em sincronia */
  useEffect(() => {
    const cat = searchParams.get("cat");
    if (cat && CATEGORIES.some((c) => c.id === cat)) setCategory(cat);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);
  const heroRef = useRef<HTMLDivElement>(null);
  const mouseRafRef = useRef(0);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  /* ⭐ REA Steam: CCU real — sessões de jogo nas últimas 24h (tabela game_sessions) */
  const [sessoes24h, setSessoes24h] = useState<number | null>(null);
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
    if (sortBy === "populares") list = [...list].sort((a, b) => popularityScore(b.id) - popularityScore(a.id));
    else if (sortBy === "name") list = [...list].sort((a, b) => a.label.localeCompare(b.label));
    else list = [...list].sort((a, b) => a.category.localeCompare(b.category) || a.label.localeCompare(b.label));
    return list;
  }, [search, category, sortBy, regionFilter]);

  /* ⭐ Populares esta Semana (padrão CrazyGames) — top 6 do catálogo */
  const weekTop = useMemo(() => weeklyPopular(6), []);

  const botGames = useMemo(() => ALL_GAMES.filter((g) => g.hasBot), []);
  const categoryCounts = useMemo(() => {
    const m: Record<string, number> = { todos: ALL_GAMES.length };
    ALL_GAMES.forEach((g) => { m[g.category] = (m[g.category] || 0) + 1; });
    return m;
  }, []);

  /* ⭐ REA perf: luz do rato com requestAnimationFrame — sem re-render por pixel */
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!heroRef.current) return;
    const rect = heroRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (mouseRafRef.current) return;
    mouseRafRef.current = requestAnimationFrame(() => {
      mouseRafRef.current = 0;
      setMousePos({ x, y });
    });
  };

  /* ⭐ REA Steam: contagem real de sessões (24h) — sem números inventados */
  useEffect(() => {
    let alive = true;
    const iso24h = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    supabase
      .from("game_sessions")
      .select("id", { count: "exact", head: true })
      .gte("created_at", iso24h)
      .then(({ count }) => { if (alive && typeof count === "number") setSessoes24h(count); });
    return () => { alive = false; };
  }, []);

  return (
    <div className="min-h-screen pb-20 lg:pb-0" style={{ background: 'var(--area-bg, #0d1117)', color: 'var(--area-text, #e6edf3)' }}>
      <Helmet>
        <title>Jogos Clássicos Online Grátis — Bateu</title>
        <meta name="description" content="Joga os melhores clássicos de sempre: Bounce, Guerra Espacial, Flappy Bird, Xadrez, Damas, Dominó e o MUNDO BATEU. Grátis, direto no navegador!" />
        <meta property="og:title" content="Jogos Clássicos Online Grátis — Bateu" />
        <meta property="og:description" content="Bounce, Guerra Espacial, Flappy Bird, Xadrez, Damas e o MUNDO BATEU — grátis e direto no navegador!" />
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
        data-testid="jogos-hero"
        className="dir-hero-bg relative overflow-hidden"
        style={{ minHeight: "auto" }}
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

        <div className="relative z-10 container mx-auto px-4 py-7 md:py-14">
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

            <h1 className="text-3xl sm:text-4xl md:text-6xl font-black font-display tracking-tight mb-2 md:mb-3 jogos-glow-green">
              <ShimmerText colors={['#2ea043', '#58a6ff', '#f78166', '#2ea043']} speed={5}>Jogos Clássicos</ShimmerText>
            </h1>
            <p className="text-base mb-6 max-w-xl" style={{ color: '#7d8590' }}>
              Os clássicos famosos de qualquer dispositivo — Bounce, Guerra Espacial, Flappy Bird, Xadrez, Damas — e o nosso MUNDO BATEU. Grátis, direto no navegador!
            </p>

            {/* ⭐ REA Steam: prova social real — badge com contagem ao vivo de game_sessions */}
            {sessoes24h !== null && sessoes24h > 0 && (
              <span
                data-testid="jogos-badge-sessoes-live"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold mb-2"
                style={{ background: "rgba(46,160,67,0.12)", color: THEME_P, border: "1px solid rgba(46,160,67,0.3)" }}
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: THEME_P }} />
                  <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: THEME_P }} />
                </span>
                <AnimatedNumber value={sessoes24h} /> sessões de jogo nas últimas 24h
              </span>
            )}

            <div className="flex flex-wrap gap-3 mb-4 md:mb-6">
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

            {/* ⭐ REA CrazyGames: pesquisa acessível em todas as dimensões */}
            <div className="dir-search-wrap max-w-md">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  aria-label="Procurar jogo"
                  placeholder="Procurar jogo..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onFocus={() => sfx.inputFocus()}
                  data-testid="jogos-pesquisa"
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
          <div className="relative z-10 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            <motion.div
              className="h-20 w-28 sm:h-20 sm:w-32 shrink-0 rounded-2xl overflow-hidden border border-white/25"
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
            >
              <GameArt id="mmorpg" className="w-full h-full" />
            </motion.div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-display text-lg sm:text-xl font-black text-white leading-none">MUNDO BATEU</span>
                <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-rose-500 to-amber-400 text-white text-[9px] font-black animate-pulse">MMO DA PLATAFORMA · JOGO EM DESTAQUE</span>
              </div>
              <p className="text-[11px] sm:text-xs font-semibold text-white/80 mt-1 leading-snug">
                Níveis, poderes, missões e exploração num mundo 3D ao vivo — derrota jogadores e rouba os cupões deles, troca pontos por moeda da plataforma e ganha prémios reais.
              </p>
            </div>
            <div className="shrink-0 self-stretch sm:self-auto flex">
              <span className="flex-1 sm:flex-none text-center px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-amber-400 text-white font-black text-[11px] sm:text-xs shadow-lg">
                JOGAR AGORA ▶
              </span>
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
          {(["populares", "name", "category"] as const).map((s) => (
            <motion.button
              key={s}
              onClick={() => { sfx.click(); setSortBy(s); }}
              className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1"
              style={{
                backgroundColor: sortBy === s ? "hsl(220 70% 18% / 0.1)" : "transparent",
                color: sortBy === s ? THEME_P : "hsl(var(--muted-foreground))",
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {s === "populares" && <Flame className="h-3 w-3" />}
              {s === "name" ? "Nome" : s === "category" ? "Categoria" : "Populares"}
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

      {/* ⭐ POPULARES ESTA SEMANA — padrão CrazyGames/Poki reconstruído (REA) */}
      {category === "todos" && !search && (
        <section className="container mx-auto px-4 pb-2 relative z-20" data-testid="jogos-populares-rail">
          <div className="flex items-center gap-2 mb-2.5">
            <span className="h-7 w-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(247,129,102,0.12)", border: "1px solid rgba(247,129,102,0.25)" }}>
              <TrendingUp className="h-3.5 w-3.5" style={{ color: THEME_A }} />
            </span>
            <h2 className="text-sm font-black font-display tracking-tight">Populares esta Semana</h2>
            <span className="text-[10px] text-muted-foreground">· actualizado semanalmente</span>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide custom-scrollbar">
            {weekTop.map((g, i) => {
              const plays = playsOf(g.id);
              const best = bestOf(g.id);
              return (
                <Link
                  key={g.id}
                  to={`/lives?game=${g.id}`}
                  data-testid={`populares-card-${g.id}`}
                  onClick={() => sfx.click()}
                  className="game-card-v2 shrink-0 w-[168px] rounded-2xl overflow-hidden card-hover-lift btn-press"
                  style={{ border: "1px solid rgba(255,255,255,0.06)" }}
                >
                  <div className={`relative h-[86px] overflow-hidden bg-gradient-to-br ${g.grad}`}>
                    <GameArt id={g.id} className="w-full h-full" animate={false} />
                    <span className="absolute top-1.5 left-1.5 h-6 w-6 rounded-lg bg-black/45 backdrop-blur flex items-center justify-center text-[11px] font-black text-white">{i + 1}</span>
                    {i === 0 && <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-full bg-amber-400 text-[8px] font-black text-black">🔥 TOP 1</span>}
                  </div>
                  <div className="p-2.5" style={{ background: "rgba(255,255,255,0.02)" }}>
                    <p className="text-xs font-bold truncate">{g.label}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {best > 0 ? <>Recorde: <span className="text-amber-400 font-bold">{best.toLocaleString("pt-PT")}</span></> : g.players}
                      {plays > 0 && <span className="opacity-60"> · jogaste {plays}×</span>}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

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
                    className="game-card-v2 block cursor-pointer card-hover-lift btn-press btn-glow rounded-xl overflow-hidden"
                    style={{ border: "1px solid rgba(255,255,255,0.05)", "--glow-color": "#2ea043" } as React.CSSProperties}
                    onClick={() => sfx.click()}
                  >
                    {/* ARTE do jogo (padrão CrazyGames) + CTA por cima */}
                    <div className="relative h-24 sm:h-28 overflow-hidden">
                      <GameArt id={game.id} className="w-full h-full transition-transform duration-300 hover:scale-[1.04]" animate={false} />
                      <span className="absolute inset-x-0 bottom-0 h-10 pointer-events-none" style={{ background: "linear-gradient(180deg, transparent, rgba(13,17,23,0.85))" }} />
                      <span className="absolute bottom-1.5 right-1.5 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[9px] font-black text-white" style={{ background: "rgba(46,160,67,0.92)" }}>
                        JOGAR ▶
                      </span>
                    </div>
                    <div className="p-3 md:p-4 pt-2.5">
                      <h3 className="text-sm font-bold leading-tight mb-1 line-clamp-1">{game.label}</h3>
                      <p className="text-[11px] text-muted-foreground line-clamp-2 mb-2">{game.desc}</p>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold" style={{ background: "rgba(255,255,255,0.05)", color: "hsl(var(--muted-foreground))" }}>
                          {game.players}
                        </span>
                        {game.hasBot && (
                          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[10px] font-bold" style={{ background: "hsl(220 60% 40% / 0.15)", color: "hsl(220 60% 40%)" }}>
                            Bot IA
                          </span>
                        )}
                        {playsOf(game.id) > 0 && (
                          <span
                            data-testid={`plays-badge-${game.id}`}
                            className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[10px] font-bold"
                            style={{ background: "rgba(46,160,67,0.12)", color: THEME_P }}
                          >
                            <Flame className="h-2.5 w-2.5" /> {playsOf(game.id)}× tuas
                          </span>
                        )}
                      </div>
                      <div className="mt-2.5 pt-2 flex items-center justify-between" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
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
                          <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); sfx.click(); navigate(`/jogo/${game.id}`); }}
                            title={`Detalhes do ${game.label}`}
                            data-testid={`info-${game.id}`}
                            className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-md"
                            style={{ color: THEME_S, background: "rgba(88,166,255,0.1)" }}
                          >
                            <Info className="h-3 w-3" /> Detalhes
                          </motion.button>
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
          <div className="empty-state-v2 text-center py-20" data-testid="jogos-empty-state">
            <div className="empty-orb" style={{ backgroundColor: THEME_P, width: 120, height: 120, top: "20%", left: "40%" }} />
            <motion.div className="empty-float inline-block relative">
              <div className="w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-6" style={{ background: "linear-gradient(135deg, hsl(220 70% 18% / 0.1), hsl(352 73% 50% / 0.05))", border: "1px dashed hsl(220 70% 18% / 0.2)" }}>
                <Gamepad2 className="h-11 w-11 text-muted-foreground/20" />
              </div>
            </motion.div>
            <p className="text-lg font-bold text-muted-foreground">Nenhum jogo encontrado</p>
            <p className="text-sm text-muted-foreground/50 mt-1">Tenta outro termo de pesquisa ou categoria</p>
            {/* ⭐ REA Poki: empty state com ação real */}
            <button
              onClick={() => { setSearch(""); setCategory("todos"); setRegionFilter("all"); setSortBy("populares"); sfx.click(); }}
              data-testid="jogos-limpar-filtros"
              className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-black transition-transform hover:scale-105"
              style={{ background: THEME_P, color: "#fff", boxShadow: "0 4px 20px rgba(46,160,67,0.35)" }}
            >
              <Search className="h-3.5 w-3.5" /> LIMPAR FILTROS
            </button>
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
                        <GameArtChip id={g.id} size={20} /> <span>{g.label}</span>
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
