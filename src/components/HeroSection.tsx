import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  Shield,
  Users,
  Clock,
  Trophy,
  Sparkles,
  Zap,
  Globe,
  Gift,
  Gamepad2,
  Tv,
  ChevronRight,
} from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useRegionalTheme } from "@/contexts/RegionalThemeContext";
import CountdownTimer from "./CountdownTimer";

// --- Constants defined at module level (no inline `as const`) ---

const STATS_CONFIG = [
  { key: "participants", icon: Users, suffix: "+", label: "Participantes" },
  { key: "prizes", icon: Gift, suffix: "+", label: "Prémios Entregues" },
  { key: "games", icon: Gamepad2, suffix: "+", label: "Jogos ao Vivo" },
  { key: "countries", icon: Globe, suffix: "", label: "Países" },
] as const;

const TRUST_ITEMS = [
  { icon: Shield, key: "hero.badge.verification", fallback: "Verificação Pública" },
  { icon: Clock, key: "hero.badge.weekly", fallback: "Novo toda semana" },
  { icon: Tv, key: "hero.badge.live", fallback: "Ao Vivo" },
] as const;

const ORB_CONFIG = [
  { size: 320, x: "10%", y: "15%", color: "var(--region-primary, hsl(220 70% 18%))", opacity: 0.12, duration: 18 },
  { size: 260, x: "75%", y: "10%", color: "var(--region-secondary, hsl(352 73% 50%))", opacity: 0.10, duration: 22 },
  { size: 200, x: "50%", y: "60%", color: "var(--region-primary, hsl(220 70% 18%))", opacity: 0.08, duration: 15 },
  { size: 140, x: "85%", y: "55%", color: "var(--region-secondary, hsl(352 73% 50%))", opacity: 0.06, duration: 20 },
  { size: 100, x: "20%", y: "70%", color: "var(--region-primary, hsl(220 60% 30%))", opacity: 0.07, duration: 25 },
] as const;

// --- Animated Counter Hook ---

function useCountUp(end: number, duration: number = 2000, enabled: boolean = true) {
  const [count, setCount] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  const animate = useCallback(
    (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * end));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    },
    [end, duration]
  );

  useEffect(() => {
    if (!enabled) {
      setCount(end);
      return;
    }
    startTimeRef.current = null;
    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [animate, enabled]);

  return count;
}

// --- Featured Raffle Type ---

interface FeaturedRaffle {
  id: string;
  title: string;
  prize_title: string;
  end_date: string | null;
}

// --- Stat Counter Sub-Component ---

function StatCard({
  icon: Icon,
  value,
  suffix,
  label,
  index,
}: {
  icon: typeof Users;
  value: number;
  suffix: string;
  label: string;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, delay: 0.8 + index * 0.12, ease: [0.22, 1, 0.36, 1] }}
      className="group relative flex flex-col items-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.04] p-4 backdrop-blur-xl transition-all duration-300 hover:border-white/[0.15] hover:bg-white/[0.07]"
    >
      <div
        className="flex h-11 w-11 items-center justify-center rounded-xl"
        style={{
          background: "linear-gradient(135deg, var(--region-primary, hsl(220 70% 18%)), var(--region-secondary, hsl(352 73% 50%)))",
          opacity: 0.9,
        }}
      >
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div className="text-center">
        <span className="block font-display text-2xl font-bold tracking-tight text-white">
          {value.toLocaleString()}
          {suffix}
        </span>
        <span className="block text-[11px] font-medium uppercase tracking-wider text-white/50">
          {label}
        </span>
      </div>
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: "radial-gradient(ellipse at center, rgba(255,255,255,0.03) 0%, transparent 70%)",
        }}
      />
    </motion.div>
  );
}

// --- Floating Orb Sub-Component ---

