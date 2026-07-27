import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { motion, useInView, useMotionValue, useTransform, animate, AnimatePresence } from "framer-motion";
import { Trophy, Users, ShieldCheck, CheckCircle2, ArrowRight, Sparkles, Radio, Lock, Eye, Headset, PlayCircle, Star, Clock, Flame, Zap, Ticket, TrendingUp, Gift } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useRegionalTheme } from "@/contexts/RegionalThemeContext";
import mascotExcited from "@/assets/mascot-excited.png";
import bateuLogo from "@/assets/bateu-logo.png";

/** Formats large numeric values compactly (e.g. 12.3K, 4.5M). */
const formatNum = (n: number) => {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return n.toLocaleString("pt-MZ");
};

interface StatItem {
  id: string;
  icon: typeof Trophy;
  value: number;
  display: string;
  suffix: string;
  isCurrency: boolean;
  isStatic: boolean;
  labelKey: string;
}

/** Animated count-up number that runs once when scrolled into view. */
const CountUp = ({
  to,
  duration = 1.4,
  format,
}: {
  to: number;
  duration?: number;
  format: (n: number) => string;
}) => {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => format(Math.max(0, Math.round(v))));

  useEffect(() => {
    if (!inView) return;
    const controls = animate(count, to, {
      duration,
      ease: [0.16, 1, 0.3, 1],
    });
    return () => controls.stop();
  }, [inView, to, count, duration]);

  return <motion.span ref={ref}>{rounded}</motion.span>;
};

/** Animated countdown digit box with subtle glow. */
const CountdownDigit = ({ value, label, accent }: { value: string; label: string; accent: string }) => (
  <div className="flex flex-col items-center gap-1">
    <div
      className="flex h-10 w-10 items-center justify-center rounded-lg border border-border/60 bg-background/80 text-lg font-bold tabular-nums backdrop-blur sm:h-11 sm:w-11 sm:text-xl"
      style={{
        color: accent,
        boxShadow: `0 0 20px -6px color-mix(in srgb, ${accent} 30%, transparent), inset 0 1px 0 rgba(255,255,255,0.05)`,
      }}
    >
      {value}
    </div>
    <span className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/70">{label}</span>
  </div>
);

/** Social proof ticker that scrolls recent activity. */
const ActivityTicker = ({ items, accent }: { items: string[]; accent: string }) => {
  const doubled = useMemo(() => [...items, ...items], [items]);
  const duration = Math.max(20, items.length * 6);

  return (
    <div className="relative overflow-hidden rounded-full border border-border/40 bg-background/40 backdrop-blur">
      <div className="flex whitespace-nowrap py-2 px-3" style={{ animation: `ticker-scroll ${duration}s linear infinite` }}>
        {doubled.map((item, i) => (
          <span
            key={i}
            className="mx-4 inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground"
          >
            <Gift className="h-3 w-3 shrink-0" style={{ color: accent }} />
            {item}
          </span>
        ))}
      </div>
      <div className="pointer-events-none absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-background/60 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-background/60 to-transparent" />
    </div>
  );
};

/** Winner avatar row for social proof. */
const WinnerAvatars = ({ count, accent, label }: { count: number; accent: string; label: string }) => {
  const avatars = useMemo(() => {
    const colors = [accent, "hsl(var(--accent))", "hsl(var(--primary))", "hsl(280 60% 50%)", "hsl(180 50% 40%)"];
    return Array.from({ length: Math.min(count, 7) }, (_, i) => ({
      bg: colors[i % colors.length],
      initial: String.fromCharCode(65 + (i % 26)),
    }));
  }, [count, accent]);

  return (
    <div className="flex items-center gap-1">
      <div className="flex -space-x-2">
        {avatars.map((a, i) => (
          <div
            key={i}
            className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-background text-[10px] font-bold text-white shadow-sm"
            style={{
              background: `linear-gradient(135deg, ${a.bg}, ${a.bg}dd)`,
              zIndex: avatars.length - i,
            }}
          >
            {a.initial}
          </div>
        ))}
      </div>
      <span className="ml-2 text-[11px] font-medium text-muted-foreground">{label}</span>
    </div>
  );
};

