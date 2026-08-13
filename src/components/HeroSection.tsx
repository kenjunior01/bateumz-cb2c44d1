import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
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
  Dice1,
  Dice2,
  Dice3,
  Target,
  Star,
  Flame,
  Crown,
  Diamond,
} from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useRegionalTheme } from "@/contexts/RegionalThemeContext";
import CountdownTimer from "./CountdownTimer";
import GlowOrb from "@/components/ui/GlowOrb";
import ParticleField from "@/components/ui/ParticleField";
import TypingText from "@/components/ui/TypingText";

const SPRING_BOUNCE = { type: "spring" as const, stiffness: 300, damping: 20 };
const SPRING_GENTLE = { type: "spring" as const, stiffness: 200, damping: 25 };
const SPRING_SNAP = { type: "spring" as const, stiffness: 400, damping: 15 };

const STATS_KEYS = ["participants", "prizes", "games", "countries"] as const;
const STATS_CONFIG = [
  { key: "participants", icon: Users, suffix: "+", label: "Participants" },
  { key: "prizes", icon: Gift, suffix: "+", label: "Prizes Delivered" },
  { key: "games", icon: Gamepad2, suffix: "+", label: "Live Games" },
  { key: "countries", icon: Globe, suffix: "", label: "Countries" },
];

const TRUST_ITEMS = [
  { icon: Shield, key: "hero.badge.verification", fallback: "Verificação Pública" },
  { icon: Clock, key: "hero.badge.weekly", fallback: "Novo toda semana" },
  { icon: Tv, key: "hero.badge.live", fallback: "Ao Vivo" },
];

const ORB_CONFIG = [
  { size: 380, x: "5%", y: "10%", color: "var(--region-primary, hsl(220 70% 18%))", opacity: 0.18, duration: 20 },
  { size: 300, x: "70%", y: "5%", color: "var(--region-secondary, hsl(352 73% 50%))", opacity: 0.14, duration: 25 },
  { size: 240, x: "45%", y: "55%", color: "var(--region-primary, hsl(220 70% 18%))", opacity: 0.10, duration: 18 },
  { size: 180, x: "85%", y: "50%", color: "var(--region-secondary, hsl(352 73% 50%))", opacity: 0.08, duration: 22 },
  { size: 140, x: "15%", y: "65%", color: "var(--region-primary, hsl(220 60% 30%))", opacity: 0.09, duration: 28 },
  { size: 100, x: "60%", y: "80%", color: "var(--region-secondary, hsl(352 60% 40%))", opacity: 0.06, duration: 16 },
];

const FLOATING_ICONS = [
  { icon: Dice1, x: "8%", y: "20%", size: 28, duration: 14, delay: 0 },
  { icon: Dice2, x: "88%", y: "15%", size: 24, duration: 18, delay: 2 },
  { icon: Dice3, x: "75%", y: "70%", size: 22, duration: 16, delay: 4 },
  { icon: Trophy, x: "12%", y: "75%", size: 30, duration: 20, delay: 1 },
  { icon: Target, x: "92%", y: "45%", size: 20, duration: 15, delay: 3 },
  { icon: Star, x: "30%", y: "8%", size: 18, duration: 12, delay: 5 },
  { icon: Flame, x: "55%", y: "85%", size: 26, duration: 22, delay: 2.5 },
  { icon: Crown, x: "82%", y: "82%", size: 22, duration: 19, delay: 1.5 },
  { icon: Diamond, x: "42%", y: "12%", size: 16, duration: 17, delay: 4.5 },
  { icon: Gamepad2, x: "18%", y: "42%", size: 24, duration: 21, delay: 3.5 },
];

const GAMING_STICKERS = [
  { emoji: "\uD83C\uDFB0", x: "4%", y: "35%", size: 36, duration: 5, delay: 0, label: "JACKPOT" },
  { emoji: "\uD83D\uDD25", x: "92%", y: "60%", size: 32, duration: 4.5, delay: 1.2, label: "HOT" },
  { emoji: "\u2B50", x: "85%", y: "8%", size: 30, duration: 5.5, delay: 0.6, label: "TOP" },
  { emoji: "\uD83C\uDFC6", x: "2%", y: "88%", size: 34, duration: 6, delay: 2, label: "WIN" },
  { emoji: "\uD83D\uDC8E", x: "50%", y: "4%", size: 28, duration: 4, delay: 0.3, label: "RICH" },
];

