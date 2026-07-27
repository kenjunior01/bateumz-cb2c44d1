import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  motion,
  AnimatePresence,
  useInView,
  useMotionValue,
  useTransform,
  useSpring,
} from "framer-motion";
import {
  ArrowRight,
  Shield,
  Users,
  Clock,
  Trophy,
  Zap,
  Radio,
  Sparkles,
  Star,
  Gamepad2,
  Eye,
  TrendingUp,
  ChevronDown,
  Gift,
  Crown,
  Ticket,
  Flame,
  Heart,
  MessageCircle,
  Volume2,
  Play,
} from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useRegionalTheme } from "@/contexts/RegionalThemeContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import CountdownTimer from "./CountdownTimer";
import bateuLogo from "@/assets/bateu-logo.png";
import heroPrize from "@/assets/hero-prize.jpg";

interface FeaturedRaffle {
  id: string;
  title: string;
  prize_title: string;
  end_date: string | null;
  image_url?: string | null;
  ticket_price?: number;
  total_tickets?: number;
  sold_tickets?: number;
}

interface LiveWinner {
  display_name: string;
  prize_title: string;
  won_at: string;
}

/* ── Brand color tokens (with regional fallbacks) ──────────────────── */
const RP = "var(--region-primary, hsl(var(--primary)))";
const RS = "var(--region-secondary, hsl(var(--accent)))";
const RG = "var(--region-primary, hsl(var(--primary-glow)))";

/* ── Framer Motion Variants ────────────────────────────────────────── */
const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.15 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 36, filter: "blur(6px)" },
  visible: {
    opacity: 1, y: 0, filter: "blur(0px)",
    transition: { duration: 0.9, ease: [0.22, 1, 0.36, 1] },
  },
};

const fadeLeft = {
  hidden: { opacity: 0, x: 50, filter: "blur(4px)" },
  visible: {
    opacity: 1, x: 0, filter: "blur(0px)",
    transition: { duration: 0.9, ease: [0.22, 1, 0.36, 1] },
  },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1, scale: 1,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
};

/* ── Animated Counter ──────────────────────────────────────────────── */
const AnimatedCounter = ({ value, prefix = "", suffix = "" }: { value: number; prefix?: string; suffix?: string }) => {
  const [display, setDisplay] = useState(0);
  const springValue = useSpring(0, { stiffness: 35, damping: 20 });

  useEffect(() => { springValue.set(value); }, [value, springValue]);

  useEffect(() => {
    const unsubscribe = springValue.on("change", (v) => setDisplay(Math.round(v)));
    return unsubscribe;
  }, [springValue]);

  return <>{prefix}{display.toLocaleString("pt-MZ")}{suffix}</>;
};

/* ── Floating Particles ────────────────────────────────────────────── */
const PARTICLES = [
  { left: "5%", top: "12%", size: 3, color: RP, opacity: 0.3, dur: 4.5, xr: [0, 6] as const, yr: [0, -16] as const },
  { left: "10%", top: "68%", size: 4, color: RG, opacity: 0.15, dur: 6, xr: [0, -5] as const, yr: [0, -10] as const },
  { left: "90%", top: "15%", size: 2.5, color: RS, opacity: 0.25, dur: 3.8, xr: [0, 8] as const, yr: [0, -18] as const },
  { left: "84%", top: "70%", size: 3.5, color: RS, opacity: 0.18, dur: 5.5, xr: [0, -6] as const, yr: [0, -12] as const },
  { left: "48%", top: "6%", size: 2, color: RP, opacity: 0.2, dur: 5, xr: [0, 4] as const, yr: [0, -20] as const },
  { left: "32%", top: "82%", size: 3, color: RG, opacity: 0.12, dur: 4.2, xr: [0, -7] as const, yr: [0, -14] as const },
  { left: "67%", top: "88%", size: 2.5, color: RP, opacity: 0.2, dur: 5.8, xr: [0, 5] as const, yr: [0, -16] as const },
  { left: "75%", top: "40%", size: 2, color: RS, opacity: 0.22, dur: 4.8, xr: [0, -4] as const, yr: [0, -14] as const },
];

