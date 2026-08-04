import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import StatsBar from "@/components/StatsBar";
import CategoryNav from "@/components/CategoryNav";
import SearchBar from "@/components/SearchBar";
import MobileActionButtons from "@/components/MobileActionButtons";
import ActiveRaffles from "@/components/ActiveRaffles";
import FeaturesGrid from "@/components/FeaturesGrid";
import WinnersSection from "@/components/WinnersSection";
import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";
import DesktopWidgets from "@/components/DesktopWidgets";
import LiveFeed from "@/components/LiveFeed";
import { Button } from "@/components/ui/button";
import {
  Gamepad2, ArrowRight, Users, Brain, Sparkles,
  Radio, Flame, Trophy, ShieldCheck, Zap, Star, TrendingUp,
  ChevronRight, Crown, Diamond, Rocket, Target, Play, Eye,
} from "lucide-react";
import { motion, useInView, useScroll, useTransform, AnimatePresence } from "framer-motion";
import bateuLogo from "@/assets/bateu-logo.png";

import PopularLeaderboard from "@/components/PopularLeaderboard";
import ContestTypesShowcase from "@/components/ContestTypesShowcase";
import CountryRegionFilter from "@/components/CountryRegionFilter";
import StoriesCarousel from "@/components/StoriesCarousel";
import AIRecommendations from "@/components/AIRecommendations";
import TrustSignals from "@/components/TrustSignals";
import LiveTicker from "@/components/LiveTicker";
import StayInLoop from "@/components/StayInLoop";

const SPRING_BOUNCE = { type: "spring" as const, stiffness: 300, damping: 20 };

const MARQUEE_ITEMS = ["Sorteios ao Vivo", "69+ Jogos", "Prémios Reais", "Milionário", "Esports", "Roleta", "Torneios", "Lives 24/7", "Comunidade", "Transparência"];

const MEGA_FEATURES = [
  { emoji: "🎮", title: "69+ Jogos", desc: "Estratégia, quiz, arcade, puzzle e muito mais. Algo para todos os gostos e níveis.", grad: "from-violet-500 via-purple-500 to-indigo-600" },
  { emoji: "🎯", title: "Sorteios Transparentes", desc: "Cada sorteio tem verificação em cadeia na blockchain. Resultados 100% auditáveis e públicos.", grad: "from-blue-500 via-cyan-500 to-teal-400" },
  { emoji: "📺", title: "Lives Interactivas", desc: "Streamers e audiência jogam juntos em tempo real. Mais de 50 jogos disponíveis nas lives.", grad: "from-red-500 via-orange-500 to-amber-400" },
  { emoji: "🏆", title: "Esports & Torneios", desc: "Ligas, campeonatos, temporadas com prémios reais. Sistema completo de gestão desportiva.", grad: "from-emerald-500 via-green-500 to-lime-400" },
  { emoji: "💰", title: "Quem Quer Ser Milionário", desc: "O jogo mais épico da plataforma. 15 perguntas, 3 ajudas, 1 milhão de MZN em prémios.", grad: "from-amber-400 via-yellow-400 to-orange-500" },
  { emoji: "🤖", title: "IA Inteligente", desc: "Recomendações personalizadas, bots para treinar, e análise de padrões de jogo.", grad: "from-pink-500 via-rose-500 to-red-400" },
];

const POPULAR_GAMES = [
  { id: "tictactoepro", label: "Galo PRO", emoji: "✖", grad: "from-violet-600 to-indigo-700", hasBot: true, players: "2.4k" },
  { id: "connect4", label: "Ligar 4", emoji: "🔴", grad: "from-blue-500 to-cyan-400", hasBot: true, players: "1.8k" },
  { id: "snakebattle", label: "Batalha de Cobras", emoji: "🐍", grad: "from-emerald-500 to-teal-400", hasBot: true, players: "3.1k" },
  { id: "quickmath", label: "Duelo de Matemática", emoji: "🧮", grad: "from-cyan-500 to-blue-400", hasBot: true, players: "1.2k" },
  { id: "rps", label: "Pedra Papel Tesoura", emoji: "✊", grad: "from-amber-500 to-orange-400", hasBot: true, players: "4.5k" },
  { id: "memorycards", label: "Memória VS Cartas", emoji: "🃏", grad: "from-indigo-500 to-violet-400", hasBot: true, players: "2.0k" },
  { id: "pongvs", label: "Pong VS", emoji: "🏓", grad: "from-blue-600 to-indigo-400", hasBot: false, players: "980" },
  { id: "whackamole", label: "Bate o Alvo", emoji: "🎯", grad: "from-emerald-500 to-green-400", hasBot: false, players: "1.5k" },
];

