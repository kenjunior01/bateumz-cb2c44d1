import { useState, useRef, useEffect, lazy, Suspense } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import StatsBar from "@/components/StatsBar";
import CategoryNav from "@/components/CategoryNav";
import Footer from "@/components/Footer";
const ActiveRaffles = lazy(() => import("@/components/ActiveRaffles").then(m => ({ default: m.default })));
const WinnersSection = lazy(() => import("@/components/WinnersSection").then(m => ({ default: m.default })));
const TrustSignals = lazy(() => import("@/components/TrustSignals").then(m => ({ default: m.default })));
const LiveFeed = lazy(() => import("@/components/LiveFeed").then(m => ({ default: m.default })));
const PopularLeaderboard = lazy(() => import("@/components/PopularLeaderboard").then(m => ({ default: m.default })));
const WhyDifferent = lazy(() => import("@/components/WhyDifferent").then(m => ({ default: m.default })));
const ProvablyFair = lazy(() => import("@/components/ProvablyFair").then(m => ({ default: m.default })));

import { Button } from "@/components/ui/button";
import {
  Gamepad2, ArrowRight, Users, Brain,
  Radio, Flame, Trophy, ShieldCheck, Zap, TrendingUp,
  ChevronRight, Crown, Diamond, Rocket, Target, Play, Eye,
  Coins, Heart, Swords, Gift, Monitor, Globe,
  CheckCircle2,
} from "lucide-react";
import { motion, useInView } from "framer-motion";
import { useSoundEffects } from "@/hooks/useSoundEffects";
import bateuLogo from "@/assets/bateu-logo.png";
import ShimmerText from '@/components/ui/ShimmerText';
import AnimatedNumber from '@/components/ui/AnimatedNumber';
import CardTilt from '@/components/ui/CardTilt';
import GlowPulse from '@/components/ui/GlowPulse';
import GlowOrb from '@/components/ui/GlowOrb';
import ParticleField from '@/components/ui/ParticleField';
import TypingText from '@/components/ui/TypingText';
import NeonBorder from '@/components/ui/NeonBorder';
import ScrollReveal from '@/components/ui/ScrollReveal';
import ConfettiBurst from '@/components/ui/ConfettiBurst';
import { fadeInUp, staggerContainer, cardHover, microShake } from '@/lib/animation-utilities';

/* ─── color tokens ─── */
const CYAN = "#00d4ff";
const PURPLE = "#a855f7";
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
function AnimatedSection({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.section ref={ref} initial="hidden" animate={inView ? "visible" : "hidden"} variants={sectionReveal} transition={{ delay }} className={className}>
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

/* ─── Ticker data ─── */
const TICKER_ITEMS = [
  { type: "win", text: "LucasMVP ganhou um iPhone 15 no Sorteio Mega!", color: GOLD },
  { type: "live", text: "🔴 AO VIVO: Team Alpha vs Omega Squad — CS2", color: CYAN },
  { type: "game", text: "1.247 jogadores online em Batalha de Cobras", color: GREEN },
  { type: "win", text: "AnaBeatriz ganhou 50.000 Luck Coins!", color: GOLD },
  { type: "live", text: "🔴 AO VIVO: Final do Campeonato League of Legends", color: CYAN },
  { type: "win", text: "PedroHenrique conquistou 1º lugar no Torneio de Xadrez", color: GOLD },
  { type: "game", text: "Novo jogo lançado: Corrida de Digitação", color: GREEN },
  { type: "game", text: "MMORPG Bateu já disponivel — cria o teu heroi!", color: PURPLE },
  { type: "win", text: "MariaSilva ganhou um PlayStation 5!", color: GOLD },
  { type: "live", text: "🔴 AO VIVO: Valorant — Semifinal Brasileira", color: CYAN },
  { type: "game", text: "3.891 partidas jogadas nas últimas 24h", color: GREEN },
];

/* ─── Gateway Cards ─── */
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
    statLabel: "247 times ativos",
    badge: "AO VIVO",
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
    statLabel: "MT 2.5M+ em prémios",
    badge: "NOVO",
  },
  {
    title: "JOGOS ONLINE",
    subtitle: "69+ Jogos Disponíveis",
    desc: "Estratégia, puzzle, arcade e muito mais. Joga e ganha Luck Coins.",
    href: "/jogos",
    icon: Gamepad2,
    gradient: "linear-gradient(135deg, #0a1a0f 0%, #0a1f14 50%, #0a1a0f 100%)",
    accentColor: GREEN,
    secondaryColor: BLUE,
    borderGlow: GREEN,
    statLabel: "12.4k jogadores online",
    badge: "POPULAR",
  },
];

