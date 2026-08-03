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
    <section className="relative overflow-hidden py-16 md:py-20">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-accent/3 to-violet-500/5" aria-hidden="true" />
      <div className="absolute inset-0 opacity-[0.02]" style={{
        backgroundImage: "radial-gradient(circle at 20% 50%, var(--region-primary, hsl(var(--primary))) 1px, transparent 1px), radial-gradient(circle at 80% 50%, var(--region-secondary, hsl(var(--accent))) 1px, transparent 1px)",
        backgroundSize: "60px 60px, 40px 40px",
      }} aria-hidden="true" />
      <div className="absolute left-1/4 top-0 h-64 w-64 rounded-full blur-[140px] pointer-events-none" style={{ background: "color-mix(in srgb, var(--region-primary, hsl(var(--primary))) 8%, transparent)" }} aria-hidden="true" />
      <div className="absolute right-1/4 bottom-0 h-64 w-64 rounded-full blur-[140px] pointer-events-none" style={{ background: "color-mix(in srgb, var(--region-secondary, hsl(var(--accent))) 6%, transparent)" }} aria-hidden="true" />

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
            </span>
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground md:text-base">
            Resultados reais e transparentes que comprovam a confiança da nossa comunidade
          </p>
        </motion.div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5">
          {stats.map((stat, i) => (
            <StatCard key={stat.label} stat={stat} index={i} isInView={isInView} />
          ))}
        </div>
      </div>
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
        className="relative overflow-hidden rounded-2xl border border-white/[0.06] p-5 shadow-lg transition-all duration-300 group-hover:shadow-xl group-hover:border-primary/20 md:p-6"
        style={{
          background: "linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)",
          backdropFilter: "blur(20px) saturate(1.5)",
          WebkitBackdropFilter: "blur(20px) saturate(1.5)",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255,255,255,0.06)",
        }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          style={{
            background: "linear-gradient(135deg, color-mix(in srgb, var(--region-primary, hsl(var(--primary))) 8%, transparent) 0%, color-mix(in srgb, var(--region-accent, hsl(var(--accent))) 6%, transparent) 100%)",
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
          background: "linear-gradient(135deg, color-mix(in srgb, var(--region-primary, hsl(var(--primary))) 25%, transparent), color-mix(in srgb, var(--region-accent, hsl(var(--accent))) 20%, transparent), color-mix(in srgb, var(--region-secondary, hsl(var(--secondary))) 15%, transparent))",
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