const FloatingParticles = () => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
    {PARTICLES.map((p, i) => (
      <motion.div
        key={i}
        className="absolute rounded-full"
        style={{ left: p.left, top: p.top, width: p.size, height: p.size, background: p.color, opacity: p.opacity }}
        animate={{ y: p.yr, x: p.xr }}
        transition={{ duration: p.dur, repeat: Infinity, repeatType: "reverse", ease: "easeInOut", delay: i * 0.5 }}
      />
    ))}
  </div>
);

/* ── Aurora Background ─────────────────────────────────────────────── */
const AuroraBackground = () => (
  <motion.div aria-hidden className="absolute inset-0 pointer-events-none overflow-hidden" style={{ opacity: 0.45 }}>
    <motion.div
      className="absolute -inset-x-1/2 -top-1/4 h-[70%] w-[200%] blur-[100px]"
      style={{
        background: `linear-gradient(115deg, transparent 0%, color-mix(in srgb, ${RP} 18%, transparent) 25%, transparent 40%, color-mix(in srgb, ${RS} 22%, transparent) 60%, transparent 75%, color-mix(in srgb, ${RG} 14%, transparent) 90%, transparent 100%)`,
        backgroundSize: "200% 100%",
      }}
      animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
      transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
    />
  </motion.div>
);

/* ── Rotating glow ring ────────────────────────────────────────────── */
const GlowRing = ({ className, delay = 0 }: { className?: string; delay?: number }) => (
  <motion.div
    className={`absolute rounded-full border pointer-events-none ${className || ""}`}
    style={{ borderColor: `color-mix(in srgb, ${RP} 5%, transparent)` }}
    animate={{ rotate: 360 }}
    transition={{ duration: 45 + delay * 15, repeat: Infinity, ease: "linear" }}
  >
    <motion.div
      className="absolute -top-1 left-1/2 h-2 w-2 rounded-full"
      style={{ background: RS, opacity: 0.25 }}
      animate={{ opacity: [0.25, 0.6, 0.25] }}
      transition={{ duration: 3.5, repeat: Infinity }}
    />
    <motion.div
      className="absolute -bottom-1 right-1/3 h-1.5 w-1.5 rounded-full"
      style={{ background: RP, opacity: 0.2 }}
      animate={{ opacity: [0.2, 0.5, 0.2] }}
      transition={{ duration: 4, repeat: Infinity, delay: 1 }}
    />
  </motion.div>
);

