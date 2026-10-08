// @ts-nocheck
import { useState, useRef, useEffect, lazy, Suspense } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import StoriesCarousel from "@/components/StoriesCarousel";
import DailyMissions from "@/components/engagement/DailyMissions";
import CategoryNav from "@/components/CategoryNav";
import Footer from "@/components/Footer";
import { getTournaments, getTournamentStandings } from "@/lib/tournaments";
const ActiveRaffles = lazy(() => import("@/components/ActiveRaffles").then(m => ({ default: m.default })));
const WinnersSection = lazy(() => import("@/components/WinnersSection").then(m => ({ default: m.default })));
const TrustSignals = lazy(() => import("@/components/TrustSignals").then(m => ({ default: m.default })));
const PopularLeaderboard = lazy(() => import("@/components/PopularLeaderboard").then(m => ({ default: m.default })));
const MobileSocialFeed = lazy(() => import("@/components/MobileSocialFeed").then(m => ({ default: m.default })));

import { Button } from "@/components/ui/button";
import {
  Gamepad2, ArrowRight, Users, Brain,
  Radio, Trophy, ShieldCheck, Zap,
  ChevronRight, Crown, Diamond, Rocket, Play, Eye,
  Coins, Heart, Swords, Gift, Monitor, Globe,
  CheckCircle2, Ticket, Dices,
} from "lucide-react";
import { motion, useInView } from "framer-motion";
import { useSoundEffects } from "@/hooks/useSoundEffects";
import { useSEO } from "@/hooks/useSEO";
import MobileHomeApp from "@/components/mobile/MobileHomeApp";
import bateuLogo from "@/assets/bateu-logo.png";
import ShimmerText from '@/components/ui/ShimmerText';
import AnimatedNumber from '@/components/ui/AnimatedNumber';
import CardTilt from '@/components/ui/CardTilt';
import GlowOrb from '@/components/ui/GlowOrb';
import ParticleField from '@/components/ui/ParticleField';
import TypingText from '@/components/ui/TypingText';
import NeonBorder from '@/components/ui/NeonBorder';
import ScrollReveal from '@/components/ui/ScrollReveal';
import ConfettiBurst from '@/components/ui/ConfettiBurst';

/* ─── color tokens ─── */
const CYAN = "#00d4ff";const PURPLE = "#a855f7";
const GREEN = "#2ea043";
const BLUE = "#58a6ff";
const GOLD = "#fbbf24";
const DEEP_PURPLE = "#7b2ff7";

/* ─── animation variants ─── */
const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.55, ease: [0.25, 0.46, 0.45, 0.94] as const },
  }),
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: (i: number) => ({
    opacity: 1, scale: 1,
    transition: { delay: i * 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

const sectionReveal = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as const } },
};

/* ─── Animated Section Wrapper ─── */
function AnimatedSection({ children, className = "", delay = 0, style }: { children: React.ReactNode; className?: string; delay?: number; style?: React.CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.section ref={ref} initial="hidden" animate={inView ? "visible" : "hidden"} variants={sectionReveal} transition={{ delay }} className={className} style={style}>
      {children}
    </motion.section>
  );
}