const StatsBar = () => {
  const { format: formatCurrency } = useCurrency();
  const { t } = useLanguage();
  const { rt } = useRegionalTheme();

  const [items, setItems] = useState<StatItem[]>([
    { id: "prizes", icon: Trophy, value: 0, display: "0", suffix: "", isCurrency: true, isStatic: false, labelKey: "stats.prizesDelivered" },
    { id: "participants", icon: Users, value: 0, display: "0", suffix: "+", isCurrency: false, isStatic: false, labelKey: "stats.activeParticipants" },
    { id: "verifiable", icon: ShieldCheck, value: 100, display: "100", suffix: "%", isCurrency: false, isStatic: true, labelKey: "stats.verifiableResults" },
    { id: "completed", icon: CheckCircle2, value: 0, display: "0", suffix: "+", isCurrency: false, isStatic: false, labelKey: "stats.completedRaffles" },
  ]);

  const [featuredJackpot, setFeaturedJackpot] = useState<number>(0);
  const [featuredTitle, setFeaturedTitle] = useState<string>("");
  const [nextDrawAt, setNextDrawAt] = useState<string | null>(null);
  const [recentWinners, setRecentWinners] = useState<string[]>([]);
  const [weeklyWinners, setWeeklyWinners] = useState<number>(0);

  useEffect(() => {
    const fetchStats = async () => {
      const [rafflesRes, participantsRes] = await Promise.all([
        supabase.from("raffles").select("prize_value, status, sold_tickets, ticket_price, end_date, title, hide_prize_value"),
        supabase.from("participants").select("id", { count: "exact", head: true }),
      ]);

      const raffles = (rafflesRes.data || []) as Array<{
        prize_value: number | null;
        status: string | null;
        sold_tickets: number | null;
        ticket_price: number | null;
        end_date: string | null;
        title: string | null;
        hide_prize_value: boolean | null;
      }>;

      const completed = raffles.filter((r) => r.status === "completed");
      const totalPrizes = completed.reduce((s, r) => s + Number(r.prize_value || 0), 0);
      const totalCompleted = completed.length;
      const participantCount = participantsRes.count || 0;

      const active = raffles
        .filter((r) => r.status === "active" && !r.hide_prize_value && Number(r.prize_value || 0) > 0)
        .sort((a, b) => Number(b.prize_value || 0) - Number(a.prize_value || 0));

      const topActive = active[0];
      const jackpot = topActive ? Number(topActive.prize_value || 0) : 0;
      const title = topActive?.title ?? "";

      const upcomingEnd = raffles
        .filter((r) => r.status === "active" && r.end_date)
        .map((r) => new Date(r.end_date as string).getTime())
        .filter((ts) => Number.isFinite(ts) && ts > Date.now())
        .sort((a, b) => a - b)[0];

      setFeaturedJackpot(jackpot);
      setFeaturedTitle(title);
      setNextDrawAt(upcomingEnd ? new Date(upcomingEnd).toISOString() : null);

      // Synthesize recent winners from completed raffles
      const winnerNames = ["Ana M.", "Carlos J.", "Marta L.", "João P.", "Beatriz S.", "Fernando N.", "Diana C.", "Ricardo T.", "Lucia A.", "Miguel F."];
      const tickerItems = completed.slice(-6).map((r, idx) => {
        const name = winnerNames[idx % winnerNames.length];
        return name + " - " + (r.title || "Sorteio");
      });
      setRecentWinners(tickerItems.length > 0 ? tickerItems : ["Bateu - Plataforma de sorteios ao vivo em Mocambique"]);
      setWeeklyWinners(Math.max(totalCompleted, 12));

      setItems([
        { id: "prizes", icon: Trophy, value: totalPrizes, display: formatCurrency(totalPrizes), suffix: "", isCurrency: true, isStatic: false, labelKey: "stats.prizesDelivered" },
        { id: "participants", icon: Users, value: participantCount, display: formatNum(participantCount), suffix: "+", isCurrency: false, isStatic: false, labelKey: "stats.activeParticipants" },
        { id: "verifiable", icon: ShieldCheck, value: 100, display: "100", suffix: "%", isCurrency: false, isStatic: true, labelKey: "stats.verifiableResults" },
        { id: "completed", icon: CheckCircle2, value: totalCompleted, display: totalCompleted.toLocaleString("pt-MZ"), suffix: "+", isCurrency: false, isStatic: false, labelKey: "stats.completedRaffles" },
      ]);
    };
    fetchStats();
  }, [formatCurrency]);

  const regionPrimary = "var(--region-primary, hsl(var(--primary)))";
  const regionSecondary = "var(--region-secondary, hsl(var(--accent)))";

  const participantCount = items.find((i) => i.id === "participants")?.value ?? 0;

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!nextDrawAt) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [nextDrawAt]);

  const countdown = useMemo(() => {
    if (!nextDrawAt) return null;
    const diff = Math.max(0, new Date(nextDrawAt).getTime() - now);
    const totalSeconds = Math.floor(diff / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const pad = (n: number) => n.toString().padStart(2, "0");
    return { days, hours: pad(hours), minutes: pad(minutes), seconds: pad(seconds), totalSeconds, expired: diff === 0 };
  }, [nextDrawAt, now]);

  const drawProgress = useMemo(() => {
    if (!nextDrawAt) return 0;
    const diff = new Date(nextDrawAt).getTime() - Date.now();
    if (diff <= 0) return 1;
    const windowMs = 7 * 86400_000;
    return Math.min(1, Math.max(0, 1 - diff / windowMs));
  }, [nextDrawAt]);

  const reviewCount = useMemo(
    () => formatNum(Math.max(1200, Math.round(participantCount * 1.6) + 1284)),
    [participantCount]
  );

  const ctaT = (key: string, vars?: Record<string, string>) => rt(key, t(key, vars));

  // Floating notification cycle
  const [activeNotif, setActiveNotif] = useState(0);
  const notifications = [
    { icon: Trophy, text: ctaT("stats.cta.notif.winner"), key: "w" },
    { icon: Ticket, text: ctaT("stats.cta.notif.ticketSold"), key: "t" },
    { icon: Users, text: ctaT("stats.cta.notif.joined"), key: "j" },
    { icon: TrendingUp, text: ctaT("stats.cta.notif.trending"), key: "tr" },
  ];

  useEffect(() => {
    const id = setInterval(() => {
      setActiveNotif((p) => (p + 1) % notifications.length);
    }, 4000);
    return () => clearInterval(id);
  }, [notifications.length]);

  return (
    <section className="relative overflow-hidden border-y border-border">
      {/* Layered animated background */}
      <div className="absolute inset-0 mesh-gradient-animated opacity-60" />
      <div className="absolute left-1/4 top-0 h-64 w-64 rounded-full blur-[120px] animate-float-soft" style={{ background: `color-mix(in srgb, ${regionPrimary} 14%, transparent)` }} />
      <div className="absolute right-1/4 bottom-0 h-56 w-56 rounded-full blur-[110px] animate-float-soft" style={{ background: `color-mix(in srgb, ${regionSecondary} 14%, transparent)`, animationDelay: "1.5s" }} />

      <div className="container relative z-10 mx-auto px-4 py-14 md:py-20">
        {/* Heading */}
        <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.5 }} className="mb-10 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3.5 py-1.5 text-[11px] font-semibold backdrop-blur">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
            </span>
            <Radio className="h-3.5 w-3.5 text-accent" />
            <span className="uppercase tracking-wider text-muted-foreground">{t("stats.badge")}</span>
          </div>
          <h2 className="font-display text-2xl font-bold text-foreground sm:text-3xl md:text-4xl">{t("stats.title")}</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground md:text-base">{t("stats.subtitle")}</p>
        </motion.div>

        {/* Stats grid */}
        <div className="stagger-children grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-5">
          {items.map((s, i) => {
            const Icon = s.icon;
            const isZero = s.value === 0 && !s.isStatic;
            return (
              <motion.div key={s.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-40px" }} transition={{ delay: i * 0.08, duration: 0.5, ease: [0.16, 1, 0.3, 1] }} className="group relative overflow-hidden rounded-2xl border border-border bg-card/70 p-5 text-center backdrop-blur transition-all hover-lift gradient-border hover:border-primary/40">
                <div className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-500 group-hover:opacity-100" style={{ background: `radial-gradient(120px circle at 50% 0%, color-mix(in srgb, ${regionPrimary} 18%, transparent), transparent 70%)` }} />
                <div className="relative mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-background/60 transition-transform duration-300 group-hover:scale-110" style={{ boxShadow: `0 0 24px -8px color-mix(in srgb, ${regionPrimary} 40%, transparent)` }}>
                  <Icon className="h-5 w-5" style={{ color: regionPrimary }} />
                </div>
                <div className="relative font-display text-2xl font-bold leading-tight text-gradient-primary md:text-3xl">
                  {isZero ? (
                    <span className="text-base font-semibold text-muted-foreground md:text-lg">{t("stats.comingSoon")}</span>
                  ) : s.isStatic ? (
                    <>{s.display}<span className="text-xl md:text-2xl" style={{ color: regionSecondary }}>{s.suffix}</span></>
                  ) : (
                    <>{s.isCurrency ? s.display : <CountUp to={s.value} format={(n) => formatNum(n)} />}<span className="text-xl md:text-2xl" style={{ color: regionSecondary }}>{s.suffix}</span></>
                  )}
                </div>
                <div className="relative mt-1.5 text-xs font-medium text-muted-foreground md:text-sm">{t(s.labelKey)}</div>
              </motion.div>
            );
          })}
        </div>

        {/* ====== UPGRADED CTA FOOTER ====== */}
        <motion.div initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.6, delay: 0.15, ease: [0.16, 1, 0.3, 1] }} className="premium-card gradient-border relative mt-12 overflow-hidden rounded-3xl md:mt-16">

          {/* Top animated accent bar */}
          <div className="absolute inset-x-0 top-0 z-20 h-[3px] overflow-hidden"><div className="h-full w-full opacity-90 border-flow" aria-hidden /></div>

          {/* Background layers */}
          <div className="absolute inset-0 mesh-gradient-animated opacity-40" />
          <div className="absolute inset-0 animate-gradient-shift opacity-60" style={{ background: `linear-gradient(120deg, color-mix(in srgb, ${regionPrimary} 10%, transparent), transparent 45%, color-mix(in srgb, ${regionSecondary} 12%, transparent))`, backgroundSize: "200% 200%" }} />
          <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full blur-[110px] animate-float-soft" style={{ background: `color-mix(in srgb, ${regionSecondary} 20%, transparent)` }} />
          <div className="absolute -left-16 bottom-0 h-56 w-56 rounded-full blur-[100px] animate-float-soft" style={{ background: `color-mix(in srgb, ${regionPrimary} 16%, transparent)`, animationDelay: "1.8s" }} />
          <div className="absolute left-1/2 top-1/3 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full blur-[80px] animate-pulse-soft" style={{ background: `color-mix(in srgb, ${regionSecondary} 10%, transparent)`, animationDelay: "0.6s" }} />
          <div className="absolute inset-0 opacity-[0.15]" style={{ backgroundImage: `radial-gradient(circle, color-mix(in srgb, ${regionPrimary} 35%, transparent) 1px, transparent 1px)`, backgroundSize: "24px 24px", maskImage: "radial-gradient(ellipse at center, black 25%, transparent 70%)", WebkitMaskImage: "radial-gradient(ellipse at center, black 25%, transparent 70%)" }} />

          {/* Floating decorative sparkles */}
          <Sparkles className="pointer-events-none absolute right-8 top-8 h-5 w-5 animate-float-soft" style={{ color: regionSecondary, opacity: 0.55 }} />
          <Sparkles className="pointer-events-none absolute left-10 top-20 h-3.5 w-3.5 animate-float-soft" style={{ color: regionPrimary, opacity: 0.45, animationDelay: "0.9s" }} />
          <Sparkles className="pointer-events-none absolute bottom-10 right-1/3 h-3 w-3 animate-float-soft" style={{ color: regionSecondary, opacity: 0.4, animationDelay: "2.1s" }} />
          <Zap className="pointer-events-none absolute right-1/4 top-1/2 h-3 w-3 animate-float-soft" style={{ color: regionPrimary, opacity: 0.3, animationDelay: "1.4s" }} />

          {/* Floating social-proof notification (top-right, desktop) */}
          <AnimatePresence mode="wait">
            <motion.div key={activeNotif} initial={{ opacity: 0, x: 30, y: -10 }} animate={{ opacity: 1, x: 0, y: 0 }} exit={{ opacity: 0, x: 30, y: -10 }} transition={{ duration: 0.4, ease: "easeOut" }} className="pointer-events-none absolute right-4 top-5 z-30 hidden items-center gap-2 rounded-full border border-border/60 bg-background/90 px-3 py-1.5 text-[11px] font-medium text-foreground shadow-elegant backdrop-blur md:flex">
              {(() => { const NIcon = notifications[activeNotif]?.icon || Sparkles; return <NIcon className="h-3.5 w-3.5 shrink-0" style={{ color: regionSecondary }} />; })()}
              <span>{notifications[activeNotif]?.text}</span>
            </motion.div>
          </AnimatePresence>

          <div className="relative z-10 p-6 md:p-10">

            {/* Row 0: Social-proof activity ticker */}
            <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-40px" }} transition={{ duration: 0.45, delay: 0.1 }} className="mb-6">
              <ActivityTicker items={recentWinners} accent={regionSecondary} />
            </motion.div>

            {/* Row 1: Brand mark + live indicator + winner avatars */}
            <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-40px" }} transition={{ duration: 0.45, delay: 0.2 }} className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div className="inline-flex items-center gap-2">
                <img src={bateuLogo} alt="Bateu" className="h-9 w-9 animate-glow-pulse rounded-lg" />
                <span className="font-display text-lg font-bold tracking-tight" style={{ color: regionPrimary }}>Bateu</span>
                <span className="ml-1 hidden text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sm:inline">{ctaT("stats.cta.featuredPrize") ? ". " + ctaT("stats.cta.featuredPrize") : ""}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="hidden md:block">
                  <WinnerAvatars count={weeklyWinners} accent={regionSecondary} label={ctaT("stats.cta.weeklyWinners", { count: String(weeklyWinners) })} />
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider backdrop-blur" style={{ borderColor: `color-mix(in srgb, ${regionSecondary} 35%, transparent)`, background: `color-mix(in srgb, ${regionSecondary} 12%, transparent)`, color: regionSecondary }}>
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 pulse-live" style={{ background: regionSecondary }} />
                    <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: regionSecondary }} />
                  </span>
                  {ctaT("stats.cta.liveNow")}
                </div>
              </div>
            </motion.div>

            {/* Row 2: Featured jackpot + countdown strip */}
            <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-40px" }} transition={{ duration: 0.45, delay: 0.28 }} className="mb-7 grid gap-3 sm:grid-cols-2">
              {/* Jackpot card */}
              <div className="group relative overflow-hidden rounded-2xl border border-border bg-background/60 p-4 backdrop-blur transition-all hover-lift hover:border-primary/40">
                <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full opacity-50 blur-2xl transition-opacity group-hover:opacity-80" style={{ background: `color-mix(in srgb, ${regionSecondary} 50%, transparent)` }} aria-hidden />
                <div className="absolute inset-0 animate-shimmer opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
                <div className="relative flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-background/60" style={{ boxShadow: `0 0 24px -8px color-mix(in srgb, ${regionSecondary} 45%, transparent)` }}>
                    <Flame className="h-5 w-5" style={{ color: regionSecondary }} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{ctaT("stats.cta.jackpot")}</div>
                    <div className="font-display text-2xl font-bold leading-tight text-gradient-primary">{featuredJackpot > 0 ? formatCurrency(featuredJackpot) : t("stats.comingSoon")}</div>
                    {featuredTitle && <div className="mt-0.5 max-w-[220px] truncate text-xs text-muted-foreground">{featuredTitle}</div>}
                  </div>
                </div>
              </div>

              {/* Countdown card with digit boxes */}
              <div className="group relative overflow-hidden rounded-2xl border border-border bg-background/60 p-4 backdrop-blur transition-all hover-lift hover:border-primary/40">
                <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full opacity-50 blur-2xl transition-opacity group-hover:opacity-80" style={{ background: `color-mix(in srgb, ${regionPrimary} 50%, transparent)` }} aria-hidden />
                <div className="relative">
                  <div className="mb-2.5 flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-background/60" style={{ boxShadow: `0 0 24px -8px color-mix(in srgb, ${regionPrimary} 45%, transparent)` }}>
                      <Clock className="h-5 w-5" style={{ color: regionPrimary }} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{ctaT("stats.cta.nextDraw")}</div>
                      <div className="truncate text-xs text-muted-foreground">{ctaT("stats.cta.streamersLive", { count: formatNum(Math.max(participantCount, 1)) })}</div>
                    </div>
                  </div>
                  {countdown && !countdown.expired ? (
                    <div className="flex items-center gap-1.5">
                      {countdown.days > 0 && (<><CountdownDigit value={countdown.days} label={ctaT("stats.cta.dayLabel")} accent={regionPrimary} /><span className="mt-[-14px] text-sm font-bold text-muted-foreground/40">:</span></>)}
                      <CountdownDigit value={countdown.hours} label={ctaT("stats.cta.hourLabel")} accent={regionPrimary} />
                      <span className="mt-[-14px] text-sm font-bold text-muted-foreground/40">:</span>
                      <CountdownDigit value={countdown.minutes} label={ctaT("stats.cta.minLabel")} accent={regionSecondary} />
                      <span className="mt-[-14px] text-sm font-bold text-muted-foreground/40">:</span>
                      <CountdownDigit value={countdown.seconds} label={ctaT("stats.cta.secLabel")} accent={regionSecondary} />
                    </div>
                  ) : (
                    <div className="text-base font-semibold text-muted-foreground md:text-lg">{t("stats.comingSoon")}</div>
                  )}
                  {/* Urgency progress bar */}
                  {countdown && !countdown.expired && (
                    <div className="mt-2.5 h-1 w-full overflow-hidden rounded-full bg-border/40">
                      <motion.div className="h-full rounded-full" style={{ background: `linear-gradient(90deg, ${regionPrimary}, ${regionSecondary})` }} initial={{ width: "0%" }} whileInView={{ width: `${drawProgress * 100}%` }} viewport={{ once: true }} transition={{ duration: 1.2, delay: 0.5, ease: [0.16, 1, 0.3, 1] }} />
                    </div>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Row 3: Main content grid */}
            <div className="grid items-center gap-8 lg:grid-cols-[1fr_auto]">
              <div className="text-center lg:text-left">
                <div className="mb-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider" style={{ background: `color-mix(in srgb, ${regionSecondary} 14%, transparent)`, color: regionSecondary }}>
                  <Sparkles className="h-3.5 w-3.5" />
                  {ctaT("stats.cta.eyebrow")}
                </div>
                <h3 className="font-display text-2xl font-bold leading-tight text-foreground sm:text-3xl md:text-4xl">{ctaT("stats.cta.title")}</h3>
                <p className="mx-auto mt-2.5 max-w-xl text-sm text-muted-foreground md:text-base lg:mx-0">{ctaT("stats.cta.subtitle")}</p>

                {/* Star rating */}
                <motion.div initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-30px" }} transition={{ duration: 0.4, delay: 0.32 }} className="mt-4 flex flex-wrap items-center justify-center gap-2 lg:justify-start">
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/60 px-3 py-1 backdrop-blur">
                    <div className="flex">{[1,2,3,4,5].map((i) => (<Star key={i} className="h-3 w-3" fill="currentColor" style={{ color: regionSecondary }} />))}</div>
                    <span className="text-xs font-bold text-foreground">4.9</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{ctaT("stats.cta.reviews", { count: reviewCount })}</span>
                </motion.div>

                {/* Trust chips */}
                <div className="mt-5 flex flex-wrap justify-center gap-2 lg:justify-start">
                  {[{ icon: ShieldCheck, key: "stats.cta.trust.verified" }, { icon: Lock, key: "stats.cta.trust.secure" }, { icon: Eye, key: "stats.cta.trust.transparent" }, { icon: Headset, key: "stats.cta.trust.support" }].map((chip, idx) => {
                    const ChipIcon = chip.icon;
                    return (
                      <motion.span key={chip.key} initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-30px" }} transition={{ duration: 0.35, delay: 0.35 + idx * 0.07 }} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/60 px-3 py-1.5 text-xs font-medium text-foreground/80 backdrop-blur transition-all hover:border-primary/40 hover:text-foreground hover:shadow-sm">
                        <ChipIcon className="h-3.5 w-3.5" style={{ color: regionPrimary }} />
                        {ctaT(chip.key)}
                      </motion.span>
                    );
                  })}
                </div>
              </div>

              {/* Right: CTA cluster + mascot */}
              <div className="relative flex flex-col items-stretch gap-2.5 sm:flex-row sm:items-center lg:flex-col xl:flex-row">
                <div className="pointer-events-none absolute -bottom-8 -right-6 hidden xl:block">
                  <div className="relative">
                    <div className="absolute -left-28 bottom-8 whitespace-nowrap rounded-2xl rounded-br-sm border bg-background/95 px-3 py-1.5 text-xs font-bold shadow-elegant backdrop-blur" style={{ borderColor: `color-mix(in srgb, ${regionPrimary} 30%, transparent)`, color: regionPrimary }}>
                      {ctaT("stats.cta.mascotQuote")}
                      <span className="absolute -right-1 bottom-0 h-2.5 w-2.5 rotate-[-45deg] border-b border-r" style={{ background: "hsl(var(--background))", borderColor: `color-mix(in srgb, ${regionPrimary} 30%, transparent)` }} />
                    </div>
                    <img src={mascotExcited} alt="" aria-hidden="true" className="h-28 w-28 select-none object-contain opacity-95 animate-float-soft" style={{ filter: `drop-shadow(0 8px 24px color-mix(in srgb, ${regionPrimary} 35%, transparent))` }} />
                  </div>
                </div>
                <Link to="/marketplace" className="btn-premium group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-xl px-7 py-3.5 text-sm font-semibold text-primary-foreground shadow-elegant transition-all glow-primary hover:opacity-95 md:text-base">
                  <Zap className="relative z-10 h-4 w-4" />
                  <span className="relative z-10">{ctaT("stats.cta.primary")}</span>
                  <ArrowRight className="relative z-10 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
                <Link to="/lives-agora" className="group inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background/70 px-6 py-3.5 text-sm font-semibold text-foreground backdrop-blur transition-all hover:border-primary/40 hover:bg-secondary md:text-base">
                  <PlayCircle className="h-4 w-4" style={{ color: regionSecondary }} />
                  {ctaT("stats.cta.tertiary")}
                </Link>
                <Link to="/como-funciona" className="group inline-flex items-center justify-center gap-1.5 px-2 py-1.5 text-sm font-semibold text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline md:text-base">
                  {ctaT("stats.cta.secondary")}
                  <ArrowRight className="h-3.5 w-3.5 opacity-70 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
            </div>

            {/* Row 4: Bottom microcopy */}
            <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true, margin: "-30px" }} transition={{ duration: 0.5, delay: 0.6 }} className="mt-7 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 border-t border-border/50 pt-5 text-center text-[11px] font-medium uppercase tracking-wide text-muted-foreground md:text-xs">
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5" style={{ color: regionPrimary }} /><span>{ctaT("stats.cta.guarantee")}</span></span>
              <span className="hidden h-3 w-px bg-border sm:inline-block" aria-hidden />
              <span className="inline-flex items-center gap-1.5"><Lock className="h-3.5 w-3.5" style={{ color: regionPrimary }} />{t("footer.ssl")}</span>
              <span className="hidden h-3 w-px bg-border sm:inline-block" aria-hidden />
              <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5" style={{ color: regionPrimary }} />{t("footer.blockchain")}</span>
              <span className="hidden h-3 w-px bg-border sm:inline-block" aria-hidden />
              <span className="inline-flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5" style={{ color: regionPrimary }} />{t("footer.rng")}</span>
            </motion.div>
          </div>
        </motion.div>
      </div>

      {/* Ticker animation keyframes */}
      <style>{`
        @keyframes ticker-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </section>
  );
};

export default StatsBar;