function FloatingOrb({
  size,
  x,
  y,
  color,
  opacity,
  duration,
  index,
}: {
  size: number;
  x: string;
  y: string;
  color: string;
  opacity: number;
  duration: number;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0 }}
      animate={{
        opacity: [opacity * 0.5, opacity, opacity * 0.7, opacity],
        scale: [0.6, 1, 0.85, 1],
        x: [0, 15, -10, 0],
        y: [0, -20, 10, 0],
      }}
      transition={{
        duration,
        repeat: Infinity,
        ease: "easeInOut",
        delay: index * 0.4,
      }}
      className="pointer-events-none absolute rounded-full"
      style={{
        width: size,
        height: size,
        left: x,
        top: y,
        background: `radial-gradient(circle at 30% 30%, ${color}, transparent 70%)`,
        filter: "blur(60px)",
      }}
    />
  );
}

// --- Main HeroSection Component ---

const HeroSection = () => {
  const { t } = useLanguage();
  const { rt } = useRegionalTheme();
  const [participantCount, setParticipantCount] = useState(0);
  const [featuredRaffle, setFeaturedRaffle] = useState<FeaturedRaffle | null>(null);
  const [countdownEnabled, setCountdownEnabled] = useState(false);
  const [mounted, setMounted] = useState(false);

  const animatedParticipants = useCountUp(participantCount, 2200, mounted);
  const animatedPrizes = useCountUp(4850, 2400, mounted);
  const animatedGames = useCountUp(1200, 2000, mounted);
  const animatedCountries = useCountUp(12, 1800, mounted);

  useEffect(() => {
    setMounted(true);
    const load = async () => {
      const [{ count }, { data: settings }] = await Promise.all([
        supabase.from("participants").select("id", { count: "exact", head: true }),
        (supabase as any).from("platform_settings_public").select("key, value").eq("key", "featured").maybeSingle(),
      ]);
      setParticipantCount(count || 0);
      if (settings?.value) {
        const featured = settings.value as any;
        const isEnabled = featured.countdownEnabled === true;
        setCountdownEnabled(isEnabled);
        if (isEnabled && featured.raffleId) {
          const { data: raffle } = await supabase
            .from("raffles")
            .select("id, title, prize_title, end_date")
            .eq("id", featured.raffleId)
            .eq("status", "active")
            .maybeSingle();
          if (raffle) setFeaturedRaffle(raffle);
        }
      }
    };
    load();
  }, []);

  const statValues: Record<string, number> = {
    participants: animatedParticipants,
    prizes: animatedPrizes,
    games: animatedGames,
    countries: animatedCountries,
  };

  return (
<<<<<<< HEAD
    <section className="relative min-h-[90vh] overflow-hidden bg-cosmic">
      <div className="nebula-blob nebula-blob-1" />
      <div className="nebula-blob nebula-blob-2" />
      <div className="nebula-blob nebula-blob-3" />
      <div className="nebula-blob nebula-blob-4" />
      <div className="floating-stars"><span /><span /><span /><span /><span /><span /><span /><span /></div>
      <div className="ambient-glow" />
      {/* Mesh gradient background */}
      <div className="absolute inset-0">
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(160deg, hsl(220 70% 8%) 0%, hsl(220 40% 12%) 35%, hsl(352 50% 15%) 65%, hsl(220 50% 6%) 100%)",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: "radial-gradient(ellipse 80% 50% at 20% 40%, rgba(220,70%,18%,0.15), transparent 50%), radial-gradient(ellipse 60% 40% at 80% 30%, rgba(352,73%,50%,0.12), transparent 50%), radial-gradient(ellipse 50% 60% at 50% 80%, rgba(220,60%,30%,0.08), transparent 50%)",
          }}
        />
      </div>

      {/* Noise texture overlay */}