const BLOG_POSTS = [
  { title: "Como Ganhar no Galo", slug: "como-ganhar-jogo-do-galo-estrategias", emoji: "♟️", cat: "Estratégia" },
  { title: "10 Dicas para Sorteios", slug: "10-dicas-sorteios-online", emoji: "🎰", cat: "Sorteios" },
  { title: "Jogos que Treinam o Cérebro", slug: "jogos-online-treinar-cerebro", emoji: "🧠", cat: "Ciência" },
];

const TRENDING_CONTESTS = [
  { title: "Grande Sorteio de Natal", prize: "MT 500.000", emoji: "🎄", slug: "/concursos", hot: true, entries: 12400 },
  { title: "Torneio de Galo Semanal", prize: "Gratuito", emoji: "🏆", slug: "/tournaments", hot: true, entries: 8200 },
  { title: "Desafio de Conhecimentos", prize: "Prémios Exclusivos", emoji: "🧠", slug: "/concursos", hot: false, entries: 5600 },
];

const HERO_STATS = [
  { icon: Trophy, color: "from-amber-400 to-yellow-500", value: 50, suffix: "+", desc: "Jogos Disponíveis", floatY: [0, -8, 0] as number[], dur: 4 },
  { icon: Flame, color: "from-red-500 to-orange-500", value: 24, suffix: "/7", desc: "Lives Ao Vivo", floatY: [0, 6, 0] as number[], dur: 5 },
  { icon: Users, color: "from-blue-500 to-cyan-400", value: 100, suffix: "%", desc: "Verificável", floatY: [0, 5, 0] as number[], dur: 4.5 },
  { icon: Crown, color: "from-violet-500 to-purple-400", value: 1, suffix: "#", desc: "Plataforma em Moçambique", floatY: [0, -5, 0] as number[], dur: 5.5 },
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.07, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const },
  }),
};

const sectionFade = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1, y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
  },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: (i: number) => ({
    opacity: 1, scale: 1,
    transition: { delay: i * 0.06, duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] as const },
  }),
};

function AnimatedSection({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.section
      ref={ref}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      variants={sectionFade}
      transition={{ delay }}
      className={className}
    >
      {children}
    </motion.section>
  );
}

function SectionHeader({ icon: Icon, title, badge, badgeIcon: BadgeIcon, href }: {
  icon: React.ElementType;
  title: string;
  badge?: string;
  badgeIcon?: React.ElementType;
  href?: string;
}) {
  return (
    <div className="flex items-center justify-between mb-5">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[var(--region-primary,hsl(var(--primary)))] to-[var(--region-secondary,hsl(var(--accent)))] flex items-center justify-center shadow-elegant glow-primary">
          <Icon className="h-[18px] w-[18px] text-white" />
        </div>
        <h2 className="text-xl font-bold font-[family-name:var(--font-display)] tracking-tight">{title}</h2>
        {badge && (
          <span className="badge-premium inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold">
            {BadgeIcon && <BadgeIcon className="h-3 w-3" />}
            {badge}
          </span>
        )}
      </div>
      {href && (
        <Link to={href} className="group inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-accent transition-colors">
          Ver todos
          <ChevronRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      )}
    </div>
  );
}

