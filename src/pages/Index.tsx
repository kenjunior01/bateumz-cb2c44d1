import { useState, useRef, useEffect } from "react";
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
  ChevronRight,
} from "lucide-react";
import { motion, useInView } from "framer-motion";
import bateuLogo from "@/assets/bateu-logo.png";

import PopularLeaderboard from "@/components/PopularLeaderboard";
import ContestTypesShowcase from "@/components/ContestTypesShowcase";
import CountryRegionFilter from "@/components/CountryRegionFilter";
import StoriesCarousel from "@/components/StoriesCarousel";
import AIRecommendations from "@/components/AIRecommendations";
import TrustSignals from "@/components/TrustSignals";
import LiveTicker from "@/components/LiveTicker";
import StayInLoop from "@/components/StayInLoop";

const POPULAR_GAMES = [
  { id: "tictactoepro", label: "Galo PRO", emoji: "\u2716", grad: "from-violet-600 to-indigo-700", hasBot: true },
  { id: "connect4", label: "Ligar 4", emoji: "\ud83d\udd34", grad: "from-blue-500 to-yellow-500", hasBot: true },
  { id: "snakebattle", label: "Batalha de Cobras", emoji: "\ud83d\udc0d", grad: "from-emerald-500 to-teal-600", hasBot: true },
  { id: "quickmath", label: "Duelo de Matem\u00e1tica", emoji: "\ud83e\uddee", grad: "from-cyan-500 to-blue-700", hasBot: true },
  { id: "rps", label: "Pedra Papel Tesoura", emoji: "\u270a", grad: "from-amber-500 to-orange-600", hasBot: true },
  { id: "memorycards", label: "Mem\u00f3ria VS Cartas", emoji: "\ud83c\udccf", grad: "from-indigo-500 to-violet-600", hasBot: true },
  { id: "pongvs", label: "Pong VS", emoji: "\ud83c\udfd3", grad: "from-blue-600 to-indigo-700", hasBot: false },
  { id: "whackamole", label: "Bate o Alvo", emoji: "\ud83c\udfaf", grad: "from-emerald-500 to-green-600", hasBot: false },
];

const BLOG_POSTS = [
  { title: "Como Ganhar no Galo", slug: "como-ganhar-jogo-do-galo-estrategias", emoji: "\u265f\ufe0f", cat: "Estrat\u00e9gia" },
  { title: "10 Dicas para Sorteios", slug: "10-dicas-sorteios-online", emoji: "\ud83c\udfb0", cat: "Sorteios" },
  { title: "Jogos que Treinam o C\u00e9rebro", slug: "jogos-online-treinar-cerebro", emoji: "\ud83e\udde0", cat: "Ci\u00eancia" },
];

const TRENDING_CONTESTS = [
  { title: "Grande Sorteio de Natal", prize: "MT 500.000", emoji: "\ud83c\udf84", slug: "/concursos", hot: true },
  { title: "Torneio de Galo Semanal", prize: "Gratuito", emoji: "\ud83c\udfc6", slug: "/tournaments", hot: true },
  { title: "Desafio de Conhecimentos", prize: "Pr\u00e9mios Exclusivos", emoji: "\ud83e\udde0", slug: "/concursos", hot: false },
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.07, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
};

