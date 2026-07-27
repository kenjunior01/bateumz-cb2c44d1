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
    <section className="relative min-h-[90vh] overflow-hidden">
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
      <div
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          backgroundSize: "128px 128px",
        }}
      />

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

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32" style={{ background: "linear-gradient(to top, hsl(220 40% 6%), transparent)" }} />
    </section>
  );
};

export default HeroSection;
