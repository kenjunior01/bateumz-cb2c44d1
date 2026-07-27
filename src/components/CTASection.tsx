import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import {
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Lock,
  Eye,
  Headphones,
  ChevronRight,
  PlayCircle,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useRegionalTheme } from "@/contexts/RegionalThemeContext";
import bateuLogo from "@/assets/bateu-logo.png";

const CTASection = () => {
  const { t } = useLanguage();
  const { rt } = useRegionalTheme();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.2 });

  const trustItems = [
    { icon: ShieldCheck, label: rt("stats.cta.trust.verified", t("stats.cta.trust.verified")) },
    { icon: Lock, label: rt("stats.cta.trust.secure", t("stats.cta.trust.secure")) },
    { icon: Eye, label: rt("stats.cta.trust.transparent", t("stats.cta.trust.transparent")) },
    { icon: Headphones, label: rt("stats.cta.trust.support", t("stats.cta.trust.support")) },
  ];

  const regionPrimary = "var(--region-primary, hsl(var(--primary)))";
  const regionSecondary = "var(--region-secondary, hsl(var(--accent)))";

  return (
    <section ref={ref} className="relative overflow-hidden py-20 md:py-28">
      {/* Ambient backgrounds */}
      <div className="absolute inset-0 mesh-gradient-animated opacity-80" aria-hidden />
      <div
        className="absolute left-1/2 top-1/2 h-[28rem] w-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[160px]"
        style={{
          background: `color-mix(in srgb, ${regionPrimary} 22%, transparent)`,
        }}
        aria-hidden
      />
      <div
        className="absolute right-[15%] top-[18%] h-40 w-40 rounded-full blur-[100px] animate-float-soft"
        style={{
          background: `color-mix(in srgb, ${regionSecondary} 22%, transparent)`,
        }}
        aria-hidden
      />
      <div
        className="absolute left-[12%] bottom-[15%] h-32 w-32 rounded-full blur-[90px] animate-float-soft"
        style={{
          background: `color-mix(in srgb, ${regionPrimary} 18%, transparent)`,
          animationDelay: "1.2s",
        }}
        aria-hidden
      />

      <div className="container relative z-10 mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto max-w-3xl"
        >
          {/* Premium glass card with gradient border frame */}
          <div className="relative overflow-hidden rounded-3xl border border-border/60 glass-strong shadow-elegant">
            {/* Animated gradient border */}
            <div
              className="pointer-events-none absolute inset-0 rounded-3xl opacity-70"
              style={{
                background: `linear-gradient(135deg, color-mix(in srgb, ${regionPrimary} 35%, transparent), transparent 40%, color-mix(in srgb, ${regionSecondary} 35%, transparent))`,
                maskImage: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
                WebkitMaskImage: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
                maskComposite: "exclude",
                WebkitMaskComposite: "xor",
                padding: "1px",
              }}
              aria-hidden
            />

            {/* Top shimmer bar */}
            <div
              className="absolute inset-x-0 top-0 h-[3px] opacity-90"
              style={{
                background: `linear-gradient(90deg, transparent, ${regionPrimary}, ${regionSecondary}, transparent)`,
              }}
              aria-hidden
            />

            <div className="relative px-6 py-12 text-center md:px-12 md:py-16">
              {/* Brand mark */}
              <motion.div
                initial={{ opacity: 0, scale: 0.85 }}
                animate={inView ? { opacity: 1, scale: 1 } : {}}
                transition={{ delay: 0.1, duration: 0.5 }}
                className="mx-auto mb-5 flex items-center justify-center gap-2"
              >
                <img
                  src={bateuLogo}
                  alt="Bateu"
                  className="h-9 w-9 animate-glow-pulse rounded-lg"
                />
                <span
                  className="font-display text-lg font-bold tracking-tight"
                  style={{ color: regionPrimary }}
                >
                  Bateu
                </span>
              </motion.div>

              {/* Eyebrow */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-primary backdrop-blur"
              >
                <Sparkles className="h-3.5 w-3.5" />
                {rt("stats.cta.eyebrow", t("stats.cta.eyebrow"))}
              </motion.div>

              {/* Title */}
              <motion.h2
                initial={{ opacity: 0, y: 14 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.3, duration: 0.6 }}
                className="mx-auto mb-4 max-w-2xl font-display text-3xl font-bold leading-tight tracking-tight md:text-5xl"
              >
                <span
                  className="bg-clip-text text-transparent"
                  style={{
                    backgroundImage: `linear-gradient(135deg, hsl(var(--foreground)), color-mix(in srgb, ${regionPrimary} 70%, hsl(var(--foreground))))`,
                  }}
                >
                  {rt("stats.cta.title", t("stats.cta.title"))}
                </span>
              </motion.h2>

              {/* Subtitle */}
              <motion.p
                initial={{ opacity: 0, y: 14 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.4, duration: 0.6 }}
                className="mx-auto mb-8 max-w-xl text-sm text-muted-foreground md:text-base"
              >
                {rt("stats.cta.subtitle", t("stats.cta.subtitle"))}
              </motion.p>

              {/* CTAs — primary, secondary, tertiary */}
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.5, duration: 0.6 }}
                className="flex flex-col items-center justify-center gap-3 sm:flex-row sm:flex-wrap"
              >
                <Link
                  to="/marketplace"
                  className="btn-premium group inline-flex w-full items-center justify-center gap-2 rounded-xl px-8 py-3.5 text-base font-semibold text-primary-foreground transition-all glow-primary hover:opacity-95 sm:w-auto"
                >
                  {rt("stats.cta.primary", t("stats.cta.primary"))}
                  <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
                <Link
                  to="/lives"
                  className="group inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-border bg-card/40 px-6 py-3.5 text-sm font-semibold text-foreground backdrop-blur transition-all hover:border-primary/40 hover:bg-secondary sm:w-auto"
                >
                  <PlayCircle className="h-4 w-4" style={{ color: regionSecondary }} />
                  {rt("stats.cta.tertiary", t("stats.cta.tertiary"))}
                </Link>
                <Link
                  to="/como-funciona"
                  className="group inline-flex w-full items-center justify-center gap-1.5 rounded-xl px-5 py-3.5 text-sm font-semibold text-muted-foreground transition-all hover:text-foreground sm:w-auto"
                >
                  {rt("stats.cta.secondary", t("stats.cta.secondary"))}
                  <ChevronRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                </Link>
              </motion.div>

              {/* Trust badges row */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={inView ? { opacity: 1 } : {}}
                transition={{ delay: 0.65, duration: 0.6 }}
                className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2.5 border-t border-border/60 pt-6"
              >
                {trustItems.map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground md:text-xs"
                    >
                      <Icon className="h-3.5 w-3.5" style={{ color: regionPrimary }} />
                      {item.label}
                    </span>
                  );
                })}
              </motion.div>

              {/* Guarantee line */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={inView ? { opacity: 1 } : {}}
                transition={{ delay: 0.8, duration: 0.6 }}
                className="mt-4 text-[11px] text-muted-foreground/80"
              >
                {rt("stats.cta.guarantee", t("stats.cta.guarantee"))}
              </motion.p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default CTASection;