/* ─── Counting Number ─── */
function CountingNumber({ target, suffix = "", duration = 2 }: { target: number; suffix?: string; duration?: number }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const hasAnimated = useRef(false);
  useEffect(() => {
    if (!inView || hasAnimated.current) return;
    hasAnimated.current = true;
    const start = performance.now();
    const step = (now: number) => {
      const elapsed = (now - start) / 1000;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [inView, target, duration]);
  return <span ref={ref}>{count.toLocaleString("pt-BR")}{suffix}</span>;
}

/* ─── Hero Particle Field ─── */
function HeroParticles() {
  const colors = [CYAN, PURPLE, GREEN, GOLD];
  const particles = useRef(
    Array.from({ length: 15 }, (_, i) => ({
      id: i,
      color: colors[i % colors.length],
      w: Math.random() * 3 + 1.5,
      h: Math.random() * 3 + 1.5,
      left: Math.random() * 100,
      top: Math.random() * 100,
      dur: Math.random() * 5 + 4,
      delay: Math.random() * 4,
      yRange: Math.random() * 60 + 20,
      xRange: Math.random() * 30 - 15,
    }))
  ).current;
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full will-optimize"
          style={{
            width: p.w + "px",
            height: p.h + "px",
            left: p.left + "%",
            top: p.top + "%",
            background: p.color,
            boxShadow: `0 0 6px ${p.color}40`,
          }}
          animate={{
            y: [0, -p.yRange, 0],
            x: [0, p.xRange, 0],
            opacity: [0, 0.7, 0],
            scale: [0.3, 1.1, 0.3],
          }}
          transition={{
            duration: p.dur,
            repeat: Infinity,
            delay: p.delay,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

/* ─── Ban Icon (not in lucide by default) ─── */
function BanIcon(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
    </svg>
  );
}

/* ─── Ticker: mensagens honestas (fallback) + eventos reais do Supabase ─── */
interface TickerItem { type: string; text: string; color: string; }
const TICKER_FALLBACK: TickerItem[] = [
  { type: "game", text: "80+ jogos gratuitos — multiplayer, bots e solo", color: GREEN },
  { type: "win", text: "Resultados de sorteios 100% verificáveis", color: GOLD },
  { type: "live", text: "Lives da comunidade em directo", color: CYAN },
  { type: "game", text: "Bónus de boas-vindas: 20 MZN + 50 pontos da sorte", color: PURPLE },
  { type: "win", text: "Joga com Luck Coins — diversão sem dinheiro real", color: GOLD },
];

/* ─── Gateway Cards (estatísticas honestas — sem números inventados) ─── */
const GATEWAY_CARDS = [
  {
    title: "ESPORTS",
    subtitle: "Competições Épicas",
    desc: "Campeonatos, ligas e torneios com prémios reais. Compete ao mais alto nível.",
    href: "/esports",
    icon: Swords,
    gradient: "linear-gradient(135deg, #0a0a1a 0%, #0d1b2a 50%, #0a0a1a 100%)",
    accentColor: CYAN,
    secondaryColor: DEEP_PURPLE,
    borderGlow: CYAN,
    statLabel: "Duelos e torneios reais",
    badge: "P2P",
  },
  {
    title: "SORTEIOS & PRÉMIOS",
    subtitle: "Sorteios Transparentes",
    desc: "Participa em sorteios verificados, ganha prémios incríveis com Luck Coins.",
    href: "/marketplace",
    icon: Gift,
    gradient: "linear-gradient(135deg, #0f0a1a 0%, #1a0a2e 50%, #0f0a1a 100%)",
    accentColor: PURPLE,
    secondaryColor: GOLD,
    borderGlow: PURPLE,
    statLabel: "Resultados 100% públicos",
    badge: "VERIFICADO",
  },
  {
    title: "JOGOS ONLINE",
    subtitle: "Clássicos & Exclusivos",
    desc: "Ludo, dominó, xadrez, UNO e muito mais. Joga e ganha Luck Coins.",
    href: "/jogos",
    icon: Gamepad2,
    gradient: "linear-gradient(135deg, #0a1a0f 0%, #0a1f14 50%, #0a1a0f 100%)",
    accentColor: GREEN,
    secondaryColor: BLUE,
    borderGlow: GREEN,
    statLabel: "Multiplayer, bots e solo",
    badge: "80+ JOGOS",
  },
];

/* ─── Categorias reais (contagens do catálogo AllGames) ─── */
const PILLAR_CATEGORIES = [
  { label: "Estratégia", icon: Brain, count: 10, color: CYAN },
  { label: "Puzzle", icon: Zap, count: 10, color: PURPLE },
  { label: "Arcade", icon: Gamepad2, count: 8, color: GREEN },
  { label: "Social", icon: Users, count: 8, color: BLUE },
];

/* ─── Jogos famosos em destaque (catálogo real — sem contagens falsas) ─── */
const FEATURED_GAMES = [
  { name: "Ludo Clássico", emoji: "🎲", mode: "1v1 / Bot", grad: `linear-gradient(135deg, ${GREEN}20, ${BLUE}10)`, border: GREEN, novo: false },
  { name: "Dominó", emoji: "⚫", mode: "1v1 / Bot", grad: `linear-gradient(135deg, ${CYAN}15, ${DEEP_PURPLE}10)`, border: CYAN, novo: false },
  { name: "Xadrez", emoji: "♞", mode: "1v1 / Bot", grad: `linear-gradient(135deg, ${BLUE}15, ${GREEN}10)`, border: BLUE, novo: false },
  { name: "Galo PRO", emoji: "✖", mode: "1v1 / Bot", grad: `linear-gradient(135deg, ${GOLD}15, ${PURPLE}10)`, border: GOLD, novo: false },
  { name: "Ligar 4", emoji: "🔴", mode: "1v1 / Bot", grad: `linear-gradient(135deg, ${CYAN}10, ${GREEN}15)`, border: CYAN, novo: false },
  { name: "Batalha de Cobras", emoji: "🐍", mode: "1v1 / Bot", grad: `linear-gradient(135deg, ${GREEN}20, ${BLUE}10)`, border: GREEN, novo: true },
  { name: "UNO", emoji: "🃏", mode: "Multijogador", grad: `linear-gradient(135deg, ${PURPLE}15, ${CYAN}10)`, border: PURPLE, novo: false },
];

/* ─── Como Funciona (passos honestos) ─── */
const HOW_IT_WORKS_STEPS = [
  { icon: Gift, title: "1. Escolhe o sorteio", desc: "Explora prémios verificados da comunidade.", color: PURPLE },
  { icon: Ticket, title: "2. Participa", desc: "Garante os teus bilhetes com Luck Coins.", color: CYAN },
  { icon: Trophy, title: "3. Resultado ao vivo", desc: "Vencedor anunciado em directo e verificável.", color: GOLD },
];

/* ─── Fair Play Items ─── */
const FAIR_PLAY_ITEMS = [
  { icon: Eye, title: "100% Transparência", desc: "Todos os resultados são verificáveis e públicos. Sem algoritmos ocultos.", color: CYAN },
  { icon: BanIcon, title: "Sem Apostas com Dinheiro Real", desc: "Nenhuma aposta com dinheiro real. Plataforma 100% legal e segura.", color: PURPLE },
  { icon: Coins, title: "Moeda Virtual Apenas", desc: "Luck Coins — moeda virtual da plataforma. Diversão sem riscos financeiros.", color: GOLD },
  { icon: Heart, title: "Jogo Responsável", desc: "Ferramentas integradas de jogo responsável: limites, pausas e alertas.", color: GREEN },
];

/* ═══════════════════════════════════════════════════════════════
   ██  INDEX — HOMEPAGE (funnel: Atenção → Interesse → Desejo → Ação)
   ═══════════════════════════════════════════════════════════════ */
export default function Index() {
  const isMobile = useIsMobile();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { sfx } = useSoundEffects();
  useSEO({ title: 'Jogos Online, Sorteios ao Vivo e Apostas Esportivas', description: 'Bateu é a plataforma líder em jogos online, sorteios ao vivo com prémios reais, apostas P2P e torneios de esports. Disponível em 12 países africanos e europeus. Jogue gratuitamente.', canonicalPath: '/' });
  /* NOTA: no mobile, o retorno antecipado para MobileHomeApp acontece DEPOIS de todos os hooks (regras dos hooks respeitadas). */

  const [activePillar, setActivePillar] = useState<string | null>(null);
  const [confettiActive, setConfettiActive] = useState(false);

  /* fetch live session count */
  const [liveNowCount, setLiveNowCount] = useState(0);
  useEffect(() => {
    const fetchLiveCount = async () => {
      try {
        const { count } = await (supabase as any).from("live_sessions").select("*", { count: "exact", head: true }).eq("status", "active");
        if (typeof count === "number") setLiveNowCount(count);
      } catch { /* silent */ }
    };
    fetchLiveCount();
    const interval = setInterval(fetchLiveCount, 30_000);
    return () => clearInterval(interval);
  }, []);

  /* stats REAIS da plataforma — sem números inventados */
  const [realStats, setRealStats] = useState({ users: 0, raffles: 0, regions: 0 });
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [usersRes, rafflesRes, regionsRes] = await Promise.all([
          (supabase as any).from("profiles_public").select("user_id", { count: "exact", head: true }),
          (supabase as any).from("raffles").select("id", { count: "exact", head: true }).eq("status", "active"),
          (supabase as any).from("regions").select("id", { count: "exact", head: true }),
        ]);
        setRealStats({
          users: typeof usersRes.count === "number" ? usersRes.count : 0,
          raffles: typeof rafflesRes.count === "number" ? rafflesRes.count : 0,
          regions: typeof regionsRes.count === "number" ? regionsRes.count : 0,
        });
      } catch { /* silent */ }
    };
    fetchStats();
    const interval = setInterval(fetchStats, 120_000);
    return () => clearInterval(interval);
  }, []);

  /* ─── dados reais: ticker, esports, sorteios, jackpot, partidas ─── */
  const [tickerItems, setTickerItems] = useState<TickerItem[]>(TICKER_FALLBACK);
  const [esports, setEsports] = useState<{ name: string; prize: string; ends: string; standings: { name: string; pts: number }[] } | null>(null);
  const [featuredRaffles, setFeaturedRaffles] = useState<any[]>([]);
  const [jackpotTotal, setJackpotTotal] = useState(0);
  const [recentMatches, setRecentMatches] = useState<number | null>(null);

  useEffect(() => {
    const iso24h = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    (async () => {
      /* Ticker real: vencedores + a acabar + contagens */
      try {
        const [winP, ending, activeCnt, livesCnt] = await Promise.all([
          supabase.from("participants").select("user_id,raffle_id,ticket_number,created_at").eq("status", "winner").order("created_at", { ascending: false }).limit(2),
          supabase.from("raffles").select("id,title,end_date").eq("status", "active").not("end_date", "is", null).order("end_date", { ascending: true }).limit(2),
          supabase.from("raffles").select("id", { count: "exact", head: true }).eq("status", "active"),
          supabase.from("live_sessions").select("*", { count: "exact", head: true }).eq("status", "active"),
        ]);
        const items: TickerItem[] = [];
        if (winP.data && winP.data.length > 0) {
          const uids = [...new Set(winP.data.map((w: any) => w.user_id))];
          const rids = [...new Set(winP.data.map((w: any) => w.raffle_id))];
          const [profs, rfs] = await Promise.all([
            supabase.from("profiles_public").select("user_id,display_name").in("user_id", uids),
            supabase.from("raffles").select("id,prize_title").in("id", rids),
          ]);
          const pm = new Map(((profs.data || []) as any[]).map((p) => [p.user_id, p.display_name as string]));
          const rm = new Map(((rfs.data || []) as any[]).map((r) => [r.id, r.prize_title as string]));
          (winP.data as any[]).forEach((w) => {
            const n = pm.get(w.user_id); const p = rm.get(w.raffle_id);
            if (n && p) items.push({ type: "win", text: `${n.split(" ")[0]} ganhou ${p} num sorteio verificado`, color: GOLD });
          });
        }
        ((ending.data || []) as any[]).forEach((r) => { if (r.title) items.push({ type: "game", text: `Acaba em breve: ${r.title}`, color: PURPLE }); });
        if (typeof activeCnt.count === "number" && activeCnt.count > 0) items.push({ type: "win", text: `${activeCnt.count} ${activeCnt.count === 1 ? "sorteio ativo" : "sorteios ativos"} agora`, color: GOLD });
        if (typeof livesCnt.count === "number" && livesCnt.count > 0) items.push({ type: "live", text: `${livesCnt.count} ${livesCnt.count === 1 ? "live ao vivo" : "lives ao vivo"} agora`, color: CYAN });
        setTickerItems([...items, ...TICKER_FALLBACK]);
      } catch { setTickerItems(TICKER_FALLBACK); }

      /* Esports real: torneio ativo + standings */
      try {
        const ts = await getTournaments("active");
        const tour = ts && ts.length > 0 ? ts[0] : null;
        if (tour) {
          let standings: { name: string; pts: number }[] = [];
          try {
            const st = await getTournamentStandings(tour.id);
            standings = st.slice(0, 5).map((s) => ({ name: s.display_name || "Jogador", pts: s.total_points }));
          } catch { /* standings opcionais */ }
          setEsports({
            name: tour.name,
            prize: tour.prize_description || (tour.prize_value ? `Prémio: ${tour.prize_value} ${tour.currency || "MT"}` : ""),
            ends: tour.end_date ? new Date(tour.end_date).toLocaleDateString("pt-PT") : "",
            standings,
          });
        }
      } catch { /* sem torneios → fallback honesto */ }

      /* Sorteios reais (3 mais recentes) + jackpot total */
      try {
        const { data } = await supabase.from("raffles").select("id,title,prize_title,sold_tickets,total_tickets,end_date,image_url").eq("status", "active").order("created_at", { ascending: false }).limit(3);
        if (data) setFeaturedRaffles(data);
        const { data: pv } = await supabase.from("raffles").select("prize_value").eq("status", "active");
        setJackpotTotal(((pv || []) as any[]).reduce((s, r) => s + Number(r.prize_value || 0), 0));
      } catch { /* silent */ }

      /* Partidas recentes 24h (sessões reais) */
      try {
        const { count } = await supabase.from("game_sessions").select("id", { count: "exact", head: true }).gte("created_at", iso24h);
        if (typeof count === "number") setRecentMatches(count);
      } catch { /* silent */ }
    })();
  }, []);

  const quadrupledTicker = [...tickerItems, ...tickerItems, ...tickerItems, ...tickerItems];

  /* ═══ MOBILE — home estilo app nativo (o melhor das duas versões de exemplo) ═══ */
  if (isMobile) {
    return <MobileHomeApp />;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col" style={{ background: "#050508" }}>
      <Navbar />
      {/* ═══════════ HERO — proposta de valor imediata ═══════════ */}
      <motion.section
        className="relative min-h-[85vh] flex flex-col items-center justify-center overflow-hidden"
        style={{
          background: `radial-gradient(ellipse 80% 60% at 20% 30%, ${CYAN}12 0%, transparent 60%),
                   radial-gradient(ellipse 70% 50% at 80% 60%, ${PURPLE}10 0%, transparent 55%),
                   radial-gradient(ellipse 60% 40% at 50% 80%, ${GREEN}08 0%, transparent 50%),
                   linear-gradient(180deg, #050508 0%, #08080f 50%, #050508 100%)`,
        }}
      >
        {/* Grid overlay */}
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: `linear-gradient(${CYAN}40 1px, transparent 1px), linear-gradient(90deg, ${CYAN}40 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
          maskImage: "radial-gradient(ellipse 70% 50% at 50% 40%, black 10%, transparent 70%)",
          WebkitMaskImage: "radial-gradient(ellipse 70% 50% at 50% 40%, black 10%, transparent 70%)",
        }} />

        {/* Orbs */}
        <motion.div className="absolute rounded-full blur-[120px] pointer-events-none" style={{ background: `${CYAN}15`, width: 600, height: 600, left: "-10%", top: "5%" }} animate={{ y: [0, -50, 0], x: [0, 30, 0], scale: [1, 1.2, 1] }} transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }} />
        <motion.div className="absolute rounded-full blur-[120px] pointer-events-none" style={{ background: `${PURPLE}12`, width: 500, height: 500, right: "-8%", top: "15%" }} animate={{ y: [0, 40, 0], x: [0, -30, 0], scale: [1, 1.15, 1] }} transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }} />
        <motion.div className="absolute rounded-full blur-[100px] pointer-events-none" style={{ background: `${GREEN}10`, width: 400, height: 400, left: "40%", bottom: "10%" }} animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.6, 0.3] }} transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }} />

        <HeroParticles />

        {/* Interactive Particle Field — mouse-reactive background */}
        {!isMobile && (
          <>
            <ParticleField colors={[CYAN, PURPLE, DEEP_PURPLE, GREEN]} count={30} speed={0.2} enableConnections={false} enableMouseRepel={true} className="z-[1]" />

            {/* Glow Orb — signature energy orb behind hero title */}
            <div className="absolute top-[15%] left-1/2 -translate-x-1/2 z-[2] pointer-events-none">
              <GlowOrb color={CYAN} secondaryColor={PURPLE} size={100} speed={10} intensity={0.5} orbitRadius={20} />
            </div>
            <div className="absolute top-[25%] right-[10%] z-[2] pointer-events-none">
              <GlowOrb color={PURPLE} secondaryColor={CYAN} size={70} speed={14} intensity={0.4} orbitRadius={15} />
            </div>
          </>
        )}

        {/* Hero content */}
        <div className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 text-center pt-24 pb-8">
          {/* Logo */}
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }} className="mb-6">
            <img src={bateuLogo} alt="Bateu" className="h-14 sm:h-18 mx-auto mb-4" style={{ filter: `drop-shadow(0 0 30px ${CYAN}30)` }} />
          </motion.div>

          {/* Tagline */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter mb-4"
            style={{ lineHeight: 1.05 }}
          >
            <ShimmerText colors={['#ffffff', '#00d4ff', '#7b2ff7', '#a855f7', '#fbbf24', '#ffffff']} speed={5} className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter">COMPETE. PREVEJA.<br />CONQUISTA.</ShimmerText>
          </motion.h1>

          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.6 }} className="text-base sm:text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto mb-8 leading-relaxed">
            A plataforma definitiva de esports, sorteios e jogos online.
            <br className="hidden sm:block" />
            <span className="text-zinc-300 font-semibold"><TypingText texts={['Apostas entre jogadores', 'Sorteios ao vivo', 'Jogos exclusivos', 'Torneios de eSports']} typingSpeed={70} deleteSpeed={35} pauseDuration={2500} cursorColor={CYAN} soundEnabled={false} className="text-lg sm:text-xl md:text-2xl font-bold" /> — 100% transparente.</span>
          </motion.p>

          {/* CTA Buttons */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55, duration: 0.5 }} className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
            <Button size="lg" onClick={() => { sfx.buttonClick(); setConfettiActive(true); setTimeout(() => setConfettiActive(false), 100); navigate("/register"); }} className="text-base font-bold px-8 py-6 rounded-xl h-auto shadow-lg transition-all duration-300 hover:scale-105" style={{ background: `linear-gradient(135deg, ${CYAN}, ${DEEP_PURPLE})`, boxShadow: `0 0 30px ${CYAN}30, 0 8px 32px rgba(0,0,0,0.4)` }}>
              <Rocket className="mr-2 h-5 w-5" /> Começar Agora — É Grátis
            </Button>
            <Button size="lg" variant="outline" onClick={() => { sfx.whoosh(); navigate("/jogos"); }} className="text-base font-semibold px-8 py-6 rounded-xl h-auto border-zinc-700 text-zinc-300 hover:bg-zinc-800/50 hover:text-white transition-all duration-300">
              <Play className="mr-2 h-5 w-5" /> Explorar Jogos
            </Button>
          </motion.div>

          {/* ⭐ CTA central — entrar direto no jogo principal (Bateu World 3D) */}
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.7, duration: 0.5 }} className="flex justify-center mb-12">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              animate={{ boxShadow: ["0 0 24px rgba(244,63,94,0.45)", "0 0 48px rgba(251,191,36,0.6)", "0 0 24px rgba(244,63,94,0.45)"] }}
              onClick={() => { sfx.whoosh(); navigate("/lives?game=mmorpg"); }}
              data-testid="home-cta-jogar-central"
              className="relative overflow-hidden rounded-2xl px-8 sm:px-12 py-4 sm:py-5 font-display font-black text-lg sm:text-2xl text-white tracking-wide transition-colors"
              style={{ background: "linear-gradient(120deg, #e11d48 0%, #f97316 55%, #fbbf24 100%)" }}
            >
              <motion.span
                className="absolute inset-0 pointer-events-none"
                style={{ background: "linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.35) 50%, transparent 70%)" }}
                animate={{ x: ["-100%", "100%"] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: "linear" }}
              />
              <span className="relative z-10 flex items-center gap-3">
                <span className="text-2xl sm:text-3xl">🌍</span> JOGAR AGORA — BATEU WORLD 3D
                <span className="text-2xl sm:text-3xl">▶</span>
              </span>
            </motion.button>
          </motion.div>

          {/* ── Gateway Cards ── */}
          <div className={`grid gap-4 sm:gap-6 ${isMobile ? "grid-cols-1 max-w-sm mx-auto" : "grid-cols-3"}`}>
            {GATEWAY_CARDS.map((card, i) => {
              const Icon = card.icon;
              const cardContent = (
                <Link to={card.href} className="group relative block rounded-2xl p-5 sm:p-6 overflow-hidden cursor-pointer transition-all duration-500" onClick={() => sfx.whoosh()} style={{
                  background: card.gradient,
                  border: `1px solid ${card.borderGlow}20`,
                  boxShadow: activePillar === card.title ? `0 0 40px ${card.borderGlow}25, 0 20px 60px rgba(0,0,0,0.5)` : `0 8px 32px rgba(0,0,0,0.3)`,
                }}>
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" style={{ background: `radial-gradient(circle at 50% 0%, ${card.accentColor}15, transparent 70%)` }} />
                  <span className="absolute top-3 right-3 text-[10px] font-black tracking-wider px-2 py-0.5 rounded-full" style={{ background: `${card.accentColor}20`, color: card.accentColor, border: `1px solid ${card.accentColor}30` }}>{card.badge}</span>
                  <div className="h-12 w-12 rounded-xl flex items-center justify-center mb-4 transition-all duration-500 group-hover:scale-110" style={{ background: `linear-gradient(135deg, ${card.accentColor}20, ${card.secondaryColor}15)`, border: `1px solid ${card.accentColor}30`, boxShadow: `0 0 20px ${card.accentColor}15` }}>
                    <Icon className="h-6 w-6" style={{ color: card.accentColor }} />
                  </div>
                  <h3 className="text-lg font-bold mb-1 tracking-tight" style={{ color: card.accentColor }}>{card.title}</h3>
                  <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">{card.subtitle}</p>
                  <p className="text-sm text-zinc-400 leading-relaxed mb-4">{card.desc}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-zinc-500">{card.statLabel}</span>
                    <div className="flex items-center gap-1 text-xs font-bold transition-all duration-300 group-hover:gap-2" style={{ color: card.accentColor }}>
                      Explorar <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
                    </div>
                  </div>
                  {!isMobile && <motion.div className="absolute inset-0 rounded-2xl pointer-events-none will-optimize" style={{ border: `1px solid ${card.accentColor}` }} animate={{ opacity: [0, 0.3, 0] }} transition={{ duration: 3, repeat: Infinity, delay: i * 0.5 }} />}
                </Link>
              );
              return (
                <motion.div key={card.title} custom={i} variants={scaleIn} initial="hidden" animate="visible" onHoverStart={() => setActivePillar(card.title)} onHoverEnd={() => setActivePillar(null)}>
                  {isMobile ? cardContent : <CardTilt maxTilt={8} scaleOnHover={1.02} borderGlow={card.accentColor}>{cardContent}</CardTilt>}
                </motion.div>
              );
            })}
          </div>

          {/* Scroll indicator */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5, duration: 1 }} className="mt-12 flex flex-col items-center gap-2">
            <span className="text-[11px] uppercase tracking-[0.2em] text-zinc-600 font-medium">Descobrir mais</span>
            <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}>
              <ChevronRight className="h-5 w-5 text-zinc-600 rotate-90" />
            </motion.div>
          </motion.div>
        </div>

        {/* Confetti burst on CTA click */}
        <ConfettiBurst active={confettiActive} colors={[CYAN, PURPLE, GOLD, GREEN, DEEP_PURPLE]} particleCount={60} />
      </motion.section>

      {/* ═══════════ LIVE ACTIVITY TICKER (eventos reais do Supabase) ═══════════ */}
      <div className="relative overflow-hidden py-3 border-y" style={{ background: "linear-gradient(90deg, #050508, #0a0a14, #050508)", borderColor: "rgba(255,255,255,0.05)" }}>
        <div className="absolute left-0 top-0 bottom-0 w-32 z-10 pointer-events-none" style={{ background: "linear-gradient(90deg, #050508, transparent)" }} />
        <div className="absolute right-0 top-0 bottom-0 w-32 z-10 pointer-events-none" style={{ background: "linear-gradient(-90deg, #050508, transparent)" }} />
        <div className="flex whitespace-nowrap ticker-css-scroll">
          {quadrupledTicker.map((item, i) => (
            <div key={i} className="flex items-center gap-2 mx-6 shrink-0">
              {item.type === "win" && <Trophy className="h-3.5 w-3.5 shrink-0" style={{ color: item.color }} />}
              {item.type === "live" && <Radio className="h-3.5 w-3.5 shrink-0" style={{ color: item.color }} />}
              {item.type === "game" && <Gamepad2 className="h-3.5 w-3.5 shrink-0" style={{ color: item.color }} />}
              <span className="text-sm font-medium text-zinc-400">{item.text}</span>
              <span className="text-zinc-700 mx-2">•</span>
            </div>
          ))}
        </div>
      </div>

      {/* ═══════════ SORTEIOS ATIVOS — conteúdo real logo acima da dobra ═══════════
           Estratégia "mostrar, não contar": o utilizador vê prémios reais ANTES
           de qualquer secção de marketing. Maior impacto de conversão. */}
      <AnimatedSection className="py-10 sm:py-14" style={{ background: `linear-gradient(180deg, #050508, #08060f)` }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <Suspense fallback={<div className="h-40" />}><ActiveRaffles /></Suspense>
        </div>
      </AnimatedSection>

      {/* ═══════════ STORIES (social hook, após a primeira impressão) ═══════════ */}
      <div className="w-full max-w-6xl mx-auto px-4 pt-5">
        <StoriesCarousel />
      </div>

      {/* ═══════════ FEED SOCIAL "PARA TI" (mobile — psicologia de app social) ═══════════ */}
      <Suspense fallback={<div className="h-40" />}>
        <MobileSocialFeed />
      </Suspense>

      {/* ═══════════ MAIN CONTENT ═══════════ */}
      <main className="flex-1">

        {/* ─── PILLAR 1: ESPORTS (dados reais; fallback honesto) ─── */}
        <AnimatedSection className="relative overflow-hidden py-16 sm:py-24 hidden md:block" style={{ background: `radial-gradient(ellipse 60% 40% at 15% 50%, ${CYAN}08, transparent), linear-gradient(180deg, #050508 0%, #060610 50%, #050508 100%)` }}>
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-xl flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${CYAN}25, ${DEEP_PURPLE}20)`, border: `1px solid ${CYAN}30`, boxShadow: `0 0 25px ${CYAN}15` }}>
                  <Swords className="h-5 w-5" style={{ color: CYAN }} />
                </div>
                <div>
                  <ShimmerText colors={['#00d4ff', '#7b2ff7', '#00d4ff']} speed={3} className="text-2xl sm:text-3xl font-black tracking-tight">ESPORTS</ShimmerText>
                  <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Competições • Campeonatos • Ligas</p>
                </div>
              </div>
              <Link to="/esports" className="group flex items-center gap-1.5 text-sm font-bold" style={{ color: CYAN }} onClick={() => sfx.whoosh()}>
                Ver Torneios <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>

            <div className={`grid ${isMobile ? "grid-cols-1" : "grid-cols-3"} gap-4 sm:gap-6`}>
              {esports ? (
                <>
                  {/* Torneio ativo real */}
                  <motion.div whileHover={{ scale: 1.02 }} className={`${isMobile ? "" : "col-span-2"} relative rounded-2xl overflow-hidden cursor-pointer`} style={{ background: "linear-gradient(135deg, #0a0f1a, #0d1525)", border: `1px solid ${CYAN}15` }} onClick={() => { sfx.whoosh(); navigate("/esports"); }}>
                    <div className="absolute inset-0 opacity-30" style={{ background: `radial-gradient(ellipse at 80% 20%, ${CYAN}15, transparent 60%)` }} />
                    <div className="relative p-6 sm:p-8">
                      <div className="flex items-center gap-2 mb-4">
                        <span className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: `${CYAN}15`, color: CYAN, border: `1px solid ${CYAN}25` }}><Radio className="h-3 w-3" /> TORNEIO ATIVO</span>
                        {esports.ends && <span className="text-xs text-zinc-500">termina {esports.ends}</span>}
                      </div>
                      <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">{esports.name}</h3>
                      {esports.prize && <p className="text-sm text-zinc-400 mb-4">{esports.prize}</p>}
                      <p className="text-sm text-zinc-500">Acompanha as classificações em tempo real e apoia os teus jogadores favoritos.</p>
                    </div>
                  </motion.div>
                  {/* Ranking real do torneio */}
                  <NeonBorder colors={[CYAN, DEEP_PURPLE]} speed={6} glowIntensity={0.4} borderWidth={1} borderRadius="1rem">
                    <div className="rounded-2xl p-5" style={{ background: "linear-gradient(180deg, #0a0f1a, #080c16)", border: `1px solid ${CYAN}10` }}>
                      <h4 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-4 flex items-center gap-2"><Trophy className="h-4 w-4" style={{ color: GOLD }} /> Ranking Real</h4>
                      <div className="space-y-3">
                        {esports.standings.map((s, i) => (
                          <div key={i} className="flex items-center gap-3">
                            <span className="h-7 w-7 rounded-lg flex items-center justify-center text-xs font-black" style={{ background: i < 3 ? `linear-gradient(135deg, ${GOLD}30, ${GOLD}10)` : "rgba(255,255,255,0.05)", color: i < 3 ? GOLD : "#71717a", border: `1px solid ${i < 3 ? GOLD + "25" : "rgba(255,255,255,0.08)"}` }}>{i + 1}</span>
                            <span className="text-sm font-semibold text-zinc-300 flex-1 truncate">{s.name}</span>
                            <span className="text-xs font-bold text-zinc-500">{s.pts} pts</span>
                          </div>
                        ))}
                        {esports.standings.length === 0 && <p className="text-xs text-zinc-500">As classificações serão publicadas no início das partidas.</p>}
                      </div>
                      <Link to="/esports" className="mt-4 block text-center text-xs font-bold py-2 rounded-lg transition-all duration-300 hover:opacity-80" style={{ color: CYAN, background: `${CYAN}08`, border: `1px solid ${CYAN}15` }} onClick={() => sfx.whoosh()}>Ver Ranking Completo</Link>
                    </div>
                  </NeonBorder>
                </>
              ) : (
                <>
                  {/* Fallback honesto: funcionalidades reais do hub */}
                  <motion.div whileHover={{ scale: 1.02 }} className={`${isMobile ? "" : "col-span-2"} relative rounded-2xl overflow-hidden cursor-pointer`} style={{ background: "linear-gradient(135deg, #0a0f1a, #0d1525)", border: `1px solid ${CYAN}15` }} onClick={() => { sfx.whoosh(); navigate("/esports"); }}>
                    <div className="absolute inset-0 opacity-30" style={{ background: `radial-gradient(ellipse at 80% 20%, ${CYAN}15, transparent 60%)` }} />
                    <div className="relative p-6 sm:p-8">
                      <h3 className="text-xl sm:text-2xl font-bold text-white mb-4">Compete contra jogadores reais</h3>
                      <div className="space-y-3">
                        {[
                          { icon: Swords, label: "Duelos P2P — desafia qualquer jogador", color: CYAN },
                          { icon: Trophy, label: "Torneios com ranking real e prémios", color: GOLD },
                          { icon: Crown, label: "Ligas por temporada com promoções", color: PURPLE },
                        ].map((f, i) => {
                          const FIcon = f.icon;
                          return (
                            <div key={i} className="flex items-center gap-3 rounded-xl p-3" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${f.color}12` }}>
                              <FIcon className="h-4 w-4 shrink-0" style={{ color: f.color }} />
                              <span className="text-sm text-zinc-300 font-medium">{f.label}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </motion.div>
                  <NeonBorder colors={[CYAN, DEEP_PURPLE]} speed={6} glowIntensity={0.4} borderWidth={1} borderRadius="1rem">
                    <div className="rounded-2xl p-5 flex flex-col items-center justify-center text-center h-full" style={{ background: "linear-gradient(180deg, #0a0f1a, #080c16)", border: `1px solid ${CYAN}10` }}>
                      <div className="h-14 w-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: `linear-gradient(135deg, ${CYAN}20, ${DEEP_PURPLE}15)`, border: `1px solid ${CYAN}30` }}>
                        <Swords className="h-7 w-7" style={{ color: CYAN }} />
                      </div>
                      <p className="text-sm text-zinc-400 mb-4">Entra na arena e mostra as tuas habilidades contra a comunidade.</p>
                      <Button size="sm" onClick={() => { sfx.buttonClick(); navigate("/esports"); }} className="font-bold rounded-lg" style={{ background: `linear-gradient(135deg, ${CYAN}, ${DEEP_PURPLE})` }}>
                        Entrar na Arena
                      </Button>
                    </div>
                  </NeonBorder>
                </>
              )}
            </div>
          </div>
        </AnimatedSection>

        {/* Divider */}
        <div className="h-px mx-auto max-w-md" style={{ background: `linear-gradient(90deg, transparent, ${CYAN}20, ${PURPLE}20, transparent)` }} />

        {/* ─── PILLAR 2: SORTEIOS (100% dados reais) ─── */}
        <AnimatedSection className="relative overflow-hidden py-16 sm:py-24 hidden md:block" delay={0.1} style={{ background: `radial-gradient(ellipse 60% 40% at 85% 50%, ${PURPLE}08, transparent), linear-gradient(180deg, #050508 0%, #0a0814 50%, #050508 100%)` }}>
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-xl flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${PURPLE}25, ${GOLD}15)`, border: `1px solid ${PURPLE}30`, boxShadow: `0 0 25px ${PURPLE}15` }}>
                  <Gift className="h-5 w-5" style={{ color: PURPLE }} />
                </div>
                <div>
                  <ShimmerText colors={['#a855f7', '#fbbf24', '#a855f7']} speed={3.5} className="text-2xl sm:text-3xl font-black tracking-tight">SORTEIOS & PRÉMIOS</ShimmerText>
                  <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Sorteios Verificados • Prémios Reais</p>
                </div>
              </div>
              <Link to="/marketplace" className="group flex items-center gap-1.5 text-sm font-bold" style={{ color: PURPLE }} onClick={() => sfx.whoosh()}>
                Ver Sorteios <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>

            <div className={`grid ${isMobile ? "grid-cols-1" : "grid-cols-3"} gap-4 sm:gap-6`}>
              {/* Jackpot real (soma dos sorteios ativos) + sorteios reais */}
              <motion.div whileHover={{ scale: 1.02 }} className={`${isMobile ? "" : "col-span-2"} relative rounded-2xl overflow-hidden`} style={{ background: "linear-gradient(135deg, #0f0a1a, #140e20)", border: `1px solid ${PURPLE}15` }}>
                <div className="absolute inset-0 opacity-40" style={{ background: `radial-gradient(ellipse at 70% 30%, ${GOLD}10, transparent 60%)` }} />
                <div className="relative p-6 sm:p-8">
                  {jackpotTotal > 0 && (
                    <>
                      <div className="flex items-center gap-2 mb-6"><Diamond className="h-4 w-4" style={{ color: GOLD }} /><span className="text-xs font-bold uppercase tracking-wider" style={{ color: GOLD }}>Prémios em Jogo Agora</span></div>
                      <motion.div className="text-4xl sm:text-6xl font-black mb-2" style={{ background: `linear-gradient(135deg, ${GOLD}, #f59e0b, ${GOLD})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }} animate={{ scale: [1, 1.02, 1] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}>
                        <AnimatedNumber value={jackpotTotal} duration={3} prefix="MT " locale="pt-BR" className="inline" />
                      </motion.div>
                      <p className="text-sm text-zinc-500 mb-8">soma real dos sorteios ativos neste momento</p>
                    </>
                  )}
                  <div className={`grid ${featuredRaffles.length > 0 ? "grid-cols-2 sm:grid-cols-3" : ""} gap-3`}>
                    {featuredRaffles.map((raffle, i) => (
                      <motion.div key={raffle.id || i} whileHover={{ scale: 1.03, y: -2 }} className="rounded-xl p-4 cursor-pointer transition-all duration-300" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${GOLD}18` }} onClick={() => { sfx.whoosh(); navigate(raffle.id ? `/raffle/${raffle.id}` : "/marketplace"); }}>
                        <span className="text-2xl block mb-1">🎁</span>
                        <p className="text-xs font-bold text-white mb-1 leading-tight line-clamp-1">{raffle.title || "Sorteio"}</p>
                        {raffle.prize_title && <p className="text-[10px] text-zinc-400 mb-2 line-clamp-1">{raffle.prize_title}</p>}
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-zinc-500">{raffle.sold_tickets ?? 0} bilhetes</span>
                          {raffle.end_date && <span className="text-[10px] font-bold" style={{ color: PURPLE }}>{new Date(raffle.end_date).toLocaleDateString("pt-PT", { day: "2-digit", month: "short" })}</span>}
                        </div>
                      </motion.div>
                    ))}
                    {featuredRaffles.length === 0 && (
                      <div className="col-span-full rounded-xl p-5 text-center" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <Gift className="h-8 w-8 mx-auto mb-3" style={{ color: PURPLE }} />
                        <p className="text-sm font-semibold text-zinc-300 mb-1">Ainda não há sorteios ativos</p>
                        <p className="text-xs text-zinc-500 mb-4">Cria o teu próprio sorteio ou volta em breve para ver os novos prémios.</p>
                        <Button size="sm" onClick={() => { sfx.buttonClick(); navigate("/dashboard/raffles"); }} className="font-bold rounded-lg" style={{ background: `linear-gradient(135deg, ${PURPLE}, ${GOLD})` }}>
                          Criar Sorteio
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>

              {/* Como Funciona (substitui lista falsa de vencedores) */}
              <NeonBorder colors={[PURPLE, GOLD]} speed={7} glowIntensity={0.35} borderWidth={1} borderRadius="1rem">
                <div className="rounded-2xl p-5 h-full flex flex-col" style={{ background: "linear-gradient(180deg, #0f0a1a, #0c0816)", border: `1px solid ${PURPLE}10` }}>
                  <h4 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-4 flex items-center gap-2"><CheckCircle2 className="h-4 w-4" style={{ color: GREEN }} /> Como Funciona</h4>
                  <div className="space-y-4 flex-1">
                    {HOW_IT_WORKS_STEPS.map((step, i) => {
                      const SIcon = step.icon;
                      return (
                        <motion.div key={step.title} initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.12, duration: 0.4 }} viewport={{ once: true }} className="flex items-start gap-3">
                          <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${step.color}15`, border: `1px solid ${step.color}25` }}>
                            <SIcon className="h-4 w-4" style={{ color: step.color }} />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-zinc-300 leading-tight">{step.title}</p>
                            <p className="text-[11px] text-zinc-500 mt-0.5">{step.desc}</p>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                  <div className="mt-4 pt-3" style={{ borderTop: `1px solid ${PURPLE}10` }}>
                    <Link to="/how-it-works" className="flex items-center justify-center gap-1.5 text-xs font-bold py-2 rounded-lg transition-all duration-300 hover:opacity-80" style={{ color: PURPLE, background: `${PURPLE}08`, border: `1px solid ${PURPLE}15` }} onClick={() => sfx.whoosh()}>
                      Saber mais <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              </NeonBorder>
            </div>
          </div>
        </AnimatedSection>

        {/* Divider */}
        <div className="h-px mx-auto max-w-md" style={{ background: `linear-gradient(90deg, transparent, ${PURPLE}20, ${GREEN}20, transparent)` }} />

        {/* ─── PILLAR 3: JOGOS (catálogo real — jogos famosos primeiro) ─── */}
        <AnimatedSection className="relative overflow-hidden py-16 sm:py-24 hidden md:block" delay={0.2} style={{ background: `radial-gradient(ellipse 60% 40% at 50% 80%, ${GREEN}08, transparent), linear-gradient(180deg, #050508 0%, #060a08 50%, #050508 100%)` }}>
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-xl flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${GREEN}25, ${BLUE}15)`, border: `1px solid ${GREEN}30`, boxShadow: `0 0 25px ${GREEN}15` }}>
                  <Gamepad2 className="h-5 w-5" style={{ color: GREEN }} />
                </div>
                <div>
                  <ShimmerText colors={['#2ea043', '#58a6ff', '#2ea043']} speed={4} className="text-2xl sm:text-3xl font-black tracking-tight">JOGOS ONLINE</ShimmerText>
                  <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">80+ Jogos • Multiplayer • Skill-Based</p>
                </div>
              </div>
              <Link to="/jogos" className="group flex items-center gap-1.5 text-sm font-bold" style={{ color: GREEN }} onClick={() => sfx.whoosh()}>
                Ver Todos os Jogos <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>

            {/* Categorias reais (contagens do catálogo) */}
            <div className={`grid ${isMobile ? "grid-cols-2" : "grid-cols-4"} gap-3 mb-6`}>
              {PILLAR_CATEGORIES.map((cat, i) => {
                const Icon = cat.icon;
                return (
                  <motion.button key={cat.label} custom={i} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.98 }} className="rounded-xl p-4 text-left transition-all duration-300" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${cat.color}15` }} onClick={() => { sfx.whoosh(); navigate("/jogos"); }}>
                    <Icon className="h-5 w-5 mb-2" style={{ color: cat.color }} />
                    <p className="text-sm font-bold text-zinc-200">{cat.label}</p>
                    <p className="text-[11px] text-zinc-500">{cat.count} jogos</p>
                  </motion.button>
                );
              })}
            </div>

            {/* Jogos famosos em destaque — Ludo, Dominó, Xadrez… */}
            <div className={`grid ${isMobile ? "grid-cols-2" : "grid-cols-4"} gap-3 sm:gap-4`}>
              {/* BATEU WORLD 3D — jogo permanente em destaque */}
              <motion.div custom={0} variants={scaleIn} initial="hidden" whileInView="visible" viewport={{ once: true }} whileHover={{ scale: 1.05, y: -4 }} whileTap={{ scale: 0.97 }} className="relative rounded-xl p-4 cursor-pointer overflow-hidden transition-all duration-300 col-span-2 sm:col-span-2" style={{ background: "linear-gradient(135deg, #4c0519 0%, #9f1239 55%, #312e81 100%)", border: `2px solid rgba(244,63,94,0.5)`, boxShadow: "0 0 30px rgba(244,63,94,0.35)" }} onClick={() => { sfx.whoosh(); navigate("/world"); }}>
                <span className="absolute top-2 right-2 text-[9px] font-black px-1.5 py-0.5 rounded animate-pulse" style={{ background: "linear-gradient(90deg,#f43f5e,#fb923c)", color: "#fff" }}>MMO 3D · DESTAQUE</span>
                <div className="flex items-start gap-3">
                  <span className="text-3xl">🌍</span>
                  <div className="min-w-0">
                    <p className="text-sm font-black text-white mb-0.5 leading-tight">BATEU WORLD 3D</p>
                    <p className="text-[10px] font-semibold text-white/75 leading-snug mb-1">Mundo 3D em tempo real, jogadores ao vivo, sorteios e cupões reais — o jogo permanente da Bateu.</p>
                    <div className="flex items-center gap-1"><Users className="h-3 w-3" style={{ color: "#fda4af" }} /><span className="text-[10px] font-bold" style={{ color: "#fda4af" }}>Continua a tua aventura</span></div>
                  </div>
                </div>
              </motion.div>
              {FEATURED_GAMES.map((game, i) => (
                <motion.div key={game.name} custom={i + 1} variants={scaleIn} initial="hidden" whileInView="visible" viewport={{ once: true }} whileHover={{ scale: 1.05, y: -4 }} whileTap={{ scale: 0.97 }} className="relative rounded-xl p-4 cursor-pointer overflow-hidden transition-all duration-300" style={{ background: game.grad, border: `1px solid ${game.border}15` }} onClick={() => { sfx.whoosh(); navigate("/jogos"); }}>
                  {game.novo && <span className="absolute top-2 right-2 text-[9px] font-black px-1.5 py-0.5 rounded" style={{ background: `${PURPLE}20`, color: PURPLE, border: `1px solid ${PURPLE}35` }}>NOVO</span>}
                  <span className="text-3xl block mb-3">{game.emoji}</span>
                  <p className="text-sm font-bold text-zinc-200 mb-1 leading-tight">{game.name}</p>
                  <div className="flex items-center gap-1"><Dices className="h-3 w-3 text-zinc-500" /><span className="text-[11px] text-zinc-500">{game.mode}</span></div>
                </motion.div>
              ))}
            </div>

            {/* Barra de atividade — contagem real de sessões 24h */}
            <NeonBorder colors={[GREEN, BLUE]} speed={8} glowIntensity={0.3} borderWidth={1} borderRadius="0.75rem">
              <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${GREEN}10` }}>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="h-3 w-3 rounded-full" style={{ background: GREEN, boxShadow: `0 0 10px ${GREEN}60` }} />
                    <motion.div className="absolute inset-0 h-3 w-3 rounded-full" style={{ background: GREEN }} animate={{ scale: [1, 2, 1], opacity: [0.5, 0, 0.5] }} transition={{ duration: 2, repeat: Infinity }} />
                  </div>
                  <span className="text-sm text-zinc-400">
                    {recentMatches !== null && recentMatches > 0
                      ? <><span className="font-bold text-white">{recentMatches.toLocaleString("pt-BR")}</span> {recentMatches === 1 ? "partida nas últimas 24h" : "partidas nas últimas 24h"}</>
                      : "80+ jogos à tua espera — desafia um amigo ou o bot"}
                  </span>
                </div>
                <Button size="sm" onClick={() => { sfx.buttonClick(); navigate("/jogos"); }} className="font-bold rounded-lg" style={{ background: `linear-gradient(135deg, ${GREEN}, ${BLUE})` }}>
                  <Play className="h-3.5 w-3.5 mr-1.5" /> Jogar Agora
                </Button>
              </motion.div>
            </NeonBorder>
          </div>
        </AnimatedSection>

        {/* ═══════════ MMORPG FEATURED BANNER ═══════════ */}
        <AnimatedSection className="relative overflow-hidden py-10 sm:py-16" style={{ background: `linear-gradient(180deg, #050508 0%, #0a0520 50%, #050508 100%)` }}>
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <motion.div
              whileHover={{ scale: 1.01 }}
              className="relative rounded-3xl overflow-hidden cursor-pointer"
              style={{
                background: `linear-gradient(135deg, #0a0520 0%, #150a30 30%, #0d1a3a 60%, #0a0520 100%)`,
                border: `1px solid ${PURPLE}25`,
                boxShadow: `0 0 60px ${PURPLE}15, 0 0 120px ${CYAN}08, 0 20px 60px rgba(0,0,0,0.5)`,
              }}
              onClick={() => { sfx.buttonClick(); navigate("/lives?game=mmorpg"); }}
            >
              {/* Animated glow border */}
              <motion.div className="absolute inset-0 rounded-3xl pointer-events-none" style={{ border: `2px solid ${PURPLE}` }} animate={{ opacity: [0.15, 0.4, 0.15] }} transition={{ duration: 3, repeat: Infinity }} />
              <motion.div className="absolute inset-0 rounded-3xl pointer-events-none" style={{ border: `1px solid ${CYAN}` }} animate={{ opacity: [0, 0.2, 0] }} transition={{ duration: 4, repeat: Infinity, delay: 1 }} />

              {/* Background orbs */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <motion.div className="absolute rounded-full blur-[80px]" style={{ background: `${PURPLE}20`, width: 300, height: 300, left: "-5%", top: "-20%" }} animate={{ y: [0, -30, 0], scale: [1, 1.2, 1] }} transition={{ duration: 8, repeat: Infinity }} />
                <motion.div className="absolute rounded-full blur-[80px]" style={{ background: `${CYAN}15`, width: 250, height: 250, right: "-5%", bottom: "-20%" }} animate={{ y: [0, 20, 0], scale: [1, 1.15, 1] }} transition={{ duration: 10, repeat: Infinity, delay: 2 }} />
                <motion.div className="absolute rounded-full blur-[60px]" style={{ background: `${GOLD}10`, width: 200, height: 200, left: "50%", top: "50%" }} animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.6, 0.3] }} transition={{ duration: 6, repeat: Infinity, delay: 1 }} />
              </div>

              <div className="relative z-10 p-6 sm:p-10 flex flex-col sm:flex-row items-center gap-6 sm:gap-10">
                {/* Left: Icon & Text */}
                <div className="flex-1 text-center sm:text-left">
                  <div className="flex items-center justify-center sm:justify-start gap-2 mb-3">
                    <span className="text-[10px] font-black tracking-widest px-3 py-1 rounded-full animate-pulse" style={{ background: "rgba(250,204,21,0.18)", color: "#facc15", border: "1px solid rgba(250,204,21,0.4)" }}>JOGO EM DESTAQUE</span>
                    <span className="text-[10px] font-black tracking-widest px-3 py-1 rounded-full" style={{ background: `${GREEN}20`, color: GREEN, border: `1px solid ${GREEN}30` }}>MUNDO REAL</span>
                  </div>
                  <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight mb-3 leading-tight">
                    <span style={{ background: `linear-gradient(135deg, #fff, ${GOLD}, ${CYAN})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>Bateu World 3D</span>
                  </h2>
                  <p className="text-sm sm:text-base text-zinc-400 max-w-lg mb-5 leading-relaxed">
                    O MMO oficial da Bateu! Entra num mundo 3D ao vivo: sobe de nível, desbloqueia poderes, derrota monstros e outros jogadores para roubar os cupões deles, troca pontos por moeda da plataforma, explora terras secretas e participa em sorteios reais.
                  </p>
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 mb-5">
                    {[
                      { icon: Swords, label: "Níveis & Poderes", color: GOLD },
                      { icon: Users, label: "Jogadores ao Vivo", color: CYAN },
                      { icon: Coins, label: "Pontos → Moeda", color: GREEN },
                      { icon: Globe, label: "Exploração", color: PURPLE },
                    ].map((f) => {
                      const FIcon = f.icon;
                      return (
                        <div key={f.label} className="flex items-center gap-1.5">
                          <FIcon className="h-3.5 w-3.5" style={{ color: f.color }} />
                          <span className="text-xs font-semibold text-zinc-300">{f.label}</span>
                        </div>
                      );
                    })}
                  </div>
                  <Button size="lg" className="font-bold rounded-xl h-auto px-8 py-4 text-base transition-all duration-300 hover:scale-105" style={{ background: `linear-gradient(135deg, ${PURPLE}, ${CYAN})`, boxShadow: `0 0 30px ${PURPLE}30, 0 8px 32px rgba(0,0,0,0.4)` }}>
                    <Rocket className="mr-2 h-5 w-5" /> Entrar no Mundo
                  </Button>
                </div>

                {/* Right: Visual showcase */}
                <div className="relative shrink-0">
                  <motion.div
                    className="text-8xl sm:text-9xl md:text-[10rem] select-none"
                    animate={{ y: [0, -10, 0], rotate: [0, 2, -2, 0] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  >
                    🌍
                  </motion.div>
                  {/* Floating class icons */}
                  {!isMobile && [
                    { emoji: "⚔️", x: "-20px", y: "-10px", delay: 0 },
                    { emoji: "🔮", x: "60px", y: "-30px", delay: 0.5 },
                    { emoji: "🏹", x: "-40px", y: "40px", delay: 1 },
                    { emoji: "🗡️", x: "50px", y: "50px", delay: 1.5 },
                    { emoji: "🛡️", x: "-10px", y: "70px", delay: 2 },
                    { emoji: "💪", x: "70px", y: "20px", delay: 2.5 },
                  ].map((item, i) => (
                    <motion.div
                      key={i}
                      className="absolute text-2xl sm:text-3xl select-none will-optimize"
                      style={{ left: item.x, top: item.y }}
                      animate={{ y: [0, -8, 0], opacity: [0.6, 1, 0.6], scale: [0.9, 1.1, 0.9] }}
                      transition={{ duration: 3, repeat: Infinity, delay: item.delay, ease: "easeInOut" }}
                    >
                      {item.emoji}
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </AnimatedSection>

        {/* ─── MISSÕES DIÁRIAS (engagement — antes da prova social) ─── */}
        <AnimatedSection className="relative py-10" style={{ background: "#050508" }}>
          <div className="max-w-3xl mx-auto px-4 sm:px-6">
            <DailyMissions />
          </div>
        </AnimatedSection>

        {/* ═══════════ CATEGORY NAV (atalhos de categorias) ═══════════ */}
        <ScrollReveal direction='up' delay={100}>
          <CategoryNav />
        </ScrollReveal>

        {/* ═══════════ POPULAR LEADERBOARD ═══════════ */}
        <AnimatedSection className="py-12 sm:py-16" style={{ background: `linear-gradient(180deg, #08060f, #050508)` }}>
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <ScrollReveal direction='up' delay={200}>
              <Suspense fallback={<div className="h-40" />}><PopularLeaderboard /></Suspense>
            </ScrollReveal>
          </div>
        </AnimatedSection>

        {/* ═══════════ FAIR PLAY SHIELD (confiança) ═══════════ */}
        <AnimatedSection className="relative py-16 sm:py-24 hidden md:block" delay={0.1} style={{ background: `radial-gradient(ellipse 80% 50% at 50% 50%, rgba(168,85,247,0.05), transparent), linear-gradient(180deg, #050508, #08060f, #050508)` }}>
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-12">
              <motion.div initial={{ opacity: 0, scale: 0.5 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }} className="relative inline-flex items-center justify-center mb-6">
                <motion.div className="absolute h-28 w-28 rounded-full" style={{ border: `2px solid ${CYAN}20` }} animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.1, 0.3] }} transition={{ duration: 4, repeat: Infinity }} />
                <motion.div className="absolute h-24 w-24 rounded-full" style={{ border: `1px solid ${PURPLE}25` }} animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.15, 0.4] }} transition={{ duration: 3, repeat: Infinity, delay: 0.5 }} />
                <div className="relative h-20 w-20 rounded-2xl flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${CYAN}15, ${PURPLE}15, ${GREEN}15)`, border: "1px solid rgba(255,255,255,0.1)", boxShadow: `0 0 60px ${CYAN}15, 0 0 60px ${PURPLE}10` }}>
                  <ShieldCheck className="h-10 w-10" style={{ color: CYAN }} />
                </div>
              </motion.div>
              <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2, duration: 0.6 }} className="text-3xl sm:text-4xl font-black tracking-tight text-white mb-3">
                Diferencial Ético
              </motion.h2>
              <motion.p initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.3, duration: 0.5 }} className="text-zinc-400 max-w-lg mx-auto text-sm sm:text-base">
                Ao contrário de plataformas de apostas, o Bateu é construído sobre transparência, moeda virtual e jogo responsável.
              </motion.p>
            </div>

            <div className={`grid ${isMobile ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-4"} gap-4`}>
              {FAIR_PLAY_ITEMS.map((item, i) => {
                const Icon = item.icon;
                return (
                  <motion.div key={item.title} custom={i} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} whileHover={{ y: -4, scale: 1.02 }} className="relative rounded-2xl p-6 text-center group transition-all duration-300" style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))", border: `1px solid ${item.color}12` }}>
                    <motion.div className="h-14 w-14 rounded-2xl flex items-center justify-center mx-auto mb-4 transition-all duration-300 group-hover:scale-110" style={{ background: `${item.color}12`, border: `1px solid ${item.color}20`, boxShadow: `0 0 25px ${item.color}10` }}>
                      <Icon className="h-7 w-7" style={{ color: item.color }} />
                    </motion.div>
                    <h3 className="text-sm font-bold text-white mb-2">{item.title}</h3>
                    <p className="text-xs text-zinc-500 leading-relaxed">{item.desc}</p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </AnimatedSection>

        {/* ═══════════ SOCIAL PROOF (estatísticas reais) ═══════════ */}
        <AnimatedSection className="relative py-16 sm:py-24" style={{ background: `radial-gradient(ellipse 50% 40% at 50% 50%, rgba(251,191,36,0.04), transparent), linear-gradient(180deg, #050508, #080810, #050508)` }}>
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            {/* Stats Row */}
            <ScrollReveal direction='up' blur={4} scale={0.98}>
              <div className={`grid ${isMobile ? "grid-cols-2" : "grid-cols-4"} gap-4 mb-12`}>
                {[
                  { icon: Users, value: realStats.users, suffix: "", label: "Utilizadores Registados", color: CYAN },
                  { icon: Trophy, value: realStats.raffles, suffix: "", label: "Sorteios Ativos Agora", color: GOLD },
                  { icon: Globe, value: realStats.regions, suffix: "", label: "Países", color: GREEN },
                  { icon: Monitor, value: 80, suffix: "+", label: "Jogos Disponíveis", color: PURPLE },
                ].filter(stat => stat.value > 0 || stat.label === "Jogos Disponíveis").map((stat, i) => {
                  const Icon = stat.icon;
                  return (
                    <motion.div key={stat.label} custom={i} variants={scaleIn} initial="hidden" whileInView="visible" viewport={{ once: true }} className="rounded-2xl p-5 text-center" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${stat.color}10` }}>
                      <Icon className="h-5 w-5 mx-auto mb-2" style={{ color: stat.color }} />
                      <div className="text-2xl sm:text-3xl font-black text-white mb-1"><ShimmerText colors={[stat.color, '#ffffff', stat.color]} speed={4} className="text-2xl sm:text-3xl font-black"><CountingNumber target={stat.value} suffix={stat.suffix} duration={2.5} /></ShimmerText></div>
                      <ShimmerText colors={['#71717a', stat.color, '#71717a']} speed={5} className="text-[11px] font-medium uppercase tracking-wider">{stat.label}</ShimmerText>
                    </motion.div>
                  );
                })}
              </div>
            </ScrollReveal>

            <ScrollReveal direction='left' delay={0}>
              <Suspense fallback={<div className="h-40" />}><WinnersSection /></Suspense>
              <div className="mt-8"><Suspense fallback={<div className="h-40" />}><TrustSignals /></Suspense></div>
            </ScrollReveal>
          </div>
        </AnimatedSection>

        {/* ═══════════ CTA FINAL (última conversão antes do rodapé) ═══════════ */}
        <AnimatedSection className="relative py-16 sm:py-24 overflow-hidden" style={{
          background: `radial-gradient(ellipse 70% 50% at 50% 50%, ${CYAN}08, transparent),
                   radial-gradient(ellipse 50% 40% at 20% 80%, ${PURPLE}06, transparent),
                   radial-gradient(ellipse 50% 40% at 80% 20%, ${GREEN}06, transparent),
                   linear-gradient(180deg, #050508, #080810, #050508)`,
        }}>
          <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 text-center">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.7 }}>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white mb-4 leading-tight">
                Junta-te à <span style={{ color: PURPLE }}>Comunidade</span>
              </h2>
              <p className="text-base sm:text-lg text-zinc-400 mb-8 max-w-xl mx-auto">
                Milhares de jogadores já estão a competir, prever e conquistar prémios.
                <br className="hidden sm:block" />
                Regista-te gratuitamente e recebe <span className="font-bold" style={{ color: GOLD }}>20 MZN de bónus</span> + <span className="font-bold" style={{ color: CYAN }}>50 pontos da sorte</span> de boas-vindas.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
                <Button size="lg" onClick={() => { sfx.buttonClick(); navigate("/register"); }} className="text-base font-bold px-10 py-6 rounded-xl h-auto transition-all duration-300 hover:scale-105" style={{ background: `linear-gradient(135deg, ${CYAN}, ${DEEP_PURPLE})`, boxShadow: `0 0 40px ${CYAN}25, 0 8px 32px rgba(0,0,0,0.4)` }}>
                  <Rocket className="mr-2 h-5 w-5" /> Criar Conta Grátis
                </Button>
                <Button size="lg" variant="outline" onClick={() => { sfx.whoosh(); navigate("/jogos"); }} className="text-base font-semibold px-10 py-6 rounded-xl h-auto border-zinc-700 text-zinc-300 hover:bg-zinc-800/50 hover:text-white transition-all duration-300">
                  <Eye className="mr-2 h-5 w-5" /> Explorar Plataforma
                </Button>
              </div>
              {/* Trust micro-badges */}
              <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
                {[
                  { icon: ShieldCheck, label: "Plataforma Segura", color: CYAN },
                  { icon: Users, label: realStats.users > 0 ? `${realStats.users.toLocaleString("pt-PT")}+ Utilizadores` : "Comunidade a Crescer", color: GREEN },
                  { icon: Zap, label: "Registo em 30s", color: GOLD },
                  { icon: Gift, label: "Bónus de Boas-vindas", color: CYAN },
                ].map((badge) => {
                  const BIcon = badge.icon;
                  return (
                    <div key={badge.label} className="flex items-center gap-1.5">
                      <BIcon className="h-4 w-4" style={{ color: badge.color }} />
                      <span className="text-xs text-zinc-500 font-medium">{badge.label}</span>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </div>

          {/* Background decorations for CTA */}
          <motion.div className="absolute -left-20 top-1/2 -translate-y-1/2 h-60 w-60 rounded-full blur-[100px] pointer-events-none" style={{ background: `${CYAN}08` }} animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 8, repeat: Infinity }} />
          <motion.div className="absolute -right-20 top-1/3 h-60 w-60 rounded-full blur-[100px] pointer-events-none" style={{ background: `${PURPLE}08` }} animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 10, repeat: Infinity, delay: 2 }} />
        </AnimatedSection>
      </main>

      <Footer />
    </div>
  );
}