=======
    <section ref={ref} onMouseMove={handleMouseMove} className="relative overflow-hidden min-h-[94vh] md:min-h-[90vh] flex flex-col justify-center">
      <div className="absolute inset-0 mesh-gradient-animated" />
      <AuroraBackground />

      <motion.div
        className="absolute -left-44 top-[8%] h-[28rem] w-[28rem] md:h-[34rem] md:w-[34rem] rounded-full blur-[170px] pointer-events-none"
        style={{ background: `color-mix(in srgb, ${RP} 20%, transparent)`, x: farX, y: farY }}
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div
        className="absolute -right-36 top-[18%] h-80 w-80 md:h-96 md:w-96 rounded-full blur-[140px] pointer-events-none"
        style={{ background: `color-mix(in srgb, ${RS} 18%, transparent)`, x: midX, y: midY }}
        animate={{ scale: [1.08, 1, 1.08] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div
        className="absolute left-1/2 bottom-[-14%] h-60 w-[36rem] -translate-x-1/2 rounded-full blur-[130px] pointer-events-none"
        style={{ background: `color-mix(in srgb, ${RG} 16%, transparent)`, x: nearX, y: nearY }}
        animate={{ y: [0, -20, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
      />

>>>>>>> 3af2551 (feat: overlay pro, stats dashboard, company public profile, branding persistence)
      <div
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          backgroundSize: "128px 128px",
        }}
      />

<<<<<<< HEAD
      {/* Floating orbs */}
      {ORB_CONFIG.map((orb, i) => (
        <FloatingOrb key={i} size={orb.size} x={orb.x} y={orb.y} color={orb.color} opacity={orb.opacity} duration={orb.duration} index={i} />
      ))}

      {/* Grid lines */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      {/* Top glow line */}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
        className="absolute top-0 left-0 right-0 h-px origin-center"
        style={{
          background: "linear-gradient(90deg, transparent, var(--region-primary, hsl(220 70% 18%)), var(--region-secondary, hsl(352 73% 50%)), var(--region-primary, hsl(220 70% 18%)), transparent)",
        }}
      />

      {/* Main content */}
      <div className="container relative z-10 mx-auto flex min-h-[90vh] max-w-7xl flex-col items-center px-4 pt-24 pb-12 sm:pt-28 md:pt-32 lg:flex-row lg:items-center lg:justify-between lg:gap-12 lg:pt-0">

        {/* Left column */}
        <div className="flex flex-1 flex-col items-center text-center lg:items-start lg:text-left">
          {/* Pill badge */}
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/[0.1] bg-white/[0.06] px-4 py-1.5 backdrop-blur-md"
          >
            <motion.span
              animate={{ rotate: [0, 15, -15, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            </motion.span>
            <span className="text-xs font-medium text-white/70">
              {rt("hero.pill", "Plataforma #1 de Entretenimento em Moçambique")}
            </span>
          </motion.div>
=======
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <GlowRing className="w-[650px] h-[650px] left-[62%] top-[28%] -translate-x-1/2 -translate-y-1/2" delay={0} />
        <GlowRing className="w-[900px] h-[900px] left-[62%] top-[28%] -translate-x-1/2 -translate-y-1/2" delay={3} />
        <GlowRing className="w-[400px] h-[400px] left-[20%] top-[65%] -translate-x-1/2 -translate-y-1/2" delay={6} />
      </div>

      <FloatingParticles />

      <motion.img
        src={bateuLogo} alt="" aria-hidden="true"
        className="absolute right-[-4%] top-1/2 -translate-y-1/2 w-52 md:w-72 lg:w-96 opacity-[0.02] dark:opacity-[0.035] pointer-events-none select-none"
        animate={{ y: [0, -14, 0], rotate: [0, 1.5, 0] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="container relative z-10 mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          className="max-w-7xl mx-auto"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">

            <div className="lg:col-span-7 text-center lg:text-left">

              <motion.div variants={scaleIn} className="mb-6 flex items-center justify-center lg:justify-start gap-3 flex-wrap">
                <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full badge-premium text-xs font-semibold tracking-wide">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-accent" />
                  </span>
                  <span style={{ color: RP }}>{rt("hero.badge.live", "Jogos ao Vivo Agora")}</span>
                  <Radio className="h-3 w-3" style={{ color: RS }} />
                </span>
>>>>>>> 3af2551 (feat: overlay pro, stats dashboard, company public profile, branding persistence)

          {/* Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
            className="mb-5 max-w-2xl font-display text-4xl font-bold leading-[1.1] tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl"
          >
            {rt("hero.title.prefix", t("hero.title.prefix"))}{" "}
            <span
              className="relative inline-block bg-clip-text text-transparent"
              style={{
                backgroundImage: "linear-gradient(135deg, var(--region-secondary, hsl(352 73% 50%)), #f59e0b, var(--region-secondary, hsl(352 73% 50%)))",
                backgroundSize: "200% auto",
              }}
            >
              {rt("hero.title.highlight", t("hero.title.highlight"))}
              <motion.span
                className="absolute -bottom-1 left-0 right-0 h-[3px] rounded-full"
                style={{
                  background: "linear-gradient(90deg, var(--region-secondary, hsl(352 73% 50%)), #f59e0b, var(--region-secondary, hsl(352 73% 50%)))",
                }}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.8, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
              />
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="mb-8 max-w-lg text-base leading-relaxed text-white/60 sm:text-lg"
          >
            {rt(
              "hero.subtitle",
              "Sorteios transparentes, jogos ao vivo e prémios reais. Junte-se a milhares de moçambicanos que já estão a ganhar."
            )}
          </motion.p>

<<<<<<< HEAD
          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.35 }}
            className="mb-8 flex flex-col gap-3 sm:flex-row sm:gap-4"
          >
            <Link
              to="/marketplace"
              className="group relative inline-flex items-center gap-2 overflow-hidden rounded-2xl px-7 py-3.5 text-sm font-semibold text-white shadow-xl transition-all duration-300 hover:shadow-2xl hover:scale-[1.02] sm:text-base"
              style={{
                background: "linear-gradient(135deg, var(--region-primary, hsl(220 70% 18%)), var(--region-secondary, hsl(352 73% 50%)))",
                boxShadow: "0 8px 32px -8px rgba(220,70%,18%,0.5), inset 0 1px 0 rgba(255,255,255,0.15)",
              }}
            >
              <span className="relative z-10 flex items-center gap-2">
                {rt("hero.cta", t("hero.cta"))}
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </span>
              <motion.div
                className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                style={{
                  background: "linear-gradient(135deg, var(--region-secondary, hsl(352 73% 50%)), var(--region-primary, hsl(220 70% 18%)))",
                }}
              />
            </Link>

            <Link
              to="/live-hub"
              className="group inline-flex items-center gap-2 rounded-2xl border border-white/[0.12] bg-white/[0.05] px-7 py-3.5 text-sm font-semibold text-white/90 backdrop-blur-sm transition-all duration-300 hover:border-white/[0.25] hover:bg-white/[0.1] hover:scale-[1.02] sm:text-base"
            >
              <Zap className="h-4 w-4 text-amber-400" />
              <span>{rt("hero.cta.live", "Ver ao Vivo")}</span>
              <ChevronRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
            </Link>
          </motion.div>

          {/* Trust badges */}
=======
              <motion.h1
                variants={fadeUp}
                className="mb-5 font-display text-3xl sm:text-4xl md:text-5xl lg:text-[3.5rem] xl:text-[4.2rem] font-bold leading-[1.06] tracking-tight"
              >
                <span className="inline-block">
                  {rt("hero.title.prefix", t("hero.title.prefix"))}
                </span>{" "}
                <span
                  className="relative inline-block text-neon animate-shimmer"
                  style={{
                    backgroundImage: headlineGrad,
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  {rt("hero.title.highlight", t("hero.title.highlight"))}
                  <motion.span
                    className="absolute -bottom-1.5 left-0 right-0 h-[3px] rounded-full opacity-60"
                    style={{ background: accentGrad }}
                    initial={{ scaleX: 0 }}
                    animate={inView ? { scaleX: 1 } : {}}
                    transition={{ delay: 0.9, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                    aria-hidden
                  />
                </span>
              </motion.h1>

              <motion.p
                variants={fadeUp}
                className="mx-auto lg:mx-0 mb-4 max-w-xl text-sm md:text-base lg:text-[1.1rem] text-muted-foreground leading-relaxed"
              >
                {rt("hero.subtitle", t("hero.subtitle"))}
              </motion.p>

              {totalPrizeValue > 0 && (
                <motion.div variants={fadeUp} className="mx-auto lg:mx-0 mb-7">
                  <div className="inline-flex items-center gap-2.5 px-5 py-2 rounded-2xl glass-subtle">
                    <Trophy className="h-4 w-4 text-amber-500" />
                    <span className="text-xs text-muted-foreground font-medium">Prémios em jogo:</span>
                    <span className="text-sm font-bold font-display text-gradient-primary">
                      {format(totalPrizeValue)}
                    </span>
                  </div>
                </motion.div>
              )}

              <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 sm:gap-4 mb-8">
                <Link
                  to="/marketplace"
                  className="btn-premium group relative inline-flex items-center gap-2.5 rounded-2xl px-8 py-3.5 md:px-10 md:py-4 text-sm md:text-base font-bold text-primary-foreground glow-primary"
                >
                  <Zap className="h-4 w-4 transition-transform duration-300 group-hover:scale-110" />
                  {rt("hero.cta", t("hero.cta"))}
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>

                <Link
                  to="/jogos"
                  className="group relative inline-flex items-center gap-2.5 rounded-2xl px-7 py-3.5 md:px-8 md:py-4 text-sm md:text-base font-semibold glass-subtle hover:bg-card/60 transition-all duration-300 hover-lift"
                  style={{ color: RP }}
                >
                  <Gamepad2 className="h-4 w-4 transition-transform duration-300 group-hover:rotate-12" />
                  {rt("hero.cta.games", "Explorar Jogos")}
                  <Sparkles className="h-3.5 w-3.5 opacity-50 group-hover:opacity-100 transition-opacity" />
                </Link>

                <Link
                  to="/lives"
                  className="group relative inline-flex items-center gap-2 rounded-2xl px-6 py-3.5 text-sm font-semibold transition-all duration-300 hover-lift"
                  style={{ color: RS }}
                >
                  <Play className="h-4 w-4 transition-transform duration-300 group-hover:scale-110" />
                  <span className="hidden sm:inline">{rt("hero.cta.live", "Ver Lives")}</span>
                </Link>
              </motion.div>

              <motion.div variants={fadeUp} className="flex flex-wrap items-center justify-center lg:justify-start gap-2 md:gap-3">
                {[
                  { icon: Shield, label: t("hero.badge.verification") },
                  { icon: Users, label: formattedCount ? `${formattedCount} ${t("hero.badge.participants")}` : t("hero.badge.community") },
                  { icon: Star, label: rt("hero.badge.prizes", "Prémios Reais") },
                  { icon: Volume2, label: rt("hero.badge.interactive", "Interactivo") },
                ].map((badge, i) => (
                  <motion.span
                    key={badge.label}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 1.1 + i * 0.07, duration: 0.4 }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full badge-premium text-[11px] md:text-xs text-muted-foreground font-medium hover-lift"
                  >
                    <badge.icon className="h-3.5 w-3.5" style={{ color: RP }} />
                    {badge.label}
                  </motion.span>
                ))}
              </motion.div>
            </div>

            <div className="lg:col-span-5 flex justify-center lg:justify-end">
              <motion.div
                variants={fadeLeft}
                style={{ rotateX: smoothTX, rotateY: smoothTY, transformStyle: "preserve-3d", perspective: 1600 }}
                className="relative w-full max-w-[420px]"
              >
                <div className="relative overflow-hidden rounded-[2rem] glass-strong shadow-elegant">
                  <div
                    className="pointer-events-none absolute inset-0 rounded-[2rem] opacity-70"
                    style={{
                      background: `linear-gradient(135deg, color-mix(in srgb, ${RP} 50%, transparent), transparent 30%, transparent 70%, color-mix(in srgb, ${RS} 50%, transparent))`,
                      maskImage: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
                      WebkitMaskImage: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
                      maskComposite: "exclude",
                      WebkitMaskComposite: "xor",
                      padding: "1.5px",
                    }}
                    aria-hidden
                  />

                  <div className="absolute inset-x-0 top-0 h-[2px] opacity-90" aria-hidden>
                    <div className="h-full w-full border-flow rounded-t-[2rem]" />
                  </div>

                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-x-0 top-0 h-1/4 opacity-40"
                    style={{ background: `linear-gradient(180deg, color-mix(in srgb, ${RP} 10%, transparent) 0%, transparent 100%)` }}
                  />

                  <div className="relative p-6 md:p-8">
                    <AnimatePresence mode="wait">
                      {countdownEnabled && featuredRaffle && featuredRaffle.end_date ? (
                        <motion.div
                          key="featured"
                          initial={{ opacity: 0, y: 16 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                          className="flex flex-col items-center text-center"
                        >
                          <div className="absolute -top-10 left-1/2 -translate-x-1/2 h-28 w-28 rounded-full blur-[60px] pointer-events-none"
                            style={{ background: `color-mix(in srgb, ${RS} 35%, transparent)` }}
                            aria-hidden
                          />

                          {featuredRaffle.image_url ? (
                            <div className="relative mb-5 w-full h-40 rounded-2xl overflow-hidden premium-card">
                              <img src={featuredRaffle.image_url} alt={featuredRaffle.prize_title} className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                            </div>
                          ) : (
                            <div className="relative mb-5 w-full h-32 rounded-2xl overflow-hidden animate-gradient-shift" style={{ background: accentGrad }}>
                              <div className="absolute inset-0 flex items-center justify-center">
                                <Trophy className="h-16 w-16 text-white/80" />
                              </div>
                            </div>
                          )}

                          <div className="flex items-center gap-2 mb-2">
                            <Crown className="h-4 w-4" style={{ color: RS }} />
                            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: RP }}>
                              Sorteio Destaque
                            </span>
                          </div>

                          <h3 className="text-lg font-bold font-display text-foreground mb-1">
                            {featuredRaffle.title}
                          </h3>

                          <p className="text-base font-extrabold mb-1" style={{ color: RS }}>
                            {featuredRaffle.prize_title}
                          </p>

                          {featuredRaffle.ticket_price != null && (
                            <p className="text-xs text-muted-foreground mb-4">
                              Bilhete: <span className="font-bold text-foreground">{format(Number(featuredRaffle.ticket_price))}</span>
                            </p>
                          )}

                          {featuredRaffle.total_tickets && featuredRaffle.sold_tickets != null && (
                            <div className="w-full mb-4">
                              <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                                <span>{featuredRaffle.sold_tickets} vendidos</span>
                                <span>{featuredRaffle.total_tickets} total</span>
                              </div>
                              <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                                <motion.div
                                  className="h-full rounded-full"
                                  style={{ background: accentGrad }}
                                  initial={{ width: 0 }}
                                  animate={{ width: `${Math.min(100, (featuredRaffle.sold_tickets / featuredRaffle.total_tickets) * 100)}%` }}
                                  transition={{ delay: 0.8, duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                                />
                              </div>
                            </div>
                          )}

                          <CountdownTimer targetDate={new Date(featuredRaffle.end_date)} />

                          <Link
                            to={`/rifas/${featuredRaffle.id}`}
                            className="mt-4 btn-premium group inline-flex items-center gap-2 rounded-2xl px-6 py-3 text-sm font-bold text-primary-foreground glow-primary"
                          >
                            Participar agora
                            <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
                          </Link>
                        </motion.div>
                      ) : (
                        <motion.div
                          key="default"
                          initial={{ opacity: 0, y: 16 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                          className="flex flex-col items-center text-center"
                        >
                          <div className="relative mb-5 w-full h-44 rounded-2xl overflow-hidden card-3d">
                            <img src={heroPrize} alt="Prémios Bateu" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                            <div className="absolute top-3 right-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full glass-strong text-[10px] font-bold uppercase tracking-wider">
                              <Flame className="h-3 w-3 text-accent" />
                              <span style={{ color: RS }}>Em destaque</span>
                            </div>
                            <div className="absolute bottom-3 left-3 right-3">
                              <p className="text-white font-bold font-display text-sm">Sorteios Épicos</p>
                              <p className="text-white/70 text-xs">Telefones, viagens e mais</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-4 gap-2 w-full mb-5">
                            {[
                              { icon: Trophy, label: "Sorteios", to: "/marketplace", grad: RP },
                              { icon: Gamepad2, label: "50+ Jogos", to: "/jogos", grad: RS },
                              { icon: Radio, label: "Ao Vivo", to: "/lives", grad: RG },
                              { icon: Gift, label: "Prémios", to: "/marketplace", grad: RP },
                            ].map((item) => (
                              <Link
                                key={item.label}
                                to={item.to}
                                className="group flex flex-col items-center gap-1.5 py-3 rounded-2xl glass-subtle hover-lift transition-all duration-300"
                              >
                                <div
                                  className="flex items-center justify-center h-8 w-8 rounded-xl transition-all duration-300 group-hover:scale-110"
                                  style={{ background: `color-mix(in srgb, ${item.grad} 15%, transparent)` }}
                                >
                                  <item.icon className="h-3.5 w-3.5" style={{ color: item.grad }} />
                                </div>
                                <span className="text-[10px] font-semibold text-muted-foreground group-hover:text-foreground transition-colors leading-tight">{item.label}</span>
                              </Link>
                            ))}
                          </div>

                          <div className="w-full py-3 px-4 rounded-2xl glass-subtle">
                            <div className="flex items-center gap-2 mb-2.5">
                              <div className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                              </div>
                              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Atividade ao vivo</span>
                            </div>
                            <div className="space-y-2">
                              {activityFeed.slice(0, 4).map((act, i) => (
                                <motion.div
                                  key={act.text}
                                  initial={{ opacity: 0, x: 12 }}
                                  whileInView={{ opacity: 1, x: 0 }}
                                  viewport={{ once: true }}
                                  transition={{ delay: 1.4 + i * 0.1, duration: 0.4 }}
                                  className="flex items-center gap-2.5"
                                >
                                  <act.icon className="h-3.5 w-3.5 shrink-0" style={{ color: RP, opacity: 0.6 }} />
                                  <span className="text-xs text-foreground/80 font-medium flex-1 truncate">{act.text}</span>
                                  <span className="text-[10px] text-muted-foreground/50 shrink-0">{act.time}</span>
                                </motion.div>
                              ))}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                <motion.div
                  className="absolute -top-4 -right-4 h-12 w-12 rounded-2xl glass-subtle flex items-center justify-center shadow-elegant z-10"
                  animate={{ y: [0, -8, 0], rotate: [0, 5, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                >
                  <Sparkles className="h-5 w-5" style={{ color: RS }} />
                </motion.div>

                <motion.div
                  className="absolute -bottom-3 -left-3 h-10 w-10 rounded-xl glass-subtle flex items-center justify-center shadow-elegant z-10"
                  animate={{ y: [0, 6, 0], rotate: [0, -3, 0] }}
                  transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                >
                  <Gift className="h-4 w-4" style={{ color: RP }} />
                </motion.div>

                <motion.div
                  className="absolute top-1/2 -left-6 -translate-y-1/2 h-8 w-8 rounded-xl glass-subtle flex items-center justify-center shadow-elegant z-10"
                  animate={{ y: [0, -10, 0], rotate: [0, -8, 0] }}
                  transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 2 }}
                >
                  <Heart className="h-3.5 w-3.5" style={{ color: RS }} />
                </motion.div>

                <div
                  className="absolute -inset-10 -z-10 rounded-[3rem] blur-[70px] pointer-events-none opacity-30"
                  style={{ background: `linear-gradient(135deg, color-mix(in srgb, ${RP} 40%, transparent), color-mix(in srgb, ${RS} 30%, transparent))` }}
                  aria-hidden
                />
              </motion.div>
            </div>
          </div>

          <motion.div
            variants={fadeUp}
            className="mt-14 lg:mt-16 flex flex-wrap items-center justify-center gap-3 md:gap-4 max-w-3xl mx-auto"
          >
            <StatPill icon={Users} value={participantCount} label={t("hero.badge.participants")} suffix="+" delay={0.9} />
            <StatPill icon={Radio} value={liveCount} label="Lives activas" delay={1.0} />
            <StatPill icon={Trophy} value={raffleCount} label="Sorteios activos" delay={1.05} />
            <StatPill icon={TrendingUp} value={null} label={rt("hero.badge.weekly", t("hero.badge.weekly"))} delay={1.1} />
          </motion.div>

          <motion.div
            variants={fadeUp}
            className="mt-8 flex items-center justify-center gap-2.5"
          >
            <img src={bateuLogo} alt="Bateu" className="h-5 w-5 rounded-md opacity-60 animate-glow-pulse" />
            <span className="font-display text-xs font-bold tracking-tight opacity-40" style={{ color: "var(--region-primary, hsl(var(--foreground)))" }}>
              Bateu
            </span>
            <span className="text-[10px] text-muted-foreground opacity-30">·</span>
            <span className="text-[10px] text-muted-foreground opacity-40 font-medium">
              {rt("hero.badge.live", "Jogos ao Vivo Agora")}
            </span>
          </motion.div>

>>>>>>> 3af2551 (feat: overlay pro, stats dashboard, company public profile, branding persistence)
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="flex flex-wrap items-center justify-center gap-4 lg:justify-start"
          >
            {TRUST_ITEMS.map((item, i) => (
              <motion.span
                key={item.key}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.65 + i * 0.08 }}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-white/40"
              >
                <item.icon className="h-3.5 w-3.5 text-white/30" />
                {rt(item.key, item.fallback)}
              </motion.span>
            ))}
            {participantCount > 0 && (
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.85 }}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-white/40"
              >
                <Users className="h-3.5 w-3.5 text-white/30" />
                +{participantCount.toLocaleString()} {t("hero.badge.participants")}
              </motion.span>
            )}
          </motion.div>
        </div>

        {/* Right column - Stats grid + countdown */}
        <div className="mt-12 flex w-full max-w-md flex-col items-center gap-5 lg:mt-0 lg:max-w-sm xl:max-w-md">
          {/* Stats grid */}
          <div className="grid w-full grid-cols-2 gap-3">
            {STATS_CONFIG.map((stat, i) => (
              <StatCard
                key={stat.key}
                icon={stat.icon}
                value={statValues[stat.key]}
                suffix={stat.suffix}
                label={rt(`hero.stat.${stat.key}`, stat.label)}
                index={i}
              />
            ))}
          </div>

          {/* Featured raffle countdown card */}
          <AnimatePresence>
            {countdownEnabled && featuredRaffle && featuredRaffle.end_date && (
              <motion.div
                initial={{ opacity: 0, scale: 0.92, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, y: 20 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="w-full overflow-hidden rounded-2xl border border-amber-500/[0.15] bg-amber-500/[0.04] backdrop-blur-xl"
              >
                <div className="p-5">
                  <div className="mb-4 flex items-center gap-2">
                    <motion.div
                      animate={{ rotate: [0, 360] }}
                      transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                    >
                      <Trophy className="h-5 w-5 text-amber-400" />
                    </motion.div>
                    <span className="text-sm font-semibold text-amber-300">{featuredRaffle.title}</span>
                    <span className="text-white/20">·</span>
                    <span className="text-sm font-medium text-amber-200/60">{featuredRaffle.prize_title}</span>
                  </div>
                  <CountdownTimer targetDate={new Date(featuredRaffle.end_date)} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Glass showcase card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.0, ease: [0.22, 1, 0.36, 1] }}
            className="w-full rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5 backdrop-blur-xl"
          >
            <div className="mb-3 flex items-center gap-2">
              <Gamepad2 className="h-5 w-5 text-emerald-400" />
              <span className="text-sm font-semibold text-white/80">
                {rt("hero.live.title", "Entretenimento ao Vivo")}
              </span>
            </div>
            <p className="mb-4 text-xs leading-relaxed text-white/40">
              {rt(
                "hero.live.desc",
                "Jogos interactivos, sorteios em directo e experiências únicas — tudo ao vivo, em tempo real, para toda a comunidade."
              )}
            </p>
            <div className="flex gap-2">
              {["Quiz", "Roleta", "Bingo"].map((game, i) => (
                <motion.span
                  key={game}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1.3 + i * 0.1 }}
                  className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-[11px] font-medium text-white/50"
                >
                  {game}
                </motion.span>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

<<<<<<< HEAD
      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32" style={{ background: "linear-gradient(to top, hsl(220 40% 6%), transparent)" }} />
=======
      <WinnersMarquee winners={recentWinners} />

      <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-background via-background/80 to-transparent pointer-events-none z-30" />
>>>>>>> 3af2551 (feat: overlay pro, stats dashboard, company public profile, branding persistence)
    </section>
  );
};

export default HeroSection;
