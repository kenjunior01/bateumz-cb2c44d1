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

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.2,
    },
  },
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