/* ─── Fair Play Items ─── */
const FAIR_PLAY_ITEMS = [
  { icon: Eye, title: "100% Transparência", desc: "Todos os resultados são verificáveis e públicos. Sem algoritmos ocultos.", color: CYAN },
  { icon: BanIcon, title: "Sem Apostas com Dinheiro Real", desc: "Nenhuma aposta com dinheiro real. Plataforma 100% legal e segura.", color: PURPLE },
  { icon: Coins, title: "Moeda Virtual Apenas", desc: "Luck Coins — moeda virtual da plataforma. Diversão sem riscos financeiros.", color: GOLD },
  { icon: Heart, title: "Jogo Responsável", desc: "Ferramentas integradas de jogo responsável: limites, pausas e alertas.", color: GREEN },
];

/* ═══════════════════════════════════════════════════════════════
   ██  INDEX — REVOLUTIONARY HOMEPAGE
   ═══════════════════════════════════════════════════════════════ */
export default function Index() {
  const isMobile = useIsMobile();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { sfx } = useSoundEffects();

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

  const quadrupledTicker = [...TICKER_ITEMS, ...TICKER_ITEMS, ...TICKER_ITEMS, ...TICKER_ITEMS];

  return (
    <div className="min-h-screen bg-background flex flex-col" style={{ background: "#050508" }}>
      <Navbar />
      <StatsBar />

      {/* ═══════════ HERO ═══════════ */}
      <motion.section
        className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden"
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
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55, duration: 0.5 }} className="flex flex-col sm:flex-row gap-3 justify-center mb-12">
            <Button size="lg" onClick={() => { sfx.buttonClick(); setConfettiActive(true); setTimeout(() => setConfettiActive(false), 100); navigate("/register"); }} className="text-base font-bold px-8 py-6 rounded-xl h-auto shadow-lg transition-all duration-300 hover:scale-105" style={{ background: `linear-gradient(135deg, ${CYAN}, ${DEEP_PURPLE})`, boxShadow: `0 0 30px ${CYAN}30, 0 8px 32px rgba(0,0,0,0.4)` }}>
              <Rocket className="mr-2 h-5 w-5" /> Começar Agora — É Grátis
            </Button>
            <Button size="lg" variant="outline" onClick={() => { sfx.whoosh(); navigate("/jogos"); }} className="text-base font-semibold px-8 py-6 rounded-xl h-auto border-zinc-700 text-zinc-300 hover:bg-zinc-800/50 hover:text-white transition-all duration-300">
              <Play className="mr-2 h-5 w-5" /> Explorar Jogos
            </Button>
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
            onClick={() => { sfx.buttonClick(); navigate("/mmorpg"); }}
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
                  <span className="text-[10px] font-black tracking-widest px-3 py-1 rounded-full animate-pulse" style={{ background: `linear-gradient(135deg, ${PURPLE}30, ${CYAN}30)`, color: PURPLE, border: `1px solid ${PURPLE}40` }}>NOVO</span>
                  <span className="text-[10px] font-black tracking-widest px-3 py-1 rounded-full" style={{ background: `${GREEN}20`, color: GREEN, border: `1px solid ${GREEN}30` }}>MULTIPLAYER</span>
                </div>
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight mb-3 leading-tight">
                  <span style={{ background: `linear-gradient(135deg, #fff, ${PURPLE}, ${CYAN})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>MMORPG Bateu</span>
                </h2>
                <p className="text-sm sm:text-base text-zinc-400 max-w-lg mb-5 leading-relaxed">
                  Cria o teu heroi, explora zonas perigosas, luta contra monstros e outros jogadores. Economia P2P, chat global, world boss e muito mais. O mundo persiste mesmo depois de saires.
                </p>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 mb-5">
                  {[
                    { icon: Users, label: "6 Classes", color: CYAN },
                    { icon: Swords, label: "PVP Duelos", color: PURPLE },
                    { icon: Coins, label: "Economia P2P", color: GOLD },
                    { icon: Globe, label: "Mundo Persistente", color: GREEN },
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

      {/* ═══════════ LIVE ACTIVITY TICKER ═══════════ */}
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

      {/* ═══════════ MAIN CONTENT ═══════════ */}
      <main className="flex-1">

        {/* ─── PILLAR 1: ESPORTS ─── */}
        <AnimatedSection className="relative overflow-hidden py-16 sm:py-24" style={{ background: `radial-gradient(ellipse 60% 40% at 15% 50%, ${CYAN}08, transparent), linear-gradient(180deg, #050508 0%, #060610 50%, #050508 100%)` }}>
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
              {/* Featured Championship */}
              <motion.div whileHover={{ scale: 1.02 }} className={`${isMobile ? "" : "col-span-2"} relative rounded-2xl overflow-hidden cursor-pointer`} style={{ background: "linear-gradient(135deg, #0a0f1a, #0d1525)", border: `1px solid ${CYAN}15` }} onClick={() => { sfx.whoosh(); navigate("/esports"); }}>
                <div className="absolute inset-0 opacity-30" style={{ background: `radial-gradient(ellipse at 80% 20%, ${CYAN}15, transparent 60%)` }} />
                <div className="relative p-6 sm:p-8">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: `${CYAN}15`, color: CYAN, border: `1px solid ${CYAN}25` }}><Radio className="h-3 w-3" /> AO VIVO</span>
                    <span className="text-xs text-zinc-500">Campeonato Brasileiro S4</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">Grande Final — CS2 Masters</h3>
                  <p className="text-sm text-zinc-400 mb-6">Os melhores times do Brasil competem pelo título de campeão e prémios exclusivos.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { t1: "Furia", s1: 2, t2: "MIBR", s2: 1, status: "AO VIVO" },
                      { t1: "LOUD", s1: 0, t2: "Vivo Keyd", s2: 0, status: "18:00" },
                    ].map((match, i) => (
                      <div key={i} className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${CYAN}10` }}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: match.status === "AO VIVO" ? "#ef4444" : "#71717a" }}>{match.status}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-white">{match.t1}</span>
                          <span className="text-lg font-black" style={{ color: CYAN }}>{match.s1} <span className="text-zinc-600 mx-1">:</span> {match.s2}</span>
                          <span className="text-sm font-bold text-white">{match.t2}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>

              {/* Top Teams */}
              <NeonBorder colors={[CYAN, DEEP_PURPLE]} speed={6} glowIntensity={0.4} borderWidth={1} borderRadius="1rem">
                <div className="rounded-2xl p-5" style={{ background: "linear-gradient(180deg, #0a0f1a, #080c16)", border: `1px solid ${CYAN}10` }}>
                  <h4 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-4 flex items-center gap-2"><Trophy className="h-4 w-4" style={{ color: GOLD }} /> Ranking Top 5</h4>
                  <div className="space-y-3">
                    {[
                      { rank: 1, team: "Furia", pts: "2.450", trend: "up" },
                      { rank: 2, team: "LOUD", pts: "2.310", trend: "up" },
                      { rank: 3, team: "MIBR", pts: "2.180", trend: "down" },
                      { rank: 4, team: "Vivo Keyd", pts: "1.920", trend: "same" },
                      { rank: 5, team: "INTZ", pts: "1.840", trend: "up" },
                    ].map((item) => (
                      <div key={item.rank} className="flex items-center gap-3">
                        <span className="h-7 w-7 rounded-lg flex items-center justify-center text-xs font-black" style={{ background: item.rank <= 3 ? `linear-gradient(135deg, ${GOLD}30, ${GOLD}10)` : "rgba(255,255,255,0.05)", color: item.rank <= 3 ? GOLD : "#71717a", border: `1px solid ${item.rank <= 3 ? GOLD + "25" : "rgba(255,255,255,0.08)"}` }}>{item.rank}</span>
                        <span className="text-sm font-semibold text-zinc-300 flex-1">{item.team}</span>
                        <span className="text-xs font-bold text-zinc-500">{item.pts} pts</span>
                        <TrendingUp className={`h-3.5 w-3.5 ${item.trend === "down" ? "rotate-180 text-red-400" : item.trend === "same" ? "text-zinc-600" : ""}`} style={{ color: item.trend === "up" ? GREEN : undefined }} />
                      </div>
                    ))}
                  </div>
                  <Link to="/esports" className="mt-4 block text-center text-xs font-bold py-2 rounded-lg transition-all duration-300 hover:opacity-80" style={{ color: CYAN, background: `${CYAN}08`, border: `1px solid ${CYAN}15` }} onClick={() => sfx.whoosh()}>Ver Ranking Completo</Link>
                </div>
              </NeonBorder>
            </div>
          </div>
        </AnimatedSection>

        {/* Divider */}
        <div className="h-px mx-auto max-w-md" style={{ background: `linear-gradient(90deg, transparent, ${CYAN}20, ${PURPLE}20, transparent)` }} />

        {/* ─── PILLAR 2: SORTEIOS ─── */}
        <AnimatedSection className="relative overflow-hidden py-16 sm:py-24" delay={0.1} style={{ background: `radial-gradient(ellipse 60% 40% at 85% 50%, ${PURPLE}08, transparent), linear-gradient(180deg, #050508 0%, #0a0814 50%, #050508 100%)` }}>
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
              {/* Jackpot Counter */}
              <motion.div whileHover={{ scale: 1.02 }} className={`${isMobile ? "" : "col-span-2"} relative rounded-2xl overflow-hidden`} style={{ background: "linear-gradient(135deg, #0f0a1a, #140e20)", border: `1px solid ${PURPLE}15` }}>
                <div className="absolute inset-0 opacity-40" style={{ background: `radial-gradient(ellipse at 70% 30%, ${GOLD}10, transparent 60%)` }} />
                <div className="relative p-6 sm:p-8">
                  <div className="flex items-center gap-2 mb-6"><Diamond className="h-4 w-4" style={{ color: GOLD }} /><span className="text-xs font-bold uppercase tracking-wider" style={{ color: GOLD }}>Jackpot Acumulado</span></div>
                  <motion.div className="text-4xl sm:text-6xl font-black mb-2" style={{ background: `linear-gradient(135deg, ${GOLD}, #f59e0b, ${GOLD})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }} animate={{ scale: [1, 1.02, 1] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}>
                    <AnimatedNumber value={2847500} duration={3} prefix="MT " locale="pt-BR" className="inline" />
                  </motion.div>
                  <p className="text-sm text-zinc-500 mb-8">em prémios disponíveis este mês</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {[
                      { prize: "iPhone 15 Pro Max", tickets: "12.450", end: "2h 34m", hot: true, emoji: "📱" },
                      { prize: "PlayStation 5", tickets: "8.920", end: "5h 12m", hot: true, emoji: "🎮" },
                      { prize: "MT 500.000 em Luck Coins", tickets: "24.100", end: "1h 08m", hot: false, emoji: "💰" },
                    ].map((raffle, i) => (
                      <motion.div key={i} whileHover={{ scale: 1.03, y: -2 }} className="rounded-xl p-4 cursor-pointer transition-all duration-300" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${raffle.hot ? GOLD + "20" : "rgba(255,255,255,0.06)"}` }} onClick={() => { sfx.whoosh(); navigate("/marketplace"); }}>
                        {raffle.hot && <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full mb-2" style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444" }}><Flame className="h-2.5 w-2.5" /> POPULAR</span>}
                        <span className="text-2xl block mb-1">{raffle.emoji}</span>
                        <p className="text-xs font-bold text-white mb-2 leading-tight">{raffle.prize}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-zinc-500">{raffle.tickets} bilhetes</span>
                          <span className="text-[10px] font-bold" style={{ color: PURPLE }}>{raffle.end}</span>
                        </div>
                        <div className="mt-2 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                          <motion.div className="h-full rounded-full" style={{ background: `linear-gradient(90deg, ${PURPLE}, ${GOLD})` }} initial={{ width: "0%" }} whileInView={{ width: `${65 + i * 15}%` }} transition={{ delay: 0.5 + i * 0.2, duration: 1 }} viewport={{ once: true }} />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </motion.div>

              {/* Recent Winners */}
              <NeonBorder colors={[PURPLE, GOLD]} speed={7} glowIntensity={0.35} borderWidth={1} borderRadius="1rem">
                <div className="rounded-2xl p-5" style={{ background: "linear-gradient(180deg, #0f0a1a, #0c0816)", border: `1px solid ${PURPLE}10` }}>
                  <h4 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-4 flex items-center gap-2"><Crown className="h-4 w-4" style={{ color: GOLD }} /> Vencedores Recentes</h4>
                  <div className="space-y-3">
                    {[
                      { name: "LucasMVP", prize: "iPhone 15 Pro", time: "há 2h", avatar: "L" },
                      { name: "AnaBeatriz", prize: "50k Luck Coins", time: "há 5h", avatar: "A" },
                      { name: "PedroGamer", prize: "AirPods Pro", time: "há 8h", avatar: "P" },
                      { name: "MariaSilva", prize: "PlayStation 5", time: "há 12h", avatar: "M" },
                      { name: "JoaoVitor", prize: "25k Luck Coins", time: "há 1d", avatar: "J" },
                    ].map((winner, i) => (
                      <motion.div key={i} initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1, duration: 0.4 }} viewport={{ once: true }} className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ background: `linear-gradient(135deg, ${PURPLE}30, ${GOLD}20)`, color: GOLD, border: `1px solid ${PURPLE}25` }}>{winner.avatar}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-zinc-300 truncate">{winner.name}</p>
                          <p className="text-[11px] text-zinc-500">{winner.prize}</p>
                        </div>
                        <span className="text-[10px] text-zinc-600 shrink-0">{winner.time}</span>
                      </motion.div>
                    ))}
                  </div>
                  <div className="mt-4 pt-3" style={{ borderTop: `1px solid ${PURPLE}10` }}>
                    <div className="flex items-center justify-center gap-1.5 text-xs text-zinc-500"><CheckCircle2 className="h-3.5 w-3.5" style={{ color: GREEN }} /> Resultados verificados</div>
                  </div>
                </div>
              </NeonBorder>
            </div>
          </div>
        </AnimatedSection>

        {/* Divider */}
        <div className="h-px mx-auto max-w-md" style={{ background: `linear-gradient(90deg, transparent, ${PURPLE}20, ${GREEN}20, transparent)` }} />

        {/* ─── PILLAR 3: JOGOS ─── */}
        <AnimatedSection className="relative overflow-hidden py-16 sm:py-24" delay={0.2} style={{ background: `radial-gradient(ellipse 60% 40% at 50% 80%, ${GREEN}08, transparent), linear-gradient(180deg, #050508 0%, #060a08 50%, #050508 100%)` }}>
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-xl flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${GREEN}25, ${BLUE}15)`, border: `1px solid ${GREEN}30`, boxShadow: `0 0 25px ${GREEN}15` }}>
                  <Gamepad2 className="h-5 w-5" style={{ color: GREEN }} />
                </div>
                <div>
                  <ShimmerText colors={['#2ea043', '#58a6ff', '#2ea043']} speed={4} className="text-2xl sm:text-3xl font-black tracking-tight">JOGOS ONLINE</ShimmerText>
                  <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">69+ Jogos • Multiplayer • Skill-Based</p>
                </div>
              </div>
              <Link to="/jogos" className="group flex items-center gap-1.5 text-sm font-bold" style={{ color: GREEN }} onClick={() => sfx.whoosh()}>
                Ver Todos os Jogos <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>

            {/* Categories */}
            <div className={`grid ${isMobile ? "grid-cols-2" : "grid-cols-4"} gap-3 mb-6`}>
              {[
                { label: "Estratégia", icon: Brain, count: 18, color: CYAN },
                { label: "Arcade", icon: Zap, count: 22, color: GREEN },
                { label: "Puzzle", icon: Target, count: 15, color: PURPLE },
                { label: "Multiplayer", icon: Users, count: 14, color: BLUE },
              ].map((cat, i) => {
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

            {/* Featured Games */}
            <div className={`grid ${isMobile ? "grid-cols-2" : "grid-cols-4"} gap-3 sm:gap-4`}>
              {/* MMORPG - Featured First */}
              <motion.div custom={0} variants={scaleIn} initial="hidden" whileInView="visible" viewport={{ once: true }} whileHover={{ scale: 1.05, y: -4 }} whileTap={{ scale: 0.97 }} className="relative rounded-xl p-4 cursor-pointer overflow-hidden transition-all duration-300 col-span-1 sm:col-span-1" style={{ background: `linear-gradient(135deg, ${PURPLE}25, ${CYAN}15)`, border: `2px solid ${PURPLE}30`, boxShadow: `0 0 25px ${PURPLE}15` }} onClick={() => { sfx.whoosh(); navigate("/mmorpg"); }}>
                <span className="absolute top-2 right-2 text-[9px] font-black px-1.5 py-0.5 rounded animate-pulse" style={{ background: `${PURPLE}30`, color: PURPLE, border: `1px solid ${PURPLE}50` }}>NOVO</span>
                <span className="text-3xl block mb-3">🌍</span>
                <p className="text-sm font-bold text-white mb-1 leading-tight">MMORPG Bateu</p>
                <div className="flex items-center gap-1"><Users className="h-3 w-3" style={{ color: GREEN }} /><span className="text-[11px] font-semibold" style={{ color: GREEN }}>Multiplayer ao Vivo</span></div>
              </motion.div>
              {[
                { name: "Batalha de Cobras", players: "3.1k", emoji: "🐍", grad: `linear-gradient(135deg, ${GREEN}20, ${BLUE}10)`, hot: true, border: GREEN },
                { name: "Galo PRO", players: "2.4k", emoji: "✖", grad: `linear-gradient(135deg, ${CYAN}15, ${DEEP_PURPLE}10)`, hot: true, border: CYAN },
                { name: "Pedra Papel Tesoura", players: "4.5k", emoji: "✊", grad: `linear-gradient(135deg, ${GOLD}15, ${PURPLE}10)`, hot: false, border: GOLD },
                { name: "Duelo de Matemática", players: "1.2k", emoji: "🧮", grad: `linear-gradient(135deg, ${BLUE}15, ${GREEN}10)`, hot: false, border: BLUE },
                { name: "Ligar 4", players: "1.8k", emoji: "🔴", grad: `linear-gradient(135deg, ${CYAN}10, ${GREEN}15)`, hot: false, border: CYAN },
                { name: "Memória VS", players: "2.0k", emoji: "🃏", grad: `linear-gradient(135deg, ${PURPLE}15, ${CYAN}10)`, hot: false, border: PURPLE },
                { name: "Pong VS", players: "980", emoji: "🏓", grad: `linear-gradient(135deg, ${BLUE}20, ${CYAN}10)`, hot: false, border: BLUE },
              ].map((game, i) => (
                <motion.div key={game.name} custom={i} variants={scaleIn} initial="hidden" whileInView="visible" viewport={{ once: true }} whileHover={{ scale: 1.05, y: -4 }} whileTap={{ scale: 0.97 }} className="relative rounded-xl p-4 cursor-pointer overflow-hidden transition-all duration-300" style={{ background: game.grad, border: `1px solid ${game.border}15` }} onClick={() => { sfx.whoosh(); navigate("/jogos"); }}>
                  {game.hot && <span className="absolute top-2 right-2 text-[9px] font-black px-1.5 py-0.5 rounded" style={{ background: `${GREEN}20`, color: GREEN }}><Flame className="h-2.5 w-2.5 inline mr-0.5" />HOT</span>}
                  <span className="text-3xl block mb-3">{game.emoji}</span>
                  <p className="text-sm font-bold text-zinc-200 mb-1 leading-tight">{game.name}</p>
                  <div className="flex items-center gap-1"><Users className="h-3 w-3 text-zinc-500" /><span className="text-[11px] text-zinc-500">{game.players} jogando</span></div>
                </motion.div>
              ))}
            </div>

            {/* Player count bar */}
            <NeonBorder colors={[GREEN, BLUE]} speed={8} glowIntensity={0.3} borderWidth={1} borderRadius="0.75rem">
              <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${GREEN}10` }}>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="h-3 w-3 rounded-full" style={{ background: GREEN, boxShadow: `0 0 10px ${GREEN}60` }} />
                    <motion.div className="absolute inset-0 h-3 w-3 rounded-full" style={{ background: GREEN }} animate={{ scale: [1, 2, 1], opacity: [0.5, 0, 0.5] }} transition={{ duration: 2, repeat: Infinity }} />
                  </div>
                  <span className="text-sm text-zinc-400"><AnimatedNumber value={12487} duration={2} locale="pt-BR" className="font-bold text-white" /> jogadores online agora</span>
                </div>
                <Button size="sm" onClick={() => { sfx.buttonClick(); navigate("/jogos"); }} className="font-bold rounded-lg" style={{ background: `linear-gradient(135deg, ${GREEN}, ${BLUE})` }}>
                  <Play className="h-3.5 w-3.5 mr-1.5" /> Jogar Agora
                </Button>
              </motion.div>
            </NeonBorder>
          </div>
        </AnimatedSection>

        {/* ═══════════ FAIR PLAY SHIELD ═══════════ */}
        <AnimatedSection className="relative py-16 sm:py-24" delay={0.1} style={{ background: `radial-gradient(ellipse 80% 50% at 50% 50%, rgba(168,85,247,0.05), transparent), linear-gradient(180deg, #050508, #08060f, #050508)` }}>
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

        {/* ═══════════ SOCIAL PROOF ═══════════ */}
        <AnimatedSection className="relative py-16 sm:py-24" style={{ background: `radial-gradient(ellipse 50% 40% at 50% 50%, rgba(251,191,36,0.04), transparent), linear-gradient(180deg, #050508, #080810, #050508)` }}>
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            {/* Stats Row */}
            <ScrollReveal direction='up' blur={4} scale={0.98}>
            <div className={`grid ${isMobile ? "grid-cols-2" : "grid-cols-4"} gap-4 mb-12`}>
              {[
                { icon: Users, value: 48500, suffix: "+", label: "Utilizadores Registados", color: CYAN },
                { icon: Trophy, value: 12500, suffix: "+", label: "Prémios Entregues", color: GOLD },
                { icon: Globe, value: 12, suffix: "", label: "Países", color: GREEN },
                { icon: Monitor, value: 69, suffix: "+", label: "Jogos Disponíveis", color: PURPLE },
              ].map((stat, i) => {
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
            <div className="mt-8"><Suspense fallback={<div className="h-40" />}><LiveFeed /></Suspense></div>
            <div className="mt-8"><Suspense fallback={<div className="h-40" />}><TrustSignals /></Suspense></div>
            </ScrollReveal>
          </div>
        </AnimatedSection>

        {/* ═══════════ WHY DIFFERENT ═══════════ */}
        <AnimatedSection className="py-12 sm:py-20" style={{ background: `linear-gradient(180deg, #050508, #060610, #050508)` }}>
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <Suspense fallback={<div className="h-40" />}><WhyDifferent /></Suspense>
          </div>
        </AnimatedSection>

        {/* ═══════════ PROVABLY FAIR ═══════════ */}
        <AnimatedSection className="py-12 sm:py-20" style={{ background: `linear-gradient(180deg, #050508, #08060f, #050508)` }}>
          <div className="max-w-4xl mx-auto px-4 sm:px-6">
            <Suspense fallback={<div className="h-40" />}><ProvablyFair /></Suspense>
          </div>
        </AnimatedSection>

        {/* ═══════════ CTA SECTION ═══════════ */}
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
                Regista-te gratuitamente e recebe <span className="font-bold" style={{ color: GOLD }}>500 Luck Coins</span> de boas-vindas.
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
                  { icon: Users, label: "48.500+ Utilizadores", color: GREEN },
                  { icon: Zap, label: "Registo em 30s", color: GOLD },
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

      {/* ═══════════ CATEGORY NAV ═══════════ */}
      <ScrollReveal direction='up' delay={100}>
      <CategoryNav />
      </ScrollReveal>

      {/* ═══════════ ACTIVE RAFFLES (existing component) ═══════════ */}
      <AnimatedSection className="py-12 sm:py-16" style={{ background: `linear-gradient(180deg, #050508, #08060f)` }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <ScrollReveal direction='right' delay={0}>
          <Suspense fallback={<div className="h-40" />}><ActiveRaffles /></Suspense>
          </ScrollReveal>
        </div>
      </AnimatedSection>

      {/* ═══════════ POPULAR LEADERBOARD ═══════════ */}
      <AnimatedSection className="py-12 sm:py-16" style={{ background: `linear-gradient(180deg, #08060f, #050508)` }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <ScrollReveal direction='up' delay={200}>
          <Suspense fallback={<div className="h-40" />}><PopularLeaderboard /></Suspense>
          </ScrollReveal>
        </div>
      </AnimatedSection>

      <Footer />
    </div>
  );
}