const PARTICLE_COUNT = 40;
const PARTICLES = Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  y: Math.random() * 100,
  size: Math.random() * 3 + 1,
  duration: Math.random() * 8 + 10,
  delay: Math.random() * 6,
  drift: (Math.random() - 0.5) * 40,
  rise: (Math.random() - 0.5) * 30,
}));

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

function useRotatingText(words: string[], intervalMs: number = 2500) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      setIndex((prev) => (prev + 1) % words.length);
    }, intervalMs);
    return () => clearInterval(id);
  }, [words.length, intervalMs]);
  return words[index];
}

interface FeaturedRaffle {
  id: string;
  title: string;
  prize_title: string;
  end_date: string | null;
}

function Particle({ p }: { p: typeof PARTICLES[number] }) {
  return (
    <motion.div
      className="pointer-events-none absolute rounded-full"
      style={{
        width: p.size,
        height: p.size,
        left: `${p.x}%`,
        top: `${p.y}%`,
        background: "radial-gradient(circle, rgba(255,255,255,0.6), rgba(255,255,255,0.1))",
        boxShadow: "0 0 6px rgba(255,255,255,0.2)",
      }}
      animate={{
        y: [0, p.rise, -p.rise * 0.5, 0],
        x: [0, p.drift * 0.5, -p.drift * 0.3, 0],
        opacity: [0, 0.6, 0.3, 0],
        scale: [0, 1, 0.8, 0],
      }}
      transition={{
        duration: p.duration,
        repeat: Infinity,
        ease: "easeInOut",
        delay: p.delay,
      }}
    />
  );
}

function FloatingGameIcon({ icon: Icon, x, y, size, duration, delay }: { icon: typeof Dice1; x: string; y: string; size: number; duration: number; delay: number }) {
  return (
    <motion.div
      className="pointer-events-none absolute"
      style={{ left: x, top: y, opacity: 0.08 }}
      animate={{
        y: [0, -20, 15, -10, 0],
        x: [0, 12, -8, 5, 0],
        rotate: [0, 15, -10, 20, 0],
        opacity: [0.06, 0.12, 0.08, 0.14, 0.06],
      }}
      transition={{
        duration,
        repeat: Infinity,
        ease: "easeInOut",
        delay,
      }}
    >
      <Icon className="text-white" style={{ width: size, height: size }} />
    </motion.div>
  );
}

