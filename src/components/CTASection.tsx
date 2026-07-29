import { motion } from "framer-motion";
import {
  ArrowRight,
  ShieldCheck,
  Trophy,
  Zap,
  Users,
  Star,
  ChevronRight,
} from "lucide-react";
import { Link } from "react-router-dom";

const trustBadges = [
  {
    icon: ShieldCheck,
    label: "Pagamento 100% Seguro",
    sub: "Proteção total ao comprador",
  },
  {
    icon: Trophy,
    label: "Prêmios Reais",
    sub: "Entregues para todo o Brasil",
  },
  {
    icon: Zap,
    label: "Resultado Instantâneo",
    sub: "Sorteio ao vivo em tempo real",
  },
  {
    icon: Users,
    label: "+50.000 Participantes",
    sub: "Comunidade ativa e confiável",
  },
];

const floatingOrbs = [
  {
    color: "hsl(220 70% 18% / 0.25)",
    size: "w-[500px] h-[500px]",
    initial: { x: -200, y: -100 },
    animate: { x: 100, y: 50 },
    duration: 18,
  },
  {
    color: "hsl(352 73% 50% / 0.2)",
    size: "w-[400px] h-[400px]",
    initial: { x: 200, y: 100 },
    animate: { x: -100, y: -80 },
    duration: 22,
  },
  {
    color: "hsl(42 95% 52% / 0.15)",
    size: "w-[350px] h-[350px]",
    initial: { x: 0, y: 200 },
    animate: { x: 50, y: -150 },
    duration: 15,
  },
  {
    color: "hsl(220 60% 30% / 0.2)",
    size: "w-[300px] h-[300px]",
    initial: { x: -150, y: 150 },
    animate: { x: 200, y: 100 },
    duration: 20,
  },
];

<<<<<<< HEAD
const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.2,
    },
  },
=======
  const regionPrimary = "var(--region-primary, hsl(var(--primary)))";
  const regionSecondary = "var(--region-secondary, hsl(var(--accent)))";

  return (
    <section ref={ref} className="relative overflow-hidden py-20 md:py-28">
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
          <div className="relative overflow-hidden rounded-3xl border border-border/60 glass-strong shadow-elegant">
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

            <div
              className="absolute inset-x-0 top-0 h-[3px] opacity-90"
              style={{
                background: `linear-gradient(90deg, transparent, ${regionPrimary}, ${regionSecondary}, transparent)`,
              }}
              aria-hidden
            />

            <div className="relative px-6 py-12 text-center md:px-12 md:py-16">
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

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-primary backdrop-blur"
              >
                <Sparkles className="h-3.5 w-3.5" />
                {rt("stats.cta.eyebrow", t("stats.cta.eyebrow"))}
              </motion.div>

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

              <motion.p
                initial={{ opacity: 0, y: 14 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.4, duration: 0.6 }}
                className="mx-auto mb-8 max-w-xl text-sm text-muted-foreground md:text-base"
              >
                {rt("stats.cta.subtitle", t("stats.cta.subtitle"))}
              </motion.p>

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
>>>>>>> 3af2551 (feat: overlay pro, stats dashboard, company public profile, branding persistence)
};

const itemVariants = {
  hidden: { opacity: 0, y: 30, filter: "blur(8px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: {
      duration: 0.7,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

const badgeVariants = {
  hidden: { opacity: 0, scale: 0.8, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.5,
      delay: 0.5 + i * 0.1,
      ease: [0.22, 1, 0.36, 1],
    },
  }),
};

