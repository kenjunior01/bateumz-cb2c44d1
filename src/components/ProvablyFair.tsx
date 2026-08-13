import { useState } from "react";
import { motion } from "framer-motion";
import {
  Shield,
  Fingerprint,
  Eye,
  CheckCircle,
  Lock,
  Clock,
  Hash,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";

/* ------------------------------------------------------------------ */
/*  Mock data                                                          */
/* ------------------------------------------------------------------ */

const MOCK_DRAWS = [
  {
    id: 1,
    name: "iPhone 16 Pro Max",
    date: "2025-01-15",
    seed: "0xa3f8c1e9d7b24a6f0e5c8d2b1937a4f6e0d9c3b7a5f2e8d1c4b6a9f0e3d7",
  },
  {
    id: 2,
    name: "PlayStation 5 Slim",
    date: "2025-01-14",
    seed: "0x7b2e9d4a6c1f8e3b5a0d7c9f2e4b6a8d1c3e5f7a9b0d2e4c6f8a1b3d5e7",
  },
  {
    id: 3,
    name: "AirPods Pro 3",
    date: "2025-01-13",
    seed: "0xe5c3b1a9f7d2e4c6b8a0f2d4e6c8b1a3f5d7e9c1b3a5f7d9e2c4b6a8f0d2",
  },
  {
    id: 4,
    name: "Samsung Galaxy S25 Ultra",
    date: "2025-01-12",
    seed: "0xd9c7b5a3f1e3d5c7b9a1f3e5d7c9b1a3e5f7d9c1b3a5e7f9d1c3b5a7e9f1",
  },
  {
    id: 5,
    name: "Gift Card R$ 500",
    date: "2025-01-11",
    seed: "0xf1e3d5c7b9a1f3e5d7c9b1a3e5f7d9c1b3a5e7f9d1c3b5a7e9f1d3c5b7a9",
  },
];

const TRANSPARENCY_STATS = [
  { value: "1.247", unit: "sorteios verificados", icon: CheckCircle },
  { value: "Zero", unit: "contestações", icon: Shield },
  { value: "100%", unit: "público", icon: Eye },
];

const HOW_STEPS = [
  {
    step: 1,
    icon: Hash,
    title: "Semente Gerada",
    description:
      "Antes do sorteio, uma semente aleatória (hash) é publicada e visível para todos os participantes.",
    color: "from-emerald-500/20 to-emerald-500/5",
    iconColor: "text-emerald-400",
    borderColor: "border-emerald-500/20",
  },
  {
    step: 2,
    icon: Eye,
    title: "Sorteio Público",
    description:
      "O sorteio acontece ao vivo com a semente visível, garantindo que ninguém pode alterar o resultado.",
    color: "from-amber-500/20 to-amber-500/5",
    iconColor: "text-amber-400",
    borderColor: "border-amber-500/20",
  },
  {
    step: 3,
    icon: Fingerprint,
    title: "Verificação",
    description:
      "Qualquer pessoa pode verificar matematicamente que o resultado corresponde à semente publicada.",
    color: "from-cyan-500/20 to-cyan-500/5",
    iconColor: "text-cyan-400",
    borderColor: "border-cyan-500/20",
  },
];

/* ------------------------------------------------------------------ */
/*  Animation variants                                                  */
/* ------------------------------------------------------------------ */

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.15,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

const drawRowVariants = {
  hidden: { opacity: 0, x: -12 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: {
      delay: 0.6 + i * 0.08,
      duration: 0.45,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  }),
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

function ProvablyFair() {
  const [hoveredDraw, setHoveredDraw] = useState<number | null>(null);

  return (
    <section className="relative py-14 sm:py-20 overflow-hidden">
      {/* Background decoration */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[500px] w-[800px] rounded-full bg-emerald-500/[0.04] blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-[300px] w-[400px] rounded-full bg-cyan-500/[0.03] blur-[100px]" />
      </div>

      <motion.div
        className="relative z-10 container mx-auto px-4 sm:px-6 max-w-4xl"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-60px" }}
      >
        {/* ---- Header ---- */}
        <motion.div variants={itemVariants} className="text-center mb-10 sm:mb-14">
          <div className="inline-flex items-center gap-2.5 mb-4 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-4 py-1.5">
            <Shield className="h-4 w-4 text-emerald-400" />
            <Fingerprint className="h-4 w-4 text-emerald-400" />
            <span className="text-xs font-semibold tracking-wide text-emerald-300 uppercase">
              Provably Fair
            </span>
          </div>
          <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-3">
            Resultados{" "}
            <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              Verificáveis
            </span>
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Cada sorteio usa criptografia para que qualquer pessoa possa verificar
            que o resultado é genuíno e não foi manipulado.
          </p>
        </motion.div>

        {/* ---- How it Works — 3 Steps ---- */}
        <motion.div variants={itemVariants} className="mb-10 sm:mb-14">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
            {HOW_STEPS.map((step) => {
              const StepIcon = step.icon;
              return (
                <motion.div
                  key={step.step}
                  whileHover={{ y: -4, scale: 1.02 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  className={`relative rounded-2xl border ${step.borderColor} bg-gradient-to-br ${step.color} backdrop-blur-sm p-5 sm:p-6 text-center group`}
                >
                  {/* Step number badge */}
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-background text-[11px] font-bold text-foreground border border-border shadow-sm">
                    {step.step}
                  </span>

                  <div className="mx-auto mb-4 mt-2 flex h-12 w-12 items-center justify-center rounded-xl bg-background/60 border border-border">
                    <StepIcon className={`h-6 w-6 ${step.iconColor}`} />
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-foreground mb-2">
                    {step.title}
                  </h3>
                  <p className="text-xs sm:text-[13px] text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* ---- Latest Verifications ---- */}
        <motion.div variants={itemVariants} className="mb-10 sm:mb-12">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/15">
              <Hash className="h-4 w-4 text-cyan-400" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-foreground">
              Últimas Verificações
            </h3>
          </div>

          <div className="rounded-2xl border border-border bg-card/80 backdrop-blur-sm overflow-hidden">
            {/* Table header (desktop) */}
            <div className="hidden sm:grid grid-cols-[1.4fr_0.8fr_2fr_auto] gap-4 px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border bg-secondary/30">
              <span>Sorteio</span>
              <span>Data</span>
              <span>Seed Hash</span>
              <span className="text-right">Estado</span>
            </div>

            {/* Rows */}
            <div className="divide-y divide-border">
              {MOCK_DRAWS.map((draw, i) => (
                <motion.div
                  key={draw.id}
                  custom={i}
                  variants={drawRowVariants}
                  onMouseEnter={() => setHoveredDraw(draw.id)}
                  onMouseLeave={() => setHoveredDraw(null)}
                  className={`
                    grid grid-cols-1 sm:grid-cols-[1.4fr_0.8fr_2fr_auto] gap-2 sm:gap-4
                    px-5 py-3.5 sm:py-4 transition-colors duration-200
                    ${hoveredDraw === draw.id ? "bg-secondary/40" : ""}
                  `}
                >
                  {/* Raffle name */}
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`
                        flex h-8 w-8 shrink-0 items-center justify-center rounded-lg
                        ${
                          hoveredDraw === draw.id
                            ? "bg-emerald-500/15"
                            : "bg-secondary/50"
                        }
                        transition-colors duration-200
                      `}
                    >
                      <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {draw.name}
                      </p>
                      <p className="text-[11px] text-muted-foreground sm:hidden">
                        {new Date(draw.date).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                  </div>

                  {/* Date — desktop only */}
                  <div className="hidden sm:flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {new Date(draw.date).toLocaleDateString("pt-BR")}
                    </span>
                  </div>

                  {/* Seed hash */}
                  <div className="flex items-center">
                    <code className="text-[11px] sm:text-xs font-mono text-muted-foreground truncate select-all">
                      {draw.seed.slice(0, 14)}
                      <span className="text-muted-foreground/50">
                        {draw.seed.slice(14, 18)}
                      </span>
                      <span className="text-muted-foreground/30">
                        ...{draw.seed.slice(-6)}
                      </span>
                    </code>
                  </div>

                  {/* Status badge */}
                  <div className="sm:flex sm:items-center sm:justify-end">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/25 px-3 py-1">
                      <CheckCircle className="h-3 w-3 text-emerald-400" />
                      <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                        Verificado
                      </span>
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* ---- Verify Button ---- */}
        <motion.div variants={itemVariants} className="flex justify-center mb-10 sm:mb-14">
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
            <Button
              size="lg"
              className="
                relative gap-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600
                px-8 py-5 text-sm font-bold text-white shadow-lg shadow-emerald-500/20
                hover:shadow-xl hover:shadow-emerald-500/30
                transition-shadow duration-300
              "
              onClick={() => {
                /* placeholder — no action */
              }}
            >
              <Search className="h-4 w-4" />
              Verificar Resultado
              <Fingerprint className="h-4 w-4" />
            </Button>
          </motion.div>
        </motion.div>

        {/* ---- Transparency Stats ---- */}
        <motion.div variants={itemVariants}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {TRANSPARENCY_STATS.map((stat, i) => {
              const StatIcon = stat.icon;
              return (
                <motion.div
                  key={stat.unit}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.9 + i * 0.1, duration: 0.5 }}
                  whileHover={{ y: -2 }}
                  className="
                    flex items-center gap-3.5 rounded-2xl border border-border
                    bg-card/60 backdrop-blur-sm p-4 sm:p-5
                  "
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10">
                    <StatIcon className="h-5 w-5 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-lg sm:text-xl font-bold text-foreground">
                      {stat.value}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {stat.unit}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}

export default ProvablyFair;