function GamingSticker({ emoji, x, y, size, duration, delay, label }: { emoji: string; x: string; y: string; size: number; duration: number; delay: number; label: string }) {
  return (
    <motion.div
      className="pointer-events-none absolute flex flex-col items-center gap-1"
      style={{ left: x, top: y }}
      animate={{
        y: [0, -8, 4, -12, 0],
        rotate: [0, 6, -4, 8, 0],
        scale: [1, 1.05, 0.97, 1.08, 1],
      }}
      transition={{
        duration,
        repeat: Infinity,
        ease: "easeInOut",
        delay,
      }}
      initial={{ opacity: 0, scale: 0 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
    >
      <motion.div
        className="relative flex items-center justify-center rounded-xl border border-white/[0.1] bg-white/[0.06] px-2.5 py-1.5 backdrop-blur-md"
        style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)" }}
        whileHover={{ scale: 1.15, rotate: 5 }}
      >
        <span className="block" style={{ fontSize: size * 0.6, lineHeight: 1 }}>{emoji}</span>
        <span className="ml-1.5 text-[9px] font-black uppercase tracking-widest text-white/50">{label}</span>
        <motion.div
          className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-amber-400"
          animate={{ opacity: [1, 0.3, 1], scale: [1, 0.6, 1] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: delay + 0.5 }}
        />
      </motion.div>
    </motion.div>
  );
}

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
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40, scale: 0.85 }}
      animate={isInView ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 40, scale: 0.85 }}
      transition={{ ...SPRING_BOUNCE, delay: 0.9 + index * 0.15 }}
      className="group relative flex flex-col items-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.04] p-4 backdrop-blur-xl transition-all duration-300 hover:border-white/[0.18] hover:bg-white/[0.08]"
    >
      <motion.div
        className="flex h-11 w-11 items-center justify-center rounded-xl"
        style={{
          background: "linear-gradient(135deg, var(--region-primary, hsl(220 70% 18%)), var(--region-secondary, hsl(352 73% 50%)))",
        }}
        whileHover={{ scale: 1.15, rotate: 10 }}
        transition={SPRING_SNAP}
      >
        <Icon className="h-5 w-5 text-white" />
      </motion.div>
      <div className="text-center">
        <motion.span
          className="block font-display text-2xl font-bold tracking-tight text-white"
          initial={{ scale: 0.5 }}
          animate={isInView ? { scale: 1 } : { scale: 0.5 }}
          transition={{ ...SPRING_SNAP, delay: 1.2 + index * 0.15 }}
        >
          {value.toLocaleString()}
          {suffix}
        </motion.span>
        <span className="block text-[11px] font-medium uppercase tracking-wider text-white/50">
          {label}
        </span>
      </div>
      <motion.div
        className="pointer-events-none absolute inset-0 rounded-2xl"
        style={{
          background: "radial-gradient(ellipse at center, rgba(255,255,255,0.04) 0%, transparent 70%)",
        }}
        initial={{ opacity: 0 }}
        whileHover={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      />
    </motion.div>
  );
}

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
        opacity: [opacity * 0.4, opacity, opacity * 0.6, opacity * 0.9, opacity * 0.5, opacity],
        scale: [0.5, 1.1, 0.9, 1.05, 0.85, 1],
        x: [0, 20, -15, 25, -10, 0],
        y: [0, -25, 15, -10, 20, 0],
      }}
      transition={{
        duration,
        repeat: Infinity,
        ease: "easeInOut",
        delay: index * 0.6,
      }}
      className="pointer-events-none absolute rounded-full"
      style={{
        width: size,
        height: size,
        left: x,
        top: y,
        background: `radial-gradient(circle at 30% 30%, ${color}, transparent 70%)`,
        filter: "blur(70px)",
      }}
    />
  );
}

function GlowingButton({ to, children, primary, delay }: { to: string; children: React.ReactNode; primary: boolean; delay: number }) {
  const [hovered, setHovered] = useState(false);

  if (primary) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ ...SPRING_BOUNCE, delay }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="relative"
      >
        <motion.div
          className="absolute -inset-1 rounded-2xl opacity-60 blur-xl"
          style={{
            background: "linear-gradient(135deg, var(--region-primary, hsl(220 70% 18%)), var(--region-secondary, hsl(352 73% 50%)))",
          }}
          animate={{
            opacity: hovered ? [0.4, 0.7, 0.4] : 0.3,
            scale: hovered ? [1, 1.05, 1] : 1,
          }}
          transition={{ duration: 2, repeat: hovered ? Infinity : 0, ease: "easeInOut" }}
        />
        <Link
          to={to}
          className="group relative inline-flex items-center gap-2 overflow-hidden rounded-2xl px-8 py-4 text-sm font-bold text-white shadow-2xl transition-all duration-300 hover:scale-[1.04] sm:text-base"
          style={{
            background: "linear-gradient(135deg, var(--region-primary, hsl(220 70% 18%)), var(--region-secondary, hsl(352 73% 50%)))",
            boxShadow: "0 8px 40px -8px rgba(220,70%,18%,0.6), inset 0 1px 0 rgba(255,255,255,0.2)",
          }}
        >
          <span className="relative z-10 flex items-center gap-2">{children}</span>
          <motion.div
            className="absolute inset-0"
            style={{
              background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.25) 50%, transparent 100%)",
              backgroundSize: "200% 100%",
            }}
            animate={{ backgroundPosition: hovered ? ["-200% 0", "200% 0"] : "0% 0" }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
          />
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ ...SPRING_BOUNCE, delay: delay + 0.1 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative"
    >
      <motion.div
        className="absolute -inset-px rounded-2xl opacity-0 blur-sm"
        style={{
          background: "linear-gradient(135deg, var(--region-primary, hsl(220 70% 18%)), var(--region-secondary, hsl(352 73% 50%)))",
        }}
        animate={{ opacity: hovered ? 0.5 : 0 }}
        transition={{ duration: 0.3 }}
      />
      <Link
        to={to}
        className="group relative inline-flex items-center gap-2 rounded-2xl border border-white/[0.14] bg-white/[0.06] px-8 py-4 text-sm font-bold text-white/90 backdrop-blur-sm transition-all duration-300 hover:border-white/[0.3] hover:bg-white/[0.12] hover:scale-[1.04] sm:text-base"
      >
        {children}
      </Link>
    </motion.div>
  );
}