const CTASection = () => (
  <section className="relative py-28 md:py-36 overflow-hidden bg-cosmic">
    {floatingOrbs.map((orb, i) => (
      <motion.div
        key={i}
        className={`absolute rounded-full pointer-events-none ${orb.size}`}
        style={{
          background: `radial-gradient(circle, ${orb.color}, transparent 70%)`,
          filter: "blur(80px)",
          left: "50%",
          top: "50%",
        }}
        initial={{ x: orb.initial.x, y: orb.initial.y }}
        animate={{ x: orb.animate.x, y: orb.animate.y }}
        transition={{
          duration: orb.duration,
          repeat: Infinity,
          repeatType: "reverse",
          ease: "easeInOut",
        }}
      />
    ))}

    <div className="absolute inset-0 bg-gradient-to-b from-background/0 via-background/40 to-background" />

    <div className="relative z-10 container mx-auto px-6">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-50px" }}
        className="flex flex-col items-center text-center"
      >
        <motion.div variants={itemVariants} className="mb-6 relative">
          <div className="absolute inset-0 bg-gradient-to-r from-amber-400/30 via-yellow-300/20 to-amber-400/30 rounded-full blur-xl scale-150" />
          <div className="relative flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 shadow-lg shadow-amber-400/25">
            <Star className="h-8 w-8 text-white" strokeWidth={2.5} />
          </div>
        </motion.div>

        <motion.h2
          variants={itemVariants}
          className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight max-w-3xl"
        >
          Sua próxima grande{" "}
          <span className="bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 bg-clip-text text-transparent">
            vitória
          </span>{" "}
          está a um clique de distância
        </motion.h2>

        <motion.p
          variants={itemVariants}
          className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl leading-relaxed"
        >
          Prêmios reais entregues em todo o Brasil. Pagamento seguro via
          plataforma verificada — pague com saldo, cartão ou PIX em segundos.
        </motion.p>

        <motion.div
          variants={itemVariants}
          className="mt-8 mb-10"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 backdrop-blur-sm px-5 py-2.5 text-sm font-semibold text-primary shadow-sm">
            <ShieldCheck className="h-4 w-4" />
            <span>100% Proteção ao Comprador</span>
            <span className="text-primary/30">·</span>
            <span>Nenhum dado de cartão armazenado</span>
          </div>
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="flex flex-col sm:flex-row items-center gap-4 mb-16"
        >
          <Link
            to="/marketplace"
            className="group relative inline-flex items-center gap-2 rounded-xl px-10 py-4 text-lg font-semibold text-white transition-all duration-300 hover:scale-[1.03] hover:shadow-xl active:scale-[0.98]"
            style={{
              background:
                "linear-gradient(135deg, hsl(220 70% 18%), hsl(352 73% 50%))",
              boxShadow:
                "0 4px 30px hsl(352 73% 50% / 0.3), 0 0 0 1px hsl(352 73% 50% / 0.1)",
            }}
          >
            <span className="relative z-10 flex items-center gap-2">
              Ver sorteios abertos
              <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1.5" />
            </span>
          </Link>

          <Link
            to="/referral"
            className="group inline-flex items-center gap-2 rounded-xl border border-border/60 bg-card/50 backdrop-blur-md px-6 py-3.5 text-sm font-semibold text-foreground transition-all duration-300 hover:bg-secondary hover:border-border hover:scale-[1.02] active:scale-[0.98] shadow-sm"
          >
            <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform duration-300 group-hover:translate-x-0.5" />
            Indique um amigo, ganhe Pontos de Sorte
          </Link>
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-3xl"
        >
          {trustBadges.map((badge, i) => {
            const Icon = badge.icon;
            return (
              <motion.div
                key={badge.label}
                custom={i}
                variants={badgeVariants}
                className="group relative flex flex-col items-center gap-2.5 rounded-2xl border border-border/40 bg-card/30 backdrop-blur-xl p-5 transition-all duration-300 hover:bg-card/60 hover:border-border/70 hover:shadow-lg hover:-translate-y-1"
              >
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/5 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div className="relative text-center">
                  <p className="text-sm font-semibold text-foreground">
                    {badge.label}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {badge.sub}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </motion.div>
    </div>

    <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent pointer-events-none" />
    <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-background to-transparent pointer-events-none" />
  </section>
);

export default CTASection;