/* ── Stat pill for bottom ticker ───────────────────────────────────── */
const StatPill = ({ icon: Icon, value, label, prefix = "", suffix = "", delay = 0 }: { icon: any; value: number | null; label: string; prefix?: string; suffix?: string; delay?: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 16, scale: 0.95 }}
    whileInView={{ opacity: 1, y: 0, scale: 1 }}
    viewport={{ once: true }}
    transition={{ delay, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl glass-subtle hover-lift cursor-default"
  >
    <div className="flex items-center justify-center h-8 w-8 rounded-xl" style={{ background: `color-mix(in srgb, ${RP} 12%, transparent)` }}>
      <Icon className="h-4 w-4" style={{ color: RP }} />
    </div>
    <div className="flex flex-col">
      <span className="text-sm font-bold font-display tabular-nums leading-tight" style={{ color: RP }}>
        {value !== null ? <AnimatedCounter value={value} prefix={prefix} suffix={suffix} /> : "✓"}
      </span>
      <span className="text-[10px] text-muted-foreground font-medium leading-tight">{label}</span>
    </div>
  </motion.div>
);

/* ── Live winners marquee ──────────────────────────────────────────── */
const WinnersMarquee = ({ winners }: { winners: LiveWinner[] }) => {
  if (!winners.length) return null;
  const doubled = [...winners, ...winners, ...winners];
  return (
    <div className="absolute bottom-0 left-0 right-0 overflow-hidden pointer-events-none z-20">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 py-2">
          <div className="shrink-0 flex items-center gap-1.5 px-3 py-1 rounded-full glass-strong text-[10px] font-bold uppercase tracking-wider">
            <Trophy className="h-3 w-3 text-amber-500" />
            <span className="text-amber-500">Últimos</span>
          </div>
          <motion.div
            className="flex items-center gap-6 whitespace-nowrap"
            animate={{ x: [0, -1200] }}
            transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          >
            {doubled.map((w, i) => (
              <span key={i} className="inline-flex items-center gap-2 text-[11px] text-muted-foreground/70">
                <span className="font-semibold text-foreground/80">{w.display_name}</span>
                <span className="text-muted-foreground/40">·</span>
                <span style={{ color: RS }}>{w.prize_title}</span>
              </span>
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════════ */
/*  HERO SECTION                                                        */
/* ══════════════════════════════════════════════════════════════════════ */
const HeroSection = () => {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const { t, rt } = useLanguage();
  const { colors: _rc } = useRegionalTheme();
  const { format } = useCurrency();

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const [participantCount, setParticipantCount] = useState(0);
  const [liveCount, setLiveCount] = useState(0);
  const [raffleCount, setRaffleCount] = useState(0);
  const [totalPrizeValue, setTotalPrizeValue] = useState(0);
  const [featuredRaffle, setFeaturedRaffle] = useState<FeaturedRaffle | null>(null);
  const [countdownEnabled, setCountdownEnabled] = useState(false);
  const [recentWinners, setRecentWinners] = useState<LiveWinner[]>([]);
  const [activityFeed, setActivityFeed] = useState<{ icon: any; text: string; time: string }[]>([]);

  /* ── Data Fetching ──────────────────────────────────────────────── */
  useEffect(() => {
    const load = async () => {
      try {
        const [
          { count: pCount },
          { data: settings },
          { count: lgCount },
          { data: raffles },
          { data: winnerRows },
        ] = await Promise.all([
          supabase.from("participants").select("id", { count: "exact", head: true }),
          (supabase as any).from("platform_settings_public").select("key, value").eq("key", "featured").maybeSingle(),
          supabase.from("live_sessions").select("id", { count: "exact", head: true }).eq("status", "active"),
          supabase.from("raffles").select("id, title, prize_title, end_date, image_url, ticket_price, total_tickets, sold_tickets, prize_value").eq("status", "active").order("created_at", { ascending: false }).limit(100),
          (supabase as any).from("raffles").select("winner_user_id, prize_title, title, drawn_at").not("winner_user_id", "is", null").order("drawn_at", { ascending: false }).limit(12),
        ]);

        setParticipantCount(pCount || 0);
        setLiveCount(lgCount || 0);

        if (raffles?.length) {
          setRaffleCount(raffles.length);
          const sum = raffles.reduce((a, r) => a + Number((r as any).prize_value || 0), 0);
          setTotalPrizeValue(sum);

          // Build activity feed from real data
          const feed: { icon: any; text: string; time: string }[] = [];
          const topRaffles = raffles.slice(0, 3);
          topRaffles.forEach((r, i) => {
            if ((r as any).sold_tickets > 0) {
              feed.push({ icon: Ticket, text: `${r.sold_tickets} bilhetes em "${r.title.slice(0, 28)}"`, time: i === 0 ? "agora" : `${i * 3 + 1}m` });
            }
          });
          if (raffles[0]) feed.push({ icon: Gift, text: `Novo: ${raffles[0].prize_title}`, time: "5m" });
          if (winnerRows?.length) feed.push({ icon: Crown, text: "Vencedor anunciado", time: "8m" });
          setActivityFeed(feed.length ? feed : [
            { icon: Ticket, text: "Bilhetes comprados", time: "agora" },
            { icon: Gift, text: "Novo prémio adicionado", time: "2m" },
            { icon: Crown, text: "Vencedor anunciado", time: "5m" },
          ]);
        }

        // Recent winners for marquee
        if (winnerRows?.length) {
          const winnerIds = winnerRows.map((w: any) => w.winner_user_id).filter(Boolean);
          if (winnerIds.length) {
            const { data: profiles } = await supabase
              .from("profiles_public")
              .select("user_id, display_name")
              .in("user_id", winnerIds);
            const nameMap = new Map((profiles || []).map((p: any) => [p.user_id, p.display_name || "Anónimo"]));
            setRecentWinners(
              winnerRows.slice(0, 8).map((w: any) => ({
                display_name: nameMap.get(w.winner_user_id) || "Anónimo",
                prize_title: w.prize_title || w.title,
                won_at: w.drawn_at,
              }))
            );
          }
        }

        if (settings?.value) {
          const featured = settings.value as any;
          const isEnabled = featured.countdownEnabled === true;
          setCountdownEnabled(isEnabled);
          if (isEnabled && featured.raffleId) {
            const { data: raffle } = await supabase
              .from("raffles")
              .select("id, title, prize_title, end_date, image_url, ticket_price, total_tickets, sold_tickets")
              .eq("id", featured.raffleId)
              .eq("status", "active")
              .maybeSingle();
            if (raffle) setFeaturedRaffle(raffle);
          }
        }
      } catch {
        /* silent fail */
      }
    };
    load();
  }, []);

  /* ── Mouse parallax ─────────────────────────────────────────────── */
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    mouseX.set((e.clientX - rect.left) / rect.width - 0.5);
    mouseY.set((e.clientY - rect.top) / rect.height - 0.5);
  }, [mouseX, mouseY]);

  const farX = useTransform(mouseX, [-0.5, 0.5], [-12, 12]);
  const farY = useTransform(mouseY, [-0.5, 0.5], [-10, 10]);
  const midX = useTransform(mouseX, [-0.5, 0.5], [-22, 22]);
  const midY = useTransform(mouseY, [-0.5, 0.5], [-16, 16]);
  const nearX = useTransform(mouseX, [-0.5, 0.5], [16, -16]);
  const nearY = useTransform(mouseY, [-0.5, 0.5], [12, -12]);

  const tiltRX = useTransform(mouseY, [-0.5, 0.5], [5, -5]);
  const tiltRY = useTransform(mouseX, [-0.5, 0.5], [-5, 5]);
  const smoothTX = useSpring(tiltRX, { stiffness: 90, damping: 14 });
  const smoothTY = useSpring(tiltRY, { stiffness: 90, damping: 14 });

  const formattedCount = useMemo(
    () => (participantCount > 0 ? `+${participantCount.toLocaleString("pt-MZ")}` : ""),
    [participantCount]
  );

  const accentGrad = `linear-gradient(135deg, ${RP}, ${RS})`;
  const headlineGrad = `linear-gradient(120deg, color-mix(in srgb, ${RP} 95%, hsl(var(--foreground))), color-mix(in srgb, ${RS} 88%, hsl(var(--foreground))) 55%, color-mix(in srgb, ${RG} 92%, hsl(var(--foreground))))`;

  return (
    <section ref={ref} onMouseMove={handleMouseMove} className="relative overflow-hidden min-h-[94vh] md:min-h-[90vh] flex flex-col justify-center">
      {/* ══════════ Layered Atmospheric Background ══════════ */}
      <div className="absolute inset-0 mesh-gradient-animated" />
      <AuroraBackground />

      {/* Far parallax orb — primary */}
      <motion.div
        className="absolute -left-44 top-[8%] h-[28rem] w-[28rem] md:h-[34rem] md:w-[34rem] rounded-full blur-[170px] pointer-events-none"
        style={{ background: `color-mix(in srgb, ${RP} 20%, transparent)`, x: farX, y: farY }}
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Mid parallax orb — accent */}
      <motion.div
        className="absolute -right-36 top-[18%] h-80 w-80 md:h-96 md:w-96 rounded-full blur-[140px] pointer-events-none"
        style={{ background: `color-mix(in srgb, ${RS} 18%, transparent)`, x: midX, y: midY }}
        animate={{ scale: [1.08, 1, 1.08] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Bottom glow pool */}
      <motion.div
        className="absolute left-1/2 bottom-[-14%] h-60 w-[36rem] -translate-x-1/2 rounded-full blur-[130px] pointer-events-none"
        style={{ background: `color-mix(in srgb, ${RG} 16%, transparent)`, x: nearX, y: nearY }}
        animate={{ y: [0, -20, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Subtle grid pattern */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none opacity-[0.025] dark:opacity-[0.045]"
        style={{
          backgroundImage: `linear-gradient(to right, ${RP} 1px, transparent 1px), linear-gradient(to bottom, ${RP} 1px, transparent 1px)`,
          backgroundSize: "80px 80px",
          maskImage: "radial-gradient(ellipse at center, black 20%, transparent 65%)",
          WebkitMaskImage: "radial-gradient(ellipse at center, black 20%, transparent 65%)",
        }}
      />

      {/* Decorative glow rings */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <GlowRing className="w-[650px] h-[650px] left-[62%] top-[28%] -translate-x-1/2 -translate-y-1/2" delay={0} />
        <GlowRing className="w-[900px] h-[900px] left-[62%] top-[28%] -translate-x-1/2 -translate-y-1/2" delay={3} />
        <GlowRing className="w-[400px] h-[400px] left-[20%] top-[65%] -translate-x-1/2 -translate-y-1/2" delay={6} />
      </div>

      <FloatingParticles />

      {/* Floating logo watermark */}
      <motion.img
        src={bateuLogo} alt="" aria-hidden="true"
        className="absolute right-[-4%] top-1/2 -translate-y-1/2 w-52 md:w-72 lg:w-96 opacity-[0.02] dark:opacity-[0.035] pointer-events-none select-none"
        animate={{ y: [0, -14, 0], rotate: [0, 1.5, 0] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* ══════════ MAIN CONTENT ══════════ */}
      <div className="container relative z-10 mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          className="max-w-7xl mx-auto"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">

            {/* ──── LEFT COLUMN ──── */}
            <div className="lg:col-span-7 text-center lg:text-left">

              {/* Live badge + viewer count */}
              <motion.div variants={scaleIn} className="mb-6 flex items-center justify-center lg:justify-start gap-3 flex-wrap">
                <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full badge-premium text-xs font-semibold tracking-wide">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-accent" />
                  </span>
                  <span style={{ color: RP }}>{rt("hero.badge.live", "Jogos ao Vivo Agora")}</span>
                  <Radio className="h-3 w-3" style={{ color: RS }} />
                </span>

                {liveCount > 0 && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5, duration: 0.4 }}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full glass-subtle text-[11px] font-medium text-muted-foreground"
                  >
                    <Eye className="h-3 w-3 text-accent" />
                    <span className="pulse-live text-accent font-bold text-xs">{liveCount}</span>
                    <span>ao vivo</span>
                  </motion.span>
                )}

                {raffleCount > 0 && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.6, duration: 0.4 }}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full glass-subtle text-[11px] font-medium text-muted-foreground"
                  >
                    <Flame className="h-3 w-3" style={{ color: RS }} />
                    <span className="font-bold text-xs" style={{ color: RS }}>{raffleCount}</span>
                    <span>sorteios activos</span>
                  </motion.span>
                )}
              </motion.div>

              {/* Headline */}
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

              {/* Subtitle */}
              <motion.p
                variants={fadeUp}
                className="mx-auto lg:mx-0 mb-4 max-w-xl text-sm md:text-base lg:text-[1.1rem] text-muted-foreground leading-relaxed"
              >
                {rt("hero.subtitle", t("hero.subtitle"))}
              </motion.p>

              {/* Prize value highlight */}
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

              {/* CTA Buttons */}
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

              {/* Trust badges row */}
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

            {/* ──── RIGHT COLUMN: Premium Showcase Card ──── */}
            <div className="lg:col-span-5 flex justify-center lg:justify-end">
              <motion.div
                variants={fadeLeft}
                style={{ rotateX: smoothTX, rotateY: smoothTY, transformStyle: "preserve-3d", perspective: 1600 }}
                className="relative w-full max-w-[420px]"
              >
                {/* Showcase card */}
                <div className="relative overflow-hidden rounded-[2rem] glass-strong shadow-elegant">
                  {/* Animated gradient border frame */}
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

                  {/* Top shimmer bar */}
                  <div className="absolute inset-x-0 top-0 h-[2px] opacity-90" aria-hidden>
                    <div className="h-full w-full border-flow rounded-t-[2rem]" />
                  </div>

                  {/* Inner top highlight */}
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
                          {/* Trophy glow */}
                          <div className="absolute -top-10 left-1/2 -translate-x-1/2 h-28 w-28 rounded-full blur-[60px] pointer-events-none"
                            style={{ background: `color-mix(in srgb, ${RS} 35%, transparent)` }}
                            aria-hidden
                          />

                          {/* Prize image */}
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

                          {/* Progress bar */}
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
                          {/* Prize showcase image */}
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

                          {/* Quick action grid — 4 items now */}
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

                          {/* Live activity mini feed */}
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

                {/* Floating accent elements around card */}
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

                {/* Background glow behind card */}
                <div
                  className="absolute -inset-10 -z-10 rounded-[3rem] blur-[70px] pointer-events-none opacity-30"
                  style={{ background: `linear-gradient(135deg, color-mix(in srgb, ${RP} 40%, transparent), color-mix(in srgb, ${RS} 30%, transparent))` }}
                  aria-hidden
                />
              </motion.div>
            </div>
          </div>

          {/* ══════════ BOTTOM STATS BAR ══════════ */}
          <motion.div
            variants={fadeUp}
            className="mt-14 lg:mt-16 flex flex-wrap items-center justify-center gap-3 md:gap-4 max-w-3xl mx-auto"
          >
            <StatPill icon={Users} value={participantCount} label={t("hero.badge.participants")} suffix="+" delay={0.9} />
            <StatPill icon={Radio} value={liveCount} label="Lives activas" delay={1.0} />
            <StatPill icon={Trophy} value={raffleCount} label="Sorteios activos" delay={1.05} />
            <StatPill icon={TrendingUp} value={null} label={rt("hero.badge.weekly", t("hero.badge.weekly"))} delay={1.1} />
          </motion.div>

          {/* ══════════ BRAND SIGNATURE ══════════ */}
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

          {/* ══════════ SCROLL CUE ══════════ */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            transition={{ delay: 1.8, duration: 0.6 }}
            className="mt-6 flex flex-col items-center gap-1.5"
          >
            <motion.div
              animate={{ y: [0, 6, 0] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
              className="flex items-center justify-center h-7 w-7 rounded-full glass-subtle"
              aria-hidden
            >
              <ChevronDown className="h-3.5 w-3.5" style={{ color: RP }} />
            </motion.div>
            <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/60 font-medium">Descobrir</span>
          </motion.div>
        </motion.div>
      </div>

      {/* ══════════ WINNERS MARQUEE ══════════ */
      <WinnersMarquee winners={recentWinners} />

      {/* ══════════ BOTTOM FADE EDGE ══════════ */
      <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-background via-background/80 to-transparent pointer-events-none z-30" />
    </section>
  );
};

export default HeroSection;