const HeroSection = () => {
  const { t } = useLanguage();
  const { rt } = useRegionalTheme();
  const [participantCount, setParticipantCount] = useState(0);
  const [featuredRaffle, setFeaturedRaffle] = useState<FeaturedRaffle | null>(null);
  const [countdownEnabled, setCountdownEnabled] = useState(false);
  const [mounted, setMounted] = useState(false);
  const rotatingWords = [t("hero.rotating.live"), t("hero.rotating.raffles"), t("hero.rotating.prizes"), t("hero.rotating.lives")];
  const rotatingWord = useRotatingText(rotatingWords, 2500);
  const sectionRef = useRef<HTMLElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const statsInView = useInView(statsRef, { once: true, margin: "-80px" });

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
    <section ref={sectionRef} className="relative min-h-[90vh] overflow-hidden bg-cosmic">
      {/* Enhanced GlowOrb behind hero title */}
      <div className="absolute top-[15%] left-[10%] md:left-[20%] z-[2]">
        <GlowOrb color="#00d4ff" secondaryColor="#7b2ff7" size={120} intensity={0.6} speed={6} pulseSpeed={2.5} />
      </div>
      {/* Interactive ParticleField background */}
      <ParticleField count={25} speed={0.2} colors={['#00d4ff', '#7b2ff7', '#a855f7', '#fbbf24', '#00d4ff']} connectionDistance={100} enableConnections={true} enableMouseRepel={true} />
      <div className="nebula-blob nebula-blob-1" />
      <div className="nebula-blob nebula-blob-2" />
      <div className="nebula-blob nebula-blob-3" />
      <div className="nebula-blob nebula-blob-4" />
      <div className="floating-stars"><span /><span /><span /><span /><span /><span /><span /><span /></div>
      <div className="ambient-glow" />

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

      <div
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          backgroundSize: "128px 128px",
        }}
      />

      {ORB_CONFIG.map((orb, i) => (
        <FloatingOrb key={i} size={orb.size} x={orb.x} y={orb.y} color={orb.color} opacity={orb.opacity} duration={orb.duration} index={i} />
      ))}

      {FLOATING_ICONS.map((fi, i) => (
        <FloatingGameIcon key={i} icon={fi.icon} x={fi.x} y={fi.y} size={fi.size} duration={fi.duration} delay={fi.delay} />
      ))}

      {GAMING_STICKERS.map((st, i) => (
        <GamingSticker key={st.label} emoji={st.emoji} x={st.x} y={st.y} size={st.size} duration={st.duration} delay={st.delay} label={st.label} />
      ))}

      {PARTICLES.map((p) => (
        <Particle key={p.id} p={p} />
      ))}

      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
        className="absolute top-0 left-0 right-0 h-px origin-center"
        style={{
          background: "linear-gradient(90deg, transparent, var(--region-primary, hsl(220 70% 18%)), var(--region-secondary, hsl(352 73% 50%)), var(--region-primary, hsl(220 70% 18%)), transparent)",
        }}
      />

      <motion.div
        className="absolute bottom-0 left-0 right-0 h-px origin-center"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 1.5, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
        style={{
          background: "linear-gradient(90deg, transparent, var(--region-secondary, hsl(352 73% 50%)), var(--region-primary, hsl(220 70% 18%)), var(--region-secondary, hsl(352 73% 50%)), transparent)",
          opacity: 0.4,
        }}
      />

      <div className="container relative z-10 mx-auto flex min-h-[90vh] max-w-7xl flex-col items-center px-4 pt-24 pb-12 sm:pt-28 md:pt-32 lg:flex-row lg:items-center lg:justify-between lg:gap-12 lg:pt-0">

        <div className="flex flex-1 flex-col items-center text-center lg:items-start lg:text-left">
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ ...SPRING_SNAP, delay: 0.05 }}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/[0.12] bg-white/[0.07] px-5 py-2 backdrop-blur-md"
          >
            <motion.span
              animate={{ rotate: [0, 20, -20, 0], scale: [1, 1.2, 1, 1.2] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            >
              <Sparkles className="h-4 w-4 text-amber-400" />
            </motion.span>
            <span className="text-xs font-semibold tracking-wide text-white/70">
              {rt("hero.pill", "Plataforma #1 de Entretenimento em Moçambique")}
            </span>
            <motion.div
              className="h-1.5 w-1.5 rounded-full bg-emerald-400"
              animate={{ opacity: [1, 0.4, 1], scale: [1, 0.7, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...SPRING_BOUNCE, delay: 0.15 }}
            className="mb-2 max-w-2xl font-display text-4xl font-bold leading-[1.1] tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl"
          >
            {rt("hero.title.prefix", t("hero.title.prefix"))}{" "}
          </motion.h1>

          <div className="relative mb-5 h-[1.15em] max-w-2xl">
            <AnimatePresence mode="wait">
              <motion.span
                key={rotatingWord}
                initial={{ y: 30, opacity: 0, rotateX: -90, filter: "blur(8px)" }}
                animate={{ y: 0, opacity: 1, rotateX: 0, filter: "blur(0px)" }}
                exit={{ y: -30, opacity: 0, rotateX: 90, filter: "blur(8px)" }}
                transition={{ ...SPRING_SNAP, duration: 0.5 }}
                className="absolute left-0 right-0 font-display text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl md:text-6xl lg:text-7xl"
                style={{
                  backgroundImage: "linear-gradient(135deg, var(--region-secondary, hsl(352 73% 50%)), #f59e0b, #fbbf24, var(--region-secondary, hsl(352 73% 50%)))",
                  backgroundSize: "300% 100%",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                {rotatingWord}
              </motion.span>
            </AnimatePresence>
            <motion.div
              className="absolute -bottom-1 left-0 h-[3px] rounded-full"
              style={{
                background: "linear-gradient(90deg, var(--region-secondary, hsl(352 73% 50%)), #f59e0b, var(--region-secondary, hsl(352 73% 50%)))",
                backgroundSize: "200% 100%",
              }}
              animate={{
                scaleX: [0, 1],
                backgroundPosition: ["0% 0%", "200% 0%"],
              }}
              transition={{
                scaleX: { ...SPRING_BOUNCE, delay: 0.5 },
                backgroundPosition: { duration: 3, repeat: Infinity, ease: "linear" },
              }}
            />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...SPRING_GENTLE, delay: 0.3 }}
            className="mb-9 max-w-lg text-base leading-relaxed text-white/60 sm:text-lg"
          >
            <TypingText
              texts={[
                rt("hero.subtitle", "Sorteios transparentes, jogos ao vivo e prémios reais. Junte-se a milhares de moçambicanos que já estão a ganhar."),
                "Jogue, concorra e ganhe prémios reais em tempo real.",
                "A plataforma de entretenimento mais popular de Moçambique.",
                "Batalhas ao vivo, quizzes e muito mais.",
              ]}
              typingSpeed={40}
              deleteSpeed={20}
              pauseDuration={3000}
              cursorColor="#fbbf24"
              className=""
            />
          </motion.div>

          <div className="mb-9 flex flex-col gap-4 sm:flex-row sm:gap-5">
            <GlowingButton to="/marketplace" primary delay={0.4}>
              {rt("hero.cta", t("hero.cta"))}
              <motion.span
                className="inline-block"
                animate={{ x: [0, 4, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
              >
                <ArrowRight className="h-5 w-5" />
              </motion.span>
            </GlowingButton>
            <GlowingButton to="/live-hub" primary={false} delay={0.4}>
              <Zap className="h-4 w-4 text-amber-400" />
              <span>{rt("hero.cta.live", "Ver ao Vivo")}</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </GlowingButton>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7, duration: 0.6 }}
            className="flex flex-wrap items-center justify-center gap-4 lg:justify-start"
          >
            {TRUST_ITEMS.map((item, i) => (
              <motion.div
                key={item.key}
                initial={{ opacity: 0, x: -15, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                transition={{ ...SPRING_GENTLE, delay: 0.75 + i * 0.1 }}
                whileHover={{ scale: 1.08, y: -2 }}
                className="inline-flex cursor-default items-center gap-2 rounded-full border border-white/[0.06] bg-white/[0.03] px-3.5 py-1.5 backdrop-blur-sm transition-colors duration-300 hover:border-white/[0.12] hover:bg-white/[0.06]"
              >
                <motion.div
                  animate={{ scale: [1, 1.15, 1] }}
                  transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
                >
                  <item.icon className="h-3.5 w-3.5 text-white/40" />
                </motion.div>
                <span className="text-xs font-medium text-white/50">{rt(item.key, item.fallback)}</span>
              </motion.div>
            ))}
            {participantCount > 0 && (
              <motion.div
                initial={{ opacity: 0, x: -15, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                transition={{ ...SPRING_GENTLE, delay: 1.05 }}
                whileHover={{ scale: 1.08, y: -2 }}
                className="inline-flex cursor-default items-center gap-2 rounded-full border border-white/[0.06] bg-white/[0.03] px-3.5 py-1.5 backdrop-blur-sm"
              >
                <motion.div
                  animate={{ scale: [1, 1.15, 1] }}
                  transition={{ duration: 2, repeat: Infinity, delay: 1 }}
                >
                  <Users className="h-3.5 w-3.5 text-white/40" />
                </motion.div>
                <span className="text-xs font-medium text-white/50">
                  +{participantCount.toLocaleString()} {t("hero.badge.participants")}
                </span>
              </motion.div>
            )}
          </motion.div>
        </div>

        <div ref={statsRef} className="mt-12 flex w-full max-w-md flex-col items-center gap-5 lg:mt-0 lg:max-w-sm xl:max-w-md">
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

          <AnimatePresence>
            {countdownEnabled && featuredRaffle && featuredRaffle.end_date && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 25 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 25 }}
                transition={{ ...SPRING_BOUNCE, delay: 0.2 }}
                className="w-full overflow-hidden rounded-2xl border border-amber-500/[0.18] bg-amber-500/[0.05] backdrop-blur-xl"
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

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={statsInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
            transition={{ ...SPRING_BOUNCE, delay: 1.2 }}
            className="w-full rounded-2xl border border-white/[0.08] bg-white/[0.04] p-5 backdrop-blur-xl"
          >
            <div className="mb-3 flex items-center gap-2">
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              >
                <Gamepad2 className="h-5 w-5 text-emerald-400" />
              </motion.div>
              <span className="text-sm font-semibold text-white/80">
                {rt("hero.live.title", "Entretenimento ao Vivo")}
              </span>
              <motion.div
                className="ml-auto h-2 w-2 rounded-full bg-emerald-400"
                animate={{ opacity: [1, 0.3, 1], boxShadow: ["0 0 4px rgba(52,211,153,0.6)", "0 0 8px rgba(52,211,153,0.8)", "0 0 4px rgba(52,211,153,0.6)"] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </div>
            <p className="mb-4 text-xs leading-relaxed text-white/40">
              {rt(
                "hero.live.desc",
                "Jogos interactivos, sorteios em directo e experiências únicas — tudo ao vivo, em tempo real, para toda a comunidade."
              )}
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                { name: "Quiz", color: "text-violet-400", border: "border-violet-400/20" },
                { name: "Roleta", color: "text-rose-400", border: "border-rose-400/20" },
                { name: "Bingo", color: "text-sky-400", border: "border-sky-400/20" },
              ].map((game, i) => (
                <motion.span
                  key={game.name}
                  initial={{ opacity: 0, scale: 0.7, y: 10 }}
                  animate={statsInView ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0, scale: 0.7, y: 10 }}
                  transition={{ ...SPRING_SNAP, delay: 1.5 + i * 0.12 }}
                  whileHover={{ scale: 1.1, y: -2 }}
                  className={`cursor-default rounded-lg border ${game.border} bg-white/[0.04] px-3 py-1.5 text-[11px] font-semibold ${game.color}`}
                >
                  {game.name}
                </motion.span>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      <div className="gaming-grid-overlay" />

      <div className="absolute bottom-0 left-0 right-0 h-32" style={{ background: "linear-gradient(to top, hsl(220 40% 6%), transparent)" }} />

      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.04] px-4 py-1.5 backdrop-blur-sm">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }}>
            <Diamond className="h-3 w-3 text-amber-400/60" />
          </motion.div>
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/30">Scroll to explore</span>
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }}>
            <Diamond className="h-3 w-3 text-amber-400/60" />
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
};

export default HeroSection;