function SectionDivider() {
  return (
    <div className="relative py-2">
      <div className="border-flow h-[1px] mx-auto max-w-xs rounded-full" />
      <motion.div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-2 w-2 rounded-full"
        style={{ background: "var(--region-primary, hsl(var(--primary)))", opacity: 0.4 }}
        animate={{ scale: [1, 1.6, 1], opacity: [0.4, 0.15, 0.4] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}

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

  return <span ref={ref}>{count}{suffix}</span>;
}

function ParticleField() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(12)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: Math.random() * 4 + 2 + "px",
            height: Math.random() * 4 + 2 + "px",
            left: Math.random() * 100 + "%",
            top: Math.random() * 100 + "%",
            background: i % 3 === 0 ? "var(--region-primary, hsl(var(--primary)))" : i % 3 === 1 ? "var(--region-secondary, hsl(var(--accent)))" : "hsl(var(--muted-foreground))",
          }}
          animate={{
            y: [0, -(Math.random() * 60 + 20), 0],
            x: [0, (Math.random() * 40 - 20), 0],
            opacity: [0, 0.6, 0],
            scale: [0.5, 1, 0.5],
          }}
          transition={{
            duration: Math.random() * 4 + 4,
            repeat: Infinity,
            delay: Math.random() * 3,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

const Index = () => {
  const isMobile = useIsMobile();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [categoryFilter, setCategoryFilter] = useState("todos");
  const [country, setCountry] = useState("");
  const [region, setRegion] = useState("");
  const [liveNowCount, setLiveNowCount] = useState(0);
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.5], [1, 0.95]);
  const heroY = useTransform(scrollYProgress, [0, 0.5], [0, -40]);

  useEffect(() => {
    const fetchLiveCount = async () => {
      try {
        const { count } = await (supabase as any)
          .from("live_sessions")
          .select("*", { count: "exact", head: true })
          .eq("status", "active");
        if (typeof count === "number") setLiveNowCount(count);
      } catch {}
    };
    fetchLiveCount();
    const interval = setInterval(fetchLiveCount, 30_000);
    return () => clearInterval(interval);
  }, []);

  const handleCategorySelect = (category: string) => {
    if (category === "gaming") {
      navigate("/jogos");
    } else {
      setCategoryFilter(category);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-16 lg:pb-0 bg-mesh-soft bg-noise">
      <Navbar />
      <LiveTicker />

      {/* ===== HERO SECTION ===== */}
      <motion.section ref={heroRef} className="hero-section noise-overlay">
        <div className="hero-aurora" />
        <div className="hero-scanlines" aria-hidden="true" />
        <ParticleField />

        <motion.div
          className="floating-orb"
          style={{ background: "color-mix(in srgb, var(--region-primary, hsl(var(--primary))) 18%, transparent)", width: 500, height: 500, left: "-10%", top: "10%" }}
          animate={{ y: [0, -40, 0], x: [0, 20, 0], scale: [1, 1.15, 1] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="floating-orb"
          style={{ background: "color-mix(in srgb, var(--region-secondary, hsl(var(--accent))) 15%, transparent)", width: 400, height: 400, right: "-5%", top: "20%" }}
          animate={{ y: [0, 30, 0], x: [0, -25, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="floating-orb"
          style={{ background: "hsl(280 60% 50% / 0.08)", width: 600, height: 600, left: "30%", top: "30%" }}
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        />

        <div className="absolute inset-0 grid-pattern opacity-40" style={{
          maskImage: "radial-gradient(ellipse 70% 50% at 50% 40%, black 10%, transparent 70%)",
          WebkitMaskImage: "radial-gradient(ellipse 70% 50% at 50% 40%, black 10%, transparent 70%)",
        }} />

        <motion.div
          style={{ opacity: heroOpacity, scale: heroScale, y: heroY }}
          className="relative z-10 container mx-auto px-4 pt-24 pb-24 lg:pt-20 lg:pb-32 w-full"
        >
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] as const }}
            >
              <div className="flex items-center gap-3 mb-8">
                <motion.div
                  className="relative"
                  whileHover={{ scale: 1.05, rotate: -2 }}
                  transition={SPRING_BOUNCE}
                >
                  <img src={bateuLogo} alt="Bateu" className="h-14 w-auto" />
                  <div className="absolute -inset-2 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 blur-xl opacity-0 hover:opacity-100 transition-opacity" />
                </motion.div>
                {liveNowCount > 0 && (
                  <motion.span
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.3, ...SPRING_BOUNCE }}
                    className="pulse-live inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] font-bold text-white bg-gradient-to-r from-red-500 to-red-600 shadow-glow"
                  >
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
                    </span>
                    {liveNowCount} {liveNowCount === 1 ? "live" : "lives"} agora
                  </motion.span>
                )}
              </div>

              <motion.h1
                className="font-[family-name:var(--font-display)] text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-bold leading-[1.02] tracking-tight"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1, delay: 0.15, ease: [0.22, 1, 0.36, 1] as const }}
              >
                <span className="text-shimmer">Sorteios ao vivo,</span>
                <br />
                <motion.span
                  className="text-foreground"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4, duration: 0.8 }}
                >
                  jogos interactivos
                </motion.span>
                <br />
                <motion.span
                  className="text-foreground"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6, duration: 0.8 }}
                >
                  e prémios <span className="text-shimmer">reais</span>
                </motion.span>
              </motion.h1>

              <motion.p
                className="mt-8 text-muted-foreground max-w-lg text-lg sm:text-xl leading-relaxed"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.6 }}
              >
                A plataforma moçambicana onde streamers interagem com a audiência em tempo real.
                69+ jogos, sorteios transparentes e uma comunidade que cresce.
              </motion.p>

              <motion.div
                className="flex flex-wrap items-center gap-4 mt-10"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.75 }}
              >
                <Link to="/jogos">
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }} transition={SPRING_BOUNCE}>
                    <Button size="lg" className="btn-cinematic gap-2.5 text-base font-bold px-8 py-7 rounded-2xl">
                      <Gamepad2 className="h-5 w-5" />
                      Explorar Jogos
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </motion.div>
                </Link>
                <Link to="/lives">
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }} transition={SPRING_BOUNCE}>
                    <Button variant="outline" size="lg" className="gap-2.5 border-white/20 hover:bg-white/10 backdrop-blur-sm px-8 py-7 text-base rounded-2xl aurora-border">
                      <div className="relative flex items-center justify-center">
                        <Radio className="h-5 w-5" />
                        <motion.span
                          className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-red-500"
                          animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                        />
                      </div>
                      Ver Lives
                    </Button>
                  </motion.div>
                </Link>
              </motion.div>

              <motion.div
                className="flex flex-wrap items-center gap-x-6 gap-y-3 mt-10"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1, duration: 0.7 }}
              >
                {[
                  { icon: ShieldCheck, color: "text-emerald-500", label: "Resultados verificados" },
                  { icon: Users, color: "text-blue-500", label: "Comunidade activa" },
                  { icon: Zap, color: "text-amber-500", label: "Pagamentos seguros" },
                ].map((b, i) => (
                  <motion.span
                    key={b.label}
                    initial={{ opacity: 0, x: -15 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 1.1 + i * 0.12, duration: 0.5 }}
                    className="inline-flex items-center gap-2 text-sm text-muted-foreground"
                  >
                    <b.icon className={"h-4 w-4 " + b.color} />
                    {b.label}
                  </motion.span>
                ))}
              </motion.div>
            </motion.div>

            {!isMobile && (
              <motion.div
                className="relative hidden lg:flex justify-center"
                initial={{ opacity: 0, x: 60, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                transition={{ duration: 1, delay: 0.4, ease: [0.22, 1, 0.36, 1] as const }}
              >
                <div className="grid grid-cols-2 gap-5 w-full max-w-lg">
                  {HERO_STATS.map((card, i) => (
                    <motion.div
                      key={card.desc}
                      initial={{ opacity: 0, y: 40, scale: 0.85 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ delay: 0.6 + i * 0.15, duration: 0.7, ease: [0.22, 1, 0.36, 1] as const }}
                      whileHover={{ y: -8, scale: 1.06, transition: { duration: 0.3 } }}
                      className="group relative card-3d"
                    >
                      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-2xl" style={{ background: "linear-gradient(135deg, var(--region-primary, hsl(var(--primary))), var(--region-secondary, hsl(var(--accent))))" }} />
                      <div className="relative glass-strong rounded-2xl p-6 holographic-shine overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-primary/8 to-transparent rounded-bl-full" />
                        <div className={"h-14 w-14 rounded-2xl bg-gradient-to-br " + card.color + " flex items-center justify-center mb-4 shadow-lg"}>
                          <card.icon className="h-7 w-7 text-white" />
                        </div>
                        <motion.p
                          className="text-4xl font-black font-[family-name:var(--font-display)] text-gradient-primary"
                          animate={{ y: card.floatY }}
                          transition={{ duration: card.dur, repeat: Infinity, ease: "easeInOut", delay: i * 0.6 }}
                        >
                          <CountingNumber target={card.value} suffix={card.suffix} duration={2 } />
                        </motion.p>
                        <p className="text-xs text-muted-foreground mt-1.5 font-semibold tracking-wide uppercase">{card.desc}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      </motion.section>

      {/* ===== STORIES & CONTEST TYPES ===== */}
      {/* ===== INFINITY MARQUEE ===== */}
      <div className="relative overflow-hidden py-6 border-y border-border/50 bg-muted/30">
        <div className="infinity-marquee">
          {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS, ...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, i) => (
            <span key={i} className="flex items-center gap-2 mx-6 text-sm font-semibold text-muted-foreground whitespace-nowrap">
              <span className="glow-dot" />
              {item}
            </span>
          ))}
        </div>
      </div>

      <StoriesCarousel />
      <div className="hidden lg:block">
        <ContestTypesShowcase />
      </div>

      {/* ===== SEARCH & FILTER ===== */}
      <section className="container mx-auto px-4 -mt-1">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] as const }}
          className="glass-strong rounded-2xl p-4 sm:p-5 mb-6 gradient-border"
        >
          <SearchBar />
          <div className="mt-3">
            <CategoryNav selected={categoryFilter} onSelect={handleCategorySelect} />
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-3 justify-center sm:justify-start">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {t("cat.filterByRegion")}
            </span>
            <CountryRegionFilter country={country} region={region} onCountry={setCountry} onRegion={setRegion} compact />
          </div>
        </motion.div>
      </section>
      <MobileActionButtons />

      {/* ===== MAIN CONTENT ===== */}
      <div className="container mx-auto px-4">
        <div className="relative flex gap-6">
          <div className="flex-1 min-w-0">
            <AnimatedSection className="mb-2">
              <AIRecommendations />
            </AnimatedSection>

            <AnimatedSection>
              <ActiveRaffles categoryFilter={categoryFilter} country={country} region={region} />
            </AnimatedSection>

            {/* ===== LIVE NOW BANNER ===== */}
            <AnimatedSection className="py-8">
              <motion.div
                whileHover={{ scale: 1.005 }}
                className="premium-card rounded-2xl p-6 sm:p-8 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-56 h-56 bg-gradient-to-bl from-accent/10 to-transparent rounded-bl-full pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-primary/5 to-transparent rounded-tr-full pointer-events-none" />
                <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <motion.div
                        className="h-14 w-14 rounded-2xl bg-gradient-to-br from-accent to-red-600 flex items-center justify-center"
                        animate={{ boxShadow: ["0 0 20px rgba(239,68,68,0.3)", "0 0 40px rgba(239,68,68,0.5)", "0 0 20px rgba(239,68,68,0.3)"] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        <Radio className="h-7 w-7 text-white" />
                      </motion.div>
                      <motion.span
                        className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 border-2 border-background"
                        animate={{ scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold flex items-center gap-2">
                        Ao Vivo Agora
                        <motion.span
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-500/10 text-red-500 text-[11px] font-bold"
                          animate={{ opacity: [1, 0.6, 1] }}
                          transition={{ duration: 1.2, repeat: Infinity }}
                        >
                          <Flame className="h-3 w-3" /> LIVE
                        </motion.span>
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">Junte-se a milhares de jogadores em tempo real</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="hidden sm:flex items-center gap-5 text-center mr-2">
                      <div>
                        <p className="text-xl font-bold text-gradient-primary">50+</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Jogos</p>
                      </div>
                      <div className="w-px h-10 bg-border" />
                      <div>
                        <p className="text-xl font-bold text-gradient-primary">AO VIVO</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">24/7</p>
                      </div>
                    </div>
                    <Link to="/lives-agora">
                      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} transition={SPRING_BOUNCE}>
                        <span className="btn-premium inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white">
                          <Radio className="h-4 w-4" />
                          Entrar
                          <ArrowRight className="h-3.5 w-3.5" />
                        </span>
                      </motion.div>
                    </Link>
                  </div>
                </div>
              </motion.div>
            </AnimatedSection>

            <SectionDivider />

            <AnimatedSection>
              <PopularLeaderboard />
            </AnimatedSection>

            {isMobile && (
              <AnimatedSection className="py-6">
                <LiveFeed />
              </AnimatedSection>
            )}

            <SectionDivider />

            {/* ===== POPULAR GAMES ===== */}
            <AnimatedSection className="py-8">
              <SectionHeader icon={Gamepad2} title="Jogos Populares" badge="50+ jogos" badgeIcon={Users} href="/jogos" />
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {POPULAR_GAMES.map((g, i) => (
                  <motion.div key={g.id} custom={i} variants={scaleIn} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-30px" }}>
                    <Link to={"/lives?game=" + g.id} className="group block">
                      <motion.div
                        className="premium-card rounded-2xl overflow-hidden relative"
                        whileHover={{ y: -6, scale: 1.02, transition: { duration: 0.3 } }}
                      >
                        {/* Shimmer effect on hover */}
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 overflow-hidden rounded-2xl">
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                        </div>
                        <div className={"h-1.5 bg-gradient-to-r " + g.grad} />
                        <div className="p-4">
                          <div className="flex items-center gap-3 mb-2.5">
                            <motion.span
                              className="text-3xl"
                              animate={{ y: [0, -4, 0] }}
                              transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.3, ease: "easeInOut" }}
                              whileHover={{ scale: 1.3, rotate: [0, -10, 10, 0] }}
                            >
                              {g.emoji}
                            </motion.span>
                            <div className="flex-1 min-w-0">
                              <span className="text-sm font-bold group-hover:text-primary transition-colors leading-tight block">{g.label}</span>
                              <span className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                                <Eye className="h-2.5 w-2.5" /> {g.players} jogando
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="badge-premium inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md font-semibold">
                              <motion.span
                                className="h-1.5 w-1.5 rounded-full bg-emerald-500"
                                animate={{ opacity: [1, 0.4, 1] }}
                                transition={{ duration: 1.5, repeat: Infinity }}
                              />
                              Online
                            </span>
                            {g.hasBot && (
                              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-violet-500/10 text-violet-600 dark:text-violet-400 font-bold">
                                <Sparkles className="h-2.5 w-2.5" /> Bot IA
                              </span>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    </Link>
                  </motion.div>
                ))}
              </div>

              {/* AI Games CTA */}
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="mt-6 rounded-2xl gradient-border overflow-hidden"
              >
                <div className="premium-card rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-violet-500/5 via-transparent to-blue-500/5" />
                  <div className="relative flex items-center gap-3">
                    <motion.div
                      className="h-12 w-12 rounded-xl bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center"
                      animate={{ rotate: [0, 5, -5, 0] }}
                      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    >
                      <Sparkles className="h-6 w-6 text-white" />
                    </motion.div>
                    <div>
                      <p className="text-sm font-bold">Jogue contra o computador</p>
                      <p className="text-xs text-muted-foreground">6 jogos com IA em 3 níveis de dificuldade</p>
                    </div>
                  </div>
                  <Link to="/jogos">
                    <motion.span
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="relative btn-premium inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold text-white whitespace-nowrap z-10"
                    >
                      Jogar agora <ArrowRight className="h-3.5 w-3.5" />
                    </motion.span>
                  </Link>
                </div>
              </motion.div>
            </AnimatedSection>

            <SectionDivider />

            {/* ===== TRENDING CONTESTS ===== */}
            <AnimatedSection className="py-8">
              <SectionHeader icon={Trophy} title="Concursos em Destaque" badge="Novo" badgeIcon={Flame} href="/concursos" />
              <div className="grid sm:grid-cols-3 gap-4">
                {TRENDING_CONTESTS.map((item, i) => (
                  <motion.div key={item.title} custom={i} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-20px" }}>
                    <Link to={item.slug} className="group block">
                      <motion.div
                        className="premium-card rounded-2xl overflow-hidden relative"
                        whileHover={{ y: -6, transition: { duration: 0.3 } }}
                      >
                        {item.hot && (
                          <div className="absolute top-3 right-3 z-10">
                            <motion.span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent/10 text-accent text-[10px] font-bold backdrop-blur-sm"
                              animate={{ opacity: [1, 0.7, 1] }}
                              transition={{ duration: 1.5, repeat: Infinity }}
                            >
                              <Flame className="h-3 w-3" /> Quente
                            </motion.span>
                          </div>
                        )}
                        <div className="p-5">
                          <motion.span
                            className="text-4xl block mb-3"
                            animate={{ y: [0, -5, 0], rotate: [0, 3, -3, 0] }}
                            transition={{ duration: 3, repeat: Infinity, delay: i * 0.5 }}
                          >
                            {item.emoji}
                          </motion.span>
                          <h3 className="text-sm font-bold group-hover:text-primary transition-colors line-clamp-2 mb-2">{item.title}</h3>
                          <div className="flex items-center justify-between">
                            <span className="badge-premium text-xs font-bold px-2.5 py-0.5 rounded-md">{item.prize}</span>
                            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                          </div>
                          <div className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground">
                            <Users className="h-3 w-3" />
                            {(item.entries / 1000).toFixed(1)}k participantes
                          </div>
                        </div>
                      </motion.div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </AnimatedSection>

            <SectionDivider />

            {/* ===== BLOG ===== */}
            <AnimatedSection className="py-8">
              <SectionHeader icon={Brain} title="Blog & Dicas" href="/blog" />
              <div className="grid sm:grid-cols-3 gap-3">
                {BLOG_POSTS.map((post, i) => (
                  <motion.div key={post.slug} custom={i} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-20px" }}>
                    <Link to={"/blog/" + post.slug} className="group block">
                      <motion.div
                        className="premium-card rounded-2xl overflow-hidden"
                        whileHover={{ y: -4, transition: { duration: 0.3 } }}
                      >
                        <div className="p-5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{post.cat}</span>
                          <h3 className="text-sm font-bold mt-1.5 group-hover:text-primary transition-colors line-clamp-2">
                            {post.emoji} {post.title}
                          </h3>
                          <motion.span
                            className="inline-flex items-center gap-1 text-xs text-primary mt-3 font-semibold group-hover:gap-2 transition-all"
                            whileHover={{ x: 4 }}
                          >
                            Ler mais <ArrowRight className="h-3 w-3" />
                          </motion.span>
                        </div>
                      </motion.div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </AnimatedSection>

            <SectionDivider />

            <AnimatedSection>
              <WinnersSection />
            </AnimatedSection>
          </div>

          {/* ===== SIDEBAR ===== */}
          {!isMobile && (
            <aside className="hidden lg:block w-80 shrink-0 py-4">
              <div className="sticky top-28 space-y-6">
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4, duration: 0.5 }}
                  className="glass-strong rounded-2xl p-5 space-y-4 gradient-border relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_100%] animate-gradient-shift" />
                  <div className="flex items-center gap-2 mb-1">
                    <motion.span
                      className="h-2.5 w-2.5 rounded-full bg-emerald-500"
                      animate={{ scale: [1, 1.4, 1], opacity: [1, 0.6, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Plataforma ao Vivo</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {[["50+","Jogos"],["24/7","Ao Vivo"],["100%","Verificável"],["IA","Inteligente"]].map(([v,l], idx) => (
                      <motion.div
                        key={l}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 + idx * 0.1 }}
                        className="text-center p-2 rounded-xl hover:bg-primary/5 transition-colors"
                      >
                        <p className="text-2xl font-bold text-gradient-primary">{v}</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{l}</p>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6, duration: 0.5 }}
                  className="glass-strong rounded-2xl p-4 gradient-border"
                >
                  <h3 className="text-sm font-bold font-[family-name:var(--font-display)] mb-3 flex items-center gap-2">
                    <motion.div
                      animate={{ rotate: [0, 10, -10, 0] }}
                      transition={{ duration: 3, repeat: Infinity }}
                    >
                      <Radio className="h-4 w-4 text-accent" />
                    </motion.div>
                    Actividade em Direto
                  </h3>
                  <LiveFeed />
                </motion.div>

                <DesktopWidgets />
              </div>
            </aside>
          )}
        </div>
      </div>

      {/* ===== MEGA FEATURES SHOWCASE ===== */}
      <section className="section-spotlight py-16 lg:py-24">
        <div className="container mx-auto px-4">
          <AnimatedSection>
            <div className="text-center max-w-2xl mx-auto mb-12">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-bold mb-6"
              >
                <Sparkles className="h-4 w-4" />
                Por que a Bateu
              </motion.div>
              <h2 className="text-3xl lg:text-5xl font-black font-[family-name:var(--font-display)] tracking-tight">
                Tudo o que precisa,{' '}
                <span className="text-shimmer">numa so plataforma</span>
              </h2>
              <p className="text-muted-foreground mt-4 text-lg">Descubra porque milhares de utilizadores escolheram a Bateu como plataforma de jogos e sorteios</p>
            </div>
          </AnimatedSection>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {MEGA_FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                custom={i}
                variants={scaleIn}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-40px" }}
              >
                <div className="card-3d group">
                  <div className="card-3d-inner relative rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm p-6 h-full overflow-hidden holographic-shine">
                    <div className={"absolute top-0 left-0 right-0 h-1 bg-gradient-to-r " + f.grad} />
                    <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition-opacity" style={{ background: "linear-gradient(135deg, var(--primary), var(--accent))" }} />
                    <motion.span
                      className="text-4xl block mb-4"
                      animate={{ y: [0, -5, 0] }}
                      transition={{ duration: 3, repeat: Infinity, delay: i * 0.4, ease: "easeInOut" }}
                    >
                      {f.emoji}
                    </motion.span>
                    <h3 className="text-lg font-bold mb-2 group-hover:text-primary transition-colors">{f.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <StatsBar />
      <FeaturesGrid />
      <TrustSignals />

      <StayInLoop />

      {/* ===== MEGA CTA ===== */}
      <section className="relative py-24 lg:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/5 to-background" />
        <div className="hero-aurora opacity-50" />
        <div className="relative z-10 container mx-auto px-4 text-center">
          <AnimatedSection>
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="max-w-3xl mx-auto"
            >
              <motion.div
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-primary to-accent shadow-2xl mb-8"
                style={{ boxShadow: "0 0 60px hsl(var(--primary) / 0.3), 0 0 120px hsl(var(--accent) / 0.15)" }}
              >
                <Rocket className="w-10 h-10 text-white" />
              </motion.div>
              <h2 className="text-4xl lg:text-6xl font-black font-[family-name:var(--font-display)] tracking-tight">
                Pronto para{' '}
                <span className="text-shimmer">jogar?</span>
              </h2>
              <p className="text-xl text-muted-foreground mt-6 max-w-xl mx-auto">
                Junte-se a milhares de jogadores. Sorteios ao vivo, 69+ jogos, prémios reais.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4 mt-10">
                <Link to="/register">
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }} transition={SPRING_BOUNCE}>
                    <Button size="lg" className="btn-cinematic gap-2.5 text-lg font-bold px-10 py-8 rounded-2xl">
                      Criar Conta Grátis
                      <ArrowRight className="h-5 w-5" />
                    </Button>
                  </motion.div>
                </Link>
                <Link to="/jogos">
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }} transition={SPRING_BOUNCE}>
                    <Button variant="outline" size="lg" className="gap-2.5 border-white/20 hover:bg-white/10 backdrop-blur-sm px-10 py-8 text-lg rounded-2xl aurora-border">
                      <Play className="h-5 w-5" />
                      Ver Jogos
                    </Button>
                  </motion.div>
                </Link>
              </div>
              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.5, duration: 0.8 }}
                className="flex items-center justify-center gap-8 mt-12 text-sm text-muted-foreground"
              >
                <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-500" /> Gratuito para jogar</span>
                <span className="flex items-center gap-2"><Zap className="h-4 w-4 text-amber-500" /> Sem cartao de credito</span>
                <span className="flex items-center gap-2"><Star className="h-4 w-4 text-primary" /> Prémios reais</span>
              </motion.div>
            </motion.div>
          </AnimatedSection>
        </div>
      </section>

      <CTASection />
      <Footer />
    </div>
  );
};

export default Index;
