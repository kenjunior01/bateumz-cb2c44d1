"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, useInView, useSpring, useTransform } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useCurrency } from "@/contexts/CurrencyContext";

const PORTUGUESE_LABELS = [
  "Prêmios Entregues",
  "Participantes Ativos",
  "Resultados Verificáveis",
  "Sorteios Concluídos",
];

const STAT_ICONS = [
  "🏆",
  "👥",
  "✅",
  "🎰",
];

function useAnimatedCounter(target: number, duration: number = 2000) {
  const spring = useSpring(0, { duration, bounce: 0 });
  const display = useTransform(spring, (v) => v);
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    spring.set(target);
    const unsubscribe = display.on("change", (v) => {
      setDisplayValue(Math.round(v));
    });
    return () => {
      unsubscribe();
    };
  }, [target, spring, display]);

  return displayValue;
}

function formatNumberCompact(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return n.toLocaleString("pt-BR");
}

interface StatEntry {
  numericValue: number;
  displayValue: string;
  suffix: string;
  label: string;
  icon: string;
  isFixed: boolean;
}

const StatsBar = () => {
  const { format } = useCurrency();
  const [stats, setStats] = useState<StatEntry[]>([
    { numericValue: 0, displayValue: "0", suffix: "", label: PORTUGUESE_LABELS[0], icon: STAT_ICONS[0], isFixed: false },
    { numericValue: 0, displayValue: "0", suffix: "", label: PORTUGUESE_LABELS[1], icon: STAT_ICONS[1], isFixed: false },
    { numericValue: 100, displayValue: "100%", suffix: "", label: PORTUGUESE_LABELS[2], icon: STAT_ICONS[2], isFixed: true },
    { numericValue: 0, displayValue: "0", suffix: "+", label: PORTUGUESE_LABELS[3], icon: STAT_ICONS[3], isFixed: false },
  ]);

  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true, margin: "-100px" });

  const fetchStats = useCallback(async () => {
    const [rafflesRes, participantsRes] = await Promise.all([
      supabase.from("raffles").select("prize_value, status, sold_tickets, ticket_price"),
      supabase.from("participants").select("id", { count: "exact", head: true }),
    ]);

    const raffles = rafflesRes.data || [];
    const completed = raffles.filter((r) => r.status === "completed");
    const totalPrizes = completed.reduce((s, r) => s + Number(r.prize_value || 0), 0);
    const totalCompleted = completed.length;
    const participantCount = participantsRes.count || 0;

    setStats([
      { numericValue: totalPrizes, displayValue: format(totalPrizes), suffix: "", label: PORTUGUESE_LABELS[0], icon: STAT_ICONS[0], isFixed: false },
      { numericValue: participantCount, displayValue: formatNumberCompact(participantCount), suffix: "", label: PORTUGUESE_LABELS[1], icon: STAT_ICONS[1], isFixed: false },
      { numericValue: 100, displayValue: "100%", suffix: "", label: PORTUGUESE_LABELS[2], icon: STAT_ICONS[2], isFixed: true },
      { numericValue: totalCompleted, displayValue: totalCompleted.toLocaleString("pt-BR"), suffix: "+", label: PORTUGUESE_LABELS[3], icon: STAT_ICONS[3], isFixed: false },
    ]);
  }, [format]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return (
<<<<<<< HEAD
    <section className="relative overflow-hidden py-16 md:py-20">
      <div
        className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-pink-500/5 to-amber-500/10"
        aria-hidden="true"
      />
      <div
        className="absolute inset-0"
        style={{
          backdropFilter: "blur(40px) saturate(1.5)",
          WebkitBackdropFilter: "blur(40px) saturate(1.5)",
          backgroundColor: "rgba(255, 255, 255, 0.6)",
        }}
        aria-hidden="true"
      />
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: "radial-gradient(circle at 25% 50%, rgba(168, 85, 247, 0.08) 0%, transparent 50%), radial-gradient(circle at 75% 50%, rgba(236, 72, 153, 0.06) 0%, transparent 50%)",
        }}
        aria-hidden="true"
      />

      <div ref={containerRef} className="container relative mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6 }}
          className="mb-10 text-center md:mb-12"
        >
          <h2 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl lg:text-4xl">
            Números que{" "}
            <span className="bg-gradient-to-r from-purple-600 via-pink-500 to-amber-500 bg-clip-text text-transparent">
              impressionam