const sectionFade = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1, y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: (i: number) => ({
    opacity: 1, scale: 1,
    transition: { delay: i * 0.06, duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] },
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
      variants={sectionFade as any}
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
        <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[var(--region-primary,hsl(var(--primary)))] to-[var(--region-secondary,hsl(var(--accent)))] flex items-center justify-center shadow-elegant">
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

const Index = () => {
  const isMobile = useIsMobile();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [categoryFilter, setCategoryFilter] = useState("todos");
  const [country, setCountry] = useState("");
  const [region, setRegion] = useState("");
  const [liveNowCount, setLiveNowCount] = useState(0);

  useEffect(() => {
    const fetchLiveCount = async () => {
      try {
        const { count } = await (supabase as any)
          .from("live_sessions")
          .select("*", { count: "exact", head: true })
          .eq("status", "active");
        if (typeof count === "number") setLiveNowCount(count);
      } catch { /* ignore */ }
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
    <div className="min-h-screen bg-background pb-16 lg:pb-0">
      <Navbar />
      <LiveTicker />

      <section className="relative overflow-hidden">
        <div className="mesh-gradient-animated absolute inset-0 opacity-60" />
        <motion.div
          className="absolute -left-20 top-1/4 h-72 w-72 rounded-full blur-[120px] pointer-events-none"
          style={{ background: "color-mix(in srgb, var(--region-primary, hsl(var(--primary))) 14%, transparent)" }}
          animate={{ y: [0, -20, 0], x: [0, 10, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -right-16 top-1/3 h-56 w-56 rounded-full blur-[100px] pointer-events-none"
          style={{ background: "color-mix(in srgb, var(--region-secondary, hsl(var(--accent))) 12%, transparent)" }}
          animate={{ y: [0, 15, 0], x: [0, -12, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.img
          src={bateuLogo}
          alt=""
          aria-hidden="true"
          className="absolute right-[-5%] top-1/2 -translate-y-1/2 w-48 md:w-64 lg:w-80 opacity-[0.04] dark:opacity-[0.06] pointer-events-none select-none"
          animate={{ y: [0, -12, 0], rotate: [0, 2, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background pointer-events-none" />

        <div className="relative container mx-auto px-4 pt-6 pb-10 lg:pt-10 lg:pb-16">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -32 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, ease: "easeOut" }}
            >
              <div className="flex items-center gap-3 mb-5">
                <img src={bateuLogo} alt="Bateu" className="h-10 w-auto" />
                {liveNowCount > 0 && (
                  <span className="pulse-live inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold text-white bg-accent shadow-glow">
                    <Radio className="h-3 w-3" />
                    {liveNowCount} {liveNowCount === 1 ? "live" : "lives"} agora
                  </span>
                )}
              </div>

              <h1 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl lg:text-[3.25rem] xl:text-6xl font-bold leading-[1.08] tracking-tight">
                <span className="text-gradient-primary">Sorteios ao vivo,</span>
                <br />
                <span className="text-foreground">jogos interactivos</span>
                <br />
                <span className="text-foreground">e pr\u00e9mios reais</span>
              </h1>

              <p className="mt-5 text-muted-foreground max-w-md text-sm sm:text-base leading-relaxed">
                A plataforma mo\u00e7ambicana onde streamers interagem com a audi\u00eancia em tempo real.
                Mais de 50 jogos, sorteios transparentes e uma comunidade que cresce.
              </p>

              <div className="flex flex-wrap items-center gap-3 mt-7">
                <Link to="/jogos">
                  <Button size="lg" className="btn-premium gap-2 text-sm font-bold glow-primary">
                    <Gamepad2 className="h-4 w-4" />
                    Explorar Jogos
                  </Button>
                </Link>
                <Link to="/lives">
                  <Button variant="outline" size="lg" className="gap-2 border-white/20 text-white hover:bg-white/10 backdrop-blur-sm">
                    <Radio className="h-4 w-4 text-accent" />
                    Ver Lives
                  </Button>
                </Link>
              </div>

              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-7">
                {[
                  { icon: ShieldCheck, color: "text-emerald-500", label: "Resultados verificados" },
                  { icon: Users, color: "text-blue-500", label: "Comunidade activa" },
                  { icon: Zap, color: "text-amber-500", label: "Pagamentos seguros" },
                ].map((b) => (
                  <span key={b.label} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <b.icon className={"h-3.5 w-3.5 " + b.color} />
                    {b.label}
                  </span>
                ))}
              </div>
            </motion.div>

            {!isMobile && (
              <motion.div
                className="relative hidden lg:flex justify-center"
                initial={{ opacity: 0, x: 32 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
              >
                <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
                  {[
                    { icon: Trophy, color: "text-amber-500", value: "50+", desc: "Jogos dispon\u00edveis", floatY: [0, -6, 0], dur: 4 },
                    { icon: Flame, color: "text-accent", value: "AO VIVO", desc: "Entretenimento interactivo", floatY: [0, 6, 0], dur: 5 },
                    { icon: TrendingUp, color: "text-emerald-500", value: "IA", desc: "3 n\u00edveis de dificuldade", floatY: [0, 5, 0], dur: 4.5 },
                    { icon: Star, color: "text-primary", value: "#1", desc: "Plataforma em Mo\u00e7ambique", floatY: [0, -5, 0], dur: 5.5 },
                  ].map((card, i) => (
                    <motion.div
                      key={card.desc}
                      className="glass-strong rounded-2xl p-5 card-lift gradient-border"
                      animate={{ y: card.floatY }}
                      transition={{ duration: card.dur, repeat: Infinity, ease: "easeInOut", delay: i * 0.5 }}
                    >
                      <card.icon className={"h-6 w-6 " + card.color + " mb-2"} />
                      <p className="text-2xl font-bold font-[family-name:var(--font-display)]">{card.value}</p>
                      <p className="text-xs text-muted-foreground">{card.desc}</p>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </section>

      <StoriesCarousel />
      <div className="hidden lg:block">
        <ContestTypesShowcase />
      </div>

      <section className="container mx-auto px-4 -mt-1">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
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

      <div className="container mx-auto px-4">
        <div className="relative flex gap-6">
          <div className="flex-1 min-w-0">
            <AnimatedSection className="mb-2">
              <AIRecommendations />
            </AnimatedSection>

            <AnimatedSection>
              <ActiveRaffles categoryFilter={categoryFilter} country={country} region={region} />
            </AnimatedSection>

            <AnimatedSection className="py-8">
              <div className="premium-card rounded-2xl p-5 sm:p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-accent/10 to-transparent rounded-bl-full pointer-events-none" />
                <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-accent to-accent/70 flex items-center justify-center">
                        <Radio className="h-6 w-6 text-white" />
                      </div>
                      <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-red-500 border-2 border-background pulse-live" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold flex items-center gap-2">
                        Ao Vivo Agora
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 text-[10px] font-bold pulse-live">
                          <Flame className="h-3 w-3" /> LIVE
                        </span>
                      </h3>
                      <p className="text-sm text-muted-foreground mt-0.5">Junte-se a milhares de jogadores em tempo real</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="hidden sm:flex items-center gap-4 text-center mr-2">
                      <div>
                        <p className="text-lg font-bold text-gradient-primary">50+</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Jogos</p>
                      </div>
                      <div className="w-px h-8 bg-border" />
                      <div>
                        <p className="text-lg font-bold text-gradient-primary">AO VIVO</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">24/7</p>
                      </div>
                    </div>
                    <Link to="/lives-agora" className="btn-premium inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white">
                      <Radio className="h-4 w-4" />
                      Entrar
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
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

            <AnimatedSection className="py-8">
              <SectionHeader icon={Gamepad2} title="Jogos Populares" badge="50+ jogos" badgeIcon={Users} href="/jogos" />
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {POPULAR_GAMES.map((g, i) => (
                  <motion.div key={g.id} custom={i} variants={scaleIn as any} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-30px" }}>
                    <Link to={"/lives?game=" + g.id} className="group block premium-card rounded-2xl overflow-hidden card-lift">
                      <div className={"h-1.5 bg-gradient-to-r " + g.grad} />
                      <div className="p-3.5">
                        <div className="flex items-center gap-2.5 mb-2">
                          <motion.span
                            className="text-2xl animate-float-soft"
                            style={{ animationDelay: (i * 0.3) + "s" }}
                            whileHover={{ scale: 1.2, rotate: [0, -8, 8, 0] }}
                            transition={{ duration: 0.4 }}
                          >
                            {g.emoji}
                          </motion.span>
                          <span className="text-sm font-bold group-hover:text-primary transition-colors leading-tight">{g.label}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="badge-premium inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md font-semibold">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse-soft" />
                            Online
                          </span>
                          {g.hasBot && (
                            <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md bg-violet-500/10 text-violet-600 dark:text-violet-400 font-bold">
                              <Sparkles className="h-2.5 w-2.5" /> Bot IA
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>

              <motion.div initial={{ opacity: 0, scale: 0.96 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: 0.3, duration: 0.5 }} className="mt-5 rounded-2xl gradient-border overflow-hidden">
                <div className="premium-card rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-primary to-accent/80 flex items-center justify-center animate-float-soft">
                      <Sparkles className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-bold">Jogue contra o computador</p>
                      <p className="text-xs text-muted-foreground">6 jogos com IA em 3 n\u00edveis de dificuldade</p>
                    </div>
                  </div>
                  <Link to="/jogos" className="btn-premium inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white whitespace-nowrap">
                    Jogar agora <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </motion.div>
            </AnimatedSection>

            <SectionDivider />

            <AnimatedSection className="py-8">
              <SectionHeader icon={Trophy} title="Concursos em Destaque" badge="Novo" badgeIcon={Flame} href="/concursos" />
              <div className="grid sm:grid-cols-3 gap-3">
                {TRENDING_CONTESTS.map((item, i) => (
                  <motion.div key={item.title} custom={i} variants={fadeUp as any} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-20px" }}>
                    <Link to={item.slug} className="group block premium-card rounded-2xl overflow-hidden card-3d">
                      <div className="p-5">
                        <div className="flex items-start justify-between mb-3">
                          <span className="text-3xl animate-float-soft" style={{ animationDelay: (i * 0.5) + "s" }}>{item.emoji}</span>
                          {item.hot && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent/10 text-accent text-[10px] font-bold">
                              <Flame className="h-3 w-3" /> Quente
                            </span>
                          )}
                        </div>
                        <h3 className="text-sm font-bold group-hover:text-primary transition-colors line-clamp-2 mb-1.5">{item.title}</h3>
                        <div className="flex items-center justify-between">
                          <span className="badge-premium text-xs font-bold px-2 py-0.5 rounded-md">{item.prize}</span>
                          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </AnimatedSection>

            <SectionDivider />

            <AnimatedSection className="py-8">
              <SectionHeader icon={Brain} title="Blog & Dicas" href="/blog" />
              <div className="grid sm:grid-cols-3 gap-3">
                {BLOG_POSTS.map((post, i) => (
                  <motion.div key={post.slug} custom={i} variants={fadeUp as any} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-20px" }}>
                    <Link to={"/blog/" + post.slug} className="group block premium-card rounded-2xl overflow-hidden card-lift">
                      <div className="p-5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{post.cat}</span>
                        <h3 className="text-sm font-bold mt-1.5 group-hover:text-primary transition-colors line-clamp-2">
                          {post.emoji} {post.title}
                        </h3>
                        <span className="inline-flex items-center gap-1 text-xs text-primary mt-3 font-semibold group-hover:gap-2 transition-all">
                          Ler mais <ArrowRight className="h-3 w-3" />
                        </span>
                      </div>
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

          {!isMobile && (
            <aside className="hidden lg:block w-80 shrink-0 py-4">
              <div className="sticky top-28 space-y-6">
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4, duration: 0.5 }} className="glass-strong rounded-2xl p-5 space-y-4 gradient-border">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 pulse-live" />
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Plataforma ao Vivo</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {[["50+","Jogos"],["24/7","Ao Vivo"],["100%","Verific\u00e1vel"],["IA","Inteligente"]].map(([v,l]) => (
                      <div key={l} className="text-center">
                        <p className="text-2xl font-bold text-gradient-primary">{v}</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{l}</p>
                      </div>
                    ))}
                  </div>
                </motion.div>

                <div className="glass-strong rounded-2xl p-4 gradient-border">
                  <h3 className="text-sm font-bold font-[family-name:var(--font-display)] mb-3 flex items-center gap-2">
                    <Radio className="h-4 w-4 text-accent" />
                    Actividade em Direto
                  </h3>
                  <LiveFeed />
                </div>

                <DesktopWidgets />
              </div>
            </aside>
          )}
        </div>
      </div>

      <StatsBar />
      <FeaturesGrid />
      <TrustSignals />

      <StayInLoop />
      <CTASection />
      <Footer />
    </div>
  );
};

export default Index;