=======
    <section className="relative overflow-hidden border-y border-border">
      <div className="absolute inset-0 mesh-gradient-animated opacity-60" />
      <div className="absolute left-1/4 top-0 h-64 w-64 rounded-full blur-[120px] animate-float-soft" style={{ background: `color-mix(in srgb, ${regionPrimary} 14%, transparent)` }} />
      <div className="absolute right-1/4 bottom-0 h-56 w-56 rounded-full blur-[110px] animate-float-soft" style={{ background: `color-mix(in srgb, ${regionSecondary} 14%, transparent)`, animationDelay: "1.5s" }} />

      <div className="container relative z-10 mx-auto px-4 py-14 md:py-20">
        <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.5 }} className="mb-10 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3.5 py-1.5 text-[11px] font-semibold backdrop-blur">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
>>>>>>> 3af2551 (feat: overlay pro, stats dashboard, company public profile, branding persistence)
            </span>
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground md:text-base">
            Resultados reais e transparentes que comprovam a confiança da nossa comunidade
          </p>
        </motion.div>

<<<<<<< HEAD
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5">
          {stats.map((stat, i) => (
            <StatCard key={stat.label} stat={stat} index={i} isInView={isInView} />
          ))}
        </div>
      </div>
=======
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

        <motion.div initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.6, delay: 0.15, ease: [0.16, 1, 0.3, 1] }} className="premium-card gradient-border relative mt-12 overflow-hidden rounded-3xl md:mt-16">

          <div className="absolute inset-x-0 top-0 z-20 h-[3px] overflow-hidden"><div className="h-full w-full opacity-90 border-flow" aria-hidden /></div>

          <div className="absolute inset-0 mesh-gradient-animated opacity-40" />
          <div className="absolute inset-0 animate-gradient-shift opacity-60" style={{ background: `linear-gradient(120deg, color-mix(in srgb, ${regionPrimary} 10%, transparent), transparent 45%, color-mix(in srgb, ${regionSecondary} 12%, transparent))`, backgroundSize: "200% 200%" }} />
          <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full blur-[110px] animate-float-soft" style={{ background: `color-mix(in srgb, ${regionSecondary} 20%, transparent)` }} />
          <div className="absolute -left-16 bottom-0 h-56 w-56 rounded-full blur-[100px] animate-float-soft" style={{ background: `color-mix(in srgb, ${regionPrimary} 16%, transparent)`, animationDelay: "1.8s" }} />
          <div className="absolute left-1/2 top-1/3 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full blur-[80px] animate-pulse-soft" style={{ background: `color-mix(in srgb, ${regionSecondary} 10%, transparent)`, animationDelay: "0.6s" }} />
          <div className="absolute inset-0 opacity-[0.15]" style={{ backgroundImage: `radial-gradient(circle, color-mix(in srgb, ${regionPrimary} 35%, transparent) 1px, transparent 1px)`, backgroundSize: "24px 24px", maskImage: "radial-gradient(ellipse at center, black 25%, transparent 70%)", WebkitMaskImage: "radial-gradient(ellipse at center, black 25%, transparent 70%)" }} />

          <Sparkles className="pointer-events-none absolute right-8 top-8 h-5 w-5 animate-float-soft" style={{ color: regionSecondary, opacity: 0.55 }} />
          <Sparkles className="pointer-events-none absolute left-10 top-20 h-3.5 w-3.5 animate-float-soft" style={{ color: regionPrimary, opacity: 0.45, animationDelay: "0.9s" }} />
          <Sparkles className="pointer-events-none absolute bottom-10 right-1/3 h-3 w-3 animate-float-soft" style={{ color: regionSecondary, opacity: 0.4, animationDelay: "2.1s" }} />
          <Zap className="pointer-events-none absolute right-1/4 top-1/2 h-3 w-3 animate-float-soft" style={{ color: regionPrimary, opacity: 0.3, animationDelay: "1.4s" }} />

          <AnimatePresence mode="wait">
            <motion.div key={activeNotif} initial={{ opacity: 0, x: 30, y: -10 }} animate={{ opacity: 1, x: 0, y: 0 }} exit={{ opacity: 0, x: 30, y: -10 }} transition={{ duration: 0.4, ease: "easeOut" }} className="pointer-events-none absolute right-4 top-5 z-30 hidden items-center gap-2 rounded-full border border-border/60 bg-background/90 px-3 py-1.5 text-[11px] font-medium text-foreground shadow-elegant backdrop-blur md:flex">
              {(() => { const NIcon = notifications[activeNotif]?.icon || Sparkles; return <NIcon className="h-3.5 w-3.5 shrink-0" style={{ color: regionSecondary }} />; })()}
              <span>{notifications[activeNotif]?.text}</span>
            </motion.div>
          </AnimatePresence>

          <div className="relative z-10 p-6 md:p-10">

            <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-40px" }} transition={{ duration: 0.45, delay: 0.1 }} className="mb-6">
              <ActivityTicker items={recentWinners} accent={regionSecondary} />
            </motion.div>

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

            <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-40px" }} transition={{ duration: 0.45, delay: 0.28 }} className="mb-7 grid gap-3 sm:grid-cols-2">
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
                  {countdown && !countdown.expired && (
                    <div className="mt-2.5 h-1 w-full overflow-hidden rounded-full bg-border/40">
                      <motion.div className="h-full rounded-full" style={{ background: `linear-gradient(90deg, ${regionPrimary}, ${regionSecondary})` }} initial={{ width: "0%" }} whileInView={{ width: `${drawProgress * 100}%` }} viewport={{ once: true }} transition={{ duration: 1.2, delay: 0.5, ease: [0.16, 1, 0.3, 1] }} />
                    </div>
                  )}
                </div>
              </div>
            </motion.div>

            <div className="grid items-center gap-8 lg:grid-cols-[1fr_auto]">
              <div className="text-center lg:text-left">
                <div className="mb-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider" style={{ background: `color-mix(in srgb, ${regionSecondary} 14%, transparent)`, color: regionSecondary }}>
                  <Sparkles className="h-3.5 w-3.5" />
                  {ctaT("stats.cta.eyebrow")}
                </div>
                <h3 className="font-display text-2xl font-bold leading-tight text-foreground sm:text-3xl md:text-4xl">{ctaT("stats.cta.title")}</h3>
                <p className="mx-auto mt-2.5 max-w-xl text-sm text-muted-foreground md:text-base lg:mx-0">{ctaT("stats.cta.subtitle")}</p>

                <motion.div initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-30px" }} transition={{ duration: 0.4, delay: 0.32 }} className="mt-4 flex flex-wrap items-center justify-center gap-2 lg:justify-start">
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/60 px-3 py-1 backdrop-blur">
                    <div className="flex">{[1,2,3,4,5].map((i) => (<Star key={i} className="h-3 w-3" fill="currentColor" style={{ color: regionSecondary }} />))}</div>
                    <span className="text-xs font-bold text-foreground">4.9</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{ctaT("stats.cta.reviews", { count: reviewCount })}</span>
                </motion.div>

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

      <style>{`
        @keyframes ticker-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
>>>>>>> 3af2551 (feat: overlay pro, stats dashboard, company public profile, branding persistence)
    </section>
  );
};

interface StatCardProps {
  stat: StatEntry;
  index: number;
  isInView: boolean;
}

function StatCard({ stat, index, isInView }: StatCardProps) {
  const animatedValue = useAnimatedCounter(isInView ? stat.numericValue : 0, 2200 + index * 300);

  const getDisplayText = () => {
    if (stat.isFixed) return stat.displayValue;
    if (stat.numericValue === 0) return null;
    return stat.displayValue;
  };

  const displayText = getDisplayText();

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={isInView ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 30, scale: 0.95 }}
      transition={{
        duration: 0.7,
        delay: index * 0.12,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      whileHover={{
        y: -4,
        scale: 1.02,
        transition: { duration: 0.25 },
      }}
      className="group relative"
    >
      <div
        className="relative overflow-hidden rounded-2xl border border-white/30 p-5 shadow-lg transition-shadow duration-300 group-hover:shadow-xl md:p-6"
        style={{
          background: "linear-gradient(135deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.35) 100%)",
          backdropFilter: "blur(20px) saturate(1.8)",
          WebkitBackdropFilter: "blur(20px) saturate(1.8)",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255,255,255,0.6)",
        }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          style={{
            background: "linear-gradient(135deg, rgba(168, 85, 247, 0.08) 0%, rgba(236, 72, 153, 0.06) 50%, rgba(245, 158, 11, 0.04) 100%)",
          }}
        />

        <div className="absolute -right-2 -top-2 text-4xl opacity-10 transition-all duration-500 group-hover:opacity-20 group-hover:scale-110 md:text-5xl">
          {stat.icon}
        </div>

        <div className="relative z-10 text-center">
          <div className="mb-2 flex items-center justify-center">
            <div className="h-0.5 w-6 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 opacity-50" />
            <span className="mx-2 text-xl md:text-2xl">{stat.icon}</span>
            <div className="h-0.5 w-6 rounded-full bg-gradient-to-r from-pink-400 to-amber-400 opacity-50" />
          </div>

          <div className="min-h-[3rem] md:min-h-[3.5rem]">
            {displayText === null ? (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.6 }}
                transition={{ delay: 0.5 + index * 0.1 }}
                className="text-sm font-medium text-muted-foreground md:text-base"
              >
                Em breve
              </motion.p>
            ) : stat.isFixed ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.5 }}
                transition={{ duration: 0.6, delay: 0.3 + index * 0.12, type: "spring", stiffness: 100 }}
                className="bg-gradient-to-r from-purple-600 via-pink-500 to-amber-500 bg-clip-text font-display text-3xl font-extrabold tracking-tight text-transparent md:text-4xl lg:text-5xl"
              >
                {displayText}
              </motion.div>
            ) : (
              <div className="bg-gradient-to-r from-purple-600 via-pink-500 to-amber-500 bg-clip-text font-display text-3xl font-extrabold tracking-tight text-transparent md:text-4xl lg:text-5xl">
                <CounterDisplay
                  animatedValue={animatedValue}
                  formattedTarget={stat.displayValue}
                  suffix={stat.suffix}
                />
              </div>
            )}
          </div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: 0.5, delay: 0.6 + index * 0.1 }}
            className="mt-1 text-xs font-medium uppercase tracking-widest text-muted-foreground/80 md:text-sm"
          >
            {stat.label}
          </motion.p>
        </div>
      </div>

      <div
        className="absolute -inset-px rounded-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background: "linear-gradient(135deg, rgba(168, 85, 247, 0.3), rgba(236, 72, 153, 0.3), rgba(245, 158, 11, 0.2))",
          zIndex: -1,
          filter: "blur(1px)",
        }}
      />
    </motion.div>
  );
}

interface CounterDisplayProps {
  animatedValue: number;
  formattedTarget: string;
  suffix: string;
}

function CounterDisplay({ animatedValue, formattedTarget, suffix }: CounterDisplayProps) {
  const isCurrency = formattedTarget.startsWith("R$");
  const isCompact = formattedTarget.endsWith("K") || formattedTarget.endsWith("M");

  const getCounterText = () => {
    if (isCurrency) {
      const numericPart = formattedTarget.replace(/^R\$\s*/, "");
      if (numericPart.includes(",")) {
        return "R$ " + animatedValue.toLocaleString("pt-BR");
      }
      return "R$ " + animatedValue.toLocaleString("pt-BR");
    }

    if (isCompact) {
      const multiplier = formattedTarget.endsWith("M") ? 1_000_000 : 1_000;
      const compactVal = animatedValue / multiplier;
      const suffixChar = formattedTarget.endsWith("M") ? "M" : "K";
      if (compactVal >= 100) {
        return Math.round(compactVal).toString() + suffixChar;
      }
      return compactVal.toFixed(1).replace(/\.0$/, "") + suffixChar;
    }

    return animatedValue.toLocaleString("pt-BR");
  };

  return (
    <span className="inline-flex items-baseline gap-0.5">
      <span>{getCounterText()}</span>
      {suffix && <span className="text-2xl md:text-3xl lg:text-4xl">{suffix}</span>}
    </span>
  );
}

export default StatsBar;